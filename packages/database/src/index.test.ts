import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createFlowIdentityTestRepository } from "./index.js";

describe("identity authorization repository", () => {
  it("resolves users from stable auth provider subject identifiers", async () => {
    const repository = createFlowIdentityTestRepository();

    await expect(
      repository.findUserByProviderSubject({
        authProvider: "supabase",
        authSubjectId: "supabase-auth-user-alice",
      }),
    ).resolves.toMatchObject({ id: "flow-user-alice" });
  });

  it("does not expose Workspace B permissions when Workspace A is selected", async () => {
    const repository = createFlowIdentityTestRepository();

    const alpha = await repository.resolveMembership({
      userId: "flow-user-alice",
      workspaceId: "workspace-alpha",
    });
    const beta = await repository.resolveMembership({
      userId: "flow-user-alice",
      workspaceId: "workspace-beta",
    });

    expect(alpha?.workspace.id).toBe("workspace-alpha");
    expect(alpha?.permissions.map((permission) => permission.key)).toEqual([
      "system.echo",
    ]);
    expect(beta?.workspace.id).toBe("workspace-beta");
    expect(beta?.permissions).toEqual([]);
  });

  it("reflects role changes in subsequent authorization resolution", async () => {
    const repository = createFlowIdentityTestRepository();

    expect(
      (
        await repository.resolveMembership({
          userId: "flow-user-alice",
          workspaceId: "workspace-alpha",
        })
      )?.permissions.map((permission) => permission.key),
    ).toEqual(["system.echo"]);

    repository.replaceMembershipRoles({
      membershipId: "membership-alice-alpha",
      roleIds: ["role-alpha-owner"],
    });

    expect(
      (
        await repository.resolveMembership({
          userId: "flow-user-alice",
          workspaceId: "workspace-alpha",
        })
      )?.permissions.map((permission) => permission.key),
    ).toEqual(["system.echo", "system.highRisk"]);
  });
});

describe("identity authorization RLS migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../supabase/migrations/20260810000200_identity_authorization_rls.sql",
    ),
    "utf8",
  );

  it("enables RLS on foundational tenant-owned authorization tables", () => {
    for (const tableName of [
      "users",
      "workspaces",
      "workspace_memberships",
      "roles",
      "permissions",
      "role_permissions",
      "membership_roles",
    ]) {
      expect(migration).toContain(
        `alter table public.${tableName} enable row level security;`,
      );
    }
  });

  it("locks cross-tenant reads and unauthorized membership mutations to active persisted permissions", () => {
    expect(migration).toContain("flow_private.has_active_membership");
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'member.invite')",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'member.update')",
    );
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("user_metadata");
  });
});

describe("service-role exposure guardrail", () => {
  it("keeps service-role credentials out of public frontend configuration", () => {
    const envExample = readFileSync(
      resolve(process.cwd(), "../../.env.example"),
      "utf8",
    );
    const webSourceFiles = ["src/app/page.tsx", "src/app/layout.tsx"].map(
      (fileName) =>
        readFileSync(
          resolve(process.cwd(), "../../apps/web", fileName),
          "utf8",
        ),
    );

    expect(envExample).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(envExample).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
    for (const source of webSourceFiles) {
      expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
  });
});
