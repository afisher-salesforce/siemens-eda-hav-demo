import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Calendar,
  DollarSign,
  Server,
  Building,
  FileText,
  Package,
  Hash,
} from 'lucide-react';
import { getWorkOrders, getAssets, getTelemetry } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

function PriorityBadge({ priority }) {
  const styles = {
    Critical: 'badge-red',
    High: 'badge-orange',
    Medium: 'badge-blue',
    Low: 'badge-gray',
  };
  return <span className={`badge ${styles[priority] || 'badge-gray'}`}>{priority || '--'}</span>;
}

function StatusBadge({ status }) {
  const styles = {
    New: 'badge-blue',
    Open: 'badge-blue',
    'In Progress': 'badge-yellow',
    'On Hold': 'badge-orange',
    Completed: 'badge-green',
    Closed: 'badge-gray',
    Cancelled: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status || '--'}</span>;
}

function DetailRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-border last:border-0">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      <span className="text-sm text-gray-200 font-medium">{value || '--'}</span>
    </div>
  );
}

function formatCurrency(value) {
  if (value == null) return '--';
  return `$${value.toLocaleString()}`;
}

export default function WorkOrderDetail() {
  const { workOrderId } = useParams();
  const navigate = useNavigate();
  const { data: allWorkOrders, loading: woLoading } = useSalesforceData(getWorkOrders);
  const { data: allAssets, loading: assetsLoading } = useSalesforceData(getAssets);
  const { data: telemetryData, loading: telemetryLoading } = useSalesforceData(
    () => getTelemetry(null, 200)
  );

  const workOrder = useMemo(() => {
    if (!allWorkOrders) return null;
    return allWorkOrders.find(
      (wo) => wo.id === workOrderId || wo.workOrderNumber === workOrderId
    );
  }, [allWorkOrders, workOrderId]);

  // Find the linked asset
  const linkedAsset = useMemo(() => {
    if (!allAssets || !workOrder) return null;
    return allAssets.find((a) => a.name === workOrder.assetName);
  }, [allAssets, workOrder]);

  // Find other work orders for the same asset
  const relatedWorkOrders = useMemo(() => {
    if (!allWorkOrders || !workOrder) return [];
    return allWorkOrders.filter(
      (wo) =>
        wo.id !== workOrder.id &&
        wo.assetName &&
        wo.assetName === workOrder.assetName
    );
  }, [allWorkOrders, workOrder]);

  // Find other work orders for the same customer
  const customerWorkOrders = useMemo(() => {
    if (!allWorkOrders || !workOrder) return [];
    return allWorkOrders
      .filter(
        (wo) =>
          wo.id !== workOrder.id &&
          wo.customer &&
          wo.customer === workOrder.customer &&
          wo.assetName !== workOrder.assetName
      )
      .slice(0, 6);
  }, [allWorkOrders, workOrder]);

  // Get recent telemetry for the linked asset (for context)
  const assetTelemetry = useMemo(() => {
    if (!telemetryData || !workOrder) return [];
    return telemetryData
      .filter((t) => t.assetName === workOrder.assetName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
  }, [telemetryData, workOrder]);

  const loading = woLoading || assetsLoading || telemetryLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton w-40 h-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="metric-card space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton w-full h-6" />
            ))}
          </div>
          <div className="section-card lg:col-span-2">
            <div className="section-card-body">
              <div className="skeleton w-full h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Work Order Not Found</h3>
        <p className="text-sm text-gray-500 max-w-md mb-4">
          The work order &ldquo;{workOrderId}&rdquo; could not be found.
        </p>
        <button
          onClick={() => navigate('/workorders')}
          className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors"
        >
          Back to Work Orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/workorders')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-siemens-accent transition-colors"
        >
          <ArrowLeft size={16} />
          Work Orders
        </button>
        <ChevronRight size={14} className="text-gray-600" />
        <span className="text-gray-200 font-medium">{workOrder.workOrderNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-3">
            <Wrench size={22} className="text-siemens-accent" />
            {workOrder.workOrderNumber}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{workOrder.subject || 'No subject'}</p>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={workOrder.priority} />
          <StatusBadge status={workOrder.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Properties Panel */}
        <div className="metric-card space-y-0">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
            Work Order Properties
          </h3>
          <DetailRow label="WO Number" value={workOrder.workOrderNumber} icon={Hash} />
          <DetailRow label="Subject" value={workOrder.subject} icon={FileText} />
          <DetailRow label="Priority" value={workOrder.priority} />
          <DetailRow label="Status" value={workOrder.status} />
          <DetailRow label="Customer" value={workOrder.customer} icon={Building} />
          <DetailRow
            label="Asset"
            value={
              linkedAsset ? (
                <Link
                  to={`/assets/${linkedAsset.id}`}
                  className="text-siemens-accent hover:underline"
                >
                  {workOrder.assetName}
                </Link>
              ) : (
                workOrder.assetName
              )
            }
            icon={Server}
          />
          <DetailRow label="RMA Number" value={workOrder.rmaNumber} icon={Package} />
          <DetailRow label="Vendor" value={workOrder.vendor} />
          <DetailRow
            label="Estimated Cost"
            value={formatCurrency(workOrder.estimatedCost)}
            icon={DollarSign}
          />
          <DetailRow
            label="Created"
            value={
              workOrder.createdDate
                ? new Date(workOrder.createdDate).toLocaleDateString()
                : null
            }
            icon={Calendar}
          />
        </div>

        {/* Right Column — Related Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked Asset Card */}
          {linkedAsset && (
            <div className="section-card">
              <div className="section-card-header">
                <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
                  Linked Asset
                </h2>
              </div>
              <div className="section-card-body">
                <Link
                  to={`/assets/${linkedAsset.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-surface-border hover:bg-white/[0.05] hover:border-siemens-teal/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Server size={18} className="text-siemens-accent" />
                    <div>
                      <div className="text-sm font-semibold text-gray-200 group-hover:text-siemens-accent transition-colors">
                        {linkedAsset.name}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {linkedAsset.product} &middot; {linkedAsset.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`badge ${
                        linkedAsset.status === 'Active' || linkedAsset.status === 'Running'
                          ? 'badge-green'
                          : linkedAsset.status === 'Maintenance'
                          ? 'badge-orange'
                          : linkedAsset.status === 'Offline' || linkedAsset.status === 'Error'
                          ? 'badge-red'
                          : 'badge-gray'
                      }`}
                    >
                      {linkedAsset.status}
                    </span>
                    <ChevronRight size={14} className="text-gray-500 group-hover:text-siemens-accent transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Recent Telemetry from Asset */}
          {assetTelemetry.length > 0 && (
            <div className="section-card">
              <div className="section-card-header">
                <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
                  Asset Telemetry (Latest)
                </h2>
                <span className="text-[10px] text-gray-500">{assetTelemetry.length} readings</span>
              </div>
              <div className="section-card-body p-0">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>CPU %</th>
                        <th>Memory %</th>
                        <th>Temp</th>
                        <th>Status</th>
                        <th>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetTelemetry.map((t, i) => (
                        <tr key={i}>
                          <td className="text-gray-500 text-xs font-mono whitespace-nowrap">
                            {t.timestamp
                              ? new Date(t.timestamp).toLocaleString()
                              : '--'}
                          </td>
                          <td className="text-gray-300 font-mono text-sm">
                            {t.cpuPercent != null ? `${t.cpuPercent}%` : '--'}
                          </td>
                          <td className="text-gray-300 font-mono text-sm">
                            {t.memoryPercent != null ? `${t.memoryPercent}%` : '--'}
                          </td>
                          <td>
                            <span
                              className={`font-mono text-sm ${
                                (t.temperature || 0) > 80
                                  ? 'text-red-400 font-bold'
                                  : (t.temperature || 0) > 70
                                  ? 'text-amber-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              {t.temperature != null
                                ? `${t.temperature.toFixed(1)}°C`
                                : '--'}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={t.status} />
                          </td>
                          <td>
                            <span
                              className={`font-mono text-sm ${
                                (t.errors || 0) > 0
                                  ? 'text-red-400 font-bold'
                                  : 'text-gray-500'
                              }`}
                            >
                              {t.errors ?? '--'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Work Orders for Same Asset */}
      {relatedWorkOrders.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Other Work Orders for {workOrder.assetName}
            </h2>
            <span className="text-[10px] text-gray-500">{relatedWorkOrders.length} work orders</span>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>WO #</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedWorkOrders.map((wo, i) => (
                    <tr key={wo.id || i}>
                      <td>
                        <Link
                          to={`/workorders/${wo.id}`}
                          className="font-medium text-siemens-accent hover:underline whitespace-nowrap"
                        >
                          {wo.workOrderNumber || '--'}
                        </Link>
                      </td>
                      <td className="text-gray-200 max-w-xs truncate">{wo.subject || '--'}</td>
                      <td><PriorityBadge priority={wo.priority} /></td>
                      <td><StatusBadge status={wo.status} /></td>
                      <td className="font-medium text-white">{formatCurrency(wo.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Other Work Orders for Same Customer */}
      {customerWorkOrders.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Other Work Orders for {workOrder.customer}
            </h2>
            <span className="text-[10px] text-gray-500">{customerWorkOrders.length} work orders</span>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>WO #</th>
                    <th>Asset</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerWorkOrders.map((wo, i) => (
                    <tr key={wo.id || i}>
                      <td>
                        <Link
                          to={`/workorders/${wo.id}`}
                          className="font-medium text-siemens-accent hover:underline whitespace-nowrap"
                        >
                          {wo.workOrderNumber || '--'}
                        </Link>
                      </td>
                      <td className="text-gray-400 whitespace-nowrap">{wo.assetName || '--'}</td>
                      <td className="text-gray-200 max-w-xs truncate">{wo.subject || '--'}</td>
                      <td><PriorityBadge priority={wo.priority} /></td>
                      <td><StatusBadge status={wo.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
