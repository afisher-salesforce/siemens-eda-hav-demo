import React from 'react';
import { DollarSign, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { getFinancials } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

const COLORS = ['#009999', '#006666', '#00b8b8', '#003333', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6'];

const darkTooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #1e293b',
  backgroundColor: '#111827',
  fontSize: '12px',
  color: '#94a3b8',
};

function formatCurrency(value) {
  if (value == null) return '--';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export default function FinancialsView() {
  const { data, loading, error, refetch } = useSalesforceData(getFinancials);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Financial Data</h3>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="metric-card">
              <div className="skeleton w-20 h-4 mb-3" />
              <div className="skeleton w-28 h-8 mb-2" />
              <div className="skeleton w-16 h-3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="section-card">
            <div className="section-card-body">
              <div className="skeleton w-full h-64" />
            </div>
          </div>
          <div className="section-card">
            <div className="section-card-body">
              <div className="skeleton w-full h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const revenue = data?.revenue || {};
  const productBreakdown = data?.productBreakdown || [];
  const leaseBreakdown = data?.leaseBreakdown || [];
  const repairCosts = data?.repairCosts || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="metric-card relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-siemens-teal" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-siemens-accent" />
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-semibold">
                Total Revenue Estimate
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(revenue.total)}
            </div>
            {revenue.period && (
              <div className="text-xs text-gray-500 mt-1">{revenue.period}</div>
            )}
          </div>
        </div>

        <div className="metric-card relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-emerald-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-semibold">
                Monthly Recurring
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(revenue.monthlyRecurring)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Per month</div>
          </div>
        </div>

        <div className="metric-card relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-amber-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-semibold">
                Open Repair Costs
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(repairCosts.total)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {repairCosts.openCount ?? '--'} open work orders
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Product */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Revenue by Product</h2>
          </div>
          <div className="section-card-body">
            {productBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productBreakdown} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="product"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#1e293b' }}
                    tickLine={{ stroke: '#1e293b' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#1e293b' }}
                    tickLine={{ stroke: '#1e293b' }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                    contentStyle={darkTooltipStyle}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {productBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-gray-600">
                No product breakdown available
              </div>
            )}
          </div>
        </div>

        {/* Assets by Lease Type */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Assets by Lease Type</h2>
          </div>
          <div className="section-card-body">
            {leaseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leaseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="leaseType"
                    label={({ leaseType, percent }) =>
                      `${leaseType} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: '#475569' }}
                  >
                    {leaseBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={darkTooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-gray-600">
                No lease data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Repair Costs Detail */}
      {repairCosts.items && repairCosts.items.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Open Repair Cost Details</h2>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Work Order</th>
                    <th>Asset</th>
                    <th>Customer</th>
                    <th>Description</th>
                    <th>Estimated Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {repairCosts.items.map((item, i) => (
                    <tr key={i}>
                      <td className="font-medium text-gray-200">{item.workOrderNumber || '--'}</td>
                      <td className="text-gray-400">{item.asset || '--'}</td>
                      <td className="text-gray-400">{item.customer || '--'}</td>
                      <td className="text-gray-400 max-w-xs truncate">{item.description || '--'}</td>
                      <td className="font-medium text-white">
                        {formatCurrency(item.estimatedCost)}
                      </td>
                      <td>
                        <span className="badge badge-orange">{item.status || '--'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tableau Next Financial Analytics Embed */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-siemens-accent" />
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Revenue Intelligence
            </h2>
          </div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-siemens-teal animate-pulse" />
            Tableau Next
          </span>
        </div>
        <div className="section-card-body">
          <div className="bg-surface-bg rounded-lg border border-surface-border overflow-hidden">
            <div className="flex items-center justify-center py-20 text-center">
              <div>
                <BarChart3 size={40} className="text-siemens-teal/30 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium mb-1">Financial Analytics Dashboard</p>
                <p className="text-xs text-gray-600 max-w-sm">
                  Tableau Next visualization showing revenue trends, COGS reconciliation,
                  and actuals vs. plan metrics powered by Data Cloud semantic models.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-siemens-teal/10 border border-siemens-teal/20 text-[10px] text-siemens-accent uppercase tracking-wider font-medium">
                  <BarChart3 size={10} />
                  HAV_Operations_Dashboard
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
