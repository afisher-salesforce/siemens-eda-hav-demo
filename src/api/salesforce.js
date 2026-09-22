/**
 * Salesforce API Client
 *
 * All requests go through the Express proxy at /api/hav/*
 * which forwards to Salesforce Apex REST endpoints.
 *
 * Transform functions map Apex PascalCase responses to the
 * camelCase format React components expect.
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

// ─── Transform helpers ───────────────────────────────────────

/**
 * Dashboard: Apex returns flat object → React expects { metrics, locationCapacity, recentAlerts, contractRenewals }
 */
function transformDashboard(raw) {
  if (!raw) return null;

  const metrics = {
    totalAssets: raw.totalAssets,
    activeAssets: raw.activeAssets,
    avgUtilization: raw.avgUtilization,
    criticalAlerts: raw.criticalAlerts,
    openWorkOrders: raw.openWorkOrders,
    revenueEstimate: raw.revenueEstimate,
    upcomingRenewals: raw.upcomingRenewals,
  };

  const locations = raw.locations || [];
  const locationCapacity = locations.map((loc) => {
    const totalRacks = loc.TotalRackCapacity || 0;
    const assetCount = loc.assetCount || 0;
    return {
      name: loc.Name || '--',
      occupancy: totalRacks > 0 ? Math.round((assetCount / totalRacks) * 100) : 0,
    };
  });

  return {
    metrics,
    locationCapacity,
    recentAlerts: [],
    contractRenewals: [],
  };
}

/**
 * Assets: Apex PascalCase array → React camelCase array
 */
function transformAssets(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((a) => ({
    id: a.Id,
    name: a.Name,
    serialNumber: a.SerialNumber,
    status: a.Status,
    installDate: a.InstallDate,
    product: a.ProductName,
    customer: a.AccountName,
    location: a.LocationName,
    rackPosition: a.RackPosition,
    powerDraw: a.PowerDrawKW,
    utilization: a.UtilizationPct,
    contractEnd: a.ContractEndDate,
    leaseType: a.LeaseType,
  }));
}

/**
 * Capacity: Apex { forecasts, locations } PascalCase → React { forecast, locations } camelCase
 */
function transformCapacity(raw) {
  if (!raw) return { locations: [], forecast: [] };

  const apexLocations = raw.locations || [];
  const apexForecasts = raw.forecasts || [];

  const occupiedByLocation = {};
  for (const f of apexForecasts) {
    const locId = f.LocationId;
    if (locId) {
      occupiedByLocation[locId] = f.OccupiedRacks || 0;
    }
  }

  const locations = apexLocations.map((loc) => {
    const totalRacks = loc.TotalRackCapacity || 0;
    const usedRacks = occupiedByLocation[loc.Id] || 0;
    const totalPowerKw = loc.PowerCapacityKW || 0;
    const usedPowerKw = totalRacks > 0 ? (usedRacks / totalRacks) * totalPowerKw : 0;

    return {
      id: loc.Id,
      name: loc.Name,
      totalRacks,
      usedRacks,
      totalPowerKw,
      usedPowerKw,
      pue: loc.PUE,
    };
  });

  const forecast = apexForecasts.map((f) => {
    const totalRacks = f.TotalRacks || 0;
    const occupied = f.OccupiedRacks || 0;
    const available = totalRacks - occupied;
    let quarter = '--';
    if (f.PeriodStart) {
      const d = new Date(f.PeriodStart);
      const q = Math.ceil((d.getMonth() + 1) / 3);
      quarter = `Q${q} ${d.getFullYear()}`;
    }

    return {
      location: f.LocationName || '--',
      quarter,
      currentRacks: occupied,
      projectedDemand: f.ProjectedDemand || 0,
      available,
    };
  });

  return { locations, forecast };
}

/**
 * Telemetry: Apex PascalCase array → React camelCase array
 */
function transformTelemetry(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((t) => ({
    assetName: t.AssetName,
    assetId: t.AssetId,
    timestamp: t.Timestamp,
    cpuPercent: t.CPUUtilization,
    memoryPercent: t.MemoryUtilization,
    temperature: t.TemperatureC,
    status: t.Status,
    jobs: t.ActiveVerificationJobs,
    errors: t.ErrorCount,
  }));
}

