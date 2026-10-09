import type { AppointmentOut, UserRole } from "@/api/types";

import { dayKey, formatDayHeading } from "@/lib/datetime";

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

/** One day heading inside a tab and the rows on that day. */
export interface DayGroup {
  /** Calendar day `YYYY-MM-DD` in the appointment's clinic time zone. */
  key: string;
  /** Heading, e.g. "Today · Tue, Oct 6", "Thu, Oct 8" or "Tue, Jan 5, 2027". */
  label: string;
  rows: AppointmentOut[];
}

/**
 * Group rows by calendar day in each appointment's clinic time zone (`timeZoneOf`; the runtime
 * zone when it returns undefined, e.g. while the clinic is still loading). Groups keep the order
 * in which their first row appears, and rows keep their input order, so a sorted tab stays sorted.
 */
export function groupByDay(
  rows: readonly AppointmentOut[],
  timeZoneOf: (a: AppointmentOut) => string | undefined,
  now: number,
): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const a of rows) {
    const timeZone = timeZoneOf(a);
    const key = dayKey(a.starts_at, timeZone);
    const group = groups.get(key);
    if (group !== undefined) {
      group.rows.push(a);
    } else {
      groups.set(key, { key, label: formatDayHeading(a.starts_at, timeZone, now), rows: [a] });
    }
  }
  return [...groups.values()];
}
