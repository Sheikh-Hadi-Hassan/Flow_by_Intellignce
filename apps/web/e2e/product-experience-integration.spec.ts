import { expect, test, type Page } from "@playwright/test";
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

const canRunAuth =
  Boolean(supabaseUrl && serviceKey && publishableKey) &&
  process.env.FLOW_E2E_COMMERCIAL === "1";

const northstarSlug = "northstar-creative";
const opportunityId = "ns-opp-acme-brand";

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/product-experience/screenshots",
);
mkdirSync(screenshotDir, { recursive: true });

function attachDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const hydrationWarnings: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") consoleErrors.push(text);
    if (/hydration/i.test(text)) hydrationWarnings.push(text);
  });

  return {
    assertClean: () => {
      expect(hydrationWarnings).toEqual([]);
      expect(
        consoleErrors.filter(
          (row) =>
            !row.includes("favicon") &&
            !row.includes("Download the React DevTools") &&
            !/401.*Unauthorized/i.test(row) &&
            !/Failed to load resource:.*404/i.test(row),
        ),
      ).toEqual([]);
    },
  };
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: join(screenshotDir, name), fullPage: true });
}

async function startNorthstarDemo(page: Page) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
  await waitForCommercialReady(page);
}

test.describe("Product experience integration — Northstar journey", () => {
  test("mission control, lifecycle nav, Ask Flow, and mobile shell", async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);
    await startNorthstarDemo(page);

    await expect(page.getByRole("heading", { name: /Good /i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Lifecycle pipeline")).toBeVisible();
    await capture(page, "01-mission-control-light.png");

    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await capture(page, "02-mission-control-dark.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCommercialReady(page);
    await expect(page.getByRole("navigation", { name: "Mobile lifecycle" })).toBeVisible();
    await capture(page, "03-mission-control-mobile.png");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCommercialReady(page);

    await page.getByRole("link", { name: "Pipeline" }).click();
    await page.waitForURL(new RegExp(`/${northstarSlug}/admin/opportunities`));
    await capture(page, "04-lifecycle-pipeline.png");

    await page.goto(
      `${appUrl}/${northstarSlug}/admin/opportunities/${opportunityId}`,
      { waitUntil: "domcontentloaded" },
    );
    await waitForCommercialReady(page);
    await capture(page, "05-opportunity-detail.png");

    await page.goto(
      `${appUrl}/${northstarSlug}/admin/opportunities/${opportunityId}/discovery`,
      { waitUntil: "domcontentloaded" },
    );
    await waitForCommercialReady(page);
    await capture(page, "06-discovery-evidence.png");

    await page.goto(
      `${appUrl}/${northstarSlug}/admin/opportunities/${opportunityId}/proposal`,
      { waitUntil: "domcontentloaded" },
    );
    await waitForCommercialReady(page);
    await capture(page, "07-proposal-contract.png");

    await page.goto(
      `${appUrl}/${northstarSlug}/admin/opportunities/${opportunityId}/project`,
      { waitUntil: "domcontentloaded" },
    );
    await waitForCommercialReady(page);
    await capture(page, "08-project-delivery.png");

    await page.goto(`${appUrl}/${northstarSlug}/admin/team`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCommercialReady(page);
    await capture(page, "09-team-capacity.png");

    await page.goto(`${appUrl}/${northstarSlug}/work`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCommercialReady(page);
    await capture(page, "10-my-work.png");

    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCommercialReady(page);
    await page.getByRole("button", { name: "Open Ask Flow" }).click();
    await expect(page.getByRole("dialog", { name: /Ask Flow/i })).toBeVisible();
    await page.getByRole("button", { name: "Next action" }).click();
    await expect(page.getByText(/Proof/i)).toBeVisible();
    await capture(page, "11-ask-flow-proof.png");

    await page.goto(`${appUrl}/${northstarSlug}/admin/settings`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCommercialReady(page);
    await capture(page, "12-theme-accent-settings.png");

    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await capture(page, "13-northstar-demo.png");

    diag.assertClean();
  });
});

test.describe("Product experience integration — authenticated workspace", () => {
  test.skip(!canRunAuth, "requires FLOW_E2E_COMMERCIAL=1 and Supabase credentials");

  let userId = "";

  test.afterAll(async () => {
    if (userId && supabaseUrl && serviceKey) {
      await deleteProvisionedUser({ supabaseUrl, serviceKey, userId });
    }
  });

  test("authenticated mission control and attention navigation", async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);
    const provisioned = await provisionCommercialWorkspace({
      supabaseUrl: supabaseUrl!,
      serviceKey: serviceKey!,
      publishableKey: publishableKey!,
      apiBase,
      password: e2ePassword,
    });
    userId = provisioned.userId;

    await prepareCommercialApiProxy(page, {
      apiBase,
      apiAuth: provisioned.apiAuth,
    });

    await signInThroughUi(page, {
      appUrl,
      email: provisioned.email,
      password: e2ePassword,
      workspaceSlug: provisioned.slug,
    });

    await page.goto(`${appUrl}/${provisioned.slug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCommercialReady(page);
    await expect(page.getByText("Lifecycle pipeline")).toBeVisible({
      timeout: 30_000,
    });
    await capture(page, "14-authenticated-workspace.png");
    diag.assertClean();
  });
});
