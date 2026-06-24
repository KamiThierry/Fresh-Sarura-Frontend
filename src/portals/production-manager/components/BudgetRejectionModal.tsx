import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';

interface BudgetRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (requestId: string, note: string) => void;
  requestId: string | null;
}

const BudgetRejectionModal = ({ isOpen, onClose, onConfirm, requestId }: BudgetRejectionModalProps) => {
  const [note, setNote] = useState('');

  if (!isOpen || !requestId) return null;

  const handleConfirm = () => {
    onConfirm(requestId, note);
    setNote('');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
            <h3 className="text-base font-bold text-red-800 dark:text-red-300">Reject Budget Request</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Please provide a reason for rejecting this budget request. This feedback will be shared with the Farm Manager.
          </p>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Rejection Note</label>
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Activity not scheduled for this month, or cost exceeds limit..."
              className="w-full h-24 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose} 
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!note.trim()}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shadow-md shadow-red-900/20 disabled:opacity-40"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BudgetRejectionModal;
