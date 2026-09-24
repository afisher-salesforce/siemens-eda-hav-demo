import React, { useMemo, useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  Filter,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { getAssets, getCapacity } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

const COLORS = [
  '#009999', '#10b981', '#6366f1', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6',
];

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function TimelineBar({ start, end, color, label, total }) {
  // Calculate position within a 12-month window
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 10, 1);
  const totalMs = windowEnd - windowStart;

  const startDate = start ? new Date(start) : windowStart;
  const endDate = end ? new Date(end) : windowEnd;

  const leftPct = Math.max(0, Math.min(100, ((startDate - windowStart) / totalMs) * 100));
  const widthPct = Math.max(
    2,
    Math.min(100 - leftPct, ((endDate - startDate) / totalMs) * 100)
  );

  const days = daysUntil(end);

  return (
    <div className="relative h-7 group">
      <div
        className="absolute top-1 h-5 rounded-sm flex items-center px-1.5 overflow-hidden cursor-default transition-opacity"
        style={{
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          backgroundColor: `${color}30`,
          borderLeft: `3px solid ${color}`,
        }}
        title={`${label}: ${formatDate(start)} → ${formatDate(end)}`}
      >
        <span className="text-[9px] font-medium truncate" style={{ color }}>
          {label}
        </span>
      </div>
      {/* Expiry warning */}
      {days != null && days <= 90 && days > 0 && (
        <div
          className="absolute top-0 w-1.5 h-7 rounded-full bg-amber-500/60"
          style={{ left: `${leftPct + widthPct}%` }}
          title={`Expires in ${days} days`}
        />
      )}
    </div>
  );
}

function MonthHeaders() {
  const months = [];
  const now = new Date();
  for (let i = -2; i < 10; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(d.toLocaleDateString('en-US', { month: 'short' }));
  }
  return (
    <div className="flex justify-between px-1 mb-1">
      {months.map((m, i) => (
        <span key={i} className="text-[8px] text-th-faint uppercase tracking-wider font-medium w-[8.33%] text-center">
          {m}
        </span>
      ))}
    </div>
  );
}

