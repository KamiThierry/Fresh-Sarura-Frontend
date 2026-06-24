import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { CropCycle, Farmer, BudgetRequest } from '@/types';

interface PMContextType {
  cycles: CropCycle[];
  farmers: Farmer[];
  shipments: any[];
  stock: any[];
  intakeLogs: any[];
  pendingRequests: BudgetRequest[];
  pendingForecasts: any[];
  pendingReports: any[];
  pendingRoomRequests: any[];
  exportBatches: any[];
  processingBatches: any[];
  qcDoneBatches: any[];
  loading: boolean;
  error: string | null;
  refreshCycles: () => Promise<void>;
  refreshFarmers: () => Promise<void>;
  refreshShipments: () => Promise<void>;
  refreshStock: () => Promise<void>;
  refreshIntakeLogs: () => Promise<void>;
  refreshPendingRequests: () => Promise<void>;
  refreshPendingForecasts: () => Promise<void>;
  refreshPendingReports: () => Promise<void>;
  refreshPendingRoomRequests: () => Promise<void>;
  refreshExportBatches: () => Promise<void>;
  refreshProcessingBatches: () => Promise<void>;
  inventoryItems: any[];
  refreshAll: () => Promise<void>;
}

const PMContext = createContext<PMContextType | undefined>(undefined);

export const PMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cycles, setCycles] = useState<CropCycle[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<BudgetRequest[]>([]);
  const [pendingForecasts, setPendingForecasts] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [pendingRoomRequests, setPendingRoomRequests] = useState<any[]>([]);
  const [exportBatches, setExportBatches] = useState<any[]>([]);
  const [processingBatches, setProcessingBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute inventoryItems with availableKg
  const inventoryItems = useMemo(() => {
    // 1. Map allocations
    const allocationMap: Record<string, number> = {};
    exportBatches.forEach(b => {
      const id = b.processingBatchId?._id || b.processingBatchId;
      if (!id) return;
      allocationMap[id] = (allocationMap[id] || 0) + (b.allocatedWeightKg || 0);
    });

    // 2. Map stock to inventoryItems
    return stock
      .filter(s => s.stockId && s.stockId.startsWith('STK-'))
      .map(s => {
        const allocated = allocationMap[s._id] || 0;
        const available = Math.max(0, (s.processedWeightKg || 0) - allocated);
        const processed = s.processedWeightKg || 0;

        const statusLabel = allocated === 0 ? 'Available'
          : available === 0 ? 'Fully Allocated'
          : 'Partially Allocated';

        return {
          ...s,
          rawId: s._id,
          id: s.stockId,
          produce: s.cropName,
          processedKg: processed,
          rejectedKg: s.rejectedWeightKg ?? 0,
          primaryDefectType: s.primaryDefectType || null,
          availableKg: available,
          totalAllocated: allocated,
          storageLocation: s.assignedRoom,
          status: statusLabel,
          grade: s.gradeLabel,
          dateInStock: new Date(s.updatedAt || s.createdAt)
        };
      });
  }, [stock, exportBatches]);

  const qcDoneBatches = useMemo(() => {
    return processingBatches.filter((b: any) => b.status === 'QCDone');
  }, [processingBatches]);

  const refreshCycles = useCallback(async () => {
    try {
      const res = await api.get('/crop-cycles');
      console.log('PMContext: refreshCycles res:', res);
      const data = res.data?.data ?? res?.data ?? res ?? [];
      setCycles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch cycles', err);
      setError(err.message);
    }
  }, []);

  const refreshFarmers = useCallback(async () => {
    try {
      const res = await api.get('/farmers');
      console.log('PMContext: refreshFarmers res:', res);
      const data = res.farmers ?? res.data?.farmers ?? res.data ?? res ?? [];
      setFarmers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch farmers', err);
      setError(err.message);
    }
  }, []);

  const refreshShipments = useCallback(async () => {
    try {
        const res = await api.get('/shipments');
        const data = res.data?.data ?? res?.data ?? res ?? [];
        setShipments(Array.isArray(data) ? data : []);
    } catch (err: any) {
        console.error('PMContext: Failed to fetch shipments', err);
    }
  }, []);

  const refreshPendingRequests = useCallback(async () => {
    try {
      const res = await api.get('/crop-cycles/budget-requests/pending');
      const data = res.data?.data ?? res?.data ?? res ?? [];
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch pending requests', err);
    }
  }, []);

  const refreshPendingForecasts = useCallback(async () => {
    try {
      const res = await api.get('/crop-cycles/forecasts/pending');
      const data = res.data?.data ?? res?.data ?? res ?? [];
      setPendingForecasts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch pending forecasts', err);
    }
  }, []);

  const refreshPendingReports = useCallback(async () => {
    try {
      const res = await api.get('/crop-cycles/field-reports/pending');
      const data = res.data?.data ?? res?.data ?? res ?? [];
      setPendingReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch pending reports', err);
    }
  }, []);

  const refreshPendingRoomRequests = useCallback(async () => {
    try {
      const res = await api.get('/processing-batches/pending-room');
      const data = res.data?.data ?? res?.data ?? res ?? [];
      setPendingRoomRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch pending room requests', err);
    }
  }, []);

  const refreshStock = useCallback(async () => {
    try {
      const res = await api.get('/stock');
      const data = res.data?.data ?? res?.data ?? res ?? [];
      setStock(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch stock', err);
    }
  }, []);

  const refreshIntakeLogs = useCallback(async () => {
    try {
      const res = await api.get('/harvest-declarations/intake-logs');
      const data = res.data?.data ?? res?.data ?? res ?? [];
      setIntakeLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch intake logs', err);
    }
  }, []);

  const refreshExportBatches = useCallback(async () => {
    try {
      const res = await api.get('/export-batches');
      const data = res.data?.data ?? res?.data ?? res ?? [];
      setExportBatches(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch export batches', err);
    }
  }, []);

  const refreshProcessingBatches = useCallback(async () => {
    try {
      const res = await api.get('/processing-batches');
      const data = res.data?.data ?? res?.data ?? res ?? [];
      setProcessingBatches(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('PMContext: Failed to fetch processing batches', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      refreshCycles(),
      refreshFarmers(),
      refreshPendingRequests(),
      refreshPendingForecasts(),
      refreshPendingReports(),
      refreshPendingRoomRequests(),
      refreshShipments(),
      refreshStock(),
      refreshIntakeLogs(),
      refreshExportBatches(),
      refreshProcessingBatches(),
    ]);
    setLoading(false);
  }, [refreshCycles, refreshFarmers, refreshPendingRequests, refreshPendingForecasts, refreshPendingReports, refreshPendingRoomRequests, refreshShipments, refreshStock, refreshIntakeLogs, refreshExportBatches, refreshProcessingBatches]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <PMContext.Provider value={{
      cycles,
      farmers,
      shipments,
      stock,
      intakeLogs,
      pendingRequests,
      pendingForecasts,
      pendingReports,
      pendingRoomRequests,
      exportBatches,
      processingBatches,
      qcDoneBatches,
      inventoryItems,
      loading,
      error,
      refreshCycles,
      refreshFarmers,
      refreshShipments,
      refreshStock,
      refreshIntakeLogs,
      refreshPendingRequests,
      refreshPendingForecasts,
      refreshPendingReports,
      refreshPendingRoomRequests,
      refreshExportBatches,
      refreshProcessingBatches,
      refreshAll
    }}>
      {children}
    </PMContext.Provider>
  );
};

export const usePMContext = () => {
  const context = useContext(PMContext);
  if (context === undefined) {
    throw new Error('usePMContext must be used within a PMProvider');
  }
  return context;
};
