import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  deleteProvisionedUser,
  provisionCommercialWorkspace,
} from "./helpers/commercial-workspace";
import { waitForCommercialReady } from "./helpers/commercial-journey";
import {
  fillDefaultQuestionnaireAnswers,
  publishQuestionnaireFromBuilder,
} from "./helpers/questionnaire-journey";
import { prepareCommercialApiProxy, signInThroughUi } from "./helpers/supabase-auth";

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
  "../../docs/verification/questionnaire/screenshots",
);
mkdirSync(screenshotDir, { recursive: true });

test.describe("questionnaire production journey", () => {
  test.skip(!canRun, "Commercial E2E credentials required");

  test("authenticated builder publish answer submit discovery", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const workspace = await provisionCommercialWorkspace({
      apiBase,
      supabaseUrl: supabaseUrl!,
      serviceKey: serviceKey!,
      publishableKey: publishableKey!,
      password: e2ePassword,
    });

    try {
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
      await page.screenshot({
        path: join(screenshotDir, "01-questionnaire-list.png"),
        fullPage: true,
      });

      await page.getByLabel("Service name").fill(`Questionnaire E2E ${workspace.runId}`);
      await page.getByRole("button", { name: "Create service" }).click();
      await page.waitForURL(/\/admin\/services\//);
      await waitForCommercialReady(page);
      await page.screenshot({
        path: join(screenshotDir, "02-builder-entry.png"),
        fullPage: true,
      });

      await publishQuestionnaireFromBuilder(page);
      await page.screenshot({
        path: join(screenshotDir, "10-published-version.png"),
        fullPage: true,
      });

      await page.goto(`/${workspace.slug}/admin/clients`);
      await waitForCommercialReady(page);
      await page.getByLabel(/client name/i).fill(`Questionnaire Client ${workspace.runId}`);
      await page.getByLabel(/primary contact first name/i).fill("E2E");
      await page.getByLabel(/primary contact last name/i).fill("Tester");
      await page.getByRole("button", { name: /create client/i }).click();
      await page.waitForURL(/\/admin\/clients\//);

      await page.goto(`/${workspace.slug}/admin/opportunities`);
      await waitForCommercialReady(page);
      await expect(page.locator("#opp-client option")).not.toHaveCount(0);
      await expect(page.locator("#opp-service option")).not.toHaveCount(0);
      await page.locator("#opp-name").fill(`Questionnaire Opp ${workspace.runId}`);
      await Promise.all([
        page.waitForURL(/\/admin\/opportunities\//),
        page.getByRole("button", { name: /create opportunity/i }).click(),
      ]);

      const opportunityUrl = page.url();
      await page.getByRole("link", { name: "Questionnaire" }).click();
      await page.screenshot({
        path: join(screenshotDir, "11-answering-desktop.png"),
        fullPage: true,
      });

      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({
        path: join(screenshotDir, "12-answering-mobile.png"),
        fullPage: true,
      });

      await page.setViewportSize({ width: 1440, height: 900 });
      await fillDefaultQuestionnaireAnswers(page);
      await page.screenshot({
        path: join(screenshotDir, "14-autosave.png"),
        fullPage: true,
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForCommercialReady(page);
      await expect(page.getByLabel(/Primary audience/i)).toHaveValue("Operations leaders");
      await page.screenshot({
        path: join(screenshotDir, "15-reload-resume.png"),
        fullPage: true,
      });

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/answers/submit") && response.ok(),
          { timeout: 30_000 },
        ),
        page.getByRole("button", { name: "Submit questionnaire" }).click(),
      ]);
      await expect(page.getByText(/Submitted\./i)).toBeVisible({ timeout: 15_000 });
      await page.screenshot({
        path: join(screenshotDir, "16-submitted.png"),
        fullPage: true,
      });

      await page.goto(`${opportunityUrl}/missing`);
      await waitForCommercialReady(page);
      await expect(page.getByRole("link", { name: "Complete questionnaire" })).toHaveCount(0);
      await expect(page.getByText(/Who internally approves the brief/i)).toBeVisible();
      await page.screenshot({
        path: join(screenshotDir, "13-missing-complete.png"),
        fullPage: true,
      });

      await page.getByRole("link", { name: "Discovery", exact: true }).click();
      await waitForCommercialReady(page);
      await page.screenshot({
        path: join(screenshotDir, "17-discovery-evidence.png"),
        fullPage: true,
      });

      expect(
        consoleErrors.filter(
          (row) => !row.includes("favicon") && !/401.*Unauthorized/i.test(row),
        ),
      ).toEqual([]);
    } finally {
      await deleteProvisionedUser({
        supabaseUrl: supabaseUrl!,
        serviceKey: serviceKey!,
        userId: workspace.userId,
      });
    }
  });
});

test.describe("questionnaire northstar journey", () => {
  test("northstar questionnaire builder and answer flow", async ({ page }) => {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
    await page.goto(`${appUrl}/northstar-creative/admin/services/ns-svc-brand/questionnaire`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: "Version 1" })).toBeVisible();
  });
});
