import { describe, expect, it } from "vitest";

import { nextResourcePlanStatus } from "./resource-plan-lifecycle.js";

const baseContext = {
  projectActive: true,
  hasRequirements: true,
  hasDraftAssignments: true,
  roleCoverageComplete: true,
  guardAllowsPublish: true,
  actorCanManage: true,
  actorCanApprove: true,
  actorCanPublish: true,
};

describe("resource-plan-lifecycle", () => {
  it("draft to recommendations_ready", () => {
    expect(
      nextResourcePlanStatus("draft", "GENERATE_RECOMMENDATIONS", baseContext),
    ).toBe("recommendations_ready");
  });

  it("founder_review to approved", () => {
    expect(
      nextResourcePlanStatus("founder_review", "APPROVE", baseContext),
    ).toBe("approved");
  });

  it("approved to published", () => {
    expect(
      nextResourcePlanStatus("approved", "PUBLISH", baseContext),
    ).toBe("published");
  });

  it("published to draft on revise", () => {
    expect(
      nextResourcePlanStatus("published", "REVISE", baseContext),
    ).toBe("draft");
  });

  it("rejects approve without coverage", () => {
    expect(
      nextResourcePlanStatus("founder_review", "APPROVE", {
        ...baseContext,
        roleCoverageComplete: false,
      }),
    ).toBe("founder_review");
  });
});
