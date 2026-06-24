import { useState, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';

import FarmerManagement from './pages/FarmerManagement';
import InventoryManagement from './pages/InventoryManagement';
import QCInsights from './pages/QCInsights';
import Logistics from './pages/Logistics';
import CreatePackingListModal from './components/CreatePackingListModal';
import CropPlanning from './pages/CropPlanning';
import Traceability from './pages/Traceability';
import AnalyticsReporting from './pages/AnalyticsReporting';
import SettingsPage from './pages/Settings';
// import ClientRequests from './pages/ClientRequests';
import RoomManagement from './pages/RoomManagement';

import FarmerRegistrationModal from './components/FarmerRegistrationModal';
import CreateCropCycleModal from './components/CreateCropCycleModal';
import CreateExportBatchModal from './components/CreateExportBatchModal';
import { PMProvider, usePMContext } from '@/context/PMContext';
import { useToastContext } from '@/context/ToastContext';

const ProductionManagerRoutes = () => {
    return (
        <PMProvider>
            <ProductionManagerApp />
        </PMProvider>
    );
};
const ProductionManagerApp = () => {
    const { showToast } = useToastContext();
    const navigate = useNavigate();
    const [isIntakeOpen, setIsIntakeOpen] = useState(false);
    // const [isQCOpen, setIsQCOpen] = useState(false);
    const [isTraceabilityOpen, setIsTraceabilityOpen] = useState(false);
    const [isPackingListOpen, setIsPackingListOpen] = useState(false);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
    const [isCreateCycleOpen, setIsCreateCycleOpen] = useState(false);
    const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
    const { intakeLogs, inventoryItems, refreshAll } = usePMContext();

    const todayStr = new Date().toISOString().split('T')[0];

    const currentIntake = useMemo(() =>
        intakeLogs
            .filter(log => log.createdAt?.startsWith(todayStr))
            .reduce((sum, log) => sum + (log.pickedUpWeightKg || 0), 0)
    , [intakeLogs, todayStr]);

    const [qualityGrade] = useState("96% Class A");
    const scheduledExports = 8000;

    const handleLogIntake = () => {
        setIsIntakeOpen(true);
    };

    const handleIntakeSubmit = (_weight: number) => {
        setIsIntakeOpen(false);
    };

    /*
    const handleQCInspection = () => {
        setIsQCOpen(true);
    };

    const handleQCSubmit = (result: string) => {
        setQualityGrade(result);
        setIsQCOpen(false);
        showToast('Inspection Submitted', `QC Inspection Submitted! New Grade: ${result}`);
    };
    */

    const handleFindBatch = () => {
        setIsTraceabilityOpen(true);
    };

    const handleCreatePackingList = () => {
        setIsPackingListOpen(true);
    };

    const handleRegisterFarmer = () => {
        navigate('/pm/farmers');
        setTimeout(() => setIsRegistrationOpen(true), 100);
    };

    const handleCreateCycle = () => {
        navigate('/pm/crop-planning');
        setTimeout(() => setIsCreateCycleOpen(true), 100);
    };

    const handleCreateBatch = () => {
        navigate('/pm/inventory');
        setTimeout(() => setIsCreateBatchOpen(true), 100);
    };

    const handlePackingListSubmit = (data: any) => {
        // Modal manages its own close — success state shows first,
        // then user clicks Close or View Packing List Status.
        console.log('Packing list data:', data);
    }


    return (
        <>
            <Routes>
                <Route element={<Layout />}>
                    {/* Home/Dashboard Route */}
                    <Route
                        path="/"
                        element={
                            <Dashboard
                                currentIntake={currentIntake}
                                qualityGrade={qualityGrade}
                                scheduledExports={scheduledExports}
                                isIntakeOpen={isIntakeOpen}
                                isTraceabilityOpen={isTraceabilityOpen}
                                onLogIntake={handleLogIntake}
                                onRegisterFarmer={handleRegisterFarmer}
                                onCreateCycle={handleCreateCycle}
                                onCreateBatch={handleCreateBatch}
                                onFindBatch={handleFindBatch}
                                onCloseIntake={() => setIsIntakeOpen(false)}
                                onIntakeSubmit={handleIntakeSubmit}
                                onCloseTraceability={() => setIsTraceabilityOpen(false)}
                            />
                        }
                    />

                    {/* Other Routes */}
                    <Route path="/farmers" element={<FarmerManagement />} />
                    <Route path="/crop-planning" element={<CropPlanning />} />
                    <Route path="/inventory" element={<InventoryManagement />} />
                    <Route path="/quality-control" element={<QCInsights />} />
                    <Route path="/logistics" element={<Logistics onCreatePackingList={handleCreatePackingList} />} />
                    <Route path="/traceability" element={<Traceability />} />
                    <Route path="/analytics" element={<AnalyticsReporting />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* Client Orders & Requests */}
                    {/* <Route path="/communication" element={<ClientRequests />} /> */}
                    <Route path="/rooms" element={<RoomManagement />} />

                    {/* Catch all - redirect to dashboard */}
                    <Route path="*" element={<Navigate to="/pm" replace />} />
                </Route>
            </Routes>

            {/* Global Modals */}
            {/* 
            <QCInspectionModal
                isOpen={isQCOpen}
                onClose={() => setIsQCOpen(false)}
                onSubmit={handleQCSubmit}
                onConfirm={() => { }}
            />
            */}

            <CreatePackingListModal
                isOpen={isPackingListOpen}
                onClose={() => setIsPackingListOpen(false)}
                onSubmit={handlePackingListSubmit}
            />

            <FarmerRegistrationModal
                isOpen={isRegistrationOpen}
                onClose={() => setIsRegistrationOpen(false)}
                onFarmerAdded={(name: string) => {
                    setIsRegistrationOpen(false);
                    showToast('Farmer Registered', `${name} has been successfully registered.`);
                }}
            />

            <CreateCropCycleModal
                isOpen={isCreateCycleOpen}
                onClose={() => setIsCreateCycleOpen(false)}
                onSubmit={() => setIsCreateCycleOpen(false)}
            />

            <CreateExportBatchModal 
                isOpen={isCreateBatchOpen}
                onClose={() => setIsCreateBatchOpen(false)}
                inventoryItems={inventoryItems}
                onSuccess={refreshAll}
            />
        </>
    );
};

export default ProductionManagerRoutes;

