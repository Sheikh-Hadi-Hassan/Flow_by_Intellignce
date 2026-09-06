import { describe, expect, it } from "vitest";

import {
  legacyResolveAskAnswer,
  resolveAskAnswer,
  resolveClarificationAnswer,
} from "./resolve";
import type { AskApplicationContext } from "./types";

const context: AskApplicationContext = {
  workspaceId: "northstar-creative",
  userId: "ns-res-maya",
  role: "Founder",
  permissions: ["opportunity.read"],
  route: "/northstar-creative/admin",
  visibleRecordIds: [],
  locale: "en-US",
  currency: "USD",
  timezone: "America/Chicago",
  conversationId: "ask-test",
};

const FALLBACK_MARK =
  "I do not have a sourced match for that exact question yet";

describe("resolveAskAnswer", () => {
  it("AF-02 defect: unmatched questions share one generic fallback", () => {
    const hi = legacyResolveAskAnswer("hi", context);
    const sales = legacyResolveAskAnswer("list today sales update", context);
    const typo = legacyResolveAskAnswer("lis all project", context);
    const payment = legacyResolveAskAnswer(
      "Show clients with worsening payment behaviour",
      context,
    );
    expect(hi.answer).toContain(FALLBACK_MARK);
    expect(sales.answer).toContain(FALLBACK_MARK);
    expect(typo.answer).toContain(FALLBACK_MARK);
    expect(payment.answer).toContain(FALLBACK_MARK);
    expect(hi.id).toBe("ver-fallback");
    expect(sales.id).toBe("ver-fallback");
    expect(typo.id).toBe("ver-fallback");
    expect(payment.id).toBe("ver-fallback");
  });

  it("returns a sourced catalog answer", () => {
    const result = resolveAskAnswer("explain the open exposure", {
      ...context,
      missionStateKind: "populated",
      permissions: [...context.permissions, "finance.read", "opportunity.manage"],
    });
    expect(result.answer).toContain("Meridian");
    expect(result.answer).toContain("3 open");
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("answers dense exposure from the dense snapshot, not populated copy", () => {
    const result = resolveAskAnswer("explain the open exposure", {
      ...context,
      missionStateKind: "dense",
      permissions: [...context.permissions, "finance.read", "opportunity.manage"],
    });
    expect(result.answer).toContain("4 open");
    expect(result.related).toHaveLength(4);
    expect(result.answer).not.toMatch(/356/);
  });

  it("asks a counter-question instead of failing a reassignment", () => {
    const result = resolveAskAnswer(
      "Move this project to another employee.",
      context,
    );
    expect(result.clarification?.choices).toHaveLength(2);
    expect(result.answer).toMatch(/deadline or protecting margin/i);
  });

  it("preserves the question when clarifying", () => {
    const prior = resolveAskAnswer("Move this project to another employee.", context);
    const next = resolveClarificationAnswer("deadline", prior);
    expect(next.question).toBe(prior.question);
    expect(next.answer).toContain("Taylor Kim");
    expect(next.id).not.toBe(prior.id);
  });
});
