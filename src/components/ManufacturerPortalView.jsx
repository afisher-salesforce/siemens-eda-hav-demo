import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Factory,
  Wrench,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getManufacturerData } from '../api/salesforce';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';
import { useSalesforceData } from '../hooks/useSalesforceData';

const darkTooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #1e293b',
  backgroundColor: '#111827',
  fontSize: '12px',
  color: '#94a3b8',
};

const STATUS_COLORS = {
  New: '#f59e0b',
  'In Progress': '#3b82f6',
  Completed: '#10b981',
  Closed: '#6b7280',
  'On Hold': '#f97316',
};

const PIE_COLORS = ['#009999', '#6366f1', '#f59e0b', '#f97316', '#10b981'];

function PriorityBadge({ priority }) {
  const styles = {
    Critical: 'badge-red',
    High: 'badge-orange',
    Medium: 'badge-yellow',
    Low: 'badge-gray',
  };
  return <span className={`badge ${styles[priority] || 'badge-gray'}`}>{priority || '--'}</span>;
}

function StatusBadge({ status }) {
  const styles = {
    New: 'badge-yellow',
    'In Progress': 'badge-blue',
    Completed: 'badge-green',
    Closed: 'badge-gray',
    'On Hold': 'badge-red',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status || '--'}</span>;
}

function MetricCard({ icon: Icon, label, value, subtitle, color = 'text-siemens-accent' }) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}

