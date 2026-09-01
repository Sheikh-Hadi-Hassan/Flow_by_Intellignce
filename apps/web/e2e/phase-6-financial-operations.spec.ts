import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  deleteProvisionedUser,
  provisionCommercialWorkspace,
} from "./helpers/commercial-workspace";
import {
  reachApprovedBrief,
  reachExecutedContract,
  waitForCommercialReady,
} from "./helpers/commercial-journey";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const e2ePassword =
  process.env.E2E_TEST_PASSWORD ??
  `Flow-E2E-${randomUUID().replace(/-/g, "").slice(0, 12)}!`;

const canRun =
  Boolean(supabaseUrl && serviceKey && publishableKey) &&
  process.env.FLOW_E2E_COMMERCIAL === "1";

const northstarSlug = "northstar-creative";
const opportunityId = "ns-opp-acme-brand";

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/phase-6/screenshots",
);
mkdirSync(screenshotDir, { recursive: true });

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: join(screenshotDir, name),
    fullPage: true,
  });
}

async function startNorthstarDemo(page: Page) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
}

async function activateNorthstarProject(page: Page) {
  await page.goto(
    `${appUrl}/${northstarSlug}/admin/opportunities/${opportunityId}/project`,
    { waitUntil: "domcontentloaded" },
  );
  await waitForCommercialReady(page);
  const createBtn = page.getByRole("button", { name: "Create project" });
  const activeStatus = page.getByText("active", { exact: true });
  await expect(createBtn.or(activeStatus)).toBeVisible({ timeout: 30_000 });
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.getByRole("button", { name: "Submit for review" }).click();
    await page.getByRole("button", { name: "Approve plan" }).click();
    await page.getByRole("button", { name: "Publish plan" }).click();
    await page.getByRole("button", { name: "Activate project" }).click();
  }
  await expect(activeStatus).toBeVisible({ timeout: 60_000 });
}

