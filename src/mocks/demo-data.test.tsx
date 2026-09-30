import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { db, seedDemoData } from "@/mocks/db";
import { loginAs, renderApp } from "@/test/utils";

// The opt-in demo dataset (VITE_MSW_DEMO_DATA) must stay believable: the mock scopes the list the
// way the real API does, so the extra patients' bookings never leak into the patient's own view.
describe("demo dataset", () => {
  it("shows a patient only their own bookings", async () => {
    seedDemoData();
    const own = db.appointments.filter(
      (appointment) => appointment.patient_id === "11111111-1111-4111-8111-111111111111",
    ).length;
    expect(db.appointments.length).toBeGreaterThan(own);

    await loginAs("patient@aurora.test");
    renderApp("/appointments");
    const table = await screen.findByRole("table");
    const bodyRows = (await within(table).findAllByRole("row")).slice(1);
    expect(bodyRows).toHaveLength(own);
  });

  it("shows a clinician only their clinic's bookings", async () => {
    seedDemoData();
    const downtown = db.appointments.filter(
      (appointment) => appointment.clinic_id === "c1111111-1111-4111-8111-000000000001",
    ).length;

    await loginAs("clinician@aurora.test");
    renderApp("/appointments");
    const table = await screen.findByRole("table");
    const bodyRows = (await within(table).findAllByRole("row")).slice(1);
    expect(bodyRows).toHaveLength(downtown);
  });
});
