/** Date helpers for the daily capacity views. Apex serializes Dates as "YYYY-MM-DD". */

/** "2026-10-19" -> local Date (no timezone shift). */
export function parseDay(day) {
  if (!day) return null;
  const [y, m, d] = String(day).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDay(day, opts = { month: 'short', day: 'numeric' }) {
  const d = parseDay(day);
  return d ? d.toLocaleDateString('en-US', opts) : '--';
}

/** Local Date -> "YYYY-MM-DD". */
export function isoDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

export function money(v) {
  const n = Number(v) || 0;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
