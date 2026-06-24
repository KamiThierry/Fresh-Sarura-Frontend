const chain = [
  { step: "01", actor: "Farm Manager", action: "Declares harvest batch" },
  { step: "02", actor: "Logistics Officer", action: "Logs field pickup" },
  { step: "03", actor: "QC Officer", action: "Requests cold room" },
  { step: "04", actor: "Production Manager", action: "Assigns storage room" },
  { step: "05", actor: "QC Officer", action: "Submits processing weights" },
  { step: "06", actor: "Production Manager", action: "Confirms stock entry" },
  { step: "07", actor: "Production Manager", action: "Creates export batch" },
  { step: "08", actor: "Production Manager", action: "Marks batch ready" },
  { step: "09", actor: "Logistics Officer", action: "Generates packing list" },
  { step: "10", actor: "Logistics Officer", action: "Confirms flight departure" },
  { step: "11", actor: "Logistics Officer", action: "Marks cargo dispatched" },
];

const actorColors: Record<string, string> = {
  "Farm Manager": "#15803d",
  "Logistics Officer": "#0369a1",
  "QC Officer": "#b45309",
  "Production Manager": "#7c3aed",
};

const ProductionChainSection = () => (
  <section id="production-chain" className="py-24" style={{ backgroundColor: "#f5f0e8" }}>
    <div className="container px-6 md:px-10 lg:px-10 mx-auto">
      <div className="text-center mb-14">
        <p className="text-green-700 font-semibold tracking-wider uppercase text-sm mb-3">End-to-End Chain</p>
        <h2 className="text-4xl md:text-5xl font-extrabold text-green-950 leading-tight">
          11 Steps. Zero Gaps.
        </h2>
        <p className="text-slate-500 mt-4 max-w-xl mx-auto text-base">
          The complete horticulture export production chain — every actor, every action, fully logged.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {Object.entries(actorColors).map(([actor, color]) => (
          <div key={actor} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold text-slate-600">{actor}</span>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        {chain.map((item) => (
          <div key={item.step}
            className="flex items-center gap-4 bg-white rounded-xl px-5 py-4 border border-green-100 hover:border-green-300 hover:shadow-sm transition-all">
            <span className="text-xs font-bold text-slate-400 w-6 shrink-0">{item.step}</span>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: actorColors[item.actor] }} />
            <div className="flex-1 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-green-950 font-medium text-sm">{item.action}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: actorColors[item.actor] + "18", color: actorColors[item.actor] }}>
                {item.actor}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ProductionChainSection;
