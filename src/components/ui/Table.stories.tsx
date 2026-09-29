import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./Badge";
import { Table, TBody, TD, TH, THead, TR } from "./Table";

const meta = {
  title: "UI/Table",
  component: Table,
  render: () => (
    <Table>
      <THead>
        <TR>
          <TH>When</TH>
          <TH>Clinic</TH>
          <TH numeric>Duration</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        <TR>
          <TD>Jan 5, 09:00</TD>
          <TD>Aurora Downtown</TD>
          <TD numeric>30m</TD>
          <TD>
            <Badge variant="accent">Confirmed</Badge>
          </TD>
        </TR>
        <TR>
          <TD>Jan 6, 14:20</TD>
          <TD>Aurora Riverside</TD>
          <TD numeric>60m</TD>
          <TD>
            <Badge variant="info">Requested</Badge>
          </TD>
        </TR>
      </TBody>
    </Table>
  ),
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
