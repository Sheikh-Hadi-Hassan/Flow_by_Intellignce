import {
  approvalAnswer,
  exposureAnswer,
  isExposureQuestion,
  snapshotForState,
  type MissionAskSnapshot,
} from "../mission-control/ask-snapshot";
import { missionAskFlow } from "../mission-control/seed";
import type { MissionStateKind } from "../mission-control/types";
import { answerAskSync } from "./assistant/local-adapter";
import { ASK_TOOL_DEFINITIONS } from "./assistant/tools";
import type {
  AskAnswerVersion,
  AskApplicationContext,
  AskClarification,
} from "./types";

const MOVE_RE =
  /move (this |the )?project|another employee|reassign|hand off/i;

function snapshotOf(
  context: AskApplicationContext,
): MissionAskSnapshot {
  return snapshotForState(context.missionStateKind ?? "populated");
}

function catalogAnswer(
  prompt: string,
  snapshot: MissionAskSnapshot,
): AskAnswerVersion | null {
  const match = missionAskFlow.suggestions.find(
    (row) =>
      row.id !== "ask-exposure" &&
      row.id !== "ask-approvals" &&
      row.prompt.toLowerCase() === prompt.trim().toLowerCase(),
  );
  if (!match) return null;
  if (!snapshot.ready || snapshot.recordIds.length === 0) return null;
  return {
    id: `ver-${match.id}`,
    question: match.prompt,
    answer: match.answerPreview,
    evidence: [match.evidence],
    related: match.evidence.href
      ? [
          {
            id: match.evidence.id,
            label: match.evidence.label,
            href: match.evidence.href,
          },
        ]
      : [],
    actions: [
      {
        id: "open-evidence",
        label: "Open evidence",
        ...(match.evidence.href ? { href: match.evidence.href } : {}),
      },
    ],
    createdAt: 0,
  };
}

function exposureVersion(
  question: string,
  snapshot: MissionAskSnapshot,
): AskAnswerVersion {
  const first = snapshot.decisions[0];
  return {
    id: "ver-exposure",
    question,
    answer: exposureAnswer(snapshot),
    evidence: first?.evidence[0]
      ? [first.evidence[0]]
      : [],
    related: snapshot.decisions.map((row) => ({
      id: row.id,
      label: row.clientName,
      href: row.href,
    })),
    actions: snapshot.decisionCount
      ? [{ id: "open-queue", label: "Open decisions" }]
      : [],
    createdAt: 0,
  };
}

function approvalVersion(
  question: string,
  snapshot: MissionAskSnapshot,
): AskAnswerVersion {
  return {
    id: "ver-approvals",
    question,
    answer: approvalAnswer(snapshot),
    evidence: snapshot.decisions[0]?.evidence[0]
      ? [snapshot.decisions[0].evidence[0]!]
      : [],
    related: snapshot.decisions.map((row) => ({
      id: row.id,
      label: row.title,
      href: row.href,
    })),
    actions: [],
    createdAt: 0,
  };
}

function overdueAnswer(
  question: string,
  workspaceId: string,
  snapshot: MissionAskSnapshot,
): AskAnswerVersion {
  const overdue = snapshot.invoices.filter((row) => row.state === "overdue");
  if (overdue.length === 0) {
    return {
      id: "ver-overdue",
      question,
      answer: "No invoices are overdue in this workspace.",
      evidence: [],
      related: [],
      actions: [],
      createdAt: 0,
    };
  }
  const names = overdue
    .map((row) => `${row.clientName} ${row.reference}`)
    .join(" and ");
  return {
    id: "ver-overdue",
    question,
    answer: `${overdue.length} invoices are overdue: ${names}.`,
    evidence: [
      {
        id: "ev-receivables-ledger",
        kind: "system-record",
        label: "Receivables ledger",
        source: `${overdue.length} overdue invoices`,
        capturedAtLabel: "Today, 07:00",
        claim: "FACT",
        trust: "high",
        href: `/${workspaceId}/admin/lifecycle/reporting`,
      },
    ],
    related: overdue.map((row) => ({
      id: row.id,
      label: `${row.clientName} · ${row.reference}`,
      href: row.href,
    })),
    actions: [{ id: "remind-vantage", label: "Draft Vantage reminder" }],
    createdAt: 0,
  };
}

