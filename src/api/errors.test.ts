import { describe, expect, it } from "vitest";

import { errorMessage, parseApiError } from "./errors";

describe("parseApiError", () => {
  it("maps a 422 validation error onto field messages", () => {
    const result = parseApiError({
      detail: [
        { loc: ["body", "email"], msg: "value is not a valid email address", type: "value_error" },
        { loc: ["body", "password"], msg: "field required", type: "missing" },
      ],
    });

    expect(result.fieldErrors).toEqual({
      email: "value is not a valid email address",
      password: "field required",
    });
    expect(result.message).toMatch(/highlighted fields/i);
  });

  it("uses the detail from a problem+json body", () => {
    const result = parseApiError({
      type: "about:blank",
      title: "Unauthorized",
      status: 401,
      detail: "Invalid email or password.",
    });

    expect(result.message).toBe("Invalid email or password.");
    expect(result.fieldErrors).toEqual({});
  });

  it("falls back to the title when there is no detail", () => {
    expect(parseApiError({ title: "Conflict" }).message).toBe("Conflict");
  });

  it("returns a generic message for an unrecognized shape", () => {
    expect(errorMessage(null)).toMatch(/something went wrong/i);
    expect(errorMessage("boom")).toMatch(/something went wrong/i);
  });
});
