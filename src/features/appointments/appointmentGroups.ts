import type { AppointmentOut, UserRole } from "@/api/types";

import { isTerminal } from "./status";

/** The appointment list tabs. Each row lands in exactly one of upcoming / past / cancelled. */
export interface AppointmentGroups {
  /** REQUESTED or CONFIRMED, not started yet; soonest first. */
  upcoming: AppointmentOut[];
  /**
   * Staff only (empty for patients): REQUESTED not started (to confirm) and CONFIRMED already
   * started (to mark Completed / No-show); soonest first. Overlaps with upcoming and past.
   */
  needsAction: AppointmentOut[];
  /** COMPLETED, NO_SHOW, and REQUESTED / CONFIRMED that already started; newest first. */
  past: AppointmentOut[];
  /** CANCELLED; newest first. */
  cancelled: AppointmentOut[];
}

function startOf(a: AppointmentOut): number {
  return new Date(a.starts_at).getTime();
}

const soonestFirst = (a: AppointmentOut, b: AppointmentOut): number => startOf(a) - startOf(b);
const newestFirst = (a: AppointmentOut, b: AppointmentOut): number => startOf(b) - startOf(a);

/**
 * Split appointments into the list tabs. An appointment has started when its start is at or
 * before `now` (start == now counts as started).
 */
export function partitionAppointments(
  rows: readonly AppointmentOut[],
  now: number,
  role: UserRole,
): AppointmentGroups {
  const isStaff = role !== "PATIENT";
  const groups: AppointmentGroups = { upcoming: [], needsAction: [], past: [], cancelled: [] };

  for (const a of rows) {
    const started = startOf(a) <= now;
    if (a.status === "CANCELLED") {
      groups.cancelled.push(a);
    } else if (isTerminal(a.status) || started) {
      groups.past.push(a);
    } else {
      groups.upcoming.push(a);
    }

    const needsAction =
      (a.status === "REQUESTED" && !started) || (a.status === "CONFIRMED" && started);
    if (isStaff && needsAction) groups.needsAction.push(a);
  }

  groups.upcoming.sort(soonestFirst);
  groups.needsAction.sort(soonestFirst);
  groups.past.sort(newestFirst);
  groups.cancelled.sort(newestFirst);
  return groups;
}
