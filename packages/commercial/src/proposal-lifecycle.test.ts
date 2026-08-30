import { describe, expect, it } from "vitest";

import { nextProposalStatus } from "./proposal-lifecycle.js";

describe("proposal lifecycle", () => {
  const ready = {
    sectionsComplete: true,
    pricingValid: true,
    actorCanApprove: true,
    actorCanShare: true,
    hasValidShare: true,
  };

  it("submits draft to in_review when complete", () => {
    expect(nextProposalStatus("draft", "SUBMIT_FOR_REVIEW", ready)).toBe(
      "in_review",
    );
  });

  it("approves from in_review", () => {
    expect(nextProposalStatus("in_review", "APPROVE", ready)).toBe("approved");
  });

  it("accepts from client_review", () => {
    expect(nextProposalStatus("client_review", "CLIENT_ACCEPT", ready)).toBe(
      "accepted",
    );
  });
});
