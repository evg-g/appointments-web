import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Tabs } from "./Tabs";

type Kind = "upcoming" | "past" | "cancelled";

const ITEMS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
] as const satisfies readonly { value: Kind; label: string }[];

function TabsDemo() {
  const [value, setValue] = useState<Kind>("upcoming");
  return (
    <Tabs label="Appointments" items={ITEMS} value={value} onValueChange={setValue}>
      <p className="text-sm text-muted">Content of the {value} tab.</p>
    </Tabs>
  );
}

const meta = {
  title: "UI/Tabs",
  component: TabsDemo,
} satisfies Meta<typeof TabsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
