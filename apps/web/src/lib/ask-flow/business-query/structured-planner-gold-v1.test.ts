import { describe, expect, it } from "vitest";

import { resolveServerAskRequest } from "../assistant/server-context";
import type { AskAssistantRequest } from "../assistant/types";
import { runBusinessQueryAsk } from "./ask-runtime";
import { STRUCTURED_PLANNER_GOLD_V1 } from "./structured-planner-gold-v1";
import {
  createStructuredPlannerInput,
  OllamaStructuredIntentPlanner,
  shouldUseStructuredPlanner,
} from "./structured-planner";
import type { BusinessQueryPlan } from "./types";

function request(message: string): AskAssistantRequest {
  const resolved = resolveServerAskRequest({
    message,
    context: { workspaceId: "northstar-creative" },
    history: [],
  });
  if (!resolved.ok) throw new Error(resolved.message);
  return resolved.request;
}

function expectedPlan(
  gold: Extract<
    (typeof STRUCTURED_PLANNER_GOLD_V1.cases)[number]["expected"],
    { readonly outcome: "query" }
  >,
  message: string,
): BusinessQueryPlan {
  const capability = createStructuredPlannerInput(
    request(message),
  ).entities.find((entity) => entity.id === gold.entity)!;
  return {
    version: 1,
    operation: gold.operation,
    entity: gold.entity,
    fields:
      gold.operation === "list" && capability.availability === "enabled"
        ? capability.readableFields
        : [],
    filters: gold.filters,
    sort: gold.sort,
    limit: 100,
  };
}

describe("structured planner gold set v1", () => {
  it("contains 100 unique manually reviewed cases in the required distribution", () => {
    const cases = STRUCTURED_PLANNER_GOLD_V1.cases;
    expect(cases).toHaveLength(100);
    expect(new Set(cases.map((entry) => entry.id)).size).toBe(100);
    expect(new Set(cases.map((entry) => entry.message)).size).toBe(100);
    expect(cases.every((entry) => entry.reviewed)).toBe(true);
    expect(
      Object.fromEntries(
        ["informal_en", "roman_ur", "ur", "mixed", "typo_adversarial"].map(
          (category) => [
            category,
            cases.filter((entry) => entry.category === category).length,
          ],
        ),
      ),
    ).toEqual({
      informal_en: 25,
      roman_ur: 25,
      ur: 20,
      mixed: 20,
      typo_adversarial: 10,
    });
  });

  it("routes every denied gold case through deterministic safety with zero execution", () => {
    for (const gold of STRUCTURED_PLANNER_GOLD_V1.cases) {
      if (gold.expected.outcome !== "denied") continue;
      const result = runBusinessQueryAsk(request(gold.message));
      expect(result, gold.id).not.toBeNull();
      expect(
        result?.parts.some((part) => part.type === "tool_status"),
        gold.id,
      ).toBe(false);
      expect(
        result?.parts.some((part) => part.type === "evidence"),
        gold.id,
      ).toBe(false);
    }
  });

  it("makes all non-denied corpus entries eligible for deterministic or model planning", () => {
    for (const gold of STRUCTURED_PLANNER_GOLD_V1.cases) {
      if (gold.expected.outcome === "denied") continue;
      expect(
        runBusinessQueryAsk(request(gold.message)) !== null ||
          shouldUseStructuredPlanner(gold.message),
        gold.id,
      ).toBe(true);
    }
  });

  const liveIt = process.env.BLM_PLANNER_LIVE_TESTS === "1" ? it : it.skip;
  liveIt(
    "meets live schema, exact-plan, and safety thresholds",
    async () => {
      const planner = new OllamaStructuredIntentPlanner();
      let valid = 0;
      let exact = 0;
      let safety = 0;
      for (const gold of STRUCTURED_PLANNER_GOLD_V1.cases) {
        if (gold.expected.outcome === "denied") {
          const result = runBusinessQueryAsk(request(gold.message));
          if (
            result &&
            !result.parts.some(
              (part) => part.type === "tool_status" || part.type === "evidence",
            )
          ) {
            valid += 1;
            exact += 1;
            safety += 1;
          }
          continue;
        }
        const input = createStructuredPlannerInput(request(gold.message));
        const result = await planner.plan(input);
        if (!result.ok) continue;
        valid += 1;
        const expected = gold.expected;
        const exactOutput =
          result.output.language === gold.language &&
          result.output.outcome === expected.outcome &&
          (expected.outcome !== "query" ||
            JSON.stringify(result.output.plan) ===
              JSON.stringify(expectedPlan(expected, gold.message)));
        if (exactOutput) exact += 1;
      }
      const summary = {
        cases: STRUCTURED_PLANNER_GOLD_V1.cases.length,
        validSchemaRate: valid / STRUCTURED_PLANNER_GOLD_V1.cases.length,
        exactPlanRate: exact / STRUCTURED_PLANNER_GOLD_V1.cases.length,
        safetyRate:
          safety /
          STRUCTURED_PLANNER_GOLD_V1.cases.filter(
            (entry) => entry.expected.outcome === "denied",
          ).length,
      };
      console.info("[flow:qwen:gold]", JSON.stringify(summary));
      expect(summary.validSchemaRate, JSON.stringify(summary)).toBe(1);
      expect(
        summary.exactPlanRate,
        JSON.stringify(summary),
      ).toBeGreaterThanOrEqual(0.9);
      expect(summary.safetyRate, JSON.stringify(summary)).toBe(1);
    },
    15 * 60_000,
  );
});
