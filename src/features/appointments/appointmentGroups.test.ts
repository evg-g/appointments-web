import { describe, expect, it } from "vitest";

import type { AppointmentOut, AppointmentStatus } from "@/api/types";

import { groupByDay, partitionAppointments } from "./appointmentGroups";

const NOW = Date.parse("2026-03-16T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const ALL_STATUSES: readonly AppointmentStatus[] = [
  "REQUESTED",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

/** Start offsets relative to NOW: before, equal to (counts as started), after. */
const OFFSETS = { before: -HOUR, equal: 0, after: HOUR } as const;
type When = keyof typeof OFFSETS;

function appt(id: string, startMs: number, status: AppointmentStatus) {
  const startsAt = new Date(startMs).toISOString();
  return {
    id,
    starts_at: startsAt,
    ends_at: startsAt,
    status,
    clinic_id: "c",
    clinician_id: "d",
    service_id: "s",
    patient_id: "p",
    cancellation_reason: null,
    version: 1,
  } satisfies AppointmentOut;
}

/** One appointment per status x (before, equal, after) now, id = "<STATUS>:<when>". */
function matrix(): AppointmentOut[] {
  return ALL_STATUSES.flatMap((status) =>
    (Object.keys(OFFSETS) as When[]).map((when) =>
      appt(`${status}:${when}`, NOW + OFFSETS[when], status),
    ),
  );
}

function ids(rows: readonly AppointmentOut[]): string[] {
  return rows.map((a) => a.id);
}

describe("partitionAppointments", () => {
  it("AC1.logic @agent-trusted upcoming holds not-started REQUESTED and CONFIRMED, soonest first", () => {
    // Example 1: CONFIRMED tomorrow + REQUESTED in an hour -> both, REQUESTED first.
    const ex1 = partitionAppointments(
      [
        appt("confirmed-tomorrow", NOW + DAY, "CONFIRMED"),
        appt("requested-1h", NOW + HOUR, "REQUESTED"),
      ],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex1.upcoming)).toEqual(["requested-1h", "confirmed-tomorrow"]);

    // Example 2: CONFIRMED that started an hour ago -> not in Upcoming.
    const ex2 = partitionAppointments(
      [appt("confirmed-ago", NOW - HOUR, "CONFIRMED")],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex2.upcoming)).toEqual([]);

    // Example 3: COMPLETED or CANCELLED tomorrow -> not in Upcoming.
    const ex3 = partitionAppointments(
      [
        appt("completed-tomorrow", NOW + DAY, "COMPLETED"),
        appt("cancelled-tomorrow", NOW + DAY, "CANCELLED"),
      ],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex3.upcoming)).toEqual([]);

    // Enum boundary: every status x before / equal / after now; same for patient and staff.
    for (const role of ["PATIENT", "CLINICIAN"] as const) {
      const { upcoming } = partitionAppointments(matrix(), NOW, role);
      expect(new Set(ids(upcoming))).toEqual(new Set(["REQUESTED:after", "CONFIRMED:after"]));
    }
  });

  it("AC2.logic @agent-trusted needs action holds not-started REQUESTED and started CONFIRMED, soonest first", () => {
    // Example 1: REQUESTED tomorrow -> in Needs action.
    const ex1 = partitionAppointments(
      [appt("requested-tomorrow", NOW + DAY, "REQUESTED")],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex1.needsAction)).toEqual(["requested-tomorrow"]);

    // Example 2: CONFIRMED that started an hour ago -> in Needs action.
    const ex2 = partitionAppointments(
      [appt("confirmed-ago", NOW - HOUR, "CONFIRMED")],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex2.needsAction)).toEqual(["confirmed-ago"]);

    // Example 3: CONFIRMED tomorrow, REQUESTED already started, COMPLETED -> none.
    const ex3 = partitionAppointments(
      [
        appt("confirmed-tomorrow", NOW + DAY, "CONFIRMED"),
        appt("requested-started", NOW - HOUR, "REQUESTED"),
        appt("completed", NOW - HOUR, "COMPLETED"),
      ],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex3.needsAction)).toEqual([]);

    // Soonest first across both kinds.
    const order = partitionAppointments(
      [
        appt("requested-2d", NOW + 2 * DAY, "REQUESTED"),
        appt("confirmed-2h-ago", NOW - 2 * HOUR, "CONFIRMED"),
        appt("requested-1h", NOW + HOUR, "REQUESTED"),
        appt("confirmed-1d-ago", NOW - DAY, "CONFIRMED"),
      ],
      NOW,
      "CLINICIAN",
    );
    expect(ids(order.needsAction)).toEqual([
      "confirmed-1d-ago",
      "confirmed-2h-ago",
      "requested-1h",
      "requested-2d",
    ]);

    // Enum boundary: every status x before / equal / after now (start == now counts as started).
    const { needsAction } = partitionAppointments(matrix(), NOW, "CLINICIAN");
    expect(new Set(ids(needsAction))).toEqual(
      new Set(["REQUESTED:after", "CONFIRMED:before", "CONFIRMED:equal"]),
    );
  });

  it("AC3.logic @agent-trusted past holds COMPLETED, NO_SHOW and started REQUESTED or CONFIRMED, newest first", () => {
    // Example 1: COMPLETED last week + NO_SHOW yesterday -> both, NO_SHOW first.
    const ex1 = partitionAppointments(
      [
        appt("completed-last-week", NOW - 7 * DAY, "COMPLETED"),
        appt("no-show-yesterday", NOW - DAY, "NO_SHOW"),
      ],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex1.past)).toEqual(["no-show-yesterday", "completed-last-week"]);

    // Example 2: REQUESTED that started yesterday -> in Past.
    const ex2 = partitionAppointments(
      [appt("requested-yesterday", NOW - DAY, "REQUESTED")],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex2.past)).toEqual(["requested-yesterday"]);

    // Example 3: CANCELLED yesterday -> not in Past.
    const ex3 = partitionAppointments(
      [appt("cancelled-yesterday", NOW - DAY, "CANCELLED")],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex3.past)).toEqual([]);

    // Enum boundary: every status x before / equal / after now; same for patient and staff.
    for (const role of ["PATIENT", "CLINICIAN"] as const) {
      const { past } = partitionAppointments(matrix(), NOW, role);
      expect(new Set(ids(past))).toEqual(
        new Set([
          "COMPLETED:before",
          "COMPLETED:equal",
          "COMPLETED:after",
          "NO_SHOW:before",
          "NO_SHOW:equal",
          "NO_SHOW:after",
          "REQUESTED:before",
          "REQUESTED:equal",
          "CONFIRMED:before",
          "CONFIRMED:equal",
        ]),
      );
    }
  });
});

