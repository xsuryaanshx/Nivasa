import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NivasaLogo } from "@/components/NivasaLogo";
import { MagneticButton } from "@/components/MagneticButton";
import { nivasaApi } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Check if we have an active recovery session
    const checkSession = async () => {
      try {
        const session = await nivasaApi.auth.getSession();
        if (!session) {
          // Sometimes Supabase takes a split second to set the session from the URL hash,
          // so we wait slightly or show a warning.
          setTimeout(async () => {
            const retrySession = await nivasaApi.auth.getSession();
            if (!retrySession) {
              setError("Invalid or expired reset link. Please request a new one.");
            }
            setSessionChecked(true);
          }, 800);
        } else {
          setSessionChecked(true);
        }
      } catch (e) {
        setError("Error validating recovery session.");
        setSessionChecked(true);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must be at least 8 characters long and include an uppercase letter, lowercase letter, and a number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // 1. Update user password
      const { error: updateError } = await nivasaApi.supabase.auth.updateUser({
        password: password
      });
      if (updateError) throw updateError;

      // 2. Sign out of all other devices
      const { error: signOutError } = await nivasaApi.supabase.auth.signOut({
        scope: "others"
      });
      if (signOutError) {
        console.warn("Failed to sign out of other devices:", signOutError);
      }

      toast.success("Password reset successfully! All other sessions ended.");
      
      // Redirect to login page to sign in with new credentials
      // (This is the safest flow to verify the new password works)
      await nivasaApi.auth.signOut(); // Sign out current recovery session too
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
      setError(err.message || "Failed to reset password");
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
          <NivasaLogo className="h-16 w-16 rounded-xl" iconOnly />
          <div>
            <div className="text-xl font-bold tracking-tight">Nivasa</div>
            <div className="text-xs text-muted-foreground font-medium">New credentials</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Create New Password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your new password below to reset your credentials.
        </p>

        {!sessionChecked ? (
          <div className="mt-8 flex flex-col items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-xs text-muted-foreground mt-3">Validating recovery link...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">New Password</span>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-border bg-card/70 px-3.5 pr-10 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                  aria-label="Toggle password">
                  {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm New Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-border bg-card/70 px-3.5 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
            </label>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </motion.div>
            )}

            <MagneticButton type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? "Resetting..." : <>Reset & Sign Out Others <ArrowRight className="h-4 w-4" /></>}
            </MagneticButton>
          </form>
        )}
      </motion.div>
    </div>
  );
}
