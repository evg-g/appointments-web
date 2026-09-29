import type { AppointmentOut } from "@/api/types";

/**
 * The appointments to show as "upcoming": not yet started, not cancelled, soonest first.
 *
 * The list endpoint returns newest-first (the order the Appointments page wants), so the dashboard
 * must re-sort; it used to keep the API order and showed the latest booking at the top.
 */
export function upcomingAppointments(
  appointments: readonly AppointmentOut[],
  now: number,
  max: number,
): AppointmentOut[] {
  return appointments
    .filter((a) => a.status !== "CANCELLED" && new Date(a.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, max);
}
