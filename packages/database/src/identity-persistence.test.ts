import { describe, expect, it } from "vitest";

import type { SqlExecutor } from "./sql-executor.js";
import { PostgresFlowIdentityRepository } from "./identity-persistence.js";

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

class SequencedSqlExecutor implements SqlExecutor {
  readonly calls: { sql: string; params: readonly unknown[] }[] = [];
  private call = 0;

  constructor(private readonly sequences: readonly (readonly unknown[])[]) {}

  async query<T>(
    sql: string,
    params: readonly unknown[],
  ): Promise<{ readonly rows: T[] }> {
    this.calls.push({ sql, params });
    const rows = this.sequences[this.call] ?? [];
    this.call += 1;
    return Promise.resolve({ rows: rows as T[] });
  }
}

describe("PostgresFlowIdentityRepository", () => {
  it("creates workspaces with slug lookup", async () => {
    const db = new FakeSqlExecutor([
      {
        id: "ws-1",
        name: "Northstar Creative",
        slug: "northstar-creative",
      },
    ]);
    const repository = new PostgresFlowIdentityRepository(db);
    const workspace = await repository.createWorkspace({
      name: "Northstar Creative",
      slug: "northstar-creative",
    });
    expect(workspace.slug).toBe("northstar-creative");
    expect(db.calls[0]?.sql).toContain("insert into public.workspaces");
  });

  it("resolves membership authorization from persisted joins", async () => {
    const membership = {
      id: "membership-1",
      workspace_id: "ws-1",
      user_id: "user-1",
      status: "ACTIVE",
      created_at: "2026-08-30T00:00:00.000Z",
      updated_at: "2026-08-30T00:00:00.000Z",
    };
    const db = new SequencedSqlExecutor([
      [membership],
      [
        {
          id: "user-1",
          auth_provider: "supabase",
          auth_subject_id: "11111111-1111-4111-8111-111111111111",
          email: "maya@northstar-creative.demo",
        },
      ],
      [
        {
          id: "ws-1",
          name: "Northstar Creative",
          slug: "northstar-creative",
        },
      ],
      [
        {
          id: "role-1",
          workspace_id: "ws-1",
          key: "FOUNDER",
          name: "Founder",
        },
      ],
      [
        {
          id: "perm-1",
          key: "onboarding.read",
          description: "Read workspace onboarding state.",
        },
      ],
    ]);

    const repository = new PostgresFlowIdentityRepository(db);
    const resolved = await repository.resolveMembership({
      userId: "user-1",
      workspaceId: "ws-1",
    });

    expect(resolved?.permissions.map((permission) => permission.key)).toContain(
      "onboarding.read",
    );
    expect(resolved?.workspace.slug).toBe("northstar-creative");
  });
});
