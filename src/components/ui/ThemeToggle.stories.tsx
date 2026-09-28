import type { Meta, StoryObj } from "@storybook/react-vite";

import { ThemeToggle } from "./ThemeToggle";

const meta = {
  title: "UI/ThemeToggle",
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};
export const Compact: Story = { args: { compact: true } };
