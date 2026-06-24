import { Users, Leaf, ShieldCheck, Package, Settings } from "lucide-react";

const roles = [
  { icon: <Users size={20} />, title: "Production Manager", desc: "Full oversight of inventory, export batches, QC confirmation, and room allocation." },
  { icon: <Leaf size={20} />, title: "Farm Manager", desc: "Declare harvests, request budget approvals, and submit field reports digitally." },
  { icon: <ShieldCheck size={20} />, title: "QC Officer", desc: "Log processing batches, submit weight records, and manage cold room requests." },
  { icon: <Package size={20} />, title: "Logistics Officer", desc: "Build packing lists, track shipments, manage documents and export dispatch." },
  { icon: <Settings size={20} />, title: "Admin", desc: "Manage all users, roles, event logs, and system-level configuration." },
];

const ForYourTeamSection = () => (
  <section id="for-your-team" className="py-24">
    <div className="container px-6 md:px-10 lg:px-10 mx-auto">
      <div className="text-center mb-14">
        <p className="text-green-700 font-semibold tracking-wider uppercase text-sm mb-3">For Your Team</p>
        <h2 className="text-4xl md:text-5xl font-extrabold text-green-950 leading-tight">
          Built for Every Role
        </h2>
        <p className="text-slate-500 mt-4 max-w-xl mx-auto text-base">
          Each team member gets a purpose-built workspace with only what they need — no confusion, no clutter.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role, i) => (
          <div key={i}
            className="rounded-2xl p-6 border border-green-100 hover:border-green-300 hover:shadow-md transition-all duration-200 group"
            style={{ backgroundColor: "#ffffff" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-green-100"
              style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}>
              {role.icon}
            </div>
            <h3 className="font-bold text-green-950 mb-2">{role.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{role.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ForYourTeamSection;
