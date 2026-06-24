import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useActiveSection } from "@/hooks/use-active-section";
import { cn } from "@/lib/utils";
import logo from "@/assets/sarura_logo_nav.png";
import { useLocation } from "react-router-dom";

const navLinks = [
  { label: "Home", href: "#top" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "For Your Team", href: "#for-your-team" },
  { label: "Production Chain", href: "#production-chain" },
  { label: "Contact Us", href: "#contact-us" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const activeSection = useActiveSection(["top", "how-it-works", "for-your-team", "production-chain", "contact-us"]);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      window.location.href = "/" + href;
      return;
    }

    if (href === "#top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-gray-100"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.95)" }}>
      <div className="px-6 md:px-10 lg:px-10 flex items-center h-16 relative">

        {/* Logo Section - Left Aligned */}
        <button onClick={() => scrollTo("#top")} className="flex items-center gap-2 relative z-10">
          <img src={logo} alt="Fresh Sarura Logo" className="h-8 w-auto object-contain" />
          <div className="flex flex-col items-start leading-tight">
            <span className="font-bold text-green-700 text-lg tracking-tight">Fresh Sarura</span>
            <span className="text-[10px] font-medium text-gray-500 tracking-tight">Export & Farmer Hub</span>
          </div>
        </button>

        {/* Desktop links - Centered Absolute */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((l) => {
            const isActive = (activeSection === l.href.substring(1)) || (l.href === "#top" && !activeSection);
            return (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className={cn("text-sm font-medium transition-all duration-200 relative py-1",
                  isActive ? "text-green-700" : "text-slate-600 hover:text-green-700")}>
                {l.label}
                {isActive && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-green-700 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Right CTA / Mobile hamburger */}
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={() => window.location.href = "/login"}
            className="hidden md:inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white transition-all hover:scale-105 active:scale-100 shadow-sm"
            style={{ backgroundColor: "#15803d" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#166534"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#15803d"; }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Log In
          </button>
          <button className="md:hidden text-slate-700" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-b border-gray-100 pb-4 bg-white">
          <div className="px-8 flex flex-col gap-3 pt-2">
            {navLinks.map((l) => {
              const isActive = activeSection === l.href.substring(1);
              return (
                <button key={l.href} onClick={() => scrollTo(l.href)}
                  className={cn("text-sm font-medium text-left py-1.5 pl-3 border-l-2 w-full",
                    isActive ? "text-green-700 border-green-700" : "text-slate-600 border-transparent")}>
                  {l.label}
                </button>
              );
            })}
            <div className="pt-3 border-t border-gray-100 mt-1">
              <button
                onClick={() => { setMobileOpen(false); window.location.href = "/login"; }}
                className="w-full text-left py-2 pl-3 text-sm font-semibold border-l-2 border-green-700 text-green-700">
                Log In →
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
