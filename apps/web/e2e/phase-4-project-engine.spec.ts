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
  "../../docs/verification/phase-4/screenshots",
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

test.describe("Phase 4 project engine journey", () => {
  test.describe.configure({ mode: "serial" });

  test("northstar executed contract through project activation", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await startNorthstarDemo(page);

    await page.goto(
      `${appUrlNorthstar}/${northstarSlug}/admin/opportunities/${opportunityId}/contract`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByText("executed", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await capture(page, "01-executed-contract.png");

    await page.goto(
      `${appUrlNorthstar}/${northstarSlug}/admin/opportunities/${opportunityId}/project`,
      { waitUntil: "domcontentloaded" },
    );
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByText("draft", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await capture(page, "02-project-draft.png");

    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByRole("button", { name: "Approve plan" })).toBeVisible({
      timeout: 30_000,
    });
    await capture(page, "03-project-review.png");

    await page.getByRole("button", { name: "Approve plan" }).click();
    await expect(page.getByRole("button", { name: "Publish plan" })).toBeVisible({
      timeout: 30_000,
    });
    await capture(page, "04-project-approved.png");

    await page.getByRole("button", { name: "Publish plan" }).click();
    await expect(
      page.getByRole("button", { name: "Activate project" }),
    ).toBeVisible({ timeout: 30_000 });
    await capture(page, "05-project-published.png");

    await page.getByRole("button", { name: "Activate project" }).click();
    await expect(page.getByText("active", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await capture(page, "06-project-active.png");

    await page.getByRole("button", { name: "Assign recommended resource" }).click();
    await expect(
      page.getByText("Jordan Ellis (Account Director) (strategist)"),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("project-progress")).toContainText("1/");
    await capture(page, "07-assignment.png");

    await expect(page.getByTestId("project-audit-count")).toContainText("1");
    await capture(page, "08-audit-and-timeline.png");
  });
});

test.describe("Phase 4 authenticated project engine", () => {
  test.skip(!canRun, "Set FLOW_E2E_COMMERCIAL=1 and E2E credentials to run.");
  test.describe.configure({ mode: "serial" });

  test("executed contract through project activation", async ({
    page,
    context,
  }) => {
    test.setTimeout(420_000);
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
      await expect(page.getByText("draft", { exact: true })).toBeVisible({
        timeout: 30_000,
      });

      await page.getByRole("button", { name: "Submit for review" }).click();
      await expect(page.getByRole("button", { name: "Approve plan" })).toBeVisible({
        timeout: 30_000,
      });

      await page.getByRole("button", { name: "Approve plan" }).click();
      await expect(page.getByRole("button", { name: "Publish plan" })).toBeVisible({
        timeout: 30_000,
      });

      await page.getByRole("button", { name: "Publish plan" }).click();
      await expect(
        page.getByRole("button", { name: "Activate project" }),
      ).toBeVisible({ timeout: 30_000 });

      await page.getByRole("button", { name: "Activate project" }).click();
      await expect(page.getByText("active", { exact: true })).toBeVisible({
        timeout: 30_000,
      });

      await page.getByRole("button", { name: "Assign recommended resource" }).click();
      await expect(page.getByTestId("project-progress")).toContainText("1/");
      await expect(page.getByTestId("project-audit-count")).toContainText("1");
    } finally {
      await deleteProvisionedUser({
        supabaseUrl: supabaseUrl!,
        serviceKey: serviceKey!,
        userId: workspace.userId,
      });
    }
  });
});
