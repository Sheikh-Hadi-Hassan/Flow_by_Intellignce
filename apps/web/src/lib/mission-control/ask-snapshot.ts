import { formatMoney, joinReadable } from "./format";
import { missionViewForState } from "./states";
import type {
  CapacityRow,
  InvoiceSignal,
  MissionDecision,
  MissionOpportunity,
  MissionStateKind,
  Money,
} from "./types";

/**
 * The Ask Flow numbers for one demo state. Hero and Ask Flow both read this
 * so a dense workspace cannot keep quoting the populated $356,000 / 3.
 */
export interface MissionAskSnapshot {
  readonly stateKind: MissionStateKind;
  readonly ready: boolean;
  readonly decisionCount: number;
  readonly exposure: Money | null;
  readonly decisions: readonly MissionDecision[];
  readonly invoices: readonly InvoiceSignal[];
  readonly capacity: readonly CapacityRow[];
  readonly opportunities: readonly MissionOpportunity[];
  readonly recordIds: readonly string[];
}

export function snapshotForState(kind: MissionStateKind): MissionAskSnapshot {
  const view = missionViewForState(kind);
  if (view.kind !== "ready") {
    return {
      stateKind: kind,
      ready: false,
      decisionCount: 0,
      exposure: null,
      decisions: [],
      invoices: [],
      capacity: [],
      opportunities: [],
      recordIds: [],
    };
  }

  const { headline, decisions, invoices, capacity, opportunities, projects } =
    view.data;
  return {
    stateKind: kind,
    ready: true,
    decisionCount: decisions.length,
    exposure: headline.impactAmount ?? null,
    decisions,
    invoices,
    capacity,
    opportunities,
    recordIds: [
      ...decisions.map((row) => row.id),
      ...invoices.map((row) => row.id),
      ...capacity.map((row) => row.id),
      ...opportunities.map((row) => row.id),
      ...projects.map((row) => row.id),
    ],
  };
}

export function exposurePrompt(snapshot: MissionAskSnapshot): string | null {
  if (!snapshot.exposure || snapshot.decisionCount === 0) return null;
  return `Why is ${formatMoney(snapshot.exposure)} exposed?`;
}

export function largestImpact(decision: MissionDecision): Money | null {
  let best: Money | null = null;
  for (const impact of decision.impacts) {
    if (!impact.amount) continue;
    if (!best || BigInt(impact.amount.minor) > BigInt(best.minor)) {
      best = impact.amount;
    }
  }
  return best;
}

export function exposureAnswer(snapshot: MissionAskSnapshot): string {
  if (snapshot.decisionCount === 0 || !snapshot.exposure) {
    return "Nothing is exposed. This workspace has no open founder decisions.";
  }
  const parts = snapshot.decisions.map((decision) => {
    const amount = largestImpact(decision);
    return amount
      ? `${formatMoney(amount)} ${decision.clientName}`
      : decision.clientName;
  });
  return `${snapshot.decisionCount} open decision${snapshot.decisionCount === 1 ? "" : "s"} hold it: ${joinReadable(parts)}.`;
}

export function approvalAnswer(snapshot: MissionAskSnapshot): string {
  if (snapshot.decisionCount === 0) {
    return "Nothing needs your approval. The founder queue is empty.";
  }
  return snapshot.decisions.map((decision) => decision.title).join(" ");
}

export function isExposureQuestion(
  question: string,
  snapshot: MissionAskSnapshot,
): boolean {
  const text = question.toLowerCase();
  if (snapshot.exposure) {
    const compact = formatMoney(snapshot.exposure).replace(/[^0-9]/g, "");
    if (compact.length >= 3 && text.replace(/[^0-9]/g, "").includes(compact)) {
      return true;
    }
  }
  return /expos|impact/.test(text);
}
