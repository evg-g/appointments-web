import { describe, expect, it } from "vitest";

import { formatBattery, formatDuration, formatMoney, formatTemperature } from "./units";

describe("unit formatters", () => {
  it("formatTemperature is one decimal with a unit, dash for null", () => {
    expect(formatTemperature(4.234)).toBe("4.2 °C");
    expect(formatTemperature(null)).toBe("—");
  });

  it("formatBattery rounds to a percentage", () => {
    expect(formatBattery(86.7)).toBe("87%");
    expect(formatBattery(null)).toBe("—");
  });

  it("formatMoney renders minor units as currency", () => {
    expect(formatMoney(4500, "USD")).toMatch(/45\.00/);
    // An invalid currency code (not 3 letters) throws in Intl and falls back to a plain amount.
    expect(formatMoney(1000, "z")).toBe("10.00 z");
  });

  it("formatDuration is compact", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30m");
  });
});
