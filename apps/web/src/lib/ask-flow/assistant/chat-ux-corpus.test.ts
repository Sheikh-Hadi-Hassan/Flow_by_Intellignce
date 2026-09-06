import { describe, expect, it } from "vitest";

import { resolveAskSuggestions } from "../suggestions";
import type { AskApplicationContext } from "../types";
import { answerAskSync } from "./local-adapter";
import type { ResponseWidget } from "./response-shape";
import { ASK_TOOL_DEFINITIONS } from "./tools";
import type { AskAssistantRequest } from "./types";

const URDU_SCRIPT = /[\u0679\u0688\u0691\u0686\u067E\u0698\u06A9\u06AF\u06BA\u06BE\u06CC\u06D2]/;
const ARABIC_SCRIPT = /[\u0621-\u063A\u0641-\u064A]/;
const DEVANAGARI = /[\u0900-\u097F]/;
const DASHES = /\u2014|\u2013/;
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/u;
// Internal machine identifiers must never surface in business answers.
const INTERNAL_NAMES =
  /openrouter|grok|flow-intent-router|intent-router|adapter|provider:|tool:|get_[a-z_]+|list_[a-z_]+|analyze_[a-z_]+|explain_[a-z_]+|propose_[a-z_]+/i;

const founder: AskApplicationContext = {
  workspaceId: "northstar-creative",
  userId: "ns-res-maya",
  role: "Founder",
  permissions: [
    "opportunity.read",
    "opportunity.manage",
    "proposal.approve",
    "project.manage",
    "finance.read",
  ],
  route: "/northstar-creative/admin",
  visibleRecordIds: [],
  locale: "en-US",
  currency: "USD",
  timezone: "America/Chicago",
  conversationId: "ask-chat-ux-corpus",
  missionStateKind: "populated",
};

function ask(
  message: string,
  history: AskAssistantRequest["history"] = [],
  extra: Partial<AskApplicationContext> = {},
) {
  return answerAskSync({
    context: { ...founder, ...extra },
    message,
    history,
    tools: ASK_TOOL_DEFINITIONS,
  });
}

interface CorpusRow {
  readonly id: string;
  readonly dimension: string;
  readonly message: string;
  readonly history?: AskAssistantRequest["history"];
  readonly tool?: string;
  readonly outOfDomain?: boolean;
  readonly direct?: boolean;
  readonly clarifies?: boolean;
  readonly widgetTypes?: readonly string[];
  readonly claims?: readonly string[];
  readonly answerMatches?: readonly RegExp[];
  readonly answerContains?: readonly string[];
  readonly answerNotContains?: readonly string[];
}

const CORPUS: readonly CorpusRow[] = [
  {
    id: "en-invoices-direct",
    dimension: "direct answer to a closed question",
    message: "show all overdue invoices",
    tool: "list_overdue_invoices",
    direct: true,
    widgetTypes: ["metrics", "entities"],
    answerContains: ["$27,750", "Vantage Logistics"],
  },
  {
    id: "en-approvals-direct",
    dimension: "direct answer to a closed question",
    message: "what needs my approval",
    tool: "list_pending_approvals",
    direct: true,
    widgetTypes: ["metrics", "entities"],
    answerContains: ["Meridian"],
  },
  {
    id: "en-exposure-direct",
    dimension: "direct answer to a closed question",
    message: "why is $356K exposed",
    tool: "explain_open_exposure",
    direct: true,
    widgetTypes: ["metrics", "entities"],
    answerContains: ["$356,000"],
  },
  {
    id: "en-payment-behaviour-direct",
    dimension: "grounded comparison with claim labels",
    message: "show clients with worsening payment behaviour",
    tool: "analyze_client_payment_behavior",
    direct: true,
    widgetTypes: ["comparison", "analysis"],
    claims: ["FACT"],
    answerContains: ["Vantage Logistics", "$18,500"],
  },
  {
    id: "en-capacity-deadline-direct",
    dimension: "grounded recommendation with claim labels",
    message: "show team workload",
    tool: "get_team_capacity",
    direct: true,
    widgetTypes: ["entities", "analysis"],
    claims: ["RECOMMENDATION", "INFERENCE"],
    answerContains: ["Vantage"],
  },
  {
    id: "en-projects-clarify",
    dimension: "answer-first clarify-second on genuine ambiguity",
    message: "list projects",
    clarifies: true,
  },
  {
    id: "en-greeting",
    dimension: "small talk without tool execution",
    message: "hi",
    outOfDomain: true,
    answerContains: ["workspace records"],
    answerNotContains: ["totalling"],
  },
  {
    id: "roman-ur-greeting",
    dimension: "small talk mirrored to Roman Urdu",
    message: "salam",
    outOfDomain: true,
    answerContains: ["haazir"],
  },
  {
    id: "ur-script-invoices",
    dimension: "Urdu script mirroring with untranslated business values",
    message: "list overdue invoices دکھاؤ",
    tool: "list_overdue_invoices",
    direct: true,
    widgetTypes: ["metrics", "entities"],
    answerMatches: [URDU_SCRIPT],
    answerContains: [
      "Vantage Logistics",
      "INV-2041",
      "$18,500",
      "$27,750",
    ],
    answerNotContains: ["totalling"],
  },
  {
    id: "roman-ur-invoices",
    dimension: "Roman Urdu mirroring with untranslated business values",
    message: "mujhe overdue invoices list karo",
    tool: "list_overdue_invoices",
    direct: true,
    widgetTypes: ["metrics", "entities"],
    answerContains: ["total $27,750", "Vantage Logistics", "INV-2041"],
    answerNotContains: ["totalling"],
  },
  {
    id: "mixed-ur-en-invoices",
    dimension: "mixed Roman Urdu and English mirrors to Roman Urdu",
    message: "show me overdue invoices ka total batao",
    tool: "list_overdue_invoices",
    direct: true,
    widgetTypes: ["metrics", "entities"],
    answerContains: ["total $27,750", "Vantage Logistics"],
    answerNotContains: ["totalling"],
  },
  {
    id: "ar-invoices",
    dimension: "Arabic script mirroring with untranslated business values",
    message: "show overdue invoices الآن",
    tool: "list_overdue_invoices",
    direct: true,
    widgetTypes: ["metrics", "entities"],
    answerMatches: [ARABIC_SCRIPT],
    answerContains: ["Vantage Logistics", "$27,750"],
    answerNotContains: ["totalling"],
  },
  {
    id: "devanagari-never-generated",
    dimension: "Devanagari understood but never mirrored",
    message: "आज के बिल दिखाओ",
    answerNotContains: [],
  },
  {
    id: "en-followup-urgent",
    dimension: "follow-up context without contamination",
    message: "which one is most urgent",
    history: [
      { role: "user", text: "list projects" },
      {
        role: "assistant",
        text: "Q4 Product Launch, Wayfinding Refresh, Meridian Renewal",
        tool: "list_projects",
      },
    ],
    direct: true,
  },
];

