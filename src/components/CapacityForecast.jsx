import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Sliders,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from 'recharts';
import { getCapacity, getAssets } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

const darkTooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #1e293b',
  backgroundColor: '#111827',
  fontSize: '12px',
  color: '#94a3b8',
};

// ── Waterfall chart rendering ───────────────────────────────────

// Custom bar shape for waterfall — renders rounded-rect bar from
// the "base" value upward by "value" height.
function WaterfallBar(props) {
  const { x, y, width, height, fill, payload } = props;
  if (!payload || height === 0) return null;

  const radius = 3;
  // Determine if bar goes up or down relative to base
  const barHeight = Math.abs(height);
  const barY = height >= 0 ? y : y + height;

  return (
    <rect
      x={x}
      y={barY}
      width={width}
      height={barHeight}
      rx={radius}
      ry={radius}
      fill={fill}
    />
  );
}

// Custom tooltip for the waterfall chart
function WaterfallTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div style={darkTooltipStyle} className="px-3 py-2">
      <div className="text-xs font-semibold text-gray-200 mb-1">{d.label}</div>
      <div className="text-xs text-gray-400">
        {d.type === 'total'
          ? `${d.value} racks`
          : `${d.delta >= 0 ? '+' : ''}${d.delta} racks`}
      </div>
      {d.type === 'total' && d.capacity != null && (
        <div className="text-[10px] text-gray-500 mt-0.5">
          Capacity: {d.capacity} racks
        </div>
      )}
    </div>
  );
}

// Build waterfall segments for a single location
function buildWaterfallData(location, forecast, expiringCount, pipelineConfidence) {
  const currentBase = location.usedRacks || 0;

  // Get pipeline from forecast projected demand minus current
  const latestForecast = forecast
    .filter((f) => f.location === location.name)
    .sort((a, b) => (b.quarter || '').localeCompare(a.quarter || ''))[0];

  const projectedDemand = latestForecast?.projectedDemand || currentBase;
  const rawPipeline = Math.max(0, projectedDemand - currentBase);
  const weightedPipeline = Math.round(rawPipeline * (pipelineConfidence / 100));

  const expiring = expiringCount;
  const projected = currentBase + weightedPipeline - expiring;
  const totalCapacity = location.totalRacks || 0;

  return {
    segments: [
      {
        label: 'Current Base',
        value: currentBase,
        base: 0,
        delta: currentBase,
        type: 'base',
        fill: '#009999',
      },
      {
        label: `+Pipeline (${pipelineConfidence}%)`,
        value: weightedPipeline,
        base: currentBase,
        delta: weightedPipeline,
        type: 'add',
        fill: '#22c55e',
      },
      {
        label: '−Expiring',
        value: expiring,
        base: currentBase + weightedPipeline - expiring,
        delta: -expiring,
        type: 'subtract',
        fill: '#ef4444',
      },
      {
        label: 'Projected',
        value: projected,
        base: 0,
        delta: projected,
        type: 'total',
        fill: projected > totalCapacity ? '#f59e0b' : '#6366f1',
        capacity: totalCapacity,
      },
    ],
    summary: {
      currentBase,
      weightedPipeline,
      expiring,
      projected,
      totalCapacity,
      headroom: totalCapacity - projected,
    },
  };
}

// ── Mini Waterfall for per-facility cards ─────────────────────

