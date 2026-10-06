import { expect, type Locator, type Page } from "@playwright/test";

/** What to book. Defaults match the seeded clinic and clinician of both backends. */
export interface BookingChoice {
  clinic?: string;
  /** Option index in the Service select (0 is the placeholder). */
  serviceIndex?: number;
  clinician?: string;
  /** YYYY-MM-DD. */
  day: string;
  /** A slot label such as "12:20 PM"; the first open slot when omitted. */
  time?: string;
}

/** The five-step booking wizard at /appointments/new. */
export class BookingWizardPage {
  readonly heading: Locator;
  readonly clinic: Locator;
  readonly service: Locator;
  readonly clinician: Locator;
  readonly day: Locator;
  readonly slots: Locator;
  readonly timeZoneCaption: Locator;
  readonly nextButton: Locator;
  readonly confirmButton: Locator;
  /** The confirm step's "When" value, e.g. "Oct 6, 2026, 12:20 PM–12:50 PM PDT". */
  readonly when: Locator;
  /** The confirm step's "Could not book" alert. */
  readonly bookingError: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { level: 1, name: "Book an appointment" });
    this.clinic = page.getByLabel("Clinic");
    this.service = page.getByLabel("Service");
    this.clinician = page.getByLabel("Clinician");
    this.day = page.getByLabel("Day");
    this.slots = page.getByRole("option");
    this.timeZoneCaption = page.getByText(/clinic's time zone/i);
    this.nextButton = page.getByRole("button", { name: "Next" });
    this.confirmButton = page.getByRole("button", { name: "Confirm booking" });
    this.when = page.locator("dt", { hasText: "When" }).locator("xpath=following-sibling::dd[1]");
    this.bookingError = page.getByText("Could not book");
  }

  async goto(): Promise<void> {
    await this.page.goto("/appointments/new");
    await expect(this.heading).toBeVisible();
  }

  slot(time: string): Locator {
    return this.page.getByRole("option", { name: time, exact: true });
  }

  /** Fill clinic, service and clinician, then pick `day`: stops on the Time step. */
  async openTimeStep(choice: BookingChoice): Promise<void> {
    await expect(this.heading).toBeVisible();
    await this.clinic.selectOption({ label: choice.clinic ?? "Aurora Downtown" });
    await this.nextButton.click();
    await this.service.selectOption({ index: choice.serviceIndex ?? 1 });
    await this.nextButton.click();
    await this.clinician.selectOption({ label: choice.clinician ?? "General practice" });
    await this.nextButton.click();
    await this.day.fill(choice.day);
    await expect(this.slots.first()).toBeVisible();
  }

  /** On the Time step: pick a slot (the first one by default) and go to Confirm. */
  async pickSlot(time?: string): Promise<string> {
    const slot = time === undefined ? this.slots.first() : this.slot(time);
    const label = (await slot.innerText()).trim();
    await slot.click();
    await this.nextButton.click();
    await expect(this.confirmButton).toBeVisible();
    return label;
  }

  /** Walk every step up to (not clicking) Confirm booking; returns the picked slot's label. */
  async walkToConfirm(choice: BookingChoice): Promise<string> {
    await this.openTimeStep(choice);
    return this.pickSlot(choice.time);
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }
}
