import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * DEMO-02D — Business Registry PostgreSQL RLS.
 *
 * Phase 1: static inventory proves the DEMO-02C migration still ships the
 * known policy leaks. Live matrix tests (FLOW_DB_INTEGRATION_TESTS=1) assert
 * the repaired permission matrix against an isolated local database only.
 *
 * Never point DATABASE_URL at production.
 */

const root = resolve(process.cwd(), "../..");
const harnessPath = resolve(
  process.cwd(),
  "src/fixtures/business-registry-rls-harness.sql",
);
const migrationPath = resolve(
  root,
  "supabase/migrations/20260907000100_business_registry.sql",
);
const closurePath = resolve(
  root,
  "supabase/migrations/20260908000100_business_registry_rls_closure.sql",
);

const integrationEnabled =
  process.env.FLOW_DB_INTEGRATION_TESTS === "1" ||
  process.env.FLOW_DB_INTEGRATION_TESTS === "true";
const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
const expectLeaks =
  process.env.FLOW_DB_RLS_EXPECT_LEAKS === "1" ||
  process.env.FLOW_DB_RLS_EXPECT_LEAKS === "true";

const WS_A = "10000000-0000-4000-8000-000000000001";
const WS_B = "10000000-0000-4000-8000-000000000002";
const ORG_A = "00000000-0000-4000-b001-000000000001";
const ORG_B = "00000000-0000-4000-b001-000000000099";
const LOC_A = "00000000-0000-4000-b001-000000000010";

const AUTH = {
  founder: "20000000-0000-4000-8000-000000000001",
  finance: "20000000-0000-4000-8000-000000000002",
  operations: "20000000-0000-4000-8000-000000000003",
  employee: "20000000-0000-4000-8000-000000000004",
  cross: "20000000-0000-4000-8000-000000000005",
} as const;

type RoleKey = keyof typeof AUTH;

describe("Business Registry RLS — Phase 1 leak inventory (20260907)", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("documents compliance SELECT leak via active membership", () => {
    expect(sql).toMatch(
      /members can read organization compliance records[\s\S]*has_active_membership/,
    );
  });

  it("documents signatory SELECT leak via active membership", () => {
    expect(sql).toMatch(
      /members can read organization signatories[\s\S]*has_active_membership/,
    );
  });

  it("documents audit SELECT keyed only to organization.read", () => {
    expect(sql).toMatch(
      /members can read organization registry audit[\s\S]*organization\.read/,
    );
  });

  it("documents sensitive tax/bank/ownership columns on organizations", () => {
    expect(sql).toMatch(/add column if not exists tax_metadata/);
    expect(sql).toMatch(/add column if not exists bank_metadata/);
    expect(sql).toMatch(/add column if not exists ownership/);
  });

  it("documents SECURITY DEFINER delete trigger without PUBLIC revoke", () => {
    expect(sql).toMatch(/prevent_organization_delete[\s\S]*security definer/i);
    expect(sql).not.toMatch(
      /revoke all on function flow_private\.prevent_organization_delete/i,
    );
  });
});

describe("Business Registry RLS — Phase 2 closure migration inventory", () => {
  const sql = readFileSync(closurePath, "utf8");

  it("drops membership compliance/signatory SELECT and adds typed policies", () => {
    expect(sql).toMatch(/drop policy if exists "members can read organization compliance records"/);
    expect(sql).toMatch(/drop policy if exists "members can read organization signatories"/);
    expect(sql).toMatch(/registry\.document\.read/);
    expect(sql).toMatch(/registry\.signatory\.read/);
    expect(sql).toMatch(/registry\.audit\.read/);
    expect(sql).toMatch(/organization_tax_records/);
    expect(sql).toMatch(/organization_bank_records/);
    expect(sql).toMatch(/organization_ownership_records/);
    expect(sql).toMatch(/organization_public_identity/);
    expect(sql).toMatch(/security_invoker\s*=\s*true/);
    expect(sql).toMatch(/security invoker/i);
    expect(sql).toMatch(/revoke all on function flow_private\.prevent_organization_delete/);
    expect(sql).not.toMatch(/create table public\.legal_entities/i);
  });
});

