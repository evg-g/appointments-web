import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

import { seedSession, type Role } from "../support/helpers";

/**
 * Accessibility sweep: every route in both themes must have zero serious or critical axe
 * violations (WCAG 2.2 AA — the target set in the spec). The component-level check lives in
 * Storybook's a11y addon; this is the whole-page check, where landmark, heading-order, and
 * page-contrast issues actually surface.
 */

interface RouteCase {
  name: string;
  path: string;
  role?: Role;
  ready: (page: Page) => Promise<void>;
}

async function heading(page: Page, name: string | RegExp): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

const ROUTES: RouteCase[] = [
  {
    name: "login",
    path: "/login",
    ready: (p) => expect(p.getByRole("button", { name: "Sign in" })).toBeVisible(),
  },
  { name: "dashboard", path: "/", role: "PLATFORM_ADMIN", ready: (p) => heading(p, /Welcome,/) },
  {
    name: "appointments",
    path: "/appointments",
    role: "PATIENT",
    ready: (p) => heading(p, "Appointments"),
  },
  {
    name: "booking",
    path: "/appointments/new",
    role: "PATIENT",
    ready: (p) => heading(p, "Book an appointment"),
  },
  { name: "calendar", path: "/calendar", role: "PATIENT", ready: (p) => heading(p, "Calendar") },
  { name: "settings", path: "/settings", role: "PATIENT", ready: (p) => heading(p, "Settings") },
  {
    name: "cold-chain",
    path: "/cold-chain",
    role: "CLINICIAN",
    ready: (p) => heading(p, "Cold chain"),
  },
  {
    name: "admin-clinics",
    path: "/admin/clinics",
    role: "PLATFORM_ADMIN",
    ready: (p) => heading(p, "Admin"),
  },
  {
    name: "admin-audit",
    path: "/admin/audit",
    role: "PLATFORM_ADMIN",
    ready: (p) => heading(p, "Admin"),
  },
  {
    name: "not-found",
    path: "/no-such-page",
    role: "PATIENT",
    // The 404 is a centered empty state, not a page with an <h1>.
    ready: (p) => expect(p.getByText("Page not found")).toBeVisible(),
  },
];

const THEMES = ["light", "dark"] as const;

for (const theme of THEMES) {
  test.describe(`a11y — ${theme} theme`, () => {
    test.use({ colorScheme: theme });

    for (const route of ROUTES) {
      test(`${route.name} has no serious or critical violations`, async ({ page }) => {
        if (route.role !== undefined) await seedSession(page, route.role);
        await page.goto(route.path);
        await route.ready(page);

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();

        const blocking = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        const summary = blocking.map((v) => `${v.id} (${String(v.impact)}): ${v.help}`).join("\n");
        expect(blocking, `axe violations on ${route.name} [${theme}]:\n${summary}`).toEqual([]);
      });
    }
  });
}
