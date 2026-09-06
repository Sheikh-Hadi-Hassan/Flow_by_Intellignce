import { describe, expect, it } from "vitest";

import { detectAskLanguage } from "../language";
import type { AskApplicationContext } from "../types";
import {
  answerAskSync,
  LocalBusinessLanguageModelAdapter,
} from "./local-adapter";
import {
  answerLanguageOf,
  detectAnswerLanguage,
  phraseColumns,
  phraseKeys,
  tPhrase,
} from "./phrases";
import { ASK_TOOL_DEFINITIONS } from "./tools";
import type { AskAssistantRequest } from "./types";

const URDU_SCRIPT =
  /[\u0679\u0688\u0691\u0686\u067E\u0698\u06A9\u06AF\u06BA\u06BE\u06CC\u06D2]/;
const ARABIC_SCRIPT = /[\u0621-\u063A\u0641-\u064A]/;
const DASHES = /\u2014|\u2013/;
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/u;

const LANGUAGES = ["en", "ur", "ur_roman", "ar"] as const;

describe("phrase dictionary", () => {
  it("interpolates params and numeric params", () => {
    expect(tPhrase("summary.decisions", "en", { count: 3, plural: "s" })).toBe(
      "3 decisions need you",
    );
    expect(tPhrase("projects.count", "en", { count: 4 })).toBe("4 projects.");
    expect(
      tPhrase("summary.exposed", "ur_roman", { exposure: "$356,000" }),
    ).toBe("aur $356,000 khatray mein hai");
  });

  it("replaces missing params with an empty string", () => {
    expect(tPhrase("invoices.count", "en", { count: 2 })).toBe(
      "2 overdue invoices totalling : .",
    );
  });

  it("returns an empty string for unknown keys and defaults to en", () => {
    expect(tPhrase("nope.missing", "ur")).toBe("");
    expect(tPhrase("reason.greeting")).toBe(
      "I'm here to help with workspace records. Try asking about invoices, projects, or clients.",
    );
  });

  it("exposes every key with four non-empty columns", () => {
    expect(phraseKeys().length).toBe(65);
    for (const key of phraseKeys()) {
      const table = phraseColumns(key);
      expect(table, key).toBeDefined();
      for (const language of LANGUAGES) {
        expect(table?.[language]?.trim(), `${key}[${language}]`).not.toBe("");
      }
    }
  });

  it("keeps em dashes and emoji out of every column", () => {
    for (const key of phraseKeys()) {
      const table = phraseColumns(key);
      for (const language of LANGUAGES) {
        expect(table?.[language], `${key}[${language}]`).not.toMatch(DASHES);
        expect(table?.[language], `${key}[${language}]`).not.toMatch(EMOJI);
      }
    }
  });

  it("pins the English column byte for byte", () => {
    expect(tPhrase("summary.decisions", "en", { count: 1, plural: "" })).toBe(
      "1 decision need you",
    );
    expect(
      tPhrase("invoices.count", "en", {
        count: 2,
        total: "$27,750",
        list: "A; B",
      }),
    ).toBe("2 overdue invoices totalling $27,750: A; B.");
    expect(
      tPhrase("invoices.row", "en", {
        client: "Vantage Logistics",
        reference: "INV-2041",
        amount: "$18,500",
        days: 34,
      }),
    ).toBe("Vantage Logistics INV-2041 $18,500 (34 days)");
    expect(tPhrase("capacity.deadline", "en", { name: "Taylor Kim" })).toBe(
      "Protecting the deadline: Taylor Kim can take the Vantage review this week. Margin on that path stays at the current 38% until you reopen pricing.",
    );
    expect(tPhrase("reason.greeting", "en")).toBe(
      "I'm here to help with workspace records. Try asking about invoices, projects, or clients.",
    );
    expect(tPhrase("error.toolUnavailable", "en")).toBe(
      "I could not retrieve authoritative records for that. Your question was kept. Retry or pick another view.",
    );
    expect(tPhrase("error.runtimeUnavailable", "en")).toBe(
      "The Business Language Model runtime is unavailable in this session. Your question was kept. Retry when the runtime is back.",
    );
  });
});

