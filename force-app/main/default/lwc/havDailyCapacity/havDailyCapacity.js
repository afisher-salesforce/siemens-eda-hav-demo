import { LightningElement, api } from 'lwc';
import getGrid from '@salesforce/apex/HAV_CapacityGridController.getGrid';
import getShortfall from '@salesforce/apex/HAV_CapacityGridController.getShortfall';
import nodeForRecord from '@salesforce/apex/HAV_CapacityGridController.nodeForRecord';
import getHolds from '@salesforce/apex/HAV_CapacityGridController.getHolds';

const LEVEL_LABEL = { fleet: 'All colos', colo: 'Colo', row: 'Row', tower: 'Tower', blade: 'Blade' };
const LEVEL_ICON = {
    fleet: 'utility:layers',
    colo: 'utility:company',
    row: 'utility:rows',
    tower: 'utility:database',
    blade: 'utility:server'
};

const HOLD_COLUMNS = [
    { label: 'Hold', fieldName: 'url', type: 'url', typeAttributes: { label: { fieldName: 'name' }, target: '_self' } },
    { label: 'Status', fieldName: 'status' },
    { label: 'Customer', fieldName: 'customer' },
    { label: 'Job / project', fieldName: 'job' },
    { label: 'On', fieldName: 'node' },
    { label: 'Start', fieldName: 'startDate', type: 'date-local' },
    { label: 'End', fieldName: 'endDate', type: 'date-local' },
    { label: 'Blades', fieldName: 'blades', type: 'number' },
    { label: 'kW', fieldName: 'kw', type: 'number' }
];

/** "2026-10-19" -> local Date (no timezone shift). */
function parseDay(day) {
    const [y, m, d] = String(day).split('-').map(Number);
    return new Date(y, m - 1, d);
}

