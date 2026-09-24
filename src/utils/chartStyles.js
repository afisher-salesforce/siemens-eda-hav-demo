/**
 * Theme-aware chart styles using CSS variables.
 * These resolve automatically based on the .dark class on <html>.
 */

export const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid var(--surface-border)',
  backgroundColor: 'var(--tooltip-bg)',
  fontSize: '12px',
  color: 'var(--tooltip-text)',
};

// Common Recharts axis/grid colors that reference CSS variables
export const CHART_GRID_COLOR = 'var(--surface-border)';
export const CHART_AXIS_COLOR = 'var(--surface-border)';
export const CHART_TICK_COLOR = 'var(--text-faint)';
export const CHART_LABEL_COLOR = 'var(--text-muted)';
