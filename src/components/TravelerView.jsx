import React, { useMemo, useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  Shield,
  Package,
  ClipboardCheck,
  CircleDot,
  ChevronDown,
  ChevronRight,
  User,
  CalendarDays,
  MessageSquare,
} from 'lucide-react';
import { getOrders } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import SlackFeed from './SlackFeed';
import SalesforceLink from './SalesforceLink';
import { getSlackChannelName } from '../utils/slackChannel';

// Workflow stages that replace the SharePoint/email traveler
const WORKFLOW_STAGES = [
  { key: 'order_received', label: 'Order Received', icon: Package },
  { key: 'compliance_check', label: 'Export Compliance', icon: Shield },
  { key: 'logistics_booked', label: 'Logistics Booked', icon: Truck },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'goods_receipt', label: 'Goods Receipt', icon: ClipboardCheck },
  { key: 'install_verified', label: 'Install Verified', icon: CheckCircle2 },
];

// Deterministic hash for consistent simulated values per record
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Generate a realistic traveler stage count based on the order identity
function getTravelerProgress(order) {
  const hash = simpleHash(order.id || order.orderNumber || '');
  // Distribute across stages: 0-6 completed stages
  // Weight toward middle stages for visual interest
  const distribution = [0, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6];
  return distribution[hash % distribution.length];
}

// Stage metadata generators for the expanded detail view
const STAGE_OWNERS = [
  'Order Processing Team',
  'Trade Compliance (S. Müller)',
  'Logistics Coordination (J. Kim)',
  'Shipping Operations (M. Patel)',
  'Customer Operations (R. Fischer)',
  'Field Engineering (A. Chen)',
];

const STAGE_NOTES = [
  ['Order validated and entered into system', 'Configuration specs confirmed with customer', 'Purchase order received and matched'],
  ['ECCN classification verified (3D002)', 'Denied party screening passed — no matches', 'Export license not required (NLR)', 'Awaiting end-use certificate from customer'],
  ['Carrier booked: DHL Express Priority', 'Freight forwarder confirmed — ETA calculated', 'Customs documentation prepared', 'Awaiting carrier slot allocation'],
  ['Shipment dispatched via DHL tracking #4832-7291', 'In transit — cleared customs at origin', 'Package arrived at destination hub', 'Final mile delivery scheduled'],
  ['Delivery confirmed at customer dock', 'Customer signed goods receipt document', 'Inventory reconciliation complete', 'Awaiting site readiness confirmation'],
  ['System installed and powered on', 'Initial diagnostics passed — all subsystems nominal', 'Customer acceptance sign-off received', 'Warranty period activated'],
];

function generateStageTimestamp(order, stageIndex, completedStages) {
  const start = order.startDate ? new Date(order.startDate) : new Date('2026-06-01');
  // Each completed stage takes 2-5 days, in-progress stage is today-ish
  const daysPerStage = [0, 2, 3, 5, 3, 2];
  let date = new Date(start);
  for (let i = 0; i <= stageIndex && i < completedStages; i++) {
    if (i > 0) {
      const hash = simpleHash((order.id || '') + i);
      date = new Date(date.getTime() + (daysPerStage[i] + (hash % 3)) * 86400000);
    }
  }
  return date;
}

function getStageNote(order, stageIndex, completedStages) {
  const hash = simpleHash((order.id || '') + stageIndex + 'note');
  const notes = STAGE_NOTES[stageIndex];
  if (stageIndex < completedStages) {
    return notes[hash % Math.min(notes.length, 3)]; // completed stages get resolution notes
  }
  if (stageIndex === completedStages) {
    return notes[notes.length - 1]; // current stage gets the "awaiting" note
  }
  return null;
}

// Derive traveler-specific status label
function getTravelerStatus(completedStages) {
  if (completedStages >= 6) return { label: 'Completed', badge: 'badge-green' };
  if (completedStages >= 4) return { label: 'In Transit', badge: 'badge-blue' };
  if (completedStages >= 2) return { label: 'Processing', badge: 'badge-teal' };
  if (completedStages >= 1) return { label: 'Screening', badge: 'badge-yellow' };
  return { label: 'Received', badge: 'badge-orange' };
}

