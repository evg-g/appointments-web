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

import { zonedWallTimeToUtc } from "@/lib/datetime";

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
  /**
   * Per-device telemetry baseline in °C (demo data only). A device listed here gets a chart
   * centred on its own value and reports its latest reading in /health; others keep the fixed
   * 4.5 °C wave and the 4.6 °C health reading the tests expect.
   */
  baselineC: Map<string, number>;
  /** Idempotency-Key -> appointment id, so a replayed booking returns the original. */
  idempotency: Map<string, string>;
  seq: number;
  /**
   * Leave out slots that already started, as the real API does (API availability service). Only
   * the demo dataset turns it on: it lives on the real clock, while the tests book a fixed past
   * Monday so their results and visual baselines never move.
   */
  hidePastSlots: boolean;
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
    baselineC: new Map(),
    idempotency: new Map(),
    seq: 0,
    hidePastSlots: false,
  };
}

export let db: MockState = seed();

export function resetDb(): void {
  db = seed();
}

const PATIENT_USER = "11111111-1111-4111-8111-111111111111"; // patient@aurora.test

/**
 * `days` working days from now (Saturday and Sunday are skipped, so each offset is its own day)
 * at `hourUtc`:00Z. Offset 0 is today, or the next weekday when today is a weekend.
 */
function demoSlot(
  days: number,
  hourUtc: number,
  minutes: number,
): { starts_at: string; ends_at: string } {
  const start = new Date();
  const isWeekend = () => start.getUTCDay() === 0 || start.getUTCDay() === 6;
  while (isWeekend()) start.setUTCDate(start.getUTCDate() + 1);
  const step = days < 0 ? -1 : 1;
  for (let left = Math.abs(days); left > 0;) {
    start.setUTCDate(start.getUTCDate() + step);
    if (!isWeekend()) left -= 1;
  }
  start.setUTCHours(hourUtc, 0, 0, 0);
  const end = new Date(start.getTime() + minutes * 60_000);
  return { starts_at: start.toISOString(), ends_at: end.toISOString() };
}

const WEEKDAYS_9_TO_5 = [0, 1, 2, 3, 4].map((weekday) => ({
  weekday,
  start: "09:00:00",
  end: "17:00:00",
}));

function demoUser(n: number, fullName: string, role: UserOut["role"]): UserOut {
  const email = `${fullName.toLowerCase().replace(/[^a-z]+/g, ".")}@demo.aurora.test`;
  return {
    id: `44444444-4444-4444-8444-${String(n).padStart(12, "0")}`,
    email,
    full_name: fullName,
    role,
    is_active: true,
  };
}

/**
 * Populate the mock backend with a realistic clinic network, for the live demo and the README
 * screenshots: three clinics, four clinicians, six services, five fridge sensors, and two weeks of
 * bookings. Opt-in (`VITE_MSW_DEMO_DATA=true`): the tests keep the small seed, so their empty
 * states and visual baselines do not depend on the date they run.
 *
 * The extra people are records only; the three sign-in accounts stay the seed ones.
 */
