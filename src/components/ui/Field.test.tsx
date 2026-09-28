import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/utils";

import { Field } from "./Field";
import { Input } from "./Input";

describe("Field", () => {
  it("associates the label with the control", () => {
    renderWithProviders(
      <Field label="Email">
        <Input />
      </Field>,
    );

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("marks the control invalid and describes the error", () => {
    renderWithProviders(
      <Field label="Email" error="Enter a valid email address">
        <Input />
      </Field>,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    const description = document.getElementById(describedBy ?? "");
    expect(description).toHaveTextContent("Enter a valid email address");
  });
});
