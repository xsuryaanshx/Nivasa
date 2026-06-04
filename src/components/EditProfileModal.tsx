import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Mail, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      setName(user.fullName || "");
      setEmail(user.email || "");
    }
  }, [user, open]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const api = (window as any).nivasaApi;
      if (api?.auth?.updateProfile) {
        await api.auth.updateProfile({ full_name: name });
        toast.success("Profile updated successfully!");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        localStorage.setItem("nivasa_user_name", name);
        toast.success("Profile updated (local)!");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[100] flex items-start pt-24 justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
                    <User className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Edit Profile</p>
                    <p className="text-xs text-muted-foreground">Update your personal info</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      value={email}
                      disabled
                      className="w-full rounded-xl border border-border bg-secondary/50 py-2 pl-9 pr-4 text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Email address cannot be changed</p>
                </div>

                <button
                  onClick={handleSave}
                  disabled={loading || !name.trim()}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
