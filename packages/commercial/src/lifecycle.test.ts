import { describe, expect, it } from "vitest";

import { canApprove, nextJourneyStatus } from "./lifecycle.js";
import type { JourneyGuardInput } from "./types.js";

const ready: JourneyGuardInput = {
  requiredInformationComplete: true,
  requiredEvidenceAvailable: true,
  calculationsCompleted: true,
  blockingRisksHandled: true,
  actorCanApprove: true,
  versionMatches: true,
  unansweredRequiredQuestions: 0,
  briefExists: true,
};

describe("opportunity journey", () => {
  it("moves missing questions into missing_information", () => {
    expect(
      nextJourneyStatus("collecting_information", "INFORMATION_CHANGED", {
        ...ready,
        requiredInformationComplete: false,
        unansweredRequiredQuestions: 2,
        briefExists: false,
        calculationsCompleted: false,
      }),
    ).toBe("missing_information");
  });

  it("rejects approval without permission or version match", () => {
    expect(
      canApprove({
        ...ready,
        actorCanApprove: false,
      }),
    ).toBe(false);
    expect(
      nextJourneyStatus("founder_review", "APPROVE", {
        ...ready,
        versionMatches: false,
      }),
    ).toBe("founder_review");
  });

  it("becomes ready_for_brief when required information is complete", () => {
    expect(
      nextJourneyStatus("collecting_information", "READY_CHECKED", {
        ...ready,
        briefExists: false,
      }),
    ).toBe("ready_for_brief");
    expect(
      nextJourneyStatus("ready_for_brief", "GENERATE_BRIEF", {
        ...ready,
        briefExists: false,
        actorCanApprove: false,
      }),
    ).toBe("brief_draft");
  });

  it("approves only when guards pass", () => {
    expect(nextJourneyStatus("founder_review", "APPROVE", ready)).toBe(
      "approved",
    );
    expect(nextJourneyStatus("founder_review", "REQUEST_CHANGES", ready)).toBe(
      "changes_requested",
    );
  });
});
