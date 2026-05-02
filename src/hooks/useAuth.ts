/**
 * useAuth — lightweight auth hook backed by estateApi.
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
  const full = raw.fullName || raw.email.split("@")[0];
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
    const api = (window as any).estateApi;
    if (!api) return;
    const session = api.auth.getSession();
    if (session?.user) {
      setUser(buildUser(session.user));
    } else {
      // Fallback for demo / "continue as demo" path
      const storedName = localStorage.getItem("estate_user_name") || "User";
      setUser(buildUser({ id: "demo", email: "demo@estate.app", fullName: storedName }));
    }
  }, []);

  return { user };
}
