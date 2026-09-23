import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, AlertTriangle, Wrench } from 'lucide-react';
import { getWorkOrders } from '../api/salesforce';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';
import { useSalesforceData } from '../hooks/useSalesforceData';
import { useSlackChannels } from '../hooks/useSlackChannels';
import { getSlackChannelName } from '../utils/slackChannel';

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
    Cancelled: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status || '--'}</span>;
}

function formatCurrency(value) {
  if (value == null) return '--';
  return `$${value.toLocaleString()}`;
}

export default function WorkOrdersView() {
  const { data, loading, error, refetch } = useSalesforceData(getWorkOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const workOrders = data || [];

  // Derive Slack channel names for all work orders
  const slackChannelNames = useMemo(
    () => workOrders.map((w) => getSlackChannelName('workorder', w.workOrderNumber)),
    [workOrders]
  );
  const { hasChannel: slackChannels } = useSlackChannels(slackChannelNames);

  const priorities = useMemo(
    () => [...new Set(workOrders.map((w) => w.priority).filter(Boolean))].sort(),
    [workOrders]
  );
  const statuses = useMemo(
    () => [...new Set(workOrders.map((w) => w.status).filter(Boolean))].sort(),
    [workOrders]
  );

  const filtered = useMemo(() => {
    return workOrders.filter((w) => {
      if (filterPriority && w.priority !== filterPriority) return false;
      if (filterStatus && w.status !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (w.workOrderNumber && w.workOrderNumber.toLowerCase().includes(term)) ||
          (w.subject && w.subject.toLowerCase().includes(term)) ||
          (w.assetName && w.assetName.toLowerCase().includes(term)) ||
          (w.customer && w.customer.toLowerCase().includes(term)) ||
          (w.rmaNumber && w.rmaNumber.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [workOrders, filterPriority, filterStatus, searchTerm]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Work Orders</h3>
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

  return (
    <div className="space-y-4">
      <DemoContextPanel {...CONTEXT.workorders} />
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-gray-600"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-500" />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
          >
            <option value="">All Priorities</option>
            {priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 ml-auto text-xs text-gray-500">
          <Wrench size={12} />
          <span>{loading ? 'Loading...' : `${filtered.length} work orders`}</span>
        </div>
      </div>

      {/* Table */}
      <div className="section-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton w-full h-10" />
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10 text-center"><span className="sr-only">Slack</span></th>
                  <th>WO #</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Asset</th>
                  <th>Customer</th>
                  <th>RMA #</th>
                  <th>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((wo, i) => {
                    const channelName = getSlackChannelName('workorder', wo.workOrderNumber);
                    const hasSlack = channelName && slackChannels.has(channelName);
                    return (
                    <tr key={wo.id || i}>
                      <td className="text-center w-10">
                        {hasSlack && (
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full bg-siemens-teal"
                            title="Slack channel active"
                          />
                        )}
                      </td>
                      <td className="font-medium whitespace-nowrap">
                        <Link
                          to={`/workorders/${wo.id}`}
                          className="text-siemens-accent hover:underline"
                        >
                          {wo.workOrderNumber || '--'}
                        </Link>
                      </td>
                      <td className="text-gray-200 max-w-xs truncate">{wo.subject || '--'}</td>
                      <td>
                        <PriorityBadge priority={wo.priority} />
                      </td>
                      <td>
                        <StatusBadge status={wo.status} />
                      </td>
                      <td className="text-gray-400 whitespace-nowrap">{wo.assetName || '--'}</td>
                      <td className="text-gray-400">{wo.customer || '--'}</td>
                      <td className="font-mono text-xs text-gray-500">{wo.rmaNumber || '--'}</td>
                      <td className="font-medium text-white">
                        {formatCurrency(wo.estimatedCost)}
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-600">
                      No work orders match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
