import { useState, useEffect } from 'react';
import { Loader2, DoorOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';

type Room = { _id: string; name: string; type: string; capacityKg: number; status: string; };
type PendingBatch = {
    _id: string;
    cropName: string;
    receivedWeightKg: number;
    createdAt: string;
    requestedBy: { name: string };
};

interface RoomRequestsPanelProps {
    rooms: Room[];
    onRoomAssigned: () => void;
}

const RoomRequestsPanel = ({ rooms, onRoomAssigned }: RoomRequestsPanelProps) => {
    const [batches, setBatches] = useState<PendingBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRooms, setSelectedRooms] = useState<Record<string, string>>({});
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const availableRooms = rooms.filter(r => r.status === 'Available');

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const res = await api.get('/processing-batches/pending-room');
            setBatches(res.data);
        } catch (err) {
            console.error('Failed to fetch pending batches:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBatches(); }, []);

    const handleAssign = async (batchId: string) => {
        const roomId = selectedRooms[batchId];
        if (!roomId) { setError('Please select a room first.'); return; }
        setAssigningId(batchId);
        setError(null);
        try {
            await api.patch(`/processing-batches/${batchId}/assign-room`, { roomId });
            setBatches(prev => prev.filter(b => b._id !== batchId));
            onRoomAssigned();
        } catch (err: any) {
            setError(err.message || 'Failed to assign room.');
        } finally {
            setAssigningId(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-purple-500" />
        </div>
    );

    return (
        <div className="space-y-4">
            {availableRooms.length === 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        No rooms are currently available. Mark a room as Available or add a new room first.
                    </p>
                </div>
            )}

            {batches.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <CheckCircle2 size={36} className="mx-auto text-green-400 mb-3" />
                    <p className="text-gray-500 text-sm font-medium">No pending room requests.</p>
                </div>
            ) : (
                batches.map(batch => (
                    <div key={batch._id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{batch.cropName}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {batch.receivedWeightKg.toLocaleString()} kg · Requested by {batch.requestedBy?.name || 'QC Officer'}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(batch.createdAt).toLocaleString('en-RW', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                Awaiting Room
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={selectedRooms[batch._id] || ''}
                                onChange={e => setSelectedRooms(prev => ({ ...prev, [batch._id]: e.target.value }))}
                                className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            >
                                <option value="">Select available room...</option>
                                {availableRooms.map(r => (
                                    <option key={r._id} value={r._id}>
                                        {r.name} — {r.type} · {r.capacityKg.toLocaleString()} kg
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => handleAssign(batch._id)}
                                disabled={assigningId === batch._id || !selectedRooms[batch._id]}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                                    assigningId === batch._id || !selectedRooms[batch._id]
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                                }`}
                            >
                                {assigningId === batch._id ? <Loader2 size={14} className="animate-spin" /> : <DoorOpen size={14} />}
                                Assign
                            </button>
                        </div>
                    </div>
                ))
            )}

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
            )}
        </div>
    );
};

export default RoomRequestsPanel;
