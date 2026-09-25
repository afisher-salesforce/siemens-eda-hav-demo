import React from 'react';

/**
 * Shared Recharts tooltip that ALWAYS shows a category name (title) plus,
 * for every series, its name and formatted value. Used across every chart so
 * hovering any element reveals both "what" and "how much".
 *
 * Recharts injects { active, payload, label } into a `content` element:
 *  - bar / line / area charts: the category is `label` (the axis value).
 *  - pie charts: there is no `label`; the category is `payload[0].name` and
 *    the slice datum is `payload[0].payload`.
 *
 * Each chart formats values differently (currency, %, plain count), so pass a
 * per-chart `valueFormatter`. Use the `renderChartTooltip` factory below.
 */
export function CustomChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => (v == null ? '--' : String(v)),
  labelFormatter,      // (label) => string — prettify the title (e.g. a timestamp)
  labelForName,        // (name|dataKey) => string — prettify a series name
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Title: axis label for cartesian charts; slice name for pies.
  let title = label != null && label !== '' ? label : payload[0]?.name;
  if (labelFormatter && title != null) title = labelFormatter(title);

  const prettyName = (entry) => {
    const raw = entry.name != null && entry.name !== '' ? entry.name : entry.dataKey;
    return labelForName ? labelForName(raw) : raw;
  };

  return (
    <div
      style={{
        borderRadius: '8px',
        border: '1px solid var(--surface-border)',
        backgroundColor: 'var(--tooltip-bg)',
        color: 'var(--tooltip-text)',
        fontSize: '12px',
        padding: '8px 10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}
    >
      {title != null && title !== '' && (
        <div style={{ fontWeight: 600, marginBottom: payload.length ? 4 : 0 }}>
          {title}
        </div>
      )}
      {payload.map((entry, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.6 }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: entry.color || entry.payload?.fill || 'var(--tooltip-text)',
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--text-muted)' }}>{prettyName(entry)}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600, paddingLeft: 12 }}>
            {valueFormatter(entry.value, entry)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Factory: returns a `content` element for <Tooltip content={...} /> that carries
 * per-chart options.
 *   <Tooltip content={renderChartTooltip({ valueFormatter: formatCurrency })} />
 */
export function renderChartTooltip(opts = {}) {
  return (props) => <CustomChartTooltip {...props} {...opts} />;
}

export default CustomChartTooltip;