export default function ManufacturerPortalView() {
  const { data, loading, error, refetch } = useSalesforceData(getManufacturerData);
  const [vendorFilter, setVendorFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    if (!data?.workOrders) return [];
    if (vendorFilter === 'all') return data.workOrders;
    return data.workOrders.filter((wo) => wo.vendor === vendorFilter);
  }, [data, vendorFilter]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const counts = {};
    for (const wo of filteredOrders) {
      counts[wo.status] = (counts[wo.status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Cost by vendor for bar chart
  const costByVendor = useMemo(() => {
    if (!data?.vendorSummary) return [];
    return data.vendorSummary.map((v) => ({
      vendor: v.vendor.length > 20 ? v.vendor.substring(0, 18) + '…' : v.vendor,
      parts: Math.round(v.totalCost * 0.6),
      labor: Math.round(v.totalCost * 0.4),
    }));
  }, [data]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Manufacturer Data</h3>
        <p className="text-sm text-gray-500 max-w-md mb-4">{error}</p>
        <button onClick={refetch} className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton w-64 h-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton w-full h-24" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '--';

  return (
    <div className="space-y-6">
      <DemoContextPanel {...CONTEXT.manufacturer} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-white">Contract Manufacturer Portal</h1>
            <p className="text-xs text-gray-500">
              Work order management, cost analysis, and vendor performance
            </p>
          </div>
        </div>
        {/* Vendor Filter */}
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-surface-border rounded-md bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30"
        >
          <option value="all">All Vendors</option>
          {(data?.vendorSummary || []).map((v) => (
            <option key={v.vendor} value={v.vendor}>{v.vendor}</option>
          ))}
        </select>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Wrench} label="Total Work Orders" value={metrics.totalWorkOrders} subtitle={`${metrics.openWorkOrders} open, ${metrics.completedWorkOrders} completed`} />
        <MetricCard icon={DollarSign} label="Total Cost" value={fmt(metrics.totalCost)} subtitle="estimated repair costs" color="text-amber-400" />
        <MetricCard icon={Package} label="Parts Cost" value={fmt(metrics.totalPartsCost)} subtitle={`${metrics.totalCost > 0 ? Math.round((metrics.totalPartsCost / metrics.totalCost) * 100) : 0}% of total`} color="text-blue-400" />
        <MetricCard icon={Users} label="Labor Cost" value={fmt(metrics.totalLaborCost)} subtitle={`${metrics.totalCost > 0 ? Math.round((metrics.totalLaborCost / metrics.totalCost) * 100) : 0}% of total`} color="text-purple-400" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown by Vendor */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Cost Breakdown by Vendor
            </h2>
          </div>
          <div className="section-card-body">
            {costByVendor.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={costByVendor} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="vendor" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#1e293b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#1e293b' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={darkTooltipStyle} formatter={(v) => [`$${Number(v).toLocaleString()}`, '']} />
                  <Bar dataKey="parts" name="Parts" fill="#3b82f6" stackId="cost" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="labor" name="Labor" fill="#8b5cf6" stackId="cost" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-gray-600">No vendor data</div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Work Order Status Distribution
            </h2>
          </div>
          <div className="section-card-body">
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {statusDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={STATUS_COLORS[entry.name] || PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={darkTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-gray-600">No status data</div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Summary Cards */}
      {data?.vendorSummary && data.vendorSummary.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Vendor Performance</h2>
          </div>
          <div className="section-card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.vendorSummary.map((v, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    vendorFilter === v.vendor
                      ? 'border-siemens-accent/50 bg-siemens-teal/5'
                      : 'border-surface-border hover:border-gray-600'
                  }`}
                  onClick={() => setVendorFilter(vendorFilter === v.vendor ? 'all' : v.vendor)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-200">{v.vendor}</h3>
                    <span className="text-xs text-gray-500">{v.totalOrders} orders</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-amber-400">{v.openOrders}</div>
                      <div className="text-[9px] text-gray-500 uppercase">Open</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-emerald-400">{v.completedOrders}</div>
                      <div className="text-[9px] text-gray-500 uppercase">Complete</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-400">{fmt(v.avgCost)}</div>
                      <div className="text-[9px] text-gray-500 uppercase">Avg Cost</div>
                    </div>
                  </div>
                  {/* Completion bar */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${v.totalOrders > 0 ? (v.completedOrders / v.totalOrders) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-gray-600 mt-1">
                      {v.totalOrders > 0 ? Math.round((v.completedOrders / v.totalOrders) * 100) : 0}% completion rate
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Work Orders Table */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
            Work Orders {vendorFilter !== 'all' ? `— ${vendorFilter}` : ''}
          </h2>
          <span className="text-[10px] text-gray-500">{filteredOrders.length} orders</span>
        </div>
        <div className="section-card-body p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>WO #</th>
                  <th>Asset</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>RMA</th>
                  <th>Parts $</th>
                  <th>Labor $</th>
                  <th>Total $</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((wo) => (
                  <tr key={wo.id}>
                    <td className="font-mono text-xs">
                      <Link to={`/workorders/${wo.id}`} className="text-siemens-accent hover:underline">
                        {wo.workOrderNumber}
                      </Link>
                    </td>
                    <td className="text-gray-200 text-sm font-medium">{wo.assetName || '--'}</td>
                    <td className="text-gray-400 text-xs">{wo.productName || '--'}</td>
                    <td className="text-gray-400">{wo.customer || '--'}</td>
                    <td><StatusBadge status={wo.status} /></td>
                    <td><PriorityBadge priority={wo.priority} /></td>
                    <td className="font-mono text-xs text-gray-500">{wo.rmaNumber || '--'}</td>
                    <td className="text-blue-400 font-mono text-xs">{wo.partsCost != null ? fmt(wo.partsCost) : '--'}</td>
                    <td className="text-purple-400 font-mono text-xs">{wo.laborCost != null ? fmt(wo.laborCost) : '--'}</td>
                    <td className="text-amber-400 font-mono text-xs font-medium">{wo.estimatedCost != null ? fmt(wo.estimatedCost) : '--'}</td>
                    <td className="text-gray-400 text-center">
                      {wo.turnaroundDays != null ? (
                        <span className={wo.turnaroundDays > 30 ? 'text-orange-400 font-medium' : wo.turnaroundDays > 14 ? 'text-amber-400' : 'text-gray-400'}>
                          {wo.turnaroundDays}d
                        </span>
                      ) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
