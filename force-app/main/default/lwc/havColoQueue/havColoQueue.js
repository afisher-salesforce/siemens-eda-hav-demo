import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getQueue from '@salesforce/apex/HAV_ColoQueueController.getQueue';
import getColos from '@salesforce/apex/HAV_ColoQueueController.getColos';
import createWorkOrder from '@salesforce/apex/HAV_ColoQueueController.createWorkOrder';
import completeWorkOrder from '@salesforce/apex/HAV_ColoQueueController.completeWorkOrder';

function errorMessage(e) {
    if (!e) return 'Unknown error';
    if (e.body && e.body.message) return e.body.message;
    return e.message || String(e);
}

function inDaysLabel(n, overdue) {
    if (overdue) return `${-n} day(s) overdue`;
    if (n === 0) return 'today';
    return n === 1 ? 'tomorrow' : `in ${n} days`;
}

const HOLD_ACTIONS = (jobLabel) => (row, done) => {
    const a = [];
    if (row.workOrderId) a.push({ label: `Open work order ${row.workOrderNumber}`, name: 'openwo' });
    else a.push({ label: jobLabel, name: 'create' });
    a.push({ label: 'Open hold', name: 'openhold' });
    done(a);
};

const STARTING_COLUMNS = [
    { label: 'Hold', fieldName: 'holdUrl', type: 'url', typeAttributes: { label: { fieldName: 'name' }, target: '_self' } },
    { label: 'Customer', fieldName: 'customer' },
    { label: 'Job / project', fieldName: 'job' },
    { label: 'Tower', fieldName: 'tower' },
    { label: 'Blades', fieldName: 'blades', type: 'number', initialWidth: 80 },
    { label: 'Starts', fieldName: 'startDate', type: 'date-local' },
    { label: 'When', fieldName: 'when', cellAttributes: { class: { fieldName: 'whenClass' } } },
    { label: 'Provisioning WO', fieldName: 'woLabel' },
    { type: 'action', typeAttributes: { rowActions: HOLD_ACTIONS('Create provisioning work order') } }
];

const ENDING_COLUMNS = [
    { label: 'Hold', fieldName: 'holdUrl', type: 'url', typeAttributes: { label: { fieldName: 'name' }, target: '_self' } },
    { label: 'Customer', fieldName: 'customer' },
    { label: 'Job / project', fieldName: 'job' },
    { label: 'Tower', fieldName: 'tower' },
    { label: 'Blades', fieldName: 'blades', type: 'number', initialWidth: 80 },
    { label: 'Ends', fieldName: 'endDate', type: 'date-local' },
    { label: 'When', fieldName: 'when' },
    { label: 'Decommission WO', fieldName: 'woLabel' },
    { type: 'action', typeAttributes: { rowActions: HOLD_ACTIONS('Create decommission work order') } }
];

const WO_COLUMNS = [
    { label: 'Work order', fieldName: 'woUrl', type: 'url', typeAttributes: { label: { fieldName: 'number' }, target: '_self' } },
    { label: 'Type', fieldName: 'jobType', initialWidth: 110 },
    { label: 'Status', fieldName: 'status', initialWidth: 110 },
    { label: 'Planned', fieldName: 'planned', type: 'date-local', cellAttributes: { class: { fieldName: 'plannedClass' } } },
    { label: 'Customer', fieldName: 'customer' },
    { label: 'Subject', fieldName: 'subject', wrapText: true },
    { label: 'Hold', fieldName: 'hold' },
    {
        type: 'action',
        typeAttributes: {
            rowActions: [
                { label: 'Open', name: 'openwo' },
                { label: 'Mark complete', name: 'complete' }
            ]
        }
    }
];

/**
 * Colo landing page. On a Facility (or tower) asset record page it shows that
 * colo; on an App or Home page it shows a colo picker.
 */
export default class HavColoQueue extends NavigationMixin(LightningElement) {
    @api recordId;
    @api horizonDays = 21;

    horizon;
    coloId;
    colos = [];
    data;
    loading = true;
    busy = false;
    error;
    startingColumns = STARTING_COLUMNS;
    endingColumns = ENDING_COLUMNS;
    woColumns = WO_COLUMNS;

    connectedCallback() {
        this.horizon = Number(this.horizonDays) || 21;
        this.coloId = this.recordId;
        this.load();
    }

    async load() {
        this.loading = true;
        this.error = undefined;
        try {
            const q = JSON.parse(await getQueue({ recordId: this.coloId || null, horizonDays: this.horizon }));
            if (q.needsColo) {
                if (!this.colos.length) {
                    this.colos = (await getColos()).map((c) => ({
                        label: c.region ? `${c.label} · ${c.region}` : c.label,
                        value: c.id
                    }));
                }
                this.data = undefined;
            } else {
                this.data = q;
            }
        } catch (e) {
            this.error = errorMessage(e);
        } finally {
            this.loading = false;
        }
    }

