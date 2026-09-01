import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  deleteProvisionedUser,
  provisionCommercialWorkspace,
} from "./helpers/commercial-workspace";
import { waitForCommercialReady } from "./helpers/commercial-journey";
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
      await prepareCommercialApiProxy(page, workspace);
      await signInThroughUi(page, {
        appUrl,
        email: workspace.email,
        password: e2ePassword,
      });
      await waitForCommercialReady(page, workspace.slug);

      await page.goto(`${appUrl}/${workspace.slug}/admin/services`, {
        waitUntil: "networkidle",
      });
      await page.screenshot({ path: join(screenshotDir, "01-questionnaire-list.png"), fullPage: true });

      await page.getByRole("link", { name: /services/i }).first().click();
      const serviceLink = page.locator("a[href*='/admin/services/']").first();
      await serviceLink.click();
      await page.getByRole("link", { name: /questionnaire builder/i }).click();
      await page.screenshot({ path: join(screenshotDir, "02-builder-empty.png"), fullPage: true });

      await page.getByRole("button", { name: "Add question" }).click();
      await page.screenshot({ path: join(screenshotDir, "03-builder-question-types.png"), fullPage: true });
      await page.getByRole("button", { name: "Publish" }).click();
      await page.getByRole("button", { name: "Confirm publish" }).click();
      await page.screenshot({ path: join(screenshotDir, "10-published-version.png"), fullPage: true });

      await page.goto(`${appUrl}/${workspace.slug}/admin/opportunities`, {
        waitUntil: "networkidle",
      });
      await page.getByRole("link", { name: /opportunities/i }).first().click();
      await page.locator("a[href*='/admin/opportunities/']").first().click();
      await page.getByRole("link", { name: "Questionnaire" }).click();
      await page.screenshot({ path: join(screenshotDir, "11-answering-desktop.png"), fullPage: true });

      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({ path: join(screenshotDir, "12-answering-mobile.png"), fullPage: true });

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByLabel(/Primary audience/i).fill("Growth marketers");
      await page.getByLabel(/Success metric/i).fill("Qualified leads");
      await page.getByRole("button", { name: "Save now" }).click();
      await page.screenshot({ path: join(screenshotDir, "14-autosave.png"), fullPage: true });

      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByLabel(/Primary audience/i)).toHaveValue("Growth marketers");
      await page.screenshot({ path: join(screenshotDir, "15-reload-resume.png"), fullPage: true });

      await page.getByRole("button", { name: "Submit questionnaire" }).click();
      await page.screenshot({ path: join(screenshotDir, "16-submitted.png"), fullPage: true });

      await page.getByRole("link", { name: /discovery evidence/i }).click();
      await page.screenshot({ path: join(screenshotDir, "17-discovery-evidence.png"), fullPage: true });

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
    await page.goto(`${appUrl}/northstar-creative/admin/services/ns-svc-brand`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("link", { name: /questionnaire/i }).click();
    await expect(page.getByText(/Version/i)).toBeVisible();
  });
});
