import { describe, expect, it } from "vitest";

import { journeyBadge } from "../../components/commercial/Status";

describe("commercial UI status mapping", () => {
  it("distinguishes draft, missing, review, and approved", () => {
    expect(journeyBadge("collecting_information")).toBe("default");
    expect(journeyBadge("missing_information")).toBe("warning");
    expect(journeyBadge("founder_review")).toBe("essential");
    expect(journeyBadge("approved")).toBe("success");
  });
});
