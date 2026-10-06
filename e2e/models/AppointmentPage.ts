import { expect, type Locator, type Page } from "@playwright/test";

/** One appointment at /appointments/:id: date, time, status, and the staff actions. */
export class AppointmentPage {
  readonly heading: Locator;
  readonly allAppointmentsLink: Locator;
  readonly markConfirmedButton: Locator;
  readonly cancelButton: Locator;
  readonly reason: Locator;
  readonly confirmCancellationButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { level: 1, name: "Appointment" });
    this.allAppointmentsLink = page.getByRole("link", { name: /all appointments/i });
    this.markConfirmedButton = page.getByRole("button", { name: "Mark confirmed" });
    this.cancelButton = page.getByRole("button", { name: "Cancel appointment" });
    this.reason = page.getByLabel("Reason");
    this.confirmCancellationButton = page.getByRole("button", { name: "Confirm cancellation" });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await this.page.waitForURL(/\/appointments\/[^/]+$/);
  }

  /** The path of the open appointment, e.g. "/appointments/<id>". */
  path(): string {
    return new URL(this.page.url()).pathname;
  }

  /** A status badge such as "Requested" or "Cancelled". */
  status(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }

  /** Any text on the page, e.g. the time range "12:20 PM–12:50 PM PST". */
  text(value: RegExp | string): Locator {
    return this.page.getByText(value);
  }

  async markConfirmed(): Promise<void> {
    await this.markConfirmedButton.click();
  }

  async cancel(reason: string): Promise<void> {
    await this.cancelButton.click();
    await this.reason.fill(reason);
    await this.confirmCancellationButton.click();
  }
}
