import { describe, expect, it } from "vitest";

import {
  isProjectPlanImmutable,
  nextProjectStatus,
} from "./project-lifecycle.js";

describe("project lifecycle", () => {
  const ready = {
    planComplete: true,
    actorCanApprove: true,
    actorCanPublish: true,
    actorCanManage: true,
  };

  it("submits draft to in_review when plan is complete", () => {
    expect(nextProjectStatus("draft", "SUBMIT_FOR_REVIEW", ready)).toBe(
      "in_review",
    );
  });

  it("blocks submit when plan is incomplete", () => {
    expect(
      nextProjectStatus("draft", "SUBMIT_FOR_REVIEW", {
        ...ready,
        planComplete: false,
      }),
    ).toBe("draft");
  });

  it("approves from in_review", () => {
    expect(nextProjectStatus("in_review", "APPROVE", ready)).toBe("approved");
  });

  it("publishes from approved", () => {
    expect(nextProjectStatus("approved", "PUBLISH", ready)).toBe("published");
  });

  it("activates from published", () => {
    expect(nextProjectStatus("published", "ACTIVATE", ready)).toBe("active");
  });

  it("marks published plans immutable", () => {
    expect(isProjectPlanImmutable("published")).toBe(true);
    expect(isProjectPlanImmutable("draft")).toBe(false);
  });
});
