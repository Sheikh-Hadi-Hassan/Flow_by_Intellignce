#!/usr/bin/env node
/**
 * Capture sanitized Phase 2 UI screenshots after API golden-path seeding.
 */
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import { prepareAuthenticatedPage } from "./lib/supabase-playwright-auth.mjs";

const outDir = join(
  process.cwd(),
  "../../docs/verification/phase-2/screenshots",
);
mkdirSync(outDir, { recursive: true });

const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000";
const webBase = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";
const runId = randomUUID().slice(0, 8);
const email = `phase2-shot-${runId}@flow-phase2.test`;
const password = `Shot-${runId}-Aa1!`;

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
  user_metadata: { first_name: "Shot", workspace_name: `Shot ${runId}` },
});
if (created.error) throw created.error;

try {
  const signIn = await anon.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  const token = signIn.data.session.access_token;
  const provision = await (
    await fetch(`${apiBase}/api/v1/workspaces/provision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: "Shot",
        workspaceName: `Shot ${runId}`,
        email,
      }),
    })
  ).json();
  const ws = provision.workspace.id;
  const slug = provision.workspace.slug;
  const auth = {
    Authorization: `Bearer ${token}`,
    "x-flow-workspace-id": ws,
    "Content-Type": "application/json",
  };
  await fetch(`${apiBase}/api/v1/workspaces/${ws}/onboarding`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({
      countryCode: "US",
      currencyCode: "USD",
      businessName: "Shot Agency",
      businessType: "creative_marketing_agency",
    }),
  });
  await fetch(`${apiBase}/api/v1/workspaces/${ws}/onboarding/complete`, {
    method: "POST",
    headers: auth,
  });

  const service = await (
    await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/services`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "Brand Strategy",
        pricingModel: "project",
        currency: "USD",
      }),
    })
  ).json();
  await fetch(
    `${apiBase}/api/v1/workspaces/${ws}/commercial/questionnaires/${service.questionnaire.id}/publish`,
    { method: "POST", headers: { ...auth, "Idempotency-Key": `shot-${runId}` } },
  );
  const client = await (
    await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/clients`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "Shot Client",
        contactFirstName: "A",
        contactLastName: "B",
      }),
    })
  ).json();
  const opp = await (
    await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/opportunities`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        clientId: client.client.id,
        contactId: client.contact.id,
        serviceId: service.service.id,
        name: "Shot Opportunity",
      }),
    })
  ).json();
  await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/opportunities/${opp.id}/answers`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      answers: {
        brandMaturity: "emerging",
        primaryAudience: "Ops leaders",
        successMetric: "Pipeline",
        legalReviewRequired: false,
      },
    }),
  });
  const notes = await (
    await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/opportunities/${opp.id}/notes`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        notes:
          "Audience: plant managers. Budget: $85000. Timeline 90 days. Legal review blocking must complete.",
      }),
    })
  ).json();
  for (const fact of notes.facts) {
    await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/facts/${fact.id}/verify`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ status: "verified" }),
    });
  }
  let bundle = await (
    await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/opportunities/${opp.id}`, {
      headers: auth,
    })
  ).json();
  for (const risk of bundle.risks.filter((row) => row.blocking && !row.handled)) {
    await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/risks/${risk.id}/handle`, {
      method: "POST",
      headers: auth,
    });
  }
  await fetch(
    `${apiBase}/api/v1/workspaces/${ws}/commercial/follow-ups/${bundle.followUps[0].id}/answer`,
    {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ answer: "Founder" }),
    },
  );
  await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/opportunities/${opp.id}/calculate`, {
    method: "POST",
    headers: auth,
  });
  const brief1 = await (
    await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/opportunities/${opp.id}/brief`, {
      method: "POST",
      headers: auth,
    })
  ).json();
  await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/briefs/${brief1.id}/submit`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ expectedVersion: brief1.versionNumber }),
  });
  await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/briefs/${brief1.id}/changes`, {
    method: "POST",
    headers: auth,
  });
  const brief2 = await (
    await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/opportunities/${opp.id}/brief`, {
      method: "POST",
      headers: auth,
    })
  ).json();
  await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/briefs/${brief2.id}/submit`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ expectedVersion: brief2.versionNumber }),
  });
  await fetch(`${apiBase}/api/v1/workspaces/${ws}/commercial/briefs/${brief2.id}/approve`, {
    method: "POST",
    headers: { ...auth, "Idempotency-Key": `shot-approve-${runId}` },
    body: JSON.stringify({ expectedVersion: brief2.versionNumber }),
  });

  const freshSignIn = await anon.auth.signInWithPassword({ email, password });
  if (freshSignIn.error) throw freshSignIn.error;

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await prepareAuthenticatedPage(page, freshSignIn.data.session, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    appUrl: webBase,
    apiBase,
    apiAuth: auth,
  });
  await page.goto(`${webBase}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(
    (url) => new URL(url).pathname.startsWith(`/${slug}/`),
    { timeout: 60_000 },
  );

  const captureScreenshot = async (targetPage, path) => {
    const client = await targetPage.context().newCDPSession(targetPage);
    const { data } = await client.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    });
    await writeFile(path, Buffer.from(data, "base64"));
  };

  const assertAuthenticated = async (targetPage, url) => {
    const current = targetPage.url();
    if (current.includes("/sign-in")) {
      throw new Error(`Authenticated route redirected to sign-in: ${current}`);
    }
    const text = await targetPage.locator("main").innerText().catch(() => "");
    if (text.includes("Sign in") && text.includes("FLOW OS")) {
      throw new Error(`Sign-in shell rendered for ${url}`);
    }
  };

  const shots = [
    ["01-authenticated-services", `${webBase}/${slug}/admin/services/${service.service.id}`],
    ["02-published-questionnaire", `${webBase}/${slug}/admin/services/${service.service.id}`],
    ["03-client-opportunity", `${webBase}/${slug}/admin/opportunities/${opp.id}`],
    ["04-discovery-draft-facts", `${webBase}/${slug}/admin/opportunities/${opp.id}/discovery`],
    ["05-verified-scope", `${webBase}/${slug}/admin/opportunities/${opp.id}`],
    ["06-business-calculations", `${webBase}/${slug}/admin/opportunities/${opp.id}`],
    ["07-founder-review", `${webBase}/${slug}/admin/opportunities/${opp.id}/approvals`],
    ["08-approved-brief-light", `${webBase}/${slug}/admin/opportunities/${opp.id}/brief`],
  ];

  for (const [name, url] of shots) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await assertAuthenticated(page, url);
    await page.waitForTimeout(2000);
    await captureScreenshot(page, join(outDir, `${name}.png`));
  }

  await context.close();
  const dark = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  const darkPage = await dark.newPage();
  await prepareAuthenticatedPage(darkPage, freshSignIn.data.session, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    appUrl: webBase,
    apiBase,
    apiAuth: auth,
  });
  await darkPage.goto(`${webBase}/sign-in`, { waitUntil: "domcontentloaded" });
  await darkPage.getByLabel("Email").fill(email);
  await darkPage.getByLabel("Password").fill(password);
  await darkPage.getByRole("button", { name: "Sign in" }).click();
  await darkPage.waitForURL(
    (url) => new URL(url).pathname.startsWith(`/${slug}/`),
    { timeout: 60_000 },
  );
  await darkPage.goto(`${webBase}/${slug}/admin/opportunities/${opp.id}/brief`, {
    waitUntil: "domcontentloaded",
  });
  await assertAuthenticated(darkPage, `${webBase}/${slug}/admin/opportunities/${opp.id}/brief`);
  await darkPage.waitForTimeout(2000);
  await captureScreenshot(darkPage, join(outDir, "09-approved-brief-dark.png"));
  await darkPage.setViewportSize({ width: 375, height: 812 });
  await darkPage.goto(`${webBase}/${slug}/admin/opportunities/${opp.id}/brief`, {
    waitUntil: "domcontentloaded",
  });
  await assertAuthenticated(darkPage, `${webBase}/${slug}/admin/opportunities/${opp.id}/brief`);
  await darkPage.waitForTimeout(2000);
  await captureScreenshot(
    darkPage,
    join(outDir, "10-mobile-opportunity-brief.png"),
  );
  await browser.close();
  console.log(JSON.stringify({ ok: true, outDir, slug, runId }));
} finally {
  await admin.auth.admin.deleteUser(created.data.user.id);
}
