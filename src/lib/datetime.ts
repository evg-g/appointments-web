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

/** Short zone name for `timeZone` at the instant `iso`, e.g. "PDT" or "GMT+3". */
export function formatTimeZoneLabel(
  timeZone: string,
  iso: string = new Date().toISOString(),
): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(new Date(iso))
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/**
 * " PDT"-style suffix for a time shown in `timeZone`, or "" when the zone is not known yet. Appended
 * to clinic times so a time that reads as past for a viewer elsewhere is clearly the clinic's clock.
 */
export function zoneSuffix(timeZone: string | undefined, iso: string): string {
  return timeZone !== undefined ? ` ${formatTimeZoneLabel(timeZone, iso)}` : "";
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (positive east of UTC). */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wallAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallAsUtc - (instant.getTime() - instant.getMilliseconds());
}

/**
 * The instant at which the wall clock in `timeZone` reads `day` (YYYY-MM-DD) `time` (HH:MM[:SS]).
 * Independent of the runtime's own zone. Across a DST change the offset is re-checked at the
 * result, so a time on either side of the change resolves correctly.
 */
export function zonedWallTimeToUtc(day: string, time: string, timeZone: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1, hour, minute, second);
  const guess = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  return new Date(wallAsUtc - zoneOffsetMs(new Date(guess), timeZone));
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

/** Calendar day `YYYY-MM-DD` of the instant `iso` on the wall clock in `timeZone` (runtime zone when omitted). */
export function dayKey(iso: string | number | Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    opts(timeZone, { year: "numeric", month: "2-digit", day: "2-digit" }),
  ).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The `YYYY-MM-DD` key one calendar day after `key`. */
function nextDayKey(key: string): string {
  const [year = 1970, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/**
 * Day group heading for the instant `iso` in `timeZone`: "Today · Tue, Oct 6", "Tomorrow · Wed,
 * Oct 7" or "Thu, Oct 8", with the year added when it is not the current year. Today and Tomorrow
 * are judged on the wall clock in `timeZone`, not the viewer's. Always en-US so it reads the same
 * everywhere.
 */
export function formatDayHeading(
  iso: string,
  timeZone: string | undefined,
  now: number | Date,
): string {
  const key = dayKey(iso, timeZone);
  const todayKey = dayKey(now, timeZone);
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4);
  const date = new Intl.DateTimeFormat(
    "en-US",
    opts(timeZone, {
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    }),
  ).format(new Date(iso));
  if (key === todayKey) return `Today · ${date}`;
  if (key === nextDayKey(todayKey)) return `Tomorrow · ${date}`;
  return date;
}
