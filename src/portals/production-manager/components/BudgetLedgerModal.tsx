import { createPortal } from 'react-dom';
import { X, TrendingDown, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface BudgetLedgerModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgetCategories: any[];
    fieldReports: any[];
    cycleName: string;
    farmName: string;
    season: string;
}

const BudgetLedgerModal = ({ isOpen, onClose, budgetCategories, fieldReports, cycleName, farmName, season }: BudgetLedgerModalProps) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-white dark:bg-gray-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                Active Cycle
                            </span>
                            <span className="text-xs text-gray-500">• {farmName}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Budget Ledger: {cycleName} ({season})</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Variance Analysis & Expense Log</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 overflow-y-auto">

                    {/* Variance Summary Table */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingDown size={18} className="text-blue-500" />
                            Category Performance
                        </h3>

                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3 text-right">Allocated</th>
                                        <th className="px-4 py-3 text-right">Approved</th>
                                        <th className="px-4 py-3 text-right">Actual Spent</th>
                                        <th className="px-4 py-3 text-right">Variance (Remaining)</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {budgetCategories.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">No budget categories defined.</td>
                                        </tr>
                                    ) : budgetCategories.map((cat, idx) => {
                                        const allocated = cat.allocated || 0;
                                        const spent = cat.spent || 0;
                                        const variance = allocated - spent;
                                        const isNegative = variance < 0;
                                        
                                        // "Not touched yet" if spent is 0
                                        const isUntouched = spent === 0;

                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{cat.name}</td>
                                                <td className="px-4 py-3 text-right text-gray-500">{allocated.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-200">{cat.approved?.toLocaleString() || '0'}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-200">{spent.toLocaleString()}</td>
                                                <td className={`px-4 py-3 text-right font-bold ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
                                                    {isNegative ? '' : '+'}{variance.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {isUntouched ? (
                                                        <div className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded dark:bg-gray-800 dark:text-gray-400">
                                                            UNTOUCHED
                                                        </div>
                                                    ) : isNegative ? (
                                                        <div className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded dark:bg-red-900/20 dark:text-red-400">
                                                            <AlertCircle size={12} /> OVER
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded dark:bg-green-900/20 dark:text-green-400">
                                                            <CheckCircle size={12} /> OK
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Recently Logged Expenses */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingUp size={18} className="text-purple-500" />
                            Real Expenses (Field Reports)
                        </h3>

                        <div className="space-y-3">
                            {fieldReports.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">No expenses logged yet.</p>
                            ) : fieldReports.map((tx) => (
                                <div key={tx._id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg">
                                            🧾
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{tx.description}</p>
                                            <p className="text-xs text-gray-500">{tx.category || 'General'} • {tx.submittedByName || 'Farm Manager'} • {formatDate(tx.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">-{tx.actualCostRwf.toLocaleString()} Rwf</p>
                                        <p className={`text-[10px] px-1.5 py-0.5 rounded inline-block mt-0.5 bg-gray-100 text-gray-600`}>
                                            {tx.status}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>
            </div>
        </div>,
        document.body
    );
};

export default BudgetLedgerModal;
