import { describe, expect, it } from "vitest";

import type { OpportunityRecord } from "../commercial/api";
import {
  answerAskFlow,
  isSupportedIntent,
  listSupportedIntents,
} from "./ask-flow";

const sampleOpp = {
  id: "opp-1",
  name: "Acme Robotics",
  clientId: "c1",
  serviceId: "s1",
  journeyStatus: "founder_review",
  currency: "USD",
  completeness: 80,
  revision: 1,
} satisfies OpportunityRecord;

describe("ask-flow", () => {
  it("lists governed intents", () => {
    expect(listSupportedIntents().length).toBeGreaterThanOrEqual(8);
    expect(isSupportedIntent("next_action")).toBe(true);
    expect(isSupportedIntent("random_question")).toBe(false);
  });

  it("answers from stored opportunity data without claiming AI work", () => {
    const response = answerAskFlow({
      intent: "summarize_opportunity",
      workspace: "ws",
      opportunities: [sampleOpp],
    });
    expect(response.supported).toBe(true);
    expect(response.answer).toContain("Acme Robotics");
    expect(response.proof).toMatch(/stored|journey/i);
    expect(response.answer).not.toMatch(/I generated|AI wrote/i);
  });

  it("flags guard when capacity conflict intent is selected", () => {
    const response = answerAskFlow({
      intent: "capacity_conflict",
      workspace: "ws",
      opportunities: [],
    });
    expect(response.guardRequired).toBe(true);
    expect(response.proof).toMatch(/capacity|recommendation/i);
  });

  it("honestly reports unsupported empty workspace for opportunity summary", () => {
    const response = answerAskFlow({
      intent: "summarize_opportunity",
      workspace: "ws",
      opportunities: [],
    });
    expect(response.supported).toBe(false);
  });

  it("recommends next action from mission priorities", () => {
    const response = answerAskFlow({
      intent: "next_action",
      workspace: "ws",
      opportunities: [sampleOpp],
    });
    expect(response.supported).toBe(true);
    expect(response.records[0]?.href).toContain("/approvals");
    expect(response.guardRequired).toBe(true);
  });
});
