import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "./Field";
import { Select } from "./Select";

const meta = {
  title: "UI/Select",
  component: Select,
  render: (args) => (
    <div className="max-w-sm">
      <Field label="Clinic">
        <Select {...args}>
          <option value="">Select a clinic</option>
          <option value="a">Aurora Downtown</option>
          <option value="b">Aurora Riverside</option>
        </Select>
      </Field>
    </div>
  ),
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Invalid: Story = { args: { invalid: true } };

export const Disabled: Story = { args: { disabled: true } };
