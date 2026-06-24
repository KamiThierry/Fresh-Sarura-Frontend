import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import packagingImg from "@/assets/packaging.webp";

type Step = "credentials" | "otp";

const LoginPage = () => {
  const navigate = useNavigate();

  // ── Credentials step state ──────────────────────────────────────────
  const [step, setStep] = useState<Step>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ── OTP step state ──────────────────────────────────────────────────
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 min
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ── Timer ───────────────────────────────────────────────────────────
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(600);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m} min${m !== 1 ? "s" : ""} and ${sec} sec`;
  };

  // ── Credentials validation ──────────────────────────────────────────
  const validateField = (name: "email" | "password", value: string) => {
    let error = "";
    if (!value) error = "This field is required";
    else if (name === "email" && !emailRegex.test(value)) error = "Please enter a valid email address";
    setErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleBlur = (name: "email" | "password") => {
    validateField(name, name === "email" ? email : password);
  };

  // ── Step 1 submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEmailValid = validateField("email", email);
    const isPasswordValid = validateField("password", password);
    if (!isEmailValid || !isPasswordValid) return;

    setIsSubmitting(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.pendingOtp) {
        setMaskedEmail(data.maskedEmail);
        setStep("otp");
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpError("");
        setIsLocked(false);
        startTimer();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (error: any) {
      setErrors({ email: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── OTP digit input handlers ────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const next = [...otpDigits];
    next[index] = value.slice(-1); // only last char if somehow multiple
    setOtpDigits(next);
    setOtpError("");
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    setOtpError("");
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── Step 2 verify ───────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length < 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }
    if (secondsLeft === 0) {
      setOtpError("Code has expired. Please log in again.");
      return;
    }

    setIsVerifying(true);
    setOtpError("");
    try {
      const data = await api.post('/auth/verify-otp', { email, otp });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      const role = data.user.role;
      if (role === 'production_manager') navigate('/pm');
      else if (role === 'farm_manager') navigate('/farm-manager');
      else if (role === 'admin') navigate('/admin');
      else if (role === 'logistic_officer') navigate('/logistics');
      else if (role === 'quality_officer') navigate('/qc');
      else navigate('/');
    } catch (error: any) {
      const msg: string = error.message || "Incorrect code.";
      if (msg.toLowerCase().includes("too many") || msg.toLowerCase().includes("log in again")) {
        setIsLocked(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
      setOtpError(msg);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Resend ──────────────────────────────────────────────────────────
  const handleResend = async () => {
    setIsResending(true);
    setOtpError("");
    try {
      await api.post('/auth/login', { email, password });
      setOtpDigits(["", "", "", "", "", ""]);
      setIsLocked(false);
      startTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      setOtpError("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  // ── Shared card wrapper ─────────────────────────────────────────────
  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden font-sans py-12 px-4">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${packagingImg})` }}
      />
      <div className="absolute inset-0 z-10 bg-[#0a1c12]/65" />

      <Link
        to="/"
        className="absolute top-6 left-6 z-30 inline-flex items-center gap-1.5 text-white/85 hover:text-white text-[13px] font-medium transition-colors group"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform group-hover:-translate-x-0.5 duration-200">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to Home
      </Link>

      <div className="relative z-20 w-full max-w-[400px] bg-[#0f2316]/72 backdrop-blur-[24px] saturate-[1.4] border border-white/14 rounded-[20px] p-[28px_24px] md:p-[36px_40px] shadow-[0_32px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] animate-in fade-in zoom-in duration-[350ms] ease-[cubic-bezier(0.34,1.2,0.64,1)]">

        {/* ── Logo (always visible) ─────────────────────────── */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4 hover:opacity-80 transition-opacity flex flex-col items-center">
            <div className="text-2xl font-bold tracking-tight">
              <span className="text-white">Fresh</span>
              <span className="text-[#7ec99a]">Sarura</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400 tracking-[1.5px] uppercase mt-0.5">Exports & Farmer Hub</span>
          </Link>

          {step === "credentials" ? (
            <>
              <h1 className="text-white text-2xl font-serif font-bold mb-1">Welcome back</h1>
              <p className="text-white/65 text-[13px]">Log in to your account</p>
            </>
          ) : (
            <>
              <h1 className="text-white text-2xl font-serif font-bold mb-1">Verification code</h1>
              <p className="text-white/65 text-[13px]">
                Enter the code sent to <span className="text-[#7ec99a] font-medium">{maskedEmail}</span>
              </p>
            </>
          )}
        </div>

        {/* ── STEP 1: Credentials form ──────────────────────── */}
        {step === "credentials" && (
          <form onSubmit={handleSubmit} className="space-y-[14px] relative z-30">
            <div className="relative">
              <label htmlFor="email" className="block text-white/60 text-[12px] font-medium mb-[5px] ml-1">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur("email")}
                className={cn(
                  "w-full h-[42px] bg-white/10 border border-white/20 rounded-lg px-4 text-white text-[14px] placeholder:text-white/38 outline-none transition-all duration-200 focus:border-[#7ec99a]/70 focus:ring-[3px] focus:ring-[#7ec99a]/12",
                  errors.email && "border-red-500/80 focus:border-red-500/80 focus:ring-red-500/12 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                )}
              />
              {errors.email && <p className="text-red-400 text-[11px] mt-1 ml-1">{errors.email}</p>}
            </div>

            <div className="relative">
              <div className="flex justify-between items-center ml-1 mb-[5px]">
                <label htmlFor="password" className="text-white/60 text-[12px] font-medium">Password</label>
                <Link to="/forgot-password" className="text-[#7ec99a] text-[11.5px] hover:underline focus:outline-none">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  className={cn(
                    "w-full h-[42px] bg-white/10 border border-white/20 rounded-lg pl-4 pr-12 text-white text-[14px] placeholder:text-white/38 outline-none transition-all duration-200 focus:border-[#7ec99a]/70 focus:ring-[#7ec99a]/12",
                    errors.password && "border-red-500/80 focus:border-red-500/80 focus:ring-red-500/12 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-white/45 hover:text-white transition-colors z-40"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-[11px] mt-1 ml-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[44px] mt-2 bg-[#2d6a45] hover:bg-[#1a3d2b] text-white text-[14.5px] font-medium rounded-lg shadow-lg transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center transform hover:-translate-y-px"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Login →"}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP verification ──────────────────────── */}
        {step === "otp" && (
          <div className="relative z-30 space-y-5">

            {/* 6 digit boxes */}
            <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={isLocked || secondsLeft === 0}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={cn(
                    "w-full aspect-square max-w-[52px] text-center text-white text-xl font-bold bg-white/10 border border-white/20 rounded-xl outline-none transition-all duration-150",
                    "focus:border-[#7ec99a]/80 focus:ring-[3px] focus:ring-[#7ec99a]/20 focus:bg-white/15",
                    digit && "border-[#7ec99a]/60 bg-white/15",
                    otpError && "border-red-500/70",
                    (isLocked || secondsLeft === 0) && "opacity-40 cursor-not-allowed"
                  )}
                />
              ))}
            </div>

            {/* Error message */}
            {otpError && (
              <p className={cn(
                "text-[12px] text-center",
                isLocked ? "text-red-400" : "text-red-400"
              )}>
                {otpError}
              </p>
            )}

            {/* Countdown */}
            {!isLocked && (
              <p className="text-white/55 text-[12px] text-center">
                {secondsLeft > 0 ? (
                  <>Code will expire in <span className="text-[#7ec99a] font-medium">{formatTimer(secondsLeft)}</span></>
                ) : (
                  <span className="text-red-400">Code has expired. Please resend.</span>
                )}
              </p>
            )}

            {/* Verify button */}
            <button
              onClick={handleVerifyOtp}
              disabled={isVerifying || isLocked || secondsLeft === 0 || otpDigits.join("").length < 6}
              className="w-full h-[44px] bg-[#2d6a45] hover:bg-[#1a3d2b] text-white text-[14.5px] font-medium rounded-lg shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:-translate-y-px"
            >
              {isVerifying ? <Loader2 className="animate-spin" size={18} /> : "Verify OTP"}
            </button>

            {/* Resend / Back */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { setStep("credentials"); if (timerRef.current) clearInterval(timerRef.current); }}
                className="text-white/45 text-[12px] hover:text-white/70 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-[#7ec99a] text-[12px] font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isResending ? <><Loader2 className="animate-spin" size={12} /> Resending...</> : "Didn't receive code? Resend"}
              </button>
            </div>
          </div>
        )}

        {/* ── Footer (credentials step only) ───────────────── */}
        {step === "credentials" && (
          <div className="text-center mt-5 relative z-30">
            {/* <p className="text-white/55 text-[13px]">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[#7ec99a] font-medium hover:underline">Sign Up</Link>
            </p> */}
            <div className="flex items-center justify-center gap-1.5 text-[#c9a84c]/70 text-[9.5px] font-bold uppercase tracking-[1.2px] mt-5">
              <span>GlobalG.A.P. Certified</span>
              <span className="opacity-40">·</span>
              <span>500+ Outgrowers</span>
              <span className="opacity-40">·</span>
              <span>4 Export Markets</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
