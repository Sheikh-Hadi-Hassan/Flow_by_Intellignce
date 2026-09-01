import type { OpportunityRecord } from "../commercial/api";
import type { FinanceSummary, Invoice } from "../commercial/finance-api";
import { formatMinor } from "../commercial/finance-api";
import { buildFinancePriorities, buildPriorities } from "./mission-control";

export type AskFlowIntent =
  | "summarize_opportunity"
  | "missing_discovery"
  | "explain_calculation"
  | "summarize_brief"
  | "project_risks"
  | "capacity_conflict"
  | "next_action"
  | "twin_summary"
  | "unbilled_work"
  | "overdue_invoices"
  | "receivables_summary"
  | "invoice_total_explain"
  | "finance_next_action"
  | "project_margin_risk";

export interface AskFlowResponse {
  readonly supported: boolean;
  readonly answer: string;
  readonly proof: string;
  readonly records: readonly { label: string; href: string }[];
  readonly limitation?: string;
  readonly recommendedAction?: string;
  readonly guardRequired: boolean;
}

const SUPPORTED_INTENTS: readonly AskFlowIntent[] = [
  "summarize_opportunity",
  "missing_discovery",
  "explain_calculation",
  "summarize_brief",
  "project_risks",
  "capacity_conflict",
  "next_action",
  "twin_summary",
  "unbilled_work",
  "overdue_invoices",
  "receivables_summary",
  "invoice_total_explain",
  "finance_next_action",
  "project_margin_risk",
];

export function listSupportedIntents(): readonly AskFlowIntent[] {
  return SUPPORTED_INTENTS;
}

export function isSupportedIntent(intent: string): intent is AskFlowIntent {
  return (SUPPORTED_INTENTS as readonly string[]).includes(intent);
}

