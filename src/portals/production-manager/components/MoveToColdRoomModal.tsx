import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ThermometerSnowflake, PackagePlus } from 'lucide-react';

export interface ApprovedIntake {
    intakeId: string;
    farmer: string;
    crop: string;
    netWeight: number; // The approved weight
    grade: string;
}

interface MoveToColdRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ApprovedIntake | null;
    onSubmit?: (location: string, temp: string) => void;
}

const locations = ['Cold Room A', 'Cold Room B', 'Cold Room C', 'Ambient Storage'];

const inputClass =
    'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-400';
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5';

const MoveToColdRoomModal = ({ isOpen, onClose, data, onSubmit }: MoveToColdRoomModalProps) => {
    const [location, setLocation] = useState(locations[0]);
    const [temperature, setTemperature] = useState('4.5');

    useEffect(() => {
        if (isOpen) {
            setLocation(locations[0]);
            setTemperature('4.5');
        }
    }, [isOpen]);

    if (!isOpen || !data) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.(location, temperature + '°C');
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                            <PackagePlus size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Move to Cold Room</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 pb-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-xl mb-6 border border-blue-100 dark:border-blue-800/30">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            <span className="font-bold">{data.netWeight.toLocaleString()} kg</span> of <span className="font-bold">{data.crop}</span> from {data.farmer}.
                        </p>
                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">Intake Ref: {data.intakeId} | Grade: {data.grade}</p>
                    </div>

                    <form id="move-stock-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={labelClass}>Storage Location</label>
                            <select value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} required>
                                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Target Temperature</label>
                            <div className="relative">
                                <ThermometerSnowflake size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(e.target.value)}
                                    className={`${inputClass} pl-10 pr-8`}
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 pointer-events-none">°C</span>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/40 px-6 py-4 mt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-white dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    <button type="submit" form="move-stock-form" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                        Save to Inventory
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MoveToColdRoomModal;
