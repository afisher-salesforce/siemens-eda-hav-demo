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
 *
 * Apex keys: totalAssets, activeAssets, avgUtilization, upcomingRenewals,
 *            revenueEstimate, openWorkOrders, criticalAlerts,
 *            locations[].{Id, Name, TotalRackCapacity, PowerCapacityKW, PUE, assetCount}
 *
 * React expects:
 *   metrics.{totalAssets, activeAssets, avgUtilization, criticalAlerts, openWorkOrders, revenueEstimate}
 *   locationCapacity[].{name, occupancy}
 *   recentAlerts[] (from telemetry — fetched separately if needed, but provide empty default)
 *   contractRenewals[] (not in this endpoint — provide empty default)
 */
function transformDashboard(raw, telemetryRaw, assetsRaw) {
  if (!raw) return null;

  const metrics = {
    totalAssets: raw.totalAssets,
    activeAssets: raw.activeAssets,
    avgUtilization: raw.avgUtilization,
    criticalAlerts: raw.criticalAlerts,
    openWorkOrders: raw.openWorkOrders,
    revenueEstimate: raw.revenueEstimate,
    upcomingRenewals: raw.upcomingRenewals,
    activeLoaners: raw.activeLoaners,
    loanersExpiringSoon: raw.loanersExpiringSoon,
  };

  // Build locationCapacity from locations array — compute occupancy %
  const locations = raw.locations || [];
  const locationCapacity = locations.map((loc) => {
    const totalRacks = loc.TotalRackCapacity || 0;
    const assetCount = loc.assetCount || 0;
    return {
      name: loc.Name || '--',
      occupancy: totalRacks > 0 ? Math.round((assetCount / totalRacks) * 100) : 0,
    };
  });

  // Build recentAlerts from telemetry data — show Error/Warning status entries
  const recentAlerts = [];
  if (telemetryRaw && Array.isArray(telemetryRaw)) {
    telemetryRaw
      .filter((t) => t.Status === 'Error' || t.Status === 'Warning')
      .slice(0, 8)
      .forEach((t) => {
        recentAlerts.push({
          assetName: t.AssetName,
          status: t.Status,
          message: t.Status === 'Error'
            ? `${t.ErrorCount || 0} errors — CPU ${t.CPUUtilization || 0}%, Temp ${t.TemperatureC || 0}°C`
            : `High temp ${t.TemperatureC || 0}°C — CPU ${t.CPUUtilization || 0}%`,
          timestamp: t.Timestamp,
        });
      });
  }

  // Build contractRenewals from assets — contracts ending in next 180 days
  const contractRenewals = [];
  if (assetsRaw && Array.isArray(assetsRaw)) {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 180);

    // Price estimates by product for monthly value
    const PRICE_MAP = {
      'Veloce Strato': 200000,
      'Veloce Primo': 120000,
      'proFPGA': 60000,
    };

    assetsRaw
      .filter((a) => {
        if (!a.ContractEndDate) return false;
        const end = new Date(a.ContractEndDate);
        return end >= now && end <= cutoff;
      })
      .sort((a, b) => new Date(a.ContractEndDate) - new Date(b.ContractEndDate))
      .forEach((a) => {
        const prodName = a.ProductName || '';
        let monthlyValue = 0;
        for (const [tier, price] of Object.entries(PRICE_MAP)) {
          if (prodName.toLowerCase().includes(tier.toLowerCase())) {
            monthlyValue = price;
            break;
          }
        }
        contractRenewals.push({
          id: a.Id,
          customer: a.AccountName,
          assetName: a.Name,
          serialNumber: a.SerialNumber,
          product: a.ProductName,
          location: a.LocationName,
          status: a.Status,
          installDate: a.InstallDate,
          rackPosition: a.RackPosition,
          powerDraw: a.PowerDrawKW,
          utilization: a.UtilizationPct,
          contractEnd: a.ContractEndDate,
          leaseType: a.LeaseType,
          monthlyValue,
        });
      });
  }

  return {
    metrics,
    locationCapacity,
    recentAlerts,
    contractRenewals,
  };
}

