import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../components/ui/Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: "Save changes", variant: "primary" } };
export const Secondary: Story = { args: { children: "Cancel", variant: "secondary" } };
export const Ghost: Story = { args: { children: "Learn more", variant: "ghost" } };
export const Disabled: Story = { args: { children: "Unavailable", disabled: true } };
export const Small: Story = { args: { children: "Small", size: "sm" } };
export const Block: Story = { args: { children: "Full width", block: true } };
export const LongText: Story = {
  args: { children: "Continue with extended action label for overflow testing" },
};
