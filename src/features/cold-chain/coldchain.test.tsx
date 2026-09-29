import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { scenarios } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { loginAs, renderApp } from "@/test/utils";

describe("cold-chain dashboard", () => {
  beforeEach(async () => {
    await loginAs("admin@aurora.test");
  });

  it("lists devices and renders the selected device's chart", async () => {
    renderApp("/cold-chain");
    expect(
      await screen.findByRole("button", { name: /vaccine fridge — main/i }),
    ).toBeInTheDocument();
    // The temperature chart is exposed as an accessible image.
    expect(await screen.findByRole("img", { name: /temperature for/i })).toBeInTheDocument();
  });

  it("acknowledges an open excursion", async () => {
    renderApp("/cold-chain");
    const ackButton = await screen.findByRole("button", { name: /^acknowledge$/i });
    await userEvent.click(ackButton);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^acknowledge$/i })).not.toBeInTheDocument();
    });
  });

  it("shows an error when acknowledging fails", async () => {
    renderApp("/cold-chain");
    const ackButton = await screen.findByRole("button", { name: /^acknowledge$/i });

    server.use(scenarios.acknowledgeFails());
    await userEvent.click(ackButton);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not acknowledge/i);
  });

  it("shows a designed empty state when there are no devices", async () => {
    server.use(scenarios.devicesEmpty());
    renderApp("/cold-chain");
    expect(await screen.findByText(/no devices/i)).toBeInTheDocument();
  });
});
