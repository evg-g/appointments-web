import type { ReactNode } from "react";

import type { UserRole } from "./auth-context";
import { useAuth } from "./useAuth";

export interface RoleGateProps {
  /** Roles allowed to see the children. */
  allow: readonly UserRole[];
  children: ReactNode;
  /** Rendered when the current user's role is not allowed. Defaults to nothing. */
  fallback?: ReactNode;
}

/** Conditionally render UI (a nav link, an action button) based on the current user's role. */
export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth();
  if (user !== null && allow.includes(user.role)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
