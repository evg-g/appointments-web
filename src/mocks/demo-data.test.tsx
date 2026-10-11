import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { db, seedDemoData } from "@/mocks/db";
import { loginAs, renderApp } from "@/test/utils";

/**
 * Rows shown on /appointments across every tab. Upcoming, Past and Cancelled split the list with no
 * overlap (Needs action, staff only, repeats rows from Upcoming and Past, so it is not counted).
 * Each row has one link to its appointment.
 */
async function rowsAcrossTabs(): Promise<number> {
  await screen.findByRole("tablist", { name: "Appointments" });
  let total = 0;
  for (const name of [/^Upcoming/, /^Past/, /^Cancelled/]) {
    await userEvent.click(screen.getByRole("tab", { name }));
    const panel = screen.getByRole("tabpanel");
    total += within(panel).queryAllByRole("link", { name: /^\d{2}:\d{2} [AP]M/ }).length;
  }
  return total;
}

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
    expect(await rowsAcrossTabs()).toBe(own);
  });

  it("shows a clinician only their clinic's bookings", async () => {
    seedDemoData();
    const downtown = db.appointments.filter(
      (appointment) => appointment.clinic_id === "c1111111-1111-4111-8111-000000000001",
    ).length;

    await loginAs("clinician@aurora.test");
    renderApp("/appointments");
    expect(await rowsAcrossTabs()).toBe(downtown);
  });
});
