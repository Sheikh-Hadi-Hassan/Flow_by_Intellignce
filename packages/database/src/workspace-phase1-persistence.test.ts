import { describe, expect, it } from "vitest";

import type { SqlExecutor } from "./sql-executor.js";
import { PostgresWorkspacePhase1Repository } from "./workspace-phase1-persistence.js";

class FakeSqlExecutor implements SqlExecutor {
  readonly calls: { sql: string; params: readonly unknown[] }[] = [];

  constructor(private readonly rows: readonly unknown[] = []) {}

  async query<T>(
    sql: string,
    params: readonly unknown[],
  ): Promise<{ readonly rows: T[] }> {
    this.calls.push({ sql, params });
    return Promise.resolve({ rows: this.rows as T[] });
  }
}

describe("PostgresWorkspacePhase1Repository", () => {
  it("upserts onboarding with json payloads", async () => {
    const db = new FakeSqlExecutor();
    const repository = new PostgresWorkspacePhase1Repository(db);
    const state = {
      workspaceId: "ws-1",
      currentStep: "business" as const,
      business: {
        businessName: "Northstar Creative",
        businessType: "creative_marketing_agency",
        description: "",
        website: "",
        country: "US",
        currency: "USD",
        teamSize: "35",
        operatingModel: "Hybrid",
      },
      operations: {
        workModels: ["retainer"],
        teamLocation: "hybrid",
        clientType: "b2b_enterprise",
        projectDuration: "8-14_weeks",
        tools: [],
        operationalConcern: "scope_creep",
      },
      services: [],
      policies: {
        proposalApproval: "founder",
        contractApproval: "founder",
        projectCreationApproval: "operations_lead",
        invoiceApproval: "finance",
        expenseApproval: "founder",
        clientVisibility: "deliverables_only",
        aiAutonomy: "recommend_draft",
      },
      version: 1,
      updatedAt: "2026-08-30T00:00:00.000Z",
    };

    await repository.upsertOnboarding(state);

    expect(db.calls[0]?.sql).toContain("workspace_onboarding_states");
    expect(db.calls[0]?.params?.[0]).toBe("ws-1");
    expect(db.calls[0]?.params?.[2]).toContain("Northstar Creative");
  });

  it("reads user profiles by user id", async () => {
    const db = new FakeSqlExecutor([
      { user_id: "user-1", first_name: "Maya" },
    ]);
    const repository = new PostgresWorkspacePhase1Repository(db);
    const profile = await repository.getUserProfile("user-1");
    expect(profile).toEqual({ userId: "user-1", firstName: "Maya" });
  });
});
