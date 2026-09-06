import type { Meta, StoryObj } from "@storybook/react";
import { FormField, TextInput } from "../components/ui/FormField";

const meta: Meta<typeof FormField> = {
  title: "UI/FormField",
  component: FormField,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  render: () => (
    <FormField label="Project name" htmlFor="project-name" help="Visible to your team">
      <TextInput id="project-name" placeholder="Acme brand refresh" />
    </FormField>
  ),
};

export const WithError: Story = {
  render: () => (
    <FormField label="Email" htmlFor="email" error="Enter a valid email address">
      <TextInput id="email" aria-invalid="true" defaultValue="not-an-email" />
    </FormField>
  ),
};

export const Disabled: Story = {
  render: () => (
    <FormField label="Workspace slug" htmlFor="slug">
      <TextInput id="slug" disabled defaultValue="northstar-creative" />
    </FormField>
  ),
};

export const LongLabel: Story = {
  render: () => (
    <FormField
      label="Client billing contact email for invoice delivery and payment reminders"
      htmlFor="billing-email"
    >
      <TextInput id="billing-email" placeholder="finance@client.com" />
    </FormField>
  ),
};
