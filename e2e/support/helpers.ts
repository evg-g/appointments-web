import { expect, type Page, type Route } from "@playwright/test";

import { AppointmentPage, BookingWizardPage, DashboardPage, LoginPage } from "../models";
import {
  EVERY_STATUS_APPOINTMENTS,
  EVERY_STATUS_NOW,
  MANY_PAGES_APPOINTMENTS,
  NO_CANCELLED_APPOINTMENTS,
  OCTOBER_NOW,
  ONLY_CANCELLED_APPOINTMENTS,
  TWO_CLINICS_APPOINTMENTS,
} from "../../src/mocks/appointmentsEveryStatus";

export { EVERY_STATUS_NOW, OCTOBER_NOW };

/**
 * Shared helpers for the browser test tiers.
 *
 * There are two backends the same specs run against, selected by E2E_BACKEND:
 *   - "mock" (default, playwright.config.ts): the app serves its own typed MSW backend
 *     (VITE_ENABLE_MSW=true), so sessions are seeded with a role-encoded mock token and error
 *     scenarios are forced through the app's `window.__aurora_e2e` control surface.
 *   - "composed" (playwright.composed.config.ts, milestone 15): the real API + Postgres + Redis
 *     behind the web tier. There is no MSW and no control surface, so sessions are seeded with a
 *     *real* login and error scenarios are forced at the network layer with page.route() (spec §6).
 *
 * The spec files do not know which backend is live; only these helpers branch.
 */

const COMPOSED = process.env.E2E_BACKEND === "composed";

export type Role = "PATIENT" | "CLINICIAN" | "PLATFORM_ADMIN";

// The mock backend accepts any email; the real API validates with Pydantic EmailStr, which rejects
// reserved TLDs like `.test`. So mock mode keeps the src/mocks/data.ts addresses and composed mode
// uses an ordinary domain (matching scripts/seed-e2e.mjs and the compose seed-admin service).
const EMAIL_DOMAIN = COMPOSED ? "aurora-clinic.com" : "aurora.test";

/** Seed logins (all share the same password). In composed mode the same accounts are provisioned in
 * the real DB by scripts/seed-e2e.mjs. */
export const ACCOUNTS: Record<Role, { email: string; password: string; firstName: string }> = {
  PATIENT: { email: `patient@${EMAIL_DOMAIN}`, password: "password123", firstName: "Pat" },
  CLINICIAN: { email: `clinician@${EMAIL_DOMAIN}`, password: "password123", firstName: "Casey" },
  PLATFORM_ADMIN: { email: `admin@${EMAIL_DOMAIN}`, password: "password123", firstName: "Avery" },
};

// 2100-01-01, so the advisory token expiry never trips during a test.
const FAR_FUTURE_MS = 4102444800000;

/** The error scenarios the E2E suite forces; must exist in src/mocks/handlers.ts `scenarios`. */
export type ScenarioName =
  | "bookingConflict"
  | "appointmentsError"
  | "appointmentsEmpty"
  | "appointmentsEveryStatus"
  | "appointmentsNoCancelled"
  | "appointmentsOnlyCancelled"
  | "appointmentsTwoClinics"
  | "appointmentsManyPages"
  | "clinicsError"
  | "devicesError"
  | "acknowledgeFails";

interface E2eControls {
  useScenario: (name: string) => void;
  reset: () => void;
}

/**
 * Pre-seed an authenticated session for a role, so a following page.goto lands already signed in.
 *
 * Mock mode: write a role-encoded token that the MSW backend resolves after any navigation (see
 * src/mocks/handlers.ts `bearerUser`). Composed mode: perform a real login against the API and store
 * the issued tokens in the same shape the app's token store reads (src/auth/token-store.ts).
 */
// The last role seeded on the page, so composed-mode booking knows whether it can use the wizard
// (a PATIENT books for themselves) or must arrange the appointment through the API (the wizard has no
// patient picker, and the real API requires staff to name a patient_id when booking on behalf).
let lastSeededRole: Role | null = null;

export async function seedSession(page: Page, role: Role): Promise<void> {
  lastSeededRole = role;
  if (COMPOSED) {
    const account = ACCOUNTS[role];
    const response = await page.request.post("/api/v1/auth/login", {
      data: { email: account.email, password: account.password },
    });
    if (!response.ok()) {
      throw new Error(
        `composed seedSession: login failed for ${role} (${String(response.status())})`,
      );
    }
    const body = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    const tokens = {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: Date.now() + body.expires_in * 1000,
    };
    await page.addInitScript((value: string) => {
      window.localStorage.setItem("aurora.auth", value);
    }, JSON.stringify(tokens));
    return;
  }

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

const PROBLEM = "application/problem+json";
const emptyPage = JSON.stringify({ data: [], page: { has_more: false, next_cursor: null } });

async function fulfillProblem(
  route: Route,
  status: number,
  title: string,
  detail: string,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: PROBLEM,
    body: JSON.stringify({ type: "about:blank", title, status, detail }),
  });
}

