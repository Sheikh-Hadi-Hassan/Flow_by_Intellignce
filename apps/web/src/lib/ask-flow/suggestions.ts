import {
  exposurePrompt,
  snapshotForState,
  type MissionAskSnapshot,
} from "../mission-control/ask-snapshot";
import type { MissionStateKind } from "../mission-control/types";
import type { AskApplicationContext, AskSuggestion } from "./types";

type CatalogRow = AskSuggestion & {
  keys: readonly string[];
  requires: "any" | "invoices" | "capacity" | "decisions" | "meridian";
};

function catalog(snapshot: MissionAskSnapshot): readonly CatalogRow[] {
  const exposure = exposurePrompt(snapshot);
  const amountDigits = snapshot.exposure
    ? snapshot.exposure.minor.replace(/0{2}$/, "").replace(/^0+/, "")
    : "";

  const rows: CatalogRow[] = [
    {
      id: "sug-overdue",
      prompt: "Which invoices are overdue?",
      reason: "Receivables ledger",
      keys: ["invoice", "overdue", "receivable", "payment", "cash"],
      requires: "invoices",
    },
    {
      id: "sug-reminder",
      prompt: "Draft a payment reminder for Vantage Logistics",
      reason: "INV-2041 is 34 days overdue",
      keys: ["invoice", "vantage", "reminder", "payment", "overdue"],
      requires: "invoices",
    },
    {
      id: "sug-payment-behaviour",
      prompt: "Show clients with worsening payment behaviour",
      reason: "Ageing across the ledger",
      keys: ["invoice", "payment", "client", "ageing", "behavior", "behaviour"],
      requires: "invoices",
    },
    {
      id: "sug-vantage-capacity",
      prompt: "Who can take the Vantage work?",
      reason: "Open capacity this week",
      keys: ["capacity", "vantage", "who", "employee", "staff", "take"],
      requires: "capacity",
    },
    {
      id: "sug-overallocated",
      prompt: "Which employees are overallocated?",
      reason: "Avery and Sam are over this week",
      keys: ["capacity", "over", "employee", "allocated", "team"],
      requires: "capacity",
    },
    {
      id: "sug-registry",
      prompt: "Where is Northstar registered?",
      reason: "Business Registry legal entity",
      keys: ["register", "registered", "registration", "northstar", "company"],
      requires: "any",
    },
    {
      id: "sug-renewals",
      prompt: "Which business documents need renewal?",
      reason: "Insurance and policy dates vs the demo clock",
      keys: ["renew", "renewal", "document", "insurance", "policy"],
      requires: "any",
    },
    {
      id: "sug-signatories",
      prompt: "Who can sign contracts for the company?",
      reason: "Authorised signatories",
      keys: ["sign", "signatory", "contract", "company"],
      requires: "any",
    },
    {
      id: "sug-move-work",
      prompt: "What work can be moved without affecting deadlines?",
      reason: "Delivery pressure vs slack",
      keys: ["capacity", "move", "deadline", "work", "project"],
      requires: "capacity",
    },
    {
      id: "sug-approvals",
      prompt: "What needs my approval?",
      reason: "Founder queue",
      keys: ["approv", "decision", "need", "queue"],
      requires: "decisions",
    },
    {
      id: "sug-margin",
      prompt: "Why is the Meridian proposal below our margin floor?",
      reason: "Meridian pricing",
      keys: ["meridian", "margin", "proposal"],
      requires: "meridian",
    },
  ];

  if (exposure) {
    rows.unshift({
      id: "sug-exposure",
      prompt: exposure,
      reason: "Open founder decisions",
      keys: ["expos", "impact", "decision", "approval", amountDigits].filter(
        Boolean,
      ),
      requires: "decisions",
    });
  }

  return rows;
}

function allowed(row: CatalogRow, snapshot: MissionAskSnapshot): boolean {
  switch (row.requires) {
    case "invoices":
      return snapshot.invoices.length > 0;
    case "capacity":
      return snapshot.capacity.length > 0;
    case "decisions":
      return snapshot.decisionCount > 0;
    case "meridian":
      return snapshot.decisions.some((row) =>
        row.clientName.toLowerCase().includes("meridian"),
      );
    default:
      return true;
  }
}

function routeBoost(route: string, suggestion: AskSuggestion): number {
  if (route.includes("/team") && suggestion.id.includes("capacity")) return 3;
  if (route.includes("/opportunities") && suggestion.id.includes("approv"))
    return 2;
  if (route.includes("/clients") && suggestion.id.includes("payment")) return 2;
  if (route.includes("project") && suggestion.id.includes("move")) return 2;
  if (route.includes("/admin") && !route.includes("/admin/")) return 1;
  return 0;
}

/**
 * Deterministic local suggestions from typed intent, route, and the active
 * Mission Control state. Not live BLM output.
 */
export function resolveAskSuggestions(
  raw: string,
  context: Pick<AskApplicationContext, "route" | "visibleRecordIds"> & {
    missionStateKind?: MissionStateKind;
  },
  snapshot: MissionAskSnapshot = snapshotForState(
    context.missionStateKind ?? "populated",
  ),
): readonly AskSuggestion[] {
  const query = raw.trim().toLowerCase();
  if (query.length < 2) return [];

  const scored = catalog(snapshot)
    .filter((row) => allowed(row, snapshot))
    .map((row) => {
      const hit = row.keys.reduce(
        (score, key) => (key && query.includes(key.toLowerCase()) ? score + 2 : score),
        0,
      );
      return {
        id: row.id,
        prompt: row.prompt,
        reason: row.reason,
        score: hit + (hit > 0 ? routeBoost(context.route, row) : 0),
      };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return scored.map(({ id, prompt, reason }) => ({ id, prompt, reason }));
}
