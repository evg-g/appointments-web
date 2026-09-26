import { render, screen } from "@testing-library/react";

import { App } from "./App";

describe("App", () => {
  it("renders the product name as a heading", () => {
    // Arrange / Act
    render(<App />);

    // Assert: query by role, not by test id or class — this is what a user perceives.
    expect(screen.getByRole("heading", { name: /aurora clinic/i })).toBeInTheDocument();
  });

  it("describes what the product does", () => {
    render(<App />);

    expect(screen.getByText(/cold-chain monitoring/i)).toBeInTheDocument();
  });
});
