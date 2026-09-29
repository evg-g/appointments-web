import { describe, expect, it } from "vitest";

import type { AppointmentOut } from "@/api/types";

import { upcomingAppointments } from "./upcoming";

const NOW = Date.parse("2026-03-16T12:00:00Z");

function appt(id: string, startsAt: string, status: AppointmentOut["status"] = "CONFIRMED") {
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

describe("upcomingAppointments", () => {
  it("orders soonest first, even when the API returns newest first", () => {
    const newestFirst = [
      appt("late", "2026-03-20T09:00:00Z"),
      appt("mid", "2026-03-18T09:00:00Z"),
      appt("soon", "2026-03-17T09:00:00Z"),
    ];
    expect(upcomingAppointments(newestFirst, NOW, 5).map((a) => a.id)).toEqual([
      "soon",
      "mid",
      "late",
    ]);
  });

  it("drops past and cancelled appointments", () => {
    const rows = [
      appt("past", "2026-03-15T09:00:00Z"),
      appt("cancelled", "2026-03-17T09:00:00Z", "CANCELLED"),
      appt("requested", "2026-03-18T09:00:00Z", "REQUESTED"),
    ];
    expect(upcomingAppointments(rows, NOW, 5).map((a) => a.id)).toEqual(["requested"]);
  });

  it("keeps an appointment that starts exactly now, and caps the list", () => {
    const rows = [appt("now", "2026-03-16T12:00:00Z"), appt("next", "2026-03-17T09:00:00Z")];
    expect(upcomingAppointments(rows, NOW, 1).map((a) => a.id)).toEqual(["now"]);
  });
});