/**
 * Assets: Apex returns array of PascalCase → React expects camelCase
 *
 * Apex: Id, Name, SerialNumber, Status, InstallDate, ProductName, AccountName,
 *       LocationName, RackPosition, PowerDrawKW, UtilizationPct, ContractEndDate, LeaseType
 *
 * React: id, name, serialNumber, status, installDate, product, customer,
 *        location, rackPosition, powerDraw, utilization, contractEnd, leaseType
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
 * Capacity: Apex returns { forecasts: [...], locations: [...] } PascalCase
 *
 * React expects:
 *   locations[].{id, name, totalRacks, usedRacks, totalPowerKw, usedPowerKw, pue}
 *   forecast[].{location, quarter, currentRacks, projectedDemand, available}
 *
 * Apex locations: Id, Name, TotalRackCapacity, PowerCapacityKW, PUE
 * Apex forecasts: Id, LocationId, LocationName, PeriodStart, PeriodEnd,
 *                 TotalRacks, OccupiedRacks, ProjectedDemand, Source
 */
function transformCapacity(raw) {
  if (!raw) return { locations: [], forecast: [] };

  const apexLocations = raw.locations || [];
  const apexForecasts = raw.forecasts || [];

  // Build a map of occupied racks per location from forecasts (latest period)
  const occupiedByLocation = {};
  const powerByLocation = {};
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
    // Estimate used power proportionally to rack usage
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
    // Build quarter string from PeriodStart
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
 * Telemetry: Apex returns PascalCase array → React expects camelCase
 *
 * Apex: Id, AssetId, AssetName, Timestamp, CPUUtilization, MemoryUtilization,
 *       TemperatureC, Status, ActiveVerificationJobs, ErrorCount
 *
 * React: assetName, assetId, timestamp, cpuPercent, memoryPercent,
 *        temperature, status, jobs, errors
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
 *
 * Apex: Id, WorkOrderNumber, Subject, Status, Priority, AssetName,
 *       AccountName, RMANumber, Vendor, EstimatedRepairCost, CreatedDate
 *
 * React: id, workOrderNumber, subject, status, priority, assetName,
 *        customer, rmaNumber, vendor, estimatedCost, createdDate
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
 * Financials: Apex returns nested structure → React expects structured data
 *
 * Apex: { assetsByLeaseType: {}, openRepairCosts: {totalEstimatedCost, openWorkOrderCount},
 *         revenueByProduct: {productName: {count, pricePerUnit, monthlyRevenue}},
 *         totalMonthlyRevenue, contractRenewalsDueNext90Days }
 *
 * React expects:
 *   revenue.{total, monthlyRecurring, period}
 *   productBreakdown[].{product, revenue}
 *   leaseBreakdown[].{leaseType, count}
 *   repairCosts.{total, openCount, items[]}
 */
function transformFinancials(raw) {
  if (!raw) return null;

  const revenue = {
    total: raw.totalMonthlyRevenue != null ? raw.totalMonthlyRevenue * 12 : null,
    monthlyRecurring: raw.totalMonthlyRevenue,
    period: 'Annual estimate',
  };

  // Convert revenueByProduct map to array for bar chart
  const revenueByProduct = raw.revenueByProduct || {};
  const productBreakdown = Object.entries(revenueByProduct).map(([product, data]) => ({
    product,
    revenue: data.monthlyRevenue || 0,
  }));

  // Convert assetsByLeaseType map to array for pie chart
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
 *
 * Apex (SalesAgreement source): Id, Name, Status, AccountName, StartDate, EndDate, Source
 * Apex (Order source): Id, Name (=OrderNumber), Status, AccountName, StartDate, EndDate, TotalAmount, Source
 *
 * React: id, orderNumber, agreementName, customer, product, quantity,
 *        totalValue, startDate, endDate, status
 *
 * Note: SalesAgreement records don't have TotalAmount. We estimate value from
 * contract duration × base rate so COGS reconciliation has data to work with.
 */
function transformOrders(raw) {
  if (!raw || !Array.isArray(raw)) return [];

  // Deterministic hash for consistent simulated values per record
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  return raw.map((o) => {
    let totalValue = o.TotalAmount;

    // For SalesAgreement records without TotalAmount, estimate from duration
    if (totalValue == null && o.Source === 'SalesAgreement') {
      const start = o.StartDate ? new Date(o.StartDate) : null;
      const end = o.EndDate ? new Date(o.EndDate) : null;
      if (start && end) {
        const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30)));
        // Use hash of ID for deterministic rate between 45K-150K/month
        const hash = simpleHash(o.Id || o.Name);
        const rates = [60000, 120000, 200000];
        const rate = rates[hash % rates.length];
        totalValue = rate * months;
      } else {
        // Fallback: single-year estimate
        const hash = simpleHash(o.Id || o.Name);
        totalValue = [720000, 1440000, 2400000][hash % 3];
      }
    }

    return {
      id: o.Id,
      orderNumber: o.Name,
      agreementName: o.Source === 'SalesAgreement' ? o.Name : null,
      customer: o.AccountName,
      product: null,
      quantity: null,
      totalValue,
      startDate: o.StartDate,
      endDate: o.EndDate,
      status: o.Status,
    };
  });
}

