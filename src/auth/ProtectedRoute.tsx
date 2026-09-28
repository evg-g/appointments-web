import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { Spinner } from "@/components/ui";

import { useAuth } from "./useAuth";

/**
 * Gate for authenticated routes. While the session is resolving we show a spinner (not a redirect),
 * so a logged-in user reloading the page never flashes the login screen. Unauthenticated users are
 * sent to /login with the attempted location, so they return there after signing in.
 */
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <Spinner size="lg" label="Checking your session" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
