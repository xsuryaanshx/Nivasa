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
}

function buildUser(raw: { id: string; email: string; fullName: string }): AuthUser {
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
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const session = await nivasaApi.auth.getSession();
      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User";
        setUser(buildUser({ id: session.user.id, email: session.user.email || "", fullName }));
      } else {
        setUser(null);
      }
    };
    
    checkSession();
  }, []);

  const signOut = async () => {
    await nivasaApi.auth.signOut();
    /* SECURITY FIX #22: signOut on all devices by using scope: 'global' */
    await nivasaApi.supabase.auth.signOut({ scope: 'global' });
    setUser(null);
    window.location.href = "/login";
  };

  return { user, signOut };
}
