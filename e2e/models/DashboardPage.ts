import { expect, type Locator, type Page } from "@playwright/test";

/** The dashboard at /: greeting, upcoming appointments, and the staff-only cold-chain card. */
export class DashboardPage {
  readonly coldChain: ColdChainCard;

  constructor(private readonly page: Page) {
    this.coldChain = new ColdChainCard(page);
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  /** The "Welcome, <first name>" heading; any name when `firstName` is omitted. */
  welcome(firstName?: string): Locator {
    const name = firstName === undefined ? /Welcome,/ : new RegExp(`Welcome, ${firstName}`);
    return this.page.getByRole("heading", { level: 1, name });
  }

  async expectLoaded(firstName?: string): Promise<void> {
    await expect(this.welcome(firstName)).toBeVisible();
  }

  /** A card heading such as "Your care team". */
  cardHeading(name: string): Locator {
    return this.page.getByRole("heading", { name });
  }
}

/** The "Cold-chain status" card: one row per fridge sensor (AURORA-1). */
export class ColdChainCard {
  readonly heading: Locator;
  readonly sensorList: Locator;
  readonly openColdChainLink: Locator;
  /** The card's designed error state, with its "Try again" action. */
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "Cold-chain status" });
    this.sensorList = page.getByRole("list", { name: "Fridge sensors" });
    this.openColdChainLink = page.getByRole("link", { name: "Open cold chain" });
    this.errorAlert = page.getByRole("alert").filter({ hasText: "Something went wrong" });
  }

  sensors(): Locator {
    return this.sensorList.getByRole("listitem");
  }

  sensor(label: string): Locator {
    return this.sensors().filter({ hasText: label });
  }
}
