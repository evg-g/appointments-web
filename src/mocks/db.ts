/**
 * An in-memory mock backend for the whole feature surface. It is deliberately stateful (bookings
 * mutate it, transitions bump versions, excursions get acknowledged) so component tests and the
 * dev server exercise realistic flows — not just canned responses. `resetDb()` restores the seed
 * between tests.
 */
import type {
  AppointmentOut,
  AuditLogEntryOut,
  ClinicianOut,
  ClinicOut,
  DeviceOut,
  ExcursionOut,
  ServiceOut,
  SlotOut,
  ThresholdPolicyOut,
  TimeSeriesOut,
  UserOut,
} from "@/api/types";

import { SEED_ACCOUNTS } from "./data";

// Stable ids so tests can assert against them.
export const CLINIC_A = "c1111111-1111-4111-8111-000000000001";
export const CLINIC_B = "c2222222-2222-4222-8222-000000000002";
export const CLINICIAN_1 = "d1111111-1111-4111-8111-000000000001";
export const SERVICE_30 = "e1111111-1111-4111-8111-000000000001";
export const SERVICE_60 = "e2222222-2222-4222-8222-000000000002";
export const DEVICE_ACTIVE = "f1111111-1111-4111-8111-000000000001";
export const DEVICE_NEW = "f2222222-2222-4222-8222-000000000002";
export const EXCURSION_OPEN = "a1111111-1111-4111-8111-000000000001";
export const EXCURSION_ACK = "a2222222-2222-4222-8222-000000000002";

const CLINICIAN_USER = "22222222-2222-4222-8222-222222222222"; // clinician@aurora.test

interface MockState {
  clinics: ClinicOut[];
  clinicians: ClinicianOut[];
  services: ServiceOut[];
  users: UserOut[];
  appointments: AppointmentOut[];
  devices: DeviceOut[];
  excursions: ExcursionOut[];
  auditLog: AuditLogEntryOut[];
  thresholdPolicies: ThresholdPolicyOut[];
  /** Idempotency-Key -> appointment id, so a replayed booking returns the original. */
  idempotency: Map<string, string>;
  seq: number;
}

