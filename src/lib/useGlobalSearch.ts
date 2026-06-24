import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export type SearchType = 'Farmer' | 'Crop Cycle' | 'Forecast' | 'Field Report' | 'Shipment' | 'Batch' | 'User' | 'Intake' | 'Vehicle';

export interface SearchResult {
    id: string;
    type: SearchType;
    title: string;
    subtitle: string;
    badge?: string;
    url: string;
}

/**
 * A universal search hook that adapts its data fetching and results based on the user role.
 */
export const useUniversalSearch = (query: string, role: string): { results: SearchResult[]; loading: boolean } => {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{
        farmers: any[];
        cycles: any[];
        shipments: any[];
        batches: any[];
        users: any[];
        vehicles: any[];
    }>({ farmers: [], cycles: [], shipments: [], batches: [], users: [], vehicles: [] });
    
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        setLoading(true);

        const endpoints: { key: string; promise: Promise<any> }[] = [];

        if (['admin', 'production_manager', 'quality_officer', 'logistic_officer'].includes(role)) {
            endpoints.push({ key: 'farmers', promise: api.get('/farmers') });
            endpoints.push({ key: 'cycles', promise: api.get('/crop-cycles') });
        }

        if (['admin', 'logistic_officer'].includes(role)) {
            endpoints.push({ key: 'shipments', promise: api.get('/shipments') });
            endpoints.push({ key: 'vehicles', promise: api.get('/fleet/vehicles') });
        }

        if (['admin', 'production_manager', 'quality_officer'].includes(role)) {
            endpoints.push({ key: 'batches', promise: api.get('/stock') });
        }

        if (role === 'admin') {
            endpoints.push({ key: 'users', promise: api.get('/auth/users') });
        }

        Promise.allSettled(endpoints.map(e => e.promise)).then((responses) => {
            const newData: any = { farmers: [], cycles: [], shipments: [], batches: [], users: [], vehicles: [] };
            responses.forEach((res, idx) => {
                if (res.status === 'fulfilled') {
                    const key = endpoints[idx].key;
                    const resBody = (res.value as any).data ?? res.value;
                    const items = resBody?.data ?? resBody?.farmers ?? resBody ?? [];
                    
                    if (key === 'farmers') newData.farmers = items;
                    else if (key === 'cycles') newData.cycles = items;
                    else if (key === 'shipments') newData.shipments = items;
                    else if (key === 'batches') newData.batches = items;
                    else if (key === 'users') newData.users = items;
                    else if (key === 'vehicles') newData.vehicles = items;
                }
            });
            setData(newData);
        }).finally(() => setLoading(false));
    }, [role]);

    useEffect(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) { setResults([]); return; }

        const { farmers, cycles, shipments, batches, users, vehicles } = data;
        const allResults: SearchResult[] = [];

        // 1. Farmer Results
        farmers.filter((f: any) => 
            f.full_name?.toLowerCase().includes(q) || 
            f.farm_name?.toLowerCase().includes(q) ||
            f.national_id?.toLowerCase().includes(q)
        ).slice(0, 3).forEach((f: any) => {
            allResults.push({
                id: f._id,
                type: 'Farmer',
                title: f.full_name,
                subtitle: `${f.farm_name || 'Individual'} · ${f.district || ''}`,
                badge: f.status,
                url: role === 'admin' ? '/admin/farmers' : (role === 'logistic_officer' ? '/logistics/pickups' : '/pm/farmers')
            });
        });

        // 2. Crop Cycles
        cycles.filter((c: any) => 
            c.crop_name?.toLowerCase().includes(q) || 
            c.cycleId?.toLowerCase().includes(q)
        ).slice(0, 3).forEach((c: any) => {
            allResults.push({
                id: c._id,
                type: 'Crop Cycle',
                title: `${c.crop_name} (${c.season})`,
                subtitle: `${c.cycleId} · ${c.status}`,
                badge: c.status,
                url: role === 'admin' ? '/admin/dashboard' : (role === 'logistic_officer' ? '/logistics/dashboard' : '/pm/crop-planning')
            });
        });

        // 3. Shipments
        if (['admin', 'logistic_officer'].includes(role)) {
            shipments.filter((s: any) => 
                s.plNumber?.toLowerCase().includes(q) || 
                s.destination?.toLowerCase().includes(q)
            ).slice(0, 3).forEach((s: any) => {
                allResults.push({
                    id: s._id,
                    type: 'Shipment',
                    title: `Packing List: ${s.plNumber}`,
                    subtitle: `${s.destination} · ${s.totalWeightKg}kg`,
                    badge: s.status,
                url: role === 'admin' ? '/admin/reports' : '/logistics/shipments'
                });
            });
        }

        // 4. Batches
        if (['admin', 'production_manager', 'quality_officer'].includes(role)) {
            batches.filter((b: any) => 
                b.stockId?.toLowerCase().includes(q) || 
                b.cropName?.toLowerCase().includes(q)
            ).slice(0, 3).forEach((b: any) => {
                allResults.push({
                    id: b._id,
                    type: 'Batch',
                    title: `Batch: ${b.stockId || b._id.slice(-6)}`,
                    subtitle: `${b.cropName} · ${b.processedWeightKg || 0}kg`,
                    badge: b.status,
                    url: role === 'admin' ? '/admin/reports' : (role === 'quality_officer' ? '/qc/inspection' : '/pm/stock')
                });
            });
        }

        // 5. Vehicles (Logistics & Admin)
        if (['admin', 'logistic_officer'].includes(role)) {
            vehicles.filter((v: any) => 
                v.plateNumber?.toLowerCase().includes(q) || 
                v.model?.toLowerCase().includes(q)
            ).slice(0, 3).forEach((v: any) => {
                allResults.push({
                    id: v._id,
                    type: 'Vehicle',
                    title: `${v.plateNumber} (${v.model})`,
                    subtitle: `${v.type} · ${v.status}`,
                    badge: v.status,
                    url: role === 'admin' ? '/admin/fleet' : '/logistics/fleet'
                });
            });
        }

        // 6. Users (Admin Only)
        if (role === 'admin') {
            users.filter((u: any) => 
                u.name?.toLowerCase().includes(q) || 
                u.email?.toLowerCase().includes(q) ||
                u.role?.toLowerCase().includes(q)
            ).slice(0, 3).forEach((u: any) => {
                allResults.push({
                    id: u._id,
                    type: 'User',
                    title: u.name,
                    subtitle: `${u.email} · ${u.role.replace('_', ' ')}`,
                    badge: u.isActive ? 'Active' : 'Pending',
                    url: '/admin/users'
                });
            });
        }

        setResults(allResults.slice(0, 8));
    }, [query, role, data]);

    return { results, loading };
};

// Legacy support for backward compatibility if needed, but redirects to useUniversalSearch
export const usePMSearch = (query: string) => useUniversalSearch(query, 'production_manager');
export const useFMSearch = (query: string, cycles: any[], forecasts: any[]) => {
    // FM search is slightly different as it uses local state often, keeping it as is but updated
    const [results, setResults] = useState<SearchResult[]>([]);
    useEffect(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) { setResults([]); return; }
        const all: SearchResult[] = [];
        cycles.filter(c => c.crop_name?.toLowerCase().includes(q)).slice(0, 3).forEach(c => all.push({
            id: c._id, type: 'Crop Cycle', title: c.crop_name, subtitle: c.cycleId, url: '/farm-manager/crop-planning'
        }));
        forecasts.filter(f => f.notes?.toLowerCase().includes(q)).slice(0, 2).forEach(f => all.push({
            id: f._id, type: 'Forecast', title: 'Yield Forecast', subtitle: f.notes, url: '/farm-manager/yield-forecast'
        }));
        setResults(all.slice(0, 8));
    }, [query, cycles, forecasts]);
    return results;
};

