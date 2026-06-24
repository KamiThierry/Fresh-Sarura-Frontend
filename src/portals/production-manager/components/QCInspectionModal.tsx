import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, Activity, Image as ImageIcon, Scale, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface QCInspectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (result: string) => void;
    intakeId?: string; // Optional prop if we want to pre-select
    onConfirm: () => void; // Matches the usage in InventoryManagement
}

interface Intake {
    id: string;
    crop: string;
    farmer: string;
    arrival: string;
    weight: string;
    status: 'pending_qc';
}

const QCInspectionModal = ({ isOpen, onClose, onSubmit, intakeId, onConfirm }: QCInspectionModalProps) => {
    const [selectedIntake, setSelectedIntake] = useState<Intake | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        appearance: 'Good',
        maturity: 'Stage 1',
        pulpTemp: '',
        moisture: '',
        insectDamage: false,
        foreignMatter: false,
        comments: '',
        decision: '' // Pass, Conditional, Reject
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mock Pending Intakes (Data Source)
    const pendingIntakes: Intake[] = [
        { id: 'INT-2026-001', crop: 'Avocados', farmer: 'Kinvest Farm', arrival: 'Today, 08:30 AM', weight: '1,200 kg', status: 'pending_qc' },
        { id: 'INT-2026-002', crop: 'French Beans', farmer: 'Jean Claude', arrival: 'Today, 10:15 AM', weight: '350 kg', status: 'pending_qc' },
        { id: 'INT-2026-005', crop: 'Chili', farmer: 'Bugesera Co-op', arrival: 'Yesterday, 04:00 PM', weight: '400 kg', status: 'pending_qc' },
    ];

    // Filter Logic
    const filteredIntakes = pendingIntakes.filter(item =>
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.crop.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.farmer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle External Prop Selection (if passed from parent)
    useEffect(() => {
        if (intakeId) {
            const found = pendingIntakes.find(i => i.id === intakeId);
            if (found) setSelectedIntake(found);
        }
    }, [intakeId]);

    // Reset state when drawer closes
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setSelectedIntake(null);
                setFormData({
                    appearance: 'Good',
                    maturity: 'Stage 1',
                    pulpTemp: '',
                    moisture: '',
                    insectDamage: false,
                    foreignMatter: false,
                    comments: '',
                    decision: ''
                });
                setSearchTerm('');
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = () => {
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.decision) return;

        setIsSubmitting(true);
        setTimeout(() => {
            // Logic: Pass -> Unlocks Sorting, Reject -> Locks Stock
            // We just notify parent here
            onConfirm();
            onSubmit(formData.decision === 'Pass' ? 'QC Passed' : 'Rejected');
            setIsSubmitting(false);
            onClose();
        }, 1000);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-5xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ShieldCheck className="text-purple-600" size={24} />
                            QC Inspection
                        </h2>
                        <p className="text-xs text-gray-500 max-w-xs sm:max-w-md truncate">
                            {selectedIntake
                                ? `Logging Intake #${selectedIntake.id} • ${selectedIntake.crop}`
                                : 'Select a pending intake to log results'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {!selectedIntake ? (
                        // Step 1: Selection View
                        <div className="w-full h-full overflow-y-auto custom-scrollbar p-6 md:p-8">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Pending Intakes</h3>
                            <div className="space-y-3">
                                {filteredIntakes.map(intake => (
                                    <div
                                        key={intake.id}
                                        onClick={() => setSelectedIntake(intake)}
                                        className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 cursor-pointer transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 dark:text-white">{intake.crop}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    {intake.weight}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">{intake.arrival}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                <span className="block text-xs uppercase tracking-wide text-gray-400">Farmer</span>
                                                {intake.farmer}
                                            </div>
                                            <div className="text-xs text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                Log Results <ArrowRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Step 2: Inspection Form (Split View)
                        <>
                            {/* Left Column: Metrics & Decision */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8 border-r border-gray-100 dark:border-gray-700">

                                {/* Section 1: Quality Metrics */}
                                <section>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Activity size={16} /> Quality Metrics
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Appearance */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Appearance</label>
                                            <div className="flex gap-2">
                                                {['Poor', 'Fair', 'Good', 'Excellent'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => setFormData({ ...formData, appearance: opt })}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.appearance === opt
                                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Maturity */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Maturity</label>
                                            <select
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-purple-500"
                                                value={formData.maturity}
                                                onChange={(e) => setFormData({ ...formData, maturity: e.target.value })}
                                            >
                                                <option>Stage 1</option>
                                                <option>Stage 2</option>
                                                <option>Stage 3</option>
                                            </select>
                                        </div>

                                        {/* Pulp Temp */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Pulp Temp (°C)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 18.5"
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-purple-500 font-mono"
                                                value={formData.pulpTemp}
                                                onChange={(e) => setFormData({ ...formData, pulpTemp: e.target.value })}
                                            />
                                        </div>

                                        {/* Moisture */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Moisture (%)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 12"
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-purple-500 font-mono"
                                                value={formData.moisture}
                                                onChange={(e) => setFormData({ ...formData, moisture: e.target.value })}
                                            />
                                        </div>

                                        {/* Binary Checks */}
                                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Insect Damage</span>
                                            <button
                                                onClick={() => setFormData({ ...formData, insectDamage: !formData.insectDamage })}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${formData.insectDamage ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.insectDamage ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Foreign Matter</span>
                                            <button
                                                onClick={() => setFormData({ ...formData, foreignMatter: !formData.foreignMatter })}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${formData.foreignMatter ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.foreignMatter ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 2: Final Decision */}
                                <section>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Scale size={16} /> Final Decision
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setFormData({ ...formData, decision: 'Pass' })}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${formData.decision === 'Pass'
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-green-200'}`}
                                        >
                                            <CheckCircle2 size={32} />
                                            <span className="font-bold">PASS & UNLOCK</span>
                                        </button>

                                        <button
                                            onClick={() => setFormData({ ...formData, decision: 'Reject' })}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${formData.decision === 'Reject'
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-red-200'}`}
                                        >
                                            <AlertTriangle size={32} />
                                            <span className="font-bold">REJECT LOT</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-center text-gray-400 mt-2">
                                        {formData.decision === 'Pass'
                                            ? "Passing allows this lot to proceed to Sorting & Grading."
                                            : formData.decision === 'Reject'
                                                ? "Rejection will lock this stock and trigger a non-conformance report."
                                                : "Select a decision to proceed."}
                                    </p>
                                </section>
                            </div>

                            {/* Right Column: Evidence & Comments */}
                            <div className="w-full md:w-80 flex-none bg-gray-50 dark:bg-gray-900/30 p-6 md:p-8 flex flex-col gap-6">

                                {/* Photo Evidence */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        Attach Paper Log / Evidence
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 hover:text-purple-500 hover:border-purple-500 hover:bg-white dark:hover:bg-gray-800 transition-all">
                                            <ImageIcon size={20} />
                                            <span className="text-[10px] font-medium mt-1">Add Photo</span>
                                        </button>
                                        <div className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-700"></div>
                                    </div>
                                </div>

                                {/* Comments */}
                                <div className="flex-1 flex flex-col">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        Inspector Comments
                                    </label>
                                    <textarea
                                        className="flex-1 w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-purple-500 resize-none"
                                        placeholder="Add notes about specific defects or observations..."
                                        value={formData.comments}
                                        onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                                    ></textarea>
                                </div>

                                {/* Submit Action */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={!formData.decision || isSubmitting}
                                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <span>{isSubmitting ? 'Submitting...' : 'Submit Result'}</span>
                                    <CheckCircle size={18} />
                                </button>

                            </div>
                        </>
                    )}

                </div>

            </div>
        </div>,
        document.body
    );
};

export default QCInspectionModal;
