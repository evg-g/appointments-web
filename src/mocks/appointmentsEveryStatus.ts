import type { components } from "../api/schema";

type AppointmentOut = components["schemas"]["AppointmentOut"];

/**
 * A fixed list of appointments in every status around a fixed "now", for the E2E specs of the
 * appointment tabs (AURORA-8). Served by the `appointmentsEveryStatus` scenario; the specs fix the
 * browser clock to `EVERY_STATUS_NOW` so each row lands in the same tab on every run. Kept free of
 * path aliases and runtime imports so the Playwright suite can import it too (composed mode).
 */
export const EVERY_STATUS_NOW = "2026-01-04T18:00:00Z";

const CLINIC = "c1111111-1111-4111-8111-000000000001"; // Aurora Downtown (CLINIC_A)
const RIVERSIDE = "c2222222-2222-4222-8222-000000000002"; // Aurora Riverside (CLINIC_B)
const CLINICIAN = "d1111111-1111-4111-8111-000000000001"; // CLINICIAN_1
const SERVICE = "e1111111-1111-4111-8111-000000000001"; // SERVICE_30
const PATIENT = "11111111-1111-4111-8111-111111111111"; // patient@aurora.test

function row(
  n: number,
  startsAt: string,
  status: AppointmentOut["status"],
  reason: string | null = null,
  clinicId: string = CLINIC,
): AppointmentOut {
  const start = new Date(startsAt);
  return {
    id: `88888888-8888-4888-8888-${String(n).padStart(12, "0")}`,
    clinic_id: clinicId,
    clinician_id: CLINICIAN,
    service_id: SERVICE,
    patient_id: PATIENT,
    status,
    cancellation_reason: reason,
    version: 1,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + 30 * 60_000).toISOString(),
  };
}

export const EVERY_STATUS_APPOINTMENTS: AppointmentOut[] = [
  row(1, "2026-01-06T17:00:00Z", "CONFIRMED"), // Upcoming
  row(2, "2026-01-07T18:00:00Z", "REQUESTED"), // Upcoming + Needs action (to confirm)
  row(3, "2026-01-03T17:00:00Z", "CONFIRMED"), // Past + Needs action (to complete)
  row(4, "2026-01-02T17:00:00Z", "COMPLETED"), // Past
  row(5, "2025-12-30T17:00:00Z", "NO_SHOW"), // Past
  row(6, "2026-01-08T17:00:00Z", "CANCELLED", "Rescheduled by the patient"), // Cancelled
];

/**
 * "Now" for the two lists below: Friday 2026-10-09 at 10:00 in Los Angeles (PDT). The clinic is on
 * PDT until 2026-11-01 and on PST after it, so these lists have rows on both.
 */
export const OCTOBER_NOW = "2026-10-09T17:00:00Z";

/**
 * Rows in Upcoming, Needs action and Past, but none cancelled (an empty Cancelled tab), on PDT and
 * PST dates. Served by the `appointmentsNoCancelled` scenario; fix the clock to `OCTOBER_NOW`.
 */
export const NO_CANCELLED_APPOINTMENTS: AppointmentOut[] = [
  row(11, "2026-10-12T17:00:00Z", "CONFIRMED"), // Upcoming: Mon, Oct 12, 10:00 AM PDT
  row(12, "2026-11-03T17:30:00Z", "REQUESTED"), // Upcoming + Needs action: Tue, Nov 3, 09:30 AM PST
  row(13, "2026-10-08T16:00:00Z", "CONFIRMED"), // Past + Needs action: Thu, Oct 8, 09:00 AM PDT
  row(14, "2026-10-07T17:00:00Z", "COMPLETED"), // Past: Wed, Oct 7, 10:00 AM PDT
  row(15, "2026-01-15T18:00:00Z", "NO_SHOW"), // Past: Thu, Jan 15, 10:00 AM PST
];

/**
 * Only cancelled rows: Upcoming, Needs action and Past are empty while Cancelled is not. Served by
 * the `appointmentsOnlyCancelled` scenario; fix the clock to `OCTOBER_NOW`.
 */
export const ONLY_CANCELLED_APPOINTMENTS: AppointmentOut[] = [
  row(21, "2026-10-13T17:00:00Z", "CANCELLED", "Patient is travelling"),
  row(22, "2026-01-20T18:00:00Z", "CANCELLED", "Clinic closed"),
];

/**
 * Rows at both seeded clinics in every tab, around `OCTOBER_NOW`, for the clinic filter. Served by
 * the `appointmentsTwoClinics` scenario. Staff counts (Upcoming, Needs action, Past, Cancelled):
 * all clinics 3/2/3/3, Aurora Downtown 1/0/1/1, Aurora Riverside 2/2/2/2.
 */
export const TWO_CLINICS_APPOINTMENTS: AppointmentOut[] = [
  row(31, "2026-10-12T17:00:00Z", "CONFIRMED"), // Downtown: Upcoming
  row(32, "2026-10-07T17:00:00Z", "COMPLETED"), // Downtown: Past
  row(33, "2026-10-14T17:00:00Z", "CANCELLED", "Patient is travelling"), // Downtown: Cancelled
  row(34, "2026-10-13T16:00:00Z", "REQUESTED", null, RIVERSIDE), // Upcoming + Needs action
  row(35, "2026-10-15T18:00:00Z", "CONFIRMED", null, RIVERSIDE), // Upcoming
  row(36, "2026-10-06T16:00:00Z", "NO_SHOW", null, RIVERSIDE), // Past
  row(37, "2026-10-08T18:00:00Z", "CONFIRMED", null, RIVERSIDE), // Past + Needs action
  row(38, "2026-10-16T16:00:00Z", "CANCELLED", "Clinic closed", RIVERSIDE), // Cancelled
  row(39, "2026-10-02T16:00:00Z", "CANCELLED", "Rescheduled", RIVERSIDE), // Cancelled
];

/** The status of a started row of `MANY_PAGES_APPOINTMENTS`, by its index modulo 4. */
const STARTED_CYCLE: Record<number, AppointmentOut["status"]> = {
  0: "COMPLETED",
  1: "NO_SHOW",
  2: "CANCELLED",
  3: "CONFIRMED",
};

/**
 * 150 rows at Aurora Downtown, more than one page of 100, around `OCTOBER_NOW`, for Load more.
 * Served newest first and paged by `limit`/`cursor` by the `appointmentsManyPages` scenario. Row
 * `i` (0-149) starts on 2026-10-20 at 18:00 UTC (11:00 AM PDT) minus `i` days. Rows 0-11 have not
 * started: CONFIRMED when `i` is even, REQUESTED when odd. Rows 12-149 have started and cycle on
 * `i % 4`: COMPLETED, NO_SHOW, CANCELLED, CONFIRMED. Staff counts (Upcoming, Needs action, Past,
 * Cancelled): first page 12/28/66/22, all rows 12/40/104/34.
 */
export const MANY_PAGES_APPOINTMENTS: AppointmentOut[] = Array.from({ length: 150 }, (_, i) => {
  const startsAt = new Date(Date.UTC(2026, 9, 20 - i, 18)).toISOString();
  const status: AppointmentOut["status"] =
    i < 12 ? (i % 2 === 0 ? "CONFIRMED" : "REQUESTED") : (STARTED_CYCLE[i % 4] ?? "COMPLETED");
  return row(100 + i, startsAt, status, status === "CANCELLED" ? "Rescheduled" : null);
});
