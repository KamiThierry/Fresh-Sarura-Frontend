import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Thermometer, CheckCircle2, Loader2, AlertCircle, ChevronDown, Snowflake, FlaskConical } from 'lucide-react';
import { api } from '@/lib/api';

interface AssignRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: any;
    onSuccess: () => void;
    mode?: 'assign' | 'confirm';
}

const AssignRoomModal = ({ isOpen, onClose, batch, onSuccess, mode = 'assign' }: AssignRoomModalProps) => {
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchRooms = async () => {
            setIsLoadingRooms(true);
            try {
                const res = await api.get('/rooms');
                const rooms = res.data?.data || res.data || [];
                setAvailableRooms(
                    rooms.filter((r: any) =>
                        r.status !== 'Maintenance' &&
                        (mode === 'confirm' ? r.type === 'Cold Room' : true) &&
                        (r.capacityKg - (r.currentLoadKg || 0)) > 0
                    )
                );
            } catch (err) {
                console.error('Failed to fetch rooms:', err);
            } finally {
                setIsLoadingRooms(false);
            }
        };
        if (isOpen) fetchRooms();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoomId) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (mode === 'confirm') {
                await api.patch(`/processing-batches/${batch._id}/confirm`, { roomId: selectedRoomId });
            } else {
                await api.patch(`/processing-batches/${batch._id}/assign-room`, { roomId: selectedRoomId });
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to assign room:', err);
            setError(err.message || 'Failed to assign room. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !batch) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-900/10 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Thermometer size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {mode === 'confirm' ? 'Assign Cold Room' : 'Assign Processing Room'}
                            </h2>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                                {mode === 'confirm' ? 'Inventory Stock' : 'Inventory Intake'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        
                        {/* Batch Summary */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Batch Crop</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{batch.cropName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Weight Received</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{batch.receivedWeightKg?.toLocaleString()} kg</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Requested By</p>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                        {batch.requestedBy?.name || batch.requestedBy?.full_name || 'Processing Team'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Room Assignment Dropdown */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">
                                Select Available Room
                            </label>
                            
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold flex items-center justify-between group ${isDropdownOpen ? 'ring-2 ring-emerald-500' : ''}`}
                            >
                                <span className={selectedRoomId ? '' : 'text-gray-400 font-normal'}>
                                    {availableRooms.find(r => r._id === selectedRoomId)?.name || 'Choose a room...'}
                                </span>
                                <ChevronDown size={18} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto">
                                        {isLoadingRooms ? (
                                            <div className="p-4 text-center text-gray-400 text-xs">Loading rooms...</div>
                                        ) : availableRooms.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500 text-xs font-medium">No available rooms found.</div>
                                        ) : (
                                            availableRooms.map((room) => (
                                                <button
                                                    key={room._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedRoomId(room._id);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${room.type === 'Cold Room' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'}`}>
                                                        {room.type === 'Cold Room' ? <Snowflake size={14} /> : <FlaskConical size={14} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{room.name}</p>
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                                                            {room.type} · {(room.capacityKg - (room.currentLoadKg || 0)).toLocaleString()} kg free of {room.capacityKg.toLocaleString()} kg
                                                        </p>
                                                        {/* Capacity bar */}
                                                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                                            <div
                                                                className={`h-1 rounded-full ${
                                                                    ((room.currentLoadKg || 0) / room.capacityKg) >= 0.9 ? 'bg-red-400' :
                                                                    ((room.currentLoadKg || 0) / room.capacityKg) >= 0.6 ? 'bg-amber-400' : 'bg-green-400'
                                                                }`}
                                                                style={{ width: `${Math.min(((room.currentLoadKg || 0) / room.capacityKg) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {selectedRoomId === room._id && (
                                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}

                            <p className="text-[10px] text-gray-500 mt-2 ml-1 italic">
                                Only operational rooms with remaining capacity are shown.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-5 bg-gray-50/80 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3 rounded-b-3xl">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedRoomId}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all ${
                                isSubmitting || !selectedRoomId
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-emerald-900/20'
                            }`}
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={18} />
                            )}
                            {isSubmitting ? 'Processing...' : (mode === 'confirm' ? 'Confirm & Add to Stock' : 'Assign Room')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AssignRoomModal;