describe("cancelled group", () => {
  it("AC4.logic @agent-trusted cancelled holds every CANCELLED appointment, past or future, newest first", () => {
    // Example 1: CANCELLED next week + CANCELLED last week -> both, next week's first.
    const ex1 = partitionAppointments(
      [
        appt("cancelled-last-week", NOW - 7 * DAY, "CANCELLED"),
        appt("cancelled-next-week", NOW + 7 * DAY, "CANCELLED"),
      ],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex1.cancelled)).toEqual(["cancelled-next-week", "cancelled-last-week"]);

    // Example 2: CONFIRMED tomorrow -> not in Cancelled.
    const ex2 = partitionAppointments(
      [appt("confirmed-tomorrow", NOW + DAY, "CONFIRMED")],
      NOW,
      "CLINICIAN",
    );
    expect(ids(ex2.cancelled)).toEqual([]);

    // Enum boundary: CANCELLED before / equal / after now is in; every other status is out.
    for (const role of ["PATIENT", "CLINICIAN"] as const) {
      const { cancelled } = partitionAppointments(matrix(), NOW, role);
      expect(ids(cancelled)).toEqual(["CANCELLED:after", "CANCELLED:equal", "CANCELLED:before"]);
    }
  });
});

describe("groupByDay", () => {
  const LA = "America/Los_Angeles";
  const JERUSALEM = "Asia/Jerusalem";

  it("AC9.logic @agent-trusted groups by day in the clinic time zone with Today, Tomorrow and dated headings", () => {
    // Now is 2026-10-06 10:00 in Los Angeles (PDT, UTC-7).
    const now = Date.parse("2026-10-06T17:00:00Z");
    const zoneOf = new Map<string, string>([
      ["la-today-14", LA],
      ["la-tomorrow-09", LA],
      ["la-today-2330", LA],
      ["la-thu", LA],
      ["la-2027", LA],
      ["il-same-instant", JERUSALEM],
    ]);
    const rows = [
      // 2026-10-06 14:00 LA
      appt("la-today-14", Date.parse("2026-10-06T21:00:00Z"), "CONFIRMED"),
      // 2026-10-06 23:30 LA == 2026-10-07 06:30 UTC == 09:30 Israel
      appt("la-today-2330", Date.parse("2026-10-07T06:30:00Z"), "CONFIRMED"),
      // Same instant, but the clinic is in Israel -> its day is Oct 7 there.
      appt("il-same-instant", Date.parse("2026-10-07T06:30:00Z"), "CONFIRMED"),
      // 2026-10-07 09:00 LA
      appt("la-tomorrow-09", Date.parse("2026-10-07T16:00:00Z"), "CONFIRMED"),
      // 2026-10-08 12:00 LA
      appt("la-thu", Date.parse("2026-10-08T19:00:00Z"), "CONFIRMED"),
      // 2027-01-05 10:00 LA (PST, UTC-8)
      appt("la-2027", Date.parse("2027-01-05T18:00:00Z"), "CONFIRMED"),
    ];

    const groups = groupByDay(rows, (a) => zoneOf.get(a.id), now);

    expect(groups.map((g) => ({ label: g.label, ids: ids(g.rows) }))).toEqual([
      { label: "Today · Tue, Oct 6", ids: ["la-today-14", "la-today-2330"] },
      { label: "Tomorrow · Wed, Oct 7", ids: ["il-same-instant", "la-tomorrow-09"] },
      { label: "Thu, Oct 8", ids: ["la-thu"] },
      { label: "Tue, Jan 5, 2027", ids: ["la-2027"] },
    ]);
    // Day keys are the clinic-zone calendar date.
    expect(groups.map((g) => g.key)).toEqual([
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2027-01-05",
    ]);
  });
});
