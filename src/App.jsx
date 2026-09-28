import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardView from './components/DashboardView';
import AssetsView from './components/AssetsView';
import AssetDetail from './components/AssetDetail';
import CapacityView from './components/CapacityView';
import TelemetryView from './components/TelemetryView';
import FinancialsView from './components/FinancialsView';
import WorkOrdersView from './components/WorkOrdersView';
import WorkOrderDetail from './components/WorkOrderDetail';
import OrdersView from './components/OrdersView';
import OrderDetail from './components/OrderDetail';
import TravelerView from './components/TravelerView';
import ComplianceChecklist from './components/ComplianceChecklist';
import COGSReconciliation from './components/COGSReconciliation';
import SpareInventory from './components/SpareInventory';
import FailureTimeline from './components/FailureTimeline';
import AllocationTimeline from './components/AllocationTimeline';
import CapacityForecast from './components/CapacityForecast';
import LoanerConversionView from './components/LoanerConversionView';
import ManufacturerPortalView from './components/ManufacturerPortalView';
import VignetteIndex from './components/vignettes/VignetteIndex';
import Vignette1 from './components/vignettes/Vignette1';
import Vignette2 from './components/vignettes/Vignette2';
import Vignette3 from './components/vignettes/Vignette3';
import Vignette4 from './components/vignettes/Vignette4';
import Vignette5 from './components/vignettes/Vignette5';
import Vignette6 from './components/vignettes/Vignette6';
import Vignette7 from './components/vignettes/Vignette7';

// Redirect legacy /vignettes(/sub-path) links to their new /capabilities
// equivalent, preserving whatever sub-path followed so old bookmarks and
// external links keep working after the URL rename.
function VignettesRedirect() {
  const { pathname, search, hash } = useLocation();
  const target = pathname.replace(/^\/vignettes/, '/capabilities') + search + hash;
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <Layout>
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/capabilities" replace />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/assets" element={<AssetsView />} />
        <Route path="/assets/loaners" element={<LoanerConversionView />} />
        <Route path="/assets/:assetId" element={<AssetDetail />} />
        <Route path="/capacity" element={<CapacityView />} />
        <Route path="/capacity/allocations" element={<AllocationTimeline />} />
        <Route path="/capacity/forecast" element={<CapacityForecast />} />
        <Route path="/telemetry" element={<TelemetryView />} />
        <Route path="/financials" element={<FinancialsView />} />
        <Route path="/financials/cogs" element={<COGSReconciliation />} />
        <Route path="/workorders" element={<WorkOrdersView />} />
        <Route path="/workorders/manufacturer" element={<ManufacturerPortalView />} />
        <Route path="/workorders/failures" element={<FailureTimeline />} />
        <Route path="/workorders/spares" element={<SpareInventory />} />
        <Route path="/workorders/:workOrderId" element={<WorkOrderDetail />} />
        <Route path="/orders" element={<OrdersView />} />
        <Route path="/orders/travelers" element={<TravelerView />} />
        <Route path="/orders/compliance" element={<ComplianceChecklist />} />
        <Route path="/orders/:orderId" element={<OrderDetail />} />
        <Route path="/capabilities" element={<VignetteIndex />} />
        <Route path="/capabilities/order-close" element={<Vignette1 />} />
        <Route path="/capabilities/capacity" element={<Vignette2 />} />
        <Route path="/capabilities/finance" element={<Vignette3 />} />
        <Route path="/capabilities/traveler" element={<Vignette4 />} />
        <Route path="/capabilities/platform" element={<Vignette5 />} />
        <Route path="/capabilities/accounts" element={<Vignette6 />} />
        <Route path="/capabilities/automation" element={<Vignette7 />} />
        {/* Legacy URL redirects — keep old /vignettes links working */}
        <Route path="/vignettes/*" element={<VignettesRedirect />} />
        <Route path="*" element={<Navigate to="/capabilities" replace />} />
      </Routes>
      </ErrorBoundary>
    </Layout>
  );
}
