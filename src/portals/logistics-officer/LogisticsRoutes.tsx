import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import PendingPickups from './pages/PendingPickups';
import Shipments from './pages/Shipments';
import Fleet from './pages/Fleet';
import Documents from './pages/Documents';
import Settings from './pages/Settings';

const LogisticsRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/logistics/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="pickups" element={<PendingPickups />} />
                <Route path="shipments" element={<Shipments />} />
                <Route path="fleet" element={<Fleet />} />
                <Route path="documents" element={<Documents />} />
                <Route path="settings" element={<Settings />} />

                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/logistics/dashboard" replace />} />
            </Route>
        </Routes>
    );
};

export default LogisticsRoutes;
