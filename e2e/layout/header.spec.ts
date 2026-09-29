import { test, expect, type Page } from "@playwright/test";

import { seedSession } from "../support/helpers";

/**
 * Header layout at desktop widths: the brand and every nav link stay on one line, and neither the
 * header nor the nav row has to scroll sideways. From 1280px the nav sits in the header row; below
 * that it gets its own row.
 *
 * Why this exists: with an admin's six nav items the header used to squeeze its flex children at
 * 1280px, wrapping "Aurora Clinic" and "Cold chain" onto two lines. The visual baselines captured
 * that state as correct, so they could not catch it; this test asserts the rule directly.
 */

// One line of 14px text in a nav link is ~20px; two lines would be ~40px.
const ONE_LINE_MAX_PX = 28;

const WIDTHS = [1024, 1280, 1440];

async function lineHeightOf(page: Page, selector: string): Promise<number[]> {
  return page.locator(selector).evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => {
        // Height of the text itself, not the padded link box.
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect().height;
      }),
  );
}

for (const width of WIDTHS) {
  test(`admin header fits on one line at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seedSession(page, "PLATFORM_ADMIN");
    await page.goto("/admin/clinics");
    await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();

    const header = page.locator("header");
    const nav = header.locator("nav:visible");
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole("link", { name: "Cold chain" })).toBeVisible();

    for (const height of await lineHeightOf(page, "header nav:visible a, header > div > a")) {
      expect(height, "a header label wrapped onto a second line").toBeLessThanOrEqual(
        ONE_LINE_MAX_PX,
      );
    }

    const headerOverflow = await header.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(headerOverflow, "the header scrolls horizontally").toBeLessThanOrEqual(0);
    const navOverflow = await nav.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(navOverflow, "the nav row has to scroll to show every link").toBeLessThanOrEqual(0);
  });
}
