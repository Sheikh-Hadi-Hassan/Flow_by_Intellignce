#!/usr/bin/env node
/**
 * Authenticated API golden path for Phase 2 closure evidence.
 * Writes sanitized summary to docs/verification/phase-2/golden-path-api.json
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DISCOVERY_NOTES = `Discovery session for Phase 2 closure.
Audience: plant managers and operations directors.
Budget: $85000. Timeline is 90 days through launch.
Legal review blocking must complete before approval.`;

const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000";

async function apiJson(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${text.slice(0, 240)}`);
  }
  return body;
}
const runId = randomUUID().slice(0, 8);
const email = `phase2-golden-${runId}@flow-phase2.test`;
const password = `Golden-${runId}-Aa1!`;
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { first_name: "Golden", workspace_name: `Golden ${runId}` },
});
if (created.error) throw created.error;
const userId = created.data.user.id;

try {
  const signIn = await anon.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  const token = signIn.data.session.access_token;
  const provision = await fetch(`${apiBase}/api/v1/workspaces/provision`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName: "Golden",
      workspaceName: `Golden ${runId}`,
      email,
    }),
  });
  if (!provision.ok) throw new Error(`provision ${provision.status}`);
  const { workspace } = await provision.json();
  const auth = {
    Authorization: `Bearer ${token}`,
    "x-flow-workspace-id": workspace.id,
    "Content-Type": "application/json",
  };
  await fetch(`${apiBase}/api/v1/workspaces/${workspace.id}/onboarding`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({
      business: {
        businessName: "Golden Path Agency",
        businessType: "creative_marketing_agency",
        country: "US",
        currency: "USD",
      },
    }),
  });
  await fetch(`${apiBase}/api/v1/workspaces/${workspace.id}/onboarding/complete`, {
    method: "POST",
    headers: auth,
  });

  const serviceRes = await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/services`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "Brand Strategy",
        pricingModel: "project",
        currency: "USD",
      }),
    },
  );
  const serviceBody = await serviceRes.json();
  await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/services/${serviceBody.service.id}`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "Brand Strategy Updated",
        costs: [
          {
            roleKey: "strategist",
            estimatedMinutes: 2400,
            internalRatePerHourMinor: "15000",
            vendorCostMinor: "50000",
          },
        ],
      }),
    },
  );
  await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/questionnaires/${serviceBody.questionnaire.id}/publish`,
    {
      method: "POST",
      headers: { ...auth, "Idempotency-Key": `gp-${runId}` },
    },
  );

  const clientRes = await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/clients`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "Golden Client",
        contactFirstName: "Test",
        contactLastName: "User",
      }),
    },
  );
  const clientBody = await clientRes.json();
  const oppRes = await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/opportunities`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        clientId: clientBody.client.id,
        contactId: clientBody.contact.id,
        serviceId: serviceBody.service.id,
        name: "Golden Opportunity",
        budgetMinMinor: "7000000",
        budgetMaxMinor: "9000000",
      }),
    },
  );
  const opp = await oppRes.json();

  await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/opportunities/${opp.id}/answers`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        answers: {
          brandMaturity: "emerging",
          primaryAudience: "Operations leaders",
          successMetric: "Pipeline conversion",
          legalReviewRequired: false,
        },
      }),
    },
  );

    const notesRes = await fetch(
      `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/opportunities/${opp.id}/notes`,
      {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ notes: DISCOVERY_NOTES }),
      },
    );
    if (!notesRes.ok) throw new Error(`notes failed: ${notesRes.status}`);
    const analyzeRes = await fetch(
      `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/opportunities/${opp.id}/analyze`,
      { method: "POST", headers: auth, body: JSON.stringify({}) },
    );
    if (!analyzeRes.ok) throw new Error(`analyze failed: ${analyzeRes.status}`);
    const notesBody = await analyzeRes.json();
    let rejected = false;
    for (const fact of notesBody.facts) {
      const status = !rejected ? "rejected" : "verified";
      if (status === "rejected") rejected = true;
      await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/facts/${fact.id}/verify`,
        { method: "POST", headers: auth, body: JSON.stringify({ status }) },
      );
    }
    let bundle = await (
      await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/opportunities/${opp.id}`,
        { headers: auth },
      )
    ).json();
    for (const risk of bundle.risks.filter((row) => row.blocking && !row.handled)) {
      await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/risks/${risk.id}/handle`,
        { method: "POST", headers: auth },
      );
    }
    await fetch(
      `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/follow-ups/${bundle.followUps[0].id}/answer`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ answer: "Founder" }),
    },
  );
  const calcRes = await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/opportunities/${opp.id}/calculate`,
    { method: "POST", headers: auth },
  );
  const calcBody = await calcRes.json();
  const brief1 = await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/opportunities/${opp.id}/brief`,
    { method: "POST", headers: auth },
  );
  const brief1Body = await brief1.json();
  await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/briefs/${brief1Body.id}/submit`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ expectedVersion: brief1Body.versionNumber }),
    },
  );
  await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/briefs/${brief1Body.id}/changes`,
    { method: "POST", headers: auth },
  );
  const brief2Res = await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/opportunities/${opp.id}/brief`,
    { method: "POST", headers: auth },
  );
  const brief2Body = await brief2Res.json();
  await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/briefs/${brief2Body.id}/submit`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ expectedVersion: brief2Body.versionNumber }),
    },
  );
  const approveRes = await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/briefs/${brief2Body.id}/approve`,
    {
      method: "POST",
      headers: { ...auth, "Idempotency-Key": `gp-approve-${runId}` },
      body: JSON.stringify({ expectedVersion: brief2Body.versionNumber }),
    },
  );
  const approved = await approveRes.json();
  const mutate = await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/briefs/${brief2Body.id}/changes`,
    { method: "POST", headers: auth },
  );

  const refresh = await fetch(
    `${apiBase}/api/v1/workspaces/${workspace.id}/commercial/opportunities/${opp.id}`,
    { headers: auth },
  );
  const refreshed = await refresh.json();

  const summary = {
    runId,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    opportunityId: opp.id,
    journeyStatus: refreshed.opportunity.journeyStatus,
    approvedVersion: approved.versionNumber,
    approvedStatus: approved.status,
    calculation: {
      internalLabourCostMinor: calcBody.opportunity.latestCalculation?.internalLabourCostMinor,
      vendorCostMinor: calcBody.opportunity.latestCalculation?.vendorCostMinor,
      contingencyMinor: calcBody.opportunity.latestCalculation?.contingencyMinor,
      totalDeliveryCostMinor: calcBody.opportunity.latestCalculation?.totalDeliveryCostMinor,
      recommendedPriceMinor: calcBody.opportunity.latestCalculation?.recommendedPriceMinor,
      grossProfitMinor: calcBody.opportunity.latestCalculation?.grossProfitMinor,
      budgetFit: calcBody.opportunity.latestCalculation?.budgetFit,
      timelineFeasibility: calcBody.opportunity.latestCalculation?.timelineFeasibility,
    },
    counts: {
      facts: refreshed.facts.length,
      requirements: refreshed.requirements.length,
      deliverables: refreshed.deliverables.length,
      risks: refreshed.risks.length,
      briefs: refreshed.briefs.length,
      guards: refreshed.guards.length,
    },
    mutateAfterApproveStatus: mutate.status,
    persistenceAfterRefresh: refreshed.opportunity.journeyStatus === "approved",
    immutabilityRejected: mutate.status >= 400,
  };

  const root = dirname(fileURLToPath(import.meta.url));
  const outDir = join(root, "../docs/verification/phase-2");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "golden-path-api.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ok: true, runId, slug: workspace.slug }));
} finally {
  await admin.auth.admin.deleteUser(userId);
}