function MiniWaterfall({ segments, totalCapacity, height = 140 }) {
  // Build stacked data for Recharts
  const data = segments.map((s) => ({
    ...s,
    // For the invisible base bar
    invisibleBase: s.base,
    // For the visible bar
    visibleValue: s.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: '#64748b' }}
          axisLine={{ stroke: '#1e293b' }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#64748b' }}
          axisLine={{ stroke: '#1e293b' }}
          tickLine={false}
          domain={[0, (dataMax) => Math.max(dataMax, totalCapacity) * 1.1]}
        />
        <Tooltip content={<WaterfallTooltip />} />
        {totalCapacity > 0 && (
          <ReferenceLine
            y={totalCapacity}
            stroke="#475569"
            strokeDasharray="4 4"
            label={{
              value: `Capacity: ${totalCapacity}`,
              position: 'right',
              style: { fontSize: 9, fill: '#64748b' },
            }}
          />
        )}
        {/* Invisible base bar */}
        <Bar dataKey="invisibleBase" stackId="waterfall" fill="transparent" />
        {/* Visible value bar */}
        <Bar dataKey="visibleValue" stackId="waterfall" maxBarSize={32} shape={<WaterfallBar />}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function CapacityForecast() {
  const { data: capacityData, loading: capLoading, error: capError, refetch } =
    useSalesforceData(getCapacity);
  const { data: assets, loading: assetsLoading } = useSalesforceData(getAssets);

  const [pipelineConfidence, setPipelineConfidence] = useState(75);

  const loading = capLoading || assetsLoading;
  const error = capError;

  // Count expiring assets per location (contracts ending within 180 days)
  const expiringByLocation = useMemo(() => {
    if (!assets) return {};
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 180);

    const counts = {};
    assets.forEach((a) => {
      if (!a.contractEnd || !a.location) return;
      const end = new Date(a.contractEnd);
      if (end >= now && end <= cutoff) {
        counts[a.location] = (counts[a.location] || 0) + 1;
      }
    });
    return counts;
  }, [assets]);

  // Build waterfall data for each location and aggregate
  const { locationWaterfalls, aggregateWaterfall, aggregateSummary } = useMemo(() => {
    if (!capacityData) return { locationWaterfalls: [], aggregateWaterfall: null, aggregateSummary: null };

    const locations = capacityData.locations || [];
    const forecast = capacityData.forecast || [];

    const waterfalls = locations.map((loc) => {
      const expiring = expiringByLocation[loc.name] || 0;
      const { segments, summary } = buildWaterfallData(loc, forecast, expiring, pipelineConfidence);
      return { location: loc, segments, summary };
    });

    // Aggregate across all locations
    const aggBase = waterfalls.reduce((s, w) => s + w.summary.currentBase, 0);
    const aggPipeline = waterfalls.reduce((s, w) => s + w.summary.weightedPipeline, 0);
    const aggExpiring = waterfalls.reduce((s, w) => s + w.summary.expiring, 0);
    const aggProjected = aggBase + aggPipeline - aggExpiring;
    const aggCapacity = waterfalls.reduce((s, w) => s + w.summary.totalCapacity, 0);

    const aggSegments = [
      { label: 'Current Base', value: aggBase, base: 0, delta: aggBase, type: 'base', fill: '#009999' },
      { label: `+Pipeline (${pipelineConfidence}%)`, value: aggPipeline, base: aggBase, delta: aggPipeline, type: 'add', fill: '#22c55e' },
      { label: '−Expiring', value: aggExpiring, base: aggBase + aggPipeline - aggExpiring, delta: -aggExpiring, type: 'subtract', fill: '#ef4444' },
      { label: 'Projected', value: aggProjected, base: 0, delta: aggProjected, type: 'total', fill: aggProjected > aggCapacity ? '#f59e0b' : '#6366f1', capacity: aggCapacity },
    ];

    return {
      locationWaterfalls: waterfalls,
      aggregateWaterfall: aggSegments,
      aggregateSummary: {
        currentBase: aggBase,
        weightedPipeline: aggPipeline,
        expiring: aggExpiring,
        projected: aggProjected,
        totalCapacity: aggCapacity,
        headroom: aggCapacity - aggProjected,
      },
    };
  }, [capacityData, expiringByLocation, pipelineConfidence]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Forecast Data</h3>
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
        <div className="skeleton w-48 h-6" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="metric-card">
              <div className="skeleton w-20 h-8 mb-2" />
              <div className="skeleton w-28 h-4" />
            </div>
          ))}
        </div>
        <div className="skeleton w-full h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-white">Capacity Forecast</h1>
            <p className="text-xs text-gray-500">
              Waterfall analysis — current base + weighted pipeline − expiring contracts
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Confidence Slider */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-siemens-accent" />
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              What-If: Pipeline Confidence
            </h2>
          </div>
          <span className="text-sm font-bold text-siemens-accent font-mono">{pipelineConfidence}%</span>
        </div>
        <div className="section-card-body">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold shrink-0">0%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={pipelineConfidence}
              onChange={(e) => setPipelineConfidence(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:bg-siemens-teal [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,153,153,0.5)]
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-siemens-teal
                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold shrink-0">100%</span>
          </div>
          <p className="text-[10px] text-gray-600 mt-2">
            Adjust to model different pipeline conversion scenarios. Lower values reflect conservative estimates; higher values assume most pipeline orders close.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {aggregateSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="metric-card relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-siemens-teal" />
            <div className="relative">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Current Base
              </span>
              <div className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                {aggregateSummary.currentBase}
                <span className="text-xs text-gray-500 font-normal">racks</span>
              </div>
            </div>
          </div>
          <div className="metric-card relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-emerald-500" />
            <div className="relative">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                +Pipeline ({pipelineConfidence}%)
              </span>
              <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
                +{aggregateSummary.weightedPipeline}
                <ArrowUpRight size={16} />
              </div>
            </div>
          </div>
          <div className="metric-card relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl bg-red-500" />
            <div className="relative">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                −Expiring
              </span>
              <div className="text-2xl font-bold text-red-400 mt-1 flex items-center gap-2">
                −{aggregateSummary.expiring}
                <ArrowDownRight size={16} />
              </div>
            </div>
          </div>
          <div className="metric-card relative overflow-hidden">
            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl ${
              aggregateSummary.headroom < 0 ? 'bg-amber-500' : 'bg-indigo-500'
            }`} />
            <div className="relative">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Projected / Capacity
              </span>
              <div className={`text-2xl font-bold mt-1 flex items-center gap-2 ${
                aggregateSummary.headroom < 0 ? 'text-amber-400' : 'text-indigo-400'
              }`}>
                {aggregateSummary.projected}
                <span className="text-xs text-gray-500 font-normal">/ {aggregateSummary.totalCapacity}</span>
              </div>
              <div className={`text-xs font-medium mt-0.5 ${
                aggregateSummary.headroom < 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {aggregateSummary.headroom >= 0 ? '+' : ''}{aggregateSummary.headroom} headroom
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Waterfall Chart */}
      {aggregateWaterfall && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Aggregate Rack Forecast — All Facilities
            </h2>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              {locationWaterfalls.length} locations
            </span>
          </div>
          <div className="section-card-body">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={aggregateWaterfall.map((s) => ({
                  ...s,
                  invisibleBase: s.base,
                  visibleValue: s.value,
                }))}
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={false}
                  domain={[0, (dataMax) => Math.max(dataMax, aggregateSummary.totalCapacity) * 1.1]}
                  label={{ value: 'Racks', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
                />
                <Tooltip content={<WaterfallTooltip />} />
                {aggregateSummary.totalCapacity > 0 && (
                  <ReferenceLine
                    y={aggregateSummary.totalCapacity}
                    stroke="#475569"
                    strokeDasharray="6 4"
                    label={{
                      value: `Total Capacity: ${aggregateSummary.totalCapacity}`,
                      position: 'top',
                      style: { fontSize: 11, fill: '#64748b' },
                    }}
                  />
                )}
                <Bar dataKey="invisibleBase" stackId="waterfall" fill="transparent" />
                <Bar dataKey="visibleValue" stackId="waterfall" maxBarSize={60} shape={<WaterfallBar />}>
                  {aggregateWaterfall.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#009999]" /> Current Base
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#22c55e]" /> + Pipeline
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#ef4444]" /> − Expiring
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#6366f1]" /> Projected
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-gray-500 inline-block" style={{ width: 12 }} /> Capacity
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-Facility Grid */}
      {locationWaterfalls.length > 0 && (
        <div>
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em] mb-4">
            Per-Facility Forecast
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {locationWaterfalls.map(({ location, segments, summary }) => {
              const atRisk = summary.headroom < 0;
              const nearCapacity = summary.headroom >= 0 && summary.headroom <= 5;
              return (
                <div key={location.id || location.name} className="section-card">
                  <div className="section-card-header">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-siemens-accent" />
                      <h3 className="text-xs font-semibold text-gray-200">
                        {(location.name || '--').replace('Siemens ', '')}
                      </h3>
                    </div>
                    {atRisk ? (
                      <span className="badge badge-red">Over Capacity</span>
                    ) : nearCapacity ? (
                      <span className="badge badge-yellow">Near Capacity</span>
                    ) : (
                      <span className="badge badge-green">Headroom +{summary.headroom}</span>
                    )}
                  </div>
                  <div className="section-card-body">
                    <MiniWaterfall
                      segments={segments}
                      totalCapacity={summary.totalCapacity}
                    />
                    {/* Quick stats */}
                    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-surface-border">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{summary.currentBase}</div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-wider">Base</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-400">+{summary.weightedPipeline}</div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-wider">Pipeline</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-400">−{summary.expiring}</div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-wider">Expiring</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${atRisk ? 'text-amber-400' : 'text-indigo-400'}`}>
                          {summary.projected}
                        </div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-wider">Projected</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
