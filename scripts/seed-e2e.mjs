#!/usr/bin/env node
// Provision the demo graph the composed-stack E2E journeys expect, over the *real* public API.
//
// Why this exists: the milestone-14 Playwright specs (and their support helpers) select data by the
// exact labels the MSW backend seeds — the "Aurora Downtown" clinic, a "General practice"
// clinician, and the patient@aurora.test / clinician@aurora.test / admin@aurora.test accounts. To
// run those same specs against a real API we must give the real backend that same shape. The first
// PLATFORM_ADMIN is bootstrapped directly in the DB by the compose `seed-admin` service; everything
// else is created here through the API, exactly as a real operator would — which also exercises the
// contract end to end.
//
// It is idempotent: if the "Aurora Downtown" clinic already exists it does nothing. The E2E stack
// uses an ephemeral database, so first-run is the normal path.
//
// Usage:  node scripts/seed-e2e.mjs   (E2E_BASE_URL defaults to http://localhost:8080)

// Ordinary domain: the real API validates emails with Pydantic EmailStr, which rejects reserved
// TLDs like `.test`. These match the composed-mode ACCOUNTS in e2e/support/helpers.ts.
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const ADMIN = { email: "admin@aurora-clinic.com", password: "password123" };

const CLINIC_NAME = "Aurora Downtown";
const SPECIALTY = "General practice"; // the booking wizard selects the clinician by this label
const PASSWORD = "password123";

// All week, wide hours, so a bookable future weekday always has slots regardless of the run day.
const WORKING_HOURS = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  start: "06:00:00",
  end: "22:00:00",
}));

async function waitForReady(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(`${BASE}/health/ready`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) throw new Error(`API not ready at ${BASE} within ${timeoutMs}ms`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function call(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return data;
}

async function login(email, password) {
  const body = await call("POST", "/api/v1/auth/login", { body: { email, password } });
  return body.access_token;
}

async function createUser(token, email, fullName, role) {
  const user = await call("POST", "/api/v1/users", {
    token,
    body: { email, full_name: fullName, role, password: PASSWORD },
  });
  return user.id;
}

async function main() {
  await waitForReady();
  const token = await login(ADMIN.email, ADMIN.password);

  const clinics = await call("GET", "/api/v1/clinics?limit=100", { token });
  if (clinics.data.some((c) => c.name === CLINIC_NAME)) {
    console.log(`"${CLINIC_NAME}" already present; nothing to seed.`);
    return;
  }

  // The accounts the specs log in as (their first names drive the "Welcome, <name>" heading).
  await createUser(token, "patient@aurora-clinic.com", "Pat Patient", "PATIENT");
  const clinicianUserId = await createUser(
    token,
    "clinician@aurora-clinic.com",
    "Casey Clinician",
    "CLINICIAN",
  );

  const clinic = await call("POST", "/api/v1/clinics", {
    token,
    body: {
      name: CLINIC_NAME,
      timezone: "UTC",
      address: "1 Downtown Plaza",
      cancellation_cutoff_hours: 24,
    },
  });

  await call("POST", "/api/v1/clinicians", {
    token,
    body: {
      clinic_id: clinic.id,
      user_id: clinicianUserId,
      specialty: SPECIALTY,
      buffer_minutes: 0,
      working_hours: WORKING_HOURS,
    },
  });

  await call("POST", "/api/v1/services", {
    token,
    body: {
      clinic_id: clinic.id,
      name: "Consultation",
      duration_minutes: 30,
      price_cents: 5000,
      currency: "USD",
      is_active: true,
    },
  });

  console.log(
    `Seeded "${CLINIC_NAME}" with a ${SPECIALTY} clinician, a service, and the E2E accounts.`,
  );
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
