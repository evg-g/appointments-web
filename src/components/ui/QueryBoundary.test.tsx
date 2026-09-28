import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QueryBoundary } from "./QueryBoundary";
import type { QueryLike } from "./QueryBoundary";

function makeQuery<T>(overrides: Partial<QueryLike<T>>): QueryLike<T> {
  return { isPending: false, isError: false, error: undefined, data: undefined, ...overrides };
}

describe("QueryBoundary — the four async states", () => {
  it("renders a loading status while pending", () => {
    render(
      <QueryBoundary query={makeQuery<string[]>({ isPending: true })}>
        {() => <div>content</div>}
      </QueryBoundary>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders the error state and retries", async () => {
    const refetch = vi.fn();
    render(
      <QueryBoundary
        query={makeQuery<string[]>({
          isError: true,
          error: { detail: "It broke" },
          refetch,
        })}
      >
        {() => <div>content</div>}
      </QueryBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("It broke");

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state when loaded data is empty", () => {
    render(
      <QueryBoundary query={makeQuery<string[]>({ data: [] })} isEmpty={(d) => d.length === 0}>
        {() => <div>content</div>}
      </QueryBoundary>,
    );

    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders children with the data on success", () => {
    render(
      <QueryBoundary query={makeQuery<string[]>({ data: ["a"] })} isEmpty={(d) => d.length === 0}>
        {(data) => <div>items: {data.length}</div>}
      </QueryBoundary>,
    );

    expect(screen.getByText("items: 1")).toBeInTheDocument();
  });
});