/**
 * Composed mode: serve `rows` as the appointments list (GET /api/v1/appointments only), paged by
 * the request's `limit` and `cursor` (an offset) like the MSW backend.
 */
async function routeAppointmentList(page: Page, rows: readonly unknown[]): Promise<void> {
  await page.route("**/api/v1/appointments**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "GET" && url.pathname === "/api/v1/appointments") {
      const limit = Number(url.searchParams.get("limit") ?? "50");
      const offset = Number(url.searchParams.get("cursor") ?? "0");
      const next = offset + limit;
      const hasMore = next < rows.length;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: rows.slice(offset, next),
          page: { has_more: hasMore, next_cursor: hasMore ? String(next) : null },
        }),
      });
    } else await route.fallback();
  });
}

/**
 * Composed mode: force a named error scenario at the network layer with page.route(), the real-stack
 * equivalent of the MSW `scenarios` map. Each route matches only its own endpoint and falls back for
 * everything else, so auth/me hydration and unrelated calls still hit the real API.
 */
async function routeScenario(page: Page, name: ScenarioName): Promise<void> {
  const pathOf = (route: Route): string => new URL(route.request().url()).pathname;
  switch (name) {
    case "bookingConflict":
      await page.route("**/api/v1/appointments", async (route) => {
        if (route.request().method() === "POST") {
          await fulfillProblem(route, 409, "Conflict", "That slot is no longer available.");
        } else await route.fallback();
      });
      break;
    case "appointmentsError":
      await page.route("**/api/v1/appointments**", async (route) => {
        if (route.request().method() === "GET" && pathOf(route) === "/api/v1/appointments") {
          await fulfillProblem(route, 500, "Internal Server Error", "Unexpected error.");
        } else await route.fallback();
      });
      break;
    case "appointmentsEmpty":
      await page.route("**/api/v1/appointments**", async (route) => {
        if (route.request().method() === "GET" && pathOf(route) === "/api/v1/appointments") {
          await route.fulfill({ status: 200, contentType: "application/json", body: emptyPage });
        } else await route.fallback();
      });
      break;
    case "appointmentsEveryStatus":
      await routeAppointmentList(page, EVERY_STATUS_APPOINTMENTS);
      break;
    case "appointmentsNoCancelled":
      await routeAppointmentList(page, NO_CANCELLED_APPOINTMENTS);
      break;
    case "appointmentsOnlyCancelled":
      await routeAppointmentList(page, ONLY_CANCELLED_APPOINTMENTS);
      break;
    case "appointmentsTwoClinics":
      await routeAppointmentList(page, TWO_CLINICS_APPOINTMENTS);
      break;
    case "appointmentsManyPages":
      await routeAppointmentList(page, MANY_PAGES_APPOINTMENTS);
      break;
    case "clinicsError":
      await page.route("**/api/v1/clinics**", async (route) => {
        if (route.request().method() === "GET") {
          await fulfillProblem(route, 500, "Internal Server Error", "Unexpected error.");
        } else await route.fallback();
      });
      break;
    case "devicesError":
      await page.route("**/api/v1/devices**", async (route) => {
        if (route.request().method() === "GET") {
          await fulfillProblem(route, 500, "Internal Server Error", "Unexpected error.");
        } else await route.fallback();
      });
      break;
    case "acknowledgeFails":
      await page.route("**/api/v1/excursions/**", async (route) => {
        if (route.request().method() === "POST" && /:acknowledge$/.test(pathOf(route))) {
          await fulfillProblem(route, 500, "Internal Server Error", "Could not acknowledge.");
        } else await route.fallback();
      });
      break;
  }
}

/**
 * Force a named error scenario for the rest of the test, on the current page. Use for mid-journey
 * injection (inject, then act, without navigating).
 */
export async function useScenario(page: Page, name: ScenarioName): Promise<void> {
  if (COMPOSED) {
    await routeScenario(page, name);
    return;
  }
  await waitForMockBackend(page);
  await page.evaluate((scenario) => {
    (globalThis as unknown as { __aurora_e2e?: E2eControls }).__aurora_e2e?.useScenario(scenario);
  }, name);
}

/**
 * Arrange a named error scenario to apply from the next page load. Use for initial-load error states
 * (a failing list, an empty backend), which a full navigation would otherwise reset.
 */
export async function bootScenario(page: Page, name: ScenarioName): Promise<void> {
  if (COMPOSED) {
    // A page.route registered now survives navigations, so it covers the initial load too.
    await routeScenario(page, name);
    return;
  }
  await page.addInitScript((scenario: string) => {
    const store = (globalThis as { __aurora_e2e_boot?: string[] }).__aurora_e2e_boot ?? [];
    store.push(scenario);
    (globalThis as { __aurora_e2e_boot?: string[] }).__aurora_e2e_boot = store;
  }, name);
}

