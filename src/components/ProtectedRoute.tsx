/**
 * ProtectedRoute — redirects to /login if the user has no active session.
 * Wrap any route that requires authentication with this component.
 */
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { nivasaApi } from "@/lib/api";

export function ProtectedRoute() {
  const [status, setStatus] = useState<"loading" | "auth" | "unauth">("loading");

  useEffect(() => {
    nivasaApi.auth.getSession().then((session) => {
      setStatus(session ? "auth" : "unauth");
    }).catch(() => {
      setStatus("unauth");
    });
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
