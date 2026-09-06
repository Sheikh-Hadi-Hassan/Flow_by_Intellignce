import {
  ASK_TOOL_NAMES,
  type AskAssistantRequest,
  type AskToolCall,
  type AskToolName,
  type AskHistoryTurn,
} from "./types";
import type { AskClarification } from "../types";

import { classifyIntent } from "./intent-policy";
import { humanToolChoiceLabel } from "./ask-tool-labels";
import { normalizeAskMessage } from "./normalize-message";
import { detectAnswerLanguage, tPhrase, type AnswerLanguage } from "./phrases";
import { tokenize } from "./intent-signals";
import type { IntentClassifierContext, ReasonCode } from "./intent-types";

export { classifyIntent } from "./intent-policy";
export {
  tokenize as intentTokenize,
  isActionVerb,
  isBusinessObject,
  isCommonWord,
  isGreetingWord,
  isConversationalWord,
  isWriteRiskTool,
  canonActionVerb,
  canonBusinessObject,
  splitClauses,
  detectMultiIntentClauses,
  hasAnaphoraPhrase,
  hasFollowUpToken,
  findMentionedEntity,
  generateCandidates,
  scoreCandidate,
  normalizeConfidence,
  bandOf,
  RAW_MAX,
  CONFIDENT_THRESHOLD,
  CLARIFY_THRESHOLD,
  WRITE_RISK_THRESHOLD,
  WINNER_MARGIN,
  CANDIDATE_CAP,
} from "./intent-signals";
export type { CandidateSet } from "./intent-signals";
export type {
  IntentOutcome,
  IntentResult,
  IntentCandidate,
  IntentClarification,
  IntentClassifierContext,
  AuthorizedEntity,
  ConfidenceBand,
  ReasonCode,
} from "./intent-types";
export {
  INTENT_OUTCOMES,
  CONFIDENCE_BANDS,
  REASON_CODES,
} from "./intent-types";

const ALIASES: Readonly<Record<string, string>> = {
  hi: "greet",
  hello: "greet",
  hey: "greet",
  yo: "greet",
  morning: "greet",
  lis: "list",
  lst: "list",
  show: "list",
  moving: "move",
  reassign: "move",
  handoff: "move",
  display: "list",
  projet: "project",
  projct: "project",
  projects: "project",
  behavour: "payment",
  behavior: "payment",
  behaviour: "payment",
  payment: "payment",
  overdue: "invoice",
  invoices: "invoice",
  receivable: "invoice",
  receivables: "invoice",
  sales: "sales",
  crm: "sales",
  today: "today",
  update: "sales",
  pipeline: "pipeline",
  opportunit: "pipeline",
  approval: "approval",
  approvals: "approval",
  approve: "approval",
  queue: "approval",
  expos: "exposure",
  exposed: "exposure",
  exposure: "exposure",
  impact: "exposure",
  capacity: "capacity",
  team: "capacity",
  allocated: "capacity",
  overallocated: "capacity",
  client: "client",
  clients: "client",
  customer: "client",
  customers: "client",
  search: "search",
  find: "search",
  record: "search",
  records: "search",
  health: "health",
  urgent: "urgent",
  worst: "urgent",
  riskiest: "urgent",
  worsening: "payment",
  deteriorated: "payment",
  waiting: "waiting",
  wait: "waiting",
  questionnaire: "waiting",
  activity: "activity",
  operations: "activity",
  timeline: "activity",
  events: "activity",
  all: "all",
  active: "active",
  risk: "risk",
  duplicate: "duplicate",
  duplicates: "duplicate",
  dormant: "dormant",
  inactive: "inactive",
  segment: "segment",
  merge: "merge",
  registered: "registration",
  registration: "registration",
  register: "registration",
  northstar: "northstar",
  documents: "document",
  document: "document",
  renewal: "renewal",
  renewals: "renewal",
  renew: "renewal",
  signatory: "signatory",
  signatories: "signatory",
  sign: "signatory",
  contracts: "signatory",
  company: "company",
  firmographics: "firmographics",
  structure: "structure",
};

