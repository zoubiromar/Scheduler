import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return <div className="route-loading">Opening your shared day…</div>;
  }

  if (!auth.user && !auth.demoMode) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return children;
}
