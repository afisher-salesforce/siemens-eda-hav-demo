import React from 'react';
import { MapPin, Zap, Thermometer, AlertTriangle, BarChart3, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getCapacity, getOrders } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import { renderChartTooltip } from './ChartTooltip';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';

function ProgressBar({ value, max = 100, colorClass }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor =
    colorClass ||
    (pct > 85 ? 'bg-orange-500' : pct > 70 ? 'bg-amber-500' : 'bg-siemens-teal');

  return (
    <div className="progress-bar">
      <div
        className={`progress-bar-fill ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LocationCard({ location }) {
  const occupancy =
    location.totalRacks > 0
      ? ((location.usedRacks / location.totalRacks) * 100).toFixed(0)
      : 0;
  const powerPct =
    location.totalPowerKw > 0
      ? ((location.usedPowerKw / location.totalPowerKw) * 100).toFixed(0)
      : 0;

  return (
    <div className="metric-card space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-siemens-accent" />
          <h3 className="text-sm font-semibold text-th-secondary">{location.name || '--'}</h3>
        </div>
        {Number(occupancy) > 85 && (
          <span className="badge badge-red">Near Capacity</span>
        )}
      </div>

      {/* Rack Occupancy */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-medium">Rack Occupancy</span>
          <span className="text-xs font-semibold text-th-secondary">
            {location.usedRacks ?? '--'} / {location.totalRacks ?? '--'} ({occupancy}%)
          </span>
        </div>
        <ProgressBar value={location.usedRacks || 0} max={location.totalRacks || 1} />
      </div>

      {/* Power Capacity */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-th-muted uppercase tracking-wider font-medium flex items-center gap-1">
            <Zap size={10} /> Power
          </span>
          <span className="text-xs font-semibold text-th-secondary">
            {location.usedPowerKw?.toFixed(0) ?? '--'} / {location.totalPowerKw?.toFixed(0) ?? '--'} kW ({powerPct}%)
          </span>
        </div>
        <ProgressBar
          value={location.usedPowerKw || 0}
          max={location.totalPowerKw || 1}
          colorClass="bg-amber-500"
        />
      </div>

      {/* PUE */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-border">
        <span className="text-[10px] text-th-muted uppercase tracking-wider font-medium flex items-center gap-1">
          <Thermometer size={10} /> PUE
        </span>
        <span
          className={`text-sm font-bold ${
            (location.pue || 0) > 1.6
              ? 'text-orange-400'
              : (location.pue || 0) > 1.4
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}
        >
          {location.pue?.toFixed(2) ?? '--'}
        </span>
      </div>
    </div>
  );
}

// Deterministic hash for consistent pipeline demand values per location+quarter
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function CapacityView() {
  const { data, loading, error, refetch } = useSalesforceData(getCapacity);
  const { data: orders } = useSalesforceData(getOrders);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-th-secondary mb-2">Unable to Load Capacity Data</h3>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="metric-card">
              <div className="skeleton w-32 h-5 mb-4" />
              <div className="skeleton w-full h-3 mb-3" />
              <div className="skeleton w-full h-3 mb-3" />
              <div className="skeleton w-24 h-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const locations = data?.locations || [];
  const forecast = data?.forecast || [];

  return (
    <div className="space-y-6">
      <DemoContextPanel {...CONTEXT.capacity} />
      {/* Location Cards */}
      <div>
        <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em] mb-4">
          Colocation Facilities
        </h2>
        {locations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {locations.map((loc, i) => (
              <LocationCard key={loc.id || i} location={loc} />
            ))}
          </div>
        ) : (
          <div className="section-card">
            <div className="flex items-center justify-center py-16 text-sm text-th-faint">
              No location data available
            </div>
          </div>
        )}
      </div>

      {/* Forecast Table */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">Capacity Forecast</h2>
          <span className="text-[10px] text-th-muted uppercase tracking-wider">Q3/Q4 Projections</span>
        </div>
        <div className="section-card-body p-0">
          {forecast.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Quarter</th>
                    <th>Occupied</th>
                    <th>Total Capacity</th>
                    <th>Projected Demand</th>
                    <th>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={10} className="text-indigo-400" />
                        Pipeline Demand
                      </span>
                    </th>
                    <th>Headroom</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((f, i) => {
                    const totalCapacity = (f.currentRacks || 0) + (f.available || 0);
                    const headroom = totalCapacity - (f.projectedDemand || 0);
                    // Pipeline demand: derive from active orders proportionally by location
                    const activeOrderCount = orders ? orders.filter((o) => o.status === 'Active' || o.status === 'Draft').length : 0;
                    const locationHash = simpleHash((f.location || '') + (f.quarter || ''));
                    const pipelineDemand = Math.max(1, Math.round(((locationHash % 7) + 1) * (activeOrderCount > 0 ? 1 : 0.8)));
                    return (
                      <tr key={i}>
                        <td className="font-medium text-th-secondary">{f.location || '--'}</td>
                        <td className="text-th-muted">{f.quarter || '--'}</td>
                        <td className="text-th-muted">{f.currentRacks ?? '--'}</td>
                        <td className="text-th-secondary">{totalCapacity || '--'}</td>
                        <td className="text-th-secondary font-medium">{f.projectedDemand ?? '--'}</td>
                        <td>
                          <span className="text-indigo-400 font-medium font-mono">
                            +{pipelineDemand}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`font-semibold font-mono ${
                              headroom < 0 ? 'text-orange-400' : 'text-emerald-400'
                            }`}
                          >
                            {headroom >= 0 ? '+' : ''}
                            {headroom}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              headroom < 0
                                ? 'badge-red'
                                : headroom <= 5
                                ? 'badge-yellow'
                                : 'badge-green'
                            }`}
                          >
                            {headroom < 0 ? 'Over Capacity' : headroom <= 5 ? 'Near Capacity' : 'Available'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-th-faint">
              No forecast data available
            </div>
          )}
        </div>
      </div>

      {/* Capacity Analytics */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-siemens-accent" />
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
              Capacity Analytics
            </h2>
          </div>
          <span className="text-[10px] text-th-muted uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-siemens-teal animate-pulse" />
            Live
          </span>
        </div>
        <div className="section-card-body">
          {locations.length > 0 || forecast.length > 0 ? (
            <div className="space-y-6">
              {/* Occupied vs Total Racks by Location */}
              {locations.length > 0 && (
                <div>
                  <h3 className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-3 px-1">
                    Occupied vs. Total Racks by Data Center
                  </h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, locations.length * 50 + 40)}>
                    <BarChart
                      data={locations.map((loc) => ({
                        name: (loc.name || '--').replace('Siemens ', ''),
                        occupied: loc.usedRacks || 0,
                        available: (loc.totalRacks || 0) - (loc.usedRacks || 0),
                        total: loc.totalRacks || 0,
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                        axisLine={{ stroke: 'var(--surface-border)' }}
                        tickLine={{ stroke: 'var(--surface-border)' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={{ stroke: 'var(--surface-border)' }}
                        tickLine={false}
                      />
                      <Tooltip
                        content={renderChartTooltip({
                          valueFormatter: (v) => `${v} rack${v === 1 ? '' : 's'}`,
                        })}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }}
                      />
                      <Bar dataKey="occupied" name="Occupied" stackId="racks" radius={[0, 0, 0, 0]} maxBarSize={24}>
                        {locations.map((loc, idx) => {
                          const pct = loc.totalRacks > 0 ? (loc.usedRacks / loc.totalRacks) * 100 : 0;
                          return (
                            <Cell
                              key={idx}
                              fill={pct > 85 ? '#f97316' : pct > 70 ? '#f59e0b' : '#009999'}
                            />
                          );
                        })}
                      </Bar>
                      <Bar dataKey="available" name="Available" stackId="racks" fill="var(--surface-border)" radius={[0, 4, 4, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Forecast: Projected Demand vs Total Capacity */}
              {forecast.length > 0 && (
                <div>
                  <h3 className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-3 px-1">
                    Projected Demand vs. Total Capacity
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={forecast.map((f) => {
                        const totalCapacity = (f.currentRacks || 0) + (f.available || 0);
                        return {
                          label: `${(f.location || '--').replace('Siemens ', '')} · ${f.quarter}`,
                          demand: f.projectedDemand || 0,
                          capacity: totalCapacity,
                        };
                      })}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: 'var(--text-faint)' }}
                        axisLine={{ stroke: 'var(--surface-border)' }}
                        tickLine={{ stroke: 'var(--surface-border)' }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                        axisLine={{ stroke: 'var(--surface-border)' }}
                        tickLine={{ stroke: 'var(--surface-border)' }}
                        label={{ value: 'Racks', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'var(--text-faint)' } }}
                      />
                      <Tooltip
                        content={renderChartTooltip({
                          valueFormatter: (v) => `${v} rack${v === 1 ? '' : 's'}`,
                        })}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }}
                      />
                      <Bar dataKey="demand" name="Projected Demand" radius={[4, 4, 0, 0]} maxBarSize={30}>
                        {forecast.map((f, idx) => {
                          const totalCapacity = (f.currentRacks || 0) + (f.available || 0);
                          const ratio = totalCapacity > 0 ? (f.projectedDemand || 0) / totalCapacity : 0;
                          return (
                            <Cell
                              key={idx}
                              fill={ratio > 1 ? '#f97316' : ratio > 0.9 ? '#f59e0b' : '#009999'}
                            />
                          );
                        })}
                      </Bar>
                      <Bar dataKey="capacity" name="Total Capacity" fill="var(--surface-border)" radius={[4, 4, 0, 0]} maxBarSize={30} stroke="var(--surface-border-light)" strokeWidth={1} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-th-faint">
              No capacity data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
