import { describe, expect, it } from "vitest";

import {
  InMemoryProposalContractRepository,
} from "./proposal-contract-persistence.js";

describe("proposal contract persistence", () => {
  it("blocks immutable proposal version updates", async () => {
    const repo = new InMemoryProposalContractRepository();
    const proposal = await repo.createProposal({
      id: "p1",
      workspaceId: "w1",
      opportunityId: "o1",
      briefVersionId: "b1",
      currency: "USD",
      revision: 1,
    });
    const version = await repo.createProposalVersion({
      id: "pv1",
      workspaceId: "w1",
      proposalId: proposal.id,
      versionNumber: 1,
      status: "approved",
      pricingModel: "project",
      calculation: {},
      sections: [{ sectionKey: "terms", title: "Terms", body: "x", sortOrder: 0 }],
      packages: [],
    });
    await repo.updateProposalVersionStatus("w1", version.id, "accepted", {
      immutableAt: new Date().toISOString(),
    });
    await expect(
      repo.updateProposalVersionStatus("w1", version.id, "sent"),
    ).rejects.toThrow(/final proposal/i);
  });

  it("isolates workspaces on proposal reads", async () => {
    const repo = new InMemoryProposalContractRepository();
    await repo.createProposal({
      id: "p1",
      workspaceId: "w1",
      opportunityId: "o1",
      briefVersionId: "b1",
      currency: "USD",
      revision: 1,
    });
    expect(await repo.getProposalByOpportunity("w2", "o1")).toBeUndefined();
  });
});
