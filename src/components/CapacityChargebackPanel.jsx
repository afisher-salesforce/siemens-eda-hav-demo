import React, { useState } from 'react';
import { Receipt } from 'lucide-react';
import { getCapacityChargeback } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import { isoDay, fmtDay, money } from './capacityDates';

function monthRange(offset) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: isoDay(start), end: isoDay(end) };
}

/** Capacity-based chargeback: blade-days held (in use + reserved) x daily rate, per customer and colo. */
export default function CapacityChargebackPanel({ refreshToken = 0 }) {
  const [period, setPeriod] = useState(monthRange(0));
  const [customer, setCustomer] = useState('');

  const { data, loading, error } = useSalesforceData(
    () => getCapacityChargeback({ start: period.start, end: period.end, customer }),
    [period.start, period.end, customer, refreshToken],
  );
  const lines = data || [];
  const totalDays = lines.reduce((s, l) => s + Number(l.bladeDays || 0), 0);
  const totalAmt = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
  const colos = [...new Set(lines.flatMap((l) => Object.keys(l.bladeDaysByColo || {})))].sort();

  return (
    <div className="section-card">
      <div className="section-card-header flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Receipt size={14} className="text-siemens-accent" />
          <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
            Capacity chargeback · {fmtDay(period.start)} – {fmtDay(period.end, { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[['This month', 0], ['Next month', 1]].map(([label, off]) => (
            <button
              key={label}
              type="button"
              onClick={() => setPeriod(monthRange(off))}
              className={`filter-tab ${period.start === monthRange(off).start ? 'filter-tab-active' : ''}`}
            >
              {label}
            </button>
          ))}
          <input
            type="date"
            value={period.start}
            onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
            className="text-sm border border-surface-border rounded-md px-2 py-1.5 bg-surface-card text-th-secondary"
          />
          <input
            type="date"
            value={period.end}
            onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
            className="text-sm border border-surface-border rounded-md px-2 py-1.5 bg-surface-card text-th-secondary"
          />
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Filter customer"
            className="text-sm border border-surface-border rounded-md px-2 py-1.5 bg-surface-card text-th-secondary w-40"
          />
        </div>
      </div>
      <div className="section-card-body space-y-3">
        <p className="text-xs text-th-muted">
          Basis: blade-days held (in use + reserved) × each reservation’s daily rate per blade. Pipeline demand is never charged.
        </p>
        {error && <div className="text-sm text-red-500">Could not load chargeback: {error}</div>}
        {loading && !data && <div className="skeleton h-24 w-full" />}
        {data && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th className="text-right">Blade-days</th>
                <th className="text-right">Chargeback</th>
                {colos.map((c) => (
                  <th key={c} className="text-right">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.customer}>
                  <td className="font-medium text-th-secondary">{l.customer}</td>
                  <td className="text-right font-mono">{Number(l.bladeDays).toFixed(0)}</td>
                  <td className="text-right font-mono font-semibold">{money(l.amount)}</td>
                  {colos.map((c) => (
                    <td key={c} className="text-right font-mono text-th-muted">
                      {l.bladeDaysByColo?.[c] ? Number(l.bladeDaysByColo[c]).toFixed(0) : '–'}
                    </td>
                  ))}
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={3 + colos.length} className="text-center text-th-faint py-8">No capacity held in this period.</td>
                </tr>
              )}
              {lines.length > 0 && (
                <tr className="font-semibold">
                  <td className="text-th-primary">Total</td>
                  <td className="text-right font-mono">{totalDays.toFixed(0)}</td>
                  <td className="text-right font-mono">{money(totalAmt)}</td>
                  {colos.map((c) => <td key={c} />)}
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
