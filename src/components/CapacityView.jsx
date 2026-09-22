import React from 'react';
import { MapPin, Zap, Thermometer, AlertTriangle, BarChart3 } from 'lucide-react';
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
import { getCapacity } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

function ProgressBar({ value, max = 100, colorClass }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor =
    colorClass ||
    (pct > 85 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-siemens-teal');

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
          <h3 className="text-sm font-semibold text-gray-200">{location.name || '--'}</h3>
        </div>
        {Number(occupancy) > 85 && (
          <span className="badge badge-red">Near Capacity</span>
        )}
      </div>

      {/* Rack Occupancy */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Rack Occupancy</span>
          <span className="text-xs font-semibold text-gray-300">
            {location.usedRacks ?? '--'} / {location.totalRacks ?? '--'} ({occupancy}%)
          </span>
        </div>
        <ProgressBar value={location.usedRacks || 0} max={location.totalRacks || 1} />
      </div>

      {/* Power Capacity */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1">
            <Zap size={10} /> Power
          </span>
          <span className="text-xs font-semibold text-gray-300">
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
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1">
          <Thermometer size={10} /> PUE
        </span>
        <span
          className={`text-sm font-bold ${
            (location.pue || 0) > 1.6
              ? 'text-red-400'
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

export default function CapacityView() {
  const { data, loading, error, refetch } = useSalesforceData(getCapacity);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Capacity Data</h3>
        <p className="text-sm text-gray-500 max-w-md mb-4">{error}</p>
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
      {/* Location Cards */}
      <div>
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em] mb-4">
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
            <div className="flex items-center justify-center py-16 text-sm text-gray-600">
              No location data available
            </div>
          </div>
        )}
      </div>

      {/* Forecast Table */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Capacity Forecast</h2>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Q3/Q4 Projections</span>
        </div>
        <div className="section-card-body p-0">
          {forecast.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Quarter</th>
                    <th>Current Racks</th>
                    <th>Projected Demand</th>
                    <th>Available</th>
                    <th>Delta</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((f, i) => {
                    const delta = (f.available || 0) - (f.projectedDemand || 0);
                    return (
                      <tr key={i}>
                        <td className="font-medium text-gray-200">{f.location || '--'}</td>
                        <td className="text-gray-400">{f.quarter || '--'}</td>
                        <td className="text-gray-400">{f.currentRacks ?? '--'}</td>
                        <td className="text-gray-200 font-medium">{f.projectedDemand ?? '--'}</td>
                        <td className="text-gray-400">{f.available ?? '--'}</td>
                        <td>
                          <span
                            className={`font-semibold font-mono ${
                              delta < 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {delta >= 0 ? '+' : ''}
                            {delta}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              delta < 0
                                ? 'badge-red'
                                : delta <= 3
                                ? 'badge-yellow'
                                : 'badge-green'
                            }`}
                          >
                            {delta < 0 ? 'Over Capacity' : delta <= 3 ? 'Tight' : 'Available'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-gray-600">
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
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Capacity Analytics
            </h2>
          </div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
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
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 px-1">
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#1e293b' }}
                        tickLine={{ stroke: '#1e293b' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={{ stroke: '#1e293b' }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #1e293b',
                          backgroundColor: '#111827',
                          fontSize: '12px',
                          color: '#94a3b8',
                        }}
                        formatter={(value, name) => [value, name === 'occupied' ? 'Occupied' : 'Available']}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                      />
                      <Bar dataKey="occupied" name="Occupied" stackId="racks" radius={[0, 0, 0, 0]} maxBarSize={24}>
                        {locations.map((loc, idx) => {
                          const pct = loc.totalRacks > 0 ? (loc.usedRacks / loc.totalRacks) * 100 : 0;
                          return (
                            <Cell
                              key={idx}
                              fill={pct > 85 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#009999'}
                            />
                          );
                        })}
                      </Bar>
                      <Bar dataKey="available" name="Available" stackId="racks" fill="#1e293b" radius={[0, 4, 4, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Forecast: Projected Demand vs Available */}
              {forecast.length > 0 && (
                <div>
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 px-1">
                    Projected Demand vs. Available Capacity
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={forecast.map((f) => ({
                        label: `${(f.location || '--').replace('Siemens ', '')} · ${f.quarter}`,
                        demand: f.projectedDemand || 0,
                        available: f.available || 0,
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={{ stroke: '#1e293b' }}
                        tickLine={{ stroke: '#1e293b' }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#1e293b' }}
                        tickLine={{ stroke: '#1e293b' }}
                        label={{ value: 'Racks', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #1e293b',
                          backgroundColor: '#111827',
                          fontSize: '12px',
                          color: '#94a3b8',
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                      />
                      <Bar dataKey="demand" name="Projected Demand" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="available" name="Available" fill="#009999" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-gray-600">
              No capacity data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
