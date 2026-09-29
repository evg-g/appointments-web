import { useEffect, useRef, useState } from "react";

import { tokenStore } from "@/auth/token-store";

import { API_BASE_URL } from "./client";

/**
 * Live telemetry over SSE.
 *
 * The browser's native `EventSource` cannot send an `Authorization` header, and our stream is
 * bearer-authenticated (see appointments-web KNOWN_GAPS, milestone 12). So we read the
 * `text/event-stream` ourselves over `fetch` + a `ReadableStream` reader: that lets us attach the
 * token, resume with `Last-Event-ID`, and back off on drop — everything EventSource gives us,
 * minus the auth limitation.
 */

const STREAM_PATH = "/api/v1/streams/telemetry";

export interface SseEvent {
  id: string | null;
  event: string | null;
  data: string;
}

/**
 * Parse whatever bytes have arrived so far into complete SSE events plus the trailing partial
 * frame to carry over. Pure and framing-only — kept separate so it is unit-testable without a
 * network. Frames are separated by a blank line; `data:` lines within a frame join with "\n".
 */
export function parseSseBuffer(buffer: string): { events: SseEvent[]; rest: string } {
  const normalised = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalised.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: SseEvent[] = [];

  for (const frame of parts) {
    if (frame.trim() === "") continue;
    let id: string | null = null;
    let event: string | null = null;
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) continue; // comment / heartbeat
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      const rawValue = colon === -1 ? "" : line.slice(colon + 1);
      const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
      if (field === "id") id = value;
      else if (field === "event") event = value;
      else if (field === "data") dataLines.push(value);
    }
    events.push({ id, event, data: dataLines.join("\n") });
  }

  return { events, rest };
}

export interface TelemetryPoint {
  deviceId: string | null;
  temperatureC: number | null;
  measuredAt: string | null;
  raw: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Best-effort projection of an event's JSON payload onto the fields the dashboard plots. The SSE
 * body is not part of the OpenAPI contract (SSE frames aren't modelled), so we read known fields
 * defensively and keep the original under `raw`.
 */
export function toTelemetryPoint(data: string): TelemetryPoint | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const reading =
    typeof record["reading"] === "object" && record["reading"] !== null
      ? (record["reading"] as Record<string, unknown>)
      : record;
  return {
    deviceId: asString(record["device_id"]) ?? asString(reading["device_id"]),
    temperatureC: asNumber(reading["temperature_c"]) ?? asNumber(record["temperature_c"]),
    measuredAt: asString(reading["measured_at"]) ?? asString(record["measured_at"]),
    raw: parsed,
  };
}

export type StreamStatus = "idle" | "connecting" | "open" | "error";

export interface UseTelemetryStreamOptions {
  /** Only surface points for this device; undefined keeps every device's points. */
  deviceId?: string;
  enabled?: boolean;
  /** Ring-buffer size for live points (default 120). */
  maxPoints?: number;
}

export interface TelemetryStreamState {
  status: StreamStatus;
  points: TelemetryPoint[];
  lastEventId: string | null;
  error: unknown;
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export function useTelemetryStream(options: UseTelemetryStreamOptions = {}): TelemetryStreamState {
  const { deviceId, enabled = true, maxPoints = 120 } = options;
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [error, setError] = useState<unknown>(null);
  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    async function connect(): Promise<void> {
      setStatus("connecting");
      const token = tokenStore.getAccessToken();
      const query = new URLSearchParams();
      if (lastEventIdRef.current !== null) query.set("last_event_id", lastEventIdRef.current);
      const url = `${API_BASE_URL}${STREAM_PATH}${query.size > 0 ? `?${query.toString()}` : ""}`;

      try {
        const response = await fetch(url, {
          headers: {
            Accept: "text/event-stream",
            ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (!response.ok || response.body === null) {
          throw new Error(`Stream failed (HTTP ${String(response.status)}).`);
        }
        setStatus("open");
        setError(null);
        attempt = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseSseBuffer(buffer);
          buffer = rest;
          for (const evt of events) {
            if (evt.id !== null) lastEventIdRef.current = evt.id;
            const point = toTelemetryPoint(evt.data);
            if (point === null) continue;
            if (deviceId !== undefined && point.deviceId !== null && point.deviceId !== deviceId) {
              continue;
            }
            setPoints((current) => [...current, point].slice(-maxPoints));
          }
        }
        // Clean end of stream — treat as a drop and reconnect.
        throw new Error("Stream closed.");
      } catch (err) {
        if (stopped || controller.signal.aborted) return;
        setStatus("error");
        setError(err);
        attempt += 1;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** (attempt - 1), RECONNECT_MAX_MS);
        reconnectTimer = setTimeout(() => {
          void connect();
        }, delay);
      }
    }

    void connect();

    return () => {
      stopped = true;
      controller.abort();
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
    };
  }, [deviceId, enabled, maxPoints]);

  return { status, points, lastEventId: lastEventIdRef.current, error };
}
