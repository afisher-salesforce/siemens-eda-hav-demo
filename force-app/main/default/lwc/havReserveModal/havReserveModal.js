import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import checkEligibility from '@salesforce/apex/HAV_CapacityGridController.checkEligibility';
import reserve from '@salesforce/apex/HAV_CapacityGridController.reserve';
import getCustomers from '@salesforce/apex/HAV_CapacityGridController.getCustomers';

/** Veloce Strato list price per unit per month / 30, the same basis as HAV_RevenueModel. */
const DEFAULT_DAILY_RATE = 6666.67;

function isoDay(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDaysIso(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    return isoDay(dt);
}
function errorMessage(e) {
    return (e && e.body && e.body.message) || (e && e.message) || 'Unknown error';
}

/**
 * Reserve capacity: describe the job, check which towers under the chosen node
 * can hold it (capacity AND power on every day), and book one. The server
 * re-checks eligibility on submit, so a stale screen can't double-book.
 */
export default class HavReserveModal extends LightningModal {
    @api nodeKey = 'fleet';
    @api nodeLabel = 'All colos';
    @api startDate;

    customerOptions = [];
    accountId = '';
    jobName = '';
    blades = 2;
    kw = 40;
    kwTouched = false;
    start;
    days = 30;
    dailyRate = DEFAULT_DAILY_RATE;
    results;
    message;
    messageClass = 'slds-text-color_error';
    checking = false;
    booking = false;

    connectedCallback() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 7);
        this.start = this.startDate || isoDay(tomorrow);
        getCustomers()
            .then((rows) => {
                this.customerOptions = [{ label: '— None —', value: '' }, ...rows.map((r) => ({ label: r.name, value: r.id }))];
            })
            .catch(() => {
                this.customerOptions = [{ label: '— None —', value: '' }];
            });
    }

    get endDate() {
        return addDaysIso(this.start, Math.max(1, Number(this.days) || 1) - 1);
    }
    get summary() {
        return `${this.blades} blade(s), ${this.kw} kW, ${this.start} → ${this.endDate}, searching ${this.nodeLabel}`;
    }
    get hasResults() {
        return Array.isArray(this.results);
    }
    get eligibleCount() {
        return (this.results || []).filter((r) => r.eligible).length;
    }
    get rows() {
        return (this.results || []).map((r) => ({
            ...r,
            freeKw: Number(r.minFreePowerKw).toFixed(1),
            status: r.eligible ? 'Eligible' : `Blocked from ${r.firstBlockedDate} by ${r.blockedReason}`,
            statusClass: r.eligible ? 'slds-text-color_success' : 'slds-text-color_error',
            notEligible: !r.eligible
        }));
    }

    handleField(event) {
        const field = event.target.dataset.field;
        const value = event.detail.value;
        this[field] = value;
        if (field === 'kw') this.kwTouched = true;
        if (field === 'blades' && !this.kwTouched) this.kw = (Number(value) || 0) * 20;
        this.results = undefined;
    }

    async handleCheck() {
        this.checking = true;
        this.message = undefined;
        try {
            const json = await checkEligibility({
                nodeKey: this.nodeKey,
                startDate: this.start,
                endDate: this.endDate,
                blades: Number(this.blades) || 1,
                kw: Number(this.kw) || 0
            });
            this.results = JSON.parse(json);
        } catch (e) {
            this.message = errorMessage(e);
            this.messageClass = 'slds-text-color_error';
        } finally {
            this.checking = false;
        }
    }

    async handleReserve(event) {
        const towerKey = event.currentTarget.dataset.key;
        this.booking = true;
        try {
            const res = JSON.parse(
                await reserve({
                    towerId: towerKey.split(':')[1],
                    accountId: this.accountId || null,
                    jobName: this.jobName || 'New job',
                    startDate: this.start,
                    endDate: this.endDate,
                    blades: Number(this.blades) || 1,
                    kw: Number(this.kw) || 0,
                    dailyRate: Number(this.dailyRate) || 0
                })
            );
            if (res.success) {
                this.close({ success: true, message: res.message });
            } else {
                this.message = res.message;
                this.messageClass = 'slds-text-color_error';
                await this.handleCheck();
            }
        } catch (e) {
            this.message = errorMessage(e);
            this.messageClass = 'slds-text-color_error';
        } finally {
            this.booking = false;
        }
    }

    handleCancel() {
        this.close({ success: false });
    }
}
