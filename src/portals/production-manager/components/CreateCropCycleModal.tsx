import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calculator, AlertTriangle, CheckCircle2, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';

interface CreateCropCycleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

const fmt = (n: number) => Math.round(n).toLocaleString();

const TARGET_MARGIN = 0.15; // 15% minimum healthy margin
const suggestedSplit = {
    budget_seeds: 0.15,
    budget_fertilizers: 0.30,
    budget_chemicals: 0.20,
    budget_labor: 0.35,
};

// Approximate maturation periods in days for common Rwandan export crops
const CROP_MATURATION_DAYS: Record<string, { min: number; max: number; note: string }> = {
    'French Beans': { min: 55, max: 70, note: '55–70 days (fast-maturing legume)' },
    'Avocado': { min: 365, max: 548, note: '12–18 months from planting to first harvest' },
    'Avocado Fuerte': { min: 365, max: 548, note: '12–18 months from planting to first harvest' },
    'Avocado Hass': { min: 365, max: 548, note: '12–18 months from planting to first harvest' },
    'Chili Peppers': { min: 70, max: 90, note: '70–90 days' },
    'Chilli': { min: 70, max: 90, note: '70–90 days' },
    'Habanero': { min: 90, max: 120, note: '90–120 days' },
    'Tomatoes': { min: 60, max: 85, note: '60–85 days' },
    'Passion Fruit': { min: 240, max: 300, note: '8–10 months from planting' },
    'Macadamia': { min: 1095, max: 1460, note: '3–4 years to first commercial harvest' },
    'Coffee': { min: 730, max: 1095, note: '2–3 years from planting to harvest' },
    'Maize': { min: 90, max: 120, note: '90–120 days' },
    'Soya Beans': { min: 90, max: 110, note: '90–110 days' },
    'Sweet Potatoes': { min: 90, max: 120, note: '90–120 days' },
    'Irish Potatoes': { min: 90, max: 120, note: '90–120 days' },
    'Pyrethrum': { min: 180, max: 240, note: '6–8 months' },
    'Roses': { min: 60, max: 90, note: '60–90 days to first cut' },
};

const getCropMaturation = (cropName: string) => {
    if (!cropName) return null;
    // Case-insensitive match
    const key = Object.keys(CROP_MATURATION_DAYS).find(
        k => k.toLowerCase() === cropName.toLowerCase()
    );
    return key ? CROP_MATURATION_DAYS[key] : null;
};

const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

