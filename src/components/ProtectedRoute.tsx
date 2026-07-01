/**
 * ProtectedRoute — redirects to /login if the user has no active session.
 * Wrap any route that requires authentication with this component.
 * SECURITY FIX #15: Subscribes to auth state changes for real-time session expiry handling.
 */
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { nivasaApi, supabase } from "@/lib/api";

interface ProtectedRouteProps {
  allowedRole?: "landlord" | "tenant";
}

export function ProtectedRoute({ allowedRole = "landlord" }: ProtectedRouteProps) {
  const [status, setStatus] = useState<"loading" | "auth" | "unauth">("loading");
  const [userRole, setUserRole] = useState<string>("landlord");

  useEffect(() => {
    // Initial session check
    nivasaApi.auth.getSession().then((session) => {
      if (session?.user) {
        setUserRole(session.user.user_metadata?.role || "landlord");
        setStatus("auth");
      } else {
        setStatus("unauth");
      }
    }).catch(() => {
      setStatus("unauth");
    });

    // SECURITY: Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        setStatus("unauth");
      } else if (session?.user) {
        setUserRole(session.user.user_metadata?.role || "landlord");
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
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-64 flex-col border-r border-border bg-card/50 p-4 md:flex">
          <div className="h-8 w-32 rounded-lg bg-muted animate-pulse mb-8" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-full rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </aside>
        <main className="flex-1 p-4 md:p-8">
          <div className="h-8 w-48 rounded-lg bg-muted animate-pulse mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 w-full rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (status === "auth") {
    if (allowedRole !== userRole) {
      return <Navigate to={userRole === "tenant" ? "/tenant/dashboard" : "/app"} replace />;
    }
    return <Outlet />;
  }

  return <Navigate to="/login" replace />;
}
