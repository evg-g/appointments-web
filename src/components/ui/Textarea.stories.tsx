import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "./Field";
import { Textarea } from "./Textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  render: (args) => (
    <div className="max-w-sm">
      <Field label="Reason" description="Optional — shown on the record.">
        <Textarea {...args} placeholder="e.g. patient requested reschedule" />
      </Field>
    </div>
  ),
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Invalid: Story = { args: { invalid: true } };