// EDA product names for variety
function getProductName(order) {
  if (order.product) return order.product;
  const hash = simpleHash(order.id || order.orderNumber || '');
  const products = ['Veloce Strato', 'Calibre nmDRC', 'Questa Formal', 'HyperLynx SI/PI', 'Xpedition PCB', 'Catapult HLS'];
  return products[hash % products.length];
}

function StageIndicator({ stage, stageIndex, completedStages }) {
  const status = stageIndex < completedStages ? 'completed' : stageIndex === completedStages ? 'current' : 'pending';
  const Icon = stage.icon;

  return (
    <div className="flex flex-col items-center relative">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
          status === 'completed'
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
            : status === 'current'
            ? 'bg-siemens-teal/20 border-siemens-teal text-siemens-accent animate-pulse'
            : 'bg-gray-800 border-gray-700 text-gray-600'
        }`}
      >
        {status === 'completed' ? (
          <CheckCircle2 size={18} />
        ) : status === 'current' ? (
          <CircleDot size={18} />
        ) : (
          <Icon size={16} />
        )}
      </div>
      <span
        className={`text-[9px] uppercase tracking-wider font-semibold mt-2 text-center leading-tight max-w-[80px] ${
          status === 'completed'
            ? 'text-emerald-400'
            : status === 'current'
            ? 'text-siemens-accent'
            : 'text-gray-600'
        }`}
      >
        {stage.label}
      </span>
    </div>
  );
}

function TravelerCard({ order, isExpanded, onToggle }) {
  const completedStages = getTravelerProgress(order);
  const travelerStatus = getTravelerStatus(completedStages);
  const product = getProductName(order);

  // Progress line width calculation
  const progressWidth = completedStages >= WORKFLOW_STAGES.length
    ? 100
    : ((completedStages + 0.5) / (WORKFLOW_STAGES.length - 1)) * 100;

  return (
    <div className="metric-card">
      {/* Header — clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between mb-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-gray-500 group-hover:text-gray-300 transition-colors">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
              {order.agreementName || order.orderNumber || '--'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {order.customer} &middot; {product}
            </p>
          </div>
        </div>
        <span className={`badge ${travelerStatus.badge}`}>
          {travelerStatus.label}
        </span>
      </button>

      {/* Workflow Pipeline */}
      <div className="flex items-start justify-between relative px-2">
        {/* Connecting line */}
        <div className="absolute top-5 left-7 right-7 h-0.5 bg-gray-800" />
        <div
          className="absolute top-5 left-7 h-0.5 bg-emerald-500/60 transition-all"
          style={{ width: `${Math.min(progressWidth, 100)}%` }}
        />
        {WORKFLOW_STAGES.map((stage, i) => (
          <StageIndicator key={stage.key} stage={stage} stageIndex={i} completedStages={completedStages} />
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-surface-border">
        <div>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium block">
            Order #
          </span>
          <span className="text-xs text-gray-300 font-medium">{order.orderNumber || '--'}</span>
        </div>
        <div>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium block">
            Product
          </span>
          <span className="text-xs text-gray-300 font-medium">{product}</span>
        </div>
        <div>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium block">
            Total Value
          </span>
          <span className="text-xs text-white font-semibold">
            {order.totalValue != null
              ? `$${(order.totalValue / 1000000).toFixed(2)}M`
              : '--'}
          </span>
        </div>
      </div>

      {/* Expanded Stage Detail */}
      {isExpanded && (
        <>
          <div className="mt-4 pt-4 border-t border-surface-border space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Stage Detail
              </h4>
              <SalesforceLink recordId={order.id} />
            </div>
            {WORKFLOW_STAGES.map((stage, i) => {
              const status = i < completedStages ? 'completed' : i === completedStages ? 'current' : 'pending';
              const Icon = stage.icon;
              const timestamp = status !== 'pending' ? generateStageTimestamp(order, i, completedStages) : null;
              const note = getStageNote(order, i, completedStages);

              return (
                <div
                  key={stage.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    status === 'completed'
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : status === 'current'
                      ? 'border-siemens-teal/30 bg-siemens-teal/5'
                      : 'border-surface-border bg-transparent opacity-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : status === 'current'
                        ? 'bg-siemens-teal/20 text-siemens-accent'
                        : 'bg-gray-800 text-gray-600'
                    }`}
                  >
                    {status === 'completed' ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${
                        status === 'completed' ? 'text-emerald-400' :
                        status === 'current' ? 'text-siemens-accent' : 'text-gray-600'
                      }`}>
                        {stage.label}
                      </span>
                      {status === 'current' && (
                        <span className="badge badge-teal text-[8px]">In Progress</span>
                      )}
                    </div>
                    {status !== 'pending' && (
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-3 text-[10px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <User size={10} />
                            {STAGE_OWNERS[i]}
                          </span>
                          {timestamp && (
                            <span className="flex items-center gap-1">
                              <CalendarDays size={10} />
                              {timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {status === 'completed' && ` at ${timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                            </span>
                          )}
                        </div>
                        {note && (
                          <div className="flex items-start gap-1 text-[10px] text-gray-500">
                            <MessageSquare size={10} className="mt-0.5 shrink-0" />
                            <span>{note}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slack Collaboration Feed */}
          <div className="mt-4">
            <SlackFeed
              channelName={getSlackChannelName('order', order.orderNumber)}
              recordLabel={order.orderNumber || order.agreementName || 'Traveler'}
              recordType="traveler"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function TravelerView() {
  const { data, loading, error, refetch } = useSalesforceData(getOrders);
  const [expandedTraveler, setExpandedTraveler] = useState(null);

  const orders = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter((o) => o.status !== 'Cancelled' && o.status !== 'Expired');
  }, [data]);

  // Summary stats
  const stats = useMemo(() => {
    let completed = 0, inTransit = 0, processing = 0, screening = 0;
    for (const o of orders) {
      const stages = getTravelerProgress(o);
      if (stages >= 6) completed++;
      else if (stages >= 4) inTransit++;
      else if (stages >= 2) processing++;
      else screening++;
    }
    return { completed, inTransit, processing, screening, total: orders.length };
  }, [orders]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Travelers</h3>
        <p className="text-sm text-gray-500 max-w-md mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton w-48 h-6" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="metric-card">
            <div className="skeleton w-full h-40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-white">Order Travelers</h1>
            <p className="text-xs text-gray-500">
              Automated workflow tracking — replaces SharePoint traveler sheets
            </p>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="metric-card">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total</div>
          <div className="text-xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Screening</div>
          <div className="text-xl font-bold text-amber-400">{stats.screening}</div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Processing</div>
          <div className="text-xl font-bold text-siemens-accent">{stats.processing}</div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">In Transit</div>
          <div className="text-xl font-bold text-blue-400">{stats.inTransit}</div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Completed</div>
          <div className="text-xl font-bold text-emerald-400">{stats.completed}</div>
        </div>
      </div>

      {/* Stage Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { color: 'bg-emerald-500', label: 'Completed' },
          { color: 'bg-siemens-teal', label: 'In Progress' },
          { color: 'bg-gray-700', label: 'Pending' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              {item.label}
            </span>
          </div>
        ))}
        <div className="text-[10px] text-gray-600 ml-auto">
          Click a traveler to view stage detail
        </div>
      </div>

      {/* Traveler Cards */}
      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <TravelerCard
              key={order.id || i}
              order={order}
              isExpanded={expandedTraveler === (order.id || i)}
              onToggle={() => setExpandedTraveler(
                expandedTraveler === (order.id || i) ? null : (order.id || i)
              )}
            />
          ))}
        </div>
      ) : (
        <div className="section-card">
          <div className="flex items-center justify-center py-16 text-sm text-gray-600">
            No active order travelers
          </div>
        </div>
      )}
    </div>
  );
}
