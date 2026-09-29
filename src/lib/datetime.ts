/**
 * Timezone-aware date/time formatting. Clinics live in their own timezone (spec §2), so every
 * appointment or slot must be shown in the clinic's zone, not the browser's. Helpers take an
 * optional IANA `timeZone`; omit it to use the runtime zone. All parsing is from ISO 8601 strings
 * the API returns.
 */

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Monday-indexed weekday name (0 = Monday), matching the API's WorkingWindow.weekday. */
export function weekdayName(weekday: number): string {
  return WEEKDAYS[weekday] ?? "—";
}

function opts(
  timeZone: string | undefined,
  base: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  return timeZone !== undefined ? { ...base, timeZone } : base;
}

export function formatTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(
    undefined,
    opts(timeZone, { hour: "2-digit", minute: "2-digit" }),
  ).format(new Date(iso));
}

export function formatDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(
    undefined,
    opts(timeZone, { year: "numeric", month: "short", day: "numeric" }),
  ).format(new Date(iso));
}

export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(
    undefined,
    opts(timeZone, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  ).format(new Date(iso));
}

/** Weekday + day label for a calendar column header, e.g. "Mon 3". */
export function formatColumnLabel(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(
    undefined,
    opts(timeZone, { weekday: "short", day: "numeric" }),
  ).format(new Date(iso));
}

/** A local YYYY-MM-DD string for `date` (used as the availability `day` query param). */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Midnight-anchored Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = (result.getDay() + 6) % 7; // 0 = Monday
  result.setDate(result.getDate() - day);
  return result;
}

/** The seven dates Mon…Sun for the week containing `date`. */
export function weekDays(date: Date): Date[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return d;
  });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Compact "time ago" for last-seen tiles. Falls back to a date for anything over a week. */
export function formatRelative(iso: string | null, now: Date = new Date()): string {
  if (iso === null) return "never";
  const then = new Date(iso).getTime();
  const seconds = Math.round((now.getTime() - then) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return `${String(seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${String(days)}d ago`;
  return formatDate(iso);
}
