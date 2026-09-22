import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Wrench,
  Filter,
  Search,
  Zap,
  Server,
  CheckCircle2,
  CircleDot,
  ArrowRight,
} from 'lucide-react';
import { getWorkOrders, getTelemetry } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

function PriorityBadge({ priority }) {
  const styles = {
    Critical: 'badge-red',
    High: 'badge-orange',
    Medium: 'badge-blue',
    Low: 'badge-gray',
  };
  return <span className={`badge ${styles[priority] || 'badge-gray'}`}>{priority || '--'}</span>;
}

function StatusBadge({ status }) {
  const styles = {
    New: 'badge-blue',
    Open: 'badge-blue',
    'In Progress': 'badge-yellow',
    'On Hold': 'badge-orange',
    Completed: 'badge-green',
    Closed: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status || '--'}</span>;
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '--';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

function TimelineEvent({ event, isLast }) {
  const isPriorityCritical = event.priority === 'Critical' || event.priority === 'High';

  return (
    <div className="flex gap-4">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full border-2 mt-1.5 ${
            event.status === 'Completed' || event.status === 'Closed'
              ? 'bg-emerald-500 border-emerald-500'
              : isPriorityCritical
              ? 'bg-red-500 border-red-500 animate-pulse'
              : event.status === 'In Progress'
              ? 'bg-siemens-teal border-siemens-teal'
              : 'bg-gray-700 border-gray-600'
          }`}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-800 min-h-[40px]" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="metric-card">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                {isPriorityCritical && (
                  <Zap size={12} className="text-red-400" />
                )}
                {event.subject || 'Incident Report'}
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {event.workOrderNumber} &middot; {event.assetName || 'Unknown Asset'} &middot;{' '}
                {event.customer || '--'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={event.priority} />
              <StatusBadge status={event.status} />
            </div>
          </div>

          {/* Resolution flow */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {[
              { label: 'Detected', done: true },
              { label: 'WO Created', done: true },
              {
                label: 'Spare Identified',
                done: event.status !== 'New' && event.status !== 'Open',
              },
              {
                label: 'Repair In Progress',
                done: event.status === 'In Progress' || event.status === 'Completed' || event.status === 'Closed',
                current: event.status === 'In Progress',
              },
              {
                label: 'Resolved',
                done: event.status === 'Completed' || event.status === 'Closed',
              },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <span
                  className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                    step.done
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : step.current
                      ? 'bg-siemens-teal/15 text-siemens-accent'
                      : 'bg-gray-800 text-gray-600'
                  }`}
                >
                  {step.label}
                </span>
                {i < arr.length - 1 && (
                  <ArrowRight size={10} className="text-gray-700" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-border">
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Clock size={10} />
              {event.createdDate ? formatTimeAgo(event.createdDate) : '--'}
            </span>
            {event.estimatedCost != null && (
              <span className="text-xs text-gray-400">
                Est. cost: <span className="text-white font-medium">${event.estimatedCost.toLocaleString()}</span>
              </span>
            )}
            {event.rmaNumber && (
              <span className="text-[10px] text-gray-500 font-mono">
                RMA: {event.rmaNumber}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FailureTimeline() {
  const { data: workOrders, loading: woLoading, error: woError, refetch } =
    useSalesforceData(getWorkOrders);
  const { data: telemetry, loading: telLoading } = useSalesforceData(() => getTelemetry(null, 200));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const loading = woLoading || telLoading;

  // Combine work orders with telemetry error events to build the timeline
  const timeline = useMemo(() => {
    const events = [];

    // Add work orders as incidents
    if (workOrders) {
      workOrders.forEach((wo) => {
        events.push({
          type: 'workorder',
          ...wo,
          timestamp: wo.createdDate || wo.startDate || new Date().toISOString(),
        });
      });
    }

    // Add telemetry errors as detection events
    if (telemetry) {
      telemetry
        .filter((t) => t.status === 'Error' || (t.errors && t.errors > 5))
        .forEach((t) => {
          events.push({
            type: 'telemetry_alert',
            subject: `Telemetry Alert: ${t.errors || 0} errors detected`,
            assetName: t.assetName,
            status: 'Open',
            priority: t.errors > 10 ? 'Critical' : 'High',
            timestamp: t.timestamp,
            createdDate: t.timestamp,
          });
        });
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return events;
  }, [workOrders, telemetry]);

  const filtered = useMemo(() => {
    return timeline.filter((e) => {
      if (filterPriority && e.priority !== filterPriority) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (e.subject && e.subject.toLowerCase().includes(term)) ||
          (e.assetName && e.assetName.toLowerCase().includes(term)) ||
          (e.customer && e.customer.toLowerCase().includes(term)) ||
          (e.workOrderNumber && e.workOrderNumber.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [timeline, filterPriority, searchTerm]);

  if (woError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Timeline</h3>
        <p className="text-sm text-gray-500 max-w-md mb-4">{woError}</p>
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton w-full h-32" />
        ))}
      </div>
    );
  }

  const criticalCount = timeline.filter((e) => e.priority === 'Critical').length;
  const openCount = timeline.filter(
    (e) => e.status === 'Open' || e.status === 'New' || e.status === 'In Progress'
  ).length;
  const resolvedCount = timeline.filter(
    (e) => e.status === 'Completed' || e.status === 'Closed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-white">Failure Timeline</h1>
            <p className="text-xs text-gray-500">
              Incident history — detection through resolution
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Critical Incidents
          </span>
          <div className="text-2xl font-bold text-red-400 mt-1">{criticalCount}</div>
        </div>
        <div className="metric-card">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Open
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{openCount}</div>
        </div>
        <div className="metric-card">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Resolved
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{resolvedCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-gray-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} events</span>
      </div>

      {/* Timeline */}
      {filtered.length > 0 ? (
        <div className="pl-2">
          {filtered.map((event, i) => (
            <TimelineEvent
              key={event.id || i}
              event={event}
              isLast={i === filtered.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="section-card">
          <div className="flex items-center justify-center py-16 text-sm text-gray-600">
            No incidents match the current filters
          </div>
        </div>
      )}
    </div>
  );
}
