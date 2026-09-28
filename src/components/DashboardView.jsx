import React, { useState, useContext } from 'react';
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
  Send,
  Share2,
  PlusCircle,
  ArrowUpCircle,
  MessageSquare,
  CheckCircle2,
  Loader2,
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
import {
  getDashboardSummary,
  getDashboardExceptions,
  createAssetRecord,
  updateWorkOrderStatus,
} from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import { renderChartTooltip } from './ChartTooltip';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';
import { AgentChatContext } from './Layout';

const SLACK_API = '/api/slack';
const OPS_SLACK_CHANNEL = 'hav-operations';

function MetricCard({ icon: Icon, label, value, change, changeType, color, glowColor, to }) {
  const inner = (
    <>
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
                changeType === 'up' ? 'text-emerald-400' : 'text-orange-400'
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
          {to && change == null && (
            <ArrowUpRight
              size={14}
              className="text-th-faint group-hover:text-siemens-accent transition-colors"
            />
          )}
        </div>
        <div className="text-2xl font-bold text-th-primary">{value}</div>
        <div className="text-[10px] text-th-muted mt-1 uppercase tracking-[0.08em] font-medium">
          {label}
        </div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="metric-card group relative overflow-hidden block hover:border-siemens-accent/40 transition-colors cursor-pointer"
      >
        {inner}
      </Link>
    );
  }
  return <div className="metric-card group relative overflow-hidden">{inner}</div>;
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
      <h3 className="text-lg font-semibold text-th-secondary mb-2">Unable to Load Dashboard</h3>
      <p className="text-sm text-th-muted max-w-md mb-4">{message}</p>
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


const HORIZONS = [
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'QTD', label: 'QTD', days: null },
];

// Days remaining in the current calendar quarter (used for the QTD horizon)
function daysToQuarterEnd() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const quarterEnd = new Date(now.getFullYear(), q * 3 + 3, 0); // last day of quarter
  return Math.max(0, Math.ceil((quarterEnd - now) / (1000 * 60 * 60 * 24)));
}

