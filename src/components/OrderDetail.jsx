import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  AlertTriangle,
  ChevronRight,
  Calendar,
  DollarSign,
  Building,
  FileText,
  Hash,
  Clock,
  Tag,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getOrders, getWorkOrders, getAssets } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import SlackFeed from './SlackFeed';
import { getSlackChannelName } from '../utils/slackChannel';

const darkTooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #1e293b',
  backgroundColor: '#111827',
  fontSize: '12px',
  color: '#94a3b8',
};

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

function DetailRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-border last:border-0">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      <span className="text-sm text-gray-200 font-medium">{value || '--'}</span>
    </div>
  );
}

function formatCurrency(value) {
  if (value == null) return '--';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 100000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString();
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data: allOrders, loading: ordersLoading } = useSalesforceData(getOrders);
  const { data: allWorkOrders, loading: woLoading } = useSalesforceData(getWorkOrders);
  const { data: allAssets, loading: assetsLoading } = useSalesforceData(getAssets);

  const order = useMemo(() => {
    if (!allOrders) return null;
    return allOrders.find(
      (o) => o.id === orderId || o.orderNumber === orderId
    );
  }, [allOrders, orderId]);

  // Other orders for the same customer
  const customerOrders = useMemo(() => {
    if (!allOrders || !order) return [];
    return allOrders
      .filter((o) => o.id !== order.id && o.customer && o.customer === order.customer)
      .slice(0, 8);
  }, [allOrders, order]);

  // Work orders for this customer's assets
  const customerWorkOrders = useMemo(() => {
    if (!allWorkOrders || !order) return [];
    return allWorkOrders
      .filter((wo) => wo.customer && wo.customer === order.customer)
      .slice(0, 6);
  }, [allWorkOrders, order]);

  // Customer's assets
  const customerAssets = useMemo(() => {
    if (!allAssets || !order) return [];
    return allAssets
      .filter((a) => a.customer && a.customer === order.customer)
      .slice(0, 8);
  }, [allAssets, order]);

  // COGS estimate for mini-visualization
  const cogsData = useMemo(() => {
    if (!order || !order.totalValue) return null;
    const revenue = order.totalValue;
    // Deterministic COGS from order ID hash
    let hash = 0;
    for (let i = 0; i < (order.id || '').length; i++) {
      hash = ((hash << 5) - hash) + (order.id || '').charCodeAt(i);
      hash |= 0;
    }
    const cogsRate = 0.55 + (Math.abs(hash) % 20) / 100; // 55-75%
    const cogs = Math.round(revenue * cogsRate);
    const margin = revenue - cogs;
    return { revenue, cogs, margin, marginPct: ((margin / revenue) * 100).toFixed(1) };
  }, [order]);

  // Contract duration
  const contractDuration = useMemo(() => {
    if (!order?.startDate || !order?.endDate) return null;
    const start = new Date(order.startDate);
    const end = new Date(order.endDate);
    const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30)));
    if (months >= 12) return `${Math.round(months / 12)} year${months >= 24 ? 's' : ''}`;
    return `${months} month${months > 1 ? 's' : ''}`;
  }, [order]);

  const loading = ordersLoading || woLoading || assetsLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton w-40 h-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="metric-card space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton w-full h-6" />
            ))}
          </div>
          <div className="section-card lg:col-span-2">
            <div className="section-card-body">
              <div className="skeleton w-full h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Order Not Found</h3>
        <p className="text-sm text-gray-500 max-w-md mb-4">
          The order &ldquo;{orderId}&rdquo; could not be found.
        </p>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-siemens-accent transition-colors"
        >
          <ArrowLeft size={16} />
          Orders
        </button>
        <ChevronRight size={14} className="text-gray-600" />
        <span className="text-gray-200 font-medium">{order.orderNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-3">
            <ShoppingCart size={22} className="text-siemens-accent" />
            {order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {order.customer || 'Unknown customer'}
            {order.agreementName ? ` \u00b7 ${order.agreementName}` : ''}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Properties Panel */}
        <div className="metric-card space-y-0">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
            Order Properties
          </h3>
          <DetailRow label="Order Number" value={order.orderNumber} icon={Hash} />
          {order.agreementName && (
            <DetailRow label="Agreement" value={order.agreementName} icon={FileText} />
          )}
          <DetailRow label="Customer" value={order.customer} icon={Building} />
          <DetailRow label="Product" value={order.product} icon={Tag} />
          <DetailRow
            label="Total Value"
            value={formatCurrency(order.totalValue)}
            icon={DollarSign}
          />
          {order.quantity != null && (
            <DetailRow label="Quantity" value={order.quantity} />
          )}
          <DetailRow label="Start Date" value={formatDate(order.startDate)} icon={Calendar} />
          <DetailRow label="End Date" value={formatDate(order.endDate)} icon={Clock} />
          {contractDuration && (
            <DetailRow label="Duration" value={contractDuration} />
          )}
          <DetailRow label="Status" value={order.status} />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary Cards */}
          {cogsData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="metric-card relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-siemens-teal" />
                <div className="relative">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    Revenue
                  </span>
                  <div className="text-xl font-bold text-white mt-1">
                    {formatCurrency(cogsData.revenue)}
                  </div>
                </div>
              </div>
              <div className="metric-card relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-amber-500" />
                <div className="relative">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    Est. COGS
                  </span>
                  <div className="text-xl font-bold text-amber-400 mt-1">
                    {formatCurrency(cogsData.cogs)}
                  </div>
                </div>
              </div>
              <div className="metric-card relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-emerald-500" />
                <div className="relative">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    Margin
                  </span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {cogsData.marginPct}%
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {formatCurrency(cogsData.margin)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Revenue vs COGS mini-chart */}
          {cogsData && (
            <div className="section-card">
              <div className="section-card-header">
                <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
                  Revenue vs COGS Breakdown
                </h2>
              </div>
              <div className="section-card-body">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={[
                      { name: 'Revenue', value: cogsData.revenue },
                      { name: 'COGS', value: cogsData.cogs },
                      { name: 'Margin', value: cogsData.margin },
                    ]}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#1e293b' }}
                      tickLine={{ stroke: '#1e293b' }}
                      tickFormatter={formatCurrency}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={70}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#1e293b' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value)]}
                      contentStyle={darkTooltipStyle}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      <Cell fill="#009999" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slack Channel */}
      <SlackFeed
        channelName={getSlackChannelName('order', order.orderNumber)}
        recordLabel={order.orderNumber}
        recordType="order"
      />

      {/* Customer Assets */}
      {customerAssets.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              {order.customer}&apos;s Assets
            </h2>
            <span className="text-[10px] text-gray-500">{customerAssets.length} assets</span>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Product</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {customerAssets.map((a, i) => (
                    <tr key={a.id || i}>
                      <td>
                        <Link
                          to={`/assets/${a.id}`}
                          className="font-medium text-siemens-accent hover:underline"
                        >
                          {a.name || '--'}
                        </Link>
                      </td>
                      <td className="text-gray-400">{a.product || '--'}</td>
                      <td className="text-gray-400 whitespace-nowrap">{a.location || '--'}</td>
                      <td>
                        <span
                          className={`badge ${
                            a.status === 'Active' || a.status === 'Running'
                              ? 'badge-green'
                              : a.status === 'Maintenance'
                              ? 'badge-orange'
                              : a.status === 'Offline' || a.status === 'Error'
                              ? 'badge-red'
                              : 'badge-gray'
                          }`}
                        >
                          {a.status || '--'}
                        </span>
                      </td>
                      <td className="text-gray-400">
                        {a.utilization != null ? `${a.utilization}%` : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Work Orders */}
      {customerWorkOrders.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Work Orders for {order.customer}
            </h2>
            <span className="text-[10px] text-gray-500">{customerWorkOrders.length} work orders</span>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>WO #</th>
                    <th>Asset</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerWorkOrders.map((wo, i) => (
                    <tr key={wo.id || i}>
                      <td>
                        <Link
                          to={`/workorders/${wo.id}`}
                          className="font-medium text-siemens-accent hover:underline whitespace-nowrap"
                        >
                          {wo.workOrderNumber || '--'}
                        </Link>
                      </td>
                      <td className="text-gray-400 whitespace-nowrap">{wo.assetName || '--'}</td>
                      <td className="text-gray-200 max-w-xs truncate">{wo.subject || '--'}</td>
                      <td>
                        <span
                          className={`badge ${
                            wo.priority === 'Critical'
                              ? 'badge-red'
                              : wo.priority === 'High'
                              ? 'badge-orange'
                              : wo.priority === 'Medium'
                              ? 'badge-blue'
                              : 'badge-gray'
                          }`}
                        >
                          {wo.priority || '--'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            wo.status === 'Completed' || wo.status === 'Closed'
                              ? 'badge-green'
                              : wo.status === 'In Progress'
                              ? 'badge-yellow'
                              : wo.status === 'New' || wo.status === 'Open'
                              ? 'badge-blue'
                              : 'badge-gray'
                          }`}
                        >
                          {wo.status || '--'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Other Orders for Same Customer */}
      {customerOrders.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Other Orders for {order.customer}
            </h2>
            <span className="text-[10px] text-gray-500">{customerOrders.length} orders</span>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Agreement</th>
                    <th>Total Value</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerOrders.map((o, i) => (
                    <tr key={o.id || i}>
                      <td>
                        <Link
                          to={`/orders/${o.id}`}
                          className="font-medium text-siemens-accent hover:underline whitespace-nowrap"
                        >
                          {o.orderNumber || '--'}
                        </Link>
                      </td>
                      <td className="text-gray-200">{o.agreementName || '--'}</td>
                      <td className="font-medium text-white">{formatCurrency(o.totalValue)}</td>
                      <td className="text-gray-500 whitespace-nowrap">{formatDate(o.startDate)}</td>
                      <td className="text-gray-500 whitespace-nowrap">{formatDate(o.endDate)}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
