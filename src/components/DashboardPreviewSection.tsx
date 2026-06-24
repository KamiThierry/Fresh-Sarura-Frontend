import { useState } from "react";
import inventoryImg from "@/assets/Inventory.png";
import traceabilityImg from "@/assets/Traceability.png";
import farmerImg from "@/assets/Farmer.png";

const tabs = [
  {
    label: "Inventory & Stock",
    img: inventoryImg,
    caption: "Track every batch, cold room, and stock level in real time",
  },
  {
    label: "Traceability",
    img: traceabilityImg,
    caption: "Enter any batch ID — get the full 5-stage farm-to-flight chain instantly",
  },
  {
    label: "Farmer Network",
    img: farmerImg,
    caption: "Manage the complete network of verified horticulture outgrowers across Rwanda",
  },
];

const DashboardPreviewSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const active = tabs[activeTab];

  return (
    <section className="py-24" style={{ backgroundColor: "#1a3d2b" }}>
        <div className="container px-6 md:px-10 lg:px-10 mx-auto">
        {/* Header */}
        <div className="text-center mb-12 flex flex-col items-center">
          <p className="text-green-400 font-semibold tracking-wider uppercase text-sm mb-3">
            Live Platform
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            One Platform, Full Visibility
          </h2>
          <p className="text-green-200/70 mt-4 max-w-xl mx-auto text-base">
            Every role has a purpose-built workspace. Nothing is hidden, nothing is manual.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-2 mb-8">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === i
                  ? "bg-white text-green-900 shadow"
                  : "text-green-300 hover:text-white border border-green-600/40"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Browser mockup */}
        <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10">

          {/* Browser chrome bar */}
          <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: "#111" }}>
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <div className="flex-1 mx-4 bg-white/10 rounded px-3 py-1">
              <span className="text-white/40 text-xs">app.freshsarura.rw/dashboard</span>
            </div>
          </div>

          {/* Screenshot */}
          <div className="relative w-full overflow-hidden bg-slate-900/50">
            {tabs.map((tab, i) => (
              <img
                key={tab.label}
                src={tab.img}
                alt={tab.label}
                className={`w-full h-auto block transition-opacity duration-700 ease-in-out ${
                  activeTab === i ? "opacity-100 relative z-10" : "opacity-0 absolute inset-0 z-0"
                }`}
                style={{ objectFit: "contain" }}
              />
            ))}
          </div>
        </div>

        {/* Caption below mockup */}
        <p className="text-center text-green-300/60 text-sm mt-5 italic">
          {active.caption}
        </p>

      </div>
    </section>
  );
};

export default DashboardPreviewSection;
