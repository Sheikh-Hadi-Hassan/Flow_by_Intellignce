import { describe, expect, it } from "vitest";

import { InMemoryCommercialRepository } from "./commercial-persistence.js";

describe("commercial repository", () => {
  it("isolates workspaces and blocks approved brief mutation", async () => {
    const repo = new InMemoryCommercialRepository();
    await repo.createService({
      id: "svc-a",
      workspaceId: "ws-a",
      name: "Brand",
      slug: "brand",
      pricingModel: "project",
      currency: "USD",
      defaultTargetMarginBps: 4000,
      defaultContingencyBps: 1000,
      status: "active",
      revision: 1,
    });
    expect(await repo.listServices("ws-b")).toEqual([]);
    await repo.createBriefVersion({
      id: "bv-1",
      workspaceId: "ws-a",
      briefId: "b-1",
      opportunityId: "opp-1",
      versionNumber: 1,
      status: "approved",
      sections: [],
    });
    await expect(
      repo.updateBriefVersionStatus("ws-a", "bv-1", "draft"),
    ).rejects.toThrow(/immutable/);
  });

  it("treats idempotency keys as single-use", async () => {
    const repo = new InMemoryCommercialRepository();
    const first = await repo.consumeIdempotency({
      workspaceId: "ws-a",
      key: "k1",
      requestClass: "approve",
      fingerprint: "f1",
    });
    const second = await repo.consumeIdempotency({
      workspaceId: "ws-a",
      key: "k1",
      requestClass: "approve",
      fingerprint: "f1",
    });
    expect(first).toBe("new");
    expect(second).toBe("replay");
    await expect(
      repo.consumeIdempotency({
        workspaceId: "ws-a",
        key: "k1",
        requestClass: "approve",
        fingerprint: "different",
      }),
    ).rejects.toThrow(/conflicts/);
  });

  it("writes workspace-scoped requirements and skips duplicate risks", async () => {
    const repo = new InMemoryCommercialRepository();
    await repo.upsertRequirement({
      id: "req-1",
      workspaceId: "ws-a",
      opportunityId: "opp-1",
      key: "audience",
      statement: "Plant managers",
    });
    await repo.addRisk({
      id: "risk-1",
      workspaceId: "ws-a",
      opportunityId: "opp-1",
      statement: "Legal review of claims",
      blocking: false,
      handled: true,
    });
    await repo.addRisk({
      id: "risk-2",
      workspaceId: "ws-a",
      opportunityId: "opp-1",
      statement: "Legal review of claims",
      blocking: false,
      handled: true,
    });
    expect(await repo.listRequirements("ws-b", "opp-1")).toEqual([]);
    expect(await repo.listRequirements("ws-a", "opp-1")).toHaveLength(1);
    expect(await repo.listRisks("ws-a", "opp-1")).toHaveLength(1);
  });
});