/** Sign in through the real login form and wait for the dashboard. Used by the login journey. */
export async function loginViaForm(page: Page, role: Role): Promise<void> {
  const account = ACCOUNTS[role];
  const login = new LoginPage(page);
  await login.goto();
  await login.signIn(account.email, account.password);
  await new DashboardPage(page).expectLoaded();
}

// Mock mode: a fixed Monday. The MSW availability ignores "now", so a past date is fine and keeps
// the run deterministic. The seeded clinician works Mon–Fri.
export const BOOKABLE_DAY = "2026-01-05";

/**
 * The day the booking wizard books. In composed mode the real availability service filters slots to
 * the future, so a fixed past date would return nothing — pick the next Monday strictly ahead (the
 * seeded clinician is open every day, so any future weekday has slots; Monday keeps it predictable).
 */
export function bookableDay(): string {
  if (!COMPOSED) return BOOKABLE_DAY;
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const add = (8 - d.getUTCDay()) % 7 || 7; // 1..7 days to the next Monday (never today)
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

/**
 * Walk the booking wizard from the start up to (but not clicking) the final Confirm step: clinic →
 * service → clinician → day/slot. Assumes an authenticated session is already seeded.
 */
export async function walkBookingToConfirm(page: Page): Promise<void> {
  const wizard = new BookingWizardPage(page);
  await wizard.goto();
  await wizard.walkToConfirm({ day: bookableDay() });
}

/**
 * Arrange an appointment through the real API and return its detail path. Composed mode only, and
 * used when the active session is staff: the booking wizard has no patient picker, and the real API
 * refuses a staff booking without a patient_id, so staff cannot self-book through the UI. We create
 * the appointment as the patient (their own booking) via the API; a staff user can then read and
 * transition it, which is what the manage journey actually exercises.
 */
async function arrangeAppointmentViaApi(page: Page): Promise<string> {
  const patient = ACCOUNTS.PATIENT;
  const loginRes = await page.request.post("/api/v1/auth/login", {
    data: { email: patient.email, password: patient.password },
  });
  if (!loginRes.ok())
    throw new Error(`arrange: patient login failed (${String(loginRes.status())})`);
  const token = ((await loginRes.json()) as { access_token: string }).access_token;
  const auth = { Authorization: `Bearer ${token}` };

  const getJson = async <T>(path: string): Promise<T> => {
    const res = await page.request.get(path, { headers: auth });
    if (!res.ok()) throw new Error(`arrange: GET ${path} failed (${String(res.status())})`);
    return (await res.json()) as T;
  };

  interface Page_<T> {
    data: T[];
  }
  const clinics = await getJson<Page_<{ id: string; name: string }>>("/api/v1/clinics?limit=100");
  const clinic = clinics.data.find((c) => c.name === "Aurora Downtown");
  if (!clinic)
    throw new Error("arrange: 'Aurora Downtown' clinic not found (run scripts/seed-e2e.mjs)");
  const clinicians = await getJson<Page_<{ id: string; specialty: string }>>(
    `/api/v1/clinicians?clinic_id=${clinic.id}&limit=100`,
  );
  const clinician =
    clinicians.data.find((c) => c.specialty === "General practice") ?? clinicians.data[0];
  const services = await getJson<Page_<{ id: string }>>(
    `/api/v1/services?clinic_id=${clinic.id}&limit=100`,
  );
  const service = services.data[0];
  const slots = await getJson<{ start: string }[]>(
    `/api/v1/availability?clinician_id=${clinician.id}&service_id=${service.id}&day=${bookableDay()}`,
  );
  if (slots.length === 0) throw new Error("arrange: no availability for the seeded clinician");

  const createRes = await page.request.post("/api/v1/appointments", {
    headers: auth,
    data: {
      clinic_id: clinic.id,
      clinician_id: clinician.id,
      service_id: service.id,
      starts_at: slots[0].start,
    },
  });
  if (!createRes.ok()) {
    throw new Error(
      `arrange: create failed (${String(createRes.status())}): ${await createRes.text()}`,
    );
  }
  const created = (await createRes.json()) as { id: string };
  return `/appointments/${created.id}`;
}

/**
 * Complete the booking wizard and return the created appointment's detail URL path. Steps:
 * clinic → service → clinician → day/slot → confirm.
 */
export async function bookAppointment(page: Page): Promise<string> {
  if (COMPOSED && lastSeededRole !== null && lastSeededRole !== "PATIENT") {
    const path = await arrangeAppointmentViaApi(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Appointment" })).toBeVisible();
    return path;
  }

  await walkBookingToConfirm(page);
  await new BookingWizardPage(page).confirm();

  const appointment = new AppointmentPage(page);
  await appointment.expectLoaded();
  return appointment.path();
}
