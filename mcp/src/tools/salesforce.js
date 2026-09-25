import { havRequest } from '../sfClient.js';
import { assertWritesAllowed } from '../config.js';

/**
 * Salesforce HAV tools — full parity with the React app's src/api/salesforce.js.
 * Read tools return the raw Apex JSON (PascalCase); the React transforms live in
 * the app, but Claude reads the raw shape fine and it keeps this server thin.
 */
export const salesforceTools = [
  {
    name: 'hav_dashboard_summary',
    description:
      'Get the HAV operations dashboard summary: total/active emulation assets, average utilization, open work orders, critical alerts (last 24h), revenue estimate, upcoming contract renewals, loaner metrics, and per-location rack capacity. Use for "how is the fleet doing" / health-overview questions.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => havRequest('/dashboard-summary'),
  },
  {
    name: 'hav_get_orders',
    description:
      'List sales orders / sales agreements for semiconductor & technology accounts (customer, status, start/end dates, value). Use for order-management and revenue questions.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => havRequest('/orders'),
  },
  {
    name: 'hav_get_financials',
    description:
      'Get finance summary: monthly/annual revenue by product, assets by lease type, open repair costs, and contract renewals due in the next 90 days.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => havRequest('/financials'),
  },
  {
    name: 'hav_get_assets',
    description:
      'List emulation-system assets. Optional filters narrow by location, customer, or status. Returns serial numbers, product, utilization, contract end, lease type, and asset tier.',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Filter by location name' },
        customer: { type: 'string', description: 'Filter by account/customer name' },
        status: { type: 'string', description: 'Filter by asset status (e.g. Installed)' },
      },
      additionalProperties: false,
    },
    handler: (args) => havRequest('/assets', { params: args }),
  },
  {
    name: 'hav_get_asset_hierarchy',
    description:
      'Get the parent/child hierarchy (facility → rack → blade) for a specific asset, including ancestors, children, and sibling count.',
    inputSchema: {
      type: 'object',
      properties: { assetId: { type: 'string', description: 'Salesforce Asset Id' } },
      required: ['assetId'],
      additionalProperties: false,
    },
    handler: (args) => havRequest('/assets', { params: { hierarchyAssetId: args.assetId } }),
  },
  {
    name: 'hav_get_asset_lineage',
    description:
      'Get the replacement chain (predecessors and successors) for an asset, including replacement reasons and linked work orders.',
    inputSchema: {
      type: 'object',
      properties: { assetId: { type: 'string', description: 'Salesforce Asset Id' } },
      required: ['assetId'],
      additionalProperties: false,
    },
    handler: (args) => havRequest('/asset-lineage', { params: { assetId: args.assetId } }),
  },
  {
    name: 'hav_get_capacity',
    description:
      'Get data-center rack/power capacity by location: total vs. used racks, total/used power (kW), and PUE. Optionally scope to one location.',
    inputSchema: {
      type: 'object',
      properties: { locationId: { type: 'string', description: 'Optional Location Id' } },
      additionalProperties: false,
    },
    handler: (args) => havRequest('/capacity', { params: args }),
  },
  {
    name: 'hav_get_capacity_engine',
    description:
      'Get consolidated fleet data for scenario planning: facility→rack→blade hierarchy, sales agreements with expiry, active work orders, spare pool, and forecasts. Use for capacity-planning / "can we fit this order" questions.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => havRequest('/capacity-engine'),
  },
  {
    name: 'hav_get_telemetry',
    description:
      'Get emulator telemetry readings (CPU, memory, temperature, active jobs, error count, status). Optionally scope to one asset and cap the number of rows.',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: { type: 'string', description: 'Optional Asset Id' },
        limit: { type: 'integer', description: 'Max rows (default server-side)' },
      },
      additionalProperties: false,
    },
    handler: (args) => havRequest('/telemetry', { params: args }),
  },
  {
    name: 'hav_get_workorders',
    description:
      'List work orders (repairs/RMAs) for emulation systems. Optional filters by priority or status. Returns subject, status, priority, asset, customer, RMA, vendor, estimated cost.',
    inputSchema: {
      type: 'object',
      properties: {
        priority: { type: 'string', description: 'Filter by priority' },
        status: { type: 'string', description: 'Filter by status' },
      },
      additionalProperties: false,
    },
    handler: (args) => havRequest('/workorders', { params: args }),
  },
  {
    name: 'hav_get_loaners',
    description:
      'List loaner assets with conversion-opportunity data and metrics (active loans, conversions pending, expiring soon, conversion pipeline value). Use for loaner-to-purchase conversion questions.',
    inputSchema: {
      type: 'object',
      properties: { status: { type: 'string', description: 'Filter by loaner status' } },
      additionalProperties: false,
    },
    handler: (args) => havRequest('/loaners', { params: args }),
  },
  {
    name: 'hav_get_compliance',
    description:
      'Get trade-compliance data: compliance records, embargoed countries, restricted parties, ECCN classifications, flagged accounts, and summary metrics.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => havRequest('/compliance'),
  },
  {
    name: 'hav_get_manufacturer',
    description:
      'Get manufacturer/vendor portal data: work orders with parts/labor cost breakdowns and per-vendor summaries. Optional vendor filter.',
    inputSchema: {
      type: 'object',
      properties: { vendor: { type: 'string', description: 'Filter by vendor name' } },
      additionalProperties: false,
    },
    handler: (args) => havRequest('/manufacturer', { params: args }),
  },
  {
    name: 'hav_get_cases',
    description:
      'List support cases for emulation-system assets. Optionally scope to one asset.',
    inputSchema: {
      type: 'object',
      properties: { assetId: { type: 'string', description: 'Optional Asset Id' } },
      additionalProperties: false,
    },
    handler: (args) => havRequest('/cases', { params: args }),
  },
  {
    name: 'hav_search',
    description:
      'Global search across assets, work orders, and orders/agreements by keyword (serial number, name, customer, etc.). Minimum 2 characters.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search term (min 2 chars)' },
        limit: { type: 'integer', description: 'Max results per type (<= 50)' },
      },
      required: ['q'],
      additionalProperties: false,
    },
    handler: (args) => {
      if (!args.q || args.q.trim().length < 2) {
        return { assets: [], workOrders: [], orders: [], totalResults: 0 };
      }
      const params = { q: args.q.trim() };
      if (args.limit) params.limit = Math.min(args.limit, 50);
      return havRequest('/search', { params });
    },
  },

  // ─── Write tools (gated by ALLOW_WRITES) ────────────────────────────────────
  {
    name: 'hav_update_workorder',
    description:
      'Update a work order\'s status and/or priority. WRITE ACTION — disabled unless ALLOW_WRITES=true.',
    inputSchema: {
      type: 'object',
      properties: {
        workOrderId: { type: 'string', description: 'Salesforce WorkOrder Id' },
        status: { type: 'string' },
        priority: { type: 'string' },
      },
      required: ['workOrderId'],
      additionalProperties: false,
    },
    handler: (args) => {
      assertWritesAllowed('hav_update_workorder');
      const { workOrderId, ...fields } = args;
      return havRequest(`/workorders/${workOrderId}`, { method: 'PATCH', body: fields });
    },
  },
  {
    name: 'hav_create_asset_record',
    description:
      'Create a Case or WorkOrder linked to an asset. WRITE ACTION — disabled unless ALLOW_WRITES=true.',
    inputSchema: {
      type: 'object',
      properties: {
        recordType: { type: 'string', enum: ['Case', 'WorkOrder'] },
        assetId: { type: 'string' },
        subject: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string' },
      },
      required: ['recordType', 'assetId', 'subject'],
      additionalProperties: false,
    },
    handler: (args) => {
      assertWritesAllowed('hav_create_asset_record');
      return havRequest('/assets', { method: 'POST', body: args });
    },
  },
];
