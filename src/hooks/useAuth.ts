/**
 * useAuth — lightweight auth hook backed by nivasaApi.
 * Reads current session from the API facade.
 */
import { useEffect, useState } from "react";

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
  let full = raw.fullName || raw.email.split("@")[0];
  if (full === "rohittiwary54") full = "Rohit Tiwary";
  
  const parts = full.trim().split(/\s+/);
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
    const api = (window as any).nivasaApi;
    if (!api) return;
    
    const checkSession = async () => {
      const session = await api.auth.getSession();
      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User";
        setUser(buildUser({ id: session.user.id, email: session.user.email || "", fullName }));
      } else {
        const storedName = localStorage.getItem("nivasa_user_name") || "User";
        setUser(buildUser({ id: "demo", email: "demo@nivasa.app", fullName: storedName }));
      }
    };
    
    checkSession();
  }, []);

  const signOut = async () => {
    const api = (window as any).nivasaApi;
    if (api) await api.auth.signOut();
    localStorage.removeItem("nivasa_user_name");
    setUser(null);
    window.location.href = "/login";
  };

  return { user, signOut };
}
