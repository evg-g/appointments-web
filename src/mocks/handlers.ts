import { http, HttpResponse } from "msw";

import type { components } from "@/api/schema";

import { problem, SEED_ACCOUNTS } from "./data";
import type { TokenResponse, UserOut } from "./data";
import {
  buildTelemetry,
  clinicianById,
  computeAvailability,
  db,
  DEVICE_ACTIVE,
  nextId,
  overlaps,
  resetDb,
  serviceById,
} from "./db";

type LoginRequest = components["schemas"]["LoginRequest"];
type RefreshRequest = components["schemas"]["RefreshRequest"];
type HTTPValidationError = components["schemas"]["HTTPValidationError"];
type AppointmentCreate = components["schemas"]["AppointmentCreate"];
type AppointmentTransition = components["schemas"]["AppointmentTransition"];
type CancelRequest = components["schemas"]["CancelRequest"];
type ClinicCreate = components["schemas"]["ClinicCreate"];
type ClinicianCreate = components["schemas"]["ClinicianCreate"];
type ServiceCreate = components["schemas"]["ServiceCreate"];
type UserCreate = components["schemas"]["UserCreate"];
type DeviceCreate = components["schemas"]["DeviceCreate"];
type ThresholdPolicyCreate = components["schemas"]["ThresholdPolicyCreate"];
type AppointmentOut = components["schemas"]["AppointmentOut"];

// In-memory session state. Reset between tests via resetMockState().
const accessTokens = new Map<string, UserOut>();
const refreshTokens = new Map<string, string>(); // refreshToken -> email
let counter = 0;

function issueTokens(user: UserOut): TokenResponse {
  counter += 1;
  const accessToken = `mock-access-${user.role}-${String(counter)}`;
  const refreshToken = `mock-refresh-${user.role}-${String(counter)}`;
  accessTokens.set(accessToken, user);
  refreshTokens.set(refreshToken, user.email);
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: 900,
  };
}

export function resetMockState(): void {
  accessTokens.clear();
  refreshTokens.clear();
  counter = 0;
  resetDb();
}

function bearerUser(request: Request): UserOut | null {
  const header = request.headers.get("Authorization");
  if (header === null || !header.startsWith("Bearer ")) return null;
  return accessTokens.get(header.slice("Bearer ".length)) ?? null;
}

interface PageOut<T> {
  data: T[];
  page: { has_more: boolean; next_cursor: string | null };
}

/** Offset-cursor pagination, so the infinite-query "load more" path is exercised by the mock. */
function paginate<T>(items: T[], url: URL): PageOut<T> {
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const offset = Number(url.searchParams.get("cursor") ?? "0");
  const slice = items.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const hasMore = nextOffset < items.length;
  return {
    data: slice,
    page: { has_more: hasMore, next_cursor: hasMore ? String(nextOffset) : null },
  };
}

function etagHeaders(version: number, extra: Record<string, string> = {}): HeadersInit {
  return { ETag: `"${String(version)}"`, ...extra };
}

function requireAuth(request: Request): UserOut | Response {
  const user = bearerUser(request);
  if (user === null) {
    return HttpResponse.json(problem(401, "Unauthorized", "Not authenticated."), { status: 401 });
  }
  return user;
}