const TOOL_KEYS: Readonly<Record<AskToolName, readonly string[]>> = {
  get_workspace_summary: ["greet", "summary", "status", "workspace"],
  get_today_sales_update: [
    "sales",
    "today",
    "crm",
    "won",
    "lost",
    "waiting",
    "activity",
  ],
  list_projects: ["list", "project"],
  get_project_health: ["health", "project", "urgent", "risk"],
  analyze_client_payment_behavior: ["payment", "client", "worsening"],
  list_overdue_invoices: ["invoice", "overdue"],
  get_pipeline_summary: ["pipeline"],
  list_pending_approvals: ["approval"],
  get_team_capacity: ["capacity"],
  explain_open_exposure: ["exposure"],
  list_clients: ["list", "client"],
  search_clients: ["search", "client"],
  search_business_records: ["search", "record"],
  get_client_360: ["360"],
  list_clients_by_segment: ["segment"],
  summarize_client_relationship: ["summarize"],
  list_inactive_clients: ["inactive", "dormant"],
  find_duplicate_clients: ["duplicate"],
  explain_client_health: ["clienthealth"],
  list_client_opportunities: ["clientopps"],
  list_client_projects: ["clientprojects"],
  list_client_contracts: ["clientcontracts"],
  list_client_invoices: ["clientinvoices"],
  propose_client_update: ["proposeupdate"],
  propose_duplicate_merge: ["merge"],
  get_business_profile: ["northstar", "company", "profile"],
  get_business_registration: ["registration", "northstar", "company"],
  list_business_locations: ["location", "office", "headquarters"],
  get_business_firmographics: ["firmographics"],
  list_authorised_signatories: ["signatory", "sign"],
  list_expiring_business_documents: ["renewal", "document", "insurance"],
  list_compliance_obligations: ["compliance", "obligation"],
  explain_business_structure: ["structure", "ownership"],
  propose_business_profile_update: ["proposeprofile"],
  propose_location_change: ["proposelocation"],
  "commercial.generate_proposal": [],
  "delivery.create_project_from_contract": [],
  "delivery.complete_task": [],
};

export const GENERIC_FALLBACK_MARK =
  "I do not have a sourced match for that exact question yet";

function levenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const grid = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i]![0] = i;
  for (let j = 0; j < cols; j += 1) grid[0]![j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      grid[i]![j] = Math.min(
        grid[i - 1]![j]! + 1,
        grid[i]![j - 1]! + 1,
        grid[i - 1]![j - 1]! + cost,
      );
    }
  }
  return grid[rows - 1]![cols - 1]!;
}

const RESERVED = new Set([
  "list",
  "show",
  "all",
  "why",
  "what",
  "open",
  "needs",
  "with",
  "from",
  "this",
  "that",
]);

function canon(token: string): string {
  if (ALIASES[token]) return ALIASES[token];
  if (token.length < 4 || RESERVED.has(token)) return token;
  let best = token;
  let bestDistance = 3;
  for (const [alias, meaning] of Object.entries(ALIASES)) {
    if (alias.length < 4) continue;
    if (Math.abs(alias.length - token.length) > 2) continue;
    const distance = levenshtein(token, alias);
    if (distance <= 2 && distance < bestDistance) {
      best = meaning;
      bestDistance = distance;
    }
  }
  return best;
}

export function normalizeTokens(raw: string): readonly string[] {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9$%\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(canon);
}

function scoreTool(tokens: readonly string[], name: AskToolName): number {
  return TOOL_KEYS[name].reduce(
    (score, key) => (tokens.includes(key) ? score + 2 : score),
    0,
  );
}

