import React, { useState, useMemo } from 'react';
import { Search, ShoppingCart, AlertTriangle } from 'lucide-react';
import { getOrders } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

function StatusBadge({ status }) {
  const styles = {
    Draft: 'badge-gray',
    Submitted: 'badge-blue',
    Approved: 'badge-teal',
    Active: 'badge-green',
    Fulfilled: 'badge-green',
    Cancelled: 'badge-red',
    Expired: 'badge-yellow',
    Pending: 'badge-yellow',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status || '--'}</span>;
}

function formatCurrency(value) {
  if (value == null) return '--';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export default function OrdersView() {
  const { data, loading, error, refetch } = useSalesforceData(getOrders);
  const [searchTerm, setSearchTerm] = useState('');

  const orders = data || [];

  const filtered = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(term)) ||
        (o.customer && o.customer.toLowerCase().includes(term)) ||
        (o.product && o.product.toLowerCase().includes(term)) ||
        (o.agreementName && o.agreementName.toLowerCase().includes(term))
    );
  }, [orders, searchTerm]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Orders</h3>
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
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-card text-gray-300 focus:outline-none focus:ring-2 focus:ring-siemens-teal/30 focus:border-siemens-teal/50 placeholder:text-gray-600"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto text-xs text-gray-500">
          <ShoppingCart size={12} />
          <span>{loading ? 'Loading...' : `${filtered.length} orders`}</span>
        </div>
      </div>

      {/* Table */}
      <div className="section-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton w-full h-10" />
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Agreement</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total Value</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((order, i) => (
                    <tr key={order.id || i}>
                      <td className="font-medium text-siemens-accent whitespace-nowrap">
                        {order.orderNumber || '--'}
                      </td>
                      <td className="text-gray-200">{order.agreementName || '--'}</td>
                      <td className="text-gray-400">{order.customer || '--'}</td>
                      <td className="text-gray-400">{order.product || '--'}</td>
                      <td className="text-gray-300 text-center">{order.quantity ?? '--'}</td>
                      <td className="font-medium text-white">
                        {formatCurrency(order.totalValue)}
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {order.startDate
                          ? new Date(order.startDate).toLocaleDateString()
                          : '--'}
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {order.endDate
                          ? new Date(order.endDate).toLocaleDateString()
                          : '--'}
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-600">
                      No orders match the current search
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
