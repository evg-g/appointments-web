import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { api } from "@/api/client";
import { CLINIC_A, CLINICIAN_1, SERVICE_30 } from "@/mocks/db";
import { problem } from "@/mocks/data";
import { scenarios } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { loginAs, renderApp } from "@/test/utils";

async function createAppointment(): Promise<string> {
  const res = await api.POST("/api/v1/appointments", {
    body: {
      clinic_id: CLINIC_A,
      clinician_id: CLINICIAN_1,
      service_id: SERVICE_30,
      starts_at: "2026-01-05T09:00:00Z",
    },
  });
  if (res.data === undefined) throw new Error("appointment create failed");
  return res.data.id;
}

describe("appointment list", () => {
  beforeEach(async () => {
    await loginAs("clinician@aurora.test");
  });

  it("shows a designed empty state with a booking action", async () => {
    server.use(scenarios.appointmentsEmpty());
    renderApp("/appointments");
    expect(await screen.findByText(/no appointments yet/i)).toBeInTheDocument();
    // Both the header action and the empty-state action offer booking.
    expect(screen.getAllByRole("link", { name: /book appointment/i }).length).toBeGreaterThan(0);
  });

  it("shows an error state with retry when the list fails", async () => {
    server.use(scenarios.appointmentsError());
    renderApp("/appointments");
    // The query client retries once, so allow for the retry backoff.
    expect(
      await screen.findByText(/something went wrong/i, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});

describe("appointment detail transitions", () => {
  beforeEach(async () => {
    await loginAs("clinician@aurora.test");
  });

  it("confirms an appointment via the transition endpoint", async () => {
    const id = await createAppointment();
    renderApp(`/appointments/${id}`);

    await userEvent.click(await screen.findByRole("button", { name: /mark confirmed/i }));
    expect(await screen.findByText("Confirmed")).toBeInTheDocument();
  });

  it("cancels an appointment with a reason", async () => {
    const id = await createAppointment();
    renderApp(`/appointments/${id}`);

    await userEvent.click(await screen.findByRole("button", { name: /cancel appointment/i }));
    await userEvent.type(screen.getByLabelText(/reason/i), "patient reschedule");
    await userEvent.click(screen.getByRole("button", { name: /confirm cancellation/i }));

    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
  });

  it("surfaces a 412 stale-precondition error", async () => {
    const id = await createAppointment();
    server.use(
      http.post("/api/v1/appointments/:appointment_id/transition", () =>
        HttpResponse.json(problem(412, "Precondition Failed", "The record was modified."), {
          status: 412,
        }),
      ),
    );
    renderApp(`/appointments/${id}`);

    await userEvent.click(await screen.findByRole("button", { name: /mark confirmed/i }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/modified/i)).toBeInTheDocument();
  });
});
