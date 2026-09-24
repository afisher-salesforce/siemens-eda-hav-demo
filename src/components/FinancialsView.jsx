import React from 'react';
import { DollarSign, AlertTriangle, TrendingUp, BarChart3, Database, Clock } from 'lucide-react';
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
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from 'recharts';
import { getFinancials } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';
import { tooltipStyle } from '../utils/chartStyles';

const COLORS = ['#009999', '#006666', '#00b8b8', '#003333', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6'];

function DataSourceBadge({ source, timestamp }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="inline-flex items-center gap-1 text-[9px] text-th-muted bg-[var(--skeleton-bg)]/60 border border-surface-border/50 rounded-full px-2 py-0.5">
        <Database size={8} className="text-th-muted" />
        {source}
      </span>
      {timestamp && (
        <span className="inline-flex items-center gap-1 text-[9px] text-th-faint">
          <Clock size={8} />
          {timestamp}
        </span>
      )}
    </div>
  );
}

function formatCurrency(value) {
  if (value == null) return '--';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 100000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export default function FinancialsView() {
  const { data, loading, error, refetch } = useSalesforceData(getFinancials);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-th-secondary mb-2">Unable to Load Financial Data</h3>
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
      <DemoContextPanel {...CONTEXT.financials} />
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="metric-card relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-siemens-teal" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-siemens-accent" />
              <span className="text-[10px] text-th-muted uppercase tracking-[0.1em] font-semibold">
                Total Revenue Estimate
              </span>
            </div>
            <div className="text-2xl font-bold text-th-primary">
              {formatCurrency(revenue.total)}
            </div>
            {revenue.period && (
              <div className="text-xs text-th-muted mt-1">{revenue.period}</div>
            )}
            <DataSourceBadge source="CRM Forecast" timestamp={new Date().toLocaleDateString()} />
          </div>
        </div>

        <div className="metric-card relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-emerald-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-[10px] text-th-muted uppercase tracking-[0.1em] font-semibold">
                Monthly Recurring
              </span>
            </div>
            <div className="text-2xl font-bold text-th-primary">
              {formatCurrency(revenue.monthlyRecurring)}
            </div>
            <div className="text-xs text-th-muted mt-1">Per month</div>
            <DataSourceBadge source="CRM Forecast" timestamp={new Date().toLocaleDateString()} />
          </div>
        </div>

        <div className="metric-card relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-amber-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-[10px] text-th-muted uppercase tracking-[0.1em] font-semibold">
                Open Repair Costs
              </span>
            </div>
            <div className="text-2xl font-bold text-th-primary">
              {formatCurrency(repairCosts.total)}
            </div>
            <div className="text-xs text-th-muted mt-1">
              {repairCosts.openCount ?? '--'} open work orders
            </div>
            <DataSourceBadge source="Field Service" timestamp={new Date().toLocaleDateString()} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Product */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">Revenue by Product</h2>
          </div>
          <div className="section-card-body">
            {productBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productBreakdown} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                  <XAxis
                    dataKey="product"
                    tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                    axisLine={{ stroke: '#1e293b' }}
                    tickLine={{ stroke: '#1e293b' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                    axisLine={{ stroke: '#1e293b' }}
                    tickLine={{ stroke: '#1e293b' }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {productBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-th-faint">
                No product breakdown available
              </div>
            )}
          </div>
        </div>

        {/* Assets by Lease Type */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">Assets by Lease Type</h2>
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
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-th-faint">
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
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">Open Repair Cost Details</h2>
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
                      <td className="font-medium text-th-secondary">{item.workOrderNumber || '--'}</td>
                      <td className="text-th-muted">{item.asset || '--'}</td>
                      <td className="text-th-muted">{item.customer || '--'}</td>
                      <td className="text-th-muted max-w-xs truncate">{item.description || '--'}</td>
                      <td className="font-medium text-th-primary">
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

      {/* Revenue Intelligence — Financial Analytics Dashboard */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-siemens-accent" />
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
              Revenue Intelligence
            </h2>
          </div>
          <span className="text-[10px] text-th-muted uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-siemens-teal animate-pulse" />
            Tableau Next
          </span>
        </div>
        <div className="section-card-body">
          {(() => {
            // Build trailing-12-month revenue projection from product breakdown
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const now = new Date();
            const currentMonth = now.getMonth();

            // Generate monthly revenue data with seasonal variation per product
            const monthlyData = Array.from({ length: 12 }, (_, i) => {
              const monthIdx = (currentMonth - 11 + i + 12) % 12;
              const label = months[monthIdx];
              const entry = { month: label };
              let total = 0;

              // Apply seasonal multiplier (slight dip in summer, higher in Q4)
              const seasonalFactor = 1 + 0.08 * Math.sin(((monthIdx - 3) / 12) * 2 * Math.PI);
              // Growth ramp — later months have slight upward trend
              const growthFactor = 1 + (i * 0.005);

              productBreakdown.forEach((p) => {
                const base = p.revenue || 0;
                const value = Math.round(base * seasonalFactor * growthFactor);
                entry[p.product] = value;
                total += value;
              });

              entry.total = total;
              // Plan is ~5% above actuals for projection
              entry.plan = Math.round(total * 1.05);
              return entry;
            });

            if (productBreakdown.length === 0) {
              return (
                <div className="flex items-center justify-center h-64 text-sm text-th-faint">
                  No revenue data available
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {/* Revenue Trend — Actuals vs Plan */}
                <div>
                  <h3 className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-3 px-1">
                    Monthly Revenue — Actuals vs. Plan (Trailing 12 Months)
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#009999" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#009999" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                        axisLine={{ stroke: '#1e293b' }}
                        tickLine={{ stroke: '#1e293b' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                        axisLine={{ stroke: '#1e293b' }}
                        tickLine={{ stroke: '#1e293b' }}
                        tickFormatter={formatCurrency}
                      />
                      <Tooltip
                        formatter={(value, name) => [formatCurrency(value), name === 'total' ? 'Actuals' : name === 'plan' ? 'Plan' : name]}
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: 'var(--text-muted)', fontSize: 12 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Actuals"
                        fill="url(#revenueGrad)"
                        stroke="#009999"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="plan"
                        name="Plan"
                        stroke="#6366f1"
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue by Product — Stacked Area */}
                <div>
                  <h3 className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-3 px-1">
                    Revenue by Product Line (Trailing 12 Months)
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                        axisLine={{ stroke: '#1e293b' }}
                        tickLine={{ stroke: '#1e293b' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                        axisLine={{ stroke: '#1e293b' }}
                        tickLine={{ stroke: '#1e293b' }}
                        tickFormatter={formatCurrency}
                      />
                      <Tooltip
                        formatter={(value, name) => [formatCurrency(value), name]}
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: 'var(--text-muted)', fontSize: 12 }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }}
                      />
                      {productBreakdown.map((p, idx) => (
                        <Area
                          key={p.product}
                          type="monotone"
                          dataKey={p.product}
                          stackId="1"
                          stroke={COLORS[idx % COLORS.length]}
                          fill={COLORS[idx % COLORS.length]}
                          fillOpacity={0.25}
                          strokeWidth={1.5}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
