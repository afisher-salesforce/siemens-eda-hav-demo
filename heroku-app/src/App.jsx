import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardView from './components/DashboardView';
import AssetsView from './components/AssetsView';
import CapacityView from './components/CapacityView';
import TelemetryView from './components/TelemetryView';
import FinancialsView from './components/FinancialsView';
import WorkOrdersView from './components/WorkOrdersView';
import OrdersView from './components/OrdersView';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardView />} />
        <Route path="/assets" element={<AssetsView />} />
        <Route path="/capacity" element={<CapacityView />} />
        <Route path="/telemetry" element={<TelemetryView />} />
        <Route path="/financials" element={<FinancialsView />} />
        <Route path="/workorders" element={<WorkOrdersView />} />
        <Route path="/orders" element={<OrdersView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
