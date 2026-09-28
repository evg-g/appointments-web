import type { Meta, StoryObj } from "@storybook/react-vite";

import { Skeleton, SkeletonText } from "./Skeleton";
import { Spinner } from "./Spinner";

const meta = {
  title: "UI/Feedback",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Spinners: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-accent">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};

export const Skeletons: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <Skeleton className="h-10 w-full" />
      <SkeletonText lines={4} />
    </div>
  ),
};
