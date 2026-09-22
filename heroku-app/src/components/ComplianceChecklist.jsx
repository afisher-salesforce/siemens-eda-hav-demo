import React, { useMemo, useState } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  FileCheck,
  Globe,
  Users,
  Ban,
} from 'lucide-react';
import { getOrders } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

// Simulated compliance checks for each order
const COMPLIANCE_CHECKS = [
  {
    id: 'eccn',
    label: 'ECCN Classification',
    description: 'Export Control Classification Number verified',
    icon: FileCheck,
  },
  {
    id: 'denied_party',
    label: 'Denied Party Screening',
    description: 'Customer cleared against all restricted party lists',
    icon: Ban,
  },
  {
    id: 'end_use',
    label: 'End-Use Verification',
    description: 'Confirmed compliant end-use application',
    icon: Users,
  },
  {
    id: 'country_check',
    label: 'Country Controls',
    description: 'Destination country cleared for controlled technology',
    icon: Globe,
  },
  {
    id: 'license',
    label: 'Export License',
    description: 'Required export license obtained or NLR confirmed',
    icon: Shield,
  },
];

function deriveCheckStatus(order, checkId) {
  // Derive compliance status from order status
  const approvedStatuses = ['Approved', 'Active', 'Fulfilled'];
  const inProgressStatuses = ['Submitted', 'Pending'];

  if (approvedStatuses.includes(order.status)) return 'passed';
  if (inProgressStatuses.includes(order.status)) {
    // Some checks pass before others
    const earlyChecks = ['eccn', 'country_check'];
    return earlyChecks.includes(checkId) ? 'passed' : 'pending';
  }
  if (order.status === 'Cancelled') return 'failed';
  return 'pending';
}

function CheckStatusIcon({ status }) {
  if (status === 'passed')
    return <CheckCircle2 size={16} className="text-emerald-400" />;
  if (status === 'failed')
    return <XCircle size={16} className="text-red-400" />;
  return <Clock size={16} className="text-amber-400" />;
}

export default function ComplianceChecklist() {
  const { data, loading, error, refetch } = useSalesforceData(getOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  const orders = useMemo(() => {
    if (!data) return [];
    let filtered = data.filter((o) => o.status !== 'Expired');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          (o.orderNumber && o.orderNumber.toLowerCase().includes(term)) ||
          (o.customer && o.customer.toLowerCase().includes(term)) ||
          (o.product && o.product.toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [data, searchTerm]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Compliance Data</h3>
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
        <div className="skeleton w-48 h-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton w-full h-20" />
        ))}
      </div>
    );
  }

  // Summary metrics
  const totalChecks = orders.length * COMPLIANCE_CHECKS.length;
  const passedChecks = orders.reduce(
    (sum, o) =>
      sum +
      COMPLIANCE_CHECKS.filter((c) => deriveCheckStatus(o, c.id) === 'passed').length,
    0
  );
  const pendingChecks = orders.reduce(
    (sum, o) =>
      sum +
      COMPLIANCE_CHECKS.filter((c) => deriveCheckStatus(o, c.id) === 'pending').length,
    0
  );
  const failedChecks = totalChecks - passedChecks - pendingChecks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-white">Export Compliance</h1>
            <p className="text-xs text-gray-500">
              Automated compliance checks for all hardware orders
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Passed
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{passedChecks}</div>
          <div className="text-xs text-gray-500">of {totalChecks} total checks</div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-400" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Pending
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{pendingChecks}</div>
          <div className="text-xs text-gray-500">awaiting verification</div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={14} className="text-red-400" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Flagged
            </span>
          </div>
          <div className="text-2xl font-bold text-red-400">{failedChecks}</div>
          <div className="text-xs text-gray-500">requires attention</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-gray-600"
        />
      </div>

      {/* Compliance Cards */}
      <div className="space-y-3">
        {orders.map((order, i) => {
          const checks = COMPLIANCE_CHECKS.map((c) => ({
            ...c,
            status: deriveCheckStatus(order, c.id),
          }));
          const allPassed = checks.every((c) => c.status === 'passed');
          const hasFailed = checks.some((c) => c.status === 'failed');
          const isExpanded = expandedOrder === (order.id || i);

          return (
            <div key={order.id || i} className="section-card">
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : order.id || i)}
                className="w-full section-card-header cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      allPassed
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : hasFailed
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {allPassed ? (
                      <CheckCircle2 size={16} />
                    ) : hasFailed ? (
                      <XCircle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-200">
                      {order.orderNumber || '--'} &middot; {order.customer}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {order.product || 'Veloce System'} &middot;{' '}
                      {checks.filter((c) => c.status === 'passed').length}/
                      {checks.length} checks passed
                    </div>
                  </div>
                </div>
                <span
                  className={`badge ${
                    allPassed ? 'badge-green' : hasFailed ? 'badge-red' : 'badge-yellow'
                  }`}
                >
                  {allPassed ? 'Cleared' : hasFailed ? 'Flagged' : 'Pending'}
                </span>
              </button>

              {isExpanded && (
                <div className="section-card-body border-t border-surface-border">
                  <div className="space-y-3">
                    {checks.map((check) => {
                      const CheckIcon = check.icon;
                      return (
                        <div
                          key={check.id}
                          className="flex items-center justify-between py-2 border-b border-surface-border last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <CheckIcon size={14} className="text-gray-500" />
                            <div>
                              <div className="text-sm text-gray-200">{check.label}</div>
                              <div className="text-[10px] text-gray-500">
                                {check.description}
                              </div>
                            </div>
                          </div>
                          <CheckStatusIcon status={check.status} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
