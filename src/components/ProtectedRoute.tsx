/**
 * ProtectedRoute — redirects to /login if the user has no active session.
 * Wrap any route that requires authentication with this component.
 * SECURITY FIX #15: Subscribes to auth state changes for real-time session expiry handling.
 */
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { nivasaApi, supabase } from "@/lib/api";

export function ProtectedRoute() {
  const [status, setStatus] = useState<"loading" | "auth" | "unauth">("loading");

  useEffect(() => {
    // Initial session check
    nivasaApi.auth.getSession().then((session) => {
      setStatus(session ? "auth" : "unauth");
    }).catch(() => {
      setStatus("unauth");
    });

    // SECURITY: Listen for auth state changes (logout, session expiry, token refresh failures)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" && !session) {
        setStatus("unauth");
      } else if (session) {
        setStatus("auth");
      } else {
        setStatus("unauth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return status === "auth" ? <Outlet /> : <Navigate to="/login" replace />;
}
