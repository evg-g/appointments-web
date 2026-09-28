import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Clinic North</CardTitle>
        <CardDescription>Europe/London · 3 clinicians</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">
          A card groups related content on a raised surface with a subtle border and shadow.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Open</Button>
        <Button size="sm" variant="ghost">
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  ),
};
