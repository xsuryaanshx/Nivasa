import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MagneticButton } from "@/components/MagneticButton";
import { nivasaApi } from "@/lib/api";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user || !pwd) { setError("Please fill in both fields."); return; }
    
    // Check lockout
    if (lockUntil && Date.now() < lockUntil) {
      const secsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Try again in ${secsLeft}s.`);
      return;
    }
    
    setLoading(true);
    try {
      if (!rememberMe) {
        sessionStorage.setItem("nivasa_no_remember", "true");
        localStorage.setItem("nivasa_no_remember", "true");
      } else {
        sessionStorage.removeItem("nivasa_no_remember");
        localStorage.removeItem("nivasa_no_remember");
      }

      const { data, error } = await nivasaApi.auth.signIn(user, pwd);
      if (error) throw error;
      
      setFailCount(0);
      setLockUntil(null);
      localStorage.removeItem("nivasa_fail_count");
      localStorage.removeItem("nivasa_lock_until");
      navigate("/app");
    } catch (err: any) {
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
        setError(err.message || "Invalid email or password. Please wait before retrying.");
      } else {
        setError(err.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!user) {
      toast.error("Please enter your email address first.");
      setError("Please enter your email address first.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { error } = await nivasaApi.supabase.auth.resetPasswordForEmail(user, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="aurora" />
      <div className="absolute inset-0 bg-gradient-aurora opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative z-10 w-full max-w-[420px] glass-strong rounded-2xl p-8 shadow-float"
      >
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl">
            <img src="/nivasa-brand-v2.png" alt="Nivasa Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">Nivasa</div>
            <div className="text-xs text-muted-foreground font-medium">Welcome back</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Manage buildings, rooms, and tenants in one calm place.</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <Field label="Email">
            <input
              type="email"
              value={user}
              onChange={e => setUser(e.target.value)}
              placeholder="jordan@example.com"
              className="h-11 w-full rounded-xl border border-border bg-card/70 px-3.5 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
            />
          </Field>

          <div className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Password</span>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-xs font-medium text-brand hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-border bg-card/70 px-3.5 pr-10 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                aria-label="Toggle password">
                {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-card/70 text-brand focus:ring-brand/20 outline-none accent-brand"
            />
            <label htmlFor="remember" className="text-sm text-muted-foreground font-medium cursor-pointer select-none">
              Keep me logged in
            </label>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </motion.div>
          )}

          <MagneticButton type="submit" className="mt-2 w-full" disabled={loading}>
            {loading ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4" /></>}
          </MagneticButton>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-foreground hover:underline">
              Sign up
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}