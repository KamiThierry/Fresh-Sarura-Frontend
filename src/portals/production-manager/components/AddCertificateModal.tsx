import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Upload, ShieldCheck, Calendar, FileText } from 'lucide-react';

interface AddCertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    defaultFarmer?: string;
}

const AddCertificateModal = ({ isOpen, onClose, onSubmit, defaultFarmer }: AddCertificateModalProps) => {
    const [formData, setFormData] = useState({
        farmer: defaultFarmer ?? '',
        type: 'GlobalG.A.P',
        auditNumber: '',
        validFrom: '',
        expiryDate: '',
        auditBody: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(formData.expiryDate);

        if (expiry < today) {
            alert('Certificate expiry date cannot be in the past.');
            return;
        }

        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            onSubmit(formData);
            setIsSubmitting(false);
            onClose();
            // Reset form
            setFormData({
                farmer: '',
                type: 'GlobalG.A.P',
                auditNumber: '',
                validFrom: '',
                expiryDate: '',
                auditBody: '',
            });
        }, 1000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record New Certification</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Upload a newly issued compliance certificate</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/50 dark:bg-gray-900/50">
                    <form id="cert-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Farmer Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Farmer / Entity</label>
                            {defaultFarmer ? (
                                <div className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    {defaultFarmer}
                                </div>
                            ) : (
                                <select
                                    required
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    value={formData.farmer}
                                    onChange={(e) => setFormData({ ...formData, farmer: e.target.value })}
                                >
                                    <option value="" disabled>Select a farmer that passed audit...</option>
                                    <option value="Jean Claude">Jean Claude</option>
                                    <option value="Kirehe Co-op">Kirehe Co-op</option>
                                    <option value="Marie Claire">Marie Claire</option>
                                    <option value="Bugesera Outgrowers">Bugesera Outgrowers</option>
                                    <option value="Robert / Almond">Robert / Almond</option>
                                    <option value="Rusizi Organic">Rusizi Organic</option>
                                </select>
                            )}
                        </div>

                        {/* Certificate Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Certification Type</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-3 top-2.5 text-blue-500" size={18} />
                                <select
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white appearance-none"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="GlobalG.A.P">GlobalG.A.P</option>
                                    <option value="SMETA">SMETA (Social Audit)</option>
                                    <option value="Organic (EU)">Organic (EU)</option>
                                    <option value="Fair Trade">Fair Trade</option>
                                    <option value="Rainforest Alliance">Rainforest Alliance</option>
                                </select>
                            </div>
                        </div>

                        {/* Audit Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">GGN / Audit Number</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                    placeholder="e.g. 4059883..."
                                    required
                                    value={formData.auditNumber}
                                    onChange={(e) => setFormData({ ...formData, auditNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Audit Body</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                    placeholder="e.g. SGS"
                                    required
                                    value={formData.auditBody}
                                    onChange={(e) => setFormData({ ...formData, auditBody: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Valid From</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                        required
                                        value={formData.validFrom}
                                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expiry Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                        required
                                        min={formData.validFrom || new Date().toISOString().split('T')[0]}
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Certificate Document (PDF)</label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group bg-white dark:bg-gray-800">
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                                    <Upload size={24} />
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Click to upload or drag and drop</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, JPG or PNG (Max 5MB)</p>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="cert-form"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                    >
                        {isSubmitting ? 'Saving...' : (
                            <>
                                <CheckCircle size={16} />
                                Save Certificate
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default AddCertificateModal;
