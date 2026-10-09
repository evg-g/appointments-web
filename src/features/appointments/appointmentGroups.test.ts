import { describe, expect, it } from "vitest";

import type { AppointmentOut, AppointmentStatus } from "@/api/types";

import { partitionAppointments } from "./appointmentGroups";

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
