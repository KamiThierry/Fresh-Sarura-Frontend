import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, MapPin, Leaf, Phone, Mail, Ruler, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Farmer } from '@/types';

interface EditFarmerModalProps {
    isOpen: boolean;
    onClose: () => void;
    farmer: Farmer;
    onSaved: (updated: Farmer) => void;
}

const PRODUCE_OPTIONS = [
    'Avocado', 'French Beans', 'Chili Peppers', 'Mango', 'Passion Fruit',
    'Macadamia', 'Banana', 'Coffee', 'Tea', 'Kale', 'Spinach', 'Tomatoes',
];

const FIELD = ({
    label,
    icon,
    children,
    hint,
}: {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    hint?: string;
}) => (
    <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            {icon}
            {label}
        </label>
        {children}
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
);

const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all';

const EditFarmerModal = ({ isOpen, onClose, farmer, onSaved }: EditFarmerModalProps) => {
    const [form, setForm] = useState({
        full_name: '',
        farm_name: '',
        phone: '',
        email: '',
        district: '',
        sector: '',
        cell: '',
        village: '',
        farm_size_hectares: '',
        production_capacity_tons: '',
        produce_types: [] as string[],
        status: 'Active' as 'Active' | 'Inactive' | 'Auditing',
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill whenever the modal opens with the current farmer data
    useEffect(() => {
        if (isOpen && farmer) {
            setForm({
                full_name: farmer.full_name ?? '',
                farm_name: (farmer as any).farm_name ?? '',
                phone: farmer.phone ?? '',
                email: farmer.email ?? '',
                district: farmer.district ?? '',
                sector: farmer.sector ?? '',
                cell: farmer.cell ?? '',
                village: farmer.village ?? '',
                farm_size_hectares: String(farmer.farm_size_hectares ?? ''),
                production_capacity_tons: String((farmer as any).production_capacity_tons ?? ''),
                produce_types: Array.isArray(farmer.produce_types) ? farmer.produce_types : [],
                status: (farmer.status as any) ?? 'Active',
            });
            setSaved(false);
            setError('');
        }
    }, [isOpen, farmer]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const toggleProduce = (crop: string) => {
        setForm(prev => ({
            ...prev,
            produce_types: prev.produce_types.includes(crop)
                ? prev.produce_types.filter(p => p !== crop)
                : [...prev.produce_types, crop],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name || !form.phone || !form.district || !form.sector || !form.cell || !form.village) {
            setError('Please fill in all required fields.');
            return;
        }
        if (form.produce_types.length === 0) {
            setError('Please select at least one produce type.');
            return;
        }
        setError('');
        setSaving(true);
        try {
            const payload = {
                ...form,
                farm_size_hectares: parseFloat(form.farm_size_hectares) || 0,
                production_capacity_tons: parseFloat(form.production_capacity_tons) || 0,
            };
            const res = await api.patch(`/farmers/${farmer._id}`, payload);
            setSaved(true);
            setTimeout(() => {
                onSaved(res.farmer);
                onClose();
                setSaved(false);
            }, 1200);
        } catch (err: any) {
            setError(err.message ?? 'Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="text-lg font-black text-green-600 dark:text-green-400">
                                {farmer.full_name.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Farmer Profile</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{farmer.full_name} · ID: {farmer.national_id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form body */}
                <form id="edit-farmer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-7">

                        {/* Section 1: Personal */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <User size={13} />
                                Personal Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FIELD label="Full Name *" icon={<User size={13} className="text-gray-400" />}>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={form.full_name}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. Jean Claude"
                                        className={inputCls}
                                    />
                                </FIELD>
                                <FIELD label="Farm Name">
                                    <input
                                        type="text"
                                        name="farm_name"
                                        value={form.farm_name}
                                        onChange={handleChange}
                                        placeholder="e.g. Kayonza Farm"
                                        className={inputCls}
                                    />
                                </FIELD>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FIELD label="Phone *" icon={<Phone size={13} className="text-gray-400" />}>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        required
                                        placeholder="+250 7XX XXX XXX"
                                        className={inputCls}
                                    />
                                </FIELD>
                                <FIELD label="Email" icon={<Mail size={13} className="text-gray-400" />}>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="farmer@example.com"
                                        className={inputCls}
                                    />
                                </FIELD>
                            </div>
                            <div>
                                <FIELD label="Account Status">
                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        className={inputCls}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Auditing">Auditing</option>
                                    </select>
                                </FIELD>
                            </div>
                        </section>

                        {/* Section 2: Location */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <MapPin size={13} />
                                Location
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FIELD label="District *">
                                    <input
                                        type="text"
                                        name="district"
                                        value={form.district}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. Nyagatare"
                                        className={inputCls}
                                    />
                                </FIELD>
                                <FIELD label="Sector *">
                                    <input
                                        type="text"
                                        name="sector"
                                        value={form.sector}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. Kayonza"
                                        className={inputCls}
                                    />
                                </FIELD>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FIELD label="Cell *">
                                    <input
                                        type="text"
                                        name="cell"
                                        value={form.cell}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. Intwari"
                                        className={inputCls}
                                    />
                                </FIELD>
                                <FIELD label="Village *">
                                    <input
                                        type="text"
                                        name="village"
                                        value={form.village}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. Ingenze"
                                        className={inputCls}
                                    />
                                </FIELD>
                            </div>
                        </section>

                        {/* Section 3: Farm */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <Ruler size={13} />
                                Farm Details
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FIELD label="Farm Size (Ha) *" icon={<Ruler size={13} className="text-gray-400" />}>
                                    <input
                                        type="number"
                                        name="farm_size_hectares"
                                        value={form.farm_size_hectares}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        step="0.1"
                                        placeholder="e.g. 5.5"
                                        className={inputCls}
                                    />
                                </FIELD>
                                <FIELD label="Production Capacity (tons/yr)">
                                    <input
                                        type="number"
                                        name="production_capacity_tons"
                                        value={form.production_capacity_tons}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.1"
                                        placeholder="e.g. 12"
                                        className={inputCls}
                                    />
                                </FIELD>
                            </div>

                            {/* Produce types */}
                            <FIELD
                                label="Produce Types *"
                                icon={<Leaf size={13} className="text-green-500" />}
                                hint="Select all crops grown on this farm"
                            >
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {PRODUCE_OPTIONS.map(crop => {
                                        const active = form.produce_types.includes(crop);
                                        return (
                                            <button
                                                key={crop}
                                                type="button"
                                                onClick={() => toggleProduce(crop)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                                    active
                                                        ? 'bg-green-600 border-green-600 text-white shadow-sm shadow-green-200 dark:shadow-green-900/30'
                                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400 hover:text-green-700 dark:hover:text-green-400'
                                                }`}
                                            >
                                                {active && '✓ '}{crop}
                                            </button>
                                        );
                                    })}
                                </div>
                            </FIELD>
                        </section>

                        {/* Read-only national ID notice */}
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs">
                            <span className="font-bold">Note:</span>
                            National ID (<span className="font-mono">{farmer.national_id}</span>) cannot be changed after registration.
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm font-medium">
                                {error}
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-farmer-form"
                        disabled={saving || saved}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2 transition-all shadow-md ${
                            saved
                                ? 'bg-green-500 shadow-green-200 dark:shadow-green-900/30'
                                : 'bg-green-600 hover:bg-green-700 shadow-green-900/20 active:scale-[0.98]'
                        } disabled:opacity-60`}
                    >
                        {saved ? (
                            <><CheckCircle2 size={16} /> Saved!</>
                        ) : saving ? (
                            <><Loader2 size={16} className="animate-spin" /> Saving…</>
                        ) : (
                            <><Save size={16} /> Save Changes</>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditFarmerModal;