async function runNorthstarFinanceJourney(page: Page) {
  await page.goto(`${appUrl}/${northstarSlug}/admin/finance`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("finance-demo-banner")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("finance-summary")).toBeVisible({
    timeout: 30_000,
  });
  await capture(page, "01-finance-hub.png");

  await expect(page.getByTestId("finance-attention-queue")).toBeVisible();
  await capture(page, "02-attention-queue.png");

  await page.goto(`${appUrl}/${northstarSlug}/admin/finance/time`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("time-entry-list")).toBeVisible();
  await capture(page, "03-time-list.png");

  await page.goto(`${appUrl}/${northstarSlug}/work/time`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("time-description").fill("E2E strategy session");
  await page.getByTestId("time-duration").fill("180");
  await page.getByTestId("submit-time").click();
  await expect(page.getByRole("status")).toBeVisible({ timeout: 15_000 });
  await capture(page, "04-submit-time.png");

  await page.goto(`${appUrl}/${northstarSlug}/admin/finance/time`, {
    waitUntil: "domcontentloaded",
  });
  const approveTime = page
    .getByTestId("time-entry-list")
    .getByRole("button", { name: "Approve" })
    .first();
  await expect(approveTime).toBeVisible({ timeout: 15_000 });
  await approveTime.click();
  await capture(page, "05-approve-time.png");

  await page.goto(`${appUrl}/${northstarSlug}/admin/finance/expenses`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("expense-list")).toBeVisible();
  await capture(page, "06-expense-list.png");

  await page.goto(`${appUrl}/${northstarSlug}/work/expenses`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("expense-vendor").fill("E2E Vendor");
  await page.getByTestId("expense-amount").fill("8500");
  await page.getByTestId("expense-description").fill("E2E stock imagery");
  await page.getByTestId("submit-expense").click();
  await expect(page.getByRole("status")).toBeVisible({ timeout: 15_000 });
  await capture(page, "07-submit-expense.png");

  await page.goto(`${appUrl}/${northstarSlug}/admin/finance/expenses`, {
    waitUntil: "domcontentloaded",
  });
  const approveExpense = page
    .getByTestId("expense-list")
    .getByRole("button", { name: "Approve" })
    .first();
  await expect(approveExpense).toBeVisible({ timeout: 15_000 });
  await approveExpense.click();
  await capture(page, "08-approve-expense.png");

  await page.goto(`${appUrl}/${northstarSlug}/admin/finance/invoices`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("generate-draft-invoice").click();
  await expect(page.getByTestId("invoice-list").locator("li")).not.toHaveCount(
    0,
  );
  await capture(page, "09-generate-draft-invoice.png");

  const draftRow = page
    .getByTestId("invoice-list")
    .locator("li")
    .filter({ hasText: "draft" })
    .first();
  const draftLink = draftRow.getByRole("link").first();
  const draftHref = await draftLink.getAttribute("href");
  expect(draftHref).toBeTruthy();
  await page.goto(`${appUrl}${draftHref}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("invoice-detail")).toBeVisible();
  await capture(page, "10-invoice-detail-draft.png");

  await page.getByTestId("submit-invoice-review").click();
  await expect(page.getByTestId("approve-invoice")).toBeVisible({
    timeout: 15_000,
  });
  await capture(page, "11-submit-review.png");

  await page.getByTestId("approve-invoice").click();
  await expect(page.getByTestId("issue-invoice")).toBeVisible({
    timeout: 15_000,
  });
  await capture(page, "12-approve-invoice.png");

  await page.getByTestId("issue-invoice").click();
  await expect(page.getByTestId("record-payment-form")).toBeVisible({
    timeout: 15_000,
  });
  await capture(page, "13-issue-invoice.png");

  const balance = await page
    .getByTestId("payment-amount")
    .getAttribute("placeholder");
  const half =
    balance && balance !== "0"
      ? String(Math.floor(Number(balance) / 2))
      : "50000";
  await page.getByTestId("payment-amount").fill(half);
  await page.getByTestId("record-payment").click();
  await expect(page.getByText(/partially paid/i)).toBeVisible({
    timeout: 15_000,
  });
  await capture(page, "14-partial-payment.png");

  await page.goto(`${appUrl}/${northstarSlug}/admin/finance/payments`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("payment-list")).toBeVisible();
  await capture(page, "15-payments-list.png");

  await page.goto(`${appUrl}${draftHref}`, { waitUntil: "domcontentloaded" });
  const remainder = await page.getByTestId("payment-amount").getAttribute("placeholder");
  await page.getByTestId("payment-amount").fill(remainder ?? half);
  await page.getByTestId("record-payment").click();
  await expect(page.getByText("paid", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await capture(page, "16-final-payment.png");

  await page.goto(`${appUrl}/${northstarSlug}/admin/finance/reports`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("finance-report-summary")).toBeVisible({
    timeout: 30_000,
  });
  await capture(page, "17-finance-reports.png");

  await page.goto(`${appUrl}/${northstarSlug}/admin`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("link", { name: /Invoice approval|Unbilled|Finance/i }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await capture(page, "18-mission-control-finance.png");
}

test.describe("Phase 6 financial operations journey", () => {
  test.describe.configure({ mode: "serial" });

  test("northstar finance journey through paid invoice", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await startNorthstarDemo(page);
    await activateNorthstarProject(page);
    await runNorthstarFinanceJourney(page);
  });
});

test.describe("Phase 6 authenticated financial operations", () => {
  test.skip(!canRun, "Set FLOW_E2E_COMMERCIAL=1 and E2E credentials to run.");
  test.describe.configure({ mode: "serial" });

  test("authenticated finance endpoints respond after project activation", async ({
    page,
    context,
  }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    const workspace = await provisionCommercialWorkspace({
      supabaseUrl: supabaseUrl!,
      serviceKey: serviceKey!,
      publishableKey: publishableKey!,
      apiBase,
      password: e2ePassword,
    });

    try {
      const opportunityUrl = await reachApprovedBrief({
        page,
        workspace,
        appUrl,
        apiBase,
      });
      await reachExecutedContract({
        page,
        context,
        opportunityUrl,
        appUrl,
      });

      await page.goto(`${opportunityUrl}/project`);
      await waitForCommercialReady(page);
      await page.getByRole("button", { name: "Create project" }).click();
      await page.getByRole("button", { name: "Submit for review" }).click();
      await page.getByRole("button", { name: "Approve plan" }).click();
      await page.getByRole("button", { name: "Publish plan" }).click();
      await page.getByRole("button", { name: "Activate project" }).click();
      await expect(page.getByText("active", { exact: true })).toBeVisible({
        timeout: 60_000,
      });

      const opportunitiesResponse = await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.workspaceId}/commercial/opportunities`,
        { headers: workspace.apiAuth },
      );
      const opportunities = (await opportunitiesResponse.json()) as {
        id: string;
      }[];
      const opportunityId = opportunities[0]?.id;
      expect(opportunityId).toBeTruthy();

      const projectResponse = await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.workspaceId}/commercial/opportunities/${opportunityId}/projects`,
        { headers: workspace.apiAuth },
      );
      const projects = (await projectResponse.json()) as { id: string }[];
      const projectId = projects[0]?.id;
      expect(projectId).toBeTruthy();

      await page.goto(`${appUrl}/${workspace.slug}/admin/finance`, {
        waitUntil: "domcontentloaded",
      });
      await capture(page, "auth-01-finance-hub.png");

      const timeResponse = await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.workspaceId}/finance/time-entries`,
        {
          method: "POST",
          headers: workspace.apiAuth,
          body: JSON.stringify({
            projectId,
            workDate: new Date().toISOString().slice(0, 10),
            durationMinutes: 60,
            billable: true,
            description: "E2E authenticated time",
            hourlyRateMinor: "10000",
          }),
        },
      );
      expect(timeResponse.ok).toBe(true);
      const timeEntry = (await timeResponse.json()) as { id: string };
      await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.workspaceId}/finance/time-entries/${timeEntry.id}/submit`,
        { method: "POST", headers: workspace.apiAuth },
      );
      await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.workspaceId}/finance/time-entries/${timeEntry.id}/approve`,
        { method: "POST", headers: workspace.apiAuth },
      );

      await page.goto(`${appUrl}/${workspace.slug}/admin/finance/time`, {
        waitUntil: "domcontentloaded",
      });
      await expect(page.getByTestId("time-entry-list")).toContainText("approved");
      await capture(page, "auth-02-time-approved.png");

      const summaryResponse = await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.workspaceId}/finance/summary`,
        { headers: workspace.apiAuth },
      );
      expect(summaryResponse.ok).toBe(true);
    } finally {
      await deleteProvisionedUser({
        supabaseUrl: supabaseUrl!,
        serviceKey: serviceKey!,
        userId: workspace.userId,
      });
    }
  });
});