export const handlers = [
  // ---- Auth ---------------------------------------------------------------------------------
  http.post("/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    const account = SEED_ACCOUNTS.find((a) => a.user.email === body.email);
    if (account === undefined || account.password !== body.password) {
      return HttpResponse.json(problem(401, "Unauthorized", "Invalid email or password."), {
        status: 401,
      });
    }
    return HttpResponse.json<TokenResponse>(issueTokens(account.user));
  }),

  http.post("/api/v1/auth/refresh", async ({ request }) => {
    const body = (await request.json()) as RefreshRequest;
    const email = refreshTokens.get(body.refresh_token);
    if (email === undefined) {
      return HttpResponse.json(problem(401, "Unauthorized", "Invalid refresh token."), {
        status: 401,
      });
    }
    refreshTokens.delete(body.refresh_token);
    const account = SEED_ACCOUNTS.find((a) => a.user.email === email);
    if (account === undefined) {
      return HttpResponse.json(problem(401, "Unauthorized", "Unknown account."), { status: 401 });
    }
    return HttpResponse.json<TokenResponse>(issueTokens(account.user));
  }),

  http.post("/api/v1/auth/logout", async ({ request }) => {
    const body = (await request.json()) as RefreshRequest;
    refreshTokens.delete(body.refresh_token);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/auth/me", ({ request }) => {
    const user = bearerUser(request);
    if (user === null) {
      return HttpResponse.json(problem(401, "Unauthorized", "Not authenticated."), { status: 401 });
    }
    return HttpResponse.json<UserOut>(user);
  }),

  // ---- Users --------------------------------------------------------------------------------
  http.post("/api/v1/users", async ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const body = (await request.json()) as UserCreate;
    const user: UserOut = {
      id: nextId("bbbbbbbb"),
      email: body.email,
      full_name: body.full_name,
      role: body.role,
      is_active: true,
    };
    db.users.push(user);
    return HttpResponse.json<UserOut>(user, { status: 201 });
  }),

  http.get("/api/v1/users/:user_id", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const user = db.users.find((u) => u.id === params["user_id"]);
    if (user === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "User not found."), { status: 404 });
    }
    return HttpResponse.json<UserOut>(user);
  }),

  // ---- Clinics ------------------------------------------------------------------------------
  http.get("/api/v1/clinics", ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    return HttpResponse.json(paginate(db.clinics, new URL(request.url)));
  }),

  http.get("/api/v1/clinics/:clinic_id", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const clinic = db.clinics.find((c) => c.id === params["clinic_id"]);
    if (clinic === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Clinic not found."), { status: 404 });
    }
    return HttpResponse.json(clinic);
  }),

  http.post("/api/v1/clinics", async ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const body = (await request.json()) as ClinicCreate;
    const clinic = { id: nextId("cccccccc"), ...body };
    db.clinics.push(clinic);
    return HttpResponse.json(clinic, { status: 201 });
  }),

  // ---- Clinicians ---------------------------------------------------------------------------
  http.get("/api/v1/clinicians", ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const clinicId = url.searchParams.get("clinic_id");
    const items = db.clinicians.filter((c) => clinicId === null || c.clinic_id === clinicId);
    return HttpResponse.json(paginate(items, url));
  }),

  http.get("/api/v1/clinicians/:clinician_id", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const clinician = db.clinicians.find((c) => c.id === params["clinician_id"]);
    if (clinician === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Clinician not found."), { status: 404 });
    }
    return HttpResponse.json(clinician);
  }),

  http.post("/api/v1/clinicians", async ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const body = (await request.json()) as ClinicianCreate;
    const clinician = {
      id: nextId("dddddddd"),
      user_id: body.user_id,
      clinic_id: body.clinic_id,
      specialty: body.specialty,
      buffer_minutes: body.buffer_minutes,
      working_hours: body.working_hours ?? [],
    };
    db.clinicians.push(clinician);
    return HttpResponse.json(clinician, { status: 201 });
  }),

  // ---- Services -----------------------------------------------------------------------------
  http.get("/api/v1/services", ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const clinicId = url.searchParams.get("clinic_id");
    const items = db.services.filter((s) => clinicId === null || s.clinic_id === clinicId);
    return HttpResponse.json(paginate(items, url));
  }),

  http.get("/api/v1/services/:service_id", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const service = db.services.find((s) => s.id === params["service_id"]);
    if (service === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Service not found."), { status: 404 });
    }
    return HttpResponse.json(service);
  }),

  http.post("/api/v1/services", async ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const body = (await request.json()) as ServiceCreate;
    const service = {
      id: nextId("eeeeeeee"),
      clinic_id: body.clinic_id,
      name: body.name,
      duration_minutes: body.duration_minutes,
      price_cents: body.price_cents,
      currency: body.currency,
      is_active: body.is_active,
    };
    db.services.push(service);
    return HttpResponse.json(service, { status: 201 });
  }),

  // ---- Availability -------------------------------------------------------------------------
  http.get("/api/v1/availability", ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const clinicianId = url.searchParams.get("clinician_id") ?? "";
    const serviceId = url.searchParams.get("service_id") ?? "";
    const day = url.searchParams.get("day") ?? "";
    return HttpResponse.json(computeAvailability(clinicianId, serviceId, day));
  }),

  // ---- Appointments -------------------------------------------------------------------------
  http.get("/api/v1/appointments", ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const ordered = [...db.appointments].sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
    );
    return HttpResponse.json(paginate(ordered, new URL(request.url)));
  }),

  http.post("/api/v1/appointments", async ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey !== null) {
      const existingId = db.idempotency.get(idempotencyKey);
      if (existingId !== undefined) {
        const existing = db.appointments.find((a) => a.id === existingId);
        if (existing !== undefined) {
          return HttpResponse.json<AppointmentOut>(existing, {
            status: 201,
            headers: etagHeaders(existing.version, { "Idempotency-Replayed": "true" }),
          });
        }
      }
    }

    const body = (await request.json()) as AppointmentCreate;
    const service = serviceById(body.service_id);
    const clinician = clinicianById(body.clinician_id);
    if (service === undefined || clinician === undefined) {
      return HttpResponse.json(
        problem(422, "Unprocessable Entity", "Unknown service or clinician."),
        {
          status: 422,
        },
      );
    }
    const startsAt = body.starts_at;
    const endsAt = new Date(
      new Date(startsAt).getTime() + service.duration_minutes * 60_000,
    ).toISOString();

    const clash = db.appointments.some(
      (appointment) =>
        appointment.clinician_id === body.clinician_id &&
        appointment.status !== "CANCELLED" &&
        appointment.status !== "NO_SHOW" &&
        overlaps(startsAt, endsAt, appointment.starts_at, appointment.ends_at),
    );
    if (clash) {
      return HttpResponse.json(
        problem(409, "Conflict", "That slot is no longer available for this clinician."),
        { status: 409 },
      );
    }

    const appointment: AppointmentOut = {
      id: nextId("99999999"),
      clinic_id: body.clinic_id,
      clinician_id: body.clinician_id,
      patient_id: body.patient_id ?? auth.id,
      service_id: body.service_id,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "REQUESTED",
      cancellation_reason: null,
      version: 1,
    };
    db.appointments.push(appointment);
    if (idempotencyKey !== null) db.idempotency.set(idempotencyKey, appointment.id);
    return HttpResponse.json<AppointmentOut>(appointment, {
      status: 201,
      headers: etagHeaders(appointment.version),
    });
  }),

  http.get("/api/v1/appointments/:appointment_id", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const appointment = db.appointments.find((a) => a.id === params["appointment_id"]);
    if (appointment === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Appointment not found."), {
        status: 404,
      });
    }
    return HttpResponse.json<AppointmentOut>(appointment, {
      headers: etagHeaders(appointment.version),
    });
  }),

  http.post("/api/v1/appointments/:appointment_id/transition", async ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const appointment = db.appointments.find((a) => a.id === params["appointment_id"]);
    if (appointment === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Appointment not found."), {
        status: 404,
      });
    }
    const precondition = checkIfMatch(request, appointment.version);
    if (precondition !== null) return precondition;
    const body = (await request.json()) as AppointmentTransition;
    appointment.status = body.target_status;
    appointment.version += 1;
    return HttpResponse.json<AppointmentOut>(appointment, {
      headers: etagHeaders(appointment.version),
    });
  }),

  http.post("/api/v1/appointments/:appointment_id/cancel", async ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const appointment = db.appointments.find((a) => a.id === params["appointment_id"]);
    if (appointment === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Appointment not found."), {
        status: 404,
      });
    }
    const precondition = checkIfMatch(request, appointment.version);
    if (precondition !== null) return precondition;
    const body = (await request.json()) as CancelRequest;
    appointment.status = "CANCELLED";
    appointment.cancellation_reason = body.reason ?? null;
    appointment.version += 1;
    return HttpResponse.json<AppointmentOut>(appointment, {
      headers: etagHeaders(appointment.version),
    });
  }),

  // ---- Devices ------------------------------------------------------------------------------
  http.get("/api/v1/devices", ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const clinicId = url.searchParams.get("clinic_id");
    const items = db.devices.filter((d) => clinicId === null || d.clinic_id === clinicId);
    return HttpResponse.json(paginate(items, url));
  }),

  http.get("/api/v1/devices/:device_id/health", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const device = db.devices.find((d) => d.id === params["device_id"]);
    if (device === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Device not found."), { status: 404 });
    }
    const openExcursions = db.excursions.filter(
      (e) => e.device_id === device.id && e.acknowledged_at === null && e.ended_at === null,
    ).length;
    return HttpResponse.json({
      device_id: device.id,
      last_seen_at: device.last_seen_at,
      last_temperature_c: device.status === "ACTIVE" ? 4.6 : null,
      last_battery_pct: device.status === "ACTIVE" ? 87 : null,
      open_excursions: openExcursions,
      status: device.status,
    });
  }),

  http.get("/api/v1/devices/:device_id/telemetry", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const bucket = Number(url.searchParams.get("bucket") ?? "300");
    const agg = url.searchParams.get("agg") ?? "avg";
    return HttpResponse.json(buildTelemetry(String(params["device_id"]), bucket, agg));
  }),

  http.get("/api/v1/devices/:device_id/excursions", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const openOnly = url.searchParams.get("open_only") === "true";
    const items = db.excursions
      .filter((e) => e.device_id === params["device_id"])
      .filter((e) => !openOnly || e.acknowledged_at === null)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    return HttpResponse.json(paginate(items, url));
  }),

  http.get("/api/v1/devices/:device_id", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const device = db.devices.find((d) => d.id === params["device_id"]);
    if (device === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Device not found."), { status: 404 });
    }
    return HttpResponse.json(device);
  }),

  http.post("/api/v1/devices", async ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const body = (await request.json()) as DeviceCreate;
    const device = {
      id: nextId("ffffffff"),
      clinic_id: body.clinic_id,
      firmware_version: body.firmware_version,
      hardware_version: body.hardware_version,
      location_label: body.location_label,
      last_seen_at: null,
      status: "PROVISIONED" as const,
    };
    db.devices.push(device);
    return HttpResponse.json({ device, secret: `mock-secret-${device.id}` }, { status: 201 });
  }),

  // Colon endpoints — matched by RegExp because MSW reads ":name" as a path param.
  http.post(/\/api\/v1\/devices\/([^/]+)\/credentials:rotate$/, ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const id = decodeURIComponent(new URL(request.url).pathname.split("/")[5]?.split(":")[0] ?? "");
    const device = db.devices.find((d) => d.id === id);
    if (device === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Device not found."), { status: 404 });
    }
    return HttpResponse.json({ device, secret: `mock-secret-rotated-${device.id}` });
  }),

  // ---- Excursions ---------------------------------------------------------------------------
  http.get("/api/v1/excursions/:excursion_id", ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const excursion = db.excursions.find((e) => e.id === params["excursion_id"]);
    if (excursion === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Excursion not found."), { status: 404 });
    }
    return HttpResponse.json(excursion);
  }),

  http.post(/\/api\/v1\/excursions\/([^/]+):acknowledge$/, ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const id = decodeURIComponent(new URL(request.url).pathname.split("/")[4]?.split(":")[0] ?? "");
    const excursion = db.excursions.find((e) => e.id === id);
    if (excursion === undefined) {
      return HttpResponse.json(problem(404, "Not Found", "Excursion not found."), { status: 404 });
    }
    excursion.acknowledged_at = new Date().toISOString();
    excursion.acknowledged_by = auth.email;
    return HttpResponse.json(excursion);
  }),

  // ---- Telemetry SSE stream -----------------------------------------------------------------
  http.get("/api/v1/streams/telemetry", ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Emit a couple of live readings, then leave the stream open (the client aborts on unmount).
        for (let i = 0; i < 2; i += 1) {
          const payload = {
            device_id: DEVICE_ACTIVE,
            reading: { temperature_c: 4.6 + i * 0.1, measured_at: new Date().toISOString() },
          };
          controller.enqueue(
            encoder.encode(
              `id: ${String(i + 1)}\nevent: reading\ndata: ${JSON.stringify(payload)}\n\n`,
            ),
          );
        }
      },
    });
    return new HttpResponse(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }),

  // ---- Audit log (admin only) ---------------------------------------------------------------
  http.get("/api/v1/audit-log", ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    if (auth.role !== "CLINIC_ADMIN" && auth.role !== "PLATFORM_ADMIN") {
      return HttpResponse.json(problem(403, "Forbidden", "Admins only."), { status: 403 });
    }
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const entityType = url.searchParams.get("entity_type");
    const actorId = url.searchParams.get("actor_id");
    const items = db.auditLog
      .filter((entry) => action === null || entry.action === action)
      .filter((entry) => entityType === null || entry.entity_type === entityType)
      .filter((entry) => actorId === null || entry.actor_id === actorId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return HttpResponse.json(paginate(items, url));
  }),

  // ---- Threshold policies -------------------------------------------------------------------
  http.post("/api/v1/threshold-policies", async ({ request }) => {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const body = (await request.json()) as ThresholdPolicyCreate;
    const policy = {
      id: nextId("77777777"),
      clinic_id: body.clinic_id ?? null,
      device_id: body.device_id ?? null,
      min_temperature_c: body.min_temperature_c,
      max_temperature_c: body.max_temperature_c,
      dwell_minutes: body.dwell_minutes,
      recovery_minutes: body.recovery_minutes,
    };
    db.thresholdPolicies.push(policy);
    return HttpResponse.json(policy, { status: 201 });
  }),
];

