// Runs before every test file. Adds jest-dom matchers (toBeInTheDocument, etc.) and cleans
// up the DOM between tests so state never leaks from one test into the next.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
