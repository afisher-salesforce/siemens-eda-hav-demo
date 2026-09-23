import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, AlertTriangle, Server, RefreshCcw } from 'lucide-react';
import { getAssets, getLoaners } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';
import { useSlackChannels } from '../hooks/useSlackChannels';
import { getSlackChannelName } from '../utils/slackChannel';
import DemoContextPanel from './DemoContextPanel';
import CONTEXT from './demoContextData';

function UtilizationBadge({ value }) {
  if (value == null) return <span className="text-gray-600">--</span>;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  let badgeClass = 'badge-red';
  if (num >= 70) badgeClass = 'badge-green';
  else if (num >= 50) badgeClass = 'badge-yellow';
  return <span className={`badge ${badgeClass}`}>{num.toFixed(0)}%</span>;
}

function StatusBadge({ status }) {
  const styles = {
    Active: 'badge-green',
    Running: 'badge-green',
    Deployed: 'badge-green',
    Idle: 'badge-yellow',
    Maintenance: 'badge-orange',
    Offline: 'badge-red',
    Error: 'badge-red',
    Decommissioned: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status || '--'}</span>;
}

export default function AssetsView() {
  const { data, loading, error, refetch } = useSalesforceData(getAssets);
  const { data: loanerData } = useSalesforceData(getLoaners);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const assets = data || [];

  // Build loaner lookup set
  const loanerIds = useMemo(() => {
    if (!loanerData?.loaners) return new Set();
    return new Set(loanerData.loaners.map((l) => l.id));
  }, [loanerData]);

  const loanerStatusMap = useMemo(() => {
    if (!loanerData?.loaners) return {};
    const map = {};
    for (const l of loanerData.loaners) {
      map[l.id] = l.loanerStatus;
    }
    return map;
  }, [loanerData]);

  // Derive Slack channel names for all assets
  const slackChannelNames = useMemo(
    () => assets.map((a) => getSlackChannelName('asset', a.name)),
    [assets]
  );
  const { hasChannel: slackChannels } = useSlackChannels(slackChannelNames);

  const locations = useMemo(
    () => [...new Set(assets.map((a) => a.location).filter(Boolean))].sort(),
    [assets]
  );
  const customers = useMemo(
    () => [...new Set(assets.map((a) => a.customer).filter(Boolean))].sort(),
    [assets]
  );
  const statuses = useMemo(
    () => [...new Set(assets.map((a) => a.status).filter(Boolean))].sort(),
    [assets]
  );

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (filterLocation && a.location !== filterLocation) return false;
      if (filterCustomer && a.customer !== filterCustomer) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (a.name && a.name.toLowerCase().includes(term)) ||
          (a.serialNumber && a.serialNumber.toLowerCase().includes(term)) ||
          (a.product && a.product.toLowerCase().includes(term)) ||
          (a.customer && a.customer.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [assets, filterLocation, filterCustomer, filterStatus, searchTerm]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Assets</h3>
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
      <DemoContextPanel {...CONTEXT.assets} />
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-gray-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-500" />
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
          >
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-surface-border rounded-md px-3 py-2 bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-gray-500 ml-auto flex items-center gap-1">
          <Server size={12} />
          {loading ? 'Loading...' : `${filtered.length} assets`}
        </span>
      </div>

      {/* Table */}
      <div className="section-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton w-full h-10" />
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10 text-center"><span className="sr-only">Slack</span></th>
                  <th>Name</th>
                  <th>Serial #</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Utilization</th>
                  <th>Power (kW)</th>
                  <th>Lease Type</th>
                  <th>Contract End</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((asset, i) => {
                    const channelName = getSlackChannelName('asset', asset.name);
                    const hasSlack = channelName && slackChannels.has(channelName);
                    return (
                    <tr key={asset.id || i}>
                      <td className="text-center w-10">
                        {hasSlack && (
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full bg-siemens-teal"
                            title="Slack channel active"
                          />
                        )}
                      </td>
                      <td className="font-medium whitespace-nowrap">
                        <Link
                          to={`/assets/${asset.id}`}
                          className="text-siemens-accent hover:underline"
                        >
                          {asset.name || '--'}
                        </Link>
                      </td>
                      <td className="text-gray-500 font-mono text-xs">
                        {asset.serialNumber || '--'}
                      </td>
                      <td className="text-gray-400">{asset.product || '--'}</td>
                      <td className="text-gray-400">{asset.customer || '--'}</td>
                      <td className="text-gray-400 whitespace-nowrap">{asset.location || '--'}</td>
                      <td>
                        <StatusBadge status={asset.status} />
                      </td>
                      <td>
                        <UtilizationBadge value={asset.utilization} />
                      </td>
                      <td className="text-gray-400">
                        {asset.powerDraw != null ? asset.powerDraw.toFixed(1) : '--'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="badge badge-teal">{asset.leaseType || '--'}</span>
                          {loanerIds.has(asset.id) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20" title={`Loaner: ${loanerStatusMap[asset.id] || ''}`}>
                              <RefreshCcw size={9} />
                              Loaner
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {asset.contractEnd
                          ? new Date(asset.contractEnd).toLocaleDateString()
                          : '--'}
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-gray-600">
                      No assets match the current filters
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
