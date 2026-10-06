import { expect, type Locator, type Page } from "@playwright/test";

/** The sign-in form at /login. */
export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly signInButton: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByLabel("Email");
    this.password = page.getByLabel("Password");
    this.signInButton = page.getByRole("button", { name: "Sign in" });
  }

  /** Open the form. `path` lets the live-demo build pass its sub-path (e.g. "/appointments-web/"). */
  async goto(path = "/login"): Promise<void> {
    await this.page.goto(path);
    await expect(this.signInButton).toBeVisible();
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.signInButton.click();
  }

  /** A form-level error, e.g. "Invalid email or password". */
  error(text: RegExp | string): Locator {
    return this.page.getByText(text);
  }
}
