import { afterEach, describe, expect, it, vi } from "vitest";

import { CLINICIAN_1, computeAvailability, resetDb, SERVICE_30, seedDemoData } from "./db";

// Monday 2026-10-05 at 10:00 in Los Angeles (PDT, UTC-7), where the seeded clinics are.
const NOW = new Date("2026-10-05T17:00:00Z");

describe("mock availability", () => {
  afterEach(() => {
    vi.useRealTimers();
    resetDb();
  });

  it("builds the working hours in the clinic's time zone", () => {
    resetDb();
    const slots = computeAvailability(CLINICIAN_1, SERVICE_30, "2026-10-05");
    // 09:00 PDT, whatever the runtime's own zone is.
    expect(slots[0]?.start).toBe("2026-10-05T16:00:00.000Z");
  });

  it("offers past slots in the test seed, so a fixed test date keeps working", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    resetDb();
    const slots = computeAvailability(CLINICIAN_1, SERVICE_30, "2026-10-05");
    expect(slots[0]?.start).toBe("2026-10-05T16:00:00.000Z");
  });

  it("leaves out slots that already started in the demo dataset, like the real API", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    resetDb();
    seedDemoData();
    const slots = computeAvailability(CLINICIAN_1, SERVICE_30, "2026-10-05");
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots)
      expect(new Date(slot.start).getTime()).toBeGreaterThanOrEqual(NOW.getTime());
  });
});