/** If-Match precondition: 428 when absent, 412 when it does not match the current version. */
function checkIfMatch(request: Request, version: number): Response | null {
  const ifMatch = request.headers.get("If-Match");
  if (ifMatch === null) {
    return HttpResponse.json(
      problem(428, "Precondition Required", "If-Match header is required."),
      {
        status: 428,
      },
    );
  }
  if (ifMatch !== `"${String(version)}"`) {
    return HttpResponse.json(problem(412, "Precondition Failed", "The record was modified."), {
      status: 412,
    });
  }
  return null;
}

/**
 * Named error scenarios for the four-state tests. Each returns a handler to pass to server.use().
 */
export const scenarios = {
  loginInvalidCredentials: () =>
    http.post("/api/v1/auth/login", () =>
      HttpResponse.json(problem(401, "Unauthorized", "Invalid email or password."), {
        status: 401,
      }),
    ),

  loginValidationError: () =>
    http.post("/api/v1/auth/login", () =>
      HttpResponse.json<HTTPValidationError>(
        {
          detail: [
            {
              loc: ["body", "email"],
              msg: "value is not a valid email address",
              type: "value_error",
            },
          ],
        },
        { status: 422 },
      ),
    ),

  loginServerError: () =>
    http.post("/api/v1/auth/login", () =>
      HttpResponse.json(problem(500, "Internal Server Error", "Unexpected error."), {
        status: 500,
      }),
    ),

  loginNetworkError: () => http.post("/api/v1/auth/login", () => HttpResponse.error()),

  meUnauthorized: () =>
    http.get("/api/v1/auth/me", () =>
      HttpResponse.json(problem(401, "Unauthorized", "Not authenticated."), { status: 401 }),
    ),

  appointmentsEmpty: () =>
    http.get("/api/v1/appointments", () =>
      HttpResponse.json({ data: [], page: { has_more: false, next_cursor: null } }),
    ),

  appointmentsError: () =>
    http.get("/api/v1/appointments", () =>
      HttpResponse.json(problem(500, "Internal Server Error", "Unexpected error."), {
        status: 500,
      }),
    ),

  bookingConflict: () =>
    http.post("/api/v1/appointments", () =>
      HttpResponse.json(problem(409, "Conflict", "That slot is no longer available."), {
        status: 409,
      }),
    ),

  clinicsError: () =>
    http.get("/api/v1/clinics", () =>
      HttpResponse.json(problem(500, "Internal Server Error", "Unexpected error."), {
        status: 500,
      }),
    ),

  devicesError: () =>
    http.get("/api/v1/devices", () =>
      HttpResponse.json(problem(500, "Internal Server Error", "Unexpected error."), {
        status: 500,
      }),
    ),

  devicesEmpty: () =>
    http.get("/api/v1/devices", () =>
      HttpResponse.json({ data: [], page: { has_more: false, next_cursor: null } }),
    ),

  acknowledgeFails: () =>
    http.post(/\/api\/v1\/excursions\/([^/]+):acknowledge$/, () =>
      HttpResponse.json(problem(500, "Internal Server Error", "Could not acknowledge."), {
        status: 500,
      }),
    ),

  auditEmpty: () =>
    http.get("/api/v1/audit-log", () =>
      HttpResponse.json({ data: [], page: { has_more: false, next_cursor: null } }),
    ),

  auditError: () =>
    http.get("/api/v1/audit-log", () =>
      HttpResponse.json(problem(500, "Internal Server Error", "Unexpected error."), {
        status: 500,
      }),
    ),
};
