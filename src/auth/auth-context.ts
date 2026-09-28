import { createContext } from "react";

import type { components } from "@/api/schema";

export type User = components["schemas"]["UserOut"];
export type UserRole = components["schemas"]["UserRole"];

/**
 * - `loading`: we have tokens and are resolving the current user (or logging in).
 * - `authenticated`: `user` is populated.
 * - `unauthenticated`: no valid session.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Throws the raw API error on failure so the caller can map it onto a form. */
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
