import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const indexOfFirst = (currentPage - 1) * itemsPerPage + 1;
    const indexOfLast = Math.min(currentPage * itemsPerPage, totalItems);

    // Build page number list (max 5 visible around currentPage)
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const btnBase =
        'inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-lg border transition-colors focus:outline-none';
    const btnActive =
        'bg-green-600 border-green-600 text-white shadow-sm';
    const btnInactive =
        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700';
    const btnDisabled =
        'opacity-40 cursor-not-allowed bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500';

    return (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Left: summary */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{indexOfFirst}</span>
                {' '}–{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{indexOfLast}</span>
                {' '}of{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{totalItems}</span>
                {' '}entries
            </p>

            {/* Right: controls */}
            <div className="flex items-center gap-1">
                {/* Previous */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`${btnBase} gap-1 px-3 ${currentPage === 1 ? btnDisabled : btnInactive}`}
                >
                    <ChevronLeft size={15} />
                    Prev
                </button>

                {/* Page numbers */}
                {getPageNumbers().map((page, idx) =>
                    page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm select-none">…</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            className={`${btnBase} ${page === currentPage ? btnActive : btnInactive}`}
                        >
                            {page}
                        </button>
                    )
                )}

                {/* Next */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`${btnBase} gap-1 px-3 ${currentPage === totalPages ? btnDisabled : btnInactive}`}
                >
                    Next
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