describe("answerLanguageOf", () => {
  it("maps detections to the four answer languages", () => {
    expect(
      answerLanguageOf({ language: "en", script: "latin", signals: [] }),
    ).toBe("en");
    expect(
      answerLanguageOf({ language: "en", script: "devanagari", signals: [] }),
    ).toBe("en");
    expect(
      answerLanguageOf({ language: "ur", script: "arabic", signals: [] }),
    ).toBe("ur");
    expect(
      answerLanguageOf({ language: "ur", script: "mixed", signals: [] }),
    ).toBe("ur");
    expect(
      answerLanguageOf({ language: "ur", script: "latin", signals: [] }),
    ).toBe("ur_roman");
    expect(
      answerLanguageOf({
        language: "mixed_ur_en",
        script: "latin",
        signals: [],
      }),
    ).toBe("ur_roman");
    expect(
      answerLanguageOf({ language: "ar", script: "arabic", signals: [] }),
    ).toBe("ar");
  });

  it("detects the answer language from raw messages", () => {
    expect(detectAnswerLanguage("show all overdue invoices")).toBe("en");
    expect(detectAnswerLanguage("list overdue invoices دکھاؤ")).toBe("ur");
    expect(detectAnswerLanguage("mujhe overdue invoices list karo")).toBe(
      "ur_roman",
    );
    expect(
      detectAnswerLanguage("show me overdue invoices ka total batao"),
    ).toBe("ur_roman");
    expect(detectAnswerLanguage("show overdue invoices الآن")).toBe("ar");
    expect(detectAnswerLanguage("أظهر الفواتير المتأخرة")).toBe("ar");
  });

  it("mirrors a ur locale hint for a single roman marker", () => {
    expect(detectAnswerLanguage("salam", "ur-PK")).toBe("ur_roman");
  });

  it("never mirrors Devanagari unless Urdu or Arabic script is also present", () => {
    expect(detectAskLanguage("आज के बिल दिखाओ")).toMatchObject({
      language: "en",
      script: "devanagari",
    });
    expect(detectAnswerLanguage("आज के बिल दिखाओ")).toBe("en");
    expect(detectAskLanguage("बिल دکھاؤ")).toMatchObject({
      language: "ur",
      script: "mixed",
    });
    expect(detectAnswerLanguage("बिल دکھاؤ")).toBe("ur");
  });
});

