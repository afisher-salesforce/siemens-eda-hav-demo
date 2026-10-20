import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningConfirm from 'lightning/confirm';
import HavReserveModal from 'c/havReserveModal';
import getDayDetail from '@salesforce/apex/HAV_CapacityGridController.getDayDetail';
import getMoveOptions from '@salesforce/apex/HAV_CapacityGridController.getMoveOptions';
import moveHold from '@salesforce/apex/HAV_CapacityGridController.moveHold';
import releaseHold from '@salesforce/apex/HAV_CapacityGridController.releaseHold';
import getGrid from '@salesforce/apex/HAV_CapacityGridController.getGrid';
import getShortfall from '@salesforce/apex/HAV_CapacityGridController.getShortfall';
import nodeForRecord from '@salesforce/apex/HAV_CapacityGridController.nodeForRecord';
import getHolds from '@salesforce/apex/HAV_CapacityGridController.getHolds';
import getCustomers from '@salesforce/apex/HAV_CapacityGridController.getCustomers';
import getRegions from '@salesforce/apex/HAV_CapacityGridController.getRegions';
import planMove from '@salesforce/apex/HAV_CapacityGridController.planMove';
import createWorkOrder from '@salesforce/apex/HAV_CapacityGridController.createWorkOrder';

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

/** Customer focus: full colour where the customer holds blades, faded where only pipeline, dim elsewhere. */
function focusOpacity(focusOn, c) {
    if (!focusOn) return '';
    if (c.focusHeld > 0) return '';
    return c.focusPipeline > 0 ? 'opacity:0.55;' : 'opacity:0.18;';
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

function cellTitle(label, level, c, focusName) {
    const d = parseDay(c.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const lines = [`${label} — ${d}`];
    if (level === 'blade') {
        lines.push(c.allocated ? 'In use (allocated)' : c.reserved ? 'Reserved' : 'Free');
        if (c.holders) lines.push(`Customer: ${c.holders}`);
    } else {
        lines.push(`Slots: ${c.total} · in use ${c.allocated} · reserved ${c.reserved} · free ${c.available}`);
        if (c.pipeline) lines.push(`Pipeline demand: ${c.pipeline}${c.available - c.pipeline < 0 ? ` (short ${c.pipeline - c.available})` : ''}`);
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
                : `${focusName}: nothing this day`
        );
    }
    lines.push('Click for the day’s detail and actions');
    return lines.join('\n');
}

const DETAIL_COLUMNS = [
    { label: 'Hold', fieldName: 'name' },
    { label: 'Status', fieldName: 'status' },
    { label: 'Customer', fieldName: 'customer' },
    { label: 'Job / project', fieldName: 'job' },
    { label: 'Tower', fieldName: 'tower' },
    { label: 'Blades', fieldName: 'blades', type: 'number', initialWidth: 80 },
    { label: 'kW', fieldName: 'kw', type: 'number', initialWidth: 80 },
    { label: 'Start', fieldName: 'startDate', type: 'date-local' },
    { label: 'End', fieldName: 'endDate', type: 'date-local' },
    { type: 'action', typeAttributes: { rowActions: getRowActions } }
];

/**
 * Row actions per hold. A Reserved hold is paperwork: move it instantly. An
 * Allocated (in-use) hold is physical: plan the move, which creates a Move
 * work order. Provision / decommission work orders for the colo team.
 */
function getRowActions(row, doneCallback) {
    const actions = [];
    if (row.canMove && row.status === 'Allocated') {
        actions.push({ label: 'Plan move (work order)…', name: 'planmove', iconName: 'utility:move' });
    } else if (row.canMove) {
        actions.push({ label: 'Move to another tower…', name: 'move', iconName: 'utility:move' });
    }
    if (row.canProvision) actions.push({ label: 'Create provisioning work order', name: 'provision', iconName: 'utility:work_order_type' });
    if (row.canDecommission) actions.push({ label: 'Create decommission work order', name: 'decommission', iconName: 'utility:work_order_type' });
    if (row.canRelease) actions.push({ label: 'Release', name: 'release', iconName: 'utility:close' });
    actions.push({ label: 'Open record', name: 'open', iconName: 'utility:open' });
    doneCallback(actions);
}

function errorMessage(e) {
    if (!e) return 'Unknown error';
    if (e.body && e.body.message) return e.body.message;
    return e.message || String(e);
}

export default class HavDailyCapacity extends NavigationMixin(LightningElement) {
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

    // Region filter (geography / latency)
    region = '';
    regionOptions = [{ label: 'All regions', value: '' }];

    // Customer focus (filter)
    focusId = '';
    customerOptions = [{ label: 'All customers', value: '' }];
    detailColumns = DETAIL_COLUMNS;

    // Day detail (click a cell)
    selectedNode;
    selectedDay;
    detail;
    detailLoading = false;
    moveFor;
    moveOptions = [];
    moveLoading = false;
    busy = false;

    connectedCallback() {
        this.windowDays = Number(this.days) || 90;
        this.init();
        getRegions()
            .then((rows) => {
                this.regionOptions = [{ label: 'All regions', value: '' }, ...rows.map((r) => ({ label: r, value: r }))];
            })
            .catch(() => {});
        getCustomers()
            .then((rows) => {
                this.customerOptions = [{ label: 'All customers', value: '' }, ...rows.map((r) => ({ label: r.name, value: r.id }))];
            })
            .catch(() => {});
    }

    get focusName() {
        if (!this.focusId) return undefined;
        const o = this.customerOptions.find((x) => x.value === this.focusId);
        return o ? o.label : undefined;
    }

    handleRegion(event) {
        this.region = event.detail.value || '';
        this.trail = [{ key: 'fleet', label: 'All colos', level: 'fleet' }];
        this.handleCloseDetail();
        this.load();
    }

    handleFocus(event) {
        this.focusId = event.detail.value || '';
        this.load();
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
                getGrid({ nodeKey: node.key, days: this.windowDays, customerId: this.focusId || null, region: this.region || null }),
                getShortfall({ days: this.windowDays })
            ]);
            this.grid = JSON.parse(gridJson);
            this.alerts = JSON.parse(shortJson)
                .filter((s) => s.slotsNeeded > 0)
                .map((s) => ({ key: s.colo, text: s.recommendation }));
            this.buildRows();
            if (node.level === 'tower' || node.level === 'row') {
                const holds = await getHolds({ nodeKey: node.key, days: this.windowDays });
                const focusName = this.focusName;
                this.holds = holds
                    .filter((h) => !focusName || h.customer === focusName)
                    .map((h) => ({ ...h, url: `/${h.id}` }));
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
        const focusName = this.focusName;
        const focusOn = !!focusName;
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
                showRegion: !!r.region,
                regionLabel: r.region,
                showFocus: focusOn && r.focusDays > 0,
                focusBadge: r.focusPeak > 0 ? `${focusName} peak ${r.focusPeak}` : `${focusName} pipeline only`,
                cells: (r.days || []).map((c) => ({
                    key: c.day,
                    day: c.day,
                    style: cellStyle(r.level, c) + focusOpacity(focusOn, c),
                    title: cellTitle(r.label, r.level, c, focusName),
                    cls:
                        'hm-cell hm-click' +
                        (c.day === this.selectedDay ? ' hm-col-selected' : '') +
                        (c.day === this.selectedDay && r.key === this.selectedNode ? ' hm-cell-selected' : '')
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
    get hasFocus() {
        return !!this.focusId;
    }
    get focusNote() {
        return this.focusName
            ? `Showing ${this.focusName}: full colour where they hold blades, faded where they only have pipeline, dimmed elsewhere. Holds below are filtered to them; the day panel still shows every hold so conflicts can be fixed.`
            : '';
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
        this.detail = undefined;
        this.selectedNode = undefined;
        this.selectedDay = undefined;
        this.moveFor = undefined;
        const row = this.rows.find((r) => r.nodeKey === key && r.drillable);
        if (!row) return;
        this.trail = [...this.trail, { key: row.nodeKey, label: row.rawLabel, level: row.level }];
        this.load();
    }

    handleCrumb(event) {
        const i = Number(event.currentTarget.dataset.index);
        this.detail = undefined;
        this.selectedNode = undefined;
        this.selectedDay = undefined;
        this.moveFor = undefined;
        if (i === this.trail.length - 1) return;
        this.trail = this.trail.slice(0, i + 1);
        this.load();
    }

    handleWindow(event) {
        this.windowDays = Number(event.currentTarget.dataset.value);
        this.load();
    }

    handleRefresh() {
        this.refreshAll();
    }

    async refreshAll() {
        await this.load();
        if (this.selectedDay) await this.loadDetail();
    }

    // ── day detail ──────────────────────────────────────────────────────
    handleCellClick(event) {
        const { node, day } = event.currentTarget.dataset;
        this.selectedNode = node;
        this.selectedDay = day;
        this.moveFor = undefined;
        this.buildRows();
        this.loadDetail();
    }

    handleCloseDetail() {
        this.selectedNode = undefined;
        this.selectedDay = undefined;
        this.detail = undefined;
        this.moveFor = undefined;
        this.buildRows();
    }

    async loadDetail() {
        this.detailLoading = true;
        try {
            const d = JSON.parse(await getDayDetail({ nodeKey: this.selectedNode, day: this.selectedDay }));
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const c = d.cell || {};
            this.detail = {
                title: `${d.label} — ${parseDay(d.day).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}`,
                level: d.level,
                stats: [
                    { key: 'slots', label: 'Slots', value: c.total },
                    { key: 'use', label: 'In use', value: c.allocated },
                    { key: 'res', label: 'Reserved', value: c.reserved },
                    { key: 'free', label: 'Free', value: c.available, cls: c.available <= 0 ? 'hm-stat-bad' : '' },
                    {
                        key: 'pipe',
                        label: 'Pipeline',
                        value: c.pipeline,
                        cls: c.available - c.pipeline < 0 ? 'hm-stat-short' : ''
                    },
                    {
                        key: 'pwr',
                        label: 'Power',
                        value: c.powerCap ? `${Number(c.powerCommitted).toFixed(1)} / ${Number(c.powerCap).toFixed(0)} kW` : '--',
                        cls: c.powerConflict ? 'hm-stat-bad' : ''
                    }
                ].map((x) => ({ cls: '', ...x, cls2: `hm-stat ${x.cls || ''}` })),
                conflicts: (d.conflicts || []).map((x) => ({ key: x.towerKey, text: x.summary })),
                holds: (d.holds || []).map((h) => ({
                    ...h,
                    canMove: h.holdsCapacity && parseDay(h.endDate) >= today,
                    canProvision: h.status === 'Reserved' && parseDay(h.endDate) >= today,
                    canDecommission: h.status === 'Allocated' && parseDay(h.endDate) >= today,
                    canRelease: h.status !== 'Released'
                }))
            };
        } catch (e) {
            this.toast('Could not load day detail', errorMessage(e), 'error');
        } finally {
            this.detailLoading = false;
        }
    }

    get hasDetail() {
        return !!this.detail;
    }
    get hasDetailConflicts() {
        return this.detail && this.detail.conflicts.length > 0;
    }
    get hasDetailHolds() {
        return this.detail && this.detail.holds.length > 0;
    }
    get hasMoveOptions() {
        return this.moveOptions.length > 0;
    }
    get moveTitle() {
        const h = this.moveFor;
        if (!h) return '';
        const what = `${h.name} (${h.customer || 'no customer'}, ${h.blades} blade(s), ${h.kw || 0} kW) from ${h.tower}`;
        return this.isPlanMove ? `Plan the move of in-use hold ${what}` : `Move ${what}`;
    }
    get isPlanMove() {
        return this.moveMode === 'plan';
    }
    get moveButtonLabel() {
        return this.isPlanMove ? 'Plan move here' : 'Move here';
    }
    get moveHint() {
        return this.isPlanMove
            ? 'In use: the blades physically move on the date below. The target tower is booked from that date, this tower is freed from then, and a Move work order goes to the colo team.'
            : 'Reserved: nothing is installed yet, so the hold moves now.';
    }

    moveMode = 'instant';
    moveDate;

    defaultMoveDate() {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        const sel = this.selectedDay ? parseDay(this.selectedDay) : null;
        const pick = sel && sel > t ? sel : new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7);
        const p = (n) => String(n).padStart(2, '0');
        return `${pick.getFullYear()}-${p(pick.getMonth() + 1)}-${p(pick.getDate())}`;
    }

    async loadMoveOptions() {
        this.moveLoading = true;
        this.moveOptions = [];
        try {
            const opts = JSON.parse(
                await getMoveOptions({ holdId: this.moveFor.id, fromDate: this.isPlanMove ? this.moveDate : null })
            );
            this.moveOptions = opts.map((o) => ({
                key: o.towerKey,
                towerId: o.towerKey.split(':')[1],
                label: `${o.towerName} · ${o.colo} · ${o.row}${o.region ? ' · ' + o.region : ''}`,
                detail: `at least ${o.minFreeSlots} slot(s) and ${Number(o.minFreePowerKw).toFixed(1)} kW free for the rest of the hold`
            }));
        } catch (e) {
            this.toast('Could not load move options', errorMessage(e), 'error');
        } finally {
            this.moveLoading = false;
        }
    }

    handleMoveDate(event) {
        this.moveDate = event.detail.value;
        if (this.moveFor) this.loadMoveOptions();
    }

    async handleRowAction(event) {
        const action = event.detail.action.name;
        const row = event.detail.row;
        if (action === 'open') {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: { recordId: row.id, objectApiName: 'Capacity_Reservation__c', actionName: 'view' }
            });
        } else if (action === 'move' || action === 'planmove') {
            this.moveFor = row;
            this.moveMode = action === 'planmove' ? 'plan' : 'instant';
            this.moveDate = this.defaultMoveDate();
            await this.loadMoveOptions();
        } else if (action === 'provision' || action === 'decommission') {
            await this.runAction(() =>
                createWorkOrder({ holdId: row.id, jobType: action === 'provision' ? 'Provision' : 'Decommission' })
            );
        } else if (action === 'release') {
            const ok = await LightningConfirm.open({
                message: `Release ${row.name} (${row.customer || 'no customer'}, ${row.blades} blade(s) on ${row.tower})? It stops holding capacity and is no longer charged.`,
                label: 'Release hold',
                theme: 'warning'
            });
            if (!ok) return;
            await this.runAction(() => releaseHold({ holdId: row.id }));
        }
    }

    async handleMoveHere(event) {
        const towerId = event.currentTarget.dataset.tower;
        const holdId = this.moveFor.id;
        if (this.isPlanMove) {
            const moveDate = this.moveDate;
            await this.runAction(() => planMove({ holdId, towerId, moveDate }));
        } else {
            await this.runAction(() => moveHold({ holdId, towerId }));
        }
        this.moveFor = undefined;
    }

    handleCancelMove() {
        this.moveFor = undefined;
    }

    async runAction(fn) {
        this.busy = true;
        try {
            const res = JSON.parse(await fn());
            this.toast(res.success ? 'Done' : 'Not done', res.message, res.success ? 'success' : 'warning');
            if (res.success) await this.refreshAll();
        } catch (e) {
            this.toast('Action failed', errorMessage(e), 'error');
        } finally {
            this.busy = false;
        }
    }

    // ── reserve ─────────────────────────────────────────────────────────
    async handleReserve(event) {
        const fromDay = event.currentTarget.dataset.fromday === 'true';
        const useSelected = fromDay && this.selectedNode && !this.selectedNode.startsWith('blade:');
        const result = await HavReserveModal.open({
            size: 'large',
            nodeKey: useSelected ? this.selectedNode : this.current.key,
            nodeLabel: useSelected && this.detail ? this.detail.title.split(' — ')[0] : this.current.label,
            startDate: fromDay ? this.selectedDay : undefined
        });
        if (result && result.success) {
            this.toast('Reserved', result.message, 'success');
            await this.refreshAll();
        }
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
