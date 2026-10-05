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

// The full four-step wizard plus submit is the longest journey in the suite; under a loaded
// machine it can pass Vitest's default 5s per-test limit, so it gets its own ceiling.
describe("booking flow", { timeout: 15_000 }, () => {
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

  it("shows slots in the clinic's time zone, the same time as the confirm step", async () => {
    // The runtime is UTC (vite.config.ts) and the clinic is in Los Angeles, so a slot rendered in
    // the browser's zone would read 8 hours off from the confirm step.
    const user = userEvent.setup();
    renderApp("/appointments/new");

    await user.selectOptions(await screen.findByLabelText("Clinic"), CLINIC_A);
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.selectOptions(await screen.findByLabelText("Service"), SERVICE_30);
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.selectOptions(await screen.findByLabelText("Clinician"), CLINICIAN_1);
    await user.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(await screen.findByLabelText("Day"), { target: { value: BOOKABLE_MONDAY } });

    const first = (await screen.findAllByRole("option", { name: /\d{2}:\d{2}/ }))[0]!;
    expect(first).toHaveTextContent(/09:00/);
    expect(screen.getByText(/clinic's time zone \(PST\)/i)).toBeInTheDocument();

    await user.click(first);
    await user.click(screen.getByRole("button", { name: /next/i }));
    // The confirm step names the clinic's zone, so a time is never read as the viewer's.
    expect(await screen.findByText(/09:00\s*[AP]?M?\s*–.*PST/)).toBeInTheDocument();
  });

  it("books a second appointment after viewing the first one", async () => {
    // Landing on the first booking's detail page caches a detail query under the same
    // "appointments" prefix; the optimistic update used to treat it as a list and throw.
    renderApp("/appointments/new");
    await advanceToConfirm();
    await userEvent.click(screen.getByRole("button", { name: /confirm booking/i }));
    expect(await screen.findByText(/requested/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: /all appointments/i }));
    await userEvent.click(await screen.findByRole("link", { name: /book/i }));
    await advanceToConfirm();
    await userEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(await screen.findByText(/requested/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not book/i)).not.toBeInTheDocument();
  });
});
