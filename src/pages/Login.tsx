import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MagneticButton } from "@/components/MagneticButton";

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
        const api = (window as any).nivasaApi;
        if (api) {
          const session = await api.auth.getSession();
          if (session?.user) {
            navigate("/app", { replace: true });
          }
        }
      } catch (e) {}
    };
    checkUser();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user || !pwd) { setError("Please fill in both fields."); return; }
    
    setLoading(true);
    try {
      const api = (window as any).nivasaApi;
      if (!api) throw new Error("API not loaded");
      
      if (!rememberMe) {
        sessionStorage.setItem("nivasa_no_remember", "true");
        localStorage.setItem("nivasa_no_remember", "true");
      } else {
        sessionStorage.removeItem("nivasa_no_remember");
        localStorage.removeItem("nivasa_no_remember");
      }

      const { data, error } = await api.auth.signIn(user, pwd);
      if (error) throw error;

      // Persist session user name so Topbar reads it dynamically
      if (data?.user?.fullName) {
        localStorage.setItem("nivasa_user_name", data.user.fullName);
      }
      
      navigate("/app");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
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
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
            <img src="/nivasa-brand.png" alt="Nivasa Logo" className="h-full w-full object-contain" />
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

          <Field label="Password">
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
          </Field>

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

          <div className="relative my-2 flex items-center gap-3">
            <div className="hairline flex-1" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
            <div className="hairline flex-1" />
          </div>

          <button
            type="button"
            onClick={() => navigate("/app")}
            className="h-11 w-full rounded-xl border border-border bg-card/60 text-sm font-medium transition-colors hover:bg-card"
          >
            Continue as demo
          </button>

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