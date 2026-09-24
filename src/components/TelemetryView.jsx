import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Search,
  MoreVertical,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { getTelemetry, getAssets, createAssetRecord } from '../api/salesforce';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';
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
  if (temp == null) return <span className="text-th-faint">--</span>;
  const isHigh = temp > 80;
  const isWarn = temp > 70;
  return (
    <span
      className={`font-mono text-sm ${
        isHigh ? 'text-orange-400 font-bold' : isWarn ? 'text-amber-400' : 'text-th-secondary'
      }`}
    >
      {temp.toFixed(1)}&deg;C
      {isHigh && (
        <AlertTriangle size={12} className="inline ml-1 text-orange-400" />
      )}
    </span>
  );
}

function ActionDropdown({ reading, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 text-th-faint hover:text-th-secondary transition-colors rounded hover:bg-surface-card-hover"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-surface-card border border-surface-border rounded-lg shadow-xl overflow-hidden">
          <button
            onClick={() => { setOpen(false); onAction('Case', reading); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-th-secondary hover:bg-surface-card-hover transition-colors"
          >
            <ShieldAlert size={13} className="text-amber-400" />
            Create Case
          </button>
          <button
            onClick={() => { setOpen(false); onAction('WorkOrder', reading); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-th-secondary hover:bg-surface-card-hover transition-colors"
          >
            <Wrench size={13} className="text-siemens-accent" />
            Create Work Order
          </button>
        </div>
      )}
    </div>
  );
}

export default function TelemetryView() {
  const { data, loading, error, refetch } = useSalesforceData(() => getTelemetry(null, 200));
  const { data: allAssets } = useSalesforceData(getAssets);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Action modal state
  const [actionModal, setActionModal] = useState(null); // { type: 'Case'|'WorkOrder', reading }
  const [actionForm, setActionForm] = useState({ subject: '', description: '', priority: 'Medium' });
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Build asset name → ID map
  const assetIdMap = useMemo(() => {
    if (!allAssets) return {};
    const map = {};
    for (const a of allAssets) {
      if (a.name) map[a.name] = a.id;
    }
    return map;
  }, [allAssets]);

  const openActionModal = (type, reading) => {
    const assetName = reading.assetName || 'Unknown';
    const hasErrors = (reading.errors || 0) > 0;
    const highTemp = (reading.temperature || 0) > 80;
    const highCpu = (reading.cpuPercent || 0) > 90;

    let subject = '';
    let priority = 'Medium';

    if (hasErrors) {
      subject = `${type === 'Case' ? 'Case' : 'WO'}: ${assetName} — ${reading.errors} error(s) detected`;
      priority = 'High';
    } else if (highTemp) {
      subject = `${type === 'Case' ? 'Case' : 'WO'}: ${assetName} — High temperature (${reading.temperature.toFixed(1)}°C)`;
      priority = 'High';
    } else if (highCpu) {
      subject = `${type === 'Case' ? 'Case' : 'WO'}: ${assetName} — CPU at ${reading.cpuPercent}%`;
      priority = 'Medium';
    } else {
      subject = `${type === 'Case' ? 'Case' : 'WO'}: ${assetName} — Maintenance request`;
    }

    const lines = [
      `Asset: ${assetName}`,
      `Status: ${reading.status || 'N/A'}`,
      `CPU: ${reading.cpuPercent ?? '--'}%, Memory: ${reading.memoryPercent ?? '--'}%`,
      `Temperature: ${reading.temperature != null ? reading.temperature.toFixed(1) + '°C' : '--'}`,
      `Errors: ${reading.errors ?? 0}, Active Jobs: ${reading.jobs ?? '--'}`,
      `Timestamp: ${reading.timestamp ? new Date(reading.timestamp).toLocaleString() : '--'}`,
    ];

    setActionForm({ subject, description: lines.join('\n'), priority });
    setActionError(null);
    setActionSuccess(null);
    setActionModal({ type, reading });
  };

  const handleActionSubmit = async () => {
    if (actionSubmitting || !actionModal) return;
    const assetId = assetIdMap[actionModal.reading.assetName];
    if (!assetId) {
      setActionError('Could not resolve asset ID for ' + actionModal.reading.assetName);
      return;
    }
    setActionSubmitting(true);
    setActionError(null);
    try {
      const result = await createAssetRecord({
        recordType: actionModal.type,
        assetId,
        subject: actionForm.subject,
        description: actionForm.description,
        priority: actionForm.priority,
      });
      setActionSuccess(result);
      setTimeout(() => {
        setActionModal(null);
        setActionSuccess(null);
      }, 3000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

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
        <h3 className="text-lg font-semibold text-th-secondary mb-2">Unable to Load Telemetry</h3>
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

  return (
    <div className="space-y-4">
      <DemoContextPanel {...CONTEXT.telemetry} />
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
          <input
            type="text"
            placeholder="Search by asset name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-th-faint"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 ml-auto text-xs text-th-muted">
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
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((r, i) => (
                    <tr key={i}>
                      <td className="font-medium text-th-secondary whitespace-nowrap">
                        {r.assetName || '--'}
                      </td>
                      <td className="text-th-muted text-xs whitespace-nowrap font-mono">
                        {r.timestamp
                          ? new Date(r.timestamp).toLocaleString()
                          : '--'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[var(--skeleton-bg)] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (r.cpuPercent || 0) > 90
                                  ? 'bg-orange-500 animate-pulse'
                                  : (r.cpuPercent || 0) > 70
                                  ? 'bg-amber-500'
                                  : 'bg-siemens-teal'
                              }`}
                              style={{ width: `${Math.min(r.cpuPercent || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-th-muted w-10 text-right font-mono">
                            {r.cpuPercent != null ? `${r.cpuPercent}%` : '--'}
                          </span>
                          {(r.cpuPercent || 0) > 90 && <AlertTriangle size={10} className="text-orange-400 shrink-0" />}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[var(--skeleton-bg)] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (r.memoryPercent || 0) > 90
                                  ? 'bg-orange-500 animate-pulse'
                                  : (r.memoryPercent || 0) > 70
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(r.memoryPercent || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-th-muted w-10 text-right font-mono">
                            {r.memoryPercent != null ? `${r.memoryPercent}%` : '--'}
                          </span>
                          {(r.memoryPercent || 0) > 90 && <AlertTriangle size={10} className="text-orange-400 shrink-0" />}
                        </div>
                      </td>
                      <td>
                        <TempDisplay temp={r.temperature} />
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="text-th-secondary text-center font-mono text-sm">
                        {r.jobs ?? '--'}
                      </td>
                      <td>
                        {r.errors != null ? (
                          <span
                            className={`font-mono text-sm ${
                              r.errors > 0 ? 'text-orange-400 font-bold' : 'text-th-muted'
                            }`}
                          >
                            {r.errors}
                            {r.errors > 0 && <AlertTriangle size={10} className="inline ml-1 text-orange-400" />}
                          </span>
                        ) : (
                          <span className="text-th-faint">--</span>
                        )}
                      </td>
                      <td>
                        <ActionDropdown reading={r} onAction={openActionModal} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-th-faint">
                      No telemetry readings match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Action Modal — Create Case / Create Work Order from Telemetry */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-xl shadow-2xl w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-th-primary flex items-center gap-2">
                {actionModal.type === 'Case' ? (
                  <ShieldAlert size={16} className="text-amber-400" />
                ) : (
                  <Wrench size={16} className="text-siemens-accent" />
                )}
                Create {actionModal.type === 'Case' ? 'Case' : 'Work Order'} for {actionModal.reading.assetName}
              </h3>
              <button
                onClick={() => setActionModal(null)}
                className="p-1 text-th-muted hover:text-th-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            {actionSuccess ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-th-primary mb-1">
                  {actionSuccess.recordType === 'Case' ? 'Case' : 'Work Order'} Created
                </p>
                <p className="text-xs text-th-muted">
                  {actionSuccess.CaseNumber || actionSuccess.WorkOrderNumber} — {actionSuccess.Subject}
                </p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={actionForm.subject}
                    onChange={(e) => setActionForm({ ...actionForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-surface-bg border border-surface-border rounded-md
                      text-th-secondary placeholder:text-th-faint outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
                    placeholder="Brief description"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={actionForm.description}
                    onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2 text-sm bg-surface-bg border border-surface-border rounded-md
                      text-th-secondary placeholder:text-th-faint outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50
                      resize-none font-mono text-xs leading-relaxed"
                    placeholder="Detailed description..."
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-1.5">
                    Priority
                  </label>
                  <select
                    value={actionForm.priority}
                    onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-surface-bg border border-surface-border rounded-md
                      text-th-secondary outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {/* Error */}
                {actionError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                    <AlertTriangle size={14} />
                    {actionError}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            {!actionSuccess && (
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-border">
                <button
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 text-xs text-th-muted hover:text-th-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionSubmit}
                  disabled={actionSubmitting || !actionForm.subject.trim()}
                  className="px-4 py-2 text-xs font-medium rounded-md transition-colors
                    bg-siemens-teal text-white hover:bg-siemens-dark
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center gap-1.5"
                >
                  {actionSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>Create {actionModal.type === 'Case' ? 'Case' : 'Work Order'}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
