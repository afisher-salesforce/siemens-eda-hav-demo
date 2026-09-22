import React from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCcw,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Timer,
  Server,
  Sparkles,
} from 'lucide-react';
import { getLoaners } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

function MetricCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div className="metric-card group relative overflow-hidden">
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
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-[0.08em] font-medium">
          {label}
        </div>
        {subtitle && (
          <div className="text-[10px] text-gray-600 mt-0.5">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Active Loan': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Conversion Pending': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Converted to Sale': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Returned: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    Expired: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  const cls = styles[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium whitespace-nowrap ${cls}`}>
      {status || '--'}
    </span>
  );
}

function ExpiryBadge({ days }) {
  if (days == null) return <span className="text-gray-600">--</span>;
  if (days <= 30) {
    return (
      <span className="badge badge-red">
        <AlertTriangle size={10} className="mr-1" />
        {days}d
      </span>
    );
  }
  if (days <= 90) {
    return (
      <span className="badge badge-yellow">
        <Timer size={10} className="mr-1" />
        {days}d
      </span>
    );
  }
  return (
    <span className="badge badge-green">
      <CheckCircle2 size={10} className="mr-1" />
      {days}d
    </span>
  );
}

function OppStageBadge({ stage }) {
  const styles = {
    'Needs Analysis': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    'Proposal/Price Quote': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Negotiation: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Closed Won': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Closed Lost': 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  const cls = styles[stage] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium whitespace-nowrap ${cls}`}>
      {stage || '--'}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="metric-card">
            <div className="skeleton w-9 h-9 rounded-lg mb-3" />
            <div className="skeleton w-16 h-7 mb-2" />
            <div className="skeleton w-24 h-3" />
          </div>
        ))}
      </div>
      <div className="section-card">
        <div className="section-card-header">
          <div className="skeleton w-48 h-5" />
        </div>
        <div className="section-card-body">
          <div className="skeleton w-full h-64" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle size={48} className="text-amber-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Loaner Data</h3>
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

export default function LoanerConversionView() {
  const { data, loading, error, refetch } = useSalesforceData(getLoaners);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return <ErrorState message="No loaner data received." onRetry={refetch} />;

  const { loaners, metrics } = data;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="region-badge">Loaner Program</span>
          <span className="hero-metric">
            {metrics.conversionPipeline != null
              ? `$${(metrics.conversionPipeline / 1000000).toFixed(1)}M`
              : '--'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-siemens-accent" />
          <span className="text-[10px] text-siemens-accent font-medium uppercase tracking-wider">
            Conversion Pipeline
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={Server}
          label="Total Loaners"
          value={metrics.totalLoaners ?? '--'}
          color="#009999"
        />
        <MetricCard
          icon={Clock}
          label="Active Loans"
          value={metrics.activeLoans ?? '--'}
          color="#3b82f6"
        />
        <MetricCard
          icon={RefreshCcw}
          label="Conversion Pending"
          value={metrics.conversionPending ?? '--'}
          color="#f59e0b"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Expiring Soon"
          value={metrics.expiringSoon ?? '--'}
          color="#ef4444"
          subtitle="Within 90 days"
        />
        <MetricCard
          icon={DollarSign}
          label="Pipeline Value"
          value={
            metrics.conversionPipeline != null
              ? `$${(metrics.conversionPipeline / 1000000).toFixed(1)}M`
              : '--'
          }
          color="#10b981"
        />
      </div>

      {/* Loaner Table */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
            Loaner Fleet & Conversion Status
          </h2>
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-siemens-accent" />
            <span className="text-[10px] text-siemens-accent font-medium uppercase tracking-wider">
              AI Tracked
            </span>
          </div>
        </div>
        <div className="section-card-body p-0">
          {loaners.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Loaner Status</th>
                    <th>Months On Loan</th>
                    <th>Expiry</th>
                    <th>Days Left</th>
                    <th>Utilization</th>
                    <th>Conversion Opp</th>
                    <th>Stage</th>
                    <th>Opp Value</th>
                  </tr>
                </thead>
                <tbody>
                  {loaners.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link
                          to={`/assets/${l.id}`}
                          className="font-medium text-gray-200 hover:text-siemens-accent transition-colors"
                        >
                          {l.name}
                        </Link>
                        <div className="text-[10px] text-gray-600 mt-0.5 font-mono">
                          {l.serialNumber}
                        </div>
                      </td>
                      <td className="text-gray-300">{l.customer || '--'}</td>
                      <td className="text-gray-400">{l.product || '--'}</td>
                      <td>
                        <StatusBadge status={l.loanerStatus} />
                      </td>
                      <td className="text-center">
                        {l.monthsOnLoan != null ? (
                          <span className="text-gray-300 font-mono text-xs">
                            {l.monthsOnLoan}mo
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="text-gray-400 text-xs whitespace-nowrap">
                        {l.loanerExpiryDate
                          ? new Date(l.loanerExpiryDate).toLocaleDateString()
                          : '--'}
                      </td>
                      <td>
                        <ExpiryBadge days={l.daysUntilExpiry} />
                      </td>
                      <td className="text-center">
                        {l.utilization != null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[60px]">
                              <div
                                className={`h-full rounded-full ${
                                  l.utilization > 80
                                    ? 'bg-emerald-400'
                                    : l.utilization > 50
                                    ? 'bg-amber-400'
                                    : 'bg-gray-500'
                                }`}
                                style={{ width: `${Math.min(l.utilization, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 font-mono">
                              {l.utilization}%
                            </span>
                          </div>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="text-gray-300 text-xs max-w-[140px] truncate">
                        {l.conversionOpportunity ? (
                          <div className="flex items-center gap-1">
                            <TrendingUp size={12} className="text-emerald-400 shrink-0" />
                            <span className="truncate">{l.conversionOpportunity.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-600 italic">No opp</span>
                        )}
                      </td>
                      <td>
                        {l.conversionOpportunity ? (
                          <OppStageBadge stage={l.conversionOpportunity.stageName} />
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="text-white font-semibold whitespace-nowrap">
                        {l.conversionOpportunity?.amount != null
                          ? `$${l.conversionOpportunity.amount.toLocaleString()}`
                          : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCcw size={32} className="text-gray-600 mb-3" />
              <p className="text-sm text-gray-500">No loaner assets found</p>
              <p className="text-xs text-gray-600 mt-1">
                Loaner assets will appear here when assets with Lease Type "Loan" have loaner tracking enabled
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
