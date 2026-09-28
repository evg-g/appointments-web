import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/utils";

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("offers light, dark, and system", () => {
    renderWithProviders(<ThemeToggle />, { initialTheme: "system" });
    const group = screen.getByRole("group", { name: /color theme/i });

    expect(within(group).getAllByRole("button")).toHaveLength(3);
    expect(within(group).getByRole("button", { name: /system/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("selecting dark applies and persists the theme", async () => {
    renderWithProviders(<ThemeToggle />, { initialTheme: "system" });

    await userEvent.click(screen.getByRole("button", { name: /dark/i }));

    expect(screen.getByRole("button", { name: /dark/i })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("aurora.theme")).toBe("dark");
  });
});
