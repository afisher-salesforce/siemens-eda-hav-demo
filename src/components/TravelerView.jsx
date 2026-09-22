import React, { useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Truck,
  Shield,
  Package,
  ClipboardCheck,
  CircleDot,
} from 'lucide-react';
import { getOrders } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

// Simulated workflow stages that replace the SharePoint/email traveler
const WORKFLOW_STAGES = [
  { key: 'order_received', label: 'Order Received', icon: Package },
  { key: 'compliance_check', label: 'Export Compliance', icon: Shield },
  { key: 'logistics_booked', label: 'Logistics Booked', icon: Truck },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'goods_receipt', label: 'Goods Receipt', icon: ClipboardCheck },
  { key: 'install_verified', label: 'Install Verified', icon: CheckCircle2 },
];

function getStageStatus(order, stageIndex) {
  // Derive stage completion from order status
  const statusMap = {
    Draft: 0,
    Submitted: 1,
    Approved: 2,
    Active: 4,
    Fulfilled: 6,
    Pending: 3,
  };
  const completedStages = statusMap[order.status] ?? 1;
  if (stageIndex < completedStages) return 'completed';
  if (stageIndex === completedStages) return 'current';
  return 'pending';
}

function StageIndicator({ stage, stageIndex, order }) {
  const status = getStageStatus(order, stageIndex);
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

function TravelerCard({ order }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">
            {order.agreementName || order.orderNumber || '--'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {order.customer} &middot; {order.product || 'Veloce System'}
          </p>
        </div>
        <span
          className={`badge ${
            order.status === 'Fulfilled'
              ? 'badge-green'
              : order.status === 'Active'
              ? 'badge-teal'
              : order.status === 'Approved'
              ? 'badge-blue'
              : 'badge-yellow'
          }`}
        >
          {order.status || '--'}
        </span>
      </div>

      {/* Workflow Pipeline */}
      <div className="flex items-start justify-between relative px-2">
        {/* Connecting line */}
        <div className="absolute top-5 left-7 right-7 h-0.5 bg-gray-800" />
        <div
          className="absolute top-5 left-7 h-0.5 bg-emerald-500/60 transition-all"
          style={{
            width: `${Math.min(
              ((getStageStatus(order, WORKFLOW_STAGES.length - 1) === 'completed'
                ? WORKFLOW_STAGES.length
                : WORKFLOW_STAGES.findIndex((_, i) => getStageStatus(order, i) === 'current') + 0.5) /
                (WORKFLOW_STAGES.length - 1)) *
                100,
              100
            )}%`,
          }}
        />
        {WORKFLOW_STAGES.map((stage, i) => (
          <StageIndicator key={stage.key} stage={stage} stageIndex={i} order={order} />
        ))}
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-surface-border">
        <div>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium block">
            Order #
          </span>
          <span className="text-xs text-gray-300 font-medium">{order.orderNumber || '--'}</span>
        </div>
        <div>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium block">
            Quantity
          </span>
          <span className="text-xs text-gray-300 font-medium">{order.quantity ?? '--'}</span>
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
    </div>
  );
}

export default function TravelerView() {
  const { data, loading, error, refetch } = useSalesforceData(getOrders);

  const orders = useMemo(() => {
    if (!data) return [];
    return data.filter((o) => o.status !== 'Cancelled' && o.status !== 'Expired');
  }, [data]);

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
        <span className="text-xs text-gray-500">{orders.length} active travelers</span>
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
      </div>

      {/* Traveler Cards */}
      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <TravelerCard key={order.id || i} order={order} />
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
