import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { scenarios } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { loginAs, renderApp } from "@/test/utils";

describe("clinics admin", () => {
  beforeEach(async () => {
    await loginAs("admin@aurora.test");
  });

  it("lists seeded clinics", async () => {
    renderApp("/admin/clinics");
    expect(await screen.findByText("Aurora Downtown")).toBeInTheDocument();
    expect(screen.getByText("Aurora Riverside")).toBeInTheDocument();
  });

  it("creates a clinic and shows it in the table", async () => {
    renderApp("/admin/clinics");
    await userEvent.click(await screen.findByRole("button", { name: /new clinic/i }));

    await userEvent.type(screen.getByLabelText(/name/i), "Aurora Uptown");
    await userEvent.type(screen.getByLabelText(/address/i), "5 Hill Rd");
    await userEvent.type(screen.getByLabelText(/timezone/i), "America/New_York");
    await userEvent.click(screen.getByRole("button", { name: /create clinic/i }));

    expect(await screen.findByText("Aurora Uptown")).toBeInTheDocument();
  });

  it("shows client-side validation errors from Zod", async () => {
    renderApp("/admin/clinics");
    await userEvent.click(await screen.findByRole("button", { name: /new clinic/i }));
    // Submit empty -> zod required messages.
    await userEvent.click(screen.getByRole("button", { name: /create clinic/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });
});

describe("audit log", () => {
  beforeEach(async () => {
    await loginAs("admin@aurora.test");
  });

  it("lists seeded audit entries", async () => {
    renderApp("/admin/audit");
    expect(await screen.findByText("appointment.confirmed")).toBeInTheDocument();
    expect(screen.getByText("device.provisioned")).toBeInTheDocument();
  });

  it("filters by entity type", async () => {
    renderApp("/admin/audit");
    await screen.findByText("appointment.confirmed");

    await userEvent.selectOptions(screen.getByLabelText(/entity type/i), "device");
    await userEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(await screen.findByText("device.provisioned")).toBeInTheDocument();
    expect(screen.queryByText("appointment.confirmed")).not.toBeInTheDocument();
  });

  it("renders a designed empty state", async () => {
    server.use(scenarios.auditEmpty());
    renderApp("/admin/audit");
    expect(await screen.findByText(/no audit entries/i)).toBeInTheDocument();
  });

  it("renders an error state with retry", async () => {
    server.use(scenarios.auditError());
    renderApp("/admin/audit");
    // The query client retries once, so allow for the retry backoff.
    const region = await screen.findByText(/something went wrong/i, {}, { timeout: 4000 });
    expect(region).toBeInTheDocument();
  });
});