// ─── Exported API functions ──────────────────────────────────

/**
 * Get dashboard summary: totals, alerts, recent activity
 * Also fetches telemetry (for alerts) and assets (for contract renewals)
 */
export async function getDashboardSummary() {
  const [raw, telemetryRaw, assetsRaw] = await Promise.all([
    request('/dashboard-summary'),
    request('/telemetry?limit=50').catch(() => []),
    request('/assets').catch(() => []),
  ]);
  return transformDashboard(raw, telemetryRaw, assetsRaw);
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

/**
 * Global search across assets, work orders, and orders
 * @param {string} query - Search term (minimum 2 characters)
 * @returns {Object} { assets: [], workOrders: [], orders: [], totalResults: number }
 */
export async function searchAll(query) {
  if (!query || query.length < 2) {
    return { assets: [], workOrders: [], orders: [], totalResults: 0 };
  }
  const raw = await request(`/search?q=${encodeURIComponent(query)}`);
  return raw;
}

/**
 * Get loaner assets with conversion opportunity data
 * @param {Object} filters - { status }
 * @returns {Object} { loaners: [], metrics: { totalLoaners, activeLoans, conversionPending, expiringSoon, conversionPipeline } }
 */
export async function getLoaners(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  const raw = await request(`/loaners${qs ? `?${qs}` : ''}`);
  if (!raw) return { loaners: [], metrics: {} };

  // Transform loaners to camelCase
  const loaners = (raw.loaners || []).map((l) => ({
    id: l.Id,
    name: l.Name,
    serialNumber: l.SerialNumber,
    status: l.Status,
    installDate: l.InstallDate,
    product: l.ProductName,
    customer: l.AccountName,
    accountId: l.AccountId,
    location: l.LocationName,
    rackPosition: l.RackPosition,
    powerDraw: l.PowerDrawKW,
    utilization: l.UtilizationPct,
    contractEnd: l.ContractEndDate,
    leaseType: l.LeaseType,
    loanerStatus: l.LoanerStatus,
    loanerExpiryDate: l.LoanerExpiryDate,
    originalLoanerDate: l.OriginalLoanerDate,
    daysUntilExpiry: l.DaysUntilExpiry,
    monthsOnLoan: l.MonthsOnLoan,
    conversionOpportunity: l.ConversionOpportunity
      ? {
          id: l.ConversionOpportunity.Id,
          name: l.ConversionOpportunity.Name,
          stageName: l.ConversionOpportunity.StageName,
          amount: l.ConversionOpportunity.Amount,
          closeDate: l.ConversionOpportunity.CloseDate,
        }
      : null,
  }));

  return {
    loaners,
    metrics: {
      totalLoaners: raw.metrics?.totalLoaners || 0,
      activeLoans: raw.metrics?.activeLoans || 0,
      conversionPending: raw.metrics?.conversionPending || 0,
      expiringSoon: raw.metrics?.expiringSoon || 0,
      conversionPipeline: raw.metrics?.conversionPipeline || 0,
    },
  };
}

/**
 * Get asset lineage (replacement chain) for a specific asset
 * @param {string} assetId - Salesforce Asset ID
 * @returns {Object} { assetId, lineage: [{type, date, reason, notes, workOrderNumber, asset: {id, name, serialNumber, status, product}}], hasPredecessors, hasSuccessors }
 */
export async function getAssetLineage(assetId) {
  if (!assetId) return { assetId: null, lineage: [], hasPredecessors: false, hasSuccessors: false };
  const raw = await request(`/asset-lineage?assetId=${encodeURIComponent(assetId)}`);
  if (!raw) return { assetId, lineage: [], hasPredecessors: false, hasSuccessors: false };

  const lineage = (raw.lineage || []).map((entry) => ({
    type: entry.type,
    replacementId: entry.replacementId,
    replacementName: entry.replacementName,
    date: entry.date,
    reason: entry.reason,
    notes: entry.notes,
    workOrderNumber: entry.workOrderNumber,
    asset: entry.asset
      ? {
          id: entry.asset.id,
          name: entry.asset.name,
          serialNumber: entry.asset.serialNumber,
          status: entry.asset.status,
          product: entry.asset.product,
        }
      : null,
  }));

  return {
    assetId: raw.assetId,
    lineage,
    hasPredecessors: raw.hasPredecessors || false,
    hasSuccessors: raw.hasSuccessors || false,
  };
}

/**
 * Get trade compliance data: embargoed countries, restricted parties, ECCN classifications, compliance records
 * @returns {Object} { complianceRecords, embargoedCountries, restrictedParties, eccnClassifications, flaggedAccounts, metrics }
 */
export async function getComplianceData() {
  const raw = await request('/compliance');
  if (!raw) return { complianceRecords: [], embargoedCountries: [], restrictedParties: [], eccnClassifications: [], flaggedAccounts: [], metrics: {} };

  return {
    complianceRecords: (raw.complianceRecords || []).map((cr) => ({
      id: cr.Id,
      name: cr.Name,
      assessmentOutcome: cr.AssessmentOutcome,
      complianceStatus: cr.ComplianceStatus,
      screeningDetails: cr.ScreeningDetails,
      dataSources: cr.DataSources,
      createdByAgent: cr.CreatedByAgent,
      createdDate: cr.CreatedDate,
      account: cr.Account ? { id: cr.Account.Id, name: cr.Account.Name, country: cr.Account.Country, embargoFlag: cr.Account.EmbargoFlag } : null,
      quote: cr.Quote ? { quoteNumber: cr.Quote.QuoteNumber, name: cr.Quote.Name } : null,
    })),
    embargoedCountries: (raw.embargoedCountries || []).map((ec) => ({
      countryCode: ec.CountryCode,
      countryName: ec.CountryName,
      isEmbargoed: ec.IsEmbargoed,
      restrictionNotes: ec.RestrictionNotes,
      effectiveDate: ec.EffectiveDate,
    })),
    restrictedParties: (raw.restrictedParties || []).map((rp) => ({
      entityName: rp.EntityName,
      country: rp.Country,
      restrictionType: rp.RestrictionType,
      sourceList: rp.SourceList,
    })),
    eccnClassifications: (raw.eccnClassifications || []).map((ec) => ({
      eccnCode: ec.ECCNCode,
      hsCode: ec.HSCode,
      controlReason: ec.ControlReason,
      productCategory: ec.ProductCategory,
      licenseRequired: ec.LicenseRequired,
    })),
    flaggedAccounts: (raw.flaggedAccounts || []).map((a) => ({
      id: a.Id,
      name: a.Name,
      country: a.Country,
      embargoReason: a.EmbargoReason,
      embargoDate: a.EmbargoDate,
    })),
    metrics: {
      totalRecords: raw.metrics?.totalRecords || 0,
      embargoedCountries: raw.metrics?.embargoedCountries || 0,
      restrictedParties: raw.metrics?.restrictedParties || 0,
      eccnClassifications: raw.metrics?.eccnClassifications || 0,
      flaggedAccounts: raw.metrics?.flaggedAccounts || 0,
      clearRecords: raw.metrics?.clearRecords || 0,
      flaggedRecords: raw.metrics?.flaggedRecords || 0,
      blockedRecords: raw.metrics?.blockedRecords || 0,
    },
  };
}

/**
 * Get manufacturer portal data: work orders with vendor summaries and cost breakdowns
 * @param {Object} filters - { vendor }
 */
export async function getManufacturerData(filters = {}) {
  const params = new URLSearchParams();
  if (filters.vendor) params.set('vendor', filters.vendor);
  const qs = params.toString();
  const raw = await request(`/manufacturer${qs ? `?${qs}` : ''}`);
  if (!raw) return { workOrders: [], vendorSummary: [], metrics: {} };

  return {
    workOrders: (raw.workOrders || []).map((wo) => ({
      id: wo.Id,
      workOrderNumber: wo.WorkOrderNumber,
      subject: wo.Subject,
      status: wo.Status,
      priority: wo.Priority,
      assetName: wo.AssetName,
      serialNumber: wo.SerialNumber,
      productName: wo.ProductName,
      customer: wo.AccountName,
      rmaNumber: wo.RMANumber,
      vendor: wo.Vendor,
      estimatedCost: wo.EstimatedRepairCost,
      partsCost: wo.PartsCost,
      laborCost: wo.LaborCost,
      turnaroundDays: wo.TurnaroundDays,
      createdDate: wo.CreatedDate,
      startDate: wo.StartDate,
      endDate: wo.EndDate,
    })),
    vendorSummary: (raw.vendorSummary || []).map((v) => ({
      vendor: v.vendor,
      totalOrders: v.totalOrders,
      openOrders: v.openOrders,
      completedOrders: v.completedOrders,
      totalCost: v.totalCost,
      avgCost: v.avgCost,
    })),
    metrics: {
      totalWorkOrders: raw.metrics?.totalWorkOrders || 0,
      openWorkOrders: raw.metrics?.openWorkOrders || 0,
      completedWorkOrders: raw.metrics?.completedWorkOrders || 0,
      totalCost: raw.metrics?.totalCost || 0,
      totalPartsCost: raw.metrics?.totalPartsCost || 0,
      totalLaborCost: raw.metrics?.totalLaborCost || 0,
      vendorCount: raw.metrics?.vendorCount || 0,
    },
  };
}

/**
 * Update a work order's status (or priority)
 * @param {string} workOrderId - Salesforce WorkOrder ID
 * @param {Object} fields - { status, priority }
 * @returns {Object} Updated work order data
 */
export async function updateWorkOrderStatus(workOrderId, fields) {
  return request(`/workorders/${workOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

/**
 * Get cases for emulation system assets
 * @param {Object} filters - { assetId }
 * @returns {Array} Transformed case records
 */
export async function getCases(filters = {}) {
  const params = new URLSearchParams();
  if (filters.assetId) params.set('assetId', filters.assetId);
  const qs = params.toString();
  const raw = await request(`/cases${qs ? `?${qs}` : ''}`);
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((c) => ({
    id: c.Id,
    caseNumber: c.CaseNumber,
    subject: c.Subject,
    status: c.Status,
    priority: c.Priority,
    type: c.Type,
    createdDate: c.CreatedDate,
    assetId: c.AssetId,
    assetName: c.AssetName,
    customer: c.AccountName,
  }));
}

/**
 * Create a Case or WorkOrder linked to an asset
 * @param {Object} params - { recordType: 'Case'|'WorkOrder', assetId, subject, description, priority }
 * @returns {Object} Created record data
 */
export async function createAssetRecord(params) {
  return request('/assets', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export default {
  getDashboardSummary,
  getAssets,
  getCapacity,
  getTelemetry,
  getFinancials,
  getWorkOrders,
  getOrders,
  searchAll,
  getLoaners,
  getAssetLineage,
  getComplianceData,
  getManufacturerData,
  updateWorkOrderStatus,
  getCases,
  createAssetRecord,
};
