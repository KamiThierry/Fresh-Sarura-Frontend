import { Sprout, Truck, FlaskConical, PackageCheck, Plane } from "lucide-react";

const steps = [
  { icon: <Sprout size={22} />, title: "Harvest Declaration", desc: "Farm managers log each harvest batch digitally with crop details, weight, and field location." },
  { icon: <Truck size={22} />, title: "Logistics Pickup", desc: "A logistics officer confirms field pickup and creates an intake log at the facility." },
  { icon: <FlaskConical size={22} />, title: "Quality Control", desc: "QC officers run checks, assign cold room storage, and record processed and rejected weights." },
  { icon: <PackageCheck size={22} />, title: "Export Batching", desc: "Production managers review QC results, confirm stock, and build export batches for buyers." },
  { icon: <Plane size={22} />, title: "Flight Dispatch", desc: "Logistics creates the packing list, confirms flight departure, and marks cargo as dispatched." },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="pt-40 pb-24">
    <div className="container px-6 md:px-10 lg:px-10 mx-auto">
      <div className="text-center mb-16 flex flex-col items-center">
        <p className="text-green-700 font-semibold tracking-wider uppercase text-sm mb-3">The Platform</p>
        <h2 className="text-4xl md:text-5xl font-extrabold text-green-950 leading-tight">
          How Fresh Sarura Works
        </h2>
        <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-base">
          Every kilogram of produce is tracked through 11 verifiable steps — from farm declaration to confirmed delivery.
        </p>
      </div>

      <div className="relative">
        {/* Connector line */}
        <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-0.5 bg-green-200 z-0" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm transition-transform hover:-translate-y-1 duration-200"
                style={{ backgroundColor: "#dcfce7", color: "#15803d", border: "1.5px solid #86efac" }}>
                {step.icon}
              </div>
              <div>
                <span className="text-xs font-bold text-green-600 tracking-widest uppercase block mb-1">Step {i + 1}</span>
                <h3 className="font-bold text-green-950 text-sm mb-1">{step.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