    // ── view model ──────────────────────────────────────────────────────
    get needsColo() {
        return !this.loading && !this.data && !this.error;
    }
    get showPicker() {
        return this.colos.length > 0;
    }
    get title() {
        return this.data ? `Colo operations — ${this.data.colo}` : 'Colo operations';
    }
    get horizonOptions() {
        return [7, 14, 21, 30].map((d) => ({
            key: String(d),
            value: d,
            label: `${d} days`,
            variant: d === this.horizon ? 'brand' : 'neutral'
        }));
    }
    get stats() {
        const c = (this.data && this.data.today) || {};
        const head = (c.powerCap || 0) - (c.powerCommitted || 0);
        return [
            { key: 'towers', label: 'Towers', value: this.data ? this.data.towers : '--' },
            { key: 'slots', label: 'Blade slots', value: c.total },
            { key: 'use', label: 'In use today', value: c.allocated },
            { key: 'free', label: 'Free today', value: c.available, bad: c.available <= 0 },
            {
                key: 'pwr',
                label: 'Power today',
                value: c.powerCap ? `${Number(c.powerCommitted).toFixed(1)} / ${Number(c.powerCap).toFixed(0)} kW` : '--',
                bad: c.powerCap && head < 0
            }
        ].map((s) => ({ ...s, cls: s.bad ? 'cq-stat cq-bad' : 'cq-stat' }));
    }
    get conflicts() {
        return (this.data && this.data.conflicts) || [];
    }
    get hasConflicts() {
        return this.conflicts.length > 0;
    }
    holdRows(list) {
        return (list || []).map((h) => ({
            ...h,
            holdUrl: `/${h.id}`,
            when: inDaysLabel(h.inDays, h.overdue),
            whenClass: h.overdue ? 'slds-text-color_error' : '',
            woLabel: h.workOrderNumber ? `${h.workOrderNumber} (${h.workOrderStatus})` : 'None yet'
        }));
    }
    get starting() {
        return this.holdRows(this.data && this.data.starting);
    }
    get ending() {
        return this.holdRows(this.data && this.data.ending);
    }
    get workOrders() {
        return ((this.data && this.data.workOrders) || []).map((w) => ({
            ...w,
            woUrl: `/${w.id}`,
            plannedClass: w.overdue ? 'slds-text-color_error' : ''
        }));
    }
    get hasStarting() {
        return this.starting.length > 0;
    }
    get hasEnding() {
        return this.ending.length > 0;
    }
    get hasWorkOrders() {
        return this.workOrders.length > 0;
    }
    get startingHeading() {
        return `Starting in the next ${this.horizon} days · provision (${this.starting.length})`;
    }
    get endingHeading() {
        return `Ending in the next ${this.horizon} days · decommission (${this.ending.length})`;
    }
    get woHeading() {
        return `Open capacity work orders (${this.workOrders.length})`;
    }
    get conflictHeading() {
        return `Conflicts in the next 30 days (${this.conflicts.length})`;
    }

    // ── handlers ────────────────────────────────────────────────────────
    handleHorizon(event) {
        this.horizon = Number(event.currentTarget.dataset.value);
        this.load();
    }
    handleRefresh() {
        this.load();
    }
    handleColo(event) {
        this.coloId = event.detail.value;
        this.load();
    }
    handleChangeColo() {
        this.coloId = undefined;
        this.load();
    }

    navigate(recordId, objectApiName) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId, objectApiName, actionName: 'view' }
        });
    }

    handleTower(event) {
        this.navigate(event.currentTarget.dataset.id, 'Asset');
    }

    async handleStartingAction(event) {
        await this.holdAction(event, 'Provision');
    }
    async handleEndingAction(event) {
        await this.holdAction(event, 'Decommission');
    }
    async holdAction(event, jobType) {
        const { name } = event.detail.action;
        const row = event.detail.row;
        if (name === 'openwo') this.navigate(row.workOrderId, 'WorkOrder');
        else if (name === 'openhold') this.navigate(row.id, 'Capacity_Reservation__c');
        else if (name === 'create') await this.run(() => createWorkOrder({ holdId: row.id, jobType }));
    }
    async handleWoAction(event) {
        const { name } = event.detail.action;
        const row = event.detail.row;
        if (name === 'openwo') this.navigate(row.id, 'WorkOrder');
        else if (name === 'complete') await this.run(() => completeWorkOrder({ workOrderId: row.id }));
    }

    async run(fn) {
        this.busy = true;
        try {
            const res = JSON.parse(await fn());
            this.dispatchEvent(
                new ShowToastEvent({
                    title: res.success ? 'Done' : 'Not done',
                    message: res.message,
                    variant: res.success ? 'success' : 'warning'
                })
            );
            await this.load();
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Action failed', message: errorMessage(e), variant: 'error' }));
        } finally {
            this.busy = false;
        }
    }

    get showChangeColo() {
        return !!this.data && !this.recordId;
    }
}
