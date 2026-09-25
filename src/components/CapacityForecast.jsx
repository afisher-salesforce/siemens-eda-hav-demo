import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Sliders,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Wrench,
  Package,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  Shield,
  Clock,
  Loader2,
  BookOpen,
} from 'lucide-react';
// No Recharts — we use pure SVG for waterfall charts
import { getCapacityEngine, updateWorkOrderStatus } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
// tooltipStyle no longer needed — waterfall uses pure SVG with custom tooltip

// ── Pure SVG Waterfall Chart ──
// This renders a TRUE waterfall chart with manually calculated pixel positions.
// No Recharts stacking — complete control over bar placement.

function PureSvgWaterfall({ segments, totalCapacity, width = 600, height = 300, showLabels = true, mini = false }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = React.useRef(null);

  // Layout margins
  const margin = mini
    ? { top: 8, right: 8, bottom: 28, left: 32 }
    : { top: 16, right: 24, bottom: 40, left: 52 };

  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Find Y scale: max of all barEnd values and totalCapacity
  const yMax = Math.max(
    ...segments.map((s) => s.barEnd),
    totalCapacity || 0
  ) * 1.12; // 12% padding

  // Y scale: value → pixel (0 is at bottom of plot)
  const yScale = (val) => margin.top + plotH - (val / yMax) * plotH;
  const yScaleHeight = (val) => (val / yMax) * plotH;

  // X scale: distribute bars evenly
  const n = segments.length;
  const barGroupWidth = plotW / n;
  const barWidth = mini ? Math.min(barGroupWidth * 0.55, 20) : Math.min(barGroupWidth * 0.55, 48);
  const barX = (i) => margin.left + i * barGroupWidth + (barGroupWidth - barWidth) / 2;

  // Y-axis ticks
  const tickCount = mini ? 4 : 6;
  const yTicks = [];
  for (let i = 0; i <= tickCount; i++) {
    const val = Math.round((yMax / tickCount) * i);
    yTicks.push(val);
  }

  const handleMouseMove = (e, seg) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      seg,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  const fontSize = mini ? 8 : 11;
  const labelFontSize = mini ? 7 : 10;

  return (
    <div className="relative" style={{ width: '100%', height }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        {/* Defs for stripe patterns */}
        <defs>
          <pattern id="wf-subtract-stripe" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#f97316" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
          </pattern>
          <pattern id="wf-rma-stripe" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#ef4444" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Grid lines */}
        {yTicks.map((val) => (
          <line
            key={val}
            x1={margin.left}
            y1={yScale(val)}
            x2={width - margin.right}
            y2={yScale(val)}
            stroke="var(--surface-border)"
            strokeDasharray="3 3"
            strokeWidth={0.5}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((val) => (
          <text
            key={`label-${val}`}
            x={margin.left - 6}
            y={yScale(val)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="var(--text-faint)"
            fontSize={fontSize}
          >
            {val}
          </text>
        ))}

        {/* Y-axis line */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + plotH}
          stroke="var(--surface-border)"
          strokeWidth={1}
        />

        {/* X-axis line (at y=0) */}
        <line
          x1={margin.left}
          y1={yScale(0)}
          x2={width - margin.right}
          y2={yScale(0)}
          stroke="var(--surface-border)"
          strokeWidth={1}
        />

        {/* Capacity reference line */}
        {totalCapacity > 0 && (
          <g>
            <line
              x1={margin.left}
              y1={yScale(totalCapacity)}
              x2={width - margin.right}
              y2={yScale(totalCapacity)}
              stroke="#475569"
              strokeDasharray="6 4"
              strokeWidth={1}
            />
            {!mini && (
              <text
                x={width - margin.right}
                y={yScale(totalCapacity) - 6}
                textAnchor="end"
                fill="var(--text-faint)"
                fontSize={10}
              >
                Capacity: {totalCapacity}
              </text>
            )}
          </g>
        )}

        {/* Connector lines between bars */}
        {segments.map((seg, i) => {
          if (i === segments.length - 1) return null; // no connector after last bar
          const nextSeg = segments[i + 1];
          // Connector goes from the "running after" of current bar to the start of next bar
          const connectorY = yScale(seg.runningAfter);
          const x1 = barX(i) + barWidth;
          const x2 = barX(i + 1);
          // Don't draw connector to/from total bars
          if (nextSeg.type === 'total' || nextSeg.type === 'base') return null;
          return (
            <line
              key={`conn-${i}`}
              x1={x1}
              y1={connectorY}
              x2={x2}
              y2={connectorY}
              stroke="var(--text-faint)"
              strokeDasharray="3 2"
              strokeWidth={0.8}
              opacity={0.5}
            />
          );
        })}

        {/* Bars */}
        {segments.map((seg, i) => {
          const x = barX(i);
          const topY = yScale(seg.barEnd);
          const bottomY = yScale(seg.barStart);
          const barH = Math.max(bottomY - topY, 1); // at least 1px

          const fillColor =
            seg.type === 'subtract' ? 'url(#wf-subtract-stripe)' :
            seg.type === 'rma-out' ? 'url(#wf-rma-stripe)' :
            seg.fill;

          return (
            <g key={i}>
              <rect
                x={x}
                y={topY}
                width={barWidth}
                height={barH}
                rx={mini ? 2 : 3}
                ry={mini ? 2 : 3}
                fill={fillColor}
                className="cursor-pointer"
                onMouseMove={(e) => handleMouseMove(e, seg)}
                onMouseLeave={handleMouseLeave}
              />
              {/* Value label on top of bar */}
              {showLabels && !mini && (
                <text
                  x={x + barWidth / 2}
                  y={topY - 5}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize={labelFontSize}
                  fontWeight={600}
                >
                  {seg.type === 'base' || seg.type === 'total'
                    ? seg.barEnd
                    : `${seg.delta >= 0 ? '+' : ''}${seg.delta}`}
                </text>
              )}
            </g>
          );
        })}

        {/* X-axis labels */}
        {segments.map((seg, i) => (
          <text
            key={`xlabel-${i}`}
            x={barX(i) + barWidth / 2}
            y={margin.top + plotH + (mini ? 14 : 20)}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize={mini ? 7 : 11}
          >
            {mini ? seg.shortLabel : seg.label}
          </text>
        ))}

        {/* Y-axis label (non-mini only) */}
        {!mini && (
          <text
            x={14}
            y={margin.top + plotH / 2}
            textAnchor="middle"
            fill="var(--text-faint)"
            fontSize={10}
            transform={`rotate(-90, 14, ${margin.top + plotH / 2})`}
          >
            Racks
          </text>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg shadow-lg border"
          style={{
            left: Math.min(tooltip.x + 12, width - 160),
            top: tooltip.y - 60,
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--surface-border)',
          }}
        >
          <div className="text-xs font-semibold text-th-secondary mb-1">{tooltip.seg.label}</div>
          <div className="text-xs text-th-muted">
            {tooltip.seg.type === 'base' || tooltip.seg.type === 'total'
              ? `${tooltip.seg.barEnd} racks`
              : `${tooltip.seg.delta >= 0 ? '+' : ''}${tooltip.seg.delta} racks`}
          </div>
          {tooltip.seg.type !== 'base' && tooltip.seg.type !== 'total' && (
            <div className="text-[10px] text-th-faint mt-0.5">
              Running total: {tooltip.seg.runningAfter} racks
            </div>
          )}
          {tooltip.seg.type === 'total' && tooltip.seg.capacity != null && (
            <div className="text-[10px] text-th-muted mt-0.5">Capacity: {tooltip.seg.capacity}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Time horizon helper ──
function computeHorizonDate(horizon) {
  const now = new Date();
  if (typeof horizon === 'number') {
    const d = new Date(now);
    d.setDate(d.getDate() + horizon);
    return d;
  }
  // Quarter shortcuts
  const year = now.getFullYear();
  if (horizon === 'Q3') return new Date(year, 8, 30); // Sep 30
  if (horizon === 'Q4') return new Date(year, 11, 31); // Dec 31
  return new Date(now.getTime() + 90 * 86400000);
}

function horizonLabel(h) {
  if (typeof h === 'number') return `${h}d`;
  return h;
}

// ── Slider component ──
function ScenarioSlider({ label, value, onChange, min, max, step, unit, icon: Icon, color = 'text-siemens-accent' }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-36 shrink-0">
        {Icon && <Icon size={12} className={color} />}
        <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 bg-[var(--slider-track)] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:bg-siemens-teal [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(0,153,153,0.4)]
          [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:bg-siemens-teal
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
      />
      <span className="text-xs font-bold text-siemens-accent font-mono w-16 text-right">
        {unit === 'days' ? `+${value}d` : `${value}%`}
      </span>
    </div>
  );
}

// ── Mini Waterfall wrapper for per-facility cards ──
function MiniWaterfall({ segments, totalCapacity, height = 130 }) {
  return (
    <PureSvgWaterfall
      segments={segments}
      totalCapacity={totalCapacity}
      width={320}
      height={height}
      showLabels={false}
      mini={true}
    />
  );
}

// ── Facility Detail Modal ──
function FacilityModal({ facility, workOrders, onClose, onCompleteRepair, completingId }) {
  const [tab, setTab] = useState('racks');

  if (!facility) return null;

  const facilityWOs = workOrders.filter((wo) => wo.facilityCode === facility.code);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-surface-card border border-surface-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <MapPin size={16} className="text-siemens-accent" />
            <div>
              <h2 className="text-sm font-bold text-th-primary">
                {facility.name} ({facility.code})
              </h2>
              <p className="text-[10px] text-th-muted">
                {facility.region} &middot; {facility.totalRacks} racks &middot; {facility.bladeCount} blades &middot; {facility.accounts.length} customers
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--skeleton-bg)] transition-colors">
            <X size={16} className="text-th-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-border">
          <button
            onClick={() => setTab('racks')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === 'racks' ? 'text-siemens-accent border-b-2 border-siemens-accent' : 'text-th-muted hover:text-th-secondary'
            }`}
          >
            <Package size={12} className="inline mr-1.5" />
            Racks & Assets ({facility.racks.length})
          </button>
          <button
            onClick={() => setTab('workorders')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === 'workorders' ? 'text-siemens-accent border-b-2 border-siemens-accent' : 'text-th-muted hover:text-th-secondary'
            }`}
          >
            <Wrench size={12} className="inline mr-1.5" />
            Work Orders & Repairs ({facilityWOs.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0">
          {tab === 'racks' ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rack</th>
                  <th>Position</th>
                  <th>Customer</th>
                  <th>Blades</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {facility.racks.length > 0 ? facility.racks.map((rack) => (
                  <tr key={rack.id}>
                    <td className="font-medium text-th-secondary">{rack.name}</td>
                    <td className="text-th-muted font-mono text-xs">{rack.rackPosition || '--'}</td>
                    <td className="text-th-secondary">{rack.accountName || '--'}</td>
                    <td className="text-th-secondary text-center font-mono">{rack.bladeCount}</td>
                    <td>
                      <span className={`badge ${rack.status === 'Active' || rack.status === 'Installed' ? 'badge-green' : 'badge-gray'}`}>
                        {rack.status || '--'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="text-center py-8 text-th-faint">No racks at this facility</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>WO #</th>
                  <th>Asset</th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {facilityWOs.length > 0 ? facilityWOs.map((wo) => (
                  <tr key={wo.id}>
                    <td className="font-mono text-xs text-siemens-accent">{wo.workOrderNumber}</td>
                    <td className="text-th-secondary text-sm">{wo.assetName || '--'}</td>
                    <td className="text-th-muted">{wo.accountName || '--'}</td>
                    <td className="text-th-muted text-xs max-w-[200px] truncate">{wo.subject || '--'}</td>
                    <td>
                      <span className={`badge ${wo.status === 'In Progress' ? 'badge-blue' : wo.status === 'New' ? 'badge-yellow' : 'badge-gray'}`}>
                        {wo.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${wo.priority === 'Critical' ? 'badge-red' : wo.priority === 'High' ? 'badge-orange' : 'badge-gray'}`}>
                        {wo.priority || '--'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => onCompleteRepair(wo.id)}
                        disabled={completingId === wo.id}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md
                          bg-emerald-900/40 text-emerald-400 border border-emerald-800/50
                          hover:bg-emerald-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {completingId === wo.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={10} />
                        )}
                        Complete & Return
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="text-center py-8 text-th-faint">No active work orders at this facility</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Projection Formula Rationale ──
function ProjectionFormula() {
  return (
    <div className="space-y-5">
      {/* Equation */}
      <div className="bg-surface-bg border border-surface-border rounded-lg px-6 py-5 overflow-x-auto">
        <p className="text-xs text-th-muted mb-3">The core projection equation for any given time bucket <span className="italic">t</span> should be calculated as:</p>
        <div className="text-center py-3">
          <span className="text-lg text-th-primary font-serif italic tracking-wide">
            C<sub className="text-[10px] not-italic">projected</sub>(t) = C<sub className="text-[10px] not-italic">base</sub>
            {' + '}&#931;(S<sub className="text-[10px] not-italic">pipeline</sub> &middot; P<sub className="text-[10px] not-italic">win</sub>)
            {' − '}&#931;(A<sub className="text-[10px] not-italic">expiring</sub> &middot; (1 − P<sub className="text-[10px] not-italic">renew</sub>))
            {' − '}&#931;RMA<sub className="text-[10px] not-italic">out</sub>(t)
            {' + '}&#931;RMA<sub className="text-[10px] not-italic">in</sub>(t)
          </span>
        </div>
      </div>

      {/* Variable definitions */}
      <div className="space-y-2.5 text-xs text-th-muted leading-relaxed pl-1">
        <p className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-3">Where:</p>
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">C<sub className="text-[9px] not-italic">base</sub></span>
          <span>= Current active deployed capacity.</span>
        </div>
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">S<sub className="text-[9px] not-italic">pipeline</sub> &middot; P<sub className="text-[9px] not-italic">win</sub></span>
          <span>= New sales weighted pipeline capacity additions.</span>
        </div>
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">A<sub className="text-[9px] not-italic">expiring</sub> &middot; (1 − P<sub className="text-[9px] not-italic">renew</sub>)</span>
          <span>= Non-renewed expiring asset capacity freed up.</span>
        </div>
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">RMA<sub className="text-[9px] not-italic">out</sub>(t)</span>
          <span>= Capacity temporarily lost due to hardware sent to manufacturer for repair.</span>
        </div>
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">RMA<sub className="text-[9px] not-italic">in</sub>(t)</span>
          <span>= Capacity restored as repaired hardware returns from the OEM.</span>
        </div>
      </div>

      {/* Mapping to sliders */}
      <div className="bg-surface-bg border border-surface-border rounded-lg p-4">
        <p className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-2.5">Slider Mapping</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-th-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span><strong className="text-th-secondary">Pipeline Confidence</strong> controls P<sub className="font-serif italic text-th-muted text-[9px]">win</sub></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            <span><strong className="text-th-secondary">Renewal Rate</strong> controls P<sub className="font-serif italic text-th-muted text-[9px]">renew</sub></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span><strong className="text-th-secondary">OEM Repair Lag</strong> scales RMA<sub className="font-serif italic text-th-muted text-[9px]">in</sub>(t) recovery</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span><strong className="text-th-secondary">Decom Buffer</strong> extends expiry detection window</span>
          </div>
        </div>
      </div>

      {/* Cross-reference to vignette */}
      <p className="text-xs text-th-muted italic">
        For the full business context behind this model, see the{' '}
        <Link to="/vignettes/capacity" className="text-siemens-accent hover:underline font-medium not-italic">
          Capacity Vignette
        </Link>.
      </p>
    </div>
  );
}

// ── Build 6-segment TRUE waterfall data ──
// Each segment stores barStart (bottom of visible bar) and barEnd (top of visible bar).
// For additions: bar floats upward from running total.
// For subtractions: bar hangs downward from running total.
// For totals (Base, Projected): bar rises from 0.
function buildWaterfallSegments(cBase, pipeline, expiring, rmaOut, rmaIn, totalCapacity) {
  let running = 0;
  const segments = [];

  // 1. Current Base (total — from 0)
  segments.push({
    label: 'Current Base', shortLabel: 'Base',
    barStart: 0, barEnd: cBase,
    delta: cBase, type: 'base', fill: '#009999',
    runningAfter: cBase,
  });
  running = cBase;

  // 2. +Pipeline (addition — floats upward from running)
  segments.push({
    label: '+Pipeline', shortLabel: '+Pipe',
    barStart: running, barEnd: running + pipeline,
    delta: pipeline, type: 'add', fill: '#22c55e',
    runningAfter: running + pipeline,
  });
  running += pipeline;

  // 3. −Expiring Contracts (subtraction — hangs downward from running)
  segments.push({
    label: '−Expiring', shortLabel: '−Exp',
    barStart: running - expiring, barEnd: running,
    delta: -expiring, type: 'subtract', fill: '#f97316',
    runningAfter: running - expiring,
  });
  running -= expiring;

  // 4. −OEM Repair Out (subtraction — hangs downward from running)
  segments.push({
    label: '−OEM Repair', shortLabel: '−RMA',
    barStart: running - rmaOut, barEnd: running,
    delta: -rmaOut, type: 'rma-out', fill: '#ef4444',
    runningAfter: running - rmaOut,
  });
  running -= rmaOut;

  // 5. +RMA Return (addition — floats upward from running)
  segments.push({
    label: '+RMA Return', shortLabel: '+Ret',
    barStart: running, barEnd: running + rmaIn,
    delta: rmaIn, type: 'add', fill: '#10b981',
    runningAfter: running + rmaIn,
  });
  running += rmaIn;

  // 6. Projected (total — from 0)
  const projected = running;
  segments.push({
    label: 'Projected', shortLabel: 'Proj',
    barStart: 0, barEnd: projected,
    delta: projected, type: 'total',
    fill: projected > totalCapacity ? '#f59e0b' : '#6366f1',
    capacity: totalCapacity,
    runningAfter: projected,
  });

  return { segments, projected };
}

// ── Main Component ──
export default function CapacityForecast() {
  const { data: engineData, loading, error, refetch } = useSalesforceData(getCapacityEngine);

  // Scenario variables
  const [timeHorizon, setTimeHorizon] = useState(90);
  const [accountFilter, setAccountFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [pipelineConfidence, setPipelineConfidence] = useState(75);
  const [renewalRate, setRenewalRate] = useState(80);
  const [oemRepairLag, setOemRepairLag] = useState(14);
  const [decomBuffer, setDecomBuffer] = useState(30);

  // UI state
  const [scenarioOpen, setScenarioOpen] = useState(true);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Bilateral write-back: complete a repair
  const handleCompleteRepair = useCallback(async (workOrderId) => {
    setCompletingId(workOrderId);
    try {
      await updateWorkOrderStatus(workOrderId, { status: 'Completed' });
      setToast({ type: 'success', message: 'Repair completed — capacity restored' });
      setTimeout(() => setToast(null), 4000);
      refetch();
    } catch (err) {
      setToast({ type: 'error', message: `Failed: ${err.message}` });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setCompletingId(null);
    }
  }, [refetch]);

  // Derive unique accounts and regions from data
  const { allAccounts, allRegions } = useMemo(() => {
    if (!engineData) return { allAccounts: [], allRegions: [] };
    const accs = new Set();
    const regs = new Set();
    (engineData.facilities || []).forEach((f) => {
      if (f.region) regs.add(f.region);
      f.accounts.forEach((a) => accs.add(a));
    });
    return { allAccounts: [...accs].sort(), allRegions: [...regs].sort() };
  }, [engineData]);

  // ── Scenario Engine ──
  const scenarioResults = useMemo(() => {
    if (!engineData) return null;

    const horizonDate = computeHorizonDate(timeHorizon);
    const now = new Date();

    // Filter facilities by region
    let facilities = engineData.facilities || [];
    if (regionFilter !== 'all') {
      facilities = facilities.filter((f) => f.region === regionFilter);
    }

    // Filter by account (only show facilities that have this account)
    if (accountFilter !== 'all') {
      facilities = facilities.filter((f) => f.accounts.includes(accountFilter));
    }

    const facilityResults = facilities.map((facility) => {
      // C_base: current active racks
      const cBase = facility.activeRacks;

      // S_pipeline · P_win: from forecast projected demand
      const facForecasts = (engineData.forecasts || []).filter((f) => {
        const locName = f.locationName || '';
        return locName.includes(facility.code) || locName === facility.name;
      });
      const latestForecast = facForecasts.sort((a, b) =>
        (b.periodStart || '').localeCompare(a.periodStart || '')
      )[0];
      const rawPipeline = latestForecast
        ? Math.max(0, (latestForecast.projectedDemand || 0) - cBase)
        : 0;
      const pipelineWeighted = Math.round(rawPipeline * (pipelineConfidence / 100));

      // A_expiring · (1 - P_renew): contracts expiring within horizon + decomBuffer
      const expiryWindow = new Date(horizonDate);
      expiryWindow.setDate(expiryWindow.getDate() + decomBuffer);

      // Find agreements for accounts at this facility
      const facilityAccountIds = new Set(facility.racks.map((r) => r.accountId).filter(Boolean));
      const expiringAgreements = (engineData.salesAgreements || []).filter((sa) => {
        if (!sa.endDate) return false;
        const end = new Date(sa.endDate);
        return end >= now && end <= expiryWindow && facilityAccountIds.has(sa.accountId);
      });

      // Estimate racks at risk from expiring contracts
      // Count racks belonging to expiring accounts
      const expiringAccountIds = new Set(expiringAgreements.map((sa) => sa.accountId));
      const racksAtRisk = facility.racks.filter((r) => expiringAccountIds.has(r.accountId)).length;
      const capacityFreed = Math.round(racksAtRisk * (1 - renewalRate / 100));

      // RMA_out: work orders removing capacity from this facility
      const facilityWOs = (engineData.activeWorkOrders || []).filter(
        (wo) => wo.facilityCode === facility.code
      );
      const rmaOutCount = facilityWOs.length;

      // RMA_in: spare pool allocation (proportional to facility size, shifted by lag)
      const totalSpares = (engineData.sparePool || []).length;
      const totalFacilities = (engineData.facilities || []).length;
      // Simple proportional allocation shifted by OEM repair lag vs horizon
      const lagFactor = Math.max(0, 1 - (oemRepairLag / (typeof timeHorizon === 'number' ? timeHorizon : 90)));
      const rmaInCount = Math.round((totalSpares / Math.max(1, totalFacilities)) * lagFactor);

      // C_projected
      const projected = cBase + pipelineWeighted - capacityFreed - rmaOutCount + rmaInCount;
      const totalCapacity = facility.totalRacks;
      const headroom = totalCapacity - projected;

      // Build waterfall segments
      const { segments } = buildWaterfallSegments(
        cBase, pipelineWeighted, capacityFreed, rmaOutCount, rmaInCount, totalCapacity
      );

      return {
        facility,
        cBase,
        pipelineWeighted,
        capacityFreed,
        expiringAgreements,
        rmaOut: { count: rmaOutCount, workOrders: facilityWOs },
        rmaIn: { count: rmaInCount },
        projected,
        totalCapacity,
        headroom,
        status: projected > totalCapacity ? 'over' : headroom <= 2 ? 'near' : 'available',
        segments,
      };
    });

    // Aggregate
    const aggBase = facilityResults.reduce((s, r) => s + r.cBase, 0);
    const aggPipeline = facilityResults.reduce((s, r) => s + r.pipelineWeighted, 0);
    const aggExpiring = facilityResults.reduce((s, r) => s + r.capacityFreed, 0);
    const aggRmaOut = facilityResults.reduce((s, r) => s + r.rmaOut.count, 0);
    const aggRmaIn = facilityResults.reduce((s, r) => s + r.rmaIn.count, 0);
    const aggCapacity = facilityResults.reduce((s, r) => s + r.totalCapacity, 0);
    const { segments: aggSegments, projected: aggProjected } = buildWaterfallSegments(
      aggBase, aggPipeline, aggExpiring, aggRmaOut, aggRmaIn, aggCapacity
    );

    return {
      facilities: facilityResults,
      aggregate: {
        cBase: aggBase,
        pipeline: aggPipeline,
        expiring: aggExpiring,
        rmaOut: aggRmaOut,
        rmaIn: aggRmaIn,
        projected: aggProjected,
        totalCapacity: aggCapacity,
        headroom: aggCapacity - aggProjected,
        segments: aggSegments,
      },
    };
  }, [engineData, timeHorizon, accountFilter, regionFilter, pipelineConfidence, renewalRate, oemRepairLag, decomBuffer]);

  // ── Render ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-th-secondary mb-2">Unable to Load Forecast Data</h3>
        <p className="text-sm text-th-muted max-w-md mb-4">{error}</p>
        <button onClick={refetch} className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton w-48 h-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="metric-card"><div className="skeleton w-16 h-8 mb-2" /><div className="skeleton w-24 h-3" /></div>
          ))}
        </div>
        <div className="skeleton w-full h-80" />
      </div>
    );
  }

  const agg = scenarioResults?.aggregate;
  const facilityResults = scenarioResults?.facilities || [];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top
          ${toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-800' : 'bg-red-900/90 text-red-300 border border-red-800'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-th-primary">Capacity Forecasting Engine</h1>
            <p className="text-xs text-th-muted">
              Multi-variable scenario planner
            </p>
          </div>
        </div>
        <button onClick={refetch} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-th-muted border border-surface-border rounded-md hover:bg-surface-card transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Projection Formula Rationale */}
      <div className="section-card">
        <div
          className="section-card-header cursor-pointer"
          onClick={() => setFormulaOpen(!formulaOpen)}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-siemens-accent" />
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
              Projection Formula
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-th-muted">
              C<sub className="font-serif italic text-th-muted text-[8px]">proj</sub> = C<sub className="font-serif italic text-th-muted text-[8px]">base</sub> + Pipeline − Expiring − RMA<sub className="font-serif italic text-th-muted text-[8px]">out</sub> + RMA<sub className="font-serif italic text-th-muted text-[8px]">in</sub>
            </span>
            {formulaOpen ? <ChevronUp size={14} className="text-th-muted" /> : <ChevronDown size={14} className="text-th-muted" />}
          </div>
        </div>
        {formulaOpen && (
          <div className="section-card-body">
            <ProjectionFormula />
          </div>
        )}
      </div>

      {/* Global Controls Bar */}
      <div className="section-card">
        <div className="section-card-body py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Time Horizon */}
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-th-muted" />
              <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Horizon</span>
              <div className="flex rounded-md border border-surface-border overflow-hidden">
                {[30, 60, 90, 'Q3', 'Q4'].map((h) => (
                  <button
                    key={h}
                    onClick={() => setTimeHorizon(h)}
                    className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      timeHorizon === h
                        ? 'bg-siemens-teal/20 text-siemens-accent border-r border-surface-border'
                        : 'text-th-muted hover:text-th-secondary border-r border-surface-border last:border-r-0'
                    }`}
                  >
                    {horizonLabel(h)}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-5 w-px bg-surface-border" />

            {/* Account Filter */}
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-th-muted" />
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="text-[10px] border border-surface-border rounded-md px-2 py-1 bg-surface-card text-th-secondary focus:outline-none focus:ring-1 focus:ring-siemens-teal/30"
              >
                <option value="all">All Accounts</option>
                {allAccounts.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Region Filter */}
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-th-muted" />
              <div className="flex rounded-md border border-surface-border overflow-hidden">
                {['all', ...allRegions].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRegionFilter(r)}
                    className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      regionFilter === r
                        ? 'bg-siemens-teal/20 text-siemens-accent'
                        : 'text-th-muted hover:text-th-secondary'
                    } border-r border-surface-border last:border-r-0`}
                  >
                    {r === 'all' ? 'All' : r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Modeling Drawer */}
      <div className="section-card">
        <div
          className="section-card-header cursor-pointer"
          onClick={() => setScenarioOpen(!scenarioOpen)}
        >
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-siemens-accent" />
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
              Scenario Modeling
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-th-muted">
              {pipelineConfidence}% pipe &middot; {renewalRate}% renew &middot; +{oemRepairLag}d lag &middot; +{decomBuffer}d buffer
            </span>
            {scenarioOpen ? <ChevronUp size={14} className="text-th-muted" /> : <ChevronDown size={14} className="text-th-muted" />}
          </div>
        </div>
        {scenarioOpen && (
          <div className="section-card-body space-y-3">
            <ScenarioSlider
              label="Pipeline Conf." value={pipelineConfidence} onChange={setPipelineConfidence}
              min={0} max={100} step={5} unit="%" icon={TrendingUp} />
            <ScenarioSlider
              label="Renewal Rate" value={renewalRate} onChange={setRenewalRate}
              min={0} max={100} step={5} unit="%" icon={Shield} />
            <ScenarioSlider
              label="OEM Repair Lag" value={oemRepairLag} onChange={setOemRepairLag}
              min={0} max={60} step={1} unit="days" icon={Clock} />
            <ScenarioSlider
              label="Decom Buffer" value={decomBuffer} onChange={setDecomBuffer}
              min={0} max={90} step={5} unit="days" icon={Calendar} />
            <p className="text-[10px] text-th-faint pt-1">
              Adjust levers to model different scenarios. Changes apply instantly across all charts.
            </p>
          </div>
        )}
      </div>

      {/* Aggregate Metrics Cards */}
      {agg && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="metric-card relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-2xl bg-siemens-teal" />
            <div className="relative">
              <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Base</span>
              <div className="text-xl font-bold text-th-primary mt-0.5">{agg.cBase}</div>
              <div className="text-[9px] text-th-faint">deployed racks</div>
            </div>
          </div>
          <div className="metric-card relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-2xl bg-emerald-500" />
            <div className="relative">
              <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">+Pipeline</span>
              <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                +{agg.pipeline} <ArrowUpRight size={14} />
              </div>
              <div className="text-[9px] text-th-faint">{pipelineConfidence}% confidence</div>
            </div>
          </div>
          <div className="metric-card relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-2xl bg-orange-500" />
            <div className="relative">
              <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">−Expiring</span>
              <div className="text-xl font-bold text-orange-400 mt-0.5 flex items-center gap-1">
                −{agg.expiring} <ArrowDownRight size={14} />
              </div>
              <div className="text-[9px] text-th-faint">{renewalRate}% renew</div>
            </div>
          </div>
          <div className="metric-card relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-2xl bg-red-500" />
            <div className="relative">
              <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">−OEM Repair</span>
              <div className="text-xl font-bold text-red-400 mt-0.5">−{agg.rmaOut}</div>
              <div className="text-[9px] text-th-faint">at manufacturer</div>
            </div>
          </div>
          <div className="metric-card relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-2xl bg-emerald-500" />
            <div className="relative">
              <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">+RMA Return</span>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">+{agg.rmaIn}</div>
              <div className="text-[9px] text-th-faint">spare pool</div>
            </div>
          </div>
          <div className="metric-card relative overflow-hidden">
            <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-2xl ${agg.headroom < 0 ? 'bg-amber-500' : 'bg-indigo-500'}`} />
            <div className="relative">
              <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Projected</span>
              <div className={`text-xl font-bold mt-0.5 ${agg.headroom < 0 ? 'text-amber-400' : 'text-indigo-400'}`}>
                {agg.projected}
              </div>
              <div className={`text-[9px] font-medium ${agg.headroom < 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {agg.headroom >= 0 ? '+' : ''}{agg.headroom} headroom
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Waterfall Chart */}
      {agg && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
              Aggregate Rack Forecast &mdash; {facilityResults.length} Facilities
            </h2>
            <span className="text-[10px] text-th-muted uppercase tracking-wider">
              {horizonLabel(timeHorizon)} horizon
            </span>
          </div>
          <div className="section-card-body">
            <PureSvgWaterfall
              segments={agg.segments}
              totalCapacity={agg.totalCapacity}
              width={800}
              height={320}
              showLabels={true}
              mini={false}
            />

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[10px] text-th-muted">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#009999]" /> Base</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" /> +Pipeline</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1.5px, rgba(0,0,0,0.25) 1.5px, rgba(0,0,0,0.25) 2.5px)' }} /> −Expiring
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1.5px, rgba(0,0,0,0.25) 1.5px, rgba(0,0,0,0.25) 2.5px)' }} /> −OEM Repair
              </div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /> +RMA Return</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#6366f1]" /> Projected</div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-th-muted inline-block" /> Capacity
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-Facility Grid */}
      {facilityResults.length > 0 && (
        <div>
          <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em] mb-4">
            Per-Facility Forecast
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {facilityResults.map((result) => {
              const { facility, segments, headroom, status, cBase, pipelineWeighted, capacityFreed, rmaOut, rmaIn, projected, totalCapacity } = result;
              return (
                <div
                  key={facility.id}
                  className="section-card cursor-pointer hover:border-siemens-accent/30 transition-colors"
                  onClick={() => setSelectedFacility(result)}
                >
                  <div className="section-card-header">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-siemens-accent" />
                      <h3 className="text-xs font-semibold text-th-secondary">{facility.code}</h3>
                      <span className="text-[9px] text-th-faint">{facility.region}</span>
                    </div>
                    {status === 'over' ? (
                      <span className="badge badge-red">Over</span>
                    ) : status === 'near' ? (
                      <span className="badge badge-yellow">Near</span>
                    ) : (
                      <span className="badge badge-green">+{headroom}</span>
                    )}
                  </div>
                  <div className="section-card-body pt-0">
                    <MiniWaterfall segments={segments} totalCapacity={totalCapacity} height={120} />
                    <div className="grid grid-cols-6 gap-1 mt-2 pt-2 border-t border-surface-border text-center">
                      <div>
                        <div className="text-sm font-bold text-th-primary">{cBase}</div>
                        <div className="text-[8px] text-th-faint uppercase">Base</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-emerald-400">+{pipelineWeighted}</div>
                        <div className="text-[8px] text-th-faint uppercase">Pipe</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-orange-400">−{capacityFreed}</div>
                        <div className="text-[8px] text-th-faint uppercase">Exp</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-red-400">−{rmaOut.count}</div>
                        <div className="text-[8px] text-th-faint uppercase">RMA</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-emerald-400">+{rmaIn.count}</div>
                        <div className="text-[8px] text-th-faint uppercase">Ret</div>
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${status === 'over' ? 'text-amber-400' : 'text-indigo-400'}`}>{projected}</div>
                        <div className="text-[8px] text-th-faint uppercase">Proj</div>
                      </div>
                    </div>
                    {/* Accounts */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {facility.accounts.slice(0, 4).map((a) => (
                        <span key={a} className="text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--skeleton-bg)] text-th-muted">{a}</span>
                      ))}
                      {facility.accounts.length > 4 && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--skeleton-bg)] text-th-muted">+{facility.accounts.length - 4}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Facility Detail Modal */}
      {selectedFacility && (
        <FacilityModal
          facility={selectedFacility.facility}
          workOrders={engineData?.activeWorkOrders || []}
          onClose={() => setSelectedFacility(null)}
          onCompleteRepair={handleCompleteRepair}
          completingId={completingId}
        />
      )}
    </div>
  );
}
