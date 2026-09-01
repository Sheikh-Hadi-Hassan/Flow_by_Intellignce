import type { OpportunityRecord } from "../commercial/api";
import type { FinanceSummary, Invoice } from "../commercial/finance-api";
import { formatMinor } from "../commercial/finance-api";

export interface PriorityItem {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly meta: string;
  readonly href: string;
  readonly tone: "urgent" | "attention" | "ready";
}

export function buildPriorities(
  workspace: string,
  rows: readonly OpportunityRecord[],
): PriorityItem[] {
  const items: PriorityItem[] = [];

  for (const row of rows) {
    const base = `/${workspace}/admin/opportunities/${row.id}`;
    const status = row.journeyStatus;

    if (status === "founder_review") {
      items.push({
        id: `${row.id}-approval`,
        label: "Approval needed",
        title: row.name,
        meta: "Brief ready for your sign-off",
        href: `${base}/approvals`,
        tone: "urgent",
      });
    } else if (
      status === "collecting_information" ||
      status === "information_missing"
    ) {
      items.push({
        id: `${row.id}-discovery`,
        label: "Discovery",
        title: row.name,
        meta: "Client context still incomplete",
        href: `${base}/discovery`,
        tone: "attention",
      });
    } else if (status === "changes_requested") {
      items.push({
        id: `${row.id}-changes`,
        label: "Changes requested",
        title: row.name,
        meta: "Revision needed before next send",
        href: base,
        tone: "attention",
      });
    } else if (status === "approved" || status === "brief_approved") {
      items.push({
        id: `${row.id}-proposal`,
        label: "Ready to propose",
        title: row.name,
        meta: "Brief approved — build the proposal",
        href: `${base}/proposal`,
        tone: "ready",
      });
    } else if (
      status === "proposal_shared" ||
      status === "proposal_approved"
    ) {
      items.push({
        id: `${row.id}-contract`,
        label: "Contract",
        title: row.name,
        meta: "Move to executed agreement",
        href: `${base}/contract`,
        tone: "ready",
      });
    } else if (status === "contract_executed" || status === "executed") {
      items.push({
        id: `${row.id}-project`,
        label: "Delivery",
        title: row.name,
        meta: "Activate project and staffing plan",
        href: `${base}/project`,
        tone: "ready",
      });
    }
  }

  return items.slice(0, 8);
}

export function countPipelineStage(
  rows: readonly OpportunityRecord[],
  matcher: (status: string) => boolean,
): number {
  return rows.filter((row) => matcher(row.journeyStatus)).length;
}

export function hasFakeMetrics(): boolean {
  return false;
}

export function buildFinancePriorities(
  workspace: string,
  input: {
    readonly summary?: FinanceSummary | null;
    readonly invoices?: readonly Invoice[];
  },
): PriorityItem[] {
  const items: PriorityItem[] = [];
  const base = `/${workspace}/admin/finance`;

  for (const invoice of input.invoices ?? []) {
    if (invoice.status === "founder_review") {
      items.push({
        id: `${invoice.id}-invoice-review`,
        label: "Invoice approval",
        title: invoice.invoiceNumber ?? `Invoice ${invoice.id.slice(0, 8)}`,
        meta: "Awaiting founder sign-off before issue",
        href: `${base}/invoices/${invoice.id}`,
        tone: "urgent",
      });
    } else if (invoice.status === "overdue") {
      items.push({
        id: `${invoice.id}-overdue`,
        label: "Overdue invoice",
        title: invoice.invoiceNumber ?? `Invoice ${invoice.id.slice(0, 8)}`,
        meta: `${formatMinor(invoice.balanceDueMinor, invoice.currency)} past due`,
        href: `${base}/invoices/${invoice.id}`,
        tone: "urgent",
      });
    }
  }

  const summary = input.summary;
  if (summary && summary.unbilledApprovedTimeMinutes > 0) {
    items.push({
      id: "unbilled-time",
      label: "Unbilled work",
      title: "Approved time not yet invoiced",
      meta: `${summary.unbilledApprovedTimeMinutes} billable minutes ready to draft`,
      href: `${base}/time`,
      tone: "attention",
    });
  }
  if (
    summary &&
    BigInt(summary.unbilledApprovedExpenseMinor) > 0n
  ) {
    items.push({
      id: "unbilled-expense",
      label: "Unbilled expenses",
      title: "Approved expenses awaiting invoice",
      meta: `${formatMinor(summary.unbilledApprovedExpenseMinor, "USD")} billable`,
      href: `${base}/expenses`,
      tone: "attention",
    });
  }
  if (summary && summary.draftInvoiceCount > 0) {
    items.push({
      id: "draft-invoices",
      label: "Draft invoices",
      title: `${summary.draftInvoiceCount} draft invoice${summary.draftInvoiceCount === 1 ? "" : "s"}`,
      meta: "Submit for founder review when ready",
      href: `${base}/invoices`,
      tone: "ready",
    });
  }

  return items.slice(0, 8);
}
