import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import MasterData from './pages/MasterData';
import EventLogs from './pages/EventLogs';
import AdminSettings from './pages/AdminSettings';
import Reports from './pages/Reports';
import Messages from './pages/Messages';

// PM Pages
import PMFarmerManagement from '../production-manager/pages/FarmerManagement';
import PMCropPlanning from '../production-manager/pages/CropPlanning';
import PMInventoryManagement from '../production-manager/pages/InventoryManagement';
import PMTraceability from '../production-manager/pages/Traceability';
import PMRoomManagement from '../production-manager/pages/RoomManagement';
import PMQCInsights from '../production-manager/pages/QCInsights';

import PMAnalytics from '../production-manager/pages/AnalyticsReporting';
import { PMProvider } from '@/context/PMContext';

// FM Pages
import FMCropPlanning from '../farm-manager/pages/CropPlanning';
import FMYieldForecasting from '../farm-manager/pages/YieldForecasting';
import FMPerformance from '../farm-manager/pages/Performance';

// QC Pages
import QCProcessing from '../qc-officer/pages/Processing';
import QCColdRoom from '../qc-officer/pages/ColdRoom';
import QCHome from '../qc-officer/pages/Home';
import QCIntake from '../qc-officer/pages/Intake';

// Logistics Pages
import LogPendingPickups from '../logistics-officer/pages/PendingPickups';
import LogShipments from '../logistics-officer/pages/Shipments';
import LogDocuments from '../logistics-officer/pages/Documents';
import LogDashboard from '../logistics-officer/pages/Dashboard';
import LogFleet from '../logistics-officer/pages/Fleet';

const AdminRoutes = () => (
    <Routes>
        <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="master-data" element={<MasterData />} />
            <Route path="event-logs" element={<EventLogs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="messages" element={<Messages />} />

            {/* Production Manager Sub-routes */}
            <Route path="pm/farmers" element={<PMProvider><PMFarmerManagement /></PMProvider>} />
            <Route path="pm/crop-planning" element={<PMProvider><PMCropPlanning /></PMProvider>} />
            <Route path="pm/inventory" element={<PMProvider><PMInventoryManagement /></PMProvider>} />
            <Route path="pm/traceability" element={<PMProvider><PMTraceability /></PMProvider>} />
            <Route path="pm/rooms" element={<PMProvider><PMRoomManagement /></PMProvider>} />
            <Route path="pm/quality-control" element={<PMProvider><PMQCInsights /></PMProvider>} />

            <Route path="pm/analytics" element={<PMProvider><PMAnalytics /></PMProvider>} />

            {/* Farm Manager Sub-routes */}
            <Route path="fm/crop-planning" element={<FMCropPlanning />} />
            <Route path="fm/yield-forecast" element={<FMYieldForecasting />} />
            <Route path="fm/performance" element={<FMPerformance />} />

            {/* QC Officer Sub-routes */}
            <Route path="qc/processing" element={<QCProcessing />} />
            <Route path="qc/cold-room" element={<QCColdRoom />} />
            <Route path="qc/home" element={<QCHome />} />
            <Route path="qc/intake" element={<QCIntake />} />

            {/* Logistics Officer Sub-routes */}
            <Route path="logistics/pickup" element={<LogPendingPickups />} />
            <Route path="logistics/shipments" element={<LogShipments />} />
            <Route path="logistics/documents" element={<LogDocuments />} />
            <Route path="logistics/dashboard" element={<LogDashboard />} />
            <Route path="logistics/fleet" element={<LogFleet />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
    </Routes>
);

export default AdminRoutes;