function seed(): MockState {
  const clinics: ClinicOut[] = [
    {
      id: CLINIC_A,
      name: "Aurora Downtown",
      address: "100 Market St, San Francisco",
      timezone: "America/Los_Angeles",
      cancellation_cutoff_hours: 24,
    },
    {
      id: CLINIC_B,
      name: "Aurora Riverside",
      address: "9 Riverside Ave, Portland",
      timezone: "America/Los_Angeles",
      cancellation_cutoff_hours: 12,
    },
  ];

  const clinicians: ClinicianOut[] = [
    {
      id: CLINICIAN_1,
      user_id: CLINICIAN_USER,
      clinic_id: CLINIC_A,
      specialty: "General practice",
      buffer_minutes: 10,
      working_hours: [
        { weekday: 0, start: "09:00:00", end: "17:00:00" },
        { weekday: 1, start: "09:00:00", end: "17:00:00" },
        { weekday: 2, start: "09:00:00", end: "17:00:00" },
        { weekday: 3, start: "09:00:00", end: "17:00:00" },
        { weekday: 4, start: "09:00:00", end: "13:00:00" },
      ],
    },
  ];

  const services: ServiceOut[] = [
    {
      id: SERVICE_30,
      clinic_id: CLINIC_A,
      name: "Standard consultation",
      duration_minutes: 30,
      price_cents: 12000,
      currency: "USD",
      is_active: true,
    },
    {
      id: SERVICE_60,
      clinic_id: CLINIC_A,
      name: "Extended review",
      duration_minutes: 60,
      price_cents: 22000,
      currency: "USD",
      is_active: true,
    },
  ];

  const users: UserOut[] = SEED_ACCOUNTS.map((account) => account.user);

  const devices: DeviceOut[] = [
    {
      id: DEVICE_ACTIVE,
      clinic_id: CLINIC_A,
      firmware_version: "1.4.2",
      hardware_version: "rev-c",
      location_label: "Vaccine fridge — main",
      last_seen_at: new Date(Date.now() - 45_000).toISOString(),
      status: "ACTIVE",
    },
    {
      id: DEVICE_NEW,
      clinic_id: CLINIC_B,
      firmware_version: "1.4.2",
      hardware_version: "rev-c",
      location_label: "Vaccine fridge — annex",
      last_seen_at: null,
      status: "PROVISIONED",
    },
  ];

  const excursions: ExcursionOut[] = [
    {
      id: EXCURSION_OPEN,
      device_id: DEVICE_ACTIVE,
      direction: "high",
      started_at: new Date(Date.now() - 3_600_000).toISOString(),
      ended_at: null,
      peak_temperature_c: 9.4,
      acknowledged_at: null,
      acknowledged_by: null,
    },
    {
      id: EXCURSION_ACK,
      device_id: DEVICE_ACTIVE,
      direction: "low",
      started_at: new Date(Date.now() - 86_400_000).toISOString(),
      ended_at: new Date(Date.now() - 82_800_000).toISOString(),
      peak_temperature_c: 1.2,
      acknowledged_at: new Date(Date.now() - 80_000_000).toISOString(),
      acknowledged_by: "admin@aurora.test",
    },
  ];

  const auditLog: AuditLogEntryOut[] = [
    {
      id: "b1111111-1111-4111-8111-000000000001",
      actor_id: "33333333-3333-4333-8333-333333333333",
      action: "appointment.confirmed",
      entity_type: "appointment",
      entity_id: "99999999-1111-4111-8111-000000000001",
      before: { status: "REQUESTED" },
      after: { status: "CONFIRMED" },
      created_at: new Date(Date.now() - 3_600_000).toISOString(),
    },
    {
      id: "b2222222-2222-4222-8222-000000000002",
      actor_id: "33333333-3333-4333-8333-333333333333",
      action: "device.provisioned",
      entity_type: "device",
      entity_id: DEVICE_NEW,
      before: null,
      after: { status: "PROVISIONED" },
      created_at: new Date(Date.now() - 7_200_000).toISOString(),
    },
    {
      id: "b3333333-3333-4333-8333-000000000003",
      actor_id: null,
      action: "excursion.raised",
      entity_type: "excursion",
      entity_id: EXCURSION_OPEN,
      before: null,
      after: { direction: "high", peak_temperature_c: 9.4 },
      created_at: new Date(Date.now() - 10_800_000).toISOString(),
    },
  ];

  return {
    clinics,
    clinicians,
    services,
    users,
    appointments: [],
    devices,
    excursions,
    auditLog,
    thresholdPolicies: [],
    idempotency: new Map(),
    seq: 0,
  };
}

export let db: MockState = seed();

export function resetDb(): void {
  db = seed();
}

const PATIENT_USER = "11111111-1111-4111-8111-111111111111"; // patient@aurora.test

/** A weekday `days` from now at `hourUtc`:00Z (Saturday/Sunday roll forward to Monday). */
function demoSlot(
  days: number,
  hourUtc: number,
  minutes: number,
): { starts_at: string; ends_at: string } {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + days);
  while (start.getUTCDay() === 0 || start.getUTCDay() === 6) {
    start.setUTCDate(start.getUTCDate() + (days < 0 ? -1 : 1));
  }
  start.setUTCHours(hourUtc, 0, 0, 0);
  const end = new Date(start.getTime() + minutes * 60_000);
  return { starts_at: start.toISOString(), ends_at: end.toISOString() };
}

/**
 * Populate the mock backend with a realistic week of bookings, for the live demo and the README
 * screenshots. Opt-in (`VITE_MSW_DEMO_DATA=true`): the tests keep the empty seed, so their empty
 * states and visual baselines do not depend on the date they run.
 */