export function planAskIntent(
  message: string,
  lastTool?: AskToolName,
):
  | { kind: "tool"; call: AskToolCall }
  | { kind: "clarify"; clarification: AskClarification }
  | { kind: "out_of_domain"; reason: string } {
  const tokens = normalizeTokens(message);
  if (tokens.length === 0) {
    return {
      kind: "out_of_domain",
      reason:
        "I need a question about this workspace before I can look anything up.",
    };
  }

  const followUp =
    Boolean(lastTool) &&
    tokens.some((token) =>
      ["urgent", "which", "one", "that", "those", "first"].includes(token),
    );
  if (followUp && lastTool === "list_projects") {
    return {
      kind: "tool",
      call: { name: "get_project_health", args: { focus: "urgent" } },
    };
  }
  if (followUp && lastTool === "list_pending_approvals") {
    return {
      kind: "tool",
      call: { name: "list_pending_approvals", args: { focus: "urgent" } },
    };
  }
  if (followUp && lastTool === "explain_open_exposure") {
    return {
      kind: "tool",
      call: { name: "explain_open_exposure", args: { focus: "urgent" } },
    };
  }

  if (tokens.includes("deadline") || tokens.includes("margin")) {
    return {
      kind: "tool",
      call: {
        name: "get_team_capacity",
        args: { tradeoff: tokens.includes("deadline") ? "deadline" : "margin" },
      },
    };
  }

  if (/\bwho can take\b|vantage work|overallocated/i.test(message)) {
    return { kind: "tool", call: { name: "get_team_capacity", args: {} } };
  }

  if (
    tokens.some((token) => ["move", "reassign", "handoff"].includes(token)) &&
    tokens.includes("project")
  ) {
    return {
      kind: "clarify",
      clarification: {
        question:
          "Which matters more: protecting the deadline or protecting margin?",
        choices: [
          { id: "deadline", label: "Protect the deadline" },
          { id: "margin", label: "Protect margin" },
        ],
      },
    };
  }

  if (tokens.includes("waiting") || tokens.includes("activity")) {
    return { kind: "tool", call: { name: "get_today_sales_update", args: {} } };
  }

  if (tokens.includes("duplicate") || tokens.includes("merge")) {
    return { kind: "tool", call: { name: "find_duplicate_clients", args: {} } };
  }
  if (tokens.includes("dormant") || tokens.includes("inactive")) {
    return { kind: "tool", call: { name: "list_inactive_clients", args: {} } };
  }
  if (tokens.includes("segment")) {
    return {
      kind: "tool",
      call: { name: "list_clients_by_segment", args: {} },
    };
  }

  if (
    tokens.includes("registration") ||
    (tokens.includes("northstar") && tokens.includes("where"))
  ) {
    return {
      kind: "tool",
      call: { name: "get_business_registration", args: {} },
    };
  }
  if (
    tokens.includes("renewal") ||
    (tokens.includes("document") && tokens.includes("need"))
  ) {
    return {
      kind: "tool",
      call: { name: "list_expiring_business_documents", args: {} },
    };
  }
  if (tokens.includes("signatory")) {
    return {
      kind: "tool",
      call: { name: "list_authorised_signatories", args: {} },
    };
  }

  if (
    tokens.every((token) => token === "greet") ||
    (tokens.includes("greet") && tokens.length <= 2)
  ) {
    return {
      kind: "tool",
      call: { name: "get_workspace_summary", args: { greet: "1" } },
    };
  }

  const ranked = ASK_TOOL_NAMES.map((name) => ({
    name,
    score: scoreTool(tokens, name),
  })).sort((a, b) => b.score - a.score);

  const top = ranked[0]!;
  const second = ranked[1]!;

  if (top.score === 0) {
    return {
      kind: "out_of_domain",
      reason:
        "I can answer workspace status, sales, projects, invoices, pipeline, approvals, capacity, or exposure. That question is outside those records.",
    };
  }

  if (
    tokens.includes("project") &&
    tokens.includes("list") &&
    !tokens.includes("all") &&
    !tokens.includes("active") &&
    !tokens.includes("risk") &&
    !tokens.includes("health")
  ) {
    return {
      kind: "clarify",
      clarification: {
        question:
          "I can show active projects, at-risk projects, or every project. Which view do you want?",
        choices: [
          { id: "active", label: "Active projects" },
          { id: "risk", label: "At-risk projects" },
          { id: "all", label: "Every project" },
        ],
      },
    };
  }

  if (second.score === top.score && top.score < 4) {
    return {
      kind: "clarify",
      clarification: {
        question: `I can look that up as ${humanToolChoiceLabel(top.name).toLowerCase()} or ${humanToolChoiceLabel(second.name).toLowerCase()}. Which do you want?`,
        choices: [
          { id: top.name, label: humanToolChoiceLabel(top.name) },
          { id: second.name, label: humanToolChoiceLabel(second.name) },
        ],
      },
    };
  }

  const args: Record<string, string> = {};
  if (tokens.includes("all")) args.scope = "all";
  if (tokens.includes("active")) args.scope = "active";
  if (tokens.includes("risk")) args.scope = "risk";
  if (tokens.includes("urgent")) args.focus = "urgent";
  const query = message.trim();
  if (top.name.startsWith("search")) args.query = query;

  return { kind: "tool", call: { name: top.name, args } };
}

