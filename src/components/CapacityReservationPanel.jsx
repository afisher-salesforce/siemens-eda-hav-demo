import React, { useEffect, useState } from 'react';
import { CalendarPlus, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { checkCapacityEligibility, getCapacityCustomers, reserveCapacity } from '../api/salesforce';
import { addDays, fmtDay, isoDay } from './capacityDates';

/** Veloce Strato list price per unit per month / 30 — same basis as HAV_RevenueModel. */
const DEFAULT_DAILY_RATE = 6666.67;

const inputCls =
  'w-full text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50';

/**
 * Reservation flow: describe the job → check eligibility (capacity AND power on
 * every day) → reserve on an eligible tower. The server re-checks eligibility on
 * submit, so a stale screen can never double-book.
 */
export default function CapacityReservationPanel({ scopeKey = 'fleet', scopeLabel = 'All colos', initialStart, onReserved }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(() => ({
    accountName: '',
    jobName: '',
    blades: 2,
    kw: 40,
    kwTouched: false,
    start: isoDay(addDays(new Date(), 7)),
    duration: 30,
    dailyRate: DEFAULT_DAILY_RATE,
  }));
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState(null);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    getCapacityCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  // Reset results when the scope changes
  useEffect(() => {
    setResults(null);
    setMessage(null);
  }, [scopeKey]);

  // Pre-fill the start date when opened from a clicked day
  useEffect(() => {
    if (initialStart) setForm((f) => ({ ...f, start: initialStart }));
  }, [initialStart]);

  const end = isoDay(addDays(new Date(`${form.start}T00:00:00`), Math.max(1, Number(form.duration) || 1) - 1));

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'kw') next.kwTouched = true;
      if (field === 'blades' && !f.kwTouched) next.kw = (Number(value) || 0) * 20;
      return next;
    });
    setResults(null);
  };

  const check = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const r = await checkCapacityEligibility({
        node: scopeKey,
        start: form.start,
        end,
        blades: Number(form.blades) || 1,
        kw: Number(form.kw) || 0,
      });
      setResults(r);
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setChecking(false);
    }
  };

  const reserve = async (el) => {
    setBooking(el.towerKey);
    setMessage(null);
    try {
      const res = await reserveCapacity({
        towerId: el.towerKey.split(':')[1],
        accountName: form.accountName || null,
        jobName: form.jobName || `${form.accountName || 'New'} job`,
        startDate: form.start,
        endDate: end,
        bladeCount: Number(form.blades) || 1,
        powerKw: Number(form.kw) || 0,
        dailyRate: Number(form.dailyRate) || 0,
      });
      setMessage({ ok: true, text: res?.message || 'Reserved.' });
      if (onReserved) onReserved();
      // Re-check so the list reflects the new hold
      const r = await checkCapacityEligibility({
        node: scopeKey, start: form.start, end, blades: Number(form.blades) || 1, kw: Number(form.kw) || 0,
      });
      setResults(r);
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBooking(null);
    }
  };

  const eligible = (results || []).filter((r) => r.eligible);
  const blocked = (results || []).filter((r) => !r.eligible);

  return (
    <div className="section-card">
      <div className="section-card-header">
        <div className="flex items-center gap-2">
          <CalendarPlus size={14} className="text-siemens-accent" />
          <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
            New reservation · searching {scopeLabel}
          </h2>
        </div>
        <span className="text-[10px] text-th-faint">Capacity and power must be free on every day of the window</span>
      </div>
      <div className="section-card-body space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
          <label className="col-span-2 space-y-1">
            <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Customer</span>
            <select value={form.accountName} onChange={set('accountName')} className={inputCls}>
              <option value="">— Select customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Job / project</span>
            <input value={form.jobName} onChange={set('jobName')} placeholder="e.g. SoC pre-silicon regression" className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Blades</span>
            <input type="number" min="1" value={form.blades} onChange={set('blades')} className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Power (kW)</span>
            <input type="number" min="0" value={form.kw} onChange={set('kw')} className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Rate / blade-day</span>
            <input type="number" min="0" step="0.01" value={form.dailyRate} onChange={set('dailyRate')} className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Start</span>
            <input type="date" value={form.start} onChange={set('start')} className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Days</span>
            <input type="number" min="1" value={form.duration} onChange={set('duration')} className={inputCls} />
          </label>
          <div className="col-span-2 lg:col-span-5 flex items-end justify-between gap-3">
            <span className="text-xs text-th-muted pb-2">
              {form.blades} blade(s), {form.kw} kW, {fmtDay(form.start)} → {fmtDay(end)}
            </span>
            <button
              type="button"
              onClick={check}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-siemens-teal text-white hover:opacity-90 disabled:opacity-60"
            >
              {checking ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Check eligibility
            </button>
          </div>
        </div>

        {message && (
          <div className={`text-sm rounded-md px-3 py-2 ${message.ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
            {message.text}
          </div>
        )}

        {results && (
          <div className="space-y-2">
            <div className="text-xs text-th-muted">
              <span className="font-semibold text-th-primary">{eligible.length}</span> of {results.length} tower(s) eligible
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tower</th>
                  <th>Colo / row</th>
                  <th>Min free slots</th>
                  <th>Min free power</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...eligible, ...blocked].map((el) => (
                  <tr key={el.towerKey}>
                    <td className="font-medium text-th-secondary">{el.towerName}</td>
                    <td className="text-th-muted">{el.colo} · {el.row}</td>
                    <td>{el.minFreeSlots}</td>
                    <td>{Number(el.minFreePowerKw).toFixed(1)} kW</td>
                    <td>
                      {el.eligible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 size={13} /> Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs">
                          <XCircle size={13} /> Blocked from {fmtDay(el.firstBlockedDate)} by {el.blockedReason}
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {el.eligible && (
                        <button
                          type="button"
                          onClick={() => reserve(el)}
                          disabled={booking != null}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-siemens-teal/40 text-siemens-accent hover:bg-siemens-teal/10 disabled:opacity-50"
                        >
                          {booking === el.towerKey ? <Loader2 size={12} className="animate-spin" /> : null} Reserve here
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
