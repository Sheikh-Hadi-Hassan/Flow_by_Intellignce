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

const appUrlNorthstar = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";
const opportunityId = "ns-opp-acme-brand";

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/phase-5/screenshots",
);
mkdirSync(screenshotDir, { recursive: true });

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: join(screenshotDir, name),
    fullPage: true,
  });
}

async function startNorthstarDemo(page: Page) {
  await page.goto(appUrlNorthstar, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
}

async function activateNorthstarProject(page: Page) {
  await page.goto(
    `${appUrlNorthstar}/${northstarSlug}/admin/opportunities/${opportunityId}/project`,
    { waitUntil: "domcontentloaded" },
  );
  await waitForCommercialReady(page);
  const createBtn = page.getByRole("button", { name: "Create project" });
  const activeStatus = page.getByText("active", { exact: true });
  await expect(createBtn.or(activeStatus)).toBeVisible({ timeout: 30_000 });
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await expect(page.getByText("draft", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "Submit for review" }).click();
    await page.getByRole("button", { name: "Approve plan" }).click();
    await page.getByRole("button", { name: "Publish plan" }).click();
    await page.getByRole("button", { name: "Activate project" }).click();
  }
  await expect(activeStatus).toBeVisible({ timeout: 60_000 });
}

test.describe("Phase 5 resource capacity journey", () => {
  test.describe.configure({ mode: "serial" });

  test("northstar active project through published workload", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await startNorthstarDemo(page);
    await activateNorthstarProject(page);
    await capture(page, "01-project-active.png");

    await page.goto(
      `${appUrlNorthstar}/${northstarSlug}/admin/team`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByTestId("team-list")).toContainText("Maya Chen");
    await capture(page, "02-team-list.png");

    await page.goto(
      `${appUrlNorthstar}/${northstarSlug}/admin/opportunities/${opportunityId}/project/capacity`,
      { waitUntil: "domcontentloaded" },
    );
    await page.getByTestId("generate-recommendations").click();
    await expect(page.getByTestId("recommendation-list")).toBeVisible({
      timeout: 30_000,
    });
    await capture(page, "03-recommendations.png");

    await page.getByRole("button", { name: "Draft top recommendations" }).click();
    await expect(page.getByTestId("draft-assignment-list").locator("li")).not.toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByTestId("approve-resource-plan")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("approve-resource-plan").click();
    await expect(page.getByTestId("publish-resource-plan")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("publish-resource-plan").click();
    await expect(page.getByTestId("published-plan")).toBeVisible({
      timeout: 30_000,
    });
    await capture(page, "04-published-workload.png");

    await page.goto(`${appUrlNorthstar}/${northstarSlug}/work`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("my-work-list")).toBeVisible();
    await capture(page, "05-my-work.png");
  });
});

test.describe("Phase 5 authenticated resource capacity", () => {
  test.skip(!canRun, "Set FLOW_E2E_COMMERCIAL=1 and E2E credentials to run.");
  test.describe.configure({ mode: "serial" });

  test("authenticated staffing plan persists after refresh", async ({
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
      await fetch(
        `${apiBase}/api/v1/workspaces/${workspace.workspaceId}/commercial/resources`,
        {
          method: "POST",
          headers: workspace.apiAuth,
          body: JSON.stringify({
            displayName: "E2E Strategist",
            resourceType: "employee",
            roleKeys: ["strategist", "designer", "developer", "copywriter"],
            timezone: "UTC",
          }),
        },
      );

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
      await expect(page.getByText("draft", { exact: true })).toBeVisible({
        timeout: 60_000,
      });
      await page.getByRole("button", { name: "Submit for review" }).click();
      await page.getByRole("button", { name: "Approve plan" }).click();
      await page.getByRole("button", { name: "Publish plan" }).click();
      await page.getByRole("button", { name: "Activate project" }).click();
      await expect(page.getByText("active", { exact: true })).toBeVisible({
        timeout: 60_000,
      });

      await page.goto(`${opportunityUrl}/project/capacity`);
      await waitForCommercialReady(page);
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/resource-plan/recommendations") &&
            response.ok(),
        ),
        page.getByTestId("generate-recommendations").click(),
      ]);
      await expect(page.getByTestId("resource-plan-panel")).toContainText(
        /recommendations ready/i,
        { timeout: 60_000 },
      );
      await page.getByTestId("cover-role-requirements").click();
      await expect(page.getByTestId("draft-assignment-list").locator("li")).not.toHaveCount(
        0,
        { timeout: 60_000 },
      );
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/resource-plan/submit") && response.ok(),
        ),
        page.getByRole("button", { name: "Submit for review" }).click(),
      ]);
      await expect(page.getByTestId("approve-resource-plan")).toBeVisible({
        timeout: 60_000,
      });
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/resource-plan/approve") && response.ok(),
        ),
        page.getByTestId("approve-resource-plan").click(),
      ]);
      await expect(page.getByTestId("publish-resource-plan")).toBeVisible({
        timeout: 60_000,
      });
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/resource-plan/publish") && response.ok(),
        ),
        page.getByTestId("publish-resource-plan").click(),
      ]);
      await expect(page.getByTestId("published-plan")).toBeVisible({
        timeout: 60_000,
      });
      await capture(page, "06-auth-published.png");

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("published-plan")).toBeVisible({
        timeout: 60_000,
      });
      await capture(page, "07-auth-persisted.png");
    } finally {
      await deleteProvisionedUser({
        supabaseUrl: supabaseUrl!,
        serviceKey: serviceKey!,
        userId: workspace.userId,
      });
    }
  });
});
