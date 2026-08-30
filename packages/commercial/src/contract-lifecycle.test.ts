import { describe, expect, it } from "vitest";

import { nextContractStatus } from "./contract-lifecycle.js";

describe("contract lifecycle", () => {
  const ready = {
    clausesComplete: true,
    partiesComplete: true,
    paymentScheduleValid: true,
    actorCanApprove: true,
    acceptanceEvidencePresent: true,
  };

  it("submits draft to in_review", () => {
    expect(nextContractStatus("draft", "SUBMIT_FOR_REVIEW", ready)).toBe(
      "in_review",
    );
  });

  it("moves to pending client acceptance on approve", () => {
    expect(nextContractStatus("in_review", "APPROVE", ready)).toBe(
      "pending_client_acceptance",
    );
  });

  it("executes on client accept", () => {
    expect(
      nextContractStatus("pending_client_acceptance", "CLIENT_ACCEPT", ready),
    ).toBe("executed");
  });
});
