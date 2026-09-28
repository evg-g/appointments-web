import { describe, expect, it } from "vitest";

import { canCancel, isTerminal, STATUS_LABEL, TRANSITION_TARGETS } from "./status";

describe("appointment status metadata", () => {
  it("offers forward transitions only from non-terminal states", () => {
    expect(TRANSITION_TARGETS.REQUESTED).toContain("CONFIRMED");
    expect(TRANSITION_TARGETS.CONFIRMED).toEqual(["COMPLETED", "NO_SHOW"]);
    expect(TRANSITION_TARGETS.COMPLETED).toEqual([]);
    expect(TRANSITION_TARGETS.CANCELLED).toEqual([]);
  });

  it("never offers CANCELLED as a transition target (cancel is a separate flow)", () => {
    for (const targets of Object.values(TRANSITION_TARGETS)) {
      expect(targets).not.toContain("CANCELLED");
    }
  });

  it("allows cancelling only from open states", () => {
    expect(canCancel("REQUESTED")).toBe(true);
    expect(canCancel("CONFIRMED")).toBe(true);
    expect(canCancel("COMPLETED")).toBe(false);
    expect(canCancel("CANCELLED")).toBe(false);
  });

  it("marks completed/cancelled/no-show as terminal", () => {
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("NO_SHOW")).toBe(true);
    expect(isTerminal("REQUESTED")).toBe(false);
  });

  it("has a label for every status", () => {
    expect(Object.keys(STATUS_LABEL)).toHaveLength(5);
  });
});