function capacityAnswer(
  question: string,
  workspaceId: string,
  snapshot: MissionAskSnapshot,
): AskAnswerVersion {
  if (snapshot.capacity.length === 0) {
    return {
      id: "ver-capacity",
      question,
      answer: "No capacity records are available in this workspace.",
      evidence: [],
      related: [],
      actions: [],
      createdAt: 0,
    };
  }
  const open = snapshot.capacity
    .filter((row) => row.utilizationBps < 10000)
    .map((row) => row.personName);
  const over = snapshot.capacity
    .filter((row) => row.utilizationBps > 10000)
    .map((row) => row.personName);
  return {
    id: "ver-capacity",
    question,
    answer:
      open.length > 0
        ? `${open.join(", ")} can take more work. ${over.length > 0 ? `${over.join(", ")} ${over.length === 1 ? "is" : "are"} overallocated.` : ""}`.trim()
        : `${over.join(", ") || "The team"} ${over.length === 1 ? "is" : "are"} at or over capacity.`,
    evidence: [
      {
        id: "ev-capacity-week",
        kind: "calculation",
        label: "Team capacity engine",
        source: `${snapshot.capacity.length} resources · week of 31 Aug`,
        capturedAtLabel: "Today, 06:00",
        claim: "FACT",
        trust: "high",
        href: `/${workspaceId}/admin/team`,
      },
    ],
    related: snapshot.capacity.slice(0, 2).map((row) => ({
      id: row.id,
      label: row.personName,
      href: `/${workspaceId}/admin/team`,
    })),
    actions: [
      { id: "open-team", label: "Open team", href: `/${workspaceId}/admin/team` },
    ],
    createdAt: 0,
  };
}

function clarification(question: string, workspaceId: string): AskAnswerVersion {
  const body: AskClarification = {
    question: "Which matters more: protecting the deadline or protecting margin?",
    choices: [
      { id: "deadline", label: "Protect the deadline" },
      { id: "margin", label: "Protect margin" },
    ],
  };
  return {
    id: "ver-clarify-move",
    question,
    answer: body.question,
    evidence: [
      {
        id: "ev-capacity-week",
        kind: "calculation",
        label: "Team capacity engine",
        source: "Reassignment needs a trade-off before a draft action",
        capturedAtLabel: "Today, 06:00",
        claim: "INFERENCE",
        trust: "medium",
        href: `/${workspaceId}/admin/team`,
      },
    ],
    related: [],
    actions: [],
    clarification: body,
    createdAt: 0,
  };
}

function fallback(
  question: string,
  context: AskApplicationContext,
  snapshot: MissionAskSnapshot,
): AskAnswerVersion {
  const hint =
    snapshot.decisionCount > 0
      ? `Try invoices, capacity, approvals, or the open exposure.`
      : `This workspace state has no open decisions to quote.`;
  return {
    id: "ver-fallback",
    question,
    answer: `I can answer from Northstar records on this route (${context.route}), but I do not have a sourced match for that exact question yet. ${hint}`,
    evidence: [],
    related: [],
    actions: [],
    createdAt: 0,
  };
}

/** Pre-AF-02 keyword router. Kept to prove the repeated-fallback defect. */
export function legacyResolveAskAnswer(
  question: string,
  context: AskApplicationContext & { missionStateKind?: MissionStateKind },
  snapshot: MissionAskSnapshot = snapshotOf(context),
): AskAnswerVersion {
  const trimmed = question.trim();
  const fromCatalog = catalogAnswer(trimmed, snapshot);
  if (fromCatalog)
    return { ...fromCatalog, question: trimmed, createdAt: Date.now() };

  if (MOVE_RE.test(trimmed)) {
    return { ...clarification(trimmed, context.workspaceId), createdAt: Date.now() };
  }
  if (isExposureQuestion(trimmed, snapshot)) {
    return { ...exposureVersion(trimmed, snapshot), createdAt: Date.now() };
  }
  if (/approv|what needs my/i.test(trimmed)) {
    return { ...approvalVersion(trimmed, snapshot), createdAt: Date.now() };
  }
  if (/invoice|overdue|receivable|payment reminder/i.test(trimmed)) {
    return {
      ...overdueAnswer(trimmed, context.workspaceId, snapshot),
      createdAt: Date.now(),
    };
  }
  if (/capacity|overallocated|who can take|vantage work/i.test(trimmed)) {
    return {
      ...capacityAnswer(trimmed, context.workspaceId, snapshot),
      createdAt: Date.now(),
    };
  }

  return { ...fallback(trimmed, context, snapshot), createdAt: Date.now() };
}

export function resolveAskAnswer(
  question: string,
  context: AskApplicationContext & { missionStateKind?: MissionStateKind },
): AskAnswerVersion {
  if (MOVE_RE.test(question.trim())) {
    return {
      ...clarification(question, context.workspaceId),
      createdAt: Date.now(),
    };
  }
  return answerAskSync({
    context,
    message: question,
    history: [],
    tools: ASK_TOOL_DEFINITIONS,
  }).version;
}

export function resolveClarificationAnswer(
  choiceId: string,
  prior: AskAnswerVersion,
): AskAnswerVersion {
  const deadline = choiceId === "deadline";
  return {
    id: `ver-clarify-${choiceId}-${prior.createdAt}`,
    question: prior.question,
    answer: deadline
      ? "Protecting the deadline: Taylor Kim can take the Vantage review this week. Margin on that path stays at the current 38% until you reopen pricing."
      : "Protecting margin: keep Avery on the review and slip the Vantage checkpoint by four days. That avoids overtime against the floor.",
    evidence: prior.evidence,
    related: [
      {
        id: "ns-res-copy",
        label: "Taylor Kim",
        href: prior.related[0]?.href ?? "#",
      },
    ],
    actions: [{ id: "propose-reassign", label: "Review draft reassignment" }],
    createdAt: Date.now(),
  };
}
