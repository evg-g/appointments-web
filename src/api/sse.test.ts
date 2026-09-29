import { describe, expect, it } from "vitest";

import { parseSseBuffer, toTelemetryPoint } from "./sse";

describe("parseSseBuffer", () => {
  it("splits complete frames and keeps the trailing partial", () => {
    const { events, rest } = parseSseBuffer(
      'id: 1\nevent: reading\ndata: {"a":1}\n\nid: 2\ndata: par',
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ id: "1", event: "reading", data: '{"a":1}' });
    expect(rest).toBe("id: 2\ndata: par");
  });

  it("joins multi-line data and ignores comment lines", () => {
    const { events } = parseSseBuffer(":keep-alive\ndata: line1\ndata: line2\n\n");
    expect(events[0]?.data).toBe("line1\nline2");
    expect(events[0]?.id).toBeNull();
  });

  it("handles CRLF line endings", () => {
    const { events } = parseSseBuffer("id: 5\r\ndata: x\r\n\r\n");
    expect(events[0]).toEqual({ id: "5", event: null, data: "x" });
  });
});

describe("toTelemetryPoint", () => {
  it("reads temperature and time from a nested reading", () => {
    const point = toTelemetryPoint(
      JSON.stringify({
        device_id: "d1",
        reading: { temperature_c: 4.7, measured_at: "2026-01-01T00:00:00Z" },
      }),
    );
    expect(point).toEqual({
      deviceId: "d1",
      temperatureC: 4.7,
      measuredAt: "2026-01-01T00:00:00Z",
      raw: {
        device_id: "d1",
        reading: { temperature_c: 4.7, measured_at: "2026-01-01T00:00:00Z" },
      },
    });
  });

  it("reads top-level fields when there is no nested reading", () => {
    const point = toTelemetryPoint(
      JSON.stringify({ device_id: "d2", temperature_c: 3.1, measured_at: "t" }),
    );
    expect(point?.temperatureC).toBe(3.1);
    expect(point?.deviceId).toBe("d2");
  });

  it("returns null for invalid JSON", () => {
    expect(toTelemetryPoint("not json")).toBeNull();
  });
});
