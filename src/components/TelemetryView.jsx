import React, { useState, useMemo } from 'react';
import { Activity, AlertTriangle, Search } from 'lucide-react';
import { getTelemetry } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

function StatusBadge({ status }) {
  const styles = {
    Running: 'badge-green',
    Idle: 'badge-yellow',
    Error: 'badge-red',
    Warning: 'badge-orange',
    Offline: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status || '--'}</span>;
}

function TempDisplay({ temp }) {
  if (temp == null) return <span className="text-gray-600">--</span>;
  const isHigh = temp > 80;
  const isWarn = temp > 70;
  return (
    <span
      className={`font-mono text-sm ${
        isHigh ? 'text-red-400 font-bold' : isWarn ? 'text-amber-400' : 'text-gray-300'
      }`}
    >
      {temp.toFixed(1)}&deg;C
      {isHigh && (
        <AlertTriangle size={12} className="inline ml-1 text-red-400" />
      )}
    </span>
  );
}

export default function TelemetryView() {
  const { data, loading, error, refetch } = useSalesforceData(() => getTelemetry(null, 200));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const readings = data || [];

  const filtered = useMemo(() => {
    return readings.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (r.assetName && r.assetName.toLowerCase().includes(term)) ||
          (r.assetId && r.assetId.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [readings, statusFilter, searchTerm]);

  const statuses = useMemo(
    () => [...new Set(readings.map((r) => r.status).filter(Boolean))].sort(),
    [readings]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Telemetry</h3>
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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by asset name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-gray-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 ml-auto text-xs text-gray-500">
          <Activity size={12} />
          <span>{loading ? 'Loading...' : `${filtered.length} readings`}</span>
        </div>
      </div>

      {/* Table */}
      <div className="section-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton w-full h-10" />
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Timestamp</th>
                  <th>CPU %</th>
                  <th>Memory %</th>
                  <th>Temperature</th>
                  <th>Status</th>
                  <th>Jobs</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((r, i) => (
                    <tr key={i}>
                      <td className="font-medium text-gray-200 whitespace-nowrap">
                        {r.assetName || '--'}
                      </td>
                      <td className="text-gray-500 text-xs whitespace-nowrap font-mono">
                        {r.timestamp
                          ? new Date(r.timestamp).toLocaleString()
                          : '--'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (r.cpuPercent || 0) > 90
                                  ? 'bg-red-500'
                                  : (r.cpuPercent || 0) > 70
                                  ? 'bg-amber-500'
                                  : 'bg-siemens-teal'
                              }`}
                              style={{ width: `${Math.min(r.cpuPercent || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-10 text-right font-mono">
                            {r.cpuPercent != null ? `${r.cpuPercent}%` : '--'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (r.memoryPercent || 0) > 90
                                  ? 'bg-red-500'
                                  : (r.memoryPercent || 0) > 70
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(r.memoryPercent || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-10 text-right font-mono">
                            {r.memoryPercent != null ? `${r.memoryPercent}%` : '--'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <TempDisplay temp={r.temperature} />
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="text-gray-300 text-center font-mono text-sm">
                        {r.jobs ?? '--'}
                      </td>
                      <td>
                        {r.errors != null ? (
                          <span
                            className={`font-mono text-sm ${
                              r.errors > 0 ? 'text-red-400 font-bold' : 'text-gray-500'
                            }`}
                          >
                            {r.errors}
                          </span>
                        ) : (
                          <span className="text-gray-600">--</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-600">
                      No telemetry readings match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