describe("answer language mirroring", () => {
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
    conversationId: "ask-af02",
    missionStateKind: "populated",
  };

  function ask(
    message: string,
    extra: Partial<AskApplicationContext> = {},
    history: AskAssistantRequest["history"] = [],
    options?: ConstructorParameters<
      typeof LocalBusinessLanguageModelAdapter
    >[0],
  ) {
    return answerAskSync(
      {
        context: { ...founder, ...extra },
        message,
        history,
        tools: ASK_TOOL_DEFINITIONS,
      },
      options,
    );
  }

  it("answers in English with English copy by default", () => {
    const result = ask("show all overdue invoices");
    expect(result.tool).toBe("list_overdue_invoices");
    expect(result.version.answer).toContain("totalling");
    expect(result.version.answer).toContain("$27,750");
    expect(result.version.answer).toContain("Vantage Logistics");
  });

  it("mirrors Urdu script while keeping business values untranslated", () => {
    const result = ask("list overdue invoices دکھاؤ");
    expect(result.tool).toBe("list_overdue_invoices");
    expect(result.version.answer).toMatch(URDU_SCRIPT);
    expect(result.version.answer).toContain("انوائسز");
    expect(result.version.answer).not.toContain("totalling");
    for (const value of [
      "Vantage Logistics",
      "Kestrel Foods",
      "INV-2041",
      "INV-2038",
      "$18,500",
      "$9,250",
      "$27,750",
    ]) {
      expect(result.version.answer).toContain(value);
    }
  });

  it("mirrors Roman Urdu while keeping business values untranslated", () => {
    const result = ask("mujhe overdue invoices list karo");
    expect(result.tool).toBe("list_overdue_invoices");
    expect(result.version.answer).toContain("total $27,750");
    expect(result.version.answer).toContain("Vantage Logistics");
    expect(result.version.answer).toContain("INV-2041");
    expect(result.version.answer).toContain("$18,500");
    expect(result.version.answer).not.toContain("totalling");
  });

  it("mirrors mixed Roman Urdu and English to Roman Urdu", () => {
    const result = ask("show me overdue invoices ka total batao");
    expect(result.tool).toBe("list_overdue_invoices");
    expect(result.version.answer).toContain("total $27,750");
    expect(result.version.answer).toContain("Vantage Logistics");
  });

  it("mirrors Arabic script while keeping business values untranslated", () => {
    const result = ask("show overdue invoices الآن");
    expect(result.tool).toBe("list_overdue_invoices");
    expect(result.version.answer).toMatch(ARABIC_SCRIPT);
    expect(result.version.answer).toContain("فواتير");
    expect(result.version.answer).toContain("$27,750");
    expect(result.version.answer).toContain("Vantage Logistics");
    expect(result.version.answer).not.toContain("totalling");
  });

  it("keeps exposure amounts untranslated in a mirrored answer", () => {
    const result = ask("Why is $356K exposed? کیوں");
    expect(result.tool).toBe("explain_open_exposure");
    expect(result.version.answer).toContain("$356,000");
    expect(result.version.answer).toMatch(URDU_SCRIPT);
  });

  it("routes the same tool regardless of question language", () => {
    expect(ask("show all overdue invoices").tool).toBe(
      ask("list overdue invoices دکھاؤ").tool,
    );
    expect(ask("show all overdue invoices").tool).toBe(
      ask("mujhe overdue invoices list karo").tool,
    );
    expect(ask("show all overdue invoices").tool).toBe(
      ask("show overdue invoices الآن").tool,
    );
  });

  it("localizes the out-of-domain greeting for pure Urdu script", () => {
    const result = ask("آج کے کاروبار کا حال بتاؤ");
    expect(result.version.answer).toMatch(URDU_SCRIPT);
    expect(result.version.answer).toContain("پروجیکٹس");
    expect(result.version.answer).not.toMatch(/workspace records/i);
  });

  it("localizes the out-of-domain greeting for pure Arabic script", () => {
    const result = ask("ما حالة أعمالي اليوم");
    expect(result.version.answer).toMatch(ARABIC_SCRIPT);
    expect(result.version.answer).toContain("المشاريع");
    expect(result.version.answer).not.toMatch(/workspace records/i);
  });

  it("localizes clarification questions", () => {
    const result = ask("list projects دکھاؤ");
    expect(result.version.clarification).toBeDefined();
    expect(result.version.clarification?.question).toMatch(URDU_SCRIPT);
  });

  it("localizes runtime and tool errors", () => {
    const unavailable = ask("list overdue invoices دکھاؤ", {}, [], {
      unavailable: true,
    });
    expect(unavailable.errorCode).toBe("model_unavailable");
    expect(unavailable.version.answer).toMatch(URDU_SCRIPT);
    expect(unavailable.version.answer).toContain("دستیاب");

    const failed = ask("list overdue invoices دکھاؤ", {}, [], {
      failTool: "list_overdue_invoices",
    });
    expect(failed.errorCode).toBe("tool_unavailable");
    expect(failed.version.answer).toMatch(URDU_SCRIPT);
    expect(failed.version.answer).toContain("مستند");
  });

  it("mirrors the localized OpenRouter directive languages", () => {
    expect(detectAnswerLanguage("mujhe overdue invoices list karo")).toBe(
      "ur_roman",
    );
    expect(detectAnswerLanguage("list overdue invoices دکھاؤ")).toBe("ur");
    expect(detectAnswerLanguage("show overdue invoices الآن")).toBe("ar");
    expect(LocalBusinessLanguageModelAdapter).toBeDefined();
  });
});
