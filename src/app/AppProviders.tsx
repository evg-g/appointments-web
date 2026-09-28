import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { AuthProvider } from "@/auth/AuthProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import type { ThemePreference } from "@/theme/theme";

import { createQueryClient } from "./query-client";

interface AppProvidersProps {
  children: ReactNode;
  /** Inject a client in tests/Storybook; a fresh one is created per render otherwise. */
  queryClient?: QueryClient;
  initialTheme?: ThemePreference;
}

/**
 * The cross-cutting context stack: theme, server-state cache, and auth. Deliberately excludes the
 * router so tests and Storybook can supply their own (MemoryRouter). main.tsx adds RouterProvider
 * inside this stack.
 */
export function AppProviders({ children, queryClient, initialTheme }: AppProvidersProps) {
  // useState so a per-render client (when none is injected) is stable across re-renders.
  const [fallbackClient] = useState(() => queryClient ?? createQueryClient());
  const client = queryClient ?? fallbackClient;

  return (
    <ThemeProvider {...(initialTheme !== undefined ? { initial: initialTheme } : {})}>
      <QueryClientProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
