import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <Layout>
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<DashboardView />} />
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
        <Route path="/vignettes" element={<VignetteIndex />} />
        <Route path="/vignettes/order-close" element={<Vignette1 />} />
        <Route path="/vignettes/capacity" element={<Vignette2 />} />
        <Route path="/vignettes/finance" element={<Vignette3 />} />
        <Route path="/vignettes/traveler" element={<Vignette4 />} />
        <Route path="/vignettes/platform" element={<Vignette5 />} />
        <Route path="/vignettes/automation" element={<Vignette6 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </Layout>
  );
}
