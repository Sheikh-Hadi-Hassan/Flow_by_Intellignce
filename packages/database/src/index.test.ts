import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createFlowIdentityTestRepository,
  type OrganizationUnitRecord,
} from "./index.js";

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
    expect(alpha?.permissions.map((permission) => permission.key)).toEqual(
      expect.arrayContaining(["system.echo", "organization.read"]),
    );
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
    ).toEqual(expect.arrayContaining(["system.echo", "organization.read"]));

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
    ).toEqual(
      expect.arrayContaining([
        "system.echo",
        "system.highRisk",
        "organization.update_profile",
      ]),
    );
  });
});

describe("workspace organization foundation repository", () => {
  const now = "2026-08-10T00:00:00.000Z";

  it("resolves an explicit primary organization for a workspace", async () => {
    const repository = createFlowIdentityTestRepository();

    await expect(
      repository.getPrimaryOrganization("workspace-alpha"),
    ).resolves.toMatchObject({
      id: "organization-alpha-primary",
      workspaceId: "workspace-alpha",
    });
  });

  it("does not read organizations across workspace boundaries", async () => {
    const repository = createFlowIdentityTestRepository();

    await expect(
      repository.getOrganization({
        workspaceId: "workspace-alpha",
        organizationId: "organization-beta-primary",
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects organization profile mutation through the wrong workspace", async () => {
    const repository = createFlowIdentityTestRepository();

    await expect(
      repository.updateOrganizationProfile({
        workspaceId: "workspace-beta",
        organizationId: "organization-alpha-primary",
        displayName: "Escaped",
      }),
    ).rejects.toThrow("outside the requested workspace");
  });

  it("updates authorized organization profile fields without changing tenant identity", async () => {
    const repository = createFlowIdentityTestRepository();

    await expect(
      repository.updateOrganizationProfile({
        workspaceId: "workspace-alpha",
        organizationId: "organization-alpha-primary",
        displayName: "Alpha Studio",
        website: "https://studio.example.test",
      }),
    ).resolves.toMatchObject({
      id: "organization-alpha-primary",
      workspaceId: "workspace-alpha",
      displayName: "Alpha Studio",
      website: "https://studio.example.test",
    });
  });

  it("supports organization unit hierarchy through same-organization parents", async () => {
    const repository = createFlowIdentityTestRepository();
    const frontend: OrganizationUnitRecord = {
      id: "unit-alpha-frontend",
      workspaceId: "workspace-alpha",
      organizationId: "organization-alpha-primary",
      parentUnitId: "unit-alpha-technology",
      name: "Frontend",
      type: "TEAM",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    await expect(repository.createOrganizationUnit(frontend)).resolves.toEqual(
      frontend,
    );
  });

  it("rejects cross-organization and cross-workspace parent units", async () => {
    const repository = createFlowIdentityTestRepository();

    await expect(
      repository.createOrganizationUnit({
        id: "unit-alpha-invalid",
        workspaceId: "workspace-alpha",
        organizationId: "organization-alpha-primary",
        parentUnitId: "unit-beta-operations",
        name: "Invalid",
        type: "TEAM",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      }),
    ).rejects.toThrow("same organization");
  });

  it("rejects obvious organization unit hierarchy cycles", async () => {
    const repository = createFlowIdentityTestRepository();

    await expect(
      repository.moveOrganizationUnit({
        workspaceId: "workspace-alpha",
        organizationId: "organization-alpha-primary",
        organizationUnitId: "unit-alpha-technology",
        parentUnitId: "unit-alpha-backend",
      }),
    ).rejects.toThrow("cycle");
  });

  it("archives organizations without deleting the record", async () => {
    const repository = createFlowIdentityTestRepository();

    await expect(
      repository.archiveOrganization({
        workspaceId: "workspace-alpha",
        organizationId: "organization-alpha-primary",
      }),
    ).resolves.toMatchObject({
      id: "organization-alpha-primary",
      status: "ARCHIVED",
    });
    await expect(
      repository.getOrganization({
        workspaceId: "workspace-alpha",
        organizationId: "organization-alpha-primary",
      }),
    ).resolves.toMatchObject({ status: "ARCHIVED" });
  });

  it("keeps workspace membership conceptually separate from employment", () => {
    const source = readFileSync(resolve(process.cwd(), "src/index.ts"), "utf8");

    expect(source).toContain("OrganizationUnitMembershipRecord");
    expect(source).not.toContain("salary");
    expect(source).not.toContain("employmentContract");
    expect(source).not.toContain("attendance");
    expect(source).not.toContain("leaveBalance");
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

describe("workspace organization migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../supabase/migrations/20260810000300_workspace_organization_foundation.sql",
    ),
    "utf8",
  );

  it("creates tenant-owned organization tables with RLS enabled", () => {
    for (const tableName of [
      "organizations",
      "organization_units",
      "organization_locations",
      "organization_unit_memberships",
    ]) {
      expect(migration).toContain(`create table public.${tableName}`);
      expect(migration).toContain(
        `alter table public.${tableName} enable row level security;`,
      );
    }
  });

  it("uses explicit primary organization references rather than creation order", () => {
    expect(migration).toContain("primary_organization_id uuid");
    expect(migration).toContain("workspaces_primary_organization_fk");
    expect(migration).not.toContain("order by created_at limit 1");
  });

  it("enforces organization relationship integrity at the database boundary", () => {
    expect(migration).toContain("unique (id, workspace_id)");
    expect(migration).toContain(
      "references public.organizations(id, workspace_id)",
    );
    expect(migration).toContain(
      "references public.organization_units(id, organization_id, workspace_id)",
    );
    expect(migration).toContain("organization_units_prevent_cycle");
  });

  it("uses organization-specific permissions without wildcard grants", () => {
    for (const permission of [
      "organization.read",
      "organization.create",
      "organization.update_profile",
      "organization.archive",
      "organization_unit.create",
      "location.manage",
    ]) {
      expect(migration).toContain(permission);
    }
    expect(migration).not.toContain("'*'");
    expect(migration).not.toContain("full_access");
  });

  it("does not introduce HR employment schema into the workspace membership model", () => {
    expect(migration).toContain("business_title text");
    expect(migration).not.toContain("salary");
    expect(migration).not.toContain("employment_contract");
    expect(migration).not.toContain("attendance");
    expect(migration).not.toContain("leave_balance");
  });
});

describe("module registry and entity system migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../supabase/migrations/20260810000400_module_registry_universal_entity_system.sql",
    ),
    "utf8",
  );

  it("creates registry metadata tables with RLS enabled", () => {
    for (const tableName of [
      "module_definitions",
      "workspace_module_activations",
      "entity_type_definitions",
      "field_definitions",
      "relationship_definitions",
    ]) {
      expect(migration).toContain(`create table public.${tableName}`);
      expect(migration).toContain(
        `alter table public.${tableName} enable row level security;`,
      );
    }
  });

  it("keeps module metadata descriptive rather than executable", () => {
    expect(migration).toContain("module_definitions_no_executable_metadata");
    expect(migration).not.toContain("javascript_code");
    expect(migration).not.toContain("shell_command");
    expect(migration).not.toContain("sql_body");
    expect(migration).not.toContain("implementation_url");
  });

  it("isolates workspace-owned registry configuration by workspace", () => {
    expect(migration).toContain("workspace_id uuid not null");
    expect(migration).toContain(
      "flow_private.has_active_membership(workspace_id)",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'module.enable')",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'custom_field.manage')",
    );
  });

  it("preserves system versus custom definition separation", () => {
    expect(migration).toContain("kind = 'SYSTEM' and workspace_id is null");
    expect(migration).toContain("kind = 'CUSTOM' and workspace_id is not null");
    expect(migration).toContain("source = 'CUSTOM'");
  });

  it("adds minimal registry permissions without wildcard grants", () => {
    for (const permission of [
      "module.read",
      "module.enable",
      "module.disable",
      "module.configure",
      "entity_definition.create",
      "custom_field.manage",
    ]) {
      expect(migration).toContain(permission);
    }
    expect(migration).not.toContain("full_access");
    expect(migration).not.toContain("'*'");
  });

  it("does not create a universal EAV business-record store", () => {
    expect(migration).not.toContain("entity_records");
    expect(migration).not.toContain("entity_field_values");
    expect(migration).not.toContain("field_value");
  });
});
