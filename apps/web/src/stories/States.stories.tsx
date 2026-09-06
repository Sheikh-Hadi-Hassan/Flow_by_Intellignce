import type { Meta, StoryObj } from "@storybook/react";
import {
  EmptyState,
  InlineAlert,
  ProofLabel,
  SectionHeader,
  StatusBadge,
} from "../components/ui/Display";

const meta: Meta = {
  title: "UI/States",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Empty: Story = {
  render: () => (
    <EmptyState>
      <p>No time entries yet</p>
      <p>Submit your first entry from My Work.</p>
    </EmptyState>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="flow-empty" aria-busy="true" aria-live="polite">
      <p>Loading workspace data…</p>
    </div>
  ),
};

export const ErrorAlert: Story = {
  render: () => (
    <InlineAlert variant="warning">
      Could not load invoices. Check your connection and try again.
    </InlineAlert>
  ),
};

export const ProofFact: Story = {
  render: () => <ProofLabel type="fact">Contract executed 2026-03-15</ProofLabel>,
};

export const ProofInference: Story = {
  render: () => (
    <ProofLabel type="inference">Margin at risk — unbilled hours exceed budget</ProofLabel>
  ),
};

export const CardSurface: Story = {
  render: () => (
    <section className="flow-detail-group" style={{ padding: "1.5rem", minWidth: 320 }}>
      <SectionHeader
        eyebrow="Finance"
        title="Outstanding receivables"
        description="Issued invoices awaiting payment."
      />
      <p className="tabular-nums">USD 12,450.00</p>
    </section>
  ),
};

export const GuardApproval: Story = {
  render: () => (
    <div className="flow-detail-group" style={{ padding: "1rem" }}>
      <StatusBadge variant="essential">Guard approval required</StatusBadge>
      <p>Issue invoice INV-2026-0042 after founder review.</p>
      <ProofLabel type="recommendation">Approve to send to client billing contact</ProofLabel>
    </div>
  ),
};

export const AskFlowResponse: Story = {
  render: () => (
    <article className="flow-detail-group" style={{ padding: "1rem", maxWidth: 480 }}>
      <StatusBadge variant="demo">Ask Flow</StatusBadge>
      <p>3 invoices are overdue totalling USD 8,200.00.</p>
      <ProofLabel type="fact">Source: finance summary · refreshed just now</ProofLabel>
    </article>
  ),
};

export const TeamResource: Story = {
  render: () => (
    <div className="flow-detail-group" style={{ padding: "1rem", minWidth: 280 }}>
      <SectionHeader title="Maya Chen" description="Design lead · 32h available this week" />
      <StatusBadge variant="success">Available</StatusBadge>
    </div>
  ),
};