function widgetTypes(widgets: readonly ResponseWidget[]): readonly string[] {
  return widgets.map((widget) => widget.type);
}

function claimsOf(widgets: readonly ResponseWidget[]): readonly string[] {
  return widgets.flatMap((widget) =>
    widget.type === "analysis"
      ? widget.items.map((item) => item.claim)
      : [],
  );
}

describe("CHAT-UX-01 multilingual chat corpus", () => {
  for (const row of CORPUS) {
    it(`${row.id}: ${row.dimension}`, () => {
      const result = ask(row.message, row.history ?? []);
      const answer = result.version.answer;

      expect(answer.trim().length, "answer must not be blank").toBeGreaterThan(
        0,
      );
      expect(answer, "em dashes stay out of business answers").not.toMatch(
        DASHES,
      );
      expect(answer, "emoji stay out of business answers").not.toMatch(EMOJI);
      expect(
        answer,
        "internal machine names stay out of answers",
      ).not.toMatch(INTERNAL_NAMES);

      if (row.outOfDomain) {
        expect(result.errorCode).toBe("out_of_domain");
        expect(result.tool).toBeUndefined();
        expect(result.version.widgets ?? []).toEqual([]);
      } else if (row.clarifies) {
        expect(result.version.clarification).toBeDefined();
        const clarification = result.version.clarification;
        expect(clarification?.question.trim().length).toBeGreaterThan(0);
        expect(
          clarification?.choices.length,
          "clarification offers concrete choices",
        ).toBeGreaterThanOrEqual(2);
        for (const choice of clarification?.choices ?? []) {
          expect(choice.label.trim().length).toBeGreaterThan(0);
        }
      } else if (row.tool) {
        expect(result.errorCode).toBeUndefined();
        expect(result.tool).toBe(row.tool);
        if (row.direct) {
          expect(result.version.clarification).toBeUndefined();
        }
        if (row.widgetTypes) {
          expect(widgetTypes(result.version.widgets ?? [])).toEqual(
            row.widgetTypes,
          );
        }
        if (row.claims) {
          const claims = claimsOf(result.version.widgets ?? []);
          for (const claim of row.claims) {
            expect(claims, `analysis widget carries ${claim}`).toContain(
              claim,
            );
          }
        }
      }

      for (const pattern of row.answerMatches ?? []) {
        expect(answer).toMatch(pattern);
      }
      for (const fragment of row.answerContains ?? []) {
        expect(answer).toContain(fragment);
      }
      for (const fragment of row.answerNotContains ?? []) {
        expect(answer).not.toContain(fragment);
      }
    });
  }

  it("devanagari-never-generated: Devanagari input never yields Devanagari output", () => {
    const result = ask("आज के बिल दिखाओ");
    expect(result.version.answer).not.toMatch(DEVANAGARI);
  });

  it("suggests at most two contextual suggestions per query", () => {
    for (const query of ["invoice", "capacity", "client", "projects"]) {
      const suggestions = resolveAskSuggestions(query, {
        route: founder.route,
        visibleRecordIds: [],
        missionStateKind: "populated",
      });
      expect(
        suggestions.length,
        `${query} suggestions stay within the cap`,
      ).toBeLessThanOrEqual(2);
      for (const suggestion of suggestions) {
        expect(suggestion.prompt.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("suggests nothing for greetings so small talk stays small", () => {
    for (const query of ["hi", "salam", "ok"]) {
      expect(
        resolveAskSuggestions(query, {
          route: founder.route,
          visibleRecordIds: [],
          missionStateKind: "populated",
        }),
      ).toEqual([]);
    }
  });
});