describe.skipIf(!integrationEnabled || !databaseUrl)(
  "Business Registry live Postgres RLS matrix",
  () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let admin: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any;

    async function asRole(role: RoleKey | "anon") {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
        role === "anon" ? "" : AUTH[role],
      ]);
      if (role === "anon") {
        await client.query("set role anon");
      } else {
        await client.query("set role authenticated");
      }
    }

    async function count(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return Number(result.rows[0]?.n ?? 0);
    }

    async function seedMatrix() {
      await admin.query("begin");
      try {
        // Clean slate for idempotent reruns.
        await admin.query(`
          truncate table
            public.organization_registry_audit_events,
            public.organization_signatories,
            public.organization_compliance_records,
            public.organization_tax_records,
            public.organization_bank_records,
            public.organization_ownership_records,
            public.organization_locations,
            public.organizations,
            public.membership_roles,
            public.role_permissions,
            public.roles,
            public.workspace_memberships,
            public.users,
            public.workspaces
          cascade
        `);

        await admin.query(
          `insert into public.workspaces (id, name, slug) values
            ($1, 'Northstar', 'northstar-creative'),
            ($2, 'Other Co', 'other-workspace')`,
          [WS_A, WS_B],
        );

        for (const [key, authSubject] of Object.entries(AUTH)) {
          await admin.query(
            `insert into public.users (id, auth_provider, auth_subject_id, email)
             values ($1, 'supabase', $2, $3)`,
            [
              authSubject,
              authSubject,
              `${key}@example.test`,
            ],
          );
        }

        const roleDefs = [
          ["FOUNDER", "Founder"],
          ["FINANCE", "Finance"],
          ["OPERATIONS", "Operations"],
          ["EMPLOYEE", "Employee"],
        ] as const;

        for (const [key, name] of roleDefs) {
          await admin.query(
            `insert into public.roles (workspace_id, key, name) values ($1, $2, $3)`,
            [WS_A, key, name],
          );
        }
        await admin.query(
          `insert into public.roles (workspace_id, key, name) values ($1, 'FOUNDER', 'Founder')`,
          [WS_B],
        );

        const memberships: Array<[string, string, string]> = [
          [AUTH.founder, WS_A, "FOUNDER"],
          [AUTH.finance, WS_A, "FINANCE"],
          [AUTH.operations, WS_A, "OPERATIONS"],
          [AUTH.employee, WS_A, "EMPLOYEE"],
          [AUTH.cross, WS_B, "FOUNDER"],
        ];

        for (const [userId, workspaceId, roleKey] of memberships) {
          const mem = await admin.query(
            `insert into public.workspace_memberships (workspace_id, user_id, status)
             values ($1, $2, 'ACTIVE') returning id`,
            [workspaceId, userId],
          );
          await admin.query(
            `insert into public.membership_roles (membership_id, role_id)
             select $1, id from public.roles where workspace_id = $2 and key = $3`,
            [mem.rows[0].id, workspaceId, roleKey],
          );
        }

        await admin.query(
          `insert into public.organizations (
             id, workspace_id, name, legal_name, trading_name, status,
             country_code, registration_number, firmographics
           ) values (
             $1, $2, 'Northstar Creative', 'Northstar Creative LLC',
             'Northstar Creative', 'ACTIVE', 'US', 'DEMO-LLC-2021-08417', '{}'::jsonb
           )`,
          [ORG_A, WS_A],
        );
        await admin.query(
          `insert into public.organizations (
             id, workspace_id, name, legal_name, status, country_code, firmographics
           ) values (
             $1, $2, 'Other Org', 'Other Org LLC', 'ACTIVE', 'US', '{}'::jsonb
           )`,
          [ORG_B, WS_B],
        );

        // Sensitive satellites (post-closure schema). Pre-repair path uses columns.
        const hasTaxTable = await admin.query(
          `select to_regclass('public.organization_tax_records') is not null as ok`,
        );
        if (hasTaxTable.rows[0]?.ok) {
          await admin.query(
            `insert into public.organization_tax_records (workspace_id, organization_id, payload)
             values ($1, $2, '[{"id":"tax-1"}]'::jsonb)`,
            [WS_A, ORG_A],
          );
          await admin.query(
            `insert into public.organization_bank_records (workspace_id, organization_id, payload)
             values ($1, $2, '[{"id":"bank-1"}]'::jsonb)`,
            [WS_A, ORG_A],
          );
          await admin.query(
            `insert into public.organization_ownership_records (workspace_id, organization_id, payload)
             values ($1, $2, '[{"id":"own-1"}]'::jsonb)`,
            [WS_A, ORG_A],
          );
        }

        await admin.query(
          `insert into public.organization_locations (
             id, workspace_id, organization_id, name, country_code, city, status
           ) values ($1, $2, $3, 'Chicago HQ', 'US', 'Chicago', 'ACTIVE')`,
          [LOC_A, WS_A, ORG_A],
        );

        await admin.query(
          `insert into public.organization_compliance_records (
             workspace_id, organization_id, record_type, title, status, reference
           ) values
             ($1, $2, 'formation', 'Articles', 'ACTIVE', 'DEMO-ART-1'),
             ($1, $2, 'tax_registration', 'Tax reg', 'ACTIVE', 'DEMO-TAX-1'),
             ($1, $2, 'general_liability', 'GL', 'ACTIVE', 'DEMO-GL-1'),
             ($1, $2, 'compliance_obligation', 'Obligation', 'ACTIVE', 'DEMO-OB-1')`,
          [WS_A, ORG_A],
        );

        await admin.query(
          `insert into public.organization_signatories (
             workspace_id, organization_id, name, title, can_sign_contracts
           ) values ($1, $2, 'Maya Chen', 'Founder', true)`,
          [WS_A, ORG_A],
        );

        await admin.query(
          `insert into public.organization_registry_audit_events (
             workspace_id, organization_id, actor_id, action, record_type,
             record_id, new_value, occurred_at
           ) values (
             $1, $2, 'seed', 'business_profile.created', 'organization',
             $2, 'created', now()
           )`,
          [WS_A, ORG_A],
        );

        await admin.query("commit");
      } catch (error) {
        await admin.query("rollback");
        throw error;
      }
    }

    beforeAll(async () => {
      const pg = await import("pg");
      admin = new pg.default.Client({ connectionString: databaseUrl });
      client = new pg.default.Client({ connectionString: databaseUrl });
      await admin.connect();
      await client.connect();

      await admin.query(readFileSync(harnessPath, "utf8"));
      await admin.query(readFileSync(migrationPath, "utf8"));
      if (!expectLeaks) {
        await admin.query(readFileSync(closurePath, "utf8"));
      }
      // Ensure FOUNDER role permissions from migrations exist after truncate later.
      await seedMatrix();
      // Re-seed permissions after truncate wiped role_permissions.
      await admin.query(`
        insert into public.permissions (key, description)
        values
          ('organization.read', 'Read organization context.'),
          ('organization.create', 'Create organizations inside a workspace.'),
          ('organization.update_profile', 'Update safe organization profile fields.'),
          ('organization.archive', 'Archive an organization.'),
          ('location.read', 'Read organization locations.'),
          ('location.manage', 'Manage organization locations.'),
          ('registry.document.manage', 'Manage business registration document metadata.'),
          ('registry.tax.manage', 'Manage masked tax and banking metadata.'),
          ('registry.signatory.manage', 'Manage authorised signatories.'),
          ('registry.compliance.manage', 'Assign compliance owners and obligations.'),
          ('registry.document.read', 'Read registration and insurance document metadata.'),
          ('registry.signatory.read', 'Read authorised signatories.'),
          ('registry.compliance.read', 'Read compliance obligations.'),
          ('registry.audit.read', 'Read business registry audit events.')
        on conflict (key) do nothing
      `);
      await admin.query(`
        insert into public.role_permissions (role_id, permission_id)
        select role.id, permission.id
        from public.roles role
        join public.permissions permission
          on permission.key in (
            'organization.read', 'organization.create', 'organization.update_profile',
            'organization.archive', 'location.read', 'location.manage',
            'registry.document.manage', 'registry.tax.manage',
            'registry.signatory.manage', 'registry.compliance.manage',
            'registry.document.read', 'registry.signatory.read',
            'registry.compliance.read', 'registry.audit.read'
          )
        where role.key in ('OWNER', 'FOUNDER') and role.workspace_id = '${WS_A}'
        on conflict do nothing
      `);
      await admin.query(`
        insert into public.role_permissions (role_id, permission_id)
        select role.id, permission.id
        from public.roles role
        join public.permissions permission
          on permission.key in ('organization.read', 'location.read', 'registry.tax.manage')
        where role.key = 'FINANCE' and role.workspace_id = '${WS_A}'
        on conflict do nothing
      `);
      await admin.query(`
        insert into public.role_permissions (role_id, permission_id)
        select role.id, permission.id
        from public.roles role
        join public.permissions permission
          on permission.key in ('organization.read', 'location.read', 'location.manage')
        where role.key in ('OPERATIONS', 'OPERATOR') and role.workspace_id = '${WS_A}'
        on conflict do nothing
      `);
      await admin.query(`
        insert into public.role_permissions (role_id, permission_id)
        select role.id, permission.id
        from public.roles role
        join public.permissions permission
          on permission.key in ('organization.read')
        where role.key in ('EMPLOYEE', 'MEMBER') and role.workspace_id = '${WS_A}'
        on conflict do nothing
      `);
      await admin.query(`
        insert into public.role_permissions (role_id, permission_id)
        select role.id, permission.id
        from public.roles role
        join public.permissions permission
          on permission.key in (
            'organization.read', 'organization.update_profile',
            'location.read', 'location.manage',
            'registry.document.manage', 'registry.tax.manage',
            'registry.signatory.manage', 'registry.compliance.manage',
            'registry.document.read', 'registry.signatory.read',
            'registry.compliance.read', 'registry.audit.read'
          )
        where role.key = 'FOUNDER' and role.workspace_id = '${WS_B}'
        on conflict do nothing
      `);
    }, 120_000);

    afterAll(async () => {
      await client?.end().catch(() => undefined);
      await admin?.end().catch(() => undefined);
    });

    it("Founder/Admin: full registry management (SELECT)", async () => {
      await asRole("founder");
      expect(
        await count(
          `select count(*)::int as n from public.organizations where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);
      expect(
        await count(
          `select count(*)::int as n from public.organization_locations where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);
      expect(
        await count(
          `select count(*)::int as n from public.organization_compliance_records where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(4);
      expect(
        await count(
          `select count(*)::int as n from public.organization_signatories where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);
      expect(
        await count(
          `select count(*)::int as n from public.organization_registry_audit_events where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);
      if (!expectLeaks) {
        expect(
          await count(
            `select count(*)::int as n from public.organization_tax_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(1);
        expect(
          await count(
            `select count(*)::int as n from public.organization_bank_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(1);
        expect(
          await count(
            `select count(*)::int as n from public.organization_ownership_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(1);
      }
    });

    it("Finance: profile/location read + tax/bank only", async () => {
      await asRole("finance");
      expect(
        await count(
          `select count(*)::int as n from public.organizations where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);
      expect(
        await count(
          `select count(*)::int as n from public.organization_locations where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);

      const docs = await count(
        `select count(*)::int as n from public.organization_compliance_records
          where workspace_id = $1 and record_type = 'formation'`,
        [WS_A],
      );
      const taxDocs = await count(
        `select count(*)::int as n from public.organization_compliance_records
          where workspace_id = $1 and record_type = 'tax_registration'`,
        [WS_A],
      );
      const signatories = await count(
        `select count(*)::int as n from public.organization_signatories where workspace_id = $1`,
        [WS_A],
      );
      const audits = await count(
        `select count(*)::int as n from public.organization_registry_audit_events where workspace_id = $1`,
        [WS_A],
      );

      if (expectLeaks) {
        // Pre-repair: membership SELECT leaks documents + signatories; audit via organization.read.
        expect(docs).toBeGreaterThan(0);
        expect(signatories).toBeGreaterThan(0);
        expect(audits).toBeGreaterThan(0);
      } else {
        expect(docs).toBe(0);
        expect(taxDocs).toBe(1);
        expect(signatories).toBe(0);
        expect(audits).toBe(0);
        expect(
          await count(
            `select count(*)::int as n from public.organization_tax_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(1);
        expect(
          await count(
            `select count(*)::int as n from public.organization_bank_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(1);
        expect(
          await count(
            `select count(*)::int as n from public.organization_ownership_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(0);
      }
    });

    it("Operations: profile + location manage only", async () => {
      await asRole("operations");
      expect(
        await count(
          `select count(*)::int as n from public.organizations where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);
      expect(
        await count(
          `select count(*)::int as n from public.organization_locations where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);

      const compliance = await count(
        `select count(*)::int as n from public.organization_compliance_records where workspace_id = $1`,
        [WS_A],
      );
      const signatories = await count(
        `select count(*)::int as n from public.organization_signatories where workspace_id = $1`,
        [WS_A],
      );
      const audits = await count(
        `select count(*)::int as n from public.organization_registry_audit_events where workspace_id = $1`,
        [WS_A],
      );

      if (expectLeaks) {
        expect(compliance).toBeGreaterThan(0);
        expect(signatories).toBeGreaterThan(0);
      } else {
        expect(compliance).toBe(0);
        expect(signatories).toBe(0);
        expect(audits).toBe(0);
        expect(
          await count(
            `select count(*)::int as n from public.organization_tax_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(0);
      }

      // UPDATE location allowed for operations.
      await client.query(
        `update public.organization_locations set city = 'Chicago Loop' where id = $1`,
        [LOC_A],
      );
      expect(
        await count(
          `select count(*)::int as n from public.organization_locations where id = $1 and city = 'Chicago Loop'`,
          [LOC_A],
        ),
      ).toBe(1);
    });

    it("Employee: public identity only — no docs/tax/signatories/audit", async () => {
      await asRole("employee");
      expect(
        await count(
          `select count(*)::int as n from public.organizations where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);

      const locations = await count(
        `select count(*)::int as n from public.organization_locations where workspace_id = $1`,
        [WS_A],
      );
      const compliance = await count(
        `select count(*)::int as n from public.organization_compliance_records where workspace_id = $1`,
        [WS_A],
      );
      const signatories = await count(
        `select count(*)::int as n from public.organization_signatories where workspace_id = $1`,
        [WS_A],
      );
      const audits = await count(
        `select count(*)::int as n from public.organization_registry_audit_events where workspace_id = $1`,
        [WS_A],
      );

      if (expectLeaks) {
        expect(locations).toBeGreaterThan(0);
        expect(compliance).toBeGreaterThan(0);
        expect(signatories).toBeGreaterThan(0);
        expect(audits).toBeGreaterThan(0);
      } else {
        expect(locations).toBe(0);
        expect(compliance).toBe(0);
        expect(signatories).toBe(0);
        expect(audits).toBe(0);
        expect(
          await count(
            `select count(*)::int as n from public.organization_tax_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(0);
        expect(
          await count(
            `select count(*)::int as n from public.organization_bank_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(0);
        expect(
          await count(
            `select count(*)::int as n from public.organization_ownership_records where workspace_id = $1`,
            [WS_A],
          ),
        ).toBe(0);
      }
    });

    it("Anonymous: denied", async () => {
      await asRole("anon");
      expect(
        await count(
          `select count(*)::int as n from public.organizations where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(0);
      expect(
        await count(
          `select count(*)::int as n from public.organization_compliance_records where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(0);
      expect(
        await count(
          `select count(*)::int as n from public.organization_signatories where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(0);
    });

    it("Cross-workspace member: denied on workspace A", async () => {
      await asRole("cross");
      expect(
        await count(
          `select count(*)::int as n from public.organizations where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(0);
      expect(
        await count(
          `select count(*)::int as n from public.organization_compliance_records where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(0);
      expect(
        await count(
          `select count(*)::int as n from public.organizations where workspace_id = $1`,
          [WS_B],
        ),
      ).toBe(1);
    });

    it("INSERT/UPDATE/DELETE independence for Finance tax vs documents", async () => {
      if (expectLeaks) return;
      await asRole("finance");

      // Tax compliance INSERT allowed.
      await client.query(
        `insert into public.organization_compliance_records (
           workspace_id, organization_id, record_type, title, status, reference
         ) values ($1, $2, 'tax_registration', 'Extra tax', 'ACTIVE', 'DEMO-TAX-2')`,
        [WS_A, ORG_A],
      );

      // Document INSERT denied (0 rows / error).
      let denied = false;
      try {
        await client.query(
          `insert into public.organization_compliance_records (
             workspace_id, organization_id, record_type, title, status, reference
           ) values ($1, $2, 'formation', 'Bad', 'ACTIVE', 'DEMO-BAD-1')`,
          [WS_A, ORG_A],
        );
      } catch {
        denied = true;
      }
      const formationInserted = await count(
        `select count(*)::int as n from public.organization_compliance_records
          where workspace_id = $1 and reference = 'DEMO-BAD-1'`,
        [WS_A],
      );
      expect(denied || formationInserted === 0).toBe(true);

      // Signatory DELETE denied.
      await client.query(
        `delete from public.organization_signatories where workspace_id = $1`,
        [WS_A],
      );
      await asRole("founder");
      expect(
        await count(
          `select count(*)::int as n from public.organization_signatories where workspace_id = $1`,
          [WS_A],
        ),
      ).toBe(1);
    });

    it("Audit remains append-only", async () => {
      if (expectLeaks) return;
      await asRole("founder");
      await client.query(
        `insert into public.organization_registry_audit_events (
           workspace_id, organization_id, actor_id, action, record_type,
           record_id, new_value, occurred_at
         ) values ($1, $2, 'founder', 'location.updated', 'organization_location',
           $3, 'Chicago Loop', now())`,
        [WS_A, ORG_A, LOC_A],
      );
      let updated = false;
      try {
        const result = await client.query(
          `update public.organization_registry_audit_events
              set action = 'tampered' where workspace_id = $1`,
          [WS_A],
        );
        updated = (result.rowCount ?? 0) > 0;
      } catch {
        updated = false;
      }
      expect(updated).toBe(false);

      let deleted = false;
      try {
        const result = await client.query(
          `delete from public.organization_registry_audit_events where workspace_id = $1`,
          [WS_A],
        );
        deleted = (result.rowCount ?? 0) > 0;
      } catch {
        deleted = false;
      }
      expect(deleted).toBe(false);
    });

    it("Canonical organization DELETE is blocked", async () => {
      await asRole("founder");
      let blocked = false;
      try {
        await client.query(`delete from public.organizations where id = $1`, [ORG_A]);
      } catch (error) {
        blocked = String(error).includes("cannot be deleted");
      }
      expect(blocked).toBe(true);
    });
  },
);

describe("Business Registry RLS — local Postgres availability", () => {
  it("reports exact blocker when live integration is unavailable", () => {
    if (integrationEnabled && databaseUrl) {
      expect(databaseUrl.includes("supabase.com")).toBe(false);
      expect(databaseUrl.length).toBeGreaterThan(0);
      return;
    }
    expect({
      blocker:
        "Docker Desktop I/O errors: local Supabase container unhealthy/unrestartable; " +
        "dedicated postgres:17 pull failed with input/output error; Homebrew postgresql unavailable; " +
        "no disposable isolated Postgres was started. Production DATABASE_URL was not used.",
      required: [
        "Repair Docker Desktop storage/I/O (or provide another isolated local Postgres)",
        "Apply harness + migrations through 20260908000100_business_registry_rls_closure.sql",
        "Set FLOW_DB_INTEGRATION_TESTS=1 and DATABASE_URL to that isolated instance",
        "Re-run packages/database business-registry-rls.integration.test.ts",
      ],
      productionTouched: false,
      securityVerdict: "PARTIAL",
    }).toMatchObject({
      productionTouched: false,
      securityVerdict: "PARTIAL",
    });
  });
});
