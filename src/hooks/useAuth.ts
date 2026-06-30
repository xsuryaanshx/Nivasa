/**
 * useAuth — lightweight auth hook backed by nivasaApi.
 * Uses direct import instead of window.nivasaApi global.
 */
import { useEffect, useState } from "react";
import { nivasaApi } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  /** Initials for avatar display (max 2 chars) */
  initials: string;
  /** First name only */
  firstName: string;
  upiId?: string;
}

function buildUser(raw: { id: string; email: string; fullName: string; upiId?: string }): AuthUser {
  const full = (raw.fullName || raw.email.split("@")[0] || "User").trim();
  const parts = full.split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
  return {
    id: raw.id,
    email: raw.email,
    fullName: full,
    initials,
    firstName: parts[0] || full,
    upiId: raw.upiId,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const session = await nivasaApi.auth.getSession();
      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User";
        const upiId = session.user.user_metadata?.upi_id || undefined;
        setUser(buildUser({ id: session.user.id, email: session.user.email || "", fullName, upiId }));
      } else {
        setUser(null);
      }
    };
    
    checkSession();

    // HIGH-02 fix: Subscribe to real-time auth changes so the UI updates
    // immediately on session expiry, sign-out from another tab, or token revocation.
    const { data: { subscription } } = nivasaApi.supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const fullName =
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "User";
          const upiId = session.user.user_metadata?.upi_id || undefined;
          setUser(buildUser({ id: session.user.id, email: session.user.email || "", fullName, upiId }));
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // HIGH-03 fix: Clear all Nivasa-owned localStorage keys on logout.
  // Prevents expense data, rate-limit state, and names from leaking to
  // the next user on a shared device.
  const clearNivasaStorage = () => {
    const keysToRemove = [
      "nivasa_user_name",
      "nivasa_no_remember",
      "nivasa_fail_count",
      "nivasa_lock_until",
      "nivasa_custom_expenses",
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    // Clear per-tenant expense assignment keys
    Object.keys(localStorage)
      .filter((k) => k.startsWith("nivasa_tenant_exp_"))
      .forEach((k) => localStorage.removeItem(k));
  };

  const signOut = async () => {
    await nivasaApi.logUserActivity("logout", "User logged out successfully");
    await nivasaApi.auth.signOut();
    /* SECURITY FIX #22: signOut on all devices by using scope: 'global' */
    await nivasaApi.supabase.auth.signOut({ scope: 'global' });
    clearNivasaStorage();
    setUser(null);
    window.location.href = "/login";
  };

  return { user, signOut };
}
