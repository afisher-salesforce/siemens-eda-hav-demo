/**
 * Derive Slack channel name from a record type and identifier.
 *
 * Convention:
 *   Asset  "PF-BLR1-002"  → "hav-asset-pf-blr1-002"
 *   Work Order "WO-0045"  → "hav-wo-wo-0045"
 *   Order "SA-00008"       → "hav-order-sa-00008"
 *
 * Slack channel names must be lowercase, max 80 chars,
 * only letters, numbers, hyphens.
 */
export function getSlackChannelName(recordType, recordIdentifier) {
  if (!recordIdentifier) return null;

  const prefix = {
    asset: 'hav-asset',
    workorder: 'hav-wo',
    order: 'hav-order',
    compliance: 'hav-compliance',
  }[recordType] || 'hav';

  // Sanitize: lowercase, replace non-alphanum (except hyphens) with hyphens, collapse
  const slug = recordIdentifier
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${prefix}-${slug}`.slice(0, 80);
}
