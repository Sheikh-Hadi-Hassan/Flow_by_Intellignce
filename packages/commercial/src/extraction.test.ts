import { describe, expect, it } from "vitest";

import { FixtureDiscoveryExtractor } from "./extraction.js";
import { scopeWritesFromVerifiedFact } from "./scope.js";

describe("fixture extraction provenance", () => {
  it("keeps drafts even when confidence is high", async () => {
    const extractor = new FixtureDiscoveryExtractor();
    const drafts = await extractor.extract({
      sourceId: "src-1",
      extractionRunId: "run-1",
      sourceText: `Audience: plant managers.
Budget: $85000. Timeline is 90 days through launch.
Legal review of claims is likely.`,
    });
    expect(drafts.every((fact) => fact.status === "draft")).toBe(true);
    expect(drafts.map((fact) => fact.category)).toEqual(
      expect.arrayContaining(["audience", "budget", "timeline", "risk"]),
    );
    expect(drafts[0]?.characterStart).toBeGreaterThanOrEqual(0);
  });

  it("does not treat high confidence as verified", () => {
    const writes = scopeWritesFromVerifiedFact({
      category: "audience",
      candidateFact: "plant managers",
    });
    expect(writes).toEqual([
      {
        kind: "requirement",
        key: "audience",
        statement: "plant managers",
      },
    ]);
  });
});
