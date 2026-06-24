import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import packagingImg from "@/assets/packaging.webp";

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    // Common State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    
    // View 1 State (Request)
    const [email, setEmail] = useState("");

    // View 2 State (Reset)
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [strength, setStrength] = useState(0);

    const calculateStrength = (pass: string) => {
        let s = 0;
        if (pass.length > 6) s++;
        if (pass.length > 10) s++;
        if (/[A-Z]/.test(pass)) s++;
        if (/[0-9]/.test(pass)) s++;
        if (/[^A-Za-z0-9]/.test(pass)) s++;
        setStrength(s);
    };

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email address");
            return;
        }

        setIsSubmitting(true);
        setError("");
        try {
            await api.post('/auth/forgot-password', { email });
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to send reset link. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setIsSubmitting(true);
        setError("");
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setSuccess(true);
            setTimeout(() => navigate("/login"), 2000);
        } catch (err: any) {
            setError(err.message || "Link expired or invalid. Please request a new one.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden font-sans py-12 px-4 text-white">
            {/* Background with Dark Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-fixed transition-transform duration-[20s]"
                style={{ backgroundImage: `url(${packagingImg})` }}
            />
            <div className="absolute inset-0 z-10 bg-[#0a1c12]/65" />

            {/* Content Card */}
            <div className="relative z-20 w-full max-w-[400px] bg-[#0f2316]/72 backdrop-blur-[24px] saturate-[1.4] border border-white/14 rounded-[20px] p-[28px_24px] md:p-[36px_40px] shadow-[0_32px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] animate-in fade-in zoom-in duration-[350ms]">
                
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block mb-4 hover:opacity-80 transition-opacity flex flex-col items-center">
                        <div className="text-2xl font-bold tracking-tight">
                            <span className="text-white">Fresh</span>
                            <span className="text-[#7ec99a]">Sarura</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 tracking-[1.5px] uppercase mt-0.5">Exports & Farmer Hub</span>
                    </Link>

                    {success ? (
                        <div className="flex flex-col items-center py-4">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} className="text-[#7ec99a]" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold mb-2">
                                {token ? "Password updated!" : "Check your email"}
                            </h2>
                            <p className="text-white/65 text-sm leading-relaxed max-w-[280px]">
                                {token 
                                    ? "Redirecting you to login..." 
                                    : <>We've sent a recovery link to <span className="text-white font-bold">{email}</span></>
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-serif font-bold mb-1">
                                {token ? "Set new password" : "Reset your password"}
                            </h1>
                            <p className="text-white/65 text-[13px]">
                                {token 
                                    ? "Create a strong password to secure your account" 
                                    : "Enter your registered email and we'll send you a reset link"
                                }
                            </p>
                        </>
                    )}
                </div>

                {!success && (
                    <form onSubmit={token ? handleResetPassword : handleRequestReset} className="space-y-4">
                        {token ? (
                            /* View 2: Reset Form */
                            <>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <label className="block text-white/60 text-[12px] font-medium mb-[5px] ml-1">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    calculateStrength(e.target.value);
                                                }}
                                                placeholder="••••••••"
                                                className="w-full h-[42px] bg-white/10 border border-white/20 rounded-lg pl-4 pr-12 text-white text-[14px] outline-none transition-all focus:border-[#7ec99a]/70"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-white/45 hover:text-white"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Strength Indicator */}
                                    {password && (
                                        <div className="px-1">
                                            <div className="flex gap-1 h-1 mt-2">
                                                {[1, 2, 3, 4, 5].map((level) => (
                                                    <div 
                                                        key={level}
                                                        className={cn(
                                                            "flex-1 rounded-full transition-colors duration-300",
                                                            level <= strength ? "bg-green-500" : "bg-white/10"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-white/40 mt-1.5 uppercase font-bold tracking-wider">
                                                Password Strength: {strength < 2 ? "Weak" : strength < 4 ? "Fair" : "Strong"}
                                            </p>
                                        </div>
                                    )}

                                    <div className="relative">
                                        <label className="block text-white/60 text-[12px] font-medium mb-[5px] ml-1">Confirm Password</label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-[42px] bg-white/10 border border-white/20 rounded-lg px-4 text-white text-[14px] outline-none transition-all focus:border-[#7ec99a]/70"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* View 1: Request Form */
                            <div className="relative">
                                <label className="block text-white/60 text-[12px] font-medium mb-[5px] ml-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-[42px] bg-white/10 border border-white/20 rounded-lg px-4 text-white text-[14px] placeholder:text-white/38 outline-none transition-all focus:border-[#7ec99a]/70"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs">
                                <p>{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-[44px] mt-2 bg-[#2d6a45] hover:bg-[#1a3d2b] text-white text-[14.5px] font-medium rounded-lg shadow-lg active:scale-[0.98] disabled:opacity-75 flex items-center justify-center transform hover:-translate-y-px transition-all"
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                token ? "Update Password →" : "Send Reset Link →"
                            )}
                        </button>
                    </form>
                )}

                <div className="text-center mt-6">
                    <Link to="/login" className="text-white/45 hover:text-[#7ec99a] text-[13px] inline-flex items-center gap-2 transition-colors">
                        <ArrowLeft size={14} />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