export function seedDemoData(): void {
  const rows: [number, number, string, AppointmentOut["status"], string | null][] = [
    [1, 17, SERVICE_30, "CONFIRMED", null],
    [2, 18, SERVICE_60, "REQUESTED", null],
    [4, 16, SERVICE_30, "CONFIRMED", null],
    [-2, 17, SERVICE_30, "COMPLETED", null],
    [-5, 19, SERVICE_60, "CANCELLED", "Rescheduled by the patient"],
    [-9, 16, SERVICE_30, "NO_SHOW", null],
  ];
  rows.forEach(([days, hour, serviceId, status, reason], index) => {
    const minutes = serviceId === SERVICE_60 ? 60 : 30;
    db.appointments.push({
      id: `99999999-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
      clinic_id: CLINIC_A,
      clinician_id: CLINICIAN_1,
      service_id: serviceId,
      patient_id: PATIENT_USER,
      status,
      cancellation_reason: reason,
      version: status === "REQUESTED" ? 1 : 2,
      ...demoSlot(days, hour, minutes),
    });
  });
}

export function nextId(prefix: string): string {
  db.seq += 1;
  const tail = String(db.seq).padStart(12, "0");
  return `${prefix}-1111-4111-8111-${tail}`;
}

// ---- Domain helpers used by the handlers ---------------------------------------------------

export function serviceById(id: string): ServiceOut | undefined {
  return db.services.find((service) => service.id === id);
}

export function clinicianById(id: string): ClinicianOut | undefined {
  return db.clinicians.find((clinician) => clinician.id === id);
}

/** Overlap test on [start,end) used for double-booking (409) and availability filtering. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/**
 * Compute bookable slots for a clinician + service on a local day, from the working window for
 * that weekday, stepped by the service duration + the clinician buffer, minus anything booked.
 */
export function computeAvailability(
  clinicianId: string,
  serviceId: string,
  day: string,
): SlotOut[] {
  const clinician = clinicianById(clinicianId);
  const service = serviceById(serviceId);
  if (clinician === undefined || service === undefined) return [];

  const date = new Date(`${day}T00:00:00`);
  const weekday = (date.getDay() + 6) % 7; // 0 = Monday
  const windows = clinician.working_hours.filter((window) => window.weekday === weekday);
  const step = service.duration_minutes + clinician.buffer_minutes;

  const booked = db.appointments.filter(
    (appointment) =>
      appointment.clinician_id === clinicianId &&
      appointment.status !== "CANCELLED" &&
      appointment.status !== "NO_SHOW",
  );

  const slots: SlotOut[] = [];
  for (const window of windows) {
    const start = new Date(`${day}T${window.start}`);
    const end = new Date(`${day}T${window.end}`);
    for (
      let cursor = new Date(start);
      cursor.getTime() + service.duration_minutes * 60_000 <= end.getTime();
      cursor = new Date(cursor.getTime() + step * 60_000)
    ) {
      const slotStart = cursor.toISOString();
      const slotEnd = new Date(cursor.getTime() + service.duration_minutes * 60_000).toISOString();
      const clash = booked.some((appointment) =>
        overlaps(slotStart, slotEnd, appointment.starts_at, appointment.ends_at),
      );
      if (!clash) slots.push({ start: slotStart, end: slotEnd });
    }
  }
  return slots;
}

/** A deterministic-ish temperature series for a device, so the chart has data to draw. */
export function buildTelemetry(
  deviceId: string,
  bucketSeconds: number,
  agg: string,
): TimeSeriesOut {
  const points = Array.from({ length: 48 }, (_, index) => {
    const bucketStart = new Date(Date.now() - (47 - index) * bucketSeconds * 1000).toISOString();
    // Gentle wave around 4.5 °C, with an afternoon excursion spike for the active device.
    const wave = 4.5 + Math.sin(index / 4) * 0.6;
    const spike = deviceId === DEVICE_ACTIVE && index > 30 && index < 36 ? 4.5 : 0;
    return {
      bucket_start: bucketStart,
      value: Math.round((wave + spike) * 100) / 100,
      sample_count: 12,
    };
  });
  return { device_id: deviceId, agg, bucket_seconds: bucketSeconds, points };
}
