import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Save, CheckCircle, RefreshCw } from 'lucide-react';

// --- Types & Constants ---
interface LogRawIntakeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: IntakeFormData, intakeId: string) => void;
}

interface IntakeFormData {
    farmerId: string;
    cycleId: string;
    driverPlate: string;
    arrivalTime: string;
    grossWeight: string;
    numberOfCrates: string;
    arrivalCondition: string;
    collectionSource: 'Field Collection' | 'Truck Delivery';
    notes: string;
}

const farmers = [
    { farmer_id: 1, name: 'Kinvest Farm' },
    { farmer_id: 2, name: 'Rusizi Co-op' },
    { farmer_id: 3, name: 'Jean Claude' },
    { farmer_id: 4, name: 'Simbi Farm A' },
    { farmer_id: 5, name: 'Kamonyi Growers' },
];

const cropCycles = [
    { cycle_id: 101, farmer_id: 1, crop_name: 'Avocados', season: 'Season A', cycle_code: 'CY-2024001' },
    { cycle_id: 102, farmer_id: 1, crop_name: 'French Beans', season: 'Season B', cycle_code: 'CY-2024002' },
    { cycle_id: 103, farmer_id: 2, crop_name: 'Bird Eye Chili', season: 'Season A', cycle_code: 'CY-2024003' },
    { cycle_id: 104, farmer_id: 3, crop_name: 'Snow Peas', season: 'Season A', cycle_code: 'CY-2024004' },
    { cycle_id: 105, farmer_id: 4, crop_name: 'Baby Courgettes', season: 'Season C', cycle_code: 'CY-2024005' },
    { cycle_id: 106, farmer_id: 5, crop_name: 'French Beans', season: 'Season A', cycle_code: 'CY-2024006' },
];
const conditionOptions = [
    { value: 'Optimal', label: 'Optimal', color: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
    { value: 'Acceptable', label: 'Acceptable', color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
    { value: 'Poor/Damaged', label: 'Poor / Damaged', color: 'text-red-700   bg-red-100   dark:bg-red-900/30   dark:text-red-400' },
];

// Generates a mock Intake ID like INT-20260308-007
const generateIntakeId = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(Math.floor(Math.random() * 900) + 100);
    return `INT-${date}-${seq}`;
};

// Returns current datetime in "YYYY-MM-DDThh:mm" string for datetime-local input
const nowDatetimeLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

const defaultForm = (): IntakeFormData => ({
    farmerId: '',
    cycleId: '',
    driverPlate: '',
    arrivalTime: nowDatetimeLocal(),
    grossWeight: '',
    numberOfCrates: '',
    arrivalCondition: 'Optimal',
    collectionSource: 'Field Collection',
    notes: '',
});

// --- Field Components ---
const inputClass =
    'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-400';
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5';

// --- Main Modal ---
const LogRawIntakeModal = ({ isOpen, onClose, onSubmit }: LogRawIntakeModalProps) => {
    const [form, setForm] = useState<IntakeFormData>(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successId, setSuccessId] = useState<string | null>(null);

    if (!isOpen) return null;

    const set = (field: keyof IntakeFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleClose = () => {
        setForm(defaultForm());
        setSuccessId(null);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            const id = generateIntakeId();
            setSubmitting(false);
            setSuccessId(id);
            // Example formatting of payload matching the requirements:
            const payload = { ...form, farmerId: parseInt(form.farmerId), cycleId: parseInt(form.cycleId) };
            onSubmit?.(payload as any, id);
            setIsSubmitting(false);
        }, 900);
    };

    // Tiny helper so closure sees latest setter
    const setSubmitting = (v: boolean) => setIsSubmitting(v);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[92vh]">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                            <Truck size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Log Raw Intake</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Record inbound harvest deliveries.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Success State ── */}
                {successId ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle size={36} className="text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Intake Logged!</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">New intake record has been created.</p>
                        </div>
                        <div className="px-6 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Intake ID</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400 font-mono tracking-wide">{successId}</p>
                        </div>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => { setSuccessId(null); setForm(defaultForm()); }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <RefreshCw size={15} /> Log Another
                            </button>
                            <button
                                onClick={handleClose}
                                className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Scrollable Form Body ── */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="log-intake-form" onSubmit={handleSubmit}>

                                {/* Section 1 Banner */}
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Source & Logistics</p>

                                {/* 2-col grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

                                    {/* Field 1: Supplier */}
                                    <div>
                                        <label className={labelClass}>Supplier / Farmer</label>
                                        <select
                                            required
                                            value={form.farmerId}
                                            onChange={(e) => setForm(prev => ({ ...prev, farmerId: e.target.value, cycleId: '' }))}
                                            className={inputClass}
                                        >
                                            <option value="">Select Supplier...</option>
                                            {farmers.map(f => <option key={f.farmer_id} value={f.farmer_id}>{f.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Field 2: Crop Cycle */}
                                    <div>
                                        <label className={labelClass}>Active Crop Cycle</label>
                                        <select
                                            required
                                            value={form.cycleId}
                                            onChange={set('cycleId')}
                                            className={inputClass}
                                            disabled={!form.farmerId}
                                        >
                                            <option value="">{form.farmerId ? 'Select Crop Cycle...' : 'Select Farmer First'}</option>
                                            {cropCycles
                                                .filter(c => c.farmer_id.toString() === form.farmerId)
                                                .map(c => (
                                                    <option key={c.cycle_id} value={c.cycle_id}>
                                                        {c.crop_name} - {c.season} ({c.cycle_code})
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* Field 3: Driver / Truck */}
                                    <div>
                                        <label className={labelClass}>Driver / Truck Plate</label>
                                        <input
                                            type="text"
                                            value={form.driverPlate}
                                            onChange={set('driverPlate')}
                                            placeholder="e.g., Truck A (RAD 123 A)"
                                            className={inputClass}
                                        />
                                    </div>

                                    {/* Field 4: Arrival Time */}
                                    <div>
                                        <label className={labelClass}>Arrival Time</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={form.arrivalTime}
                                            onChange={set('arrivalTime')}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mb-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Cargo Metrics</p>
                                </div>

                                {/* 3-col grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                                    {/* Field 5: Gross Weight */}
                                    <div>
                                        <label className={labelClass}>Declared Gross Weight</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                step="0.1"
                                                required
                                                value={form.grossWeight}
                                                onChange={set('grossWeight')}
                                                placeholder="0"
                                                className={`${inputClass} pr-10`}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">kg</span>
                                        </div>
                                    </div>

                                    {/* Field 6: Crates */}
                                    <div>
                                        <label className={labelClass}>Number of Crates</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.numberOfCrates}
                                            onChange={set('numberOfCrates')}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                    </div>

                                    {/* Field 7: Arrival Condition */}
                                    <div>
                                        <label className={labelClass}>Arrival Condition</label>
                                        <select
                                            required
                                            value={form.arrivalCondition}
                                            onChange={set('arrivalCondition')}
                                            className={`${inputClass} font-semibold ${conditionOptions.find(o => o.value === form.arrivalCondition)?.color ?? ''
                                                }`}
                                        >
                                            {conditionOptions.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Collection Source Toggle */}
                                <div className="mb-6">
                                    <label className={labelClass}>Collection Source</label>
                                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                                        {(['Field Collection', 'Truck Delivery'] as const).map(option => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setForm(prev => ({ ...prev, collectionSource: option }))}
                                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${form.collectionSource === option
                                                    ? 'bg-white dark:bg-gray-600 text-green-700 dark:text-green-400 shadow-sm'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                    }`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className={labelClass}>Notes / Observations (optional)</label>
                                    <textarea
                                        rows={3}
                                        value={form.notes}
                                        onChange={set('notes')}
                                        placeholder="Any visible damage, unusual smell, packaging issues..."
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>
                            </form>
                        </div>

                        {/* ── Footer ── */}
                        <div className="bg-gray-50 dark:bg-gray-900/40 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="log-intake-form"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 active:scale-[0.98] transition-all shadow-sm shadow-green-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw size={15} className="animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Save size={15} />
                                        Save &amp; Generate Intake ID
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default LogRawIntakeModal;
