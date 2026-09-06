import type { OpportunityRecord } from "../commercial/api";
import { buildPriorities } from "./mission-control";

export type AskFlowIntent =
  | "summarize_opportunity"
  | "missing_discovery"
  | "explain_calculation"
  | "summarize_brief"
  | "project_risks"
  | "capacity_conflict"
  | "next_action"
  | "twin_summary";

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
}): AskFlowResponse {
  const { intent, workspace, opportunities } = input;
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
          proof: "Bird Eye View priority queue is empty.",
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
