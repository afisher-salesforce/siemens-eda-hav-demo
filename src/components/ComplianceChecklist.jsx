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
  MapPin,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { getComplianceData, getOrders } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';
import SlackFeed from './SlackFeed';
import SalesforceLink from './SalesforceLink';
import { getSlackChannelName } from '../utils/slackChannel';

// Tab definitions for the compliance dashboard
const TABS = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'embargoes', label: 'Embargoed Countries', icon: Globe },
  { id: 'parties', label: 'Restricted Parties', icon: Ban },
  { id: 'eccn', label: 'ECCN Classifications', icon: FileCheck },
  { id: 'orders', label: 'Order Screening', icon: Users },
];

// Simulated compliance check definitions for order screening
const ORDER_CHECKS = [
  { id: 'eccn', label: 'ECCN Classification', description: 'Export Control Classification Number verified', icon: FileCheck },
  { id: 'denied_party', label: 'Denied Party Screening', description: 'Customer cleared against all restricted party lists', icon: Ban },
  { id: 'end_use', label: 'End-Use Verification', description: 'Confirmed compliant end-use application', icon: Users },
  { id: 'country_check', label: 'Country Controls', description: 'Destination country cleared for controlled technology', icon: Globe },
  { id: 'license', label: 'Export License', description: 'Required export license obtained or NLR confirmed', icon: Shield },
];

function deriveCheckStatus(order, checkId) {
  const approvedStatuses = ['Approved', 'Active', 'Fulfilled'];
  const inProgressStatuses = ['Submitted', 'Pending'];
  if (approvedStatuses.includes(order.status)) return 'passed';
  if (inProgressStatuses.includes(order.status)) {
    const earlyChecks = ['eccn', 'country_check'];
    return earlyChecks.includes(checkId) ? 'passed' : 'pending';
  }
  if (order.status === 'Cancelled') return 'failed';
  return 'pending';
}

function CheckStatusIcon({ status }) {
  if (status === 'passed') return <CheckCircle2 size={16} className="text-emerald-400" />;
  if (status === 'failed') return <XCircle size={16} className="text-red-400" />;
  return <Clock size={16} className="text-amber-400" />;
}

