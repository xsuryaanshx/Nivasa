import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Phone as PhoneIcon, Mail, ChevronLeft, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { nivasaApi } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'phone' | 'otp' | 'email'>('phone');
  
  const [show, setShow] = useState(false);
  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const session = await nivasaApi.auth.getSession();
        if (session?.user) {
          navigate("/app", { replace: true });
        }
      } catch (e) {}
    };
    checkUser();
  }, [navigate]);

  /* SECURITY FIX #10: Rate limiting — progressive delays on failed attempts.
   * HIGH-01 fix: State is now persisted in localStorage so it survives page refreshes.
   * An attacker can no longer bypass lockout by simply reloading the tab. */
  const [failCount, setFailCount] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("nivasa_fail_count") || "0", 10) || 0; } catch { return 0; }
  });
  const [lockUntil, setLockUntil] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("nivasa_lock_until");
      return v ? parseInt(v, 10) : null;
    } catch { return null; }
  });

  const handleLockoutCheck = () => {
    if (lockUntil && Date.now() < lockUntil) {
      const secsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Try again in ${secsLeft}s.`);
      return true;
    }
    return false;
  };

  const handleFail = (err: any) => {
    const nextFail = failCount + 1;
    setFailCount(nextFail);
    localStorage.setItem("nivasa_fail_count", String(nextFail));
    if (nextFail >= 7) {
      const until = Date.now() + 15000;
      setLockUntil(until);
      localStorage.setItem("nivasa_lock_until", String(until));
      setError("Too many failed attempts. Account locked for 15 seconds.");
    } else if (nextFail >= 5) {
      const until = Date.now() + 5000;
      setLockUntil(until);
      localStorage.setItem("nivasa_lock_until", String(until));
      setError("Too many failed attempts. Try again in 5 seconds.");
    } else if (nextFail >= 3) {
      const until = Date.now() + 2000;
      setLockUntil(until);
      localStorage.setItem("nivasa_lock_until", String(until));
      setError(err.message || "Invalid credentials. Please wait before retrying.");
    } else {
      setError(err.message || "Invalid credentials. Please try again.");
    }
  };

  const handleSuccess = () => {
    setFailCount(0);
    setLockUntil(null);
    localStorage.removeItem("nivasa_fail_count");
    localStorage.removeItem("nivasa_lock_until");
    
    if (!rememberMe) {
      sessionStorage.setItem("nivasa_no_remember", "true");
      localStorage.setItem("nivasa_no_remember", "true");
    } else {
      sessionStorage.removeItem("nivasa_no_remember");
      localStorage.removeItem("nivasa_no_remember");
    }
    
    navigate("/app");
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone) { setError("Please enter a valid phone number."); return; }
    if (handleLockoutCheck()) return;
    
    setLoading(true);
    try {
      let formattedPhone = phone;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone.replace(/\D/g, '');
      }
      const { error } = await nivasaApi.auth.signInWithOtp(formattedPhone);
      if (error) throw error;
      setAuthMode('otp');
    } catch (err: any) {
      handleFail(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp) { setError("Please enter the 6-digit OTP."); return; }
    if (handleLockoutCheck()) return;
    
    setLoading(true);
    try {
      let formattedPhone = phone;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone.replace(/\D/g, '');
      }
      const { error } = await nivasaApi.auth.verifyOtp(formattedPhone, otp);
      if (error) throw error;
      handleSuccess();
    } catch (err: any) {
      handleFail(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user || !pwd) { setError("Please fill in both fields."); return; }
    if (handleLockoutCheck()) return;
    
    setLoading(true);
    try {
      const { error } = await nivasaApi.auth.signIn(user, pwd);
      if (error) throw error;
      handleSuccess();
    } catch (err: any) {
      handleFail(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e0b36] via-[#0f172a] to-[#0a2342] px-4">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative z-10 w-full max-w-[420px] rounded-2xl bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/10"
      >
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 border border-white/20">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-white">Nivasa</div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome Home</h1>
          <p className="mt-2 text-sm text-white/60">Sign in to your property dashboard</p>
        </div>

        <AnimatePresence mode="wait">
          {authMode === 'phone' && (
            <motion.form 
              key="phone"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp} 
              className="space-y-4"
            >
              <Field label="Phone Number">
                <div className="flex rounded-xl border border-white/20 bg-black/20 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                  <div className="flex items-center px-3 border-r border-white/20 text-white/70 text-sm">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="h-12 w-full bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/30"
                  />
                </div>
              </Field>

              {error && <ErrorMessage message={error} />}

              <button 
                type="submit" 
                disabled={loading}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all disabled:opacity-70"
              >
                {loading ? "Sending OTP..." : "Continue"}
              </button>

              <div className="mt-6 flex justify-center">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('email'); setError(null); }}
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4" /> Login with Email instead
                </button>
              </div>
            </motion.form>
          )}

          {authMode === 'otp' && (
            <motion.form 
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleVerifyOtp} 
              className="space-y-4"
            >
              <Field label="One-Time Password">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="h-12 w-full rounded-xl border border-white/20 bg-black/20 px-4 text-center text-lg tracking-[0.5em] text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:tracking-normal placeholder:text-white/30"
                />
              </Field>
              <p className="text-center text-xs text-white/50">
                Code sent to +91 {phone}
              </p>

              {error && <ErrorMessage message={error} />}

              <button 
                type="submit" 
                disabled={loading}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all disabled:opacity-70"
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </button>

              <div className="mt-6 flex justify-center">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('phone'); setError(null); }}
                  className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to Phone
                </button>
              </div>
            </motion.form>
          )}

          {authMode === 'email' && (
            <motion.form 
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleEmailLogin} 
              className="space-y-4"
            >
              <Field label="Email">
                <input
                  type="email"
                  value={user}
                  onChange={e => setUser(e.target.value)}
                  placeholder="jordan@example.com"
                  className="h-12 w-full rounded-xl border border-white/20 bg-black/20 px-3.5 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-white/30"
                />
              </Field>

              <Field label="Password">
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={pwd}
                    onChange={e => setPwd(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border border-white/20 bg-black/20 px-3.5 pr-10 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-white/30"
                  />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                    aria-label="Toggle password">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/20 text-blue-500 focus:ring-blue-500/50 outline-none accent-blue-500"
                />
                <label htmlFor="remember" className="text-sm text-white/60 font-medium cursor-pointer select-none">
                  Keep me logged in
                </label>
              </div>

              {error && <ErrorMessage message={error} />}

              <button 
                type="submit" 
                disabled={loading}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all disabled:opacity-70"
              >
                {loading ? "Signing in..." : <>Sign in <ArrowRight className="h-4 w-4" /></>}
              </button>

              <div className="mt-6 flex flex-col items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('phone'); setError(null); }}
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <PhoneIcon className="h-4 w-4" /> Login with Phone instead
                </button>
                
                <div className="text-xs text-white/40">
                  Don't have an account?{" "}
                  <Link to="/register" className="font-medium text-white/80 hover:text-white hover:underline">
                    Sign up
                  </Link>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/70">{label}</span>
      {children}
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
      {message}
    </motion.div>
  );
}