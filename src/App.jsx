import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardView from './components/DashboardView';
import AssetsView from './components/AssetsView';
import AssetDetail from './components/AssetDetail';
import CapacityView from './components/CapacityView';
import TelemetryView from './components/TelemetryView';
import FinancialsView from './components/FinancialsView';
import WorkOrdersView from './components/WorkOrdersView';
import OrdersView from './components/OrdersView';
import TravelerView from './components/TravelerView';
import ComplianceChecklist from './components/ComplianceChecklist';
import COGSReconciliation from './components/COGSReconciliation';
import SpareInventory from './components/SpareInventory';
import FailureTimeline from './components/FailureTimeline';
import AllocationTimeline from './components/AllocationTimeline';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardView />} />
        <Route path="/assets" element={<AssetsView />} />
        <Route path="/assets/:assetId" element={<AssetDetail />} />
        <Route path="/capacity" element={<CapacityView />} />
        <Route path="/capacity/allocations" element={<AllocationTimeline />} />
        <Route path="/telemetry" element={<TelemetryView />} />
        <Route path="/financials" element={<FinancialsView />} />
        <Route path="/financials/cogs" element={<COGSReconciliation />} />
        <Route path="/workorders" element={<WorkOrdersView />} />
        <Route path="/workorders/failures" element={<FailureTimeline />} />
        <Route path="/workorders/spares" element={<SpareInventory />} />
        <Route path="/orders" element={<OrdersView />} />
        <Route path="/orders/travelers" element={<TravelerView />} />
        <Route path="/orders/compliance" element={<ComplianceChecklist />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
