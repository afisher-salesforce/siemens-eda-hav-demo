import React, { useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Server,
  MapPin,
  Zap,
  Activity,
  Thermometer,
  AlertTriangle,
  Clock,
  ChevronRight,
  GitBranch,
  ArrowRightLeft,
  Wrench,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  X,
  CalendarClock,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getAssets, getTelemetry, getAssetLineage, createAssetRecord, getLoaners, getWorkOrders, getCases } from '../api/salesforce';
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
    Active: 'badge-green',
    Running: 'badge-green',
    Deployed: 'badge-green',
    Idle: 'badge-yellow',
    Maintenance: 'badge-orange',
    Offline: 'badge-red',
    Error: 'badge-red',
    Decommissioned: 'badge-gray',
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

export default function AssetDetail() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { data: allAssets, loading: assetsLoading } = useSalesforceData(getAssets);
  const { data: telemetryData, loading: telemetryLoading } = useSalesforceData(
    () => getTelemetry(null, 500)
  );

  // Fetch lineage once we know the Salesforce record ID
  const asset = useMemo(() => {
    if (!allAssets) return null;
    return allAssets.find(
      (a) => a.id === assetId || a.serialNumber === assetId
    );
  }, [allAssets, assetId]);

  const lineageFetcher = useCallback(
    () => (asset?.id ? getAssetLineage(asset.id) : Promise.resolve(null)),
    [asset?.id]
  );
  const { data: lineageData, loading: lineageLoading } = useSalesforceData(lineageFetcher);

  // Fetch loaner data to check if this asset is a loaner
  const { data: loanerData } = useSalesforceData(getLoaners);
  const loanerInfo = useMemo(() => {
    if (!loanerData?.loaners || !asset) return null;
    return loanerData.loaners.find((l) => l.id === asset.id) || null;
  }, [loanerData, asset]);

  // Fetch work orders (all) and filter client-side for this asset
  const { data: allWorkOrders, loading: woLoading } = useSalesforceData(getWorkOrders);
  const relatedWorkOrders = useMemo(() => {
    if (!allWorkOrders || !asset) return [];
    return allWorkOrders.filter(
      (wo) => wo.assetName === asset.name
    );
  }, [allWorkOrders, asset]);

  // Fetch cases for this specific asset
  const caseFetcher = useCallback(
    () => (asset?.id ? getCases({ assetId: asset.id }) : Promise.resolve([])),
    [asset?.id]
  );
  const { data: relatedCases, loading: casesLoading } = useSalesforceData(caseFetcher);

  // Find child assets (same location, same customer — simulated hierarchy)
  const childAssets = useMemo(() => {
    if (!allAssets || !asset) return [];
    return allAssets.filter(
      (a) =>
        a.id !== asset.id &&
        a.location === asset.location &&
        a.customer === asset.customer
    ).slice(0, 8);
  }, [allAssets, asset]);

  // Get telemetry for this asset
  const assetTelemetry = useMemo(() => {
    if (!telemetryData || !asset) return [];
    return telemetryData
      .filter((t) => t.assetName === asset.name || t.assetId === asset.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-24);
  }, [telemetryData, asset]);

  // Latest telemetry reading for pre-filling action forms
  const latestTelemetry = useMemo(() => {
    if (!assetTelemetry || assetTelemetry.length === 0) return null;
    return assetTelemetry[assetTelemetry.length - 1];
  }, [assetTelemetry]);

  // Action modal state
  const [actionModal, setActionModal] = useState(null); // 'Case' | 'WorkOrder' | null
  const [actionForm, setActionForm] = useState({ subject: '', description: '', priority: 'Medium' });
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  const openActionModal = (type) => {
    // Pre-fill based on telemetry context
    let subject = '';
    let description = '';
    let priority = 'Medium';

    if (latestTelemetry) {
      const hasErrors = (latestTelemetry.errors || 0) > 0;
      const highTemp = (latestTelemetry.temperature || 0) > 80;
      const highCpu = (latestTelemetry.cpuPercent || 0) > 90;

      if (hasErrors) {
        subject = `${type === 'Case' ? 'Case' : 'WO'}: ${asset.name} — ${latestTelemetry.errors} error(s) detected`;
        priority = 'High';
      } else if (highTemp) {
        subject = `${type === 'Case' ? 'Case' : 'WO'}: ${asset.name} — High temperature (${latestTelemetry.temperature.toFixed(1)}°C)`;
        priority = 'High';
      } else if (highCpu) {
        subject = `${type === 'Case' ? 'Case' : 'WO'}: ${asset.name} — CPU at ${latestTelemetry.cpuPercent}%`;
        priority = 'Medium';
      } else {
        subject = `${type === 'Case' ? 'Case' : 'WO'}: ${asset.name} — Maintenance request`;
      }

      const lines = [`Asset: ${asset.name} (${asset.product || 'N/A'})`];
      lines.push(`Location: ${asset.location || 'N/A'}`);
      lines.push(`Status: ${latestTelemetry.status || asset.status || 'N/A'}`);
      lines.push(`CPU: ${latestTelemetry.cpuPercent ?? '--'}%, Memory: ${latestTelemetry.memoryPercent ?? '--'}%`);
      lines.push(`Temperature: ${latestTelemetry.temperature != null ? latestTelemetry.temperature.toFixed(1) + '°C' : '--'}`);
      lines.push(`Errors: ${latestTelemetry.errors ?? 0}, Active Jobs: ${latestTelemetry.jobs ?? '--'}`);
      description = lines.join('\n');
    } else {
      subject = `${type === 'Case' ? 'Case' : 'WO'}: ${asset.name}`;
      description = `Asset: ${asset.name}\nProduct: ${asset.product || 'N/A'}\nLocation: ${asset.location || 'N/A'}`;
    }

    setActionForm({ subject, description, priority });
    setActionError(null);
    setActionSuccess(null);
    setActionModal(type);
  };

  const handleActionSubmit = async () => {
    if (actionSubmitting || !actionModal || !asset) return;
    setActionSubmitting(true);
    setActionError(null);
    try {
      const result = await createAssetRecord({
        recordType: actionModal,
        assetId: asset.id,
        subject: actionForm.subject,
        description: actionForm.description,
        priority: actionForm.priority,
      });
      setActionSuccess(result);
      setTimeout(() => {
        setActionModal(null);
        setActionSuccess(null);
      }, 3000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const loading = assetsLoading || telemetryLoading;

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

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Asset Not Found</h3>
        <p className="text-sm text-gray-500 max-w-md mb-4">
          The asset with ID &ldquo;{assetId}&rdquo; could not be found.
        </p>
        <button
          onClick={() => navigate('/assets')}
          className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors"
        >
          Back to Fleet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/assets')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-siemens-accent transition-colors"
        >
          <ArrowLeft size={16} />
          Asset Fleet
        </button>
        <ChevronRight size={14} className="text-gray-600" />
        <span className="text-gray-200 font-medium">{asset.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-3">
            <Server size={22} className="text-siemens-accent" />
            {asset.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {asset.product} &middot; S/N: {asset.serialNumber || 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openActionModal('Case')}
            className="px-3 py-1.5 text-xs font-medium rounded-md border transition-colors
              bg-amber-500/10 text-amber-400 border-amber-500/30
              hover:bg-amber-500/20 hover:border-amber-500/50
              flex items-center gap-1.5"
          >
            <ShieldAlert size={13} />
            Create Case
          </button>
          <button
            onClick={() => openActionModal('WorkOrder')}
            className="px-3 py-1.5 text-xs font-medium rounded-md border transition-colors
              bg-siemens-teal/10 text-siemens-accent border-siemens-teal/30
              hover:bg-siemens-teal/20 hover:border-siemens-teal/50
              flex items-center gap-1.5"
          >
            <Wrench size={13} />
            Create Work Order
          </button>
          <StatusBadge status={asset.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Properties Panel */}
        <div className="metric-card space-y-0">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
            Asset Properties
          </h3>
          <DetailRow label="Serial Number" value={asset.serialNumber} icon={Server} />
          <DetailRow label="Product" value={asset.product} />
          <DetailRow label="Customer" value={asset.customer} />
          <DetailRow label="Location" value={asset.location} icon={MapPin} />
          <DetailRow label="Rack Position" value={asset.rackPosition} />
          <DetailRow
            label="Power Draw"
            value={asset.powerDraw != null ? `${asset.powerDraw} kW` : null}
            icon={Zap}
          />
          <DetailRow
            label="Utilization"
            value={asset.utilization != null ? `${asset.utilization}%` : null}
            icon={Activity}
          />
          <DetailRow label="Lease Type" value={asset.leaseType} />
          <DetailRow
            label="Contract End"
            value={
              asset.contractEnd
                ? new Date(asset.contractEnd).toLocaleDateString()
                : null
            }
            icon={Clock}
          />
        </div>

        {/* Loaner Info Card — only renders for loaner assets */}
        {loanerInfo && (
          <div className="metric-card lg:col-span-3 bg-gradient-to-r from-amber-500/5 to-transparent border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock size={14} className="text-amber-400" />
              <h3 className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">
                Loaner Information
              </h3>
              {loanerInfo.loanerStatus && (
                <span className={`badge ${
                  loanerInfo.loanerStatus === 'Active' ? 'badge-yellow' :
                  loanerInfo.loanerStatus === 'Pending Return' ? 'badge-orange' :
                  loanerInfo.loanerStatus === 'Conversion Pending' ? 'badge-blue' : 'badge-gray'
                }`}>
                  {loanerInfo.loanerStatus}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Loan Start</span>
                <span className="text-sm font-medium text-gray-200">
                  {loanerInfo.originalLoanerDate
                    ? new Date(loanerInfo.originalLoanerDate).toLocaleDateString()
                    : '--'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Expiry Date</span>
                <span className={`text-sm font-medium ${
                  loanerInfo.daysUntilExpiry != null && loanerInfo.daysUntilExpiry <= 30
                    ? 'text-red-400' : 'text-gray-200'
                }`}>
                  {loanerInfo.loanerExpiryDate
                    ? new Date(loanerInfo.loanerExpiryDate).toLocaleDateString()
                    : '--'}
                  {loanerInfo.daysUntilExpiry != null && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({loanerInfo.daysUntilExpiry}d)
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Months on Loan</span>
                <span className="text-sm font-medium text-gray-200">
                  {loanerInfo.monthsOnLoan != null ? `${loanerInfo.monthsOnLoan} mo` : '--'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Conversion Opp</span>
                {loanerInfo.conversionOpportunity ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-siemens-accent">
                      {loanerInfo.conversionOpportunity.stageName}
                    </span>
                    {loanerInfo.conversionOpportunity.amount != null && (
                      <span className="text-xs text-gray-500">
                        (${(loanerInfo.conversionOpportunity.amount / 1000).toFixed(0)}K)
                      </span>
                    )}
                    <ArrowUpRight size={12} className="text-siemens-accent" />
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">None</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Telemetry Chart */}
        <div className="section-card lg:col-span-2">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Telemetry History
            </h2>
            <span className="text-[10px] text-gray-500">
              {assetTelemetry.length} readings
            </span>
          </div>
          <div className="section-card-body">
            {assetTelemetry.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={assetTelemetry} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#1e293b' }}
                    tickFormatter={(v) =>
                      v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#1e293b' }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={darkTooltipStyle}
                    labelFormatter={(v) =>
                      v ? new Date(v).toLocaleString() : ''
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="cpuPercent"
                    stroke="#009999"
                    strokeWidth={2}
                    dot={false}
                    name="CPU %"
                  />
                  <Line
                    type="monotone"
                    dataKey="memoryPercent"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    name="Memory %"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-gray-600">
                No telemetry data available for this asset
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slack Channel */}
      <SlackFeed
        channelName={getSlackChannelName('asset', asset.name)}
        recordLabel={asset.name}
        recordType="asset"
      />

      {/* Serial Number Lineage Timeline */}
      {lineageData && (lineageData.hasPredecessors || lineageData.hasSuccessors) && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
              <GitBranch size={13} className="text-siemens-accent" />
              Serial Number Lineage
            </h2>
            <span className="text-[10px] text-gray-500">
              {lineageData.lineage.length} replacement{lineageData.lineage.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="section-card-body">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-surface-border" />

              {/* Predecessor entries */}
              {lineageData.lineage
                .filter((e) => e.type === 'predecessor')
                .map((entry, i) => (
                  <div key={`pred-${i}`} className="relative flex items-start gap-4 mb-6 last:mb-0">
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                      <ArrowRightLeft size={16} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                          Replaced
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {entry.date
                            ? new Date(entry.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-1">
                        This asset replaced{' '}
                        {entry.asset ? (
                          <Link
                            to={`/assets/${entry.asset.id}`}
                            className="font-medium text-siemens-accent hover:underline"
                          >
                            {entry.asset.name}
                          </Link>
                        ) : (
                          'an unknown asset'
                        )}
                        {entry.asset?.serialNumber && (
                          <span className="text-gray-500 font-mono text-xs ml-1.5">
                            (S/N: {entry.asset.serialNumber})
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {entry.reason && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {entry.reason}
                          </span>
                        )}
                        {entry.workOrderNumber && (
                          <span className="text-gray-500 flex items-center gap-1">
                            <Wrench size={11} />
                            WO #{entry.workOrderNumber}
                          </span>
                        )}
                        {entry.asset?.status && (
                          <span className="text-gray-600">
                            Previous status: {entry.asset.status}
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed italic">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

              {/* Current asset marker */}
              <div className="relative flex items-start gap-4 mb-6">
                <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-siemens-teal/20 border-2 border-siemens-accent flex items-center justify-center">
                  <Server size={16} className="text-siemens-accent" />
                </div>
                <div className="flex-1 pt-2">
                  <span className="text-sm font-semibold text-white">{asset.name}</span>
                  <span className="text-xs text-gray-500 ml-2">Current Asset</span>
                </div>
              </div>

              {/* Successor entries */}
              {lineageData.lineage
                .filter((e) => e.type === 'successor')
                .map((entry, i) => (
                  <div key={`succ-${i}`} className="relative flex items-start gap-4 mb-6 last:mb-0">
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <ArrowRightLeft size={16} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                          Replaced By
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {entry.date
                            ? new Date(entry.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-1">
                        This asset was replaced by{' '}
                        {entry.asset ? (
                          <Link
                            to={`/assets/${entry.asset.id}`}
                            className="font-medium text-siemens-accent hover:underline"
                          >
                            {entry.asset.name}
                          </Link>
                        ) : (
                          'an unknown asset'
                        )}
                        {entry.asset?.serialNumber && (
                          <span className="text-gray-500 font-mono text-xs ml-1.5">
                            (S/N: {entry.asset.serialNumber})
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {entry.reason && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {entry.reason}
                          </span>
                        )}
                        {entry.workOrderNumber && (
                          <span className="text-gray-500 flex items-center gap-1">
                            <Wrench size={11} />
                            WO #{entry.workOrderNumber}
                          </span>
                        )}
                        {entry.asset?.status && (
                          <span className="text-gray-600">
                            Current status: {entry.asset.status}
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed italic">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Related Assets (Hierarchy) */}
      {childAssets.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Related Assets at {asset.location}
            </h2>
            <span className="text-[10px] text-gray-500">{childAssets.length} assets</span>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Serial #</th>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {childAssets.map((a, i) => (
                    <tr key={a.id || i}>
                      <td>
                        <Link
                          to={`/assets/${a.id}`}
                          className="font-medium text-siemens-accent hover:underline"
                        >
                          {a.name || '--'}
                        </Link>
                      </td>
                      <td className="text-gray-500 font-mono text-xs">{a.serialNumber || '--'}</td>
                      <td className="text-gray-400">{a.product || '--'}</td>
                      <td>
                        <StatusBadge status={a.status} />
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

      {/* Latest Telemetry Table */}
      {assetTelemetry.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Recent Telemetry Readings
            </h2>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>CPU %</th>
                    <th>Memory %</th>
                    <th>Temperature</th>
                    <th>Status</th>
                    <th>Jobs</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {[...assetTelemetry].reverse().slice(0, 10).map((t, i) => (
                    <tr key={i}>
                      <td className="text-gray-500 text-xs font-mono whitespace-nowrap">
                        {t.timestamp ? new Date(t.timestamp).toLocaleString() : '--'}
                      </td>
                      <td className="text-gray-300 font-mono text-sm">
                        {t.cpuPercent != null ? `${t.cpuPercent}%` : '--'}
                      </td>
                      <td className="text-gray-300 font-mono text-sm">
                        {t.memoryPercent != null ? `${t.memoryPercent}%` : '--'}
                      </td>
                      <td>
                        <span
                          className={`font-mono text-sm ${
                            (t.temperature || 0) > 80
                              ? 'text-red-400 font-bold'
                              : (t.temperature || 0) > 70
                              ? 'text-amber-400'
                              : 'text-gray-300'
                          }`}
                        >
                          {t.temperature != null ? `${t.temperature.toFixed(1)}°C` : '--'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="text-gray-300 text-center font-mono">{t.jobs ?? '--'}</td>
                      <td>
                        <span
                          className={`font-mono text-sm ${
                            (t.errors || 0) > 0 ? 'text-red-400 font-bold' : 'text-gray-500'
                          }`}
                        >
                          {t.errors ?? '--'}
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

      {/* Related Work Orders */}
      {relatedWorkOrders.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
              <Wrench size={13} className="text-siemens-accent" />
              Related Work Orders
            </h2>
            <span className="text-[10px] text-gray-500">{relatedWorkOrders.length} work order{relatedWorkOrders.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>WO #</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>RMA #</th>
                    <th>Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedWorkOrders.map((wo, i) => (
                    <tr key={wo.id || i}>
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
                        <span className={`badge ${
                          wo.priority === 'Critical' ? 'badge-red' :
                          wo.priority === 'High' ? 'badge-orange' :
                          wo.priority === 'Medium' ? 'badge-blue' : 'badge-gray'
                        }`}>{wo.priority || '--'}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          wo.status === 'New' || wo.status === 'Open' ? 'badge-blue' :
                          wo.status === 'In Progress' ? 'badge-yellow' :
                          wo.status === 'On Hold' ? 'badge-orange' :
                          wo.status === 'Completed' ? 'badge-green' : 'badge-gray'
                        }`}>{wo.status || '--'}</span>
                      </td>
                      <td className="font-mono text-xs text-gray-500">{wo.rmaNumber || '--'}</td>
                      <td className="font-medium text-white">
                        {wo.estimatedCost != null ? `$${wo.estimatedCost.toLocaleString()}` : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Related Cases */}
      {relatedCases && relatedCases.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
              <FileText size={13} className="text-amber-400" />
              Related Cases
            </h2>
            <span className="text-[10px] text-gray-500">{relatedCases.length} case{relatedCases.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedCases.map((c, i) => (
                    <tr key={c.id || i}>
                      <td className="font-medium whitespace-nowrap text-siemens-accent">
                        {c.caseNumber || '--'}
                      </td>
                      <td className="text-gray-200 max-w-xs truncate">{c.subject || '--'}</td>
                      <td>
                        <span className={`badge ${
                          c.priority === 'Critical' ? 'badge-red' :
                          c.priority === 'High' ? 'badge-orange' :
                          c.priority === 'Medium' ? 'badge-blue' : 'badge-gray'
                        }`}>{c.priority || '--'}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          c.status === 'New' ? 'badge-blue' :
                          c.status === 'Open' || c.status === 'Working' ? 'badge-blue' :
                          c.status === 'Escalated' ? 'badge-red' :
                          c.status === 'Closed' ? 'badge-green' : 'badge-gray'
                        }`}>{c.status || '--'}</span>
                      </td>
                      <td className="text-gray-400">{c.type || '--'}</td>
                      <td className="text-gray-500 text-xs whitespace-nowrap">
                        {c.createdDate
                          ? new Date(c.createdDate).toLocaleDateString()
                          : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal — Create Case / Create Work Order */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-xl shadow-2xl w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                {actionModal === 'Case' ? (
                  <ShieldAlert size={16} className="text-amber-400" />
                ) : (
                  <Wrench size={16} className="text-siemens-accent" />
                )}
                Create {actionModal === 'Case' ? 'Case' : 'Work Order'} for {asset.name}
              </h3>
              <button
                onClick={() => setActionModal(null)}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            {actionSuccess ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white mb-1">
                  {actionSuccess.recordType === 'Case' ? 'Case' : 'Work Order'} Created
                </p>
                <p className="text-xs text-gray-400">
                  {actionSuccess.CaseNumber || actionSuccess.WorkOrderNumber} — {actionSuccess.Subject}
                </p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={actionForm.subject}
                    onChange={(e) => setActionForm({ ...actionForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-surface-bg border border-surface-border rounded-md
                      text-gray-200 placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
                    placeholder="Brief description"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={actionForm.description}
                    onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2 text-sm bg-surface-bg border border-surface-border rounded-md
                      text-gray-200 placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50
                      resize-none font-mono text-xs leading-relaxed"
                    placeholder="Detailed description..."
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
                    Priority
                  </label>
                  <select
                    value={actionForm.priority}
                    onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-surface-bg border border-surface-border rounded-md
                      text-gray-200 outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {/* Error */}
                {actionError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                    <AlertTriangle size={14} />
                    {actionError}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            {!actionSuccess && (
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-border">
                <button
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionSubmit}
                  disabled={actionSubmitting || !actionForm.subject.trim()}
                  className="px-4 py-2 text-xs font-medium rounded-md transition-colors
                    bg-siemens-teal text-white hover:bg-siemens-dark
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center gap-1.5"
                >
                  {actionSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>Create {actionModal === 'Case' ? 'Case' : 'Work Order'}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