// --- Classifier Bridge ---

function findLastTool(
  history: readonly AskHistoryTurn[] | undefined,
): AskToolName | undefined {
  if (!history) return undefined;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i]!;
    if (turn.role === "assistant" && turn.tool) return turn.tool;
  }
  return undefined;
}

function buildClassifierContext(
  request: AskAssistantRequest,
  lastTool: AskToolName | undefined,
  language: AnswerLanguage,
): IntentClassifierContext {
  const blocks = request.context.activeBuildingBlocks;
  return {
    permittedTools: request.tools.map((t) => t.name),
    lastConfirmedTool: lastTool ?? null,
    answerLanguage: language,
    ...(blocks ? { activeBuildingBlocks: blocks } : {}),
  };
}

function argsFromMessage(
  message: string,
  tool: AskToolName,
): Record<string, string> {
  if (tool === "list_clients") return {};
  const tokens = tokenize(message);
  const args: Record<string, string> = {};
  if (tokens.includes("all")) args.scope = "all";
  if (tokens.includes("active")) args.scope = "active";
  if (tokens.includes("risk")) args.scope = "risk";
  if (tokens.includes("urgent")) args.focus = "urgent";
  if (tokens.includes("workload")) args.tradeoff = "deadline";
  if (tool.startsWith("search")) args.query = message.trim();
  return args;
}

function reasonToMessage(
  codes: readonly ReasonCode[],
  language: AnswerLanguage = "en",
): string {
  if (codes.includes("adversarial"))
    return tPhrase("reason.adversarial", language);
  if (
    codes.includes("empty") ||
    codes.includes("greeting") ||
    codes.includes("conversational")
  )
    return tPhrase("reason.greeting", language);
  if (codes.includes("incomplete_command"))
    return tPhrase("reason.incomplete", language);
  return tPhrase("reason.outside", language);
}

export function routeAskIntent(
  request: AskAssistantRequest,
):
  | { kind: "tool"; call: AskToolCall }
  | { kind: "clarify"; clarification: AskClarification }
  | { kind: "out_of_domain"; reason: string } {
  const lastTool = findLastTool(request.history);
  const language = detectAnswerLanguage(
    request.message,
    request.context.locale,
  );
  const ctx = buildClassifierContext(request, lastTool, language);
  const normalizedMessage = normalizeAskMessage(request.message);
  const result = classifyIntent(normalizedMessage.normalized, ctx);

  switch (result.outcome) {
    case "confident_match":
      return {
        kind: "tool",
        call: {
          name: result.selectedTool!,
          args: argsFromMessage(request.message, result.selectedTool!),
        },
      };
    case "clarification_required":
    case "multiple_intents":
      return {
        kind: "clarify",
        clarification: result.clarification
          ? {
              question: result.clarification.question,
              choices: result.clarification.choices.map((c) => ({
                id: c.id,
                label: c.label,
              })),
            }
          : { question: tPhrase("clarify.rephrase", language), choices: [] },
      };
    case "unsupported":
    case "out_of_domain":
      return {
        kind: "out_of_domain",
        reason: reasonToMessage(result.reasonCodes, language),
      };
  }
}