export default function AllocationTimeline() {
  const { data: assets, loading: assetsLoading, error, refetch } = useSalesforceData(getAssets);
  const { data: capacityData, loading: capLoading } = useSalesforceData(getCapacity);
  const [filterLocation, setFilterLocation] = useState('');
  const [expandedLocation, setExpandedLocation] = useState(null);

  const loading = assetsLoading || capLoading;

  // Group assets by location, then by customer
  const locationAllocations = useMemo(() => {
    if (!assets) return [];

    const byLocation = {};
    assets.forEach((asset) => {
      const loc = asset.location || 'Unassigned';
      if (!byLocation[loc]) byLocation[loc] = {};
      const cust = asset.customer || 'Unallocated';
      if (!byLocation[loc][cust]) {
        byLocation[loc][cust] = {
          customer: cust,
          assets: [],
          earliestStart: null,
          latestEnd: null,
        };
      }
      byLocation[loc][cust].assets.push(asset);

      // Track date range
      if (asset.installDate) {
        const d = new Date(asset.installDate);
        if (!byLocation[loc][cust].earliestStart || d < new Date(byLocation[loc][cust].earliestStart)) {
          byLocation[loc][cust].earliestStart = asset.installDate;
        }
      }
      if (asset.contractEnd) {
        const d = new Date(asset.contractEnd);
        if (!byLocation[loc][cust].latestEnd || d > new Date(byLocation[loc][cust].latestEnd)) {
          byLocation[loc][cust].latestEnd = asset.contractEnd;
        }
      }
    });

    return Object.entries(byLocation)
      .map(([location, customers]) => ({
        location,
        customers: Object.values(customers).sort((a, b) => b.assets.length - a.assets.length),
        totalAssets: Object.values(customers).reduce((s, c) => s + c.assets.length, 0),
      }))
      .sort((a, b) => b.totalAssets - a.totalAssets);
  }, [assets]);

  const filtered = useMemo(() => {
    if (!filterLocation) return locationAllocations;
    return locationAllocations.filter((l) => l.location === filterLocation);
  }, [locationAllocations, filterLocation]);

  const locations = useMemo(
    () => locationAllocations.map((l) => l.location).sort(),
    [locationAllocations]
  );

  // Summary
  const expiringIn90 = useMemo(() => {
    if (!assets) return 0;
    return assets.filter((a) => {
      const days = daysUntil(a.contractEnd);
      return days != null && days > 0 && days <= 90;
    }).length;
  }, [assets]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-th-secondary mb-2">Unable to Load Allocations</h3>
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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton w-full h-48" />
        ))}
      </div>
    );
  }

  const uniqueCustomers = [
    ...new Set(locationAllocations.flatMap((l) => l.customers.map((c) => c.customer))),
  ].length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-th-primary">Allocation Timeline</h1>
            <p className="text-xs text-th-muted">
              Customer allocations across colocation facilities — 12-month view
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card">
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">
            Active Allocations
          </span>
          <div className="text-2xl font-bold text-th-primary mt-1">{uniqueCustomers}</div>
          <div className="text-xs text-th-muted">customers across {locations.length} sites</div>
        </div>
        <div className="metric-card">
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">
            Expiring in 90 Days
          </span>
          <div className={`text-2xl font-bold mt-1 ${expiringIn90 > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {expiringIn90}
          </div>
          <div className="text-xs text-th-muted">contracts ending soon</div>
        </div>
        <div className="metric-card">
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">
            Total Assets Allocated
          </span>
          <div className="text-2xl font-bold text-th-primary mt-1">
            {assets ? assets.length : 0}
          </div>
          <div className="text-xs text-th-muted">across all facilities</div>
        </div>
      </div>

      {/* Location Filter */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-th-muted" />
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Location Sections with Timeline Bars */}
      {filtered.map((loc) => {
        const isExpanded = expandedLocation === loc.location;
        return (
          <div key={loc.location} className="section-card">
            <button
              onClick={() => setExpandedLocation(isExpanded ? null : loc.location)}
              className="w-full section-card-header cursor-pointer hover:bg-[var(--overlay-hover)] transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown size={14} className="text-th-muted" />
                ) : (
                  <ChevronRight size={14} className="text-th-muted" />
                )}
                <MapPin size={14} className="text-siemens-accent" />
                <span className="text-sm font-semibold text-th-secondary">{loc.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-th-muted flex items-center gap-1">
                  <Users size={10} />
                  {loc.customers.length} customers
                </span>
                <span className="badge badge-teal">{loc.totalAssets} assets</span>
              </div>
            </button>

            {isExpanded && (
              <div className="section-card-body border-t border-surface-border">
                <MonthHeaders />
                <div className="space-y-0.5">
                  {loc.customers.map((cust, i) => (
                    <div key={cust.customer} className="flex items-center gap-3">
                      <div className="w-32 shrink-0">
                        <span className="text-xs text-th-muted truncate block">{cust.customer}</span>
                        <span className="text-[9px] text-th-faint">{cust.assets.length} assets</span>
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-0 bg-surface-bg/30 rounded" />
                        <TimelineBar
                          start={cust.earliestStart}
                          end={cust.latestEnd}
                          color={COLORS[i % COLORS.length]}
                          label={`${cust.assets.length} assets`}
                        />
                      </div>
                      <div className="w-20 shrink-0 text-right">
                        {cust.latestEnd && (
                          <span
                            className={`text-[10px] font-mono ${
                              daysUntil(cust.latestEnd) <= 30
                                ? 'text-red-400'
                                : daysUntil(cust.latestEnd) <= 90
                                ? 'text-amber-400'
                                : 'text-th-muted'
                            }`}
                          >
                            {daysUntil(cust.latestEnd)}d left
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Today marker label */}
                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-surface-border">
                  <Clock size={10} className="text-th-muted" />
                  <span className="text-[9px] text-th-muted uppercase tracking-wider font-medium">
                    Today: {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="section-card">
          <div className="flex items-center justify-center py-16 text-sm text-th-faint">
            No allocation data available
          </div>
        </div>
      )}
    </div>
  );
}
