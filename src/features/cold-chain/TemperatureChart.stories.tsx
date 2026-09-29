import type { Meta, StoryObj } from "@storybook/react-vite";

import { TemperatureChart } from "./TemperatureChart";
import type { ChartPoint } from "./TemperatureChart";

function wave(count: number, spikeFrom = -1): ChartPoint[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => {
    const spike = spikeFrom >= 0 && index >= spikeFrom ? 4 : 0;
    return {
      t: now - (count - index) * 300_000,
      v: Math.round((4.5 + Math.sin(index / 4) * 0.6 + spike) * 100) / 100,
    };
  });
}

const meta = {
  title: "ColdChain/TemperatureChart",
  component: TemperatureChart,
  render: (args) => (
    <div className="max-w-2xl rounded-lg border border-line bg-surface p-4">
      <TemperatureChart {...args} />
    </div>
  ),
  args: {
    points: wave(48),
    band: { min: 2, max: 8 },
    ariaSummary: "Temperature over the last four hours. Latest 4.6 °C.",
  },
} satisfies Meta<typeof TemperatureChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithinBand: Story = {};

export const WithExcursion: Story = {
  args: {
    points: wave(48, 40),
    ariaSummary: "Temperature with an excursion above the safe band.",
  },
};

export const NoBand: Story = {
  args: { band: undefined },
};