const CreateCropCycleModal = ({ isOpen, onClose, onSubmit }: CreateCropCycleModalProps) => {
    const [formData, setFormData] = useState({
        farmer_id: '',
        farm_name: '',
        crop_name: '',
        season: '',
        planting_date: '',
        expected_harvest_date: '',
        block_name: '',
        block_size_hectares: '',
        field_size_hectares: '',
        yield_goal_kg: '',
        expected_price_per_kg: '',
        total_budget: 0,
        budget_seeds: 0,
        budget_fertilizers: 0,
        budget_chemicals: 0,
        budget_labor: 0,
    });

    const [lossAcknowledged, setLossAcknowledged] = useState(false);
    const [remaining, setRemaining] = useState(0);
    const [farmers, setFarmers] = useState<any[]>([]);
    const [farmersLoading, setFarmersLoading] = useState(false);
    const [existingCycles, setExistingCycles] = useState<any[]>([]);
    const [harvestHint, setHarvestHint] = useState<string | null>(null);

    const selectedFarmer = farmers.find(f => f._id === formData.farmer_id) ?? null;
    const farmerMaxHa: number = selectedFarmer?.farm_size_hectares ?? 0;
    const produceTypes: string[] = selectedFarmer?.produce_types ?? [];

    // ── Validation flags ───────────────────────────────────────────────────────
    const blockExceedsMax = farmerMaxHa > 0 && parseFloat(formData.block_size_hectares) > farmerMaxHa;
    const fieldExceedsMax = farmerMaxHa > 0 && parseFloat(formData.field_size_hectares) > farmerMaxHa;
    const blockExceedsField =
        formData.block_size_hectares !== '' && formData.field_size_hectares !== '' &&
        parseFloat(formData.block_size_hectares) > parseFloat(formData.field_size_hectares);
    const blockNameInvalid = formData.block_name.trim().length > 0 && formData.block_name.trim().length < 2;

    const plantingDate = formData.planting_date ? new Date(formData.planting_date) : null;
    const harvestDate = formData.expected_harvest_date ? new Date(formData.expected_harvest_date) : null;

    const now = new Date();
    const isToday = plantingDate &&
        plantingDate.getFullYear() === now.getFullYear() &&
        plantingDate.getMonth() === now.getMonth() &&
        plantingDate.getDate() === now.getDate();

    const cropMaturationInfo = getCropMaturation(formData.crop_name);
    const minDays = cropMaturationInfo ? cropMaturationInfo.min : 30;

    const diffTime = harvestDate && plantingDate ? harvestDate.getTime() - plantingDate.getTime() : 0;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const dateErrors = {
        harvestBeforeStart: !!(harvestDate && plantingDate && harvestDate <= plantingDate),
        harvestTooSoon: !!(harvestDate && plantingDate &&
            !(harvestDate <= plantingDate) &&
            diffDays < minDays),
        plantingInPast: !!(plantingDate && plantingDate.getTime() < new Date().setHours(0, 0, 0, 0)),
        plantingTooLate: !!(isToday && now.getHours() >= 20),
    };

    // Yield warning: more than 50% above stated farmer capacity
    const capacityKg = (selectedFarmer?.production_capacity_tons ?? 0) * 1000;
    const yieldWarning =
        capacityKg > 0 &&
        parseFloat(formData.yield_goal_kg) > capacityKg * 1.5;

    // Budget category minimum: each must be > 0 if total_budget is set
    const budgetCategories: { key: keyof typeof formData; label: string }[] = [
        { key: 'budget_seeds', label: 'Seeds & Seedlings' },
        { key: 'budget_fertilizers', label: 'Fertilizers' },
        { key: 'budget_chemicals', label: 'Chemicals' },
        { key: 'budget_labor', label: 'Labor' },
    ];
    const categoryZeroError = formData.total_budget > 0 &&
        budgetCategories.some(({ key }) => (formData[key] as number) === 0);

    // ── P&L projections ────────────────────────────────────────────────────────
    const yieldKg = parseFloat(formData.yield_goal_kg) || 0;
    const pricePerKg = parseFloat(formData.expected_price_per_kg) || 0;
    const projRevenue = yieldKg * pricePerKg;
    const projProfit = projRevenue - formData.total_budget;
    const projMargin = projRevenue > 0 ? (projProfit / projRevenue) * 100 : 0;
    const costPerKg = yieldKg > 0 ? formData.total_budget / yieldKg : 0;
    const showPnL = yieldKg > 0 && pricePerKg > 0 && formData.total_budget > 0;

    const profitableBudgetCeiling = projRevenue > 0 ? Math.round(projRevenue * (1 - TARGET_MARGIN)) : 0;

    const duplicateCycle = existingCycles.find(c =>
        c.crop_name?.trim().toLowerCase() === formData.crop_name?.trim().toLowerCase() &&
        c.season?.trim() === formData.season?.trim()
    );

    // ── Form validity ──────────────────────────────────────────────────────────
    const isFormValid =
        !!formData.farmer_id &&
        !!formData.crop_name &&
        !!formData.season &&
        !duplicateCycle &&
        !!formData.planting_date &&
        !!formData.expected_harvest_date &&
        formData.block_name.trim().length >= 2 &&
        parseFloat(formData.block_size_hectares) > 0 &&
        parseFloat(formData.field_size_hectares) > 0 &&
        parseFloat(formData.yield_goal_kg) > 0 &&
        parseFloat(formData.expected_price_per_kg) > 0 &&
        formData.total_budget > 0 &&
        budgetCategories.every(({ key }) => (formData[key] as number) > 0) &&
        remaining >= 0 &&
        !blockExceedsMax &&
        !fieldExceedsMax &&
        !blockExceedsField &&
        !blockNameInvalid &&
        !Object.values(dateErrors).some(Boolean) &&
        (projProfit >= 0 || lossAcknowledged);

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (projProfit >= 0) setLossAcknowledged(false);
    }, [projProfit]);

    useEffect(() => {
        if (!isOpen) {
            setExistingCycles([]);
            return;
        }
        setFarmersLoading(true);
        api.get('/farmers')
            .then((res) => setFarmers(res.farmers ?? []))
            .catch((err) => console.error('Failed to load farmers:', err))
            .finally(() => setFarmersLoading(false));
    }, [isOpen]);

    useEffect(() => {
        const allocated = (formData.budget_seeds || 0) + (formData.budget_fertilizers || 0) +
            (formData.budget_chemicals || 0) + (formData.budget_labor || 0);
        setRemaining((formData.total_budget || 0) - allocated);
    }, [formData.total_budget, formData.budget_seeds, formData.budget_fertilizers, formData.budget_chemicals, formData.budget_labor]);

    useEffect(() => {
        if (!formData.farmer_id) {
            setExistingCycles([]);
            return;
        }
        api.get(`/crop-cycles?farmer_id=${formData.farmer_id}`)
            .then(res => {
                const data = res.data?.data || res.data || [];
                setExistingCycles(
                    data.filter((c: any) =>
                        !['completed', 'cancelled'].includes(c.status?.toLowerCase())
                    )
                );
            })
            .catch(() => setExistingCycles([]));
    }, [formData.farmer_id]);

    useEffect(() => {
        if (!formData.crop_name || !formData.planting_date) {
            setHarvestHint(null);
            return;
        }
        try {
            const maturation = getCropMaturation(formData.crop_name);
            const minDaysFallback = maturation ? maturation.min : 30;
            const suggestedDays = maturation ? Math.round((maturation.min + maturation.max) / 2) : minDaysFallback;
            
            const d = new Date(formData.planting_date);
            d.setUTCDate(d.getUTCDate() + suggestedDays);
            const suggestedDate = d.toISOString().split('T')[0];

            // Only auto-fill if harvest date is empty
            setFormData(prev => ({
                ...prev,
                expected_harvest_date: prev.expected_harvest_date === '' ? suggestedDate : prev.expected_harvest_date,
            }));

            // Safer formatting for hint (DD/MM/YYYY)
            if (maturation) {
                setHarvestHint(`${maturation.note} — suggested: ${formatDate(suggestedDate)}`);
            } else {
                setHarvestHint(`Default minimum 30 days — suggested: ${formatDate(suggestedDate)}`);
            }
        } catch (err) {
            console.error('Harvest auto-calc failed:', err);
            setHarvestHint(null);
        }
    }, [formData.crop_name, formData.planting_date]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Reset harvest date when crop or planting date changes so auto-fill re-triggers
            ...(name === 'crop_name' || name === 'planting_date' ? { expected_harvest_date: '' } : {}),
        }));
    };

    const handleNumericChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    const handleFarmerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const farmer = farmers.find(f => f._id === selectedId);
        const farmHa = farmer?.farm_size_hectares ?? '';
        const yieldGoal = farmer?.production_capacity_tons
            ? String(Math.round(farmer.production_capacity_tons * 1000))
            : '';
        const types: string[] = farmer?.produce_types ?? [];
        setFormData(prev => ({
            ...prev,
            farmer_id: selectedId,
            farm_name: farmer?.farm_name || farmer?.full_name || '',
            crop_name: types.length === 1 ? types[0] : '',
            block_size_hectares: farmHa ? String(farmHa) : '',
            field_size_hectares: farmHa ? String(farmHa) : '',
            yield_goal_kg: yieldGoal,
            expected_harvest_date: '',  // ← add this so auto-fill triggers fresh
        }));
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Crop Cycle</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Establish budget &amp; limits</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">

                    {/* ── Section 1: Context ── */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">1. Context</h3>

                        {/* Farmer select */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Farm / Farmer <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="farmer_id"
                                value={formData.farmer_id}
                                onChange={handleFarmerSelect}
                                disabled={farmersLoading}
                                className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:opacity-60"
                            >
                                <option value="">{farmersLoading ? 'Loading farms...' : 'Select a Farmer / Farm...'}</option>
                                {farmers.map((farmer) => (
                                    <option key={farmer._id} value={farmer._id}>
                                        {farmer.farm_name ? `${farmer.farm_name} — ${farmer.full_name}` : farmer.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Farmer constraints panel */}
                        {selectedFarmer && (
                            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Info size={14} className="text-green-600" />
                                    <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">Farmer Constraints</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div>
                                        <p className="text-gray-400 font-medium">Farm Size</p>
                                        <p className="font-bold text-gray-800 dark:text-gray-100">{selectedFarmer.farm_size_hectares ?? '—'} Ha</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-medium">Capacity</p>
                                        <p className="font-bold text-gray-800 dark:text-gray-100">
                                            {selectedFarmer.production_capacity_tons != null ? `${selectedFarmer.production_capacity_tons} t/season` : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-medium">Produce Types</p>
                                        <p className="font-bold text-gray-800 dark:text-gray-100 truncate" title={produceTypes.join(', ')}>
                                            {produceTypes.length > 0 ? produceTypes.join(', ') : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Crop + Season */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Crop <span className="text-red-500">*</span>
                                </label>
                                {produceTypes.length > 0 ? (
                                    <select
                                        name="crop_name"
                                        value={formData.crop_name}
                                        onChange={handleInputChange}
                                        className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        {produceTypes.length > 1 && <option value="">Select crop...</option>}
                                        {produceTypes.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        name="crop_name"
                                        value={formData.crop_name}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Avocado"
                                        className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Season <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="season"
                                    value={formData.season}
                                    onChange={handleInputChange}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Select season...</option>
                                    <option value="Season A">Season A</option>
                                    <option value="Season B">Season B</option>
                                    <option value="Season C">Season C</option>
                                </select>
                            </div>
                        </div>

                        {duplicateCycle && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl flex items-start gap-2.5">
                                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-red-700 dark:text-red-400">
                                        Duplicate cycle detected
                                    </p>
                                    <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                                        An active cycle for <strong>{formData.crop_name}</strong> in <strong>{formData.season}</strong> already exists for this farmer
                                        {duplicateCycle.cycleId ? ` (${duplicateCycle.cycleId})` : ''}.
                                        Close or complete it before creating a new one.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Planting Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="planting_date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={formData.planting_date}
                                    onChange={handleInputChange}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                                />
                                {dateErrors.plantingInPast && (
                                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle size={11} /> Planting date cannot be in the past.
                                    </p>
                                )}
                                {dateErrors.plantingTooLate && (
                                    <p className="text-xs text-amber-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle size={11} /> Past 8 PM — please schedule for tomorrow.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Expected Harvest Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="expected_harvest_date"
                                    min={formData.planting_date || new Date().toISOString().split('T')[0]}
                                    value={formData.expected_harvest_date}
                                    onChange={e => {
                                        handleInputChange(e);
                                        setHarvestHint(null); // user manually overrode — clear the hint
                                    }}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                                />
                                {/* Auto-fill hint */}
                                {harvestHint && !dateErrors.harvestBeforeStart && !dateErrors.harvestTooSoon && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center gap-1">
                                        <Info size={11} />
                                        Auto-filled based on crop maturation: {harvestHint}
                                    </p>
                                )}
                                {dateErrors.harvestBeforeStart && (
                                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle size={11} /> Harvest date must be after planting date.
                                    </p>
                                )}
                                {dateErrors.harvestTooSoon && (
                                    <p className="text-xs text-amber-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle size={11} /> Less than {getCropMaturation(formData.crop_name)?.min || 30} days to harvest — is this realistic for {formData.crop_name}?
                                        {getCropMaturation(formData.crop_name) && (
                                            <span className="text-gray-400">
                                                ({getCropMaturation(formData.crop_name)?.note})
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Block name + Block size */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Block Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="block_name"
                                    value={formData.block_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Block A"
                                    className={`w-full p-2.5 rounded-lg border bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 ${blockNameInvalid
                                        ? 'border-red-400 focus:ring-red-400'
                                        : 'border-gray-200 dark:border-gray-700 focus:ring-green-500'
                                        }`}
                                />
                                {blockNameInvalid && (
                                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle size={11} /> Block name must be at least 2 characters.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Block Size (Ha) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="block_size_hectares"
                                    value={formData.block_size_hectares}
                                    onChange={handleInputChange}
                                    placeholder="e.g. 2.5"
                                    min="0"
                                    step="0.1"
                                    className={`w-full p-2.5 rounded-lg border bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 ${blockExceedsMax || blockExceedsField
                                        ? 'border-red-400 focus:ring-red-400'
                                        : 'border-gray-200 dark:border-gray-700 focus:ring-green-500'
                                        }`}
                                />
                                {blockExceedsMax && (
                                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle size={11} /> Exceeds registered farm size of {farmerMaxHa} Ha.
                                    </p>
                                )}
                                {blockExceedsField && !blockExceedsMax && (
                                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle size={11} /> Block size cannot exceed total field size.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Field size */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Total Field Size (Ha) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="field_size_hectares"
                                value={formData.field_size_hectares}
                                onChange={handleInputChange}
                                placeholder="e.g. 10"
                                min="0"
                                step="0.1"
                                className={`w-full p-2.5 rounded-lg border bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 ${fieldExceedsMax
                                    ? 'border-red-400 focus:ring-red-400'
                                    : 'border-gray-200 dark:border-gray-700 focus:ring-green-500'
                                    }`}
                            />
                            {fieldExceedsMax && (
                                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                                    <AlertTriangle size={11} /> Exceeds registered farm size of {farmerMaxHa} Ha.
                                </p>
                            )}
                        </div>

                        {/* Yield goal + Expected price — side by side */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Yield Goal (kg) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">kg</span>
                                    <input
                                        type="number"
                                        name="yield_goal_kg"
                                        value={formData.yield_goal_kg}
                                        onChange={handleInputChange}
                                        placeholder="5000"
                                        min="0"
                                        step="1"
                                        className="w-full pl-10 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                {selectedFarmer?.production_capacity_tons && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        From capacity: {selectedFarmer.production_capacity_tons} t/season
                                    </p>
                                )}
                                {yieldWarning && (
                                    <p className="text-xs text-amber-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle size={11} /> Over 50% above farmer capacity.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Selling Price (Rwf/kg) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">Rwf</span>
                                    <input
                                        type="number"
                                        name="expected_price_per_kg"
                                        value={formData.expected_price_per_kg}
                                        onChange={handleInputChange}
                                        placeholder="400"
                                        min="0"
                                        step="1"
                                        className="w-full pl-10 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Expected market rate at harvest</p>
                            </div>
                        </div>
                    </section>

                    {/* ── Section 2: Global Budget ── */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">2. Global Limit</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Total Production Budget (Rwf) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rwf</span>
                                <input
                                    type="number"
                                    name="total_budget"
                                    value={formData.total_budget || ''}
                                    onChange={(e) => handleNumericChange('total_budget', e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 text-lg font-bold rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                            {projRevenue > 0 && formData.total_budget > profitableBudgetCeiling && (
                                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-lg">
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 mb-2">
                                        <AlertTriangle size={11} />
                                        At this budget, the cycle will not reach a {TARGET_MARGIN * 100}% profit margin.
                                        A budget of <strong>{fmt(profitableBudgetCeiling)} Rwf</strong> or less is recommended.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleNumericChange('total_budget', String(profitableBudgetCeiling))}
                                        className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2"
                                    >
                                        Apply recommended budget ({fmt(profitableBudgetCeiling)} Rwf)
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── Budget reserve tracker ── */}
                    <div className={`sticky top-0 z-20 transition-transform duration-300 ${remaining < 0 ? 'scale-105' : 'scale-100'}`}>
                        <div className={`p-4 rounded-xl shadow-lg border ${remaining < 0
                            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                            : remaining === 0 && formData.total_budget > 0
                                ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                            }`}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Calculator size={18} />
                                    <span className="font-semibold text-sm">
                                        {remaining < 0 ? 'Over Budget:' : 'Contingency / Reserve:'}
                                    </span>
                                </div>
                                <span className="font-mono font-bold text-lg">{remaining.toLocaleString()} Rwf</span>
                            </div>
                            {remaining < 0 && (
                                <p className="text-xs mt-1 font-medium flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    Over budget by {Math.abs(remaining).toLocaleString()} Rwf — reduce category allocations.
                                </p>
                            )}
                            {remaining > 0 && formData.total_budget > 0 && (
                                <p className="text-xs mt-1 font-medium flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    {((remaining / formData.total_budget) * 100).toFixed(1)}% held as operational reserve. This is healthy.
                                </p>
                            )}
                            {remaining === 0 && formData.total_budget > 0 && (
                                <p className="text-xs mt-1 font-medium flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    No reserve — consider keeping a contingency buffer.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Section 3: Category Buckets ── */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">3. Category Allocation</h3>
                            {profitableBudgetCeiling > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const base = formData.total_budget > 0 ? formData.total_budget : profitableBudgetCeiling;
                                        setFormData(prev => ({
                                            ...prev,
                                            budget_seeds: Math.round(base * suggestedSplit.budget_seeds),
                                            budget_fertilizers: Math.round(base * suggestedSplit.budget_fertilizers),
                                            budget_chemicals: Math.round(base * suggestedSplit.budget_chemicals),
                                            budget_labor: Math.round(base * suggestedSplit.budget_labor),
                                        }));
                                    }}
                                    className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1 hover:underline transition-all"
                                >
                                    <Calculator size={12} />
                                    Suggest split
                                </button>
                            )}
                        </div>
                        {categoryZeroError && (
                            <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                <AlertTriangle size={11} /> All four categories must have an allocation greater than 0.
                            </p>
                        )}
                        <div className="space-y-4">
                            {budgetCategories.map(({ key, label }) => (
                                <div key={key}>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                                        <span className="text-xs text-gray-400">
                                            {(formData[key] as number) > 0 && formData.total_budget > 0
                                                ? `${(((formData[key] as number) / formData.total_budget) * 100).toFixed(1)}%`
                                                : '0%'}
                                        </span>
                                    </div>
                                    <input
                                        type="number"
                                        value={(formData[key] as number) || ''}
                                        onChange={(e) => handleNumericChange(key, e.target.value)}
                                        className={`w-full p-2.5 rounded-lg border bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 ${formData.total_budget > 0 && (formData[key] as number) === 0
                                            ? 'border-red-400 focus:ring-red-400'
                                            : 'border-gray-200 dark:border-gray-700 focus:ring-green-500'
                                            }`}
                                        placeholder={`Allocated for ${label}`}
                                        min="0"
                                    />
                                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 mt-1 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-300"
                                            style={{ width: `${Math.min((((formData[key] as number) || 0) / (formData.total_budget || 1)) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── Section 4: Projected P&L ── */}
                    {showPnL && (
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">4. Projected P&amp;L</h3>
                            <div className={`rounded-xl border p-4 space-y-3 ${projProfit >= 0
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/40'
                                : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/40'
                                }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {projProfit >= 0
                                        ? <TrendingUp size={15} className="text-green-600 dark:text-green-400" />
                                        : <TrendingDown size={15} className="text-red-600 dark:text-red-400" />
                                    }
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Cycle profitability estimate
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Expected revenue</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-100">{fmt(projRevenue)} Rwf</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Production cost</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-100">{fmt(formData.total_budget)} Rwf</span>
                                        </div>
                                        <div className="h-px bg-gray-200 dark:bg-gray-600" />
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-gray-700 dark:text-gray-200">Est. profit</span>
                                            <span className={`font-bold text-sm ${projProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {projProfit >= 0 ? '+' : ''}{fmt(projProfit)} Rwf
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Profit margin</span>
                                            <span className={`font-bold ${projMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {projMargin.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Cost per kg</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-100">{fmt(costPerKg)} Rwf</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Price per kg</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-100">{fmt(pricePerKg)} Rwf</span>
                                        </div>
                                    </div>
                                </div>
                                {projProfit < 0 && (
                                    <div className="pt-2 border-t border-red-200 dark:border-red-800 space-y-2">
                                        <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                            <AlertTriangle size={11} />
                                            Production cost exceeds projected revenue by {fmt(Math.abs(projProfit))} Rwf.
                                            Review your budget, yield goal, or selling price before proceeding.
                                        </p>
                                        <label className="flex items-start gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={lossAcknowledged}
                                                onChange={(e) => setLossAcknowledged(e.target.checked)}
                                                className="mt-0.5 accent-red-500 cursor-pointer"
                                            />
                                            <span className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">
                                                I understand this cycle is projected to run at a loss and confirm the figures are intentional.
                                            </span>
                                        </label>
                                    </div>
                                )}
                                {projProfit >= 0 && projMargin < 10 && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 pt-1 border-t border-green-200 dark:border-green-800">
                                        <AlertTriangle size={11} />
                                        Margin below 10% — thin buffer for unexpected costs.
                                    </p>
                                )}
                            </div>
                        </section>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <button
                        onClick={() => onSubmit(formData)}
                        disabled={remaining < 0 || !isFormValid}
                        className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${remaining < 0 || !isFormValid
                            ? 'bg-gray-400 cursor-not-allowed opacity-70'
                            : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-green-900/20'
                            }`}
                    >
                        {remaining < 0
                            ? 'Over Budget — Reduce Allocations'
                            : duplicateCycle
                                ? 'Duplicate Active Cycle — Cannot Proceed'
                                : !isFormValid
                                    ? 'Fill All Required Fields'
                                    : remaining === 0
                                        ? 'Create Cycle — No Reserve (Proceed Anyway)'
                                        : projProfit < 0 && lossAcknowledged
                                            ? 'Create Cycle — Loss Acknowledged'
                                            : `Create & Activate Cycle — ${remaining.toLocaleString()} Rwf Reserve`
                        }
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default CreateCropCycleModal;
