import React, { useContext, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  AlertTriangle,
  Zap,
  Layers,
  Server,
  Cpu,
  Building2,
  Rows3,
  Sparkles,
  CalendarPlus,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { getCapacityGrid, getCapacityShortfall } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import { AgentChatContext } from './Layout';
import CapacityReservationPanel from './CapacityReservationPanel';
import CapacityChargebackPanel from './CapacityChargebackPanel';
import { parseDay, fmtDay } from './capacityDates';

const LEVEL_ICON = { fleet: Layers, colo: Building2, row: Rows3, tower: Server, blade: Cpu };
const LEVEL_LABEL = { fleet: 'All colos', colo: 'Colo', row: 'Row', tower: 'Tower', blade: 'Blade' };

/** Cell colour for one node on one day. */
function cellStyle(level, c) {
  const conflict = c.overbooked || c.powerConflict;
  const shortVsPipeline = c.available - c.pipeline < 0;
  let bg;
  if (level === 'blade') {
    bg = c.allocated ? '#009999' : c.reserved ? '#f59e0b' : '#e5e7eb';
  } else if (conflict || c.available < 0) {
    bg = '#ef4444';
  } else if (c.total === 0) {
    bg = 'transparent';
  } else {
    const used = (c.allocated + c.reserved) / c.total;
    if (c.available === 0) bg = '#dc2626';
    else if (used >= 0.85) bg = '#f59e0b';
    else if (used >= 0.6) bg = '#0d9488';
    else if (used >= 0.3) bg = '#14b8a6';
    else bg = '#99f6e4';
  }
  return {
    backgroundColor: bg,
    boxShadow: shortVsPipeline && level !== 'blade' ? 'inset 0 -4px 0 #7c3aed' : undefined,
  };
}

function cellTitle(label, level, c) {
  const lines = [
    `${label} — ${fmtDay(c.day, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`,
  ];
  if (level === 'blade') {
    lines.push(c.allocated ? 'In use (allocated)' : c.reserved ? 'Reserved' : 'Free');
  } else {
    lines.push(`Slots: ${c.total} · in use ${c.allocated} · reserved ${c.reserved} · free ${c.available}`);
    if (c.pipeline) {
      lines.push(`Pipeline demand: ${c.pipeline}${c.available - c.pipeline < 0 ? ` (short ${c.pipeline - c.available})` : ''}`);
    }
    if (c.powerCap) lines.push(`Power: ${Number(c.powerCommitted).toFixed(1)} / ${Number(c.powerCap).toFixed(0)} kW`);
    if (c.overbooked) lines.push('⚠ Overbooked: holds exceed a tower’s slots');
    if (c.powerConflict) lines.push('⚠ Power over a tower’s budget');
  }
  return lines.join('\n');
}

function NodeBadges({ g }) {
  if (!g || g.level === 'blade') return null;
  return (
    <span className="flex items-center gap-1 flex-wrap">
      <span className={`badge text-[10px] ${g.minAfterPipeline >= 0 ? 'badge-teal' : 'badge-red'}`}>
        {g.minAfterPipeline >= 0 ? `${g.minAfterPipeline} free` : `short ${-g.minAfterPipeline}`}
      </span>
      {g.conflictDays > 0 && <span className="badge badge-red text-[10px]">conflict {g.conflictDays}d</span>}
    </span>
  );
}

/* ── heatmap ─────────────────────────────────────────────────────────────── */

export function Heatmap({ grid, onDrill }) {
  const days = grid?.days || [];
  const rows = useMemo(() => {
    if (!grid) return [];
    return [{ ...grid, isSelf: true }, ...(grid.children || [])];
  }, [grid]);

  if (!days.length) return null;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Day ticks: first day and each Monday */}
        <div className="flex items-end h-6">
          <div className="w-[220px] shrink-0" />
          {days.map((c, i) => (
            <div key={c.day} className="w-[10px] shrink-0 relative">
              {(i === 0 || parseDay(c.day).getDay() === 1) && (
                <span className="absolute bottom-0 left-0 text-[9px] text-th-faint whitespace-nowrap">
                  {fmtDay(c.day)}
                </span>
              )}
            </div>
          ))}
        </div>

        {rows.map((r) => {
          const Icon = LEVEL_ICON[r.level] || Server;
          const drillable = !r.isSelf && r.level !== 'blade';
          return (
            <div
              key={r.key + (r.isSelf ? '-self' : '')}
              className={`flex items-center ${r.isSelf ? 'mb-2 pb-2 border-b border-surface-border' : ''}`}
            >
              <button
                type="button"
                disabled={!drillable}
                onClick={() => drillable && onDrill(r)}
                className={`w-[220px] shrink-0 pr-2 flex items-center gap-1.5 text-left ${
                  drillable ? 'cursor-pointer hover:text-siemens-accent' : 'cursor-default'
                }`}
                title={drillable ? `Drill into ${r.label}` : undefined}
              >
                <Icon size={12} className={r.isSelf ? 'text-siemens-accent' : 'text-th-muted'} />
                <span className={`text-xs truncate ${r.isSelf ? 'font-semibold text-th-primary' : 'text-th-secondary'}`}>
                  {r.isSelf ? `Total — ${r.label}` : r.label}
                </span>
                {drillable && <ChevronRight size={11} className="text-th-faint shrink-0" />}
              </button>
              <div className="flex">
                {(r.days || []).map((c) => (
                  <div
                    key={c.day}
                    className="w-[10px] h-[22px] shrink-0 border-r border-white/40"
                    style={cellStyle(r.level, c)}
                    title={cellTitle(r.label, r.level, c)}
                  />
                ))}
              </div>
              <div className="pl-2 shrink-0">
                <NodeBadges g={r} />
              </div>
            </div>
          );
        })}

        {/* Power headroom for the selected node */}
        {grid.level !== 'blade' && days[0]?.powerCap > 0 && (
          <div className="flex items-center mt-2 pt-2 border-t border-surface-border">
            <div className="w-[220px] shrink-0 pr-2 flex items-center gap-1.5">
              <Zap size={12} className="text-amber-500" />
              <span className="text-xs text-th-secondary">Power headroom</span>
            </div>
            <div className="flex">
              {days.map((c) => {
                const head = c.powerCap - c.powerCommitted;
                const pct = c.powerCap ? head / c.powerCap : 0;
                const bg = c.powerConflict || head < 0 ? '#ef4444' : pct < 0.15 ? '#f59e0b' : pct < 0.4 ? '#fcd34d' : '#fef3c7';
                return (
                  <div
                    key={c.day}
                    className="w-[10px] h-[14px] shrink-0 border-r border-white/40"
                    style={{ backgroundColor: bg }}
                    title={`${fmtDay(c.day)} — ${head.toFixed(1)} kW free of ${Number(c.powerCap).toFixed(0)} kW${
                      c.powerConflict ? ' (a tower is over its budget)' : ''
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ level }) {
  const items =
    level === 'tower'
      ? [['#009999', 'Blade in use'], ['#f59e0b', 'Blade reserved'], ['#e5e7eb', 'Blade free']]
      : [['#99f6e4', '<30% used'], ['#14b8a6', '30–60%'], ['#0d9488', '60–85%'], ['#f59e0b', '85%+'], ['#dc2626', 'Full'], ['#ef4444', 'Conflict']];
  return (
    <div className="flex items-center gap-3 flex-wrap text-[10px] text-th-muted">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
          {l}
        </span>
      ))}
      {level !== 'tower' && (
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-surface-card" style={{ boxShadow: 'inset 0 -4px 0 #7c3aed' }} />
          Short vs pipeline
        </span>
      )}
      <span className="text-th-faint">Hover a cell for that day’s detail. Click a row to drill down.</span>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function CapacityDailyView() {
  const openAgentChat = useContext(AgentChatContext);
  const [tab, setTab] = useState('grid');
  const [days, setDays] = useState(90);
  const [trail, setTrail] = useState([{ key: 'fleet', label: 'All colos', level: 'fleet' }]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [showReserve, setShowReserve] = useState(false);

  const current = trail[trail.length - 1];
  const { data: grid, loading, error } = useSalesforceData(
    () => getCapacityGrid({ node: current.key, days }),
    [current.key, days, refreshToken],
  );
  const { data: shortfalls } = useSalesforceData(() => getCapacityShortfall({ days }), [days, refreshToken]);

  const drill = (node) => setTrail((t) => [...t, { key: node.key, label: node.label, level: node.level }]);
  const jumpTo = (i) => setTrail((t) => t.slice(0, i + 1));
  const refresh = () => setRefreshToken((n) => n + 1);

  const today = grid?.days?.[0];
  const peak = (field) => (grid?.days || []).reduce((m, c) => Math.max(m, c[field] || 0), 0);
  const alerts = (shortfalls || []).filter((s) => s.slotsNeeded > 0);
  const childLevel = grid?.children?.[0]?.level;

  const metrics = [
    ['Blade slots', today?.total],
    ['In use today', today?.allocated],
    ['Peak reserved', peak('reserved')],
    ['Fewest free', grid?.minAvailable, grid?.minAvailableDate ? `on ${fmtDay(grid.minAvailableDate)}` : ''],
    [
      'Peak pipeline',
      peak('pipeline'),
      grid?.firstShortfallDate ? `short ${grid.worstShortfall} from ${fmtDay(grid.firstShortfallDate)}` : 'covered',
    ],
    ['Lowest power headroom', grid?.minPowerHeadroom != null ? `${Number(grid.minPowerHeadroom).toFixed(0)} kW` : '--'],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDays size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-th-primary">Daily Capacity &amp; Reservations</h1>
            <p className="text-xs text-th-muted max-w-2xl">
              Blade-slot capacity by day across colo → row → tower → blade, computed live from allocations,
              reservations and pipeline demand. Capacity and power both gate whether a job can run.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`filter-tab ${days === d ? 'filter-tab-active' : ''}`}
            >
              {d} days
            </button>
          ))}
          <button type="button" onClick={refresh} className="filter-tab" title="Refresh from Salesforce">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setTab('grid')}
          className={`filter-tab flex items-center gap-1.5 ${tab === 'grid' ? 'filter-tab-active' : ''}`}
        >
          <CalendarDays size={13} /> Capacity by day
        </button>
        <button
          type="button"
          onClick={() => setTab('chargeback')}
          className={`filter-tab flex items-center gap-1.5 ${tab === 'chargeback' ? 'filter-tab-active' : ''}`}
        >
          <Receipt size={13} /> Chargeback
        </button>
        {openAgentChat && (
          <button
            type="button"
            onClick={() => openAgentChat('hav', 'Where do we have free capacity for a new EaaS customer?')}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-siemens-teal/20 text-siemens-accent/80 bg-siemens-teal/5 hover:bg-siemens-teal/15"
          >
            <Sparkles size={12} /> Ask the agent where new demand fits
          </button>
        )}
      </div>

      {tab === 'chargeback' ? (
        <CapacityChargebackPanel refreshToken={refreshToken} />
      ) : (
        <>
          {/* Shortfall banner */}
          {alerts.length > 0 && (
            <div className="section-card border-l-4" style={{ borderLeftColor: '#7c3aed' }}>
              <div className="section-card-body space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-violet-500" />
                  <span className="text-xs font-semibold text-th-primary uppercase tracking-wider">
                    Pipeline-informed expansion forecast
                  </span>
                </div>
                {alerts.map((s) => (
                  <p key={s.colo} className="text-sm text-th-secondary">
                    {s.recommendation}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 flex-wrap text-sm">
            {trail.map((t, i) => (
              <React.Fragment key={t.key}>
                {i > 0 && <ChevronRight size={13} className="text-th-faint" />}
                <button
                  type="button"
                  onClick={() => jumpTo(i)}
                  className={i === trail.length - 1 ? 'font-semibold text-th-primary' : 'text-siemens-accent hover:underline'}
                >
                  {t.label}
                </button>
              </React.Fragment>
            ))}
            <span className="ml-2 text-[10px] text-th-faint uppercase tracking-wider">{LEVEL_LABEL[current.level]}</span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {metrics.map(([label, value, sub]) => (
              <div key={label} className="metric-card !p-4">
                <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">{label}</span>
                <div className="text-xl font-bold text-th-primary mt-1">{loading && !grid ? '…' : value ?? '--'}</div>
                {sub && (
                  <div className={`text-[10px] ${String(sub).startsWith('short') ? 'text-violet-500 font-semibold' : 'text-th-muted'}`}>
                    {sub}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="section-card">
            <div className="section-card-header">
              <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
                {current.level === 'tower' ? 'Blades' : `${LEVEL_LABEL[childLevel] || 'Capacity'}s`} by day · next {days} days
              </h2>
              <button
                type="button"
                onClick={() => setShowReserve((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-siemens-teal text-white hover:opacity-90"
              >
                <CalendarPlus size={13} /> {showReserve ? 'Hide reservation' : 'New reservation'}
              </button>
            </div>
            <div className="section-card-body space-y-4">
              {error && <div className="text-sm text-red-500">Could not load capacity: {error}</div>}
              {loading && !grid && <div className="skeleton h-40 w-full" />}
              {grid && <Heatmap grid={grid} onDrill={drill} />}
              {grid && <Legend level={grid.level} />}
              {grid && current.level === 'tower' && (grid.children || []).length < (today?.total || 0) && (
                <p className="text-[11px] text-th-muted">
                  {(today?.total || 0) - (grid.children || []).length} slot(s) in this tower have no blade installed.
                  Tower-level reservations not yet assigned to a blade show in the Total row.
                </p>
              )}
            </div>
          </div>

          {showReserve && (
            <CapacityReservationPanel scopeKey={current.key} scopeLabel={current.label} onReserved={refresh} />
          )}
        </>
      )}
    </div>
  );
}
