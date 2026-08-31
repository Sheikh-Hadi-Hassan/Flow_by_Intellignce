import type { OpportunityRecord } from "../commercial/api";

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
