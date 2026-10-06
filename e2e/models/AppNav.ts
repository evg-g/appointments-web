import type { Locator, Page } from "@playwright/test";

/**
 * The top navigation every signed-in page shares. Navigating through it (not `page.goto`) keeps the
 * single-page app and its in-browser mock backend alive, so data created earlier in a test survives.
 */
export class AppNav {
  constructor(private readonly page: Page) {}

  link(name: "Dashboard" | "Appointments" | "Calendar" | "Cold chain" | "Admin"): Locator {
    return this.page.getByRole("link", { name, exact: true }).first();
  }

  async openDashboard(): Promise<void> {
    await this.link("Dashboard").click();
  }

  async openAppointments(): Promise<void> {
    await this.link("Appointments").click();
  }
}
