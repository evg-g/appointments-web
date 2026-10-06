import { bootScenario, seedSession } from "../../support/helpers";
import { expect, test } from "../../support/fixtures";

// AURORA-1: the dashboard's cold-chain card shows each fridge sensor's current state, so staff
// can spot a problem without opening the cold-chain page. Data: the two seeded devices in
// src/mocks/db.ts (the active "main" fridge with one open excursion, the provisioned "annex").

test.describe("AURORA-1 dashboard cold-chain card", () => {
  test("shows each fridge with its temperature and alert state", async ({ page, dashboard }) => {
    const card = dashboard.coldChain;

    await test.step("Open the dashboard as a clinician", async () => {
      await seedSession(page, "CLINICIAN");
      await dashboard.goto();
      await expect(dashboard.welcome("Casey")).toBeVisible();
      await expect(card.heading).toBeVisible();
    });

    await test.step("AC1: one row per fridge sensor, by location label", async () => {
      await expect(card.sensors()).toHaveCount(2);
      await expect(card.sensor("Vaccine fridge — main")).toHaveCount(1);
      await expect(card.sensor("Vaccine fridge — annex")).toHaveCount(1);
    });

    await test.step("AC2 + AC3: the active fridge shows its temperature and the open excursion", async () => {
      const main = card.sensor("Vaccine fridge — main");
      await expect(main.getByText("4.6 °C", { exact: true })).toBeVisible();
      await expect(main.getByText("1 open excursion", { exact: true })).toBeVisible();
    });

    await test.step("AC3: the provisioned fridge is not reporting and shows no temperature", async () => {
      const annex = card.sensor("Vaccine fridge — annex");
      await expect(annex.getByText("Not reporting yet", { exact: true })).toBeVisible();
      await expect(annex.getByText(/°C/)).toHaveCount(0);
    });
  });

  test("Open cold chain takes you to the cold-chain page", async ({ page, dashboard }) => {
    await test.step("Open the dashboard as a clinician", async () => {
      await seedSession(page, "CLINICIAN");
      await dashboard.goto();
      await expect(dashboard.coldChain.sensorList).toBeVisible();
    });

    await test.step("AC4: follow the card's action", async () => {
      await dashboard.coldChain.openColdChainLink.click();
      await expect(page).toHaveURL(/\/cold-chain$/);
      await expect(page.getByRole("heading", { level: 1, name: "Cold chain" })).toBeVisible();
    });
  });

  test("patients do not see the card", async ({ page, dashboard }) => {
    await test.step("Open the dashboard as a patient", async () => {
      await seedSession(page, "PATIENT");
      await dashboard.goto();
      // Premise: the patient's dashboard has rendered its second card.
      await expect(dashboard.cardHeading("Your care team")).toBeVisible();
    });

    await test.step("AC5: no cold-chain card or sensor list", async () => {
      await expect(dashboard.coldChain.heading).toHaveCount(0);
      await expect(dashboard.coldChain.sensorList).toHaveCount(0);
    });
  });

  test("the card has a designed error state with retry", async ({ page, dashboard }) => {
    const card = dashboard.coldChain;

    await test.step("Open the dashboard as an admin while the devices endpoint fails", async () => {
      await bootScenario(page, "devicesError");
      await seedSession(page, "PLATFORM_ADMIN");
      await dashboard.goto();
      await expect(card.heading).toBeVisible();
    });

    await test.step("The card shows an error with a retry action, not an empty list", async () => {
      // Reads retry once before the error shows (src/app/query-client.ts), so allow extra time.
      await expect(card.errorAlert).toBeVisible({ timeout: 15_000 });
      await expect(card.errorAlert.getByRole("button", { name: "Try again" })).toBeVisible();
      await expect(card.sensorList).toHaveCount(0);
    });
  });
});
