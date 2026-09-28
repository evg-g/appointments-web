import { expect, type Page } from "@playwright/test";

/**
 * Shared helpers for the browser test tiers. The app under test serves its own typed MSW backend
 * (VITE_ENABLE_MSW=true), so these drive the same seeded data and named error scenarios the
 * component tests use — in a real browser.
 */

export type Role = "PATIENT" | "CLINICIAN" | "PLATFORM_ADMIN";

/** Seed logins mirrored from src/mocks/data.ts (all share the same password). */
export const ACCOUNTS: Record<Role, { email: string; password: string; firstName: string }> = {
  PATIENT: { email: "patient@aurora.test", password: "password123", firstName: "Pat" },
  CLINICIAN: { email: "clinician@aurora.test", password: "password123", firstName: "Casey" },
  PLATFORM_ADMIN: { email: "admin@aurora.test", password: "password123", firstName: "Avery" },
};

// 2100-01-01, so the advisory token expiry never trips during a test.
const FAR_FUTURE_MS = 4102444800000;

/** The one error scenario the E2E suite forces; must exist in src/mocks/handlers.ts `scenarios`. */
export type ScenarioName =
  | "bookingConflict"
  | "appointmentsError"
  | "appointmentsEmpty"
  | "clinicsError"
  | "devicesError"
  | "acknowledgeFails";

interface E2eControls {
  useScenario: (name: string) => void;
  reset: () => void;
}

/**
 * Pre-seed an authenticated session for a role, so a following page.goto lands already signed in.
 * The mock backend resolves this role-encoded token even after a full navigation (see
 * src/mocks/handlers.ts `bearerUser`), which is what lets the suite visit any route directly.
 */
export async function seedSession(page: Page, role: Role): Promise<void> {
  const tokens = {
    accessToken: `mock-access-${role}-1`,
    refreshToken: `mock-refresh-${role}-1`,
    expiresAt: FAR_FUTURE_MS,
  };
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("aurora.auth", value);
  }, JSON.stringify(tokens));
}

/** Resolve once the app's MSW backend is live and its E2E control surface is attached. */
export async function waitForMockBackend(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (globalThis as { __aurora_e2e?: unknown }).__aurora_e2e !== undefined,
  );
}

/**
 * Force a named error scenario at the network layer for the rest of the test, on the current page.
 * Use this for mid-journey injection (inject, then act, without navigating). For an error that must
 * survive a page load, use `bootScenario` instead.
 */
export async function useScenario(page: Page, name: ScenarioName): Promise<void> {
  await waitForMockBackend(page);
  await page.evaluate((scenario) => {
    (globalThis as unknown as { __aurora_e2e?: E2eControls }).__aurora_e2e?.useScenario(scenario);
  }, name);
}

/**
 * Arrange a named error scenario to be applied the instant the MSW worker starts, on every page
 * load in this test. Use this for initial-load error states (a failing list, an empty backend),
 * which a full navigation would otherwise reset.
 */
export async function bootScenario(page: Page, name: ScenarioName): Promise<void> {
  await page.addInitScript((scenario: string) => {
    const store = (globalThis as { __aurora_e2e_boot?: string[] }).__aurora_e2e_boot ?? [];
    store.push(scenario);
    (globalThis as { __aurora_e2e_boot?: string[] }).__aurora_e2e_boot = store;
  }, name);
}

/** Sign in through the real login form and wait for the dashboard. Used by the login journey. */
export async function loginViaForm(page: Page, role: Role): Promise<void> {
  const account = ACCOUNTS[role];
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Welcome,/ })).toBeVisible();
}

// A fixed Monday: the seeded clinician works Mon–Fri, so availability is non-empty regardless of
// the day the suite runs. The browser timezone is pinned in playwright.config.ts, so the weekday
// is stable.
export const BOOKABLE_DAY = "2026-01-05";

/**
 * Walk the booking wizard from the start up to (but not clicking) the final Confirm step: clinic →
 * service → clinician → day/slot. Assumes an authenticated session is already seeded.
 */
export async function walkBookingToConfirm(page: Page): Promise<void> {
  await page.goto("/appointments/new");
  await expect(page.getByRole("heading", { level: 1, name: "Book an appointment" })).toBeVisible();

  await page.getByLabel("Clinic").selectOption({ label: "Aurora Downtown" });
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Service").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Clinician").selectOption({ label: "General practice" });
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Day").fill(BOOKABLE_DAY);
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByRole("button", { name: "Confirm booking" })).toBeVisible();
}

/**
 * Complete the booking wizard and return the created appointment's detail URL path. Steps:
 * clinic → service → clinician → day/slot → confirm.
 */
export async function bookAppointment(page: Page): Promise<string> {
  await walkBookingToConfirm(page);
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Appointment" })).toBeVisible();
  await page.waitForURL(/\/appointments\/[^/]+$/);
  return new URL(page.url()).pathname;
}
