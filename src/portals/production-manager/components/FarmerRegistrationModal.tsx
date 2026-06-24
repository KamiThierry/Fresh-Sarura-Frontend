import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { getProvinces, getDistricts, getSectors } from '@/lib/rwandaLocations';

interface FarmerRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFarmerAdded: (name: string) => void;
}

const FarmerRegistrationModal = ({ isOpen, onClose, onFarmerAdded }: FarmerRegistrationModalProps) => {
    const [formData, setFormData] = useState({
        full_name: '',
        farm_name: '',
        national_id: '',
        province: '',   // UI-only for cascading dropdowns — not sent to backend
        district: '',
        sector: '',
        cell: '',
        village: '',    // Required by backend
        produce_types: [] as string[],
        farm_size_hectares: '',
        production_capacity_tons: '',
        phone: '',
        email: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cascading dropdown options
    const provinceOptions = getProvinces();
    const districtOptions = formData.province ? getDistricts(formData.province) : [];
    const sectorOptions = (formData.province && formData.district) ? getSectors(formData.province, formData.district) : [];

    const produceOptions = [
        'French Beans', 'Chili Peppers', 'Avocados',
        'Passion Fruits', 'Tomatoes', 'Mangoes',
    ];

    const handleProduceToggle = (produce: string) => {
        setFormData(prev => ({
            ...prev,
            produce_types: prev.produce_types.includes(produce)
                ? prev.produce_types.filter(p => p !== produce)
                : [...prev.produce_types, produce],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side guard for produce_types (can't use HTML required on buttons)
        if (formData.produce_types.length === 0) {
            setError('Please select at least one produce type.');
            return;
        }

        // Email validation for gmail (if provided)
        if (formData.email && !formData.email.toLowerCase().endsWith('@gmail.com')) {
            setError('Email must be a valid @gmail.com account.');
            return;
        }

        // Phone validation for Rwandan format (+2507... or 07...) (if provided)
        if (formData.phone) {
            const phoneRegex = /^(?:\+250|0)7[2389]\d{7}$/;
            const strippedPhone = formData.phone.replace(/[\s-]/g, '');
            if (!phoneRegex.test(strippedPhone)) {
                setError('Please enter a valid Rwandan phone number (e.g., +25078... or 078...).');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const dataToSubmit = {
                ...formData,
                farm_size_hectares: parseFloat(formData.farm_size_hectares),
                production_capacity_tons: parseFloat(formData.production_capacity_tons),
            };
            await api.post('/farmers', dataToSubmit);
            onFarmerAdded(formData.full_name);
            onClose();
        } catch (err: any) {
            const msg = err.message?.toLowerCase() || '';
            if (msg.includes('duplicate') || msg.includes('e11000')) {
                if (msg.includes('national_id')) {
                    setError('A farmer with this National ID already exists.');
                } else if (msg.includes('email')) {
                    setError('A farmer with this email address already exists.');
                } else if (msg.includes('phone')) {
                    setError('A farmer with this phone number already exists.');
                } else {
                    setError('A farmer with these unique details already exists.');
                }
            } else {
                setError(err.message || 'Failed to register farmer. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Register New Farmer</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Add a new supplier to the network</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {/* Error Banner */}
                    {error && (
                        <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form id="farmer-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text" required
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="Enter farmer's full name"
                                />
                            </div>
                        </div>

                        {/* Farm Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Farm Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                value={formData.farm_name}
                                onChange={e => setFormData({ ...formData, farm_name: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                placeholder="Enter farm name (if applicable)"
                            />
                        </div>

                        {/* National ID */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">National ID (16 Digits) *</label>
                                <span className="text-[10px] text-blue-500 font-medium">Checked for duplicates</span>
                            </div>
                            <input
                                type="text" required maxLength={16} minLength={16} pattern="\d{16}" title="National ID must be exactly 16 digits"
                                value={formData.national_id}
                                onChange={e => setFormData({ ...formData, national_id: e.target.value.replace(/\D/g, '') })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                placeholder="e.g. 1199008012345678"
                            />
                        </div>

                        {/* Province */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Province *</label>
                            <select
                                required
                                value={formData.province}
                                onChange={e => setFormData({ ...formData, province: e.target.value, district: '', sector: '' })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            >
                                <option value="">Select Province</option>
                                {provinceOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>

                        {/* District & Sector */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">District *</label>
                                <select
                                    required
                                    value={formData.district}
                                    onChange={e => setFormData({ ...formData, district: e.target.value, sector: '' })}
                                    disabled={!formData.province}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select District</option>
                                    {districtOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sector *</label>
                                <select
                                    required
                                    value={formData.sector}
                                    onChange={e => setFormData({ ...formData, sector: e.target.value })}
                                    disabled={!formData.district}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select Sector</option>
                                    {sectorOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Cell & Village */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cell *</label>
                                <input
                                    type="text" required minLength={2}
                                    value={formData.cell}
                                    onChange={e => setFormData({ ...formData, cell: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="Enter cell name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Village *</label>
                                <input
                                    type="text" required minLength={2}
                                    value={formData.village}
                                    onChange={e => setFormData({ ...formData, village: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="Enter village name"
                                />
                            </div>
                        </div>

                        {/* Produce Types */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Produce Type *{' '}
                                {formData.produce_types.length === 0 && (
                                    <span className="text-xs font-normal text-gray-400">(select at least one)</span>
                                )}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {produceOptions.map(produce => (
                                    <button
                                        key={produce} type="button"
                                        onClick={() => handleProduceToggle(produce)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            formData.produce_types.includes(produce)
                                                ? 'bg-green-100 text-green-700 border-2 border-green-500 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-green-500 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700'
                                        }`}
                                    >
                                        {produce}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Farm Size & Capacity */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Farm Size (Ha) *</label>
                                <input
                                    type="number" step="0.01" min="0.01" max="10000" required
                                    value={formData.farm_size_hectares}
                                    onChange={e => setFormData({ ...formData, farm_size_hectares: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity (Tons/Year) *</label>
                                <input
                                    type="number" step="0.01" min="0.01" max="50000" required
                                    value={formData.production_capacity_tons}
                                    onChange={e => setFormData({ ...formData, production_capacity_tons: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Phone & Email */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number *</label>
                                <input
                                    type="tel" required pattern="^(?:\+2507|07)\d{8}$" title="Must be a valid Rwandan phone number starting with +2507 or 07 followed by 8 digits"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/[^\d+]/g, '') })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="+2507xxxxxxxx or 07xxxxxxxx"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address *</label>
                                <input
                                    type="email" required pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}" title="Please enter a valid email address"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="farmer@example.com"
                                />
                            </div>
                        </div>

                        {/* ID Upload */}
                        {/* <div className="pt-2">
                            <button
                                type="button"
                                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
                            >
                                <Upload size={24} className="mb-2" />
                                <span className="text-sm font-medium">Click to upload ID Card</span>
                                <span className="text-xs text-gray-400 mt-1">JPG, PNG or PDF (Max 5MB)</span>
                            </button>
                        </div> */}

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="farmer-form"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Registering...' : 'Register Farmer'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FarmerRegistrationModal;
