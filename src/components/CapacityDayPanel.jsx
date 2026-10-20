import React, { useEffect, useState } from 'react';
import { CalendarDays, X, AlertTriangle, ArrowRightLeft, Ban, CalendarPlus, ExternalLink, Loader2 } from 'lucide-react';
import { getCapacityDay, getCapacityMoveOptions, moveCapacityHold, planCapacityMove, releaseCapacityHold } from '../api/salesforce';
import { useOrgUrl, salesforceRecordUrl } from './SalesforceLink';
import { parseDay, fmtDay, isoDay, addDays } from './capacityDates';

/**
 * Day detail for one node on one date (same data and rules as the Salesforce
 * havDailyCapacity component): totals, which towers conflict and by how much,
 * every hold, and the actions to fix a conflict — move a hold to a tower with
 * room, or release it. Moves are re-checked on the server, ignoring the hold
 * itself, so nothing can be double-booked.
 */
export default function CapacityDayPanel({ node, day, refreshToken = 0, onClose, onChanged, onReserveHere }) {
  const orgUrl = useOrgUrl();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [moveFor, setMoveFor] = useState(null);
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [moveDate, setMoveDate] = useState(null);
  const planMode = moveFor && moveFor.status === 'Allocated';

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getCapacityDay({ node, day })
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [node, day, refreshToken]);

  useEffect(() => {
    setMoveFor(null);
    setOptions(null);
    setMessage(null);
  }, [node, day]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const c = detail?.cell || {};
  const stats = [
    ['Slots', c.total],
    ['In use', c.allocated],
    ['Reserved', c.reserved],
    ['Free', c.available, c.available <= 0 ? 'bad' : ''],
    ['Pipeline', c.pipeline, c.available - c.pipeline < 0 ? 'short' : ''],
    ['Power', c.powerCap ? `${Number(c.powerCommitted).toFixed(1)} / ${Number(c.powerCap).toFixed(0)} kW` : '--', c.powerConflict ? 'bad' : ''],
  ];

  const loadOptions = async (h, from) => {
    setOptions(null);
    try {
      setOptions(await getCapacityMoveOptions(h.id, from));
    } catch (e) {
      setMessage({ ok: false, text: e.message });
      setOptions([]);
    }
  };

  // Reserved holds move now (paperwork). Allocated (in-use) holds are physical:
  // plan the move on a date, which creates a Move work order.
  const startMove = async (h) => {
    setMoveFor(h);
    const clicked = parseDay(day);
    const from = h.status === 'Allocated' ? isoDay(clicked > today ? clicked : addDays(today, 7)) : null;
    setMoveDate(from);
    await loadOptions(h, from);
  };

  const changeMoveDate = async (value) => {
    setMoveDate(value);
    if (moveFor) await loadOptions(moveFor, value);
  };

  const run = async (fn) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fn();
      setMessage({ ok: true, text: res?.message || 'Done.' });
      setMoveFor(null);
      if (onChanged) onChanged();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const release = (h) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Release ${h.name} (${h.customer || 'no customer'}, ${h.blades} blade(s) on ${h.tower})? It stops holding capacity and is no longer charged.`)) return;
    run(() => releaseCapacityHold(h.id));
  };

  return (
    <div className="section-card">
      <div className="section-card-header">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-siemens-accent" />
          <h2 className="text-sm font-semibold text-th-primary">
            {detail?.label || '…'} — {fmtDay(day, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReserveHere}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-siemens-teal/40 text-siemens-accent hover:bg-siemens-teal/10"
          >
            <CalendarPlus size={13} /> Reserve capacity here
          </button>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--overlay-hover)]" title="Close day detail">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="section-card-body space-y-4">
        {error && <div className="text-sm text-red-500">Could not load the day: {error}</div>}
        {loading && !detail && <div className="skeleton h-24 w-full" />}
        {message && (
          <div className={`text-sm rounded-md px-3 py-2 ${message.ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
            {message.text}
          </div>
        )}

        {detail && (
          <>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {stats.map(([label, value, flag]) => (
                <div
                  key={label}
                  className={`rounded-md border px-3 py-2 ${
                    flag === 'bad' ? 'border-red-400 bg-red-500/5' : flag === 'short' ? 'border-violet-400 bg-violet-500/5' : 'border-surface-border'
                  }`}
                >
                  <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">{label}</div>
                  <div className="text-base font-bold text-th-primary">{value ?? '--'}</div>
                </div>
              ))}
            </div>

            {detail.conflicts?.length > 0 && (
              <div className="rounded-md border-l-4 border-red-500 bg-red-500/5 px-3 py-2 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600">
                  <AlertTriangle size={13} /> Conflicts this day
                </div>
                {detail.conflicts.map((cf) => (
                  <p key={cf.towerKey} className="text-sm text-th-secondary">{cf.summary}</p>
                ))}
                <p className="text-[11px] text-th-muted">Move a hold to a tower with room, or release it.</p>
              </div>
            )}

            {detail.holds?.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hold</th>
                    <th>Status</th>
                    <th>Customer</th>
                    <th>Job / project</th>
                    <th>Tower</th>
                    <th className="text-right">Blades</th>
                    <th className="text-right">kW</th>
                    <th>Window</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {detail.holds.map((h) => {
                    const canMove = h.holdsCapacity && parseDay(h.endDate) >= today;
                    const url = salesforceRecordUrl(orgUrl, h.id);
                    return (
                      <tr key={h.id} className={moveFor?.id === h.id ? 'bg-blue-500/5' : ''}>
                        <td className="font-medium text-th-secondary">
                          {url ? (
                            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-siemens-accent hover:underline">
                              {h.name} <ExternalLink size={11} />
                            </a>
                          ) : (
                            h.name
                          )}
                        </td>
                        <td>{h.status}</td>
                        <td className="text-th-muted">{h.customer || '–'}</td>
                        <td className="text-th-muted">{h.job || '–'}</td>
                        <td className="text-th-muted">{h.tower}</td>
                        <td className="text-right font-mono">{h.blades}</td>
                        <td className="text-right font-mono">{h.kw ?? '–'}</td>
                        <td className="text-th-muted whitespace-nowrap">{fmtDay(h.startDate)} → {fmtDay(h.endDate)}</td>
                        <td className="text-right whitespace-nowrap">
                          {canMove && (
                            <button
                              type="button"
                              onClick={() => startMove(h)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-surface-border hover:border-siemens-teal/40 mr-1"
                            >
                              <ArrowRightLeft size={12} /> {h.status === 'Allocated' ? 'Plan move' : 'Move'}
                            </button>
                          )}
                          {h.status !== 'Released' && (
                            <button
                              type="button"
                              onClick={() => release(h)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-surface-border hover:border-red-400 text-red-500"
                            >
                              <Ban size={12} /> Release
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-th-faint">No holds on this day.</p>
            )}

            {moveFor && (
              <div className="rounded-md border-l-4 border-blue-500 bg-blue-500/5 px-3 py-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-th-primary">
                    {planMode ? 'Plan the move of in-use hold' : 'Move'} {moveFor.name} ({moveFor.customer || 'no customer'}, {moveFor.blades} blade(s), {moveFor.kw || 0} kW) from {moveFor.tower}
                  </span>
                  <button type="button" onClick={() => setMoveFor(null)} className="text-xs text-th-muted hover:underline">
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] text-th-muted">
                  {planMode
                    ? 'In use: the blades physically move on the date below. The target tower is booked from that date, this tower is freed from then, and a Move work order goes to the colo team.'
                    : 'Reserved: nothing is installed yet, so the hold moves now.'}
                </p>
                {planMode && (
                  <label className="inline-flex items-center gap-2 text-xs text-th-secondary">
                    Move date
                    <input
                      type="date"
                      value={moveDate || ''}
                      onChange={(e) => changeMoveDate(e.target.value)}
                      className="border border-surface-border rounded-md px-2 py-1 bg-surface-card"
                    />
                  </label>
                )}
                {options === null && (
                  <p className="text-xs text-th-muted flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Checking every tower for the rest of this hold…
                  </p>
                )}
                {options && options.length === 0 && (
                  <p className="text-sm text-red-500">
                    No other tower can hold this for the rest of its window. Release it, shorten it, or add capacity.
                  </p>
                )}
                {options &&
                  options.map((o) => (
                    <div key={o.towerKey} className="flex items-center justify-between border-b border-surface-border py-1.5">
                      <div>
                        <div className="text-sm text-th-secondary">
                          {o.towerName} · {o.colo} · {o.row}
                          {o.region ? ` · ${o.region}` : ''}
                        </div>
                        <div className="text-[11px] text-th-muted">
                          at least {o.minFreeSlots} slot(s) and {Number(o.minFreePowerKw).toFixed(1)} kW free for the rest of the hold
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          run(() =>
                            planMode
                              ? planCapacityMove(moveFor.id, o.towerKey.split(':')[1], moveDate)
                              : moveCapacityHold(moveFor.id, o.towerKey.split(':')[1]),
                          )
                        }
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-siemens-teal text-white hover:opacity-90"
                      >
                        {planMode ? 'Plan move here' : 'Move here'}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
