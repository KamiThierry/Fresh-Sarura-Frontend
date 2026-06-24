const stats = [
  { value: "500+", label: "Verified Outgrowers" },
  { value: "11", label: "Production Steps" },
  { value: "100%", label: "Export Traceability" },
  { value: "5+", label: "Years Operating" },
];

const certs = [
  { label: "GLOBALG.A.P Aligned" },
  { label: "SMETA Compliant" },
  { label: "NAEB Registered" },
  { label: "EU Phytosanitary Ready" },
];

const StatsBar = () => (
  <section className="pb-6 px-6 md:px-10">
    <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">

      {/* Stats row — plain inline text */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-base font-extrabold" style={{ color: "#15803d" }}>
              {s.value}
            </span>
            <span className="text-xs font-medium text-slate-500">{s.label}</span>
            {i < stats.length - 1 && (
              <span className="ml-8 text-slate-300 hidden sm:inline">·</span>
            )}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="w-16 h-px" style={{ backgroundColor: "#d1fae5" }} />

      {/* Certs row */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">
          Certified &amp; Compliant
        </span>
        {certs.map((c, i) => (
          <span key={c.label} className="text-[11px] font-medium text-slate-500">
            {c.label}{i < certs.length - 1 && <span className="ml-4 text-slate-300">·</span>}
          </span>
        ))}
      </div>

    </div>
  </section>
);

export default StatsBar;
