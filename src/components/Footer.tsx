import { useNavigate } from "react-router-dom";
import logo from "@/assets/sarura_logo_nav.png";

const Footer = () => {
  const navigate = useNavigate();
  return (
    <footer style={{ backgroundColor: "#1a3d2b" }} className="pt-16 pb-8">
      <div className="container px-6 md:px-10 lg:px-10 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-white/10">
          <div>
            {/* Logo Section - Consistent with Navbar */}
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="Fresh Sarura Logo" className="h-8 w-auto object-contain brightness-0 invert" />
              <div className="flex flex-col items-start leading-tight">
                <span className="font-bold text-white text-lg tracking-tight">Fresh Sarura</span>
                <span className="text-[10px] font-medium text-green-300/60 tracking-tight">Export & Farmer Hub</span>
              </div>
            </div>
            <p className="text-green-300/70 text-sm leading-relaxed max-w-xs">
              Rwanda's horticulture export management platform — built for Garden Fresh Ltd and its network of outgrowers.
            </p>
          </div>
          <div>
            <p className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Platform</p>
            <div className="flex flex-col gap-2">
              {[
                { label: "Home", id: "top" },
                { label: "How It Works", id: "how-it-works" },
                { label: "For Your Team", id: "for-your-team" },
                { label: "Production Chain", id: "production-chain" }
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    if (window.location.pathname !== "/") {
                      window.location.href = "/#" + l.id;
                      return;
                    }
                    if (l.id === "top") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                      document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="text-green-300/70 text-sm hover:text-green-300 cursor-pointer transition-colors text-left"
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Access</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate("/login")}
                className="text-green-300/70 text-sm hover:text-green-300 transition-colors text-left">Log In</button>
              <p className="text-green-300/70 text-sm">info@gardenfreshrwanda.com</p>
              <p className="text-green-300/70 text-sm">Kigali, Rwanda</p>
            </div>
          </div>
        </div>
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-green-400/50">
          <span>NAEB Registered &middot; Export Compliant</span>
          <span>&copy; 2026 Garden Fresh Ltd. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
