import { describe, expect, it } from "vitest";

import { resolveAskSuggestions } from "./suggestions";

const ctx = { route: "/northstar-creative/admin", visibleRecordIds: [] };

describe("resolveAskSuggestions", () => {
  it("stays empty below two characters", () => {
    expect(resolveAskSuggestions("i", ctx)).toEqual([]);
    expect(resolveAskSuggestions("  ", ctx)).toEqual([]);
  });

  it("returns at most two invoice suggestions for invoice", () => {
    const prompts = resolveAskSuggestions("invoice", ctx).map((row) => row.prompt);
    expect(prompts).toEqual([
      "Which invoices are overdue?",
      "Draft a payment reminder for Vantage Logistics",
    ]);
    expect(prompts).not.toContain("Show clients with worsening payment behaviour");
  });

  it("returns at most two capacity suggestions for capacity", () => {
    const prompts = resolveAskSuggestions("capacity", ctx).map((row) => row.prompt);
    expect(prompts).toEqual([
      "Who can take the Vantage work?",
      "Which employees are overallocated?",
    ]);
    expect(prompts).not.toContain(
      "What work can be moved without affecting deadlines?",
    );
  });

  it("derives the exposure prompt from the active state", () => {
    const populated = resolveAskSuggestions("exposed", {
      ...ctx,
      missionStateKind: "populated",
    }).map((row) => row.prompt);
    const dense = resolveAskSuggestions("exposed", {
      ...ctx,
      missionStateKind: "dense",
    }).map((row) => row.prompt);
    expect(populated).toContain("Why is $356,000 exposed?");
    expect(dense).toContain("Why is $360,200 exposed?");
    expect(dense.join(" ")).not.toContain("356,000");
  });

  it("hides record-backed suggestions when the active state has no records", () => {
    const emptyCtx = { ...ctx, missionStateKind: "empty" as const };
    expect(resolveAskSuggestions("invoice", emptyCtx)).toEqual([]);
    expect(resolveAskSuggestions("exposed", emptyCtx)).toEqual([]);
    expect(resolveAskSuggestions("approval", emptyCtx)).toEqual([]);
  });
});
