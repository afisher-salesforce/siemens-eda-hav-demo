import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, AlertTriangle } from 'lucide-react';
import { getOrders } from '../api/salesforce';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';
import { useSalesforceData } from '../hooks/useSalesforceData';
import { useSlackChannels } from '../hooks/useSlackChannels';
import { getSlackChannelName } from '../utils/slackChannel';

function StatusBadge({ status }) {
  const styles = {
    Draft: 'badge-gray',
    Submitted: 'badge-blue',
    Approved: 'badge-teal',
    Active: 'badge-green',
    Fulfilled: 'badge-green',
    Cancelled: 'badge-red',
    Expired: 'badge-yellow',
    Pending: 'badge-yellow',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status || '--'}</span>;
}

function formatCurrency(value) {
  if (value == null) return '--';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 100000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export default function OrdersView() {
  const { data, loading, error, refetch } = useSalesforceData(getOrders);
  const [searchTerm, setSearchTerm] = useState('');

  const orders = data || [];

  // Derive Slack channel names for all orders
  const slackChannelNames = useMemo(
    () => orders.map((o) => getSlackChannelName('order', o.orderNumber)),
    [orders]
  );
  const { hasChannel: slackChannels } = useSlackChannels(slackChannelNames);

  const filtered = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(term)) ||
        (o.customer && o.customer.toLowerCase().includes(term)) ||
        (o.product && o.product.toLowerCase().includes(term)) ||
        (o.agreementName && o.agreementName.toLowerCase().includes(term))
    );
  }, [orders, searchTerm]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-th-secondary mb-2">Unable to Load Orders</h3>
        <p className="text-sm text-th-muted max-w-md mb-4">{error}</p>
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
      <DemoContextPanel {...CONTEXT.orders} />
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-th-faint"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto text-xs text-th-muted">
          <ShoppingCart size={12} />
          <span>{loading ? 'Loading...' : `${filtered.length} orders`}</span>
        </div>
      </div>

      {/* Table */}
      <div className="section-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton w-full h-10" />
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10 text-center"><span className="sr-only">Slack</span></th>
                  <th>Order #</th>
                  <th>Agreement</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total Value</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((order, i) => {
                    const channelName = getSlackChannelName('order', order.orderNumber);
                    const hasSlack = channelName && slackChannels.has(channelName);
                    return (
                    <tr key={order.id || i}>
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
                          to={`/orders/${order.id}`}
                          className="text-siemens-accent hover:underline"
                        >
                          {order.orderNumber || '--'}
                        </Link>
                      </td>
                      <td className="text-th-secondary">{order.agreementName || '--'}</td>
                      <td className="text-th-muted">{order.customer || '--'}</td>
                      <td className="text-th-muted">{order.product || '--'}</td>
                      <td className="text-th-secondary text-center">{order.quantity ?? '--'}</td>
                      <td className="font-medium text-th-primary">
                        {formatCurrency(order.totalValue)}
                      </td>
                      <td className="text-th-muted whitespace-nowrap">
                        {order.startDate
                          ? new Date(order.startDate).toLocaleDateString()
                          : '--'}
                      </td>
                      <td className="text-th-muted whitespace-nowrap">
                        {order.endDate
                          ? new Date(order.endDate).toLocaleDateString()
                          : '--'}
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-th-faint">
                      No orders match the current search
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
