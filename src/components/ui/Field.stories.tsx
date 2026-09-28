import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "./Field";
import { Input } from "./Input";

const meta = {
  title: "UI/Field",
  component: Field,
  args: {
    label: "Email",
    children: <Input type="email" placeholder="you@clinic.example" />,
  },
  render: (args) => (
    <div className="max-w-sm">
      <Field {...args} />
    </div>
  ),
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: "We only use this to send appointment reminders." },
};

export const WithError: Story = {
  args: { error: "Enter a valid email address", required: true },
};