/**
 * Work Orders: Apex PascalCase → React camelCase
 */
function transformWorkOrders(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((wo) => ({
    id: wo.Id,
    workOrderNumber: wo.WorkOrderNumber,
    subject: wo.Subject,
    status: wo.Status,
    priority: wo.Priority,
    assetName: wo.AssetName,
    customer: wo.AccountName,
    rmaNumber: wo.RMANumber,
    vendor: wo.Vendor,
    estimatedCost: wo.EstimatedRepairCost,
    createdDate: wo.CreatedDate,
  }));
}

/**
 * Financials: Apex nested structure → React structured data
 */
function transformFinancials(raw) {
  if (!raw) return null;

  const revenue = {
    total: raw.totalMonthlyRevenue != null ? raw.totalMonthlyRevenue * 12 : null,
    monthlyRecurring: raw.totalMonthlyRevenue,
    period: 'Annual estimate',
  };

  const revenueByProduct = raw.revenueByProduct || {};
  const productBreakdown = Object.entries(revenueByProduct).map(([product, data]) => ({
    product,
    revenue: data.monthlyRevenue || 0,
  }));

  const assetsByLeaseType = raw.assetsByLeaseType || {};
  const leaseBreakdown = Object.entries(assetsByLeaseType).map(([leaseType, count]) => ({
    leaseType,
    count,
  }));

  const openRepairCosts = raw.openRepairCosts || {};
  const repairCosts = {
    total: openRepairCosts.totalEstimatedCost,
    openCount: openRepairCosts.openWorkOrderCount,
  };

  return {
    revenue,
    productBreakdown,
    leaseBreakdown,
    repairCosts,
  };
}

/**
 * Orders: Apex PascalCase → React camelCase
 */
function transformOrders(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((o) => ({
    id: o.Id,
    orderNumber: o.Name,
    agreementName: o.Source === 'SalesAgreement' ? o.Name : null,
    customer: o.AccountName,
    product: null,
    quantity: null,
    totalValue: o.TotalAmount,
    startDate: o.StartDate,
    endDate: o.EndDate,
    status: o.Status,
  }));
}

// ─── Exported API functions ──────────────────────────────────

/**
 * Get dashboard summary: totals, alerts, recent activity
 */
export async function getDashboardSummary() {
  const raw = await request('/dashboard-summary');
  return transformDashboard(raw);
}

/**
 * Get all assets with optional filters
 * @param {Object} filters - { location, customer, status }
 */
export async function getAssets(filters = {}) {
  const params = new URLSearchParams();
  if (filters.location) params.set('location', filters.location);
  if (filters.customer) params.set('customer', filters.customer);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  const raw = await request(`/assets${qs ? `?${qs}` : ''}`);
  return transformAssets(raw);
}

/**
 * Get capacity data for a specific location (or all locations)
 * @param {string} [locationId] - Optional location ID
 */
export async function getCapacity(locationId) {
  const path = locationId ? `/capacity?locationId=${locationId}` : '/capacity';
  const raw = await request(path);
  return transformCapacity(raw);
}

/**
 * Get telemetry readings for an asset
 * @param {string} [assetId] - Optional asset ID
 * @param {number} [limit] - Number of records to return
 */
export async function getTelemetry(assetId, limit) {
  const params = new URLSearchParams();
  if (assetId) params.set('assetId', assetId);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const raw = await request(`/telemetry${qs ? `?${qs}` : ''}`);
  return transformTelemetry(raw);
}

/**
 * Get financial data: revenue, costs, lease breakdown
 */
export async function getFinancials() {
  const raw = await request('/financials');
  return transformFinancials(raw);
}

/**
 * Get work orders with optional filters
 * @param {Object} filters - { priority, status }
 */
export async function getWorkOrders(filters = {}) {
  const params = new URLSearchParams();
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  const raw = await request(`/workorders${qs ? `?${qs}` : ''}`);
  return transformWorkOrders(raw);
}

/**
 * Get sales orders / agreements
 */
export async function getOrders() {
  const raw = await request('/orders');
  return transformOrders(raw);
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
