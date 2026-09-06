import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "../components/ui/Display";

const meta: Meta<typeof StatusBadge> = {
  title: "UI/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Default: Story = { args: { children: "Draft" } };
export const Success: Story = { args: { children: "Approved", variant: "success" } };
export const Warning: Story = { args: { children: "Changes requested", variant: "warning" } };
export const Essential: Story = { args: { children: "Founder review", variant: "essential" } };
export const Demo: Story = { args: { children: "Demo data", variant: "demo" } };
export const LongText: Story = {
  args: { children: "Pending client acceptance — awaiting signature", variant: "essential" },
};