export default function DashboardView() {
  const { data, loading, error, refetch } = useSalesforceData(getDashboardSummary);
  const {
    data: exceptionsData,
    loading: exceptionsLoading,
    refetch: refetchExceptions,
  } = useSalesforceData(getDashboardExceptions);
  const openAgentWithPrompt = useContext(AgentChatContext);
  const [expandedRenewal, setExpandedRenewal] = useState(null);
  const [horizon, setHorizon] = useState('90d');
  const [toast, setToast] = useState(null);
  const [busyAction, setBusyAction] = useState(null); // key of the in-flight action
  const [actionedRows, setActionedRows] = useState({}); // { rowKey: 'Task Created' | 'Escalated' | 'WO Created' }
  const [sharingBriefing, setSharingBriefing] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Slack share helper (resolve channel → fallback create → post) ──
  const shareToSlack = async (text, channel = OPS_SLACK_CHANNEL) => {
    let channelId;
    try {
      const resolveRes = await fetch(`${SLACK_API}/channel/${encodeURIComponent(channel)}`);
      if (resolveRes.ok) {
        const resolved = await resolveRes.json();
        channelId = resolved.id || resolved.channelId;
      }
    } catch {
      /* fall through to create */
    }
    if (!channelId) {
      const createRes = await fetch(`${SLACK_API}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: channel }),
      });
      if (!createRes.ok) throw new Error('Could not resolve or create Slack channel');
      const created = await createRes.json();
      channelId = created.id || created.channelId;
    }
    const postRes = await fetch(`${SLACK_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!postRes.ok) throw new Error('Failed to post message to Slack');
    return true;
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return <ErrorState message="No data received from server." onRetry={refetch} />;

  const metrics = data.metrics || {};
  const capacityData = data.locationCapacity || [];
  const alerts = data.recentAlerts || [];
  const renewals = data.contractRenewals || [];
  const exceptions = exceptionsData || [];

  const horizonDays = horizon === 'QTD' ? daysToQuarterEnd() : (HORIZONS.find((h) => h.key === horizon)?.days ?? 90);

  // ── Action handlers (real writes to the org) ──
  const handleShareException = async (ex, rowKey) => {
    setBusyAction(rowKey + ':slack');
    try {
      const text = `:rotating_light: *Exception surfaced from HAV Command Center*\n• *Type:* ${ex.type}\n• *Reference:* ${ex.reference}\n• *Issue:* ${ex.issue}\n• *Owner:* ${ex.assignedTo}\n• *Age:* ${ex.ageDays != null ? `${ex.ageDays}d` : '—'}  •  *Severity:* ${ex.severity}  •  *Status:* ${ex.status}`;
      await shareToSlack(text);
      showToast('success', `Shared ${ex.reference} to #${OPS_SLACK_CHANNEL}`);
    } catch (e) {
      showToast('error', e.message || 'Failed to share to Slack');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateTask = async (ex, rowKey) => {
    if (!ex.assetId) {
      showToast('error', 'No linked asset — cannot create a follow-up task for this record');
      return;
    }
    setBusyAction(rowKey + ':task');
    try {
      await createAssetRecord({
        recordType: 'Case',
        assetId: ex.assetId,
        subject: `Follow-up: ${ex.reference}`,
        description: ex.issue,
        priority: ex.severity === 'Critical' ? 'High' : 'Medium',
      });
      setActionedRows((prev) => ({ ...prev, [rowKey]: 'Task Created' }));
      showToast('success', `Follow-up task created for ${ex.reference}`);
    } catch (e) {
      showToast('error', e.message || 'Failed to create task');
    } finally {
      setBusyAction(null);
    }
  };

  const handleEscalate = async (ex, rowKey) => {
    if (!ex.refId) return;
    setBusyAction(rowKey + ':escalate');
    try {
      await updateWorkOrderStatus(ex.refId, { status: 'Escalated', priority: 'Critical' });
      setActionedRows((prev) => ({ ...prev, [rowKey]: 'Escalated' }));
      showToast('success', `${ex.reference} escalated to Critical`);
      refetchExceptions();
    } catch (e) {
      showToast('error', e.message || 'Failed to escalate work order');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateWO = async (alert, rowKey) => {
    if (!alert.assetId) {
      showToast('error', 'No linked asset — cannot open a work order from this signal');
      return;
    }
    setBusyAction(rowKey + ':wo');
    try {
      await createAssetRecord({
        recordType: 'WorkOrder',
        assetId: alert.assetId,
        subject: `Telemetry: ${alert.assetName || 'signal'}`,
        description: alert.message || 'Telemetry-triggered work order',
        priority: 'High',
      });
      setActionedRows((prev) => ({ ...prev, [rowKey]: 'WO Created' }));
      showToast('success', `Work order opened for ${alert.assetName || 'asset'}`);
    } catch (e) {
      showToast('error', e.message || 'Failed to create work order');
    } finally {
      setBusyAction(null);
    }
  };

  const handleShareBriefing = async () => {
    setSharingBriefing(true);
    try {
      const topRenewals = [...renewals]
        .map((r) => ({
          ...r,
          daysLeft: r.contractEnd
            ? Math.ceil((new Date(r.contractEnd) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
        }))
        .filter((r) => r.daysLeft != null)
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 3);

      const lines = [];
      lines.push(':bar_chart: *HAV Operations Daily Briefing*');
      lines.push('');
      lines.push('*KPIs*');
      lines.push(
        `• Revenue (annual est.): ${metrics.revenueEstimate != null ? `$${(metrics.revenueEstimate / 1000000).toFixed(1)}M` : '—'}`
      );
      lines.push(`• Assets: ${metrics.activeAssets ?? '—'} active / ${metrics.totalAssets ?? '—'} total`);
      lines.push(`• Avg utilization: ${metrics.avgUtilization != null ? `${metrics.avgUtilization}%` : '—'}`);
      lines.push(`• Open work orders: ${metrics.openWorkOrders ?? '—'}`);
      lines.push(`• Critical alerts: ${metrics.criticalAlerts ?? 0}`);
      lines.push('');
      lines.push(`*Open Exceptions (${exceptions.length})*`);
      if (exceptions.length > 0) {
        exceptions.forEach((ex) => {
          lines.push(`• [${ex.severity}] ${ex.type} ${ex.reference} — ${ex.issue} (${ex.assignedTo}, ${ex.ageDays != null ? `${ex.ageDays}d` : '—'})`);
        });
      } else {
        lines.push('• None — all clear :white_check_mark:');
      }
      lines.push('');
      lines.push('*Top Upcoming Renewals*');
      if (topRenewals.length > 0) {
        topRenewals.forEach((r) => {
          lines.push(`• ${r.customer || '—'} — ${r.assetName || '—'} — ${r.daysLeft}d remaining`);
        });
      } else {
        lines.push('• No renewals in window');
      }

      await shareToSlack(lines.join('\n'));
      showToast('success', `Daily briefing posted to #${OPS_SLACK_CHANNEL}`);
    } catch (e) {
      showToast('error', e.message || 'Failed to post briefing');
    } finally {
      setSharingBriefing(false);
    }
  };

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
        <div className="flex items-center gap-6 flex-wrap justify-end">
          {[
            { label: 'ACTIVE', value: metrics.activeAssets ?? '--', color: '#10b981' },
            { label: 'ALERTS', value: metrics.criticalAlerts ?? 0, color: metrics.criticalAlerts > 0 ? '#f97316' : '#64748b' },
            { label: 'UTIL', value: metrics.avgUtilization != null ? `${metrics.avgUtilization}%` : '--', color: '#00b8b8' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-[10px] font-semibold text-th-muted uppercase tracking-[0.12em] mb-0.5">
                {item.label}
              </div>
              <div className="text-lg font-bold" style={{ color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}

          {/* Time-horizon toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-card border border-surface-border">
            {HORIZONS.map((h) => (
              <button
                key={h.key}
                onClick={() => setHorizon(h.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  horizon === h.key
                    ? 'bg-siemens-teal text-white'
                    : 'text-th-muted hover:text-th-secondary hover:bg-surface-card-hover'
                }`}
                title={h.key === 'QTD' ? 'Quarter to date' : `Next ${h.label}`}
              >
                {h.label}
              </button>
            ))}
          </div>

          {/* Share Briefing to Slack */}
          <button
            onClick={handleShareBriefing}
            disabled={sharingBriefing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-siemens-teal/10 border border-siemens-teal/30 text-siemens-accent text-xs font-semibold hover:bg-siemens-teal/20 transition-colors disabled:opacity-60"
            title={`Post the daily briefing to #${OPS_SLACK_CHANNEL}`}
          >
            {sharingBriefing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Share Briefing
          </button>
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
          to="/workorders"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Critical Alerts"
          value={metrics.criticalAlerts ?? '--'}
          color="#f97316"
          to="/telemetry"
        />
        <MetricCard
          icon={DollarSign}
          label="Revenue Estimate (Annual)"
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
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
              Rack Occupancy by Location
            </h2>
          </div>
          <div className="section-card-body">
            {capacityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={capacityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                    axisLine={{ stroke: 'var(--surface-border)' }}
                    tickLine={{ stroke: 'var(--surface-border)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                    axisLine={{ stroke: 'var(--surface-border)' }}
                    tickLine={{ stroke: 'var(--surface-border)' }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={renderChartTooltip({
                      valueFormatter: (v) => `${v}%`,
                      labelForName: () => 'Occupancy',
                    })}
                  />
                  <Bar dataKey="occupancy" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {capacityData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.occupancy > 85
                            ? '#f97316'
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
              <div className="flex items-center justify-center h-64 text-sm text-th-faint">
                No capacity data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Telemetry Alerts — styled like signal feed */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
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
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.slice(0, 8).map((alert, i) => {
                      const rowKey = `alert-${i}`;
                      const actioned = actionedRows[rowKey];
                      const busy = busyAction === rowKey + ':wo';
                      return (
                        <tr key={i}>
                          <td className="font-medium text-th-secondary whitespace-nowrap">
                            {alert.assetName || '--'}
                          </td>
                          <td>
                            <StatusBadge status={alert.status} />
                          </td>
                          <td className="text-th-muted max-w-xs truncate text-xs">
                            {alert.message || '--'}
                          </td>
                          <td className="text-th-faint text-xs whitespace-nowrap font-mono">
                            {alert.timestamp
                              ? new Date(alert.timestamp).toLocaleTimeString()
                              : '--'}
                          </td>
                          <td className="text-right whitespace-nowrap">
                            {actioned ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                <CheckCircle2 size={12} /> {actioned}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCreateWO(alert, rowKey)}
                                disabled={busy || !alert.assetId}
                                title={alert.assetId ? 'Open a work order from this signal' : 'No linked asset'}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-siemens-accent border border-siemens-teal/30 hover:bg-siemens-teal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {busy ? <Loader2 size={11} className="animate-spin" /> : <PlusCircle size={11} />}
                                Create WO
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-th-faint">
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
                <div className="text-sm font-semibold text-th-secondary">
                  Loaner-to-Sale Conversion
                </div>
                <div className="text-xs text-th-muted mt-0.5">
                  {metrics.activeLoaners} active loaner{metrics.activeLoaners !== 1 ? 's' : ''} in field
                  {metrics.loanersExpiringSoon > 0 && (
                    <span className="text-amber-400 ml-2">
                      · {metrics.loanersExpiringSoon} expiring within 90 days
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-th-muted group-hover:text-siemens-accent transition-colors">
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
          className="section-card group hover:border-orange-500/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                <Shield size={20} className="text-orange-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-th-secondary">Trade Compliance</div>
                <div className="text-xs text-th-muted mt-0.5">
                  Embargo screening, restricted parties, ECCN classifications
                </div>
              </div>
            </div>
            <ArrowUpRight size={14} className="text-th-muted group-hover:text-siemens-accent transition-colors" />
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
                <div className="text-sm font-semibold text-th-secondary">Manufacturer Portal</div>
                <div className="text-xs text-th-muted mt-0.5">
                  Vendor performance, cost breakdown, work order tracking
                </div>
              </div>
            </div>
            <ArrowUpRight size={14} className="text-th-muted group-hover:text-siemens-accent transition-colors" />
          </div>
        </Link>
      </div>

      {/* Exceptions & Escalations — live problem records with per-row actions */}
      <div className="section-card border-amber-500/20">
        <div className="section-card-header">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <h2 className="text-[11px] font-semibold text-amber-400 uppercase tracking-[0.1em]">
              Exceptions & Escalations
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {openAgentWithPrompt && (
              <button
                onClick={() =>
                  openAgentWithPrompt(
                    'hav',
                    'Summarize the open operational exceptions and recommend next steps.'
                  )
                }
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-siemens-accent border border-siemens-teal/30 hover:bg-siemens-teal/10 transition-colors"
                title="Ask the HAV agent to triage these exceptions"
              >
                <MessageSquare size={12} />
                Ask Agent
              </button>
            )}
            <span className="badge badge-yellow">
              {exceptions.length} Requires Attention
            </span>
          </div>
        </div>
        <div className="section-card-body p-0">
          {exceptionsLoading ? (
            <div className="flex items-center justify-center h-32 text-sm text-th-faint">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading exceptions…
            </div>
          ) : exceptions.length > 0 ? (
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
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((ex, i) => {
                    const rowKey = `ex-${ex.refId || i}`;
                    const actioned = actionedRows[rowKey];
                    const isWO = ex.type === 'Work Order';
                    const rowTint = ex.severity === 'Critical' ? 'bg-orange-500/[0.03]' : 'bg-amber-500/[0.03]';
                    const ageColor = ex.ageDays != null && ex.ageDays > 7 ? 'text-orange-400' : 'text-amber-400';
                    const statusBadge = ex.severity === 'Critical' ? 'badge-red' : 'badge-orange';
                    return (
                      <tr key={rowKey} className={rowTint}>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            {isWO ? (
                              <Wrench size={12} className="text-amber-400" />
                            ) : (
                              <Shield size={12} className="text-orange-400" />
                            )}
                            <span className="text-th-secondary">{ex.type}</span>
                          </span>
                        </td>
                        <td className="font-medium text-th-secondary font-mono">{ex.reference}</td>
                        <td className="text-th-muted text-xs max-w-xs">{ex.issue}</td>
                        <td className="text-th-secondary text-xs">{ex.assignedTo}</td>
                        <td>
                          <span className={`${ageColor} font-mono text-xs font-semibold`}>
                            {ex.ageDays != null ? `${ex.ageDays}d` : '--'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusBadge}`}>{ex.status}</span>
                        </td>
                        <td className="text-right whitespace-nowrap">
                          {actioned ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <CheckCircle2 size={12} /> {actioned}
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <Link
                                to={ex.link}
                                className="p-1 rounded-md text-th-muted hover:text-siemens-accent hover:bg-siemens-teal/10 transition-colors"
                                title="Open record"
                              >
                                <ArrowUpRight size={13} />
                              </Link>
                              <button
                                onClick={() => handleShareException(ex, rowKey)}
                                disabled={busyAction === rowKey + ':slack'}
                                className="p-1 rounded-md text-th-muted hover:text-siemens-accent hover:bg-siemens-teal/10 transition-colors disabled:opacity-40"
                                title={`Share to #${OPS_SLACK_CHANNEL}`}
                              >
                                {busyAction === rowKey + ':slack' ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Share2 size={13} />
                                )}
                              </button>
                              {isWO && (
                                <button
                                  onClick={() => handleEscalate(ex, rowKey)}
                                  disabled={busyAction === rowKey + ':escalate'}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 transition-colors disabled:opacity-40"
                                  title="Escalate to Critical"
                                >
                                  {busyAction === rowKey + ':escalate' ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <ArrowUpCircle size={11} />
                                  )}
                                  Escalate
                                </button>
                              )}
                              <button
                                onClick={() => handleCreateTask(ex, rowKey)}
                                disabled={busyAction === rowKey + ':task' || !ex.assetId}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-siemens-accent border border-siemens-teal/30 hover:bg-siemens-teal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={ex.assetId ? 'Create a follow-up task' : 'No linked asset'}
                              >
                                {busyAction === rowKey + ':task' ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <PlusCircle size={11} />
                                )}
                                Task
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <CheckCircle2 size={20} className="text-emerald-400 mb-2" />
              <span className="text-sm text-th-faint">No open exceptions — all clear.</span>
            </div>
          )}
        </div>
      </div>

      {/* Contract Renewals — styled like the accounts/opportunities list */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
            Upcoming Contract Renewals
            <span className="ml-2 text-th-faint normal-case tracking-normal">· next {horizon === 'QTD' ? 'quarter' : horizon}</span>
          </h2>
          <div className="flex items-center gap-3">
            {openAgentWithPrompt && (
              <button
                onClick={() =>
                  openAgentWithPrompt(
                    'hav',
                    `Draft renewal outreach for the contracts expiring in the next ${horizon === 'QTD' ? 'quarter' : horizon}.`
                  )
                }
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-siemens-accent border border-siemens-teal/30 hover:bg-siemens-teal/10 transition-colors"
                title="Ask the HAV agent to draft renewal outreach"
              >
                <MessageSquare size={12} />
                Ask Agent
              </button>
            )}
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-siemens-accent" />
              <span className="text-[10px] text-siemens-accent font-medium uppercase tracking-wider">
                AI Monitored
              </span>
            </div>
          </div>
        </div>
        <div className="section-card-body p-0">
          {(() => {
            const scopedRenewals = renewals
              .map((r, i) => ({
                r,
                i,
                daysLeft: r.contractEnd
                  ? Math.ceil((new Date(r.contractEnd) - new Date()) / (1000 * 60 * 60 * 24))
                  : null,
              }))
              .filter(({ daysLeft }) => daysLeft != null && daysLeft <= horizonDays);
            return scopedRenewals.length > 0 ? (
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
                  {scopedRenewals.map(({ r, i, daysLeft }) => {
                    const isExpanded = expandedRenewal === i;
                    return (
                      <React.Fragment key={i}>
                        <tr
                          className="cursor-pointer hover:bg-[var(--overlay-hover)] transition-colors"
                          onClick={() => setExpandedRenewal(isExpanded ? null : i)}
                        >
                          <td className="w-8 text-center">
                            {isExpanded ? (
                              <ChevronDown size={14} className="text-siemens-accent inline" />
                            ) : (
                              <ChevronRight size={14} className="text-th-muted inline" />
                            )}
                          </td>
                          <td className="font-medium text-th-secondary">{r.customer || '--'}</td>
                          <td className="text-th-muted">{r.assetName || '--'}</td>
                          <td className="text-th-muted">
                            {r.contractEnd
                              ? new Date(r.contractEnd).toLocaleDateString()
                              : '--'}
                          </td>
                          <td>
                            <span className="badge badge-teal">{r.leaseType || '--'}</span>
                          </td>
                          <td className="text-th-primary font-semibold">
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
                            <td colSpan={7} className="bg-surface-bg border-b border-surface-border p-0">
                              <div className="px-6 py-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="flex items-start gap-2">
                                    <Cpu size={14} className="text-siemens-accent mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Product</div>
                                      <div className="text-sm text-th-secondary mt-0.5">{r.product || '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Hash size={14} className="text-th-muted mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Serial Number</div>
                                      <div className="text-sm text-th-secondary mt-0.5 font-mono">{r.serialNumber || '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <MapPin size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Location</div>
                                      <div className="text-sm text-th-secondary mt-0.5">{r.location || '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Server size={14} className="text-th-muted mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Rack Position</div>
                                      <div className="text-sm text-th-secondary mt-0.5">{r.rackPosition || '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Activity size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Status</div>
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
                                      <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Utilization</div>
                                      <div className="text-sm text-th-secondary mt-0.5">{r.utilization != null ? `${r.utilization}%` : '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Plug size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Power Draw</div>
                                      <div className="text-sm text-th-secondary mt-0.5">{r.powerDraw != null ? `${r.powerDraw} kW` : '--'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Calendar size={14} className="text-th-muted mt-0.5 shrink-0" />
                                    <div>
                                      <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Install Date</div>
                                      <div className="text-sm text-th-secondary mt-0.5">{r.installDate ? new Date(r.installDate).toLocaleDateString() : '--'}</div>
                                    </div>
                                  </div>
                                </div>
                                {/* Annual value callout */}
                                {r.monthlyValue > 0 && (
                                  <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                      <DollarSign size={14} className="text-emerald-400" />
                                      <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Annual Contract Value</span>
                                      <span className="text-sm text-emerald-400 font-bold ml-1">${(r.monthlyValue * 12).toLocaleString()}</span>
                                    </div>
                                    {r.id && (
                                      <Link
                                        to={`/assets/${r.id}`}
                                        className="ml-auto flex items-center gap-1.5 text-xs text-siemens-accent hover:text-th-primary transition-colors"
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
                                      className="flex items-center gap-1.5 text-xs text-siemens-accent hover:text-th-primary transition-colors"
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
            <div className="flex items-center justify-center h-32 text-sm text-th-faint">
              No renewals in the next {horizon === 'QTD' ? 'quarter' : horizon}
            </div>
          );
          })()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-2xl text-sm text-white ${
            toast.type === 'success' ? 'bg-emerald-900/90 border border-emerald-500/40' : 'bg-red-900/90 border border-red-500/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-300" />
          ) : (
            <AlertTriangle size={16} className="text-red-300" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
