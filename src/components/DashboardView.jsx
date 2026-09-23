import React, { useState } from 'react';
import {
  Server,
  Activity,
  Gauge,
  Wrench,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap,
  TrendingUp,
  RefreshCcw,
  Shield,
  Factory,
  ChevronRight,
  ChevronDown,
  MapPin,
  Cpu,
  Calendar,
  Hash,
  Plug,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getDashboardSummary } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';

function MetricCard({ icon: Icon, label, value, change, changeType, color, glowColor }) {
  return (
    <div className="metric-card group relative overflow-hidden">
      {/* Subtle glow background */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30"
        style={{ backgroundColor: color }}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }}
          >
            <Icon size={18} style={{ color }} />
          </div>
          {change !== undefined && change !== null && (
            <div
              className={`flex items-center text-xs font-semibold ${
                changeType === 'up' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {changeType === 'up' ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              {change}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-[0.08em] font-medium">
          {label}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="metric-card">
            <div className="skeleton w-9 h-9 rounded-lg mb-3" />
            <div className="skeleton w-20 h-7 mb-2" />
            <div className="skeleton w-24 h-3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="section-card">
          <div className="section-card-header">
            <div className="skeleton w-40 h-5" />
          </div>
          <div className="section-card-body">
            <div className="skeleton w-full h-52" />
          </div>
        </div>
        <div className="section-card">
          <div className="section-card-header">
            <div className="skeleton w-40 h-5" />
          </div>
          <div className="section-card-body">
            <div className="skeleton w-full h-52" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle size={48} className="text-amber-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Dashboard</h3>
      <p className="text-sm text-gray-500 max-w-md mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Error: 'badge-red',
    Warning: 'badge-yellow',
    Critical: 'badge-red',
    Running: 'badge-green',
    Idle: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

const darkTooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #1e293b',
  backgroundColor: '#111827',
  fontSize: '12px',
  color: '#94a3b8',
};

export default function DashboardView() {
  const { data, loading, error, refetch } = useSalesforceData(getDashboardSummary);
  const [expandedRenewal, setExpandedRenewal] = useState(null);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return <ErrorState message="No data received from server." onRetry={refetch} />;

  const metrics = data.metrics || {};
  const capacityData = data.locationCapacity || [];
  const alerts = data.recentAlerts || [];
  const renewals = data.contractRenewals || [];

  return (
    <div className="space-y-6">
      <DemoContextPanel {...CONTEXT.dashboard} />
      {/* Hero Region Banner — like the SAN FRANCISCO banner in Claudeforce */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="region-badge">Global Fleet</span>
          <span className="hero-metric">
            {metrics.revenueEstimate != null
              ? `$${(metrics.revenueEstimate / 1000000).toFixed(1)}M`
              : '--'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          {[
            { label: 'ACTIVE', value: metrics.activeAssets ?? '--', color: '#10b981' },
            { label: 'ALERTS', value: metrics.criticalAlerts ?? 0, color: metrics.criticalAlerts > 0 ? '#ef4444' : '#64748b' },
            { label: 'UTIL', value: metrics.avgUtilization != null ? `${metrics.avgUtilization}%` : '--', color: '#00b8b8' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-0.5">
                {item.label}
              </div>
              <div className="text-lg font-bold" style={{ color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          icon={Server}
          label="Total Assets"
          value={metrics.totalAssets ?? '--'}
          color="#009999"
        />
        <MetricCard
          icon={Activity}
          label="Active Assets"
          value={metrics.activeAssets ?? '--'}
          change={metrics.activeChange}
          changeType="up"
          color="#10b981"
        />
        <MetricCard
          icon={Gauge}
          label="Avg Utilization"
          value={metrics.avgUtilization != null ? `${metrics.avgUtilization}%` : '--'}
          color="#6366f1"
        />
        <MetricCard
          icon={Wrench}
          label="Open Work Orders"
          value={metrics.openWorkOrders ?? '--'}
          color="#f59e0b"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Critical Alerts"
          value={metrics.criticalAlerts ?? '--'}
          changeType={metrics.criticalAlerts > 0 ? 'down' : undefined}
          color="#ef4444"
        />
        <MetricCard
          icon={DollarSign}
          label="Revenue Estimate"
          value={
            metrics.revenueEstimate != null
              ? `$${(metrics.revenueEstimate / 1000000).toFixed(1)}M`
              : '--'
          }
          change={metrics.revenueChange}
          changeType="up"
          color="#009999"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Capacity Bar Chart */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Rack Occupancy by Location
            </h2>
          </div>
          <div className="section-card-body">
            {capacityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={capacityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#1e293b' }}
                    tickLine={{ stroke: '#1e293b' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#1e293b' }}
                    tickLine={{ stroke: '#1e293b' }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Occupancy']}
                    contentStyle={darkTooltipStyle}
                  />
                  <Bar dataKey="occupancy" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {capacityData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.occupancy > 85
                            ? '#ef4444'
                            : entry.occupancy > 70
                            ? '#f59e0b'
                            : '#009999'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-gray-600">
                No capacity data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Telemetry Alerts — styled like signal feed */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Telemetry Signals
            </h2>
            {alerts.length > 0 && (
              <span className="badge badge-red">
                <Zap size={10} className="mr-1" />
                {alerts.length}
              </span>
            )}
          </div>
          <div className="section-card-body p-0">
            {alerts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Status</th>
                      <th>Signal</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.slice(0, 8).map((alert, i) => (
                      <tr key={i}>
                        <td className="font-medium text-gray-200 whitespace-nowrap">
                          {alert.assetName || '--'}
                        </td>
                        <td>
                          <StatusBadge status={alert.status} />
                        </td>
                        <td className="text-gray-400 max-w-xs truncate text-xs">
                          {alert.message || '--'}
                        </td>
                        <td className="text-gray-600 text-xs whitespace-nowrap font-mono">
                          {alert.timestamp
                            ? new Date(alert.timestamp).toLocaleTimeString()
                            : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-gray-600">
                No active signals
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loaner Conversion Banner */}
      {(metrics.activeLoaners > 0 || metrics.loanersExpiringSoon > 0) && (
        <Link
          to="/assets/loaners"
          className="block section-card group hover:border-amber-500/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <RefreshCcw size={20} className="text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-200">
                  Loaner-to-Sale Conversion
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {metrics.activeLoaners} active loaner{metrics.activeLoaners !== 1 ? 's' : ''} in field
                  {metrics.loanersExpiringSoon > 0 && (
                    <span className="text-amber-400 ml-2">
                      · {metrics.loanersExpiringSoon} expiring within 90 days
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-500 group-hover:text-siemens-accent transition-colors">
              <span className="text-xs">View Pipeline</span>
              <ArrowUpRight size={14} />
            </div>
          </div>
        </Link>
      )}

      {/* Operations Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/orders/compliance"
          className="section-card group hover:border-red-500/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                <Shield size={20} className="text-red-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-200">Trade Compliance</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Embargo screening, restricted parties, ECCN classifications
                </div>
              </div>
            </div>
            <ArrowUpRight size={14} className="text-gray-500 group-hover:text-siemens-accent transition-colors" />
          </div>
        </Link>
        <Link
          to="/workorders/manufacturer"
          className="section-card group hover:border-blue-500/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                <Factory size={20} className="text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-200">Manufacturer Portal</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Vendor performance, cost breakdown, work order tracking
                </div>
              </div>
            </div>
            <ArrowUpRight size={14} className="text-gray-500 group-hover:text-siemens-accent transition-colors" />
          </div>
        </Link>
      </div>

      {/* Exceptions & Escalations — surfaces problem records */}
      <div className="section-card border-amber-500/20">
        <div className="section-card-header">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <h2 className="text-[11px] font-semibold text-amber-400 uppercase tracking-[0.1em]">
              Exceptions & Escalations
            </h2>
          </div>
          <span className="badge badge-yellow">
            {2} Requires Attention
          </span>
        </div>
        <div className="section-card-body p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Issue</th>
                  <th>Assigned To</th>
                  <th>Age</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-red-500/[0.03]">
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <Wrench size={12} className="text-amber-400" />
                      <span className="text-gray-300">Work Order</span>
                    </span>
                  </td>
                  <td className="font-medium text-gray-200 font-mono">WO-2024-0847</td>
                  <td className="text-gray-400 text-xs max-w-xs">
                    Serial number mismatch — field asset SN VLX-7842 does not match CRM record SN VLX-7824. Board swap pending verification.
                  </td>
                  <td className="text-gray-300 text-xs">Ken Snyder</td>
                  <td>
                    <span className="text-red-400 font-mono text-xs font-semibold">12d</span>
                  </td>
                  <td>
                    <span className="badge badge-red">Escalated</span>
                  </td>
                </tr>
                <tr className="bg-amber-500/[0.03]">
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <Shield size={12} className="text-red-400" />
                      <span className="text-gray-300">Order</span>
                    </span>
                  </td>
                  <td className="font-medium text-gray-200 font-mono">ORD-2024-1203</td>
                  <td className="text-gray-400 text-xs max-w-xs">
                    Compliance hold — end-user entity flagged for additional EAR screening. Awaiting export control review before shipment release.
                  </td>
                  <td className="text-gray-300 text-xs">Russell Forsyth</td>
                  <td>
                    <span className="text-amber-400 font-mono text-xs font-semibold">3d</span>
                  </td>
                  <td>
                    <span className="badge badge-orange">On Hold</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Contract Renewals — styled like the accounts/opportunities list */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
            Upcoming Contract Renewals
          </h2>
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-siemens-accent" />
            <span className="text-[10px] text-siemens-accent font-medium uppercase tracking-wider">
              AI Monitored
            </span>
          </div>
        </div>
        <div className="section-card-body p-0">
          {renewals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>Customer</th>
                    <th>Asset</th>
                    <th>Contract End</th>
                    <th>Lease Type</th>
                    <th>Monthly Value</th>
                    <th>Days Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {renewals.map((r, i) => {
                    const daysLeft = r.contractEnd
                      ? Math.ceil(
                          (new Date(r.contractEnd) - new Date()) / (1000 * 60 * 60 * 24)
                        )
                      : null;
                    const isExpanded = expandedRenewal === i;
                    return (
                      <React.Fragment key={i}>
                        <tr
                          className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                          onClick={() => setExpandedRenewal(isExpanded ? null : i)}
                        >
                          <td className="w-8 text-center">
                            {isExpanded ? (
                              <ChevronDown size={14} className="text-siemens-accent inline" />
                            ) : (
                              <ChevronRight size={14} className="text-gray-500 inline" />
                            )}
                          </td>
                          <td className="font-medium text-gray-200">{r.customer || '--'}</td>
                          <td className="text-gray-400">{r.assetName || '--'}</td>
                          <td className="text-gray-400">
                            {r.contractEnd
                              ? new Date(r.contractEnd).toLocaleDateString()
                              : '--'}
                          </td>
                          <td>
                            <span className="badge badge-teal">{r.leaseType || '--'}</span>
                          </td>
                          <td className="text-white font-semibold">
                            {r.monthlyValue != null
                              ? `$${r.monthlyValue.toLocaleString()}`
                              : '--'}
                          </td>
                          <td>
                            {daysLeft != null ? (
                              <span
                                className={`badge ${
                                  daysLeft <= 30
                                    ? 'badge-red'
                                    : daysLeft <= 90
                                    ? 'badge-yellow'
                                    : 'badge-green'
                                }`}
                              >
                                {daysLeft}d
                              </span>
                            ) : (
                              '--'
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="bg-[#0a0f1a] border-b border-surface-border p-0">
                              <div className="px-6 py-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="flex items-start gap-2">
                                    <Cpu size={14} className="text-siemens-accent mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Product</div>
                                      <div className="text-sm text-gray-200 mt-0.5">{r.product || '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Hash size={14} className="text-gray-500 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Serial Number</div>
                                      <div className="text-sm text-gray-200 mt-0.5 font-mono">{r.serialNumber || '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <MapPin size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Location</div>
                                      <div className="text-sm text-gray-200 mt-0.5">{r.location || '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Server size={14} className="text-gray-500 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Rack Position</div>
                                      <div className="text-sm text-gray-200 mt-0.5">{r.rackPosition || '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Activity size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Status</div>
                                      <div className="text-sm mt-0.5">
                                        <span className={`badge ${r.status === 'Installed' ? 'badge-green' : r.status === 'Shipped' ? 'badge-blue' : 'badge-gray'}`}>
                                          {r.status || '--'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Gauge size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Utilization</div>
                                      <div className="text-sm text-gray-200 mt-0.5">{r.utilization != null ? `${r.utilization}%` : '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Plug size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Power Draw</div>
                                      <div className="text-sm text-gray-200 mt-0.5">{r.powerDraw != null ? `${r.powerDraw} kW` : '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Calendar size={14} className="text-gray-500 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Install Date</div>
                                      <div className="text-sm text-gray-200 mt-0.5">{r.installDate ? new Date(r.installDate).toLocaleDateString() : '--'}</div>
                                    </div>
                                  </div>
                                </div>
                                {/* Annual value callout */}
                                {r.monthlyValue > 0 && (
                                  <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                      <DollarSign size={14} className="text-emerald-400" />
                                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Annual Contract Value</span>
                                      <span className="text-sm text-emerald-400 font-bold ml-1">${(r.monthlyValue * 12).toLocaleString()}</span>
                                    </div>
                                    {r.id && (
                                      <Link
                                        to={`/assets/${r.id}`}
                                        className="ml-auto flex items-center gap-1.5 text-xs text-siemens-accent hover:text-white transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        View Asset Detail
                                        <ArrowUpRight size={12} />
                                      </Link>
                                    )}
                                  </div>
                                )}
                                {r.monthlyValue === 0 && r.id && (
                                  <div className="mt-4 pt-3 border-t border-surface-border flex justify-end">
                                    <Link
                                      to={`/assets/${r.id}`}
                                      className="flex items-center gap-1.5 text-xs text-siemens-accent hover:text-white transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View Asset Detail
                                      <ArrowUpRight size={12} />
                                    </Link>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-gray-600">
              No upcoming renewals
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