export function seedDemoData(): void {
  db.hidePastSlots = true;
  const clinicC = "c3333333-3333-4333-8333-000000000003";
  db.clinics.push({
    id: clinicC,
    name: "Aurora Northside",
    address: "42 Lake View Rd, Seattle",
    timezone: "America/Los_Angeles",
    cancellation_cutoff_hours: 24,
  });

  const staff = [
    demoUser(1, "Dr. Maya Chen", "CLINICIAN"),
    demoUser(2, "Dr. Omar Haddad", "CLINICIAN"),
    demoUser(3, "Dr. Lena Novak", "CLINICIAN"),
  ];
  const patients = [
    demoUser(11, "Jordan Lee", "PATIENT"),
    demoUser(12, "Sam Rivera", "PATIENT"),
    demoUser(13, "Alex Morgan", "PATIENT"),
    demoUser(14, "Priya Shah", "PATIENT"),
  ];
  db.users.push(...staff, ...patients);

  const clinicianIds = {
    chen: "d2222222-2222-4222-8222-000000000002",
    haddad: "d3333333-3333-4333-8333-000000000003",
    novak: "d4444444-4444-4444-8444-000000000004",
  };
  const [chen, haddad, novak] = staff;
  if (chen === undefined || haddad === undefined || novak === undefined) return;
  db.clinicians.push(
    {
      id: clinicianIds.chen,
      user_id: chen.id,
      clinic_id: CLINIC_A,
      specialty: "Travel medicine",
      buffer_minutes: 10,
      working_hours: WEEKDAYS_9_TO_5,
    },
    {
      id: clinicianIds.haddad,
      user_id: haddad.id,
      clinic_id: CLINIC_B,
      specialty: "Paediatrics",
      buffer_minutes: 5,
      working_hours: WEEKDAYS_9_TO_5,
    },
    {
      id: clinicianIds.novak,
      user_id: novak.id,
      clinic_id: clinicC,
      specialty: "Dermatology",
      buffer_minutes: 10,
      working_hours: WEEKDAYS_9_TO_5,
    },
  );

  const services = {
    travel: "e3333333-3333-4333-8333-000000000003",
    childVaccine: "e4444444-4444-4444-8444-000000000004",
    flu: "e5555555-5555-4555-8555-000000000005",
    skin: "e6666666-6666-4666-8666-000000000006",
  };
  db.services.push(
    {
      id: services.travel,
      clinic_id: CLINIC_A,
      name: "Travel vaccines",
      duration_minutes: 30,
      price_cents: 9500,
      currency: "USD",
      is_active: true,
    },
    {
      id: services.childVaccine,
      clinic_id: CLINIC_B,
      name: "Child vaccination",
      duration_minutes: 20,
      price_cents: 6000,
      currency: "USD",
      is_active: true,
    },
    {
      id: services.flu,
      clinic_id: CLINIC_B,
      name: "Flu shot",
      duration_minutes: 15,
      price_cents: 3500,
      currency: "USD",
      is_active: true,
    },
    {
      id: services.skin,
      clinic_id: clinicC,
      name: "Skin check",
      duration_minutes: 30,
      price_cents: 14000,
      currency: "USD",
      is_active: true,
    },
  );

  const durations = new Map(db.services.map((service) => [service.id, service.duration_minutes]));
  const patientIds = [PATIENT_USER, ...patients.map((patient) => patient.id)];
  // [days from now, hour UTC, clinic, clinician, service, patient index, status, cancel reason]
  const rows: [
    number,
    number,
    string,
    string,
    string,
    number,
    AppointmentOut["status"],
    string | null,
  ][] = [
    // Pat Patient (the demo sign-in) — one booking in every status.
    [1, 17, CLINIC_A, CLINICIAN_1, SERVICE_30, 0, "CONFIRMED", null],
    [2, 18, CLINIC_A, CLINICIAN_1, SERVICE_60, 0, "REQUESTED", null],
    [4, 16, CLINIC_A, clinicianIds.chen, services.travel, 0, "CONFIRMED", null],
    [-2, 17, CLINIC_A, CLINICIAN_1, SERVICE_30, 0, "COMPLETED", null],
    [-5, 19, CLINIC_A, CLINICIAN_1, SERVICE_60, 0, "CANCELLED", "Rescheduled by the patient"],
    [-9, 16, CLINIC_A, CLINICIAN_1, SERVICE_30, 0, "NO_SHOW", null],
    // Other patients, so the clinician calendar and the admin views have a real week in them.
    [0, 17, CLINIC_A, CLINICIAN_1, SERVICE_30, 1, "CONFIRMED", null],
    [0, 19, CLINIC_A, CLINICIAN_1, SERVICE_60, 2, "CONFIRMED", null],
    [1, 20, CLINIC_A, CLINICIAN_1, SERVICE_30, 3, "REQUESTED", null],
    [2, 16, CLINIC_A, clinicianIds.chen, services.travel, 4, "CONFIRMED", null],
    [3, 17, CLINIC_A, CLINICIAN_1, SERVICE_30, 2, "CONFIRMED", null],
    [3, 21, CLINIC_A, CLINICIAN_1, SERVICE_30, 1, "REQUESTED", null],
    [5, 18, CLINIC_A, CLINICIAN_1, SERVICE_60, 4, "CONFIRMED", null],
    [1, 16, CLINIC_B, clinicianIds.haddad, services.childVaccine, 3, "CONFIRMED", null],
    [2, 20, CLINIC_B, clinicianIds.haddad, services.flu, 1, "CONFIRMED", null],
    [3, 16, clinicC, clinicianIds.novak, services.skin, 2, "REQUESTED", null],
    [-1, 18, CLINIC_A, CLINICIAN_1, SERVICE_30, 3, "COMPLETED", null],
    [-1, 20, CLINIC_B, clinicianIds.haddad, services.flu, 4, "COMPLETED", null],
    [-3, 17, clinicC, clinicianIds.novak, services.skin, 1, "CANCELLED", "Clinician unavailable"],
  ];
  rows.forEach(([days, hour, clinicId, clinicianId, serviceId, who, status, reason], index) => {
    db.appointments.push({
      id: `99999999-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
      clinic_id: clinicId,
      clinician_id: clinicianId,
      service_id: serviceId,
      patient_id: patientIds[who] ?? PATIENT_USER,
      status,
      cancellation_reason: reason,
      version: status === "REQUESTED" ? 1 : 2,
      ...demoSlot(days, hour, durations.get(serviceId) ?? 30),
    });
  });

  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  const devices = {
    ward: "f3333333-3333-4333-8333-000000000003",
    riverside: "f4444444-4444-4444-8444-000000000004",
    northside: "f5555555-5555-4555-8555-000000000005",
  };
  db.devices.push(
    {
      id: devices.ward,
      clinic_id: CLINIC_A,
      firmware_version: "1.4.2",
      hardware_version: "rev-c",
      location_label: "Medication fridge — ward 2",
      last_seen_at: minutesAgo(1),
      status: "ACTIVE",
    },
    {
      id: devices.riverside,
      clinic_id: CLINIC_B,
      firmware_version: "1.4.1",
      hardware_version: "rev-b",
      location_label: "Vaccine fridge — Riverside",
      last_seen_at: minutesAgo(2),
      status: "ACTIVE",
    },
    {
      id: devices.northside,
      clinic_id: clinicC,
      firmware_version: "1.4.2",
      hardware_version: "rev-c",
      location_label: "Pharmacy fridge — Northside",
      last_seen_at: minutesAgo(1),
      status: "ACTIVE",
    },
  );
  db.baselineC.set(devices.ward, 5.2).set(devices.riverside, 3.8).set(devices.northside, 4.4);

  db.excursions.push({
    id: "a3333333-3333-4333-8333-000000000003",
    device_id: devices.riverside,
    direction: "high",
    started_at: minutesAgo(3 * 24 * 60),
    ended_at: minutesAgo(3 * 24 * 60 - 25),
    peak_temperature_c: 8.9,
    acknowledged_at: minutesAgo(3 * 24 * 60 - 40),
    acknowledged_by: "clinician@aurora.test",
  });

  // The small seed's "appointment.confirmed" entry names an appointment the tests never create;
  // point it at a real demo booking so the demo's audit log has no dangling id.
  const seededConfirm = db.auditLog.find((entry) => entry.action === "appointment.confirmed");
  if (seededConfirm !== undefined) {
    seededConfirm.entity_id = "99999999-2222-4222-8222-000000000007";
  }

  const ADMIN_USER = "33333333-3333-4333-8333-333333333333";
  let auditSeq = 10;
  const audit = (
    minutes: number,
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    after: Record<string, unknown> | null,
  ) => {
    auditSeq += 1;
    db.auditLog.push({
      id: `b9999999-9999-4999-8999-${String(auditSeq).padStart(12, "0")}`,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      before: null,
      after,
      created_at: minutesAgo(minutes),
    });
  };
  audit(
    20,
    PATIENT_USER,
    "appointment.requested",
    "appointment",
    "99999999-2222-4222-8222-000000000002",
    { status: "REQUESTED" },
  );
  audit(
    95,
    CLINICIAN_USER,
    "appointment.confirmed",
    "appointment",
    "99999999-2222-4222-8222-000000000001",
    { status: "CONFIRMED" },
  );
  audit(6 * 60, ADMIN_USER, "service.created", "service", services.skin, { name: "Skin check" });
  audit(26 * 60, ADMIN_USER, "clinic.created", "clinic", clinicC, { name: "Aurora Northside" });
  audit(27 * 60, ADMIN_USER, "user.created", "user", novak.id, { role: "CLINICIAN" });
  audit(
    3 * 24 * 60 - 40,
    CLINICIAN_USER,
    "excursion.acknowledged",
    "excursion",
    "a3333333-3333-4333-8333-000000000003",
    null,
  );
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

  // Working hours are wall-clock times in the clinic's zone, as the real API treats them (API ADR
  // 0003). Building them in the browser's zone shifted every slot by the viewer's UTC offset.
  const timeZone =
    db.clinics.find((clinic) => clinic.id === clinician.clinic_id)?.timezone ?? "UTC";
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
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
    const start = zonedWallTimeToUtc(day, window.start, timeZone);
    const end = zonedWallTimeToUtc(day, window.end, timeZone);
    for (
      let cursor = new Date(start);
      cursor.getTime() + service.duration_minutes * 60_000 <= end.getTime();
      cursor = new Date(cursor.getTime() + step * 60_000)
    ) {
      if (db.hidePastSlots && cursor.getTime() < Date.now()) continue;
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
    // Gentle wave around the baseline, with an afternoon excursion spike for the active device.
    const wave = (db.baselineC.get(deviceId) ?? 4.5) + Math.sin(index / 4) * 0.6;
    const spike = deviceId === DEVICE_ACTIVE && index > 30 && index < 36 ? 4.5 : 0;
    return {
      bucket_start: bucketStart,
      value: Math.round((wave + spike) * 100) / 100,
      sample_count: 12,
    };
  });
  return { device_id: deviceId, agg, bucket_seconds: bucketSeconds, points };
}
