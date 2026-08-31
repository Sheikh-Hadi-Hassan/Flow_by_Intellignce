import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

import {
  deleteProvisionedUser,
  provisionCommercialWorkspace,
} from "./helpers/commercial-workspace";
import {
  handleBlockingRisks,
  verifyAllDraftFacts,
  waitForCommercialReady,
} from "./helpers/commercial-journey";
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

function attachDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const hydrationWarnings: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") {
      consoleErrors.push(text);
    }
    if (/hydration/i.test(text)) {
      hydrationWarnings.push(text);
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    if (failure?.errorText === "net::ERR_ABORTED") return;
    failedRequests.push(`${request.method()} ${request.url()}`);
  });

  return {
    assertClean: () => {
      expect(
        hydrationWarnings,
        `hydration warnings: ${hydrationWarnings.join("; ")}`,
      ).toEqual([]);
      expect(
        consoleErrors.filter(
          (row) =>
            !row.includes("favicon") &&
            !row.includes("Download the React DevTools") &&
            !/401.*Unauthorized/i.test(row),
        ),
        `console errors: ${consoleErrors.join("; ")}`,
      ).toEqual([]);
      expect(
        failedRequests.filter(
          (row) => !row.includes("favicon") && !row.includes("_rsc="),
        ),
        `failed requests: ${failedRequests.join("; ")}`,
      ).toEqual([]);
    },
  };
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
  expect(overflow, "page should not overflow horizontally").toBe(false);
}

test.describe("authenticated commercial golden path", () => {
  test.skip(!canRun, "Set FLOW_E2E_COMMERCIAL=1 and E2E credentials to run.");
  test.describe.configure({ mode: "serial" });

  test("completes discovery to immutable approved brief", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const diagnostics = attachDiagnostics(page);
    const workspace = await provisionCommercialWorkspace({
      supabaseUrl: supabaseUrl!,
      serviceKey: serviceKey!,
      publishableKey: publishableKey!,
      apiBase,
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
      await expect(page.getByLabel("Service name")).toBeVisible({
        timeout: 30_000,
      });

      await page.getByLabel("Service name").fill(`E2E Service ${workspace.runId}`);
      await page.getByRole("button", { name: "Create service" }).click();
      await page.waitForURL(/\/admin\/services\//);
      await waitForCommercialReady(page);
      await expect(page.locator("#minutes-0")).toHaveValue("2400", {
        timeout: 30_000,
      });
      await page.getByRole("button", { name: "Publish questionnaire" }).click();
      await expect(page.getByText("Questionnaire published")).toBeVisible();

      await page.goto(`/${workspace.slug}/admin/clients`);
      await waitForCommercialReady(page);
      await expect(page.getByLabel(/client name/i)).toBeVisible();
      await page.getByLabel(/client name/i).fill(`E2E Client ${workspace.runId}`);
      await page.getByLabel(/primary contact first name/i).fill("E2E");
      await page.getByLabel(/primary contact last name/i).fill("Tester");
      await page.getByRole("button", { name: /create client/i }).click();
      await page.waitForURL(/\/admin\/clients\//);

      await page.goto(`/${workspace.slug}/admin/opportunities`);
      await waitForCommercialReady(page);
      await expect(page.locator("#opp-client option")).not.toHaveCount(0);
      await expect(page.locator("#opp-service option")).not.toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /create opportunity/i }),
      ).toBeEnabled();
      await page.locator("#opp-name").fill(`E2E Opportunity ${workspace.runId}`);
      await Promise.all([
        page.waitForURL(/\/admin\/opportunities\//),
        page.getByRole("button", { name: /create opportunity/i }).click(),
      ]);

      const opportunityUrl = page.url();

      await page.getByLabel("Brand maturity").selectOption("emerging");
      await page.getByLabel("Primary audience").fill("Operations leaders");
      await page.getByLabel("Success metric").fill("Qualified pipeline");
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/answers") && response.ok(),
        ),
        page.getByLabel("Success metric").blur(),
      ]);

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
      await page
        .getByLabel(/approves the brief/i)
        .fill("Founder");
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/follow-ups/") &&
            response.url().includes("/answer") &&
            response.ok(),
        ),
        page.getByRole("button", { name: "Save answer" }).click(),
      ]);
      await expect(page.getByText(/required follow-ups complete/i)).toBeVisible({
        timeout: 30_000,
      });

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
        BigInt(
          calculateBody.opportunity?.latestCalculation?.recommendedPriceMinor ??
            "0",
        ),
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
      await expect(
        page.getByRole("button", { name: /request founder review/i }),
      ).toBeVisible({ timeout: 60_000 });
      await page.getByRole("button", { name: /request founder review/i }).click();

      await page.goto(`${opportunityUrl}/approvals`);
      await page.getByRole("button", { name: /request changes/i }).click();
      await page.goto(`${opportunityUrl}/brief`);
      await page.getByRole("button", { name: /generate revised version/i }).click();
      await page.getByRole("button", { name: /request founder review/i }).click();
      await page.goto(`${opportunityUrl}/approvals`);
      await page
        .getByRole("button", { name: /approve immutable brief/i })
        .click();
      await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();

      await page.reload();
      await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();

      await page.goto(`${opportunityUrl}/brief`);
      await expect(
        page.getByRole("button", { name: /generate brief version/i }),
      ).toBeDisabled();

      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(`${opportunityUrl}/approvals`);
      await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(opportunityUrl);
      await expect(page.getByText(/recommended price|timeline|completeness/i).first()).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto(`${opportunityUrl}/approvals`);
      await waitForCommercialReady(page);
      await page.reload();
      await waitForCommercialReady(page);
      await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();

      await page.goto(`${appUrl}/sign-in`);
      await signInThroughUi(page, {
        appUrl,
        email: workspace.email,
        password: workspace.password,
        workspaceSlug: workspace.slug,
      });
      await page.goto(`${opportunityUrl}/approvals`);
      await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();

      diagnostics.assertClean();
    } finally {
      await deleteProvisionedUser({
        supabaseUrl: supabaseUrl!,
        serviceKey: serviceKey!,
        userId: workspace.userId,
      });
    }
  });
});