export function answerAskFlow(input: {
  intent: AskFlowIntent;
  workspace: string;
  opportunities: readonly OpportunityRecord[];
  twinSummary?: string;
  opportunityId?: string;
  financeSummary?: FinanceSummary | null;
  invoices?: readonly Invoice[];
}): AskFlowResponse {
  const { intent, workspace, opportunities } = input;
  const financeBase = `/${workspace}/admin/finance`;
  const target =
    opportunities.find((row) => row.id === input.opportunityId) ??
    opportunities[0];
  const base = target
    ? `/${workspace}/admin/opportunities/${target.id}`
    : `/${workspace}/admin/opportunities`;

  switch (intent) {
    case "summarize_opportunity":
      if (!target) {
        return unsupported("No opportunities in this workspace yet.");
      }
      return {
        supported: true,
        answer: `${target.name} is at stage "${target.journeyStatus.replaceAll("_", " ")}".`,
        proof: "Derived from stored opportunity journey status.",
        records: [{ label: target.name, href: base }],
        recommendedAction: "Open the opportunity record to continue the lifecycle.",
        guardRequired: false,
      };
    case "missing_discovery":
      if (!target) return unsupported("Select an opportunity first.");
      return {
        supported: true,
        answer:
          target.journeyStatus === "information_missing"
            ? "Discovery is incomplete — verified facts or follow-up answers are still required."
            : "Discovery appears complete enough to advance. Review verified facts on the discovery screen.",
        proof: "Based on journey status and discovery workflow gates.",
        records: [{ label: "Discovery", href: `${base}/discovery` }],
        recommendedAction: "Verify facts before generating a brief.",
        guardRequired: false,
      };
    case "explain_calculation":
      return {
        supported: true,
        answer:
          "Scope calculations use integer minutes and rates from the published service questionnaire and verified discovery facts.",
        proof: "Commercial calculate endpoint uses @flow/commercial scope engine.",
        records: target
          ? [{ label: "Opportunity scope", href: `${base}/brief` }]
          : [],
        limitation: "Line-item breakdown requires opening the brief or proposal record.",
        guardRequired: false,
      };
    case "summarize_brief":
      if (!target) return unsupported("No opportunity selected.");
      return {
        supported: true,
        answer:
          target.journeyStatus === "founder_review"
            ? "A brief version is awaiting founder approval."
            : "Open the brief screen to review scope, budget, timeline, and risks.",
        proof: "Brief lifecycle state from opportunity journey status.",
        records: [{ label: "Brief", href: `${base}/brief` }],
        guardRequired: target.journeyStatus === "founder_review",
      };
    case "project_risks":
      return {
        supported: true,
        answer:
          "Project risks surface on the project audit timeline after contract execution.",
        proof: "Project engine audit endpoint.",
        records: [{ label: "Projects", href: `/${workspace}/admin/lifecycle/projects` }],
        limitation: "Risk detail requires an executed contract and generated project.",
        guardRequired: false,
      };
    case "capacity_conflict":
      return {
        supported: true,
        answer:
          "Capacity conflicts appear when recommendations detect over-allocation or skill gaps on the staffing plan.",
        proof: "Resource plan recommendation evidence from capacity engine.",
        records: [
          {
            label: "Team capacity",
            href: `/${workspace}/admin/team`,
          },
        ],
        recommendedAction: "Review recommendations before publishing assignments.",
        guardRequired: true,
      };
    case "next_action": {
      const priorities = buildPriorities(workspace, opportunities);
      const top = priorities[0];
      if (!top) {
        return {
          supported: true,
          answer: "Create a client, then start a discovery opportunity.",
          proof: "Mission Control priority queue is empty.",
          records: [
            { label: "Clients", href: `/${workspace}/admin/clients` },
          ],
          recommendedAction: "Add a client under Clients.",
          guardRequired: false,
        };
      }
      return {
        supported: true,
        answer: `${top.title}: ${top.meta}`,
        proof: "Deterministic next-action mapping from journey status.",
        records: [{ label: top.title, href: top.href }],
        recommendedAction: top.label,
        guardRequired: top.tone === "urgent",
      };
    }
    case "twin_summary":
      return {
        supported: true,
        answer: input.twinSummary ?? "Business Twin is still being compiled.",
        proof: "Workspace twin snapshot from onboarding and services catalog.",
        records: [{ label: "Business Twin", href: `/${workspace}/admin/twin` }],
        guardRequired: false,
      };
    case "unbilled_work": {
      const summary = input.financeSummary;
      if (!summary) {
        return unsupported("Financial summary is not available yet.");
      }
      const minutes = summary.unbilledApprovedTimeMinutes;
      const expenseMinor = summary.unbilledApprovedExpenseMinor;
      if (minutes === 0 && BigInt(expenseMinor) === 0n) {
        return {
          supported: true,
          answer: "No approved billable time or expenses are waiting to be invoiced.",
          proof: "Finance summary unbilled counters from stored records.",
          records: [{ label: "Finance hub", href: financeBase }],
          guardRequired: false,
        };
      }
      return {
        supported: true,
        answer: `${minutes} approved billable minutes and ${formatMinor(expenseMinor, "USD")} in approved expenses are not yet on an invoice.`,
        proof: "Unbilled counters from finance summary endpoint.",
        records: [
          { label: "Time entries", href: `${financeBase}/time` },
          { label: "Expenses", href: `${financeBase}/expenses` },
        ],
        recommendedAction: "Generate a draft invoice from approved billable work.",
        guardRequired: false,
      };
    }
    case "overdue_invoices": {
      const overdue = (input.invoices ?? []).filter(
        (row) => row.status === "overdue",
      );
      if (overdue.length === 0) {
        return {
          supported: true,
          answer: "No invoices are currently marked overdue.",
          proof: "Invoice status from stored finance records.",
          records: [{ label: "Invoices", href: `${financeBase}/invoices` }],
          guardRequired: false,
        };
      }
      const total = overdue.reduce(
        (sum, row) => sum + BigInt(row.balanceDueMinor),
        0n,
      );
      return {
        supported: true,
        answer: `${overdue.length} invoice${overdue.length === 1 ? "" : "s"} overdue totalling ${formatMinor(total.toString(), overdue[0]?.currency ?? "USD")}.`,
        proof: "Overdue status and balance due from invoice records.",
        records: overdue.map((row) => ({
          label: row.invoiceNumber ?? row.id.slice(0, 8),
          href: `${financeBase}/invoices/${row.id}`,
        })),
        recommendedAction: "Record payment or follow up with the client.",
        guardRequired: true,
      };
    }
    case "receivables_summary": {
      const summary = input.financeSummary;
      if (!summary) {
        return unsupported("Financial summary is not available yet.");
      }
      return {
        supported: true,
        answer: `Outstanding receivables: ${formatMinor(summary.outstandingMinor, "USD")}. Collected to date: ${formatMinor(summary.collectedMinor, "USD")}. Overdue: ${formatMinor(summary.overdueMinor, "USD")}.`,
        proof: "Finance summary from stored invoice and payment records.",
        records: [{ label: "Finance reports", href: `${financeBase}/reports` }],
        guardRequired: false,
      };
    }
    case "invoice_total_explain":
      return {
        supported: true,
        answer:
          "Invoice totals are computed deterministically: line subtotals (quantity × unit amount), minus discount, plus tax per workspace billing settings.",
        proof: "@flow/commercial finance-calculations engine — no LLM math.",
        records: [{ label: "Invoices", href: `${financeBase}/invoices` }],
        limitation: "Open a specific invoice to see line-item breakdown.",
        guardRequired: false,
      };
    case "finance_next_action": {
      const financePriorities = buildFinancePriorities(workspace, {
        ...(input.financeSummary !== undefined
          ? { summary: input.financeSummary }
          : {}),
        ...(input.invoices !== undefined ? { invoices: input.invoices } : {}),
      });
      const top = financePriorities[0];
      if (!top) {
        return {
          supported: true,
          answer: "No finance actions pending. Submit billable time or expenses to begin.",
          proof: "Finance priority queue is empty.",
          records: [{ label: "Finance hub", href: financeBase }],
          recommendedAction: "Open My Work to submit time or expenses.",
          guardRequired: false,
        };
      }
      return {
        supported: true,
        answer: `${top.title}: ${top.meta}`,
        proof: "Deterministic finance priority mapping from stored records.",
        records: [{ label: top.title, href: top.href }],
        recommendedAction: top.label,
        guardRequired: top.tone === "urgent",
      };
    }
    case "project_margin_risk":
      return {
        supported: true,
        answer:
          "Project margin risk appears when approved labour and expense costs approach or exceed invoiced revenue on a project.",
        proof: "Project profitability endpoint uses deterministic gross margin calculation.",
        records: [
          { label: "Finance reports", href: `${financeBase}/reports` },
          { label: "Delivery", href: `/${workspace}/admin/lifecycle/projects` },
        ],
        limitation: "Open a specific project profitability view for line detail.",
        guardRequired: false,
      };
    default:
      return unsupported("That question is not supported yet.");
  }
}

function unsupported(message: string): AskFlowResponse {
  return {
    supported: false,
    answer: message,
    proof: "Ask Flow only answers from stored workspace data.",
    records: [],
    limitation: "Unsupported or insufficient data for this intent.",
    guardRequired: false,
  };
}
