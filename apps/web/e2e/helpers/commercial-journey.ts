import { expect, type Page } from "@playwright/test";

import type { ProvisionedCommercialWorkspace } from "./commercial-workspace";
import { prepareCommercialApiProxy, signInThroughUi } from "./supabase-auth";
import {
  fillDefaultQuestionnaireAnswers,
  publishQuestionnaireFromBuilder,
} from "./questionnaire-journey";

export async function waitForCommercialReady(page: Page) {
  await expect(page.getByTestId("commercial-data-pending")).toHaveCount(0, {
    timeout: 30_000,
  });
}

export async function verifyAllDraftFacts(page: Page) {
  while ((await page.getByRole("button", { name: "Verify" }).count()) > 0) {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/facts/") &&
          response.url().includes("/verify") &&
          response.ok(),
        { timeout: 30_000 },
      ),
      page.getByRole("button", { name: "Verify" }).first().click(),
    ]);
  }
}

export async function handleBlockingRisks(page: Page) {
  const markHandled = page.getByRole("button", { name: "Mark handled" });
  while ((await markHandled.count()) > 0) {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/risks/") &&
          response.url().includes("/handle") &&
          response.ok(),
        { timeout: 30_000 },
      ),
      markHandled.first().click(),
    ]);
  }
}

export async function reachApprovedBrief(input: {
  page: Page;
  workspace: ProvisionedCommercialWorkspace;
  appUrl: string;
  apiBase: string;
}): Promise<string> {
  const { page, workspace, appUrl, apiBase } = input;

  await prepareCommercialApiProxy(page, {
    apiBase,
    apiAuth: workspace.apiAuth,
  });
  await signInThroughUi(page, {
    appUrl,
    email: workspace.email,
    password: workspace.password,
    workspaceSlug: workspace.slug,
  });

  await page.goto(`/${workspace.slug}/admin/services`, {
    waitUntil: "domcontentloaded",
  });
  await waitForCommercialReady(page);
  await page.getByLabel("Service name").fill(`E2E Service ${workspace.runId}`);
  await page.getByRole("button", { name: "Create service" }).click();
  await page.waitForURL(/\/admin\/services\//);
  await waitForCommercialReady(page);
  await expect(page.locator("#minutes-0")).toHaveValue("2400", {
    timeout: 30_000,
  });
  await publishQuestionnaireFromBuilder(page);

  await page.goto(`/${workspace.slug}/admin/clients`);
  await waitForCommercialReady(page);
  await page.getByLabel(/client name/i).fill(`E2E Client ${workspace.runId}`);
  await page.getByLabel(/primary contact first name/i).fill("E2E");
  await page.getByLabel(/primary contact last name/i).fill("Tester");
  await page.getByRole("button", { name: /create client/i }).click();
  await page.waitForURL(/\/admin\/clients\//);

  await page.goto(`/${workspace.slug}/admin/opportunities`);
  await waitForCommercialReady(page);
  await page.locator("#opp-name").fill(`E2E Opportunity ${workspace.runId}`);
  await Promise.all([
    page.waitForURL(/\/admin\/opportunities\//),
    page.getByRole("button", { name: /create opportunity/i }).click(),
  ]);

  const opportunityUrl = page.url();

  await fillDefaultQuestionnaireAnswers(page);

  await page.goto(`${opportunityUrl}/discovery`);
  await waitForCommercialReady(page);
  await page.getByLabel("Meeting notes").fill(
    "Audience: plant managers. Budget: $85000. Timeline is 90 days. Legal review blocking must complete before approval.",
  );
  await page.getByRole("button", { name: /save notes/i }).click();
  await expect(page.getByRole("button", { name: /^save notes$/i })).toBeEnabled();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/analyze") && response.status() === 201,
    ),
    page.getByRole("button", { name: /analyze notes/i }).click(),
  ]);
  await expect(page.getByRole("button", { name: "Verify" }).first()).toBeVisible({
    timeout: 30_000,
  });
  await verifyAllDraftFacts(page);
  await handleBlockingRisks(page);

  await page.goto(`${opportunityUrl}/missing`);
  await waitForCommercialReady(page);
  await page.getByLabel(/approves the brief/i).fill("Founder");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/follow-ups/") &&
        response.url().includes("/answer") &&
        response.ok(),
    ),
    page.getByRole("button", { name: "Save answer" }).click(),
  ]);

  await page.goto(opportunityUrl);
  await waitForCommercialReady(page);
  await handleBlockingRisks(page);
  const [calculateResponse] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/calculate") && response.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: /run deterministic calculation/i }).click(),
  ]);
  const calculateBody = (await calculateResponse.json()) as {
    opportunity?: { latestCalculation?: { recommendedPriceMinor?: string } };
  };
  expect(
    BigInt(calculateBody.opportunity?.latestCalculation?.recommendedPriceMinor ?? "0"),
  ).toBeGreaterThan(0n);
  await page.reload();
  await waitForCommercialReady(page);
  await expect(page.getByText(/recommended price/i)).toBeVisible({
    timeout: 30_000,
  });

  await page.goto(`${opportunityUrl}/brief`);
  await waitForCommercialReady(page);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/brief") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 60_000 },
    ),
    page.getByRole("button", { name: /generate brief version/i }).click(),
  ]);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/submit") && response.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: /request founder review/i }).click(),
  ]);

  await page.goto(`${opportunityUrl}/approvals`);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/approve") && response.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: /approve immutable brief/i }).click(),
  ]);
  await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();

  return opportunityUrl;
}

export async function reachExecutedContract(input: {
  page: Page;
  context: import("@playwright/test").BrowserContext;
  opportunityUrl: string;
  appUrl: string;
}): Promise<string> {
  const { page, context, opportunityUrl, appUrl } = input;

  await page.goto(`${opportunityUrl}/proposal`);
  await waitForCommercialReady(page);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/proposals") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 60_000 },
    ),
    page.getByRole("button", { name: "Generate proposal" }).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/submit") && response.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: "Submit for review" }).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/approve") && response.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: "Approve proposal" }).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/share") && response.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: "Share with client" }).click(),
  ]);
  const tokenText = await page.locator("code").textContent();
  expect(tokenText).toMatch(/^\/review\/.+/);
  const shareToken = tokenText!.replace("/review/", "");

  const clientPage = await context.newPage();
  await clientPage.goto(`${appUrl}/review/${shareToken}`, {
    waitUntil: "domcontentloaded",
  });
  await clientPage.getByRole("button", { name: "Accept" }).click();
  await expect(
    clientPage.getByText(/Response recorded: accepted/i),
  ).toBeVisible({ timeout: 30_000 });
  await clientPage.close();

  await page.reload();
  await waitForCommercialReady(page);

  await page.goto(`${opportunityUrl}/contract`);
  await waitForCommercialReady(page);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/contracts") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 60_000 },
    ),
    page.getByRole("button", { name: "Generate contract" }).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/submit") && response.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: "Submit for review" }).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/approve") && response.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: "Approve for client" }).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/accept") && response.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: "Record client acceptance" }).click(),
  ]);
  await expect(page.getByText("executed", { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  return opportunityUrl;
}
