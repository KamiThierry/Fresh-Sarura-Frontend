import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
export const useFarmManager = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [budgetRequests, setBudgetRequests] = useState<any[]>([]);
  const [fieldReports, setFieldReports] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/farm-manager/dashboard');
      setDashboard(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchCycles = useCallback(async () => {
    try {
      const res = await api.get('/farm-manager/cycles');
      setCycles(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchBudgetRequests = useCallback(async () => {
    try {
      const res = await api.get('/farm-manager/budget-requests');
      setBudgetRequests(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchFieldReports = useCallback(async () => {
    try {
      const res = await api.get('/farm-manager/field-reports');
      setFieldReports(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchForecasts = useCallback(async () => {
    try {
      const res = await api.get('/farm-manager/yield-forecasts');
      setForecasts(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.get('/farm-manager/activity?limit=6');
      setActivity(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const submitBudgetRequest = async (data: {
    cycleId: string;
    cycleName: string;
    startDate: string;
    endDate: string;
    lineItems: { activityName: string; estimatedCostRwf: number }[];
  }) => {
    console.log('useFarmManager: submitBudgetRequest START', data);
    try {
      const res = await api.post('/farm-manager/budget-requests', data);
      console.log('useFarmManager: submitBudgetRequest SUCCESS', res);
      await fetchBudgetRequests();
      await fetchCycles();
      return res;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to submit budget request.';
      throw new Error(message);
    }
  };

  const declareHarvest = async (data: {
    cycleId: string;
    estimatedWeightKg: number;
    cropName: string;
    notes?: string;
  }) => {
    try {
      const res = await api.post('/harvest-declarations', data);
      await fetchCycles();
      return res;
    } catch (err: any) {
      // Extract the backend message and rethrow so the modal can display it
      const message = err?.response?.data?.message || err?.message || 'Failed to declare harvest.';
      throw new Error(message);
    }
  };

  const submitFieldReport = async (data: {
    cycleId: string;
    description: string;
    category?: string;
    block?: string;
    approvedAmountRwf?: number;
    actualCostRwf: number;
    notes?: string;
    hasProof?: boolean;
    proofUrl?: string;
    budgetRequestId?: string;
  }) => {
    console.log('useFarmManager: submitFieldReport START', data);
    try {
      const res = await api.post('/farm-manager/field-reports', data);
      console.log('useFarmManager: submitFieldReport SUCCESS', res);
      await fetchFieldReports();
      await fetchCycles();
      await fetchDashboard();
      return res;
    } catch (err) {
      console.error('useFarmManager: submitFieldReport FAILED', err);
      throw err;
    }
  };

  const submitYieldForecast = async (data: {
    cycleId: string;
    harvestDate: string;
    predictionKg: number;
    confidence: string;
    notes?: string;
  }) => {
    try {
      const res = await api.post('/farm-manager/yield-forecasts', data);
      await fetchForecasts();
      return res;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to submit yield forecast.';
      throw new Error(message);
    }
  };


  const updateProfile = async (data: { name: string; phone: string; email?: string; preferences?: any }) => {
    const res = await api.patch('/auth/me', data);
    if (res.status === 'success') {
      // Update local storage so Header and other components stay in sync
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...res.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setDashboard((prev: any) => prev ? { ...prev, user: res.data.user } : prev);
    }
    return res;
  };

  const updatePassword = async (data: { currentPassword: string; newPassword: string }) => {
    const res = await api.patch('/auth/update-password', data);
    return res;
  };

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboard(),
      fetchCycles(),
      fetchBudgetRequests(),
      fetchFieldReports(),
      fetchForecasts(),
      fetchActivity(),
    ]);
    setLoading(false);
  }, [fetchDashboard, fetchCycles, fetchBudgetRequests, fetchFieldReports, fetchForecasts, fetchActivity]);

  useEffect(() => {
    refreshAll();
  }, []);

  return {
    dashboard,
    cycles,
    budgetRequests,
    fieldReports,
    forecasts,
    activity,
    loading,
    error,
    submitBudgetRequest,
    submitFieldReport,
    submitYieldForecast,
    declareHarvest,
    updateProfile,
    updatePassword,
    refreshAll,
    fetchCycles,
    fetchForecasts,
    fetchActivity,
  };
};