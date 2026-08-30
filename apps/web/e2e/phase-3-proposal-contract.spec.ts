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

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/phase-3/screenshots",
);
mkdirSync(screenshotDir, { recursive: true });

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: join(screenshotDir, name),
    fullPage: true,
  });
}

test.describe("Phase 3 proposal and contract journey", () => {
  test.skip(!canRun, "Set FLOW_E2E_COMMERCIAL=1 and E2E credentials to run.");
  test.describe.configure({ mode: "serial" });

  test("approved brief through executed contract", async ({ page, context }) => {
    test.setTimeout(360_000);
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
      await capture(page, "01-approved-brief.png");

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
      await expect(page.getByText("draft", { exact: false })).toBeVisible({
        timeout: 60_000,
      });
      await capture(page, "02-proposal-draft.png");

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/submit") && response.ok(),
          { timeout: 30_000 },
        ),
        page.getByRole("button", { name: "Submit for review" }).click(),
      ]);
      await expect(
        page.getByRole("button", { name: "Approve proposal" }),
      ).toBeVisible({ timeout: 30_000 });
      await capture(page, "03-proposal-founder-review.png");

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/approve") && response.ok(),
          { timeout: 30_000 },
        ),
        page.getByRole("button", { name: "Approve proposal" }).click(),
      ]);
      await expect(
        page.getByRole("button", { name: "Share with client" }),
      ).toBeVisible({ timeout: 30_000 });
      await capture(page, "04-proposal-approved.png");

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/share") && response.ok(),
          { timeout: 30_000 },
        ),
        page.getByRole("button", { name: "Share with client" }).click(),
      ]);
      await expect(page.getByText(/Client review link token/i)).toBeVisible({
        timeout: 30_000,
      });
      const tokenText = await page.locator("code").textContent();
      expect(tokenText).toMatch(/^\/review\/.+/);
      const shareToken = tokenText!.replace("/review/", "");
      await capture(page, "05-proposal-shared.png");

      const clientPage = await context.newPage();
      await clientPage.goto(`${appUrl}/review/${shareToken}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(clientPage.getByRole("heading", { name: "Proposal review" })).toBeVisible({
        timeout: 30_000,
      });
      await capture(clientPage, "06-client-review-proposal.png");

      await clientPage.getByRole("button", { name: "Accept" }).click();
      await expect(
        clientPage.getByText(/Response recorded: accepted/i),
      ).toBeVisible({ timeout: 30_000 });
      await capture(clientPage, "07-client-accepted-proposal.png");
      await clientPage.close();

      await page.reload();
      await waitForCommercialReady(page);
      await expect(page.getByText("accepted", { exact: false })).toBeVisible({
        timeout: 30_000,
      });

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
      await expect(page.getByText("draft", { exact: false })).toBeVisible({
        timeout: 60_000,
      });
      await capture(page, "08-contract-draft.png");

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/submit") && response.ok(),
          { timeout: 30_000 },
        ),
        page.getByRole("button", { name: "Submit for review" }).click(),
      ]);
      await expect(
        page.getByRole("button", { name: "Approve for client" }),
      ).toBeVisible({ timeout: 30_000 });
      await capture(page, "09-contract-founder-review.png");

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/approve") && response.ok(),
          { timeout: 30_000 },
        ),
        page.getByRole("button", { name: "Approve for client" }).click(),
      ]);
      await expect(
        page.getByRole("button", { name: "Record client acceptance" }),
      ).toBeVisible({ timeout: 30_000 });
      await capture(page, "10-contract-pending-client.png");

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/accept") && response.ok(),
          { timeout: 30_000 },
        ),
        page.getByRole("button", { name: "Record client acceptance" }).click(),
      ]);
      await expect(page.getByText("executed", { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await capture(page, "11-contract-executed.png");
    } finally {
      await deleteProvisionedUser({
        supabaseUrl: supabaseUrl!,
        serviceKey: serviceKey!,
        userId: workspace.userId,
      });
    }
  });
});
