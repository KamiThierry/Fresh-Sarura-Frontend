import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ClipboardCheck, AlertTriangle, Scale } from 'lucide-react';

export interface QCInspectionData {
    intakeId: string;
    supplier: string;
    crop: string;
    grossWeight: number;
    assignedRoom?: string;
}

interface RecordQCModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: QCInspectionData | null;
    onSubmit?: (result: any) => void;
}

const defectTypes = [
    'None',
    'Bruising (Mechanical)',
    'Pest Damage',
    'Undersized',
    // 'Coloration',
    // 'Fungal Infection',
    // 'Dehydration'
];

const gradeOptions = [
    'Grade A (Export)',
    'Grade B (Local Market)',
    'Rejected (Disposal)'
];

const inputClass =
    'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-400';
const labelClass = 'block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1';

const RecordQCModal = ({ isOpen, onClose, data, onSubmit }: RecordQCModalProps) => {
    const [processedWeight, setProcessedWeight] = useState<string>('');
    const [rejectedWeight, setRejectedWeight] = useState<string>('');
    const [defectType, setDefectType] = useState<string>('None');
    const [grade, setGrade] = useState<string>('Grade A (Export)');

    // Reset state when opened with new data
    useEffect(() => {
        if (isOpen && data) {
            setProcessedWeight('');
            setRejectedWeight('');
            setDefectType('None');
            setGrade('Grade A (Export)');
        }
    }, [isOpen, data]);

    if (!isOpen || !data) return null;

    // Calculation
    const procVal = parseFloat(processedWeight) || 0;
    const rejVal = parseFloat(rejectedWeight) || 0;
    const netWeight = Math.max(0, procVal - rejVal);

    // Validations
    const processedExceedsReceived = procVal > data.grossWeight;
    const rejectedExceedsProcessed = rejVal > procVal;
    const hasValidationError = processedExceedsReceived || rejectedExceedsProcessed;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.({
            intakeId: data.intakeId,
            processedWeight: procVal,
            rejectedWeight: rejVal,
            defectType,
            grade,
            netWeight,
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Card */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30">
                            <Scale size={22} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complete Processing Record</h2>
                            <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wider mt-0.5">
                                {data.crop} · Room {data.assignedRoom || 'N/A'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    
                    {/* Reference Info Section */}
                    <div>
                        <p className="text-[10.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ClipboardCheck size={12} />
                            Reference Info (Read-only)
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Received Weight</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{data.grossWeight.toLocaleString()} kg</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Logged by Logistics Officer</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Batch Ref</p>
                                <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400">{data.intakeId.slice(-8).toUpperCase()}</p>
                            </div>
                        </div>
                    </div>

                    <form id="merged-qc-form" onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* Section 1: Processing Results */}
                        <div>
                            <p className="text-[10.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertTriangle size={12} />
                                Processing Results
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>Processed Weight (kg) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        max={data.grossWeight}
                                        step="0.1"
                                        value={processedWeight}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setProcessedWeight(val);
                                            const proc = parseFloat(val) || 0;
                                            const autoRejected = Math.max(0, data.grossWeight - proc);
                                            setRejectedWeight(autoRejected > 0 ? String(autoRejected) : '0');
                                        }}
                                        placeholder="0.0"
                                        className={`${inputClass} ${processedExceedsReceived ? 'border-red-400 dark:border-red-500 ring-2 ring-red-200 dark:ring-red-900/40' : ''}`}
                                    />
                                    {processedExceedsReceived && (
                                        <p className="text-[11px] text-red-500 font-semibold mt-1.5 ml-1 flex items-center gap-1">
                                            <AlertTriangle size={11} />
                                            Cannot exceed received weight ({data.grossWeight.toLocaleString()} kg)
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>Rejected Weight (kg) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        max={procVal || undefined}
                                        step="0.1"
                                        value={rejectedWeight}
                                        onChange={(e) => setRejectedWeight(e.target.value)}
                                        placeholder="0.0"
                                        className={`${inputClass} ${rejectedExceedsProcessed ? 'border-red-400 dark:border-red-500 ring-2 ring-red-200 dark:ring-red-900/40' : ''}`}
                                    />
                                    {rejectedExceedsProcessed && (
                                        <p className="text-[11px] text-red-500 font-semibold mt-1.5 ml-1 flex items-center gap-1">
                                            <AlertTriangle size={11} />
                                            Cannot exceed processed weight ({procVal.toLocaleString()} kg)
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: QC Details */}
                        <div>
                            <p className="text-[10.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ClipboardCheck size={12} />
                                QC Details
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>Primary Defect Type</label>
                                    <select
                                        value={defectType}
                                        onChange={(e) => setDefectType(e.target.value)}
                                        className={inputClass}
                                    >
                                        {defectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Assigned Grade</label>
                                    <select
                                        value={grade}
                                        onChange={(e) => setGrade(e.target.value)}
                                        className={`${inputClass} ${grade.includes('Export') ? 'text-green-600' : grade.includes('Rejected') ? 'text-red-600' : 'text-blue-600'}`}
                                    >
                                        {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Live Calculation */}
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-8 mt-4">
                            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 p-5 rounded-2xl flex justify-between items-center">
                                <div>
                                    <h3 className="text-green-800 dark:text-green-400 font-bold text-sm tracking-wide uppercase">Net Approved Stock</h3>
                                    <p className="text-green-600/80 dark:text-green-500/80 text-xs mt-0.5">
                                        Formula: Processed ({procVal} kg) - Rejected ({rejVal} kg)
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-3xl font-black text-green-700 dark:text-green-400 tracking-tight">
                                        {netWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                                    </span>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* ── Footer ── */}
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="merged-qc-form"
                        disabled={hasValidationError}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold active:scale-[0.98] transition-all shadow-sm shadow-green-900/20 ${
                            hasValidationError
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        Mark as Done →
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RecordQCModal;
