import { Activity } from "lucide-react";
import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "@/auth/useAuth";
import { ThemeToggle } from "@/components/ui";
import { cn } from "@/lib/cn";
import { RouteFallback } from "@/routes/RouteFallback";

import { UserMenu } from "./UserMenu";
import { visibleNavItems } from "./nav";
import type { NavItem } from "./nav";

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-accent-subtle text-accent-subtle-fg"
      : "text-muted hover:bg-sunken hover:text-fg",
  );
}

function NavItems({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end ?? false} className={navLinkClass}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </>
  );
}

/**
 * The authenticated app frame: a skip link, a sticky header with role-aware navigation, the theme
 * control and account menu, and the routed content region. Rendered only inside ProtectedRoute, so
 * a user is always present.
 */
export function AppLayout() {
  const { user } = useAuth();
  if (user === null) return null;

  const items = visibleNavItems(user.role);

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <a href="#main" className="sr-only focus-not-sr">
        Skip to main content
      </a>

      <header className="sticky top-0 z-[100] border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4">
          <NavLink
            to="/"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold text-fg"
            end
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-fg">
              <Activity className="size-4" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">Aurora Clinic</span>
          </NavLink>

          <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 xl:flex">
            <NavItems items={items} />
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle compact />
            <UserMenu user={user} />
          </div>
        </div>

        {/* Below xl the nav gets its own row: an admin's six links do not fit beside the brand and
            account controls, and squeezing them wraps their labels. Scrolls sideways on phones. */}
        <nav
          aria-label="Primary"
          className="mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto border-t border-line px-4 py-2 xl:hidden"
        >
          <NavItems items={items} />
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* One boundary for every lazily-loaded page below; nested layouts add their own. */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
