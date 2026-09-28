import type { Meta, StoryObj } from "@storybook/react-vite";

import { Alert } from "./Alert";

const meta = {
  title: "UI/Alert",
  component: Alert,
  args: { title: "Heads up", children: "This is an informational message.", variant: "info" },
  argTypes: {
    variant: { control: "select", options: ["info", "success", "warning", "danger"] },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Success: Story = {
  args: { variant: "success", title: "Saved", children: "Your changes were saved." },
};
export const Warning: Story = {
  args: { variant: "warning", title: "Heads up", children: "This device is offline." },
};
export const Danger: Story = {
  args: { variant: "danger", title: "Failed", children: "Could not reach the server." },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <Alert variant="info" title="Info">
        An informational message.
      </Alert>
      <Alert variant="success" title="Success">
        Something went well.
      </Alert>
      <Alert variant="warning" title="Warning">
        Something needs attention.
      </Alert>
      <Alert variant="danger" title="Error">
        Something went wrong.
      </Alert>
    </div>
  ),
};
