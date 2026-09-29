import React, { useMemo, useState, useContext } from 'react';
import {
  Package,
  AlertTriangle,
  Search,
  MapPin,
  ArrowUpDown,
  CheckCircle2,
  MessageSquare,
  Bot,
  X,
} from 'lucide-react';
import { getAssets } from '../api/salesforce';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';
import { useSalesforceData } from '../hooks/useSalesforceData';
import { AgentChatContext } from './Layout';
import FutureStateTag from './FutureStateTag';

// Simulated spare parts derived from asset data
const SPARE_TYPES = [
  { name: 'Strato Blade — Spare/Replacement', sku: 'VEL-STRATO-SPR', minStock: 4, unitCost: 180000 },
  { name: 'Power Supply Module — Strato', sku: 'VEL-PSU-STRATO', minStock: 8, unitCost: 12000 },
  { name: 'Memory Module — 256GB DDR5', sku: 'VEL-MEM-256', minStock: 12, unitCost: 2400 },
  { name: 'Network Interface Card — 100GbE', sku: 'VEL-NIC-100G', minStock: 6, unitCost: 4800 },
  { name: 'Cooling Fan Assembly — Strato', sku: 'VEL-FAN-STRATO', minStock: 10, unitCost: 850 },
  { name: 'SSD Module — 2TB NVMe', sku: 'VEL-SSD-2TB', minStock: 8, unitCost: 3200 },
  { name: 'Cable Kit — Interconnect Bundle', sku: 'VEL-CBL-KIT', minStock: 15, unitCost: 420 },
  { name: 'FPGA Daughter Card — proFPGA', sku: 'VEL-FPGA-DC', minStock: 3, unitCost: 45000 },
];

// Illustrative / future-state note for the background auto-replenish agent. Mirrors the
// roadmap framing in Vignette7 — the reorder signal is live today; autonomous par-level
// replenishment and vendor outreach build on the existing spare-pool, telemetry, and
// work-order data already in the platform.
const REPLENISH_NOTE =
  'Illustrative future state. The below-minimum reorder signal is live on this page today. ' +
  'Autonomous par-level replenishment and third-party vendor outreach (Slack Connect / PagerDuty) ' +
  'build on the same live spare-pool, telemetry, and work-order data already in the platform.';

