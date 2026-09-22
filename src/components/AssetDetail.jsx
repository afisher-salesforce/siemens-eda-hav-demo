import React, { useMemo, useCallback } from 'react';
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
import { getAssets, getTelemetry, getAssetLineage } from '../api/salesforce';
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
        <StatusBadge status={asset.status} />
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
    </div>
  );
}
