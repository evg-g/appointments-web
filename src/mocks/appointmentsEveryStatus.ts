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
const CLINICIAN = "d1111111-1111-4111-8111-000000000001"; // CLINICIAN_1
const SERVICE = "e1111111-1111-4111-8111-000000000001"; // SERVICE_30
const PATIENT = "11111111-1111-4111-8111-111111111111"; // patient@aurora.test

function row(
  n: number,
  startsAt: string,
  status: AppointmentOut["status"],
  reason: string | null = null,
): AppointmentOut {
  const start = new Date(startsAt);
  return {
    id: `88888888-8888-4888-8888-${String(n).padStart(12, "0")}`,
    clinic_id: CLINIC,
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
