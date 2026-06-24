import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DoorOpen, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';

interface RoomRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomAssigned?: () => void;
}

type PendingBatch = {
  _id: string;
  cropName: string;
  receivedWeightKg: number;
  createdAt: string;
  requestedBy: { name: string };
  intakeLogId: { pickedUpWeightKg: number; arrivedAt: string };
};

const RoomRequestsModal = ({ isOpen, onClose, onRoomAssigned }: RoomRequestsModalProps) => {
  const [batches, setBatches] = useState<PendingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomInputs, setRoomInputs] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/processing-batches/pending-room');
      setBatches(res.data);
    } catch (err) {
      console.error('Failed to fetch room requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchBatches();
  }, [isOpen]);

  const handleAssignRoom = async (batchId: string) => {
    const room = roomInputs[batchId]?.trim();
    if (!room) { setError('Please enter a room name.'); return; }
    setAssigningId(batchId);
    setError(null);
    try {
      await api.patch(`/processing-batches/${batchId}/assign-room`, { assignedRoom: room });
      setBatches(prev => prev.filter(b => b._id !== batchId));
      onRoomAssigned?.();
    } catch (err: any) {
      setError(err.message || 'Failed to assign room.');
    } finally {
      setAssigningId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-purple-50/50 dark:bg-purple-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
              <DoorOpen size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Room Requests</h2>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider mt-0.5">
                {batches.length} pending assignment{batches.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={28} className="animate-spin text-purple-500" />
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 size={36} className="mx-auto text-green-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No pending room requests.</p>
            </div>
          ) : (
            batches.map(batch => (
              <div key={batch._id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600 space-y-3">
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
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Room 3, Cold Bay A"
                    value={roomInputs[batch._id] || ''}
                    onChange={e => setRoomInputs(prev => ({ ...prev, [batch._id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder-gray-400"
                  />
                  <button
                    onClick={() => handleAssignRoom(batch._id)}
                    disabled={assigningId === batch._id || !roomInputs[batch._id]?.trim()}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ${
                      assigningId === batch._id || !roomInputs[batch._id]?.trim()
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

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RoomRequestsModal;
