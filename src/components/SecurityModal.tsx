import { nivasaApi } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SecurityModal({ open, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Strength
  const strength = (() => {
    if (newPassword.length === 0) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = [
    "",
    "bg-rose-500",
    "bg-amber-400",
    "bg-blue-400",
    "bg-emerald-400",
  ][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      if (!nivasaApi) throw new Error("nivasaApi not ready");
      
      if (!currentPassword) {
        throw new Error("Current password is required.");
      }

      // Get current user email to verify current password
      const { data: { session } } = await nivasaApi.supabase.auth.getSession();
      if (!session?.user?.email) throw new Error("No active session");

      // Verify current password
      const { error: verifyError } = await nivasaApi.supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error("Current password is incorrect.");
      }

      // Supabase: updateUser with new password
      const { error: updateError } = await nivasaApi.supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success("Password updated successfully", {
        description: "You can now log in with your new password.",
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
                    <Lock className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Security</p>
                    <p className="text-xs text-muted-foreground">Change your password</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Current password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Current password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3.5 pr-10 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.15)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3.5 pr-10 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.15)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors duration-300",
                              i <= strength ? strengthColor : "bg-secondary",
                            )}
                          />
                        ))}
                      </div>
                      <p className={cn("text-[11px] font-medium", strengthColor.replace("bg-", "text-").replace("-500", "-500").replace("-400", "-400"))}>
                        {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3.5 pr-10 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.15)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-rose-400">Passwords do not match</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <p className="text-xs text-rose-400">{error}</p>
                  </motion.div>
                )}

                {/* Tips */}
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground">Password tips</p>
                  {[
                    "At least 8 characters",
                    "Mix upper & lowercase letters",
                    "Include numbers or symbols",
                  ].map((tip) => (
                    <p key={tip} className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      {tip}
                    </p>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {saving ? "Saving…" : "Update Password"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
