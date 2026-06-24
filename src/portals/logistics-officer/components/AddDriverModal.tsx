import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, Calendar, Save, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToastContext } from '@/context/ToastContext';

interface AddDriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AddDriverModal = ({ isOpen, onClose, onSuccess }: AddDriverModalProps) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '+250 ',
        licenseType: 'Cat B',
        licenseExpiry: '',
        status: 'Idle'
    });
    const [isExpired, setIsExpired] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [phoneError, setPhoneError] = useState('');
    const { showToast } = useToastContext();

    useEffect(() => {
        if (formData.licenseExpiry) {
            const today = new Date();
            const expiry = new Date(formData.licenseExpiry);
            setIsExpired(expiry < today);
        } else {
            setIsExpired(false);
        }
    }, [formData.licenseExpiry]);

    if (!isOpen) return null;

    const minExpiryDate = new Date();
    minExpiryDate.setFullYear(minExpiryDate.getFullYear() + 10);
    const minExpiryStr = minExpiryDate.toISOString().split('T')[0];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const selectedDate = new Date(formData.licenseExpiry);

        // Phone validation (numeric only, exactly 10 digits)
        const numericPhone = formData.phoneNumber.replace(/\D/g, '');
        if (numericPhone.length !== 10) {
            setPhoneError('Phone number must be exactly 10 digits (e.g. 0788000000).');
            return;
        } else {
            setPhoneError('');
        }

        if (selectedDate < minExpiryDate) {
            alert('License expiry date must be at least 10 years in the future.');
            return;
        }

        if (isExpired) return;
        setIsSubmitting(true);
        try {
            await api.post('/fleet/drivers', formData);
            showToast('Driver Registered', `${formData.firstName} ${formData.lastName} has been added successfully.`);
            onSuccess();
            onClose();
            setFormData({
                firstName: '',
                lastName: '',
                phoneNumber: '',
                licenseType: 'Cat B',
                licenseExpiry: '',
                status: 'Idle'
            });
        } catch (err: any) {
            console.error('Error adding driver:', err);
            showToast('Registration Error', err.message || 'Failed to add driver');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Register New Driver</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Create a personnel file for a new driver.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* First Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. John"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>

                        {/* Last Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Mugisha"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number (WhatsApp)</label>
                            <div className="relative">
                                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="tel"
                                    required
                                    placeholder="e.g. 0788000000"
                                    value={formData.phoneNumber}
                                    onChange={(e) => {
                                        setFormData({ ...formData, phoneNumber: e.target.value });
                                        if (phoneError) setPhoneError('');
                                    }}
                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 outline-none transition-all font-mono font-bold ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500'}`}
                                />
                            </div>
                            {phoneError ? (
                                <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    {phoneError}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-500 font-medium">Strictly 10 digits starting with 078, 079, or 072/073.</p>
                            )}
                        </div>

                        {/* License Category */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">License Category</label>
                            <select
                                value={formData.licenseType}
                                onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-bold"
                            >
                                <option value="Cat B">Cat B (Light)</option>
                                <option value="Cat C">Cat C (Heavy)</option>
                                <option value="Cat D">Cat D (Bus)</option>
                                <option value="Cat E">Cat E (Trailer)</option>
                                <option value="Cat F">Cat F (Special)</option>
                            </select>
                        </div>

                        {/* License Expiry */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">License Expiry Date</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    required
                                    min={minExpiryStr}
                                    value={formData.licenseExpiry}
                                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 outline-none transition-all font-medium ${isExpired ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500'}`}
                                />
                            </div>
                            {isExpired && (
                                <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-bold animate-pulse">
                                    <AlertCircle size={12} />
                                    License is expired!
                                </p>
                            )}
                        </div>

                        {/* Initial Status */}
                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Initial Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-bold"
                            >
                                <option value="Idle">Idle (Available)</option>
                                <option value="Off Duty">Off Duty</option>
                            </select>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isExpired || isSubmitting}
                            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all ${isExpired || isSubmitting ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 hover:scale-105 active:scale-95'}`}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {isSubmitting ? 'Saving...' : 'Save Driver'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AddDriverModal;
