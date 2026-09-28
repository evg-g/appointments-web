import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarPlus } from "lucide-react";

import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { QueryBoundary } from "./QueryBoundary";
import type { QueryLike } from "./QueryBoundary";

const meta = {
  title: "UI/States",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <div className="max-w-md">
      <EmptyState
        title="No appointments yet"
        description="When you book an appointment it will show up here."
        action={
          <Button size="sm">
            <CalendarPlus className="size-4" aria-hidden="true" />
            Book appointment
          </Button>
        }
      />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div className="max-w-md">
      <ErrorState message="We could not load your appointments." onRetry={() => undefined} />
    </div>
  ),
};

function boundaryStory(query: QueryLike<string[]>) {
  return (
    <div className="max-w-md">
      <QueryBoundary query={query} isEmpty={(d) => d.length === 0}>
        {(data) => (
          <ul className="list-inside list-disc text-sm text-fg">
            {data.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </QueryBoundary>
    </div>
  );
}

const base: QueryLike<string[]> = {
  isPending: false,
  isError: false,
  error: undefined,
  data: undefined,
};

/** The four designed async states, driven through the same QueryBoundary. */
export const BoundaryLoading: Story = { render: () => boundaryStory({ ...base, isPending: true }) };
export const BoundaryError: Story = {
  render: () =>
    boundaryStory({
      ...base,
      isError: true,
      error: { detail: "Request failed" },
      refetch: () => undefined,
    }),
};
export const BoundaryEmpty: Story = { render: () => boundaryStory({ ...base, data: [] }) };
export const BoundarySuccess: Story = {
  render: () => boundaryStory({ ...base, data: ["Mon 09:00 — Dr. Lee", "Tue 14:30 — Dr. Ada"] }),
};
