import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatDateTime } from "@/lib/datetime";
import { db, seedDemoData } from "@/mocks/db";
import { scenarios } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { loginAs, renderApp } from "@/test/utils";

describe("dashboard upcoming appointments", () => {
  it("shows the soonest bookings, not the furthest-out ones", async () => {
    // More future bookings than the card shows: the newest-first list would put the
    // furthest-out ones on its first page.
    seedDemoData();
    const soonest = db.appointments
      .filter((a) => a.status !== "CANCELLED" && new Date(a.starts_at).getTime() > Date.now())
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    if (soonest === undefined) throw new Error("demo data has no future booking");

    await loginAs("admin@aurora.test");
    renderApp("/");
    const firstRow = (await screen.findAllByRole("link", { name: /\d{4}/ }))[0];
    // Shown in the clinic's zone (spec §2), not the test runtime's UTC.
    const timeZone = db.clinics.find((c) => c.id === soonest.clinic_id)?.timezone;
    expect(firstRow).toHaveTextContent(formatDateTime(soonest.starts_at, timeZone));
  });
});

describe("dashboard cold-chain card", () => {
  it("lists each fridge with its latest temperature and open excursions", async () => {
    await loginAs("clinician@aurora.test");
    renderApp("/");

    const list = await screen.findByRole("list", { name: /fridge sensors/i });
    const main = (await within(list).findByText("Vaccine fridge — main")).closest("li");
    const annex = within(list).getByText("Vaccine fridge — annex").closest("li");
    if (main === null || annex === null) throw new Error("device rows not rendered");

    expect(await within(main).findByText("4.6 °C")).toBeInTheDocument();
    expect(within(main).getByText("1 open excursion")).toBeInTheDocument();
    expect(await within(annex).findByText("Not reporting yet")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /open cold chain/i }).length).toBeGreaterThan(0);
  });

  it("shows a designed empty state when no sensors are registered", async () => {
    server.use(scenarios.devicesEmpty());
    await loginAs("clinician@aurora.test");
    renderApp("/");
    expect(await screen.findByText(/no fridge sensors yet/i)).toBeInTheDocument();
  });

  it("is not shown to patients", async () => {
    await loginAs("patient@aurora.test");
    renderApp("/");
    expect(await screen.findByText("Your care team")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /fridge sensors/i })).not.toBeInTheDocument();
  });
});
