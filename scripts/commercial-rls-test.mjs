#!/usr/bin/env node
/**
 * Direct Postgres RLS verification for Phase 2 commercial tables.
 * Requires FLOW_DB_INTEGRATION_TESTS=1 and Supabase credentials in env.
 * Never prints PII, tokens, or connection strings.
 */
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { randomUUID } from "node:crypto";

const TABLES = [
  "catalog_services",
  "catalog_service_cost_components",
  "catalog_questionnaire_versions",
  "catalog_questionnaire_responses",
  "crm_clients",
  "crm_contacts",
  "crm_opportunities",
  "discovery_sessions",
  "discovery_sources",
  "extracted_facts",
  "opportunity_requirements",
  "opportunity_deliverables",
  "opportunity_budget_constraints",
  "opportunity_timeline_constraints",
  "opportunity_risks",
  "follow_up_questions",
  "briefs",
  "brief_versions",
  "brief_sections",
  "evidence_references",
  "commercial_guard_decisions",
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function countAsRole(client, role, authSubjectId, workspaceId) {
  await client.query("begin");
  try {
    if (role === "anon") {
      await client.query("set local role anon");
    } else {
      await client.query(
        `select set_config('request.jwt.claim.sub', $1, true)`,
        [authSubjectId],
      );
      await client.query("set local role authenticated");
    }
    const counts = {};
    for (const table of TABLES) {
      const result = await client.query(
        `select count(*)::int as count from public.${table} where workspace_id = $1`,
        [workspaceId],
      );
      counts[table] = result.rows[0]?.count ?? 0;
    }
    await client.query("commit");
    return counts;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function tryCrossTenantInsert(
  client,
  authSubjectId,
  workspaceB,
  workspaceA,
) {
  await client.query("begin");
  try {
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [
      authSubjectId,
    ]);
    await client.query("set local role authenticated");
    await client.query(
      `insert into public.crm_clients (id, workspace_id, name, status, revision)
       values ($1, $2, 'blocked', 'prospect', 1)`,
      [randomUUID(), workspaceA],
    );
    await client.query("commit");
    return { ok: true };
  } catch (error) {
    await client.query("rollback");
    return {
      ok: false,
      code: error instanceof Error ? error.message.slice(0, 120) : "denied",
    };
  }
}

async function tryApprovedBriefMutation(client, versionId) {
  await client.query("begin");
  try {
    await client.query(
      `update public.brief_versions set status = 'draft' where id = $1`,
      [versionId],
    );
    await client.query("commit");
    return { ok: true };
  } catch (error) {
    await client.query("rollback");
    return {
      ok: false,
      code: error instanceof Error ? error.message.slice(0, 120) : "immutable",
    };
  }
}

async function main() {
  if (process.env.FLOW_DB_INTEGRATION_TESTS !== "1") {
    console.log(
      JSON.stringify({
        skipped: true,
        reason: "FLOW_DB_INTEGRATION_TESTS is not enabled",
      }),
    );
    process.exit(0);
  }

  const databaseUrl = requiredEnv("DATABASE_URL");
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceKey = requiredEnv("SUPABASE_SECRET_KEY");
  const publishableKey = requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  const runId = randomUUID().slice(0, 8);
  const password = `RlS-${runId}-Aa1!`;
  const emailA = `rls-a-${runId}@flow-phase2.test`;
  const emailB = `rls-b-${runId}@flow-phase2.test`;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const pool = new pg.Pool({ connectionString: databaseUrl });

  const createdUsers = [];
  try {
    for (const email of [emailA, emailB]) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: "RLS", workspace_name: `RLS ${email}` },
      });
      if (created.error) throw created.error;
      createdUsers.push(created.data.user.id);
    }

    const signInA = await anon.auth.signInWithPassword({
      email: emailA,
      password,
    });
    const signInB = await anon.auth.signInWithPassword({
      email: emailB,
      password,
    });
    if (signInA.error || signInB.error) {
      throw signInA.error ?? signInB.error;
    }

    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000";
    const provision = async (token, workspaceName) => {
      const response = await fetch(`${apiBase}/api/v1/workspaces/provision`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: "RLS",
          workspaceName,
          email: workspaceName,
        }),
      });
      if (!response.ok) {
        throw new Error(`Provision failed with status ${response.status}`);
      }
      return response.json();
    };

    const workspaceA = await provision(
      signInA.data.session.access_token,
      `RLS A ${runId}`,
    );
    const workspaceB = await provision(
      signInB.data.session.access_token,
      `RLS B ${runId}`,
    );
    const wsA = workspaceA.workspace.id;
    const wsB = workspaceB.workspace.id;

    const auth = {
      Authorization: `Bearer ${signInA.data.session.access_token}`,
      "x-flow-workspace-id": wsA,
      "Content-Type": "application/json",
    };

    const serviceRes = await fetch(
      `${apiBase}/api/v1/workspaces/${wsA}/commercial/services`,
      {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          name: `RLS Service ${runId}`,
          pricingModel: "project",
          currency: "USD",
        }),
      },
    );
    if (!serviceRes.ok)
      throw new Error(`Service create failed: ${serviceRes.status}`);
    const serviceBody = await serviceRes.json();
    const questionnaireId = serviceBody.questionnaire.id;

    await fetch(
      `${apiBase}/api/v1/workspaces/${wsA}/commercial/questionnaires/${questionnaireId}/publish`,
      {
        method: "POST",
        headers: { ...auth, "Idempotency-Key": `rls-pub-${runId}` },
      },
    );

    const clientRes = await fetch(
      `${apiBase}/api/v1/workspaces/${wsA}/commercial/clients`,
      {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          name: `RLS Client ${runId}`,
          contactFirstName: "Test",
          contactLastName: "User",
        }),
      },
    );
    const clientBody = await clientRes.json();

    const oppRes = await fetch(
      `${apiBase}/api/v1/workspaces/${wsA}/commercial/opportunities`,
      {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          clientId: clientBody.client.id,
          contactId: clientBody.contact.id,
          serviceId: serviceBody.service.id,
          name: `RLS Opportunity ${runId}`,
        }),
      },
    );
    const oppBody = await oppRes.json();

    const anonCounts = await countAsRole(pool, "anon", null, wsA);
    const userACounts = await countAsRole(
      pool,
      "authenticated",
      signInA.data.user.id,
      wsA,
    );
    const userBOnA = await countAsRole(
      pool,
      "authenticated",
      signInB.data.user.id,
      wsA,
    );
    const userBOnB = await countAsRole(
      pool,
      "authenticated",
      signInB.data.user.id,
      wsB,
    );

    const crossInsert = await tryCrossTenantInsert(
      pool,
      signInB.data.user.id,
      wsB,
      wsA,
    );

    const { rows: approvedRows } = await pool.query(
      `select bv.id
         from public.brief_versions bv
        where bv.workspace_id = $1
        limit 1`,
      [wsA],
    );
    const approvedMutation = approvedRows[0]?.id
      ? await tryApprovedBriefMutation(pool, approvedRows[0].id)
      : { ok: false, code: "no-approved-version-seeded" };

    const anonRest = await anon
      .from("catalog_services")
      .select("id", { count: "exact", head: true });
    const userARest = await createClient(supabaseUrl, publishableKey, {
      global: {
        headers: {
          Authorization: `Bearer ${signInA.data.session.access_token}`,
        },
      },
    })
      .from("catalog_services")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", wsA);

    const report = {
      skipped: false,
      workspaceA: wsA,
      workspaceB: wsB,
      opportunityId: oppBody.id,
      anonVisibleRowsOnA: anonCounts,
      userAVisibleRowsOnA: userACounts,
      userBVisibleRowsOnA: userBOnA,
      userBVisibleRowsOnB: userBOnB,
      anonRestError: anonRest.error?.code ?? null,
      anonRestCount: anonRest.count ?? 0,
      userARestCount: userARest.count ?? 0,
      crossTenantInsert: crossInsert,
      approvedBriefMutation: approvedMutation,
      assertions: {
        anonSeesNoPrivateRows: Object.values(anonCounts).every(
          (count) => count === 0,
        ),
        userASeesWorkspaceA: userACounts.catalog_services > 0,
        userBSeesNothingOnA: Object.values(userBOnA).every(
          (count) => count === 0,
        ),
        crossTenantInsertDenied: crossInsert.ok === false,
      },
    };

    console.log(JSON.stringify(report, null, 2));

    const passed =
      report.assertions.anonSeesNoPrivateRows &&
      report.assertions.userASeesWorkspaceA &&
      report.assertions.userBSeesNothingOnA &&
      report.assertions.crossTenantInsertDenied;

    process.exit(passed ? 0 : 1);
  } finally {
    for (const userId of createdUsers) {
      await admin.auth.admin.deleteUser(userId);
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      failed: true,
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
