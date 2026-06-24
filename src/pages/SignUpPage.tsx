import { Link } from "react-router-dom";
import packagingImg from "@/assets/packaging.webp";

const SignUpPage = () => {
  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden font-sans py-12 px-4">
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${packagingImg})` }} />
      <div className="absolute inset-0 z-10 bg-[#0a1c12]/65" />
      <div className="relative z-20 w-full max-w-[400px] bg-[#0f2316]/72 backdrop-blur-[24px] border border-white/14 rounded-[20px] p-[36px_40px] shadow-[0_32px_80px_rgba(0,0,0,0.5)] text-center">
        <div className="text-2xl font-bold tracking-tight mb-6">
          <span className="text-white">Fresh</span>
          <span className="text-[#7ec99a]">Sarura</span>
        </div>
        <div className="w-16 h-16 bg-[#2d6a45] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-white mb-3">Access is by Invitation</h2>
        <p className="text-white/70 leading-relaxed mb-8 text-sm">
          FreshSarura accounts are created by administrators only.
          If you need access, please contact your system administrator.
        </p>
        <Link to="/login"
          className="block w-full h-[44px] bg-[#2d6a45] hover:bg-[#1a3d2b] text-white font-semibold rounded-lg transition-all flex items-center justify-center">
          Back to Login
        </Link>
        <div className="flex items-center justify-center gap-1.5 text-[#c9a84c]/70 text-[9.5px] font-bold uppercase tracking-[1.2px] mt-6">
          <span>GlobalG.A.P. Certified</span>
          <span className="opacity-40">·</span>
          <span>500+ Outgrowers</span>
          <span className="opacity-40">·</span>
          <span>14 Export Markets</span>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
