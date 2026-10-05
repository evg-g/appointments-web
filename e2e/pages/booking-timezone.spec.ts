import { expect, test } from "@playwright/test";

/**
 * The live demo, from a viewer in Israel (docs/tickets/BOOKING-TIMEZONE.md in the aurora repo).
 * The demo dataset lives on the real clock, so the clock is fixed here: Monday 2026-10-05 at 10:00
 * in Los Angeles, where the demo clinics are. Runs against the Pages build
 * (playwright.pages.config.ts).
 */
const BASE = "/appointments-web/";
const NOW = new Date("2026-10-05T17:00:00Z"); // 10:00 PDT, 20:00 in Israel
const TODAY = "2026-10-05";

test.use({ timezoneId: "Asia/Jerusalem", locale: "en-US" });

/** "09:40 AM" -> minutes after midnight. */
function minutes(label: string): number {
  const match = /^(\d{2}):(\d{2}) ([AP])M$/.exec(label.trim());
  if (match === null) throw new Error(`not a slot time: ${label}`);
  const [, hh = "0", mm = "0", half] = match;
  return ((Number(hh) % 12) + (half === "P" ? 12 : 0)) * 60 + Number(mm);
}

test("the demo offers only slots that have not started, in the clinic's zone", async ({ page }) => {
  await page.clock.setFixedTime(NOW);

  await test.step("Sign in to the demo", async () => {
    await page.goto(BASE);
    await page.getByLabel("Email").fill("admin@aurora.test");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Welcome,/ })).toBeVisible();
  });

  await test.step("The dashboard labels appointment times with the clinic's zone", async () => {
    await expect(page.getByText(/\w{3} \d+, 2026, \d{2}:\d{2} [AP]M PDT/).first()).toBeVisible();
  });

  await test.step("Today's open slots all start at or after 10:00 AM PDT", async () => {
    await page.getByRole("link", { name: "Appointments" }).first().click();
    await page.getByRole("link", { name: /book/i }).first().click();
    await page.getByLabel("Clinic").selectOption({ label: "Aurora Downtown" });
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Service").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Clinician").selectOption({ label: "General practice" });
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Day").fill(TODAY);
    await expect(page.getByText("Times are in the clinic's time zone (PDT).")).toBeVisible();

    const times = await page.getByRole("option").allInnerTexts();
    expect(times.length).toBeGreaterThan(0);
    for (const time of times) expect(minutes(time), time).toBeGreaterThanOrEqual(10 * 60);
  });

  await test.step("A slot later today books, and Confirm shows its PDT time", async () => {
    const first = page.getByRole("option").first();
    const picked = (await first.innerText()).trim();
    await first.click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(new RegExp(`${picked}–\\d{2}:\\d{2} [AP]M PDT`))).toBeVisible();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Appointment" })).toBeVisible();
  });
});
