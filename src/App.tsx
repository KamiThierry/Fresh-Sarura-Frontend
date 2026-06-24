import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import NotFound from './pages/NotFound';
import ProductionManagerRoutes from './portals/production-manager/ProductionManagerRoutes';
import FarmManagerRoutes from './portals/farm-manager/FarmManagerRoutes';
import LogisticsRoutes from './portals/logistics-officer/LogisticsRoutes';
import AdminRoutes from './portals/admin/AdminRoutes';
import DriverTaskView from './portals/driver/pages/DriverTaskView';
import QCOfficerRoutes from './portals/qc-officer/QCOfficerRoutes';
import LandingPage from './pages/Index';
import ProtectedRoute from './components/ProtectedRoute';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />

          {/* Production Manager Portal */}
          <Route path="/pm/*" element={
            <ProtectedRoute allowedRoles={['production_manager', 'admin']}>
              <ProductionManagerRoutes />
            </ProtectedRoute>
          } />

          {/* Farm Manager Portal */}
          <Route path="/farm-manager/*" element={
            <ProtectedRoute allowedRoles={['farm_manager', 'admin']}>
              <FarmManagerRoutes />
            </ProtectedRoute>
          } />

          {/* Admin Portal */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminRoutes />
            </ProtectedRoute>
          } />

          {/* Logistics Officer Portal */}
          <Route path="/logistics/*" element={
            <ProtectedRoute allowedRoles={['logistic_officer', 'admin']}>
              <LogisticsRoutes />
            </ProtectedRoute>
          } />

          {/* QC Officer Portal */}
          <Route path="/qc/*" element={
            <ProtectedRoute allowedRoles={['quality_officer', 'admin']}>
              <QCOfficerRoutes />
            </ProtectedRoute>
          } />

          {/* Driver Lite Interface */}
          <Route path="/driver/task/:taskId" element={<DriverTaskView />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes >
      </BrowserRouter >
    </ToastProvider>
  );
}

export default App;