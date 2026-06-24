import { useEffect, useRef, useState } from "react";
import { Leaf, ScanLine, Globe, ShieldCheck, ArrowRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const pillars = [
  { 
    id: "01",
    icon: Leaf, 
    title: "Sustainable Agronomy", 
    desc: "Climate-smart agricultural practices that protect Rwanda's rich volcanic soil while maximizing export-grade yields.",
    proof: "Climate-smart since 2018"
  },
  { 
    id: "02",
    icon: ScanLine, 
    title: "Digital Traceability", 
    desc: "Every kilogram is tracked via our proprietary field app, ensuring 100% transparency from the specific farm to the global buyer.",
    proof: "Batch-level QR codes"
  },
  { 
    id: "03",
    icon: Globe, 
    title: "Global Market Access", 
    desc: "Removing intermediaries and connecting smallholders directly with premium wholesale retailers across the UK, EU, and Middle East.",
    proof: "UK · EU · Middle East"
  },
  { 
    id: "04",
    icon: ShieldCheck, 
    title: "Quality Assurance", 
    desc: "Stringent protocols and on-site field inspections ensure every shipment exceeds international GlobalG.A.P. food safety standards.",
    proof: "GlobalG.A.P. certified"
  },
];

const ApproachSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="approach" ref={sectionRef}>
      {/* Zone 1: Dark Hero Band */}
      <div className="bg-[#1a3d2b] py-20 text-center">
        <div className="container px-4">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">Our Approach</h2>
          <p className="text-green-100/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Technology-driven agriculture that bridges the gap between Rwanda's fertile highlands and premium global demand.
          </p>
          
          {/* Trust Stats Strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-[#c9a84c] text-xs font-bold tracking-[0.2em] uppercase">
            <div className="flex items-center">
              500+ Outgrowers
            </div>
            <div className="hidden md:block h-4 w-px bg-[#c9a84c]/30" />
            <div className="flex items-center">
              14 Export Markets
            </div>
            <div className="hidden md:block h-4 w-px bg-[#c9a84c]/30" />
            <div className="flex items-center">
              100% Digital Traceability
            </div>
          </div>
        </div>
      </div>

      {/* Zone 2: Approach Pillars */}
      <div className="bg-[#f8f5ef] py-10 md:py-20">
        <div className="container px-4">
          <div className="space-y-0 border-t border-slate-200">
            {pillars.map((p, idx) => (
              <div 
                key={p.id} 
                className={cn(
                  "group relative py-8 md:py-12 px-6 flex flex-col md:flex-row items-center gap-8 border-b border-slate-200 transition-all duration-300 hover:bg-[#eaf5ee] cursor-default",
                  isVisible ? "animate-in fade-in slide-in-from-bottom duration-700" : "opacity-0",
                  idx === 0 && (isVisible ? "delay-100" : ""),
                  idx === 1 && (isVisible ? "delay-200" : ""),
                  idx === 2 && (isVisible ? "delay-300" : ""),
                  idx === 3 && (isVisible ? "delay-500" : "")
                )}
              >
                {/* Step Number */}
                <div className="flex-shrink-0 text-5xl md:text-7xl font-serif font-bold text-green-800/10 md:w-32">
                  {p.id}
                </div>

                {/* Icon Circle */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <p.icon size={20} className="text-green-700" />
                </div>

                {/* Content */}
                <div className="flex-grow text-center md:text-left">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{p.title}</h3>
                  <p className="text-slate-600 leading-relaxed max-w-2xl">{p.desc}</p>
                </div>

                {/* Proof Badge */}
                <div className="flex-shrink-0 md:w-48 flex justify-center md:justify-end">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-700/5 text-green-800 text-xs font-bold ring-1 ring-green-700/20 whitespace-nowrap">
                    {p.proof}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className={cn(
            "mt-24 text-center transition-all duration-700 delay-700",
            isVisible ? "animate-in fade-in zoom-in" : "opacity-0"
          )}>
            <h4 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 mb-8">
              Ready to see our process in action?
            </h4>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                className="bg-[#1a3d2b] hover:bg-[#122e20] text-white font-bold py-6 px-10 rounded-full flex items-center gap-2 shadow-lg hover:translate-y-[-2px] transition-all"
              >
                Partner With Us
                <ArrowRight size={18} />
              </Button>
              <Button 
                variant="outline" 
                className="border-[#1a3d2b] text-[#1a3d2b] hover:bg-slate-50 font-bold py-6 px-10 rounded-full flex items-center gap-2"
              >
                Download Our Brochure
                <Download size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApproachSection;
