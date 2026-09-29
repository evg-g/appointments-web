import { describe, expect, it } from "vitest";

import {
  addDays,
  formatRelative,
  formatTime,
  startOfWeek,
  toIsoDate,
  weekDays,
  weekdayName,
} from "./datetime";

describe("datetime helpers", () => {
  it("weekdayName is Monday-indexed", () => {
    expect(weekdayName(0)).toBe("Monday");
    expect(weekdayName(6)).toBe("Sunday");
    expect(weekdayName(99)).toBe("—");
  });

  it("toIsoDate formats a local date as YYYY-MM-DD", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("startOfWeek returns the Monday of the week", () => {
    // 2026-01-07 is a Wednesday; its week starts Monday 2026-01-05.
    const monday = startOfWeek(new Date(2026, 0, 7));
    expect(toIsoDate(monday)).toBe("2026-01-05");
    expect(monday.getHours()).toBe(0);
  });

  it("weekDays returns seven consecutive days starting Monday", () => {
    const days = weekDays(new Date(2026, 0, 7));
    expect(days).toHaveLength(7);
    expect(toIsoDate(days[0]!)).toBe("2026-01-05");
    expect(toIsoDate(days[6]!)).toBe("2026-01-11");
  });

  it("addDays shifts by whole days", () => {
    expect(toIsoDate(addDays(new Date(2026, 0, 5), 7))).toBe("2026-01-12");
    expect(toIsoDate(addDays(new Date(2026, 0, 5), -1))).toBe("2026-01-04");
  });

  it("formatRelative gives compact ages and 'never' for null", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(formatRelative(null, now)).toBe("never");
    expect(formatRelative("2026-01-01T11:59:30Z", now)).toBe("30s ago");
    expect(formatRelative("2026-01-01T11:30:00Z", now)).toBe("30m ago");
    expect(formatRelative("2026-01-01T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelative("2025-12-30T12:00:00Z", now)).toBe("2d ago");
  });

  it("formatTime honours an explicit timezone", () => {
    // 17:30 UTC is 09:30 in Los Angeles.
    expect(formatTime("2026-01-01T17:30:00Z", "America/Los_Angeles")).toMatch(/09:30/);
  });
});
