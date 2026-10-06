import { test as base } from "@playwright/test";

import {
  AppNav,
  AppointmentPage,
  AppointmentsListPage,
  BookingWizardPage,
  DashboardPage,
  LoginPage,
} from "../models";

/**
 * Page objects as Playwright fixtures: a spec asks for the pages it uses by name
 * (`async ({ bookingWizard, appointmentPage }) => …`) instead of building them itself. Each is
 * created per test around that test's `page`. (The fixture callback is named `provide`, not the usual
 * `use`, so the React hooks lint rule does not mistake it for React's `use`.)
 */
interface PageObjects {
  nav: AppNav;
  loginPage: LoginPage;
  dashboard: DashboardPage;
  bookingWizard: BookingWizardPage;
  appointmentPage: AppointmentPage;
  appointmentsList: AppointmentsListPage;
}

export const test = base.extend<PageObjects>({
  nav: async ({ page }, provide) => provide(new AppNav(page)),
  loginPage: async ({ page }, provide) => provide(new LoginPage(page)),
  dashboard: async ({ page }, provide) => provide(new DashboardPage(page)),
  bookingWizard: async ({ page }, provide) => provide(new BookingWizardPage(page)),
  appointmentPage: async ({ page }, provide) => provide(new AppointmentPage(page)),
  appointmentsList: async ({ page }, provide) => provide(new AppointmentsListPage(page)),
});

export { expect } from "@playwright/test";
