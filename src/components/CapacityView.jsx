import React from 'react';
import { MapPin, Zap, Thermometer, AlertTriangle, BarChart3 } from 'lucide-react';
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

      {/* Tableau Next Analytics Embed */}
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
            Tableau Next
          </span>
        </div>
        <div className="section-card-body">
          <div className="bg-surface-bg rounded-lg border border-surface-border overflow-hidden">
            <div className="flex items-center justify-center py-20 text-center">
              <div>
                <BarChart3 size={40} className="text-siemens-teal/30 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium mb-1">Capacity Utilization Dashboard</p>
                <p className="text-xs text-gray-600 max-w-sm">
                  Tableau Next visualization showing occupied vs total racks by data center,
                  projected demand trends, and capacity utilization metrics from Data Cloud.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-siemens-teal/10 border border-siemens-teal/20 text-[10px] text-siemens-accent uppercase tracking-wider font-medium">
                  <BarChart3 size={10} />
                  HAV_Operations_Dashboard
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
