import React, { useMemo, useState } from 'react';
import {
  Package,
  AlertTriangle,
  Search,
  MapPin,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';
import { getAssets } from '../api/salesforce';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';
import { useSalesforceData } from '../hooks/useSalesforceData';

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

export default function SpareInventory() {
  const { data, loading, error, refetch } = useSalesforceData(getAssets);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');

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

  const filtered = useMemo(() => {
    let result = inventory;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term) ||
          item.location.toLowerCase().includes(term)
      );
    }
    result.sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name);
      if (sortField === 'location') return a.location.localeCompare(b.location);
      if (sortField === 'stock') return b.stock - a.stock;
      if (sortField === 'available') return a.available - b.available;
      return 0;
    });
    return result;
  }, [inventory, searchTerm, sortField]);

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card">
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">
            Total Parts in Stock
          </span>
          <div className="text-2xl font-bold text-th-primary mt-1">{totalParts.toLocaleString()}</div>
          <div className="text-xs text-th-muted">{SPARE_TYPES.length} part types</div>
        </div>
        <div className="metric-card">
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">
            Below Minimum
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-2">
            {belowMinCount}
            {belowMinCount > 0 && <AlertTriangle size={16} />}
          </div>
          <div className="text-xs text-th-muted">items need reorder</div>
        </div>
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
        <span className="text-xs text-th-muted ml-auto">
          {filtered.length} items
        </span>
      </div>

      {/* Inventory Table */}
      <div className="section-card">
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
                      No spare parts match the current search
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
