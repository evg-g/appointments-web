import { Navigate, Outlet } from "react-router-dom";

import type { UserRole } from "./auth-context";
import { useAuth } from "./useAuth";

/**
 * Route-level authorization guard. Used inside ProtectedRoute, so a user is present; a user whose
 * role is not allowed is redirected to the dashboard rather than shown a page they cannot use.
 */
export function RequireRole({ allow }: { allow: readonly UserRole[] }) {
  const { user } = useAuth();
  if (user === null) return null;
  if (!allow.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
