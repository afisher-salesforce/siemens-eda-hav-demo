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
import { getCapacityGrid, getCapacityShortfall, getCapacityCustomers, getCapacityRegions } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import { AgentChatContext } from './Layout';
import CapacityReservationPanel from './CapacityReservationPanel';
import CapacityChargebackPanel from './CapacityChargebackPanel';
import CapacityDayPanel from './CapacityDayPanel';
import { parseDay, fmtDay } from './capacityDates';

const LEVEL_ICON = { fleet: Layers, colo: Building2, row: Rows3, tower: Server, blade: Cpu };
const LEVEL_LABEL = { fleet: 'All colos', colo: 'Colo', row: 'Row', tower: 'Tower', blade: 'Blade' };

/**
 * Colour rules (same as the Salesforce havDailyCapacity component):
 *  - blade: in use / reserved / free.
 *  - tower: a conflict (overbooked or over its power budget) fills the cell red.
 *  - fleet / colo / row: colour by utilization; a conflict in any tower below
 *    shows as a red stripe on top (plus the conflict badge), never a solid cell.
 *  - aggregates: purple stripe underneath when short against pipeline.
 */
function utilizationColour(c) {
  if (!c.total) return 'transparent';
  if (c.available <= 0) return '#dc2626';
  const used = (c.allocated + c.reserved) / c.total;
  if (used >= 0.85) return '#f59e0b';
  if (used >= 0.6) return '#0d9488';
  if (used >= 0.3) return '#14b8a6';
  return '#99f6e4';
}

/** Customer focus: full colour where the customer holds blades, faded where only pipeline, dim elsewhere. */
function focusOpacity(focusName, c) {
  if (!focusName || c.focusHeld > 0) return {};
  return { opacity: c.focusPipeline > 0 ? 0.55 : 0.18 };
}

function cellStyle(level, c) {
  const conflict = c.overbooked || c.powerConflict;
  if (level === 'blade') {
    return { backgroundColor: c.allocated ? '#009999' : c.reserved ? '#f59e0b' : '#e5e7eb' };
  }
  const shadows = [];
  if (level !== 'tower' && conflict) shadows.push('inset 0 4px 0 #ef4444');
  if (c.available - c.pipeline < 0) shadows.push('inset 0 -4px 0 #7c3aed');
  return {
    backgroundColor: level === 'tower' && conflict ? '#ef4444' : utilizationColour(c),
    boxShadow: shadows.length ? shadows.join(',') : undefined,
  };
}

function powerStyle(level, c) {
  const head = c.powerCap - c.powerCommitted;
  const pct = c.powerCap ? head / c.powerCap : 0;
  if (level === 'tower' && (c.powerConflict || head < 0)) return { backgroundColor: '#ef4444' };
  return {
    backgroundColor: head < 0 ? '#ef4444' : pct < 0.15 ? '#f59e0b' : pct < 0.4 ? '#fcd34d' : '#fef3c7',
    boxShadow: c.powerConflict ? 'inset 0 4px 0 #ef4444' : undefined,
  };
}

function cellTitle(label, level, c, focusName) {
  const lines = [
    `${label} — ${fmtDay(c.day, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`,
  ];
  if (level === 'blade') {
    lines.push(c.allocated ? 'In use (allocated)' : c.reserved ? 'Reserved' : 'Free');
    if (c.holders) lines.push(`Customer: ${c.holders}`);
  } else {
    lines.push(`Slots: ${c.total} · in use ${c.allocated} · reserved ${c.reserved} · free ${c.available}`);
    if (c.pipeline) {
      lines.push(`Pipeline demand: ${c.pipeline}${c.available - c.pipeline < 0 ? ` (short ${c.pipeline - c.available})` : ''}`);
    }
    if (c.powerCap) {
      const head = c.powerCap - c.powerCommitted;
      lines.push(`Power: ${Number(c.powerCommitted).toFixed(1)} / ${Number(c.powerCap).toFixed(0)} kW (${head.toFixed(1)} kW free)`);
    }
    if (c.holders) lines.push(`Held by: ${c.holders}`);
    if (c.conflictTowers) lines.push(`⚠ Conflict: ${c.conflictTowers}`);
    else if (c.overbooked) lines.push('⚠ Overbooked: holds exceed a tower’s slots');
    else if (c.powerConflict) lines.push('⚠ Power over a tower’s budget');
  }
  if (focusName) {
    lines.push(
      c.focusHeld || c.focusPipeline
        ? `${focusName}: ${c.focusHeld || 0} blade(s) held${c.focusPipeline ? `, ${c.focusPipeline} in pipeline` : ''}`
        : `${focusName}: nothing this day`,
    );
  }
  lines.push('Click for the day’s detail and actions');
  return lines.join('\n');
}

