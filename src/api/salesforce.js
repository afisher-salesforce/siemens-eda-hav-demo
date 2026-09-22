/**
 * Salesforce API Client
 *
 * All requests go through the Express proxy at /api/hav/*
 * which forwards to Salesforce Apex REST endpoints.
 */

const BASE = '/api/hav';

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || `Request failed: ${response.status}`;
      } catch {
        errorMessage = errorText || `Request failed: ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your connection.');
    }
    throw err;
  }
}

/**
 * Get dashboard summary: totals, alerts, recent activity
 */
export function getDashboardSummary() {
  return request('/dashboard-summary');
}

/**
 * Get all assets with optional filters
 * @param {Object} filters - { location, customer, status }
 */
export function getAssets(filters = {}) {
  const params = new URLSearchParams();
  if (filters.location) params.set('location', filters.location);
  if (filters.customer) params.set('customer', filters.customer);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return request(`/assets${qs ? `?${qs}` : ''}`);
}

/**
 * Get capacity data for a specific location (or all locations)
 * @param {string} [locationId] - Optional location ID
 */
export function getCapacity(locationId) {
  const path = locationId ? `/capacity?locationId=${locationId}` : '/capacity';
  return request(path);
}

/**
 * Get telemetry readings for an asset
 * @param {string} [assetId] - Optional asset ID
 * @param {number} [limit] - Number of records to return
 */
export function getTelemetry(assetId, limit) {
  const params = new URLSearchParams();
  if (assetId) params.set('assetId', assetId);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return request(`/telemetry${qs ? `?${qs}` : ''}`);
}

/**
 * Get financial data: revenue, costs, lease breakdown
 */
export function getFinancials() {
  return request('/financials');
}

/**
 * Get work orders with optional filters
 * @param {Object} filters - { priority, status }
 */
export function getWorkOrders(filters = {}) {
  const params = new URLSearchParams();
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return request(`/workorders${qs ? `?${qs}` : ''}`);
}

/**
 * Get sales orders / agreements
 */
export function getOrders() {
  return request('/orders');
}

export default {
  getDashboardSummary,
  getAssets,
  getCapacity,
  getTelemetry,
  getFinancials,
  getWorkOrders,
  getOrders,
};
