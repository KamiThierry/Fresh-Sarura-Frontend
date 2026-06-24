import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import FarmDashboard from './pages/FarmDashboard';
import CropPlanning from './pages/CropPlanning';
import YieldForecasting from './pages/YieldForecasting';
import Performance from './pages/Performance';
import Settings from './pages/Settings';

// Auth guard — redirects to /login if no token
const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const FarmManagerRoutes = () => {
  return (
    <RequireAuth>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<FarmDashboard />} />
          <Route path="crop-planning" element={<CropPlanning />} />
          <Route path="yield-forecast" element={<YieldForecasting />} />
          <Route path="performance" element={<Performance />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/farm-manager" replace />} />
        </Route>
      </Routes>
    </RequireAuth>
  );
};

export default FarmManagerRoutes;