function NodeBadges({ g, focusName }) {
  if (!g || g.level === 'blade') return null;
  return (
    <span className="flex items-center gap-1 flex-wrap">
      <span className={`badge text-[10px] ${g.minAfterPipeline >= 0 ? 'badge-teal' : 'badge-red'}`}>
        {g.minAfterPipeline >= 0 ? `${g.minAfterPipeline} free` : `short ${-g.minAfterPipeline}`}
      </span>
      {g.conflictDays > 0 && <span className="badge badge-red text-[10px]">conflict {g.conflictDays}d</span>}
      {g.region && <span className="badge text-[10px] bg-gray-500/10 text-th-muted">{g.region}</span>}
      {focusName && g.focusDays > 0 && (
        <span className="badge text-[10px] bg-blue-500/10 text-blue-600">
          {g.focusPeak > 0 ? `${focusName} peak ${g.focusPeak}` : `${focusName} pipeline only`}
        </span>
      )}
    </span>
  );
}

/* ── heatmap ─────────────────────────────────────────────────────────────── */

export function Heatmap({ grid, onDrill, onCellClick, selected, focusName }) {
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
                {(r.days || []).map((c) => {
                  const inColumn = selected && selected.day === c.day;
                  const isSelected = inColumn && selected.node === r.key;
                  return (
                    <div
                      key={c.day}
                      role="button"
                      tabIndex={-1}
                      onClick={() => onCellClick && onCellClick(r, c)}
                      className="w-[10px] h-[22px] shrink-0 border-r border-white/40 cursor-pointer"
                      style={{
                        ...cellStyle(r.level, c),
                        ...focusOpacity(focusName, c),
                        ...(inColumn ? { filter: 'brightness(0.85)' } : {}),
                        ...(isSelected ? { outline: '2px solid #0b5cab', outlineOffset: '-2px', filter: 'none' } : {}),
                      }}
                      title={cellTitle(r.label, r.level, c, focusName)}
                    />
                  );
                })}
              </div>
              <div className="pl-2 shrink-0">
                <NodeBadges g={r} focusName={focusName} />
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
                return (
                  <div
                    key={c.day}
                    className="w-[10px] h-[14px] shrink-0 border-r border-white/40"
                    style={powerStyle(grid.level, c)}
                    title={`${fmtDay(c.day)} — ${head.toFixed(1)} kW free of ${Number(c.powerCap).toFixed(0)} kW${
                      c.powerConflict ? (grid.level === 'tower' ? ' (over this tower’s budget)' : ' (a tower below is over its budget)') : ''
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
      : [['#99f6e4', '<30% used'], ['#14b8a6', '30–60%'], ['#0d9488', '60–85%'], ['#f59e0b', '85%+'], ['#dc2626', 'Full']];
  return (
    <div className="flex items-center gap-3 flex-wrap text-[10px] text-th-muted">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
          {l}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
        Tower conflict
      </span>
      {level !== 'tower' && (
        <>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#14b8a6', boxShadow: 'inset 0 4px 0 #ef4444' }} />
            Conflict in a tower below
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-surface-card" style={{ boxShadow: 'inset 0 -4px 0 #7c3aed' }} />
            Short vs pipeline
          </span>
        </>
      )}
      <span className="text-th-faint">Hover a cell for that day; click a cell for its detail and actions. Click a row name to drill down.</span>
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
  const [selected, setSelected] = useState(null); // { node, label, level, day }
  const [reserveTarget, setReserveTarget] = useState(null); // { key, label, start }
  const [focusId, setFocusId] = useState('');
  const [region, setRegion] = useState('');

  const current = trail[trail.length - 1];
  const { data: grid, loading, error } = useSalesforceData(
    () => getCapacityGrid({ node: current.key, days, focus: focusId || undefined, region: region || undefined }),
    [current.key, days, refreshToken, focusId, region],
  );
  const { data: regions } = useSalesforceData(() => getCapacityRegions(), []);
  const changeRegion = (value) => {
    setSelected(null);
    setTrail([{ key: 'fleet', label: 'All colos', level: 'fleet' }]);
    setRegion(value);
  };
  const { data: customers } = useSalesforceData(() => getCapacityCustomers(), []);
  const focusName = focusId ? (customers || []).find((c) => c.id === focusId)?.name : undefined;
  const { data: shortfalls } = useSalesforceData(() => getCapacityShortfall({ days }), [days, refreshToken]);

  const drill = (node) => {
    setSelected(null);
    setTrail((t) => [...t, { key: node.key, label: node.label, level: node.level }]);
  };
  const jumpTo = (i) => {
    setSelected(null);
    setTrail((t) => t.slice(0, i + 1));
  };
  const selectCell = (row, cell) => setSelected({ node: row.key, label: row.label, level: row.level, day: cell.day });
  const reserveHere = () => {
    const useSel = selected && selected.level !== 'blade';
    setReserveTarget({
      key: useSel ? selected.node : current.key,
      label: useSel ? selected.label : current.label,
      start: selected ? selected.day : undefined,
    });
    setShowReserve(true);
  };
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
          <select
            value={region}
            onChange={(e) => changeRegion(e.target.value)}
            className="filter-tab pr-6"
            title="Only colos in one region (geography / latency)"
            aria-label="Region"
          >
            <option value="">All regions</option>
            {(regions || []).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={focusId}
            onChange={(e) => setFocusId(e.target.value)}
            className="filter-tab pr-6"
            title="Focus the heatmap on one customer"
            aria-label="Focus on customer"
          >
            <option value="">All customers</option>
            {(customers || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
                onClick={() => {
                  setReserveTarget(null);
                  setShowReserve((v) => !v);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-siemens-teal text-white hover:opacity-90"
              >
                <CalendarPlus size={13} /> {showReserve ? 'Hide reservation' : 'New reservation'}
              </button>
            </div>
            <div className="section-card-body space-y-4">
              {error && <div className="text-sm text-red-500">Could not load capacity: {error}</div>}
              {loading && !grid && <div className="skeleton h-40 w-full" />}
              {grid && (
                <Heatmap grid={grid} onDrill={drill} onCellClick={selectCell} selected={selected} focusName={focusName} />
              )}
              {grid && <Legend level={grid.level} />}
              {focusName && (
                <p className="text-[11px] text-blue-600">
                  Showing {focusName}: full colour where they hold blades, faded where they only have pipeline, dimmed
                  elsewhere. The day panel still shows every hold so conflicts can be fixed.
                </p>
              )}
              {grid && current.level === 'tower' && (grid.children || []).length < (today?.total || 0) && (
                <p className="text-[11px] text-th-muted">
                  {(today?.total || 0) - (grid.children || []).length} slot(s) in this tower have no blade installed.
                  Tower-level reservations not yet assigned to a blade show in the Total row.
                </p>
              )}
            </div>
          </div>

          {selected && (
            <CapacityDayPanel
              node={selected.node}
              day={selected.day}
              refreshToken={refreshToken}
              onClose={() => setSelected(null)}
              onChanged={refresh}
              onReserveHere={reserveHere}
            />
          )}

          {showReserve && (
            <CapacityReservationPanel
              scopeKey={reserveTarget ? reserveTarget.key : current.key}
              scopeLabel={reserveTarget ? reserveTarget.label : current.label}
              initialStart={reserveTarget ? reserveTarget.start : undefined}
              onReserved={refresh}
            />
          )}
        </>
      )}
    </div>
  );
}
