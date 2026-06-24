import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  subtitle?: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, subtitle, onClose }) => {
  useEffect(() => {
    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 15000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <>
      <style>{`
        @keyframes fresh-toast-slide-in {
          from { 
            transform: translateX(100%) translateY(-10px); 
            opacity: 0; 
          }
          to { 
            transform: translateX(0) translateY(0); 
            opacity: 1; 
          }
        }

        @keyframes fresh-toast-drain {
          from { width: 100%; }
          to { width: 0%; }
        }

        .animate-fresh-toast-in {
          animation: fresh-toast-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-fresh-toast-drain {
          animation: fresh-toast-drain 15s linear forwards;
        }
      `}</style>

      <div
        id="fresh-sarura-toast"
        className="fixed top-[85px] right-6 z-[99999] w-full max-w-[360px] animate-fresh-toast-in"
      >
        <div className="relative overflow-hidden rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 shadow-2xl dark:border-[#166534] dark:bg-[#052e16] transition-colors duration-300">
          <div className="flex items-start gap-4">
            {/* Success Icon */}
            <div className="mt-0.5 flex-shrink-0">
              <div className="bg-[#bbf7d0]/40 dark:bg-[#166534]/40 p-1.5 rounded-full">
                <CheckCircle className="h-5 w-5 text-[#16a34a]" strokeWidth={2.5} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-sm font-bold text-[#15803d] dark:text-[#bbf7d0] leading-tight">
                {message}
              </h3>
              {subtitle && (
                <p className="mt-1 text-xs text-[#15803d]/80 dark:text-[#bbf7d0]/80 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close notification"
              className="flex-shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-[#15803d]/50 hover:text-[#15803d] hover:bg-[#bbf7d0]/30 dark:text-[#bbf7d0]/50 dark:hover:text-[#bbf7d0] dark:hover:bg-[#166534]/50 transition-all active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* Progress Bar Track */}
          <div className="absolute bottom-0 left-0 h-1 w-full bg-[#16a34a]/10 dark:bg-[#166534]/20">
            {/* Animated Drain Indicator */}
            <div className="h-full bg-[#16a34a] animate-fresh-toast-drain origin-left" />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default Toast;
