/**
 * Shared Mission Control selectors. V1 and V2 both read these so displayed
 * values cannot drift from the snapshot that Ask Flow uses.
 */

import {
  formatBps,
  formatCount,
  formatHours,
  formatMoney,
  formatMoneyCompact,
} from "./format";
import type {
  CapacityRow,
  ClientAction,
  DecisionImpact,
  InvoiceSignal,
  MissionControlData,
  MissionDecision,
  MissionMetric,
  MissionProject,
} from "./types";

export const SURFACE_METRIC_IDS = [
  "met-weighted-pipeline",
  "met-forecast",
  "met-receivables",
  "met-capacity",
] as const;

export const LEDGER_METRIC_IDS = [
  "met-delivery-value",
  "met-at-risk",
  "met-client-actions",
  "met-approvals",
] as const;

export const ALL_METRIC_IDS = [
  ...SURFACE_METRIC_IDS,
  ...LEDGER_METRIC_IDS,
] as const;

const URGENCY_RANK: Record<MissionDecision["urgency"], number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

export function metricById(
  data: MissionControlData,
  id: string,
): MissionMetric | undefined {
  return data.metrics.find((row) => row.id === id);
}

export function formatMetricValue(metric: MissionMetric): string {
  if ("minor" in metric.value) return formatMoneyCompact(metric.value);
  if ("count" in metric.value) {
    return metric.id === "met-capacity"
      ? `${formatCount(metric.value.count)} hours`
      : formatCount(metric.value.count);
  }
  return formatBps(metric.value.bps);
}

export function sortedDecisions(
  decisions: readonly MissionDecision[],
): readonly MissionDecision[] {
  return [...decisions].sort(
    (left, right) => URGENCY_RANK[left.urgency] - URGENCY_RANK[right.urgency],
  );
}

export function largestMoneyImpact(
  decision: MissionDecision,
): DecisionImpact | undefined {
  return decision.impacts
    .filter((impact) => impact.amount)
    .sort(
      (left, right) =>
        Number(BigInt(right.amount!.minor) - BigInt(left.amount!.minor)),
    )[0];
}

export function impactDisplay(impact: DecisionImpact): string {
  if (impact.amount) return formatMoney(impact.amount);
  if (impact.deltaDays !== undefined) {
    return `${impact.deltaDays} day${impact.deltaDays === 1 ? "" : "s"}`;
  }
  return impact.valueLabel ?? impact.label;
}

export function waitingOnClient(
  actions: readonly ClientAction[],
): readonly ClientAction[] {
  return actions.filter((row) => row.waitingOn === "client");
}

export function waitingOnAgency(
  actions: readonly ClientAction[],
): readonly ClientAction[] {
  return actions.filter((row) => row.waitingOn === "agency");
}

export function invoicesByState(
  invoices: readonly InvoiceSignal[],
  state: InvoiceSignal["state"],
): readonly InvoiceSignal[] {
  return invoices.filter((row) => row.state === state);
}

export function invoiceTotal(invoices: readonly InvoiceSignal[]): string {
  const minor = invoices.reduce(
    (sum, row) => sum + BigInt(row.amount.minor),
    0n,
  );
  const currency = invoices[0]?.amount.currency ?? "USD";
  return formatMoney({ minor: String(minor), currency });
}

export function atRiskProjects(
  projects: readonly MissionProject[],
): readonly MissionProject[] {
  return projects.filter(
    (row) => row.healthTone === "critical" || row.healthTone === "caution",
  );
}

export function overAllocated(
  rows: readonly CapacityRow[],
): readonly CapacityRow[] {
  return rows.filter((row) => row.utilizationBps > 10_000);
}

export function availablePeople(
  rows: readonly CapacityRow[],
): readonly CapacityRow[] {
  return rows.filter((row) => row.allocatedMinutes < row.availableMinutes);
}

export function freeHoursLabel(row: CapacityRow): string {
  const free = Math.max(0, row.availableMinutes - row.allocatedMinutes);
  return formatHours(free);
}

export function allocatedHoursLabel(row: CapacityRow): string {
  return `${formatHours(row.allocatedMinutes)} of ${formatHours(row.availableMinutes)}`;
}

export function utilizationLabel(row: CapacityRow): string {
  return formatBps(row.utilizationBps);
}

export function projectsLedBy(
  projects: readonly MissionProject[],
  personName: string,
): readonly MissionProject[] {
  return projects.filter((row) => row.leadName === personName);
}

export function actionLabel(action: MissionDecision["actions"][number]): string {
  if (action === "approve") return "Approve";
  if (action === "revise") return "Revise";
  return "Reject";
}

export function resolutionOf(
  action: MissionDecision["actions"][number],
): "approved" | "revised" | "rejected" {
  if (action === "approve") return "approved";
  if (action === "revise") return "revised";
  return "rejected";
}

/**
 * One-sentence AI-style summary above the fold. Stays anchored to the same
 * decision snapshot the rest of the canvas reads so no invented values leak in.
 */
export function executiveInsight(
  data: MissionControlData,
): string | undefined {
  const decisions = sortedDecisions(data.decisions);
  if (decisions.length === 0) return undefined;

  const exposure = decisions.reduce(
    (total, decision) => {
      const largest = largestMoneyImpact(decision);
      return total + (largest ? BigInt(largest.amount!.minor) : 0n);
    },
    0n,
  );

  const currency = decisions[0]?.impacts.find((impact) => impact.amount)
    ?.amount?.currency ?? "USD";
  const exposureLabel = formatMoneyCompact({
    minor: exposure.toString(),
    currency,
  });
  const count = decisions.length;
  const word = count === 1 ? "decision" : "decisions";
  const lead = decisions[0]!.clientName;

  return `${count} ${word} hold ${exposureLabel} in exposure, led by ${lead}.`;
}