function RestrictionBadge({ type }) {
  const styles = {
    SDN: 'bg-red-500/10 text-red-400 border-red-500/20',
    'Entity List': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Military End User': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Unverified List': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[type] || 'bg-gray-500/10 text-th-muted border-gray-500/20'}`}>
      {type}
    </span>
  );
}

function CountryFlag({ code }) {
  // Convert 2-letter country code to flag emoji
  if (!code || code.length !== 2) return null;
  const flag = code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
  return <span className="text-base mr-1">{flag}</span>;
}

export default function ComplianceChecklist() {
  const { data: complianceData, loading: compLoading, error: compError, refetch } = useSalesforceData(getComplianceData);
  const { data: ordersData, loading: ordersLoading } = useSalesforceData(getOrders);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);

  const orders = useMemo(() => {
    if (!ordersData || !Array.isArray(ordersData)) return [];
    let filtered = ordersData.filter((o) => o.status !== 'Expired');
    if (searchTerm && activeTab === 'orders') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          (o.orderNumber && o.orderNumber.toLowerCase().includes(term)) ||
          (o.customer && o.customer.toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [ordersData, searchTerm, activeTab]);

  const filteredParties = useMemo(() => {
    if (!complianceData?.restrictedParties) return [];
    if (!searchTerm || activeTab !== 'parties') return complianceData.restrictedParties;
    const term = searchTerm.toLowerCase();
    return complianceData.restrictedParties.filter(
      (p) => (p.entityName && p.entityName.toLowerCase().includes(term)) || (p.country && p.country.toLowerCase().includes(term))
    );
  }, [complianceData, searchTerm, activeTab]);

  const filteredEccn = useMemo(() => {
    if (!complianceData?.eccnClassifications) return [];
    if (!searchTerm || activeTab !== 'eccn') return complianceData.eccnClassifications;
    const term = searchTerm.toLowerCase();
    return complianceData.eccnClassifications.filter(
      (e) =>
        (e.eccnCode && e.eccnCode.toLowerCase().includes(term)) ||
        (e.productCategory && e.productCategory.toLowerCase().includes(term))
    );
  }, [complianceData, searchTerm, activeTab]);

  // Group restricted parties by country — must be before any early returns to satisfy Rules of Hooks
  const partiesByCountry = useMemo(() => {
    const groups = {};
    for (const p of filteredParties) {
      const country = p.country || 'Unknown';
      if (!groups[country]) groups[country] = [];
      groups[country].push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredParties]);

  // Show loading if either data source is still fetching
  const loading = compLoading || ordersLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton w-48 h-6" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton w-full h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (compError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-th-secondary mb-2">Unable to Load Compliance Data</h3>
        <p className="text-sm text-th-muted max-w-md mb-4">{compError}</p>
        <button onClick={refetch} className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const metrics = complianceData?.metrics || {};

  // Order screening metrics
  const totalChecks = orders.length * ORDER_CHECKS.length;
  const passedChecks = orders.reduce(
    (sum, o) => sum + ORDER_CHECKS.filter((c) => deriveCheckStatus(o, c.id) === 'passed').length,
    0
  );
  const pendingChecks = orders.reduce(
    (sum, o) => sum + ORDER_CHECKS.filter((c) => deriveCheckStatus(o, c.id) === 'pending').length,
    0
  );
  const failedChecks = totalChecks - passedChecks - pendingChecks;

  return (
    <div className="space-y-6">
      <DemoContextPanel {...CONTEXT.compliance} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-siemens-accent" />
          <div>
            <h1 className="text-lg font-bold text-th-primary">Trade Compliance</h1>
            <p className="text-xs text-th-muted">
              EAR/ECCN export controls, OFAC sanctions screening, embargo enforcement
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-siemens-accent text-siemens-accent'
                  : 'border-transparent text-th-muted hover:text-th-secondary'
              }`}
            >
              <TabIcon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={14} className="text-red-400" />
                <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Embargoed Countries</span>
              </div>
              <div className="text-2xl font-bold text-red-400">{metrics.embargoedCountries ?? 0}</div>
              <div className="text-xs text-th-muted">active trade embargoes</div>
            </div>
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-1">
                <Ban size={14} className="text-amber-400" />
                <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Restricted Parties</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">{metrics.restrictedParties ?? 0}</div>
              <div className="text-xs text-th-muted">on SDN/Entity lists</div>
            </div>
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck size={14} className="text-blue-400" />
                <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">ECCN Classifications</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{metrics.eccnClassifications ?? 0}</div>
              <div className="text-xs text-th-muted">controlled items</div>
            </div>
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Compliance Records</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{metrics.totalRecords ?? 0}</div>
              <div className="text-xs text-th-muted">{metrics.clearRecords ?? 0} clear, {metrics.flaggedRecords ?? 0} flagged, {metrics.blockedRecords ?? 0} blocked</div>
            </div>
          </div>

          {/* Compliance Records */}
          {complianceData?.complianceRecords?.length > 0 && (
            <div className="section-card">
              <div className="section-card-header">
                <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">Recent Compliance Assessments</h2>
              </div>
              <div className="section-card-body p-0">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Record</th>
                        <th>Outcome</th>
                        <th>Account</th>
                        <th>Quote</th>
                        <th>Date</th>
                        <th>Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceData.complianceRecords.map((cr) => {
                        const isExpanded = expandedRecord === cr.id;
                        return (
                          <React.Fragment key={cr.id}>
                            <tr
                              className="cursor-pointer hover:bg-[var(--overlay-hover)]"
                              onClick={() => setExpandedRecord(isExpanded ? null : cr.id)}
                            >
                              <td className="w-8 text-center">
                                {isExpanded
                                  ? <ChevronDown size={14} className="text-th-muted inline" />
                                  : <ChevronRight size={14} className="text-th-muted inline" />}
                              </td>
                              <td className="font-mono text-xs text-siemens-accent font-medium">{cr.name}</td>
                              <td>
                                <span className={`badge ${
                                  cr.assessmentOutcome === 'Clear' ? 'badge-green' :
                                  cr.assessmentOutcome === 'Flagged' ? 'badge-yellow' :
                                  cr.assessmentOutcome === 'Blocked' ? 'badge-red' : 'badge-gray'
                                }`}>
                                  {cr.assessmentOutcome || '--'}
                                </span>
                              </td>
                              <td className="text-th-secondary">{cr.account?.name || '--'}</td>
                              <td className="text-th-muted text-xs">{cr.quote?.quoteNumber || '--'}</td>
                              <td className="text-th-muted text-xs whitespace-nowrap">
                                {cr.createdDate ? new Date(cr.createdDate).toLocaleDateString() : '--'}
                              </td>
                              <td>
                                {cr.createdByAgent ? (
                                  <span className="badge badge-blue text-[9px]">AI Agent</span>
                                ) : (
                                  <span className="text-th-faint text-xs">Manual</span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="bg-surface-bg border-b border-surface-border p-0">
                                  <div className="px-6 py-4 space-y-3">
                                    <div className="flex justify-end">
                                      <SalesforceLink recordId={cr.id} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-1">Compliance Status</div>
                                        <span className={`badge ${
                                          cr.complianceStatus === 'Clear' ? 'badge-green' :
                                          cr.complianceStatus === 'Flagged' ? 'badge-yellow' :
                                          cr.complianceStatus === 'Blocked' ? 'badge-red' :
                                          cr.complianceStatus === 'Pending Review' ? 'badge-orange' : 'badge-gray'
                                        }`}>
                                          {cr.complianceStatus || 'Pending Review'}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-1">Data Sources</div>
                                        <div className="text-xs text-th-muted">{cr.dataSources || 'Not specified'}</div>
                                      </div>
                                    </div>
                                    {cr.screeningDetails && (
                                      <div>
                                        <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-1">Screening Details</div>
                                        <div className="text-xs text-th-muted bg-surface-card rounded-md p-3 border border-surface-border whitespace-pre-wrap max-h-40 overflow-y-auto">
                                          {cr.screeningDetails}
                                        </div>
                                      </div>
                                    )}
                                    {cr.account && (
                                      <div>
                                        <div className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-1">Account Details</div>
                                        <div className="text-xs text-th-muted">
                                          {cr.account.name}{cr.account.country ? ` — ${cr.account.country}` : ''}
                                          {cr.account.embargoFlag && (
                                            <span className="ml-2 badge badge-red text-[9px]">Embargo Flagged</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {/* Slack Collaboration */}
                                    <div className="mt-2">
                                      <SlackFeed
                                        channelName={getSlackChannelName('compliance', cr.name)}
                                        recordLabel={cr.name}
                                        recordType="compliance"
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Embargoed Countries Tab */}
      {activeTab === 'embargoes' && (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
              Active Trade Embargoes
            </h2>
            <span className="text-[10px] text-th-muted">{complianceData?.embargoedCountries?.length || 0} countries</span>
          </div>
          <div className="section-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Effective Date</th>
                    <th>Restriction Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(complianceData?.embargoedCountries || []).map((ec, i) => (
                    <tr key={i}>
                      <td className="text-th-secondary font-medium">
                        <div className="flex items-center">
                          <CountryFlag code={ec.countryCode} />
                          {ec.countryName}
                        </div>
                      </td>
                      <td className="font-mono text-xs text-th-muted">{ec.countryCode}</td>
                      <td>
                        <span className="badge badge-red">Embargoed</span>
                      </td>
                      <td className="text-th-muted text-xs whitespace-nowrap">
                        {ec.effectiveDate ? new Date(ec.effectiveDate).toLocaleDateString() : '--'}
                      </td>
                      <td className="text-th-muted text-xs max-w-[300px] truncate">
                        {ec.restrictionNotes || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Restricted Parties Tab */}
      {activeTab === 'parties' && (
        <>
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
            <input
              type="text"
              placeholder="Search restricted parties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-th-faint"
            />
          </div>
          <div className="section-card">
            <div className="section-card-header">
              <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
                Active Restricted Parties
              </h2>
              <span className="text-[10px] text-th-muted">{filteredParties.length} entities</span>
            </div>
            <div className="section-card-body p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Entity Name</th>
                      <th>Country</th>
                      <th>Restriction Type</th>
                      <th>Source List</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParties.map((rp, i) => (
                      <tr key={i}>
                        <td className="text-th-secondary font-medium text-sm">{rp.entityName}</td>
                        <td className="text-th-muted">
                          <div className="flex items-center">
                            <CountryFlag code={rp.country} />
                            {rp.country}
                          </div>
                        </td>
                        <td>
                          <RestrictionBadge type={rp.restrictionType} />
                        </td>
                        <td className="text-th-muted text-xs">{rp.sourceList || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ECCN Classifications Tab */}
      {activeTab === 'eccn' && (
        <>
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
            <input
              type="text"
              placeholder="Search ECCN codes or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-th-faint"
            />
          </div>
          <div className="section-card">
            <div className="section-card-header">
              <h2 className="text-[11px] font-semibold text-th-muted uppercase tracking-[0.1em]">
                ECCN / HS Code Classifications
              </h2>
              <span className="text-[10px] text-th-muted">{filteredEccn.length} classifications</span>
            </div>
            <div className="section-card-body p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ECCN Code</th>
                      <th>HS Code</th>
                      <th>Product Category</th>
                      <th>Control Reason</th>
                      <th>License Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEccn.map((ec, i) => (
                      <tr key={i}>
                        <td className="font-mono text-sm text-siemens-accent font-medium">{ec.eccnCode}</td>
                        <td className="font-mono text-xs text-th-muted">{ec.hsCode || '--'}</td>
                        <td className="text-th-secondary text-sm">{ec.productCategory || '--'}</td>
                        <td className="text-th-muted text-xs max-w-[200px] truncate">{ec.controlReason || '--'}</td>
                        <td>
                          {ec.licenseRequired ? (
                            <span className="badge badge-red">Required</span>
                          ) : (
                            <span className="badge badge-green">NLR</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Order Screening Tab */}
      {activeTab === 'orders' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Passed</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{passedChecks}</div>
              <div className="text-xs text-th-muted">of {totalChecks} total checks</div>
            </div>
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-amber-400" />
                <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Pending</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">{pendingChecks}</div>
              <div className="text-xs text-th-muted">awaiting verification</div>
            </div>
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-1">
                <XCircle size={14} className="text-red-400" />
                <span className="text-[10px] text-th-muted uppercase tracking-wider font-semibold">Flagged</span>
              </div>
              <div className="text-2xl font-bold text-red-400">{failedChecks}</div>
              <div className="text-xs text-th-muted">requires attention</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-th-secondary focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-th-faint"
            />
          </div>

          {/* Order Compliance Cards */}
          <div className="space-y-3">
            {orders.map((order, i) => {
              const checks = ORDER_CHECKS.map((c) => ({ ...c, status: deriveCheckStatus(order, c.id) }));
              const allPassed = checks.every((c) => c.status === 'passed');
              const hasFailed = checks.some((c) => c.status === 'failed');
              const isExpanded = expandedOrder === (order.id || i);

              return (
                <div key={order.id || i} className="section-card">
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id || i)}
                    className="w-full section-card-header cursor-pointer hover:bg-[var(--overlay-hover)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        allPassed ? 'bg-emerald-500/20 text-emerald-400' :
                        hasFailed ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {allPassed ? <CheckCircle2 size={16} /> : hasFailed ? <XCircle size={16} /> : <Clock size={16} />}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-th-secondary">
                          {order.orderNumber || '--'} &middot; {order.customer}
                        </div>
                        <div className="text-[10px] text-th-muted">
                          {order.product || 'Veloce System'} &middot; {checks.filter((c) => c.status === 'passed').length}/{checks.length} checks passed
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${allPassed ? 'badge-green' : hasFailed ? 'badge-red' : 'badge-yellow'}`}>
                        {allPassed ? 'Cleared' : hasFailed ? 'Flagged' : 'Pending'}
                      </span>
                      {isExpanded ? <ChevronDown size={14} className="text-th-muted" /> : <ChevronRight size={14} className="text-th-muted" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="section-card-body border-t border-surface-border">
                      <div className="space-y-3">
                        {checks.map((check) => {
                          const CheckIcon = check.icon;
                          return (
                            <div key={check.id} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                              <div className="flex items-center gap-3">
                                <CheckIcon size={14} className="text-th-muted" />
                                <div>
                                  <div className="text-sm text-th-secondary">{check.label}</div>
                                  <div className="text-[10px] text-th-muted">{check.description}</div>
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
        </>
      )}
    </div>
  );
}
