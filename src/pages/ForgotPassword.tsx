import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { NivasaLogo } from "@/components/NivasaLogo";
import { MagneticButton } from "@/components/MagneticButton";
import { nivasaApi } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await nivasaApi.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
      setEmail("");
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
          <NivasaLogo className="h-16 w-16 rounded-xl" iconOnly />
          <div>
            <div className="text-xl font-bold tracking-tight">Nivasa</div>
            <div className="text-xs text-muted-foreground font-medium">Reset password</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Forgot Password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email Address</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jordan@example.com"
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
            {loading ? "Sending..." : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
          </MagneticButton>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline">
              <ArrowLeft className="h-3 w-3" /> Back to Sign In
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
