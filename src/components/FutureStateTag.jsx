import React from 'react';
import { FlaskConical } from 'lucide-react';

/**
 * FutureStateTag — a small, consistent "illustrative / future-state" marker.
 *
 * Use this on any surface that presents a capability or data breakdown that
 * does NOT yet exist in the customer's current systems, so the demo does not
 * assert future-state precision as present-day reality. (E.g. contract-
 * manufacturer parts vs. labor split when the vendor bills against a blanket
 * PO, or BOM-match rates that depend on a data model not yet in place.)
 *
 * Two forms:
 *   <FutureStateTag />                     → chip with default "Illustrative" label
 *   <FutureStateTag label="Future State" note="Requires structured PO..." />
 */
export default function FutureStateTag({
  label = 'Illustrative',
  note,
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider
        text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/25
        rounded-full px-2 py-0.5 whitespace-nowrap ${className}`}
      title={note || 'Illustrative / future-state — not sourced from a current system of record'}
    >
      <FlaskConical size={9} className="shrink-0" />
      {label}
    </span>
  );
}
