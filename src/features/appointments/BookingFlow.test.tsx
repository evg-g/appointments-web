import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { scenarios } from "@/mocks/handlers";
import { CLINIC_A, CLINICIAN_1, SERVICE_30 } from "@/mocks/db";
import { server } from "@/mocks/server";
import { loginAs, renderApp } from "@/test/utils";

// A Monday inside the seeded clinician's working hours, so availability is non-empty.
const BOOKABLE_MONDAY = "2026-01-05";

async function advanceToConfirm(): Promise<void> {
  const user = userEvent.setup();

  await user.selectOptions(await screen.findByLabelText("Clinic"), CLINIC_A);
  await user.click(screen.getByRole("button", { name: /next/i }));

  await user.selectOptions(await screen.findByLabelText("Service"), SERVICE_30);
  await user.click(screen.getByRole("button", { name: /next/i }));

  await user.selectOptions(await screen.findByLabelText("Clinician"), CLINICIAN_1);
  await user.click(screen.getByRole("button", { name: /next/i }));

  fireEvent.change(await screen.findByLabelText("Day"), { target: { value: BOOKABLE_MONDAY } });
  const slots = await screen.findAllByRole("option", { name: /\d{2}:\d{2}/ });
  await user.click(slots[0]!);
  await user.click(screen.getByRole("button", { name: /next/i }));

  await screen.findByRole("button", { name: /confirm booking/i });
}

describe("booking flow", () => {
  beforeEach(async () => {
    await loginAs("patient@aurora.test");
  });

  it("books an appointment and lands on its detail page", async () => {
    renderApp("/appointments/new");
    await advanceToConfirm();

    await userEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    // Navigates to the new appointment's detail page (status starts REQUESTED).
    expect(await screen.findByText(/requested/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /appointment/i })).toBeInTheDocument();
  });

  it("surfaces a 409 conflict and does not navigate away", async () => {
    renderApp("/appointments/new");
    await advanceToConfirm();

    server.use(scenarios.bookingConflict());
    await userEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(await screen.findByText(/could not book/i)).toBeInTheDocument();
    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument();
    // Still on the confirm step.
    expect(screen.getByRole("button", { name: /confirm booking/i })).toBeInTheDocument();
  });
});
