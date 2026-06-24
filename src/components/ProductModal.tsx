import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductModalProps {
  product: {
    name: string;
    availability: boolean[];
    packing: string[];
  };
  isOpen: boolean;
  onClose: () => void;
}

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const ProductModal: React.FC<ProductModalProps> = ({ product, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 rounded-xl overflow-hidden animate-pop"
      onClick={(e) => e.stopPropagation()} // Prevent card clicks
    >
      {/* Semi-transparent Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={onClose}
      />

      {/* Modal Content Card */}
      <div className="relative bg-white w-full rounded-xl p-5 shadow-2xl flex flex-col gap-5 border border-slate-100">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="space-y-3">
          <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Availability</h4>
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            {MONTHS.map((month, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400">{month}</span>
                <div 
                  className={cn(
                    "w-2.5 h-2.5 rounded-full border border-white shadow-sm",
                    product.availability[idx] ? "bg-[#1a4a34]" : "bg-slate-200"
                  )}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Packing Options</h4>
          <div className="flex flex-wrap gap-2">
            {product.packing.map((option, idx) => (
              <span 
                key={idx} 
                className="text-[11px] font-semibold px-3 py-1 bg-[#edf5f1] text-[#1a4a34] rounded-full border border-[#d1e5db]"
              >
                {option}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            onClose();
            document.querySelector("#buyers")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="w-full mt-2 bg-[#1a4a34] hover:bg-[#2d6a4f] text-white text-[13px] font-bold py-3 rounded-full shadow-md transition-all active:scale-95"
        >
          Request a quote
        </button>
      </div>
    </div>
  );
};

export default ProductModal;