export default function SpareInventory() {
  const { data, loading, error, refetch } = useSalesforceData(getAssets);
  const openAgentWithPrompt = useContext(AgentChatContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'low' | 'ok'
  const [locationFilter, setLocationFilter] = useState('all'); // 'all' | <location>

  // Generate spare inventory per location from asset data
  const inventory = useMemo(() => {
    if (!data) return [];

    const locations = [...new Set(data.map((a) => a.location).filter(Boolean))];
    const items = [];

    locations.forEach((location) => {
      SPARE_TYPES.forEach((spare) => {
        // Deterministic stock based on hash of location + spare name
        const hash = (location + spare.sku).split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
        const stock = Math.abs(hash % 20) + 1;
        const reserved = Math.abs((hash >> 4) % (stock + 1));
        const available = stock - reserved;

        items.push({
          ...spare,
          location,
          stock,
          reserved,
          available,
          belowMin: available < spare.minStock,
          totalValue: stock * spare.unitCost,
        });
      });
    });

    return items;
  }, [data]);

  const locationOptions = useMemo(
    () => [...new Set(inventory.map((i) => i.location))].sort(),
    [inventory]
  );

  const filtered = useMemo(() => {
    let result = inventory;
    if (statusFilter === 'low') result = result.filter((item) => item.belowMin);
    else if (statusFilter === 'ok') result = result.filter((item) => !item.belowMin);
    if (locationFilter !== 'all') result = result.filter((item) => item.location === locationFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term) ||
          item.location.toLowerCase().includes(term)
      );
    }
    result = [...result].sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name);
      if (sortField === 'location') return a.location.localeCompare(b.location);
      if (sortField === 'stock') return b.stock - a.stock;
      if (sortField === 'available') return a.available - b.available;
      return 0;
    });
    return result;
  }, [inventory, searchTerm, sortField, statusFilter, locationFilter]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-th-secondary mb-2">Unable to Load Inventory</h3>
        <p className="text-sm text-th-muted max-w-md mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton w-48 h-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="metric-card">
              <div className="skeleton w-20 h-8 mb-2" />
              <div className="skeleton w-28 h-4" />
            </div>
          ))}
        </div>
        <div className="skeleton w-full h-80" />
      </div>
    );
  }

  // Summary
  const totalParts = inventory.reduce((s, i) => s + i.stock, 0);
  const belowMinCount = inventory.filter((i) => i.belowMin).length;
  const totalInventoryValue = inventory.reduce((s, i) => s + i.totalValue, 0);
  const locations = [...new Set(inventory.map((i) => i.location))];
  const lowStockItems = inventory.filter((i) => i.belowMin);
  const filtersActive = statusFilter !== 'all' || locationFilter !== 'all' || searchTerm !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setLocationFilter('all');
    setSearchTerm('');
  };

  const askAgentToReorder = () => {
    if (!openAgentWithPrompt) return;
    const rows = lowStockItems.length
      ? lowStockItems
          .map(
            (i) =>
              `- ${i.name} (${i.sku}) @ ${i.location} — available ${i.available}, min ${i.minStock}, ` +
              `${Math.max(0, i.minStock - i.available)} below par, unit cost $${i.unitCost.toLocaleString()}`
          )
          .join('\n')
      : '- None — every part is at or above minimum stock.';
    openAgentWithPrompt(
      'hav',
      `These spare parts are below minimum stock across HAV colo facilities:\n${rows}\n\n` +
        `Recommend a prioritized reorder plan: which parts to reorder first, the quantity needed to ` +
        `bring each back to par (min stock), the estimated reorder cost, and any single-facility ` +
        `supply risk. Work from the list above — do not look them up.`
    );
  };

  return (
    <div className="space-y-6">
      <DemoContextPanel {...CONTEXT.spares} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-th-primary">Spare Parts Inventory</h1>
            <p className="text-xs text-th-muted">
              Spare parts stock across {locations.length} colocation facilities
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Replenish Agent status strip (illustrative / future state) */}
      <div className="metric-card flex flex-wrap items-center gap-x-4 gap-y-2 border-siemens-teal/30">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-siemens-teal/10 text-siemens-accent">
            <Bot size={16} />
          </span>
          <span className="text-sm font-semibold text-th-secondary">Auto-Replenish Agent</span>
          <FutureStateTag label="Illustrative" note={REPLENISH_NOTE} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-th-muted sm:ml-auto">
          <span>
            Monitoring <span className="text-th-secondary font-semibold">{locations.length}</span>{' '}
            facilities
          </span>
          <span className="text-th-faint">·</span>
          <span>
            <span className="text-amber-400 font-semibold">{belowMinCount}</span> items below par
          </span>
          <span className="text-th-faint">·</span>
          <span>
            <span className="text-siemens-accent font-semibold">{lowStockItems.length}</span>{' '}
            reorders drafted
          </span>
        </div>
      </div>

      {/* Summary Cards — clickable filter chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          aria-pressed={statusFilter === 'all'}
          className={`metric-card text-left transition-shadow ${
            statusFilter === 'all' ? 'ring-2 ring-siemens-teal/40' : 'hover:ring-1 hover:ring-surface-border'
          }`}
        >
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">
            Total Parts in Stock
          </span>
          <div className="text-2xl font-bold text-th-primary mt-1">{totalParts.toLocaleString()}</div>
          <div className="text-xs text-th-muted">
            {SPARE_TYPES.length} part types · click to show all
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter((s) => (s === 'low' ? 'all' : 'low'))}
          aria-pressed={statusFilter === 'low'}
          className={`metric-card text-left transition-shadow ${
            statusFilter === 'low' ? 'ring-2 ring-siemens-teal/40' : 'hover:ring-1 hover:ring-surface-border'
          }`}
        >
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">
            Below Minimum
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-2">
            {belowMinCount}
            {belowMinCount > 0 && <AlertTriangle size={16} />}
          </div>
          <div className="text-xs text-th-muted">
            {statusFilter === 'low' ? 'showing low stock — click to clear' : 'items need reorder · click to filter'}
          </div>
        </button>
        <div className="metric-card">
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">
            Inventory Value
          </span>
          <div className="text-2xl font-bold text-th-primary mt-1">
            ${(totalInventoryValue / 1000000).toFixed(1)}M
          </div>
          <div className="text-xs text-th-muted">total replacement cost</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
          <input
            type="text"
            placeholder="Search spare parts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-th-faint"
          />
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-th-muted" />
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
          >
            <option value="all">All Locations</option>
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-th-muted" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
          >
            <option value="name">Sort by Name</option>
            <option value="location">Sort by Location</option>
            <option value="stock">Sort by Stock (High)</option>
            <option value="available">Sort by Available (Low)</option>
          </select>
        </div>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-th-muted hover:text-siemens-accent transition-colors"
          >
            <X size={12} />
            Clear filters
          </button>
        )}
        <span className="text-xs text-th-muted ml-auto">
          {filtered.length} items
        </span>
      </div>

      {/* Inventory Table */}
      <div className="section-card">
        <div className="section-card-header flex items-center justify-between">
          <h2 className="text-sm font-semibold text-th-secondary flex items-center gap-2">
            <Package size={14} className="text-siemens-accent" />
            Spare Parts by Facility
          </h2>
          {openAgentWithPrompt && (
            <button
              onClick={askAgentToReorder}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-siemens-accent border border-siemens-teal/30 hover:bg-siemens-teal/10 transition-colors"
              title="Ask the HAV agent to recommend a prioritized reorder plan for the low-stock parts"
            >
              <MessageSquare size={12} />
              Recommend reorders
            </button>
          )}
        </div>
        <div className="section-card-body p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Part Name</th>
                  <th>SKU</th>
                  <th>Location</th>
                  <th>In Stock</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Min Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((item, i) => (
                    <tr key={i}>
                      <td className="font-medium text-th-secondary whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="text-th-muted font-mono text-xs">{item.sku}</td>
                      <td className="text-th-muted whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {item.location}
                        </span>
                      </td>
                      <td className="text-th-secondary font-mono text-center">{item.stock}</td>
                      <td className="text-amber-400 font-mono text-center">{item.reserved}</td>
                      <td
                        className={`font-mono text-center font-semibold ${
                          item.belowMin ? 'text-orange-400' : 'text-emerald-400'
                        }`}
                      >
                        {item.available}
                        {item.belowMin && <AlertTriangle size={10} className="inline ml-1 text-orange-400" />}
                      </td>
                      <td className="text-th-muted font-mono text-center">{item.minStock}</td>
                      <td>
                        {item.belowMin ? (
                          <span className="badge badge-red">Low Stock</span>
                        ) : (
                          <span className="badge badge-green">OK</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-th-faint">
                      No spare parts match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