function fmtDay(day) {
    return day ? parseDay(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--';
}

/**
 * Colour rules:
 *  - blade: in use / reserved / free.
 *  - tower: a conflict (overbooked or over its power budget) fills the cell red,
 *    because that is where the conflict is real and actionable.
 *  - fleet / colo / row: always colour by utilization so the aggregate picture
 *    stays readable; a conflict in any tower below shows as a red stripe on top
 *    (plus the conflict badge), never as a solid red cell.
 *  - any aggregate: purple stripe underneath when short against pipeline.
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

function cellStyle(level, c) {
    const conflict = c.overbooked || c.powerConflict;
    const shortVsPipeline = c.available - c.pipeline < 0;
    if (level === 'blade') {
        return `background-color:${c.allocated ? '#009999' : c.reserved ? '#f59e0b' : '#e5e7eb'};`;
    }
    const bg = level === 'tower' && conflict ? '#ef4444' : utilizationColour(c);
    const shadows = [];
    if (level !== 'tower' && conflict) shadows.push('inset 0 4px 0 #ef4444');
    if (shortVsPipeline) shadows.push('inset 0 -4px 0 #7c3aed');
    return `background-color:${bg};${shadows.length ? `box-shadow:${shadows.join(',')};` : ''}`;
}

function powerStyle(level, c) {
    const head = c.powerCap - c.powerCommitted;
    const pct = c.powerCap ? head / c.powerCap : 0;
    if (level === 'tower' && (c.powerConflict || head < 0)) return 'background-color:#ef4444;';
    const bg = head < 0 ? '#ef4444' : pct < 0.15 ? '#f59e0b' : pct < 0.4 ? '#fcd34d' : '#fef3c7';
    return `background-color:${bg};${c.powerConflict ? 'box-shadow:inset 0 4px 0 #ef4444;' : ''}`;
}

function cellTitle(label, level, c) {
    const d = parseDay(c.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const lines = [`${label} — ${d}`];
    if (level === 'blade') {
        lines.push(c.allocated ? 'In use (allocated)' : c.reserved ? 'Reserved' : 'Free');
    } else {
        lines.push(`Slots: ${c.total} · in use ${c.allocated} · reserved ${c.reserved} · free ${c.available}`);
        if (c.pipeline) lines.push(`Pipeline demand: ${c.pipeline}${c.available - c.pipeline < 0 ? ` (short ${c.pipeline - c.available})` : ''}`);
        if (c.powerCap) lines.push(`Power: ${Number(c.powerCommitted).toFixed(1)} / ${Number(c.powerCap).toFixed(0)} kW`);
        if (c.overbooked) lines.push('Overbooked: holds exceed a tower’s slots');
        if (c.powerConflict) lines.push('Power over a tower’s budget');
    }
    return lines.join('\n');
}

function errorMessage(e) {
    if (!e) return 'Unknown error';
    if (e.body && e.body.message) return e.body.message;
    return e.message || String(e);
}

export default class HavDailyCapacity extends LightningElement {
    /** Asset record page: start at that tower / colo. */
    @api recordId;
    /** App Builder property: default window in days. */
    @api days = 90;
    /** App Builder property: card title. */
    @api cardTitle = 'Daily Capacity';

    windowDays;
    trail = [];
    grid;
    rows = [];
    ticks = [];
    alerts = [];
    holds = [];
    loading = true;
    error;
    holdColumns = HOLD_COLUMNS;

    connectedCallback() {
        this.windowDays = Number(this.days) || 90;
        this.init();
    }

    async init() {
        try {
            let start = { key: 'fleet', label: 'All colos', level: 'fleet' };
            if (this.recordId) {
                start = await nodeForRecord({ recordId: this.recordId });
            }
            this.trail = [{ ...start }];
            await this.load();
        } catch (e) {
            this.error = errorMessage(e);
            this.loading = false;
        }
    }

    get current() {
        return this.trail[this.trail.length - 1] || { key: 'fleet', label: 'All colos', level: 'fleet' };
    }

    async load() {
        this.loading = true;
        this.error = undefined;
        try {
            const node = this.current;
            const [gridJson, shortJson] = await Promise.all([
                getGrid({ nodeKey: node.key, days: this.windowDays }),
                getShortfall({ days: this.windowDays })
            ]);
            this.grid = JSON.parse(gridJson);
            this.alerts = JSON.parse(shortJson)
                .filter((s) => s.slotsNeeded > 0)
                .map((s) => ({ key: s.colo, text: s.recommendation }));
            this.buildRows();
            if (node.level === 'tower' || node.level === 'row') {
                const holds = await getHolds({ nodeKey: node.key, days: this.windowDays });
                this.holds = holds.map((h) => ({ ...h, url: `/${h.id}` }));
            } else {
                this.holds = [];
            }
        } catch (e) {
            this.error = errorMessage(e);
        } finally {
            this.loading = false;
        }
    }

    buildRows() {
        const g = this.grid;
        const all = [{ ...g, isSelf: true }, ...(g.children || [])];
        this.rows = all.map((r) => {
            const drillable = !r.isSelf && r.level !== 'blade';
            const after = r.minAfterPipeline;
            return {
                key: r.key + (r.isSelf ? '-self' : ''),
                nodeKey: r.key,
                label: r.isSelf ? `Total — ${r.label}` : r.label,
                rawLabel: r.label,
                level: r.level,
                icon: LEVEL_ICON[r.level] || 'utility:database',
                drillable,
                rowClass: r.isSelf ? 'hm-row hm-self' : 'hm-row',
                labelClass: drillable ? 'hm-label hm-drill' : 'hm-label',
                showBadge: r.level !== 'blade' && after !== undefined && after !== null,
                badge: after >= 0 ? `${after} free` : `short ${-after}`,
                badgeClass: after >= 0 ? 'slds-badge hm-badge-ok' : 'slds-badge hm-badge-short',
                showConflict: r.conflictDays > 0,
                conflict: `conflict ${r.conflictDays}d`,
                cells: (r.days || []).map((c) => ({
                    key: c.day,
                    style: cellStyle(r.level, c),
                    title: cellTitle(r.label, r.level, c)
                }))
            };
        });
        this.ticks = (g.days || []).map((c, i) => ({
            key: c.day,
            label: i === 0 || parseDay(c.day).getDay() === 1 ? fmtDay(c.day) : ''
        }));
        const days = g.days || [];
        this.powerCells =
            g.level !== 'blade' && days.length && days[0].powerCap > 0
                ? days.map((c) => {
                      const head = c.powerCap - c.powerCommitted;
                      return {
                          key: c.day,
                          style: powerStyle(g.level, c),
                          title: `${fmtDay(c.day)} — ${head.toFixed(1)} kW free of ${Number(c.powerCap).toFixed(0)} kW${
                              c.powerConflict ? (g.level === 'tower' ? ' (over this tower\u2019s budget)' : ' (a tower below is over its budget)') : ''
                          }`
                      };
                  })
                : [];
    }

    powerCells = [];

    // ── template getters ────────────────────────────────────────────────
    get hasGrid() {
        return !!this.grid;
    }
    get hasAlerts() {
        return this.alerts.length > 0;
    }
    get hasPower() {
        return this.powerCells.length > 0;
    }
    get hasHolds() {
        return this.holds.length > 0;
    }
    get showHoldsSection() {
        const l = this.current.level;
        return l === 'tower' || l === 'row';
    }
    get crumbs() {
        return this.trail.map((t, i) => ({
            key: t.key,
            index: i,
            label: t.label,
            isLast: i === this.trail.length - 1,
            showSep: i > 0
        }));
    }
    get levelLabel() {
        return LEVEL_LABEL[this.current.level];
    }
    get gridHeading() {
        const child = this.grid && this.grid.children && this.grid.children[0];
        const what = this.current.level === 'tower' ? 'Blades' : child ? `${LEVEL_LABEL[child.level]}s` : 'Capacity';
        return `${what} by day · next ${this.windowDays} days`;
    }
    get metrics() {
        const g = this.grid;
        if (!g) return [];
        const d0 = (g.days && g.days[0]) || {};
        const peak = (f) => (g.days || []).reduce((m, c) => Math.max(m, c[f] || 0), 0);
        return [
            { key: 'slots', label: 'Blade slots', value: d0.total },
            { key: 'use', label: 'In use today', value: d0.allocated },
            { key: 'res', label: 'Peak reserved', value: peak('reserved') },
            { key: 'free', label: 'Fewest free', value: g.minAvailable, sub: g.minAvailableDate ? `on ${fmtDay(g.minAvailableDate)}` : '' },
            {
                key: 'pipe',
                label: 'Peak pipeline',
                value: peak('pipeline'),
                sub: g.firstShortfallDate ? `short ${g.worstShortfall} from ${fmtDay(g.firstShortfallDate)}` : 'covered',
                subClass: g.firstShortfallDate ? 'hm-sub hm-sub-short' : 'hm-sub'
            },
            {
                key: 'pwr',
                label: 'Lowest power headroom',
                value: g.minPowerHeadroom !== undefined && g.minPowerHeadroom !== null ? `${Number(g.minPowerHeadroom).toFixed(0)} kW` : '--'
            }
        ].map((m) => ({ subClass: 'hm-sub', ...m }));
    }
    get windowOptions() {
        return [30, 60, 90].map((d) => ({
            key: String(d),
            value: d,
            label: `${d} days`,
            variant: d === this.windowDays ? 'brand' : 'neutral'
        }));
    }

    // ── handlers ────────────────────────────────────────────────────────
    handleDrill(event) {
        const key = event.currentTarget.dataset.key;
        const row = this.rows.find((r) => r.nodeKey === key && r.drillable);
        if (!row) return;
        this.trail = [...this.trail, { key: row.nodeKey, label: row.rawLabel, level: row.level }];
        this.load();
    }

    handleCrumb(event) {
        const i = Number(event.currentTarget.dataset.index);
        if (i === this.trail.length - 1) return;
        this.trail = this.trail.slice(0, i + 1);
        this.load();
    }

    handleWindow(event) {
        this.windowDays = Number(event.currentTarget.dataset.value);
        this.load();
    }

    handleRefresh() {
        this.load();
    }
}
