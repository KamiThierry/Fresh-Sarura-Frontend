import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X, ShieldOff, Trash2, AlertTriangle, Loader2, CheckCircle2,
    ChevronRight, ChevronLeft, Lock, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Farmer } from '@/types';

interface DeleteFarmerModalProps {
    isOpen: boolean;
    onClose: () => void;
    farmer: Farmer;
    onSuspended: (updated: Farmer) => void;
    onReactivated: (updated: Farmer) => void;
    onDeleted: () => void;
}

type Step =
    | 'choose'
    | 'confirm-suspend'
    | 'confirm-reactivate'
    | 'confirm-delete'
    | 'done-suspend'
    | 'done-reactivate'
    | 'done-delete';

const DeleteFarmerModal = ({
    isOpen,
    onClose,
    farmer,
    onSuspended,
    onReactivated,
    onDeleted,
}: DeleteFarmerModalProps) => {
    const [step, setStep] = useState<Step>('choose');
    const [confirmName, setConfirmName] = useState('');
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    if (!isOpen) return null;

    const isSuspended = farmer.status === 'Inactive';

    const reset = () => {
        setStep('choose');
        setConfirmName('');
        setApiError('');
        setLoading(false);
    };

    const handleClose = () => { reset(); onClose(); };

    // ── Suspend ──────────────────────────────────────────────
    const handleSuspend = async () => {
        setLoading(true); setApiError('');
        try {
            const res = await api.patch(`/farmers/${farmer._id}/suspend`, {});
            setStep('done-suspend');
            setTimeout(() => { onSuspended(res.farmer); handleClose(); }, 1800);
        } catch (err: any) {
            setApiError(err.message ?? 'Failed to suspend account.');
        } finally { setLoading(false); }
    };

    // ── Reactivate ────────────────────────────────────────────
    const handleReactivate = async () => {
        setLoading(true); setApiError('');
        try {
            const res = await api.patch(`/farmers/${farmer._id}/reactivate`, {});
            setStep('done-reactivate');
            setTimeout(() => { onReactivated(res.farmer); handleClose(); }, 1800);
        } catch (err: any) {
            setApiError(err.message ?? 'Failed to reactivate account.');
        } finally { setLoading(false); }
    };

    // ── Permanent delete ──────────────────────────────────────
    const handleDelete = async () => {
        setLoading(true); setApiError('');
        try {
            await api.delete(`/farmers/${farmer._id}`);
            setStep('done-delete');
            setTimeout(() => { onDeleted(); handleClose(); }, 1800);
        } catch (err: any) {
            setApiError(err.message ?? 'Failed to delete farmer.');
        } finally { setLoading(false); }
    };

    const nameMatch = confirmName.trim() === farmer.full_name.trim();

    // ── Content per step ─────────────────────────────────────
    const renderContent = () => {

        /* ── Step 1 — choose action ── */
        if (step === 'choose') return (
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    What would you like to do with{' '}
                    <span className="font-bold text-gray-900 dark:text-white">{farmer.full_name}</span>'s account?
                    Review the options carefully — some actions are irreversible.
                </p>

                {/* Reactivate — only shown when account is suspended */}
                {isSuspended && (
                    <button
                        onClick={() => setStep('confirm-reactivate')}
                        className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 transition-all text-left group"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <RefreshCw size={18} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-green-800 dark:text-green-300 text-sm">Reactivate Account</p>
                            <p className="text-xs text-green-700/70 dark:text-green-400/70 mt-0.5 leading-relaxed">
                                Restores the farmer's login access. Status will be set back to <strong>Active</strong>.
                                All data is intact.
                            </p>
                        </div>
                        <ChevronRight size={16} className="text-green-500 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}

                {/* Suspend — only shown when account is active */}
                {!isSuspended && (
                    <button
                        onClick={() => setStep('confirm-suspend')}
                        className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all text-left group"
                    >
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <ShieldOff size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Suspend Account</p>
                            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5 leading-relaxed">
                                Temporarily deactivates login access. Data and crop history are preserved.
                                Account can be reactivated later.
                            </p>
                        </div>
                        <ChevronRight size={16} className="text-amber-500 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}

                {/* Permanently delete — always shown */}
                <button
                    onClick={() => setStep('confirm-delete')}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all text-left group"
                >
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-red-800 dark:text-red-300 text-sm">Permanently Delete</p>
                        <p className="text-xs text-red-700/70 dark:text-red-400/70 mt-0.5 leading-relaxed">
                            Removes the farmer record and linked login account from the system forever.
                            This action <span className="font-bold underline">cannot be undone</span>.
                        </p>
                    </div>
                    <ChevronRight size={16} className="text-red-500 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        );

        /* ── Step 2R — confirm reactivate ── */
        if (step === 'confirm-reactivate') return (
            <div className="p-6 space-y-5">
                <button onClick={() => { setStep('choose'); setApiError(''); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-semibold transition-colors">
                    <ChevronLeft size={14} /> Back
                </button>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40">
                    <RefreshCw size={20} className="text-green-600 dark:text-green-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-green-800 dark:text-green-300">Reactivate Account</p>
                        <p className="text-xs text-green-700/80 dark:text-green-400/80 mt-0.5">
                            {farmer.full_name}'s login will be restored immediately.
                        </p>
                    </div>
                </div>

                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" /> Farmer login access will be restored immediately</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" /> Status will be set back to "Active" on the directory</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" /> All crop cycle and harvest data remains intact</li>
                </ul>

                {apiError && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                        {apiError}
                    </div>
                )}
            </div>
        );

        /* ── Step 2A — confirm suspend ── */
        if (step === 'confirm-suspend') return (
            <div className="p-6 space-y-5">
                <button onClick={() => { setStep('choose'); setApiError(''); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-semibold transition-colors">
                    <ChevronLeft size={14} /> Back
                </button>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
                    <ShieldOff size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Suspend Account</p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                            {farmer.full_name}'s login will be disabled. Their data remains intact.
                        </p>
                    </div>
                </div>

                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> Farmer login access will be revoked immediately</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> All crop cycle and harvest data is preserved</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> Status will be set to "Inactive" on the directory</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" /> Can be reactivated at any time via Account Actions</li>
                </ul>

                {apiError && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                        {apiError}
                    </div>
                )}
            </div>
        );

        /* ── Step 2B — confirm delete ── */
        if (step === 'confirm-delete') return (
            <div className="p-6 space-y-5">
                <button onClick={() => { setStep('choose'); setConfirmName(''); setApiError(''); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-semibold transition-colors">
                    <ChevronLeft size={14} /> Back
                </button>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40">
                    <AlertTriangle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-red-800 dark:text-red-300">⚠ Permanent Deletion — This cannot be undone</p>
                        <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">
                            All records for <strong>{farmer.full_name}</strong> will be permanently erased.
                        </p>
                    </div>
                </div>

                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" /> Farmer profile deleted from Farmer Network</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" /> Linked login account permanently removed</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" /> Crop history and certifications cannot be recovered</li>
                </ul>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                        <Lock size={13} /> Type the farmer's full name to confirm
                    </label>
                    <input
                        type="text"
                        placeholder={`Type "${farmer.full_name}" to confirm`}
                        value={confirmName}
                        onChange={e => { setConfirmName(e.target.value); setApiError(''); }}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-red-200 dark:border-red-700 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400 transition-all"
                    />
                    {confirmName && !nameMatch && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertTriangle size={11} /> Must match exactly: <strong>{farmer.full_name}</strong>
                        </p>
                    )}
                    {nameMatch && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Name confirmed.
                        </p>
                    )}
                </div>

                {apiError && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                        {apiError}
                    </div>
                )}
            </div>
        );

        /* ── Success: reactivated ── */
        if (step === 'done-reactivate') return (
            <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">Account Reactivated</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {farmer.full_name}'s login access has been restored.
                </p>
            </div>
        );

        /* ── Success: suspended ── */
        if (step === 'done-suspend') return (
            <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <ShieldOff size={28} className="text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">Account Suspended</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {farmer.full_name}'s login has been disabled. Their data remains safe.
                </p>
            </div>
        );

        /* ── Success: deleted ── */
        if (step === 'done-delete') return (
            <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <Trash2 size={28} className="text-red-600 dark:text-red-400" />
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">Farmer Deleted</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {farmer.full_name}'s profile and linked account have been permanently removed.
                </p>
            </div>
        );
    };

    // ── Footer per step ───────────────────────────────────────
    const renderFooter = () => {
        const doneSteps = ['done-suspend', 'done-reactivate', 'done-delete'];
        if (doneSteps.includes(step)) return null;

        if (step === 'confirm-reactivate') return (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
                <button onClick={() => setStep('choose')} disabled={loading}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                    Cancel
                </button>
                <button onClick={handleReactivate} disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-green-900/20 active:scale-[0.98] transition-all disabled:opacity-60">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Reactivating…</> : <><RefreshCw size={16} /> Confirm Reactivation</>}
                </button>
            </div>
        );

        if (step === 'confirm-suspend') return (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
                <button onClick={() => setStep('choose')} disabled={loading}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                    Cancel
                </button>
                <button onClick={handleSuspend} disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-amber-900/20 active:scale-[0.98] transition-all disabled:opacity-60">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Suspending…</> : <><ShieldOff size={16} /> Confirm Suspension</>}
                </button>
            </div>
        );

        if (step === 'confirm-delete') return (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
                <button onClick={() => { setStep('choose'); setConfirmName(''); }} disabled={loading}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                    Cancel
                </button>
                <button onClick={handleDelete} disabled={!nameMatch || loading}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-red-900/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Deleting…</> : <><Trash2 size={16} /> Permanently Delete</>}
                </button>
            </div>
        );

        /* Default: choose step */
        return (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end">
                <button onClick={handleClose}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Cancel
                </button>
            </div>
        );
    };

    const isDone = ['done-suspend', 'done-reactivate', 'done-delete'].includes(step);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={isDone ? undefined : handleClose}
            />

            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isSuspended ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                            {isSuspended
                                ? <RefreshCw size={16} className="text-green-600 dark:text-green-400" />
                                : <ShieldOff size={16} className="text-red-600 dark:text-red-400" />
                            }
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Account Actions</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {farmer.full_name}
                                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isSuspended
                                        ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                    {farmer.status}
                                </span>
                            </p>
                        </div>
                    </div>
                    {!isDone && (
                        <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                </div>

                {renderContent()}
                {renderFooter()}
            </div>
        </div>,
        document.body
    );
};

export default DeleteFarmerModal;
