import { useNavigate } from "react-router-dom";

const stats = [
  { value: "500+", label: "Verified Outgrowers" },
  { value: "11", label: "Production Steps" },
  { value: "100%", label: "Export Traceability" },
  { value: "5+", label: "Years Operating" },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section id="top" className="relative flex flex-col justify-between pt-16"
      style={{ backgroundColor: "#f5f0e8", minHeight: "100vh" }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #bbf7d0 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #86efac 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 md:px-10 py-20">
        <div className="max-w-4xl mx-auto flex flex-col items-center">

          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-700/20 mb-8"
            style={{ backgroundColor: "rgba(21, 128, 61, 0.08)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
            <span className="text-green-700 text-xs font-semibold tracking-wider uppercase">
              Presented by Garden Fresh Rwanda Ltd
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6"
            style={{ color: "#14532d" }}>
            From Farm to Flight,{" "}
            <span style={{ color: "#ca8a04" }}>Every Step Tracked.</span>
          </h1>

          {/* Subtext */}
          <p className="text-slate-600 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl">
            Fresh Sarura connects farmers, production managers, quality control,
            and logistics in one unified platform — built for Rwanda's premium
            horticulture export chain.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center justify-center px-10 h-14 rounded-xl font-bold text-lg text-white transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
              style={{ backgroundColor: "#15803d" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#166534")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#15803d")}>
              Get Started →
            </button>
            <button
              onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center justify-center gap-2 px-10 h-14 rounded-xl font-bold text-lg transition-all border-2 hover:scale-105 active:scale-100"
              style={{ borderColor: "#15803d", color: "#15803d", backgroundColor: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(21,128,61,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
              </svg>
              See How It Works
            </button>
          </div>
        </div>
      </div>

      {/* Stats pinned to bottom — Basecom style */}
      <div className="relative z-10 w-full px-6 md:px-10 pb-10">
        <div className="w-full h-px bg-green-900/10 mb-8" />
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="text-2xl font-extrabold leading-none"
                style={{ color: "#15803d" }}>{s.value}</span>
              <span className="text-xs font-medium text-slate-500 tracking-wide">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};

export default HeroSection;
