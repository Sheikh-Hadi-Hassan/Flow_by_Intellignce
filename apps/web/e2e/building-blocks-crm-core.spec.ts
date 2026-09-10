import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";
const meridianId = "00000000-0000-4000-a000-000000000002";
const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/building-blocks/screenshots",
);

mkdirSync(screenshotDir, { recursive: true });

const HIDE_DEV_CHROME = `
  nextjs-portal,
  [data-next-badge-root],
  [data-nextjs-toast],
  [data-nextjs-dev-overlay],
  [data-nextjs-dialog-overlay],
  #__next-build-watcher {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

async function startDemo(page: Page) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
}

async function activateCrm(page: Page) {
  await page.goto(`${appUrl}/${northstarSlug}/admin/building-blocks`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("bb-recommended-crm")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Save configuration" }).click();
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await page.getByRole("button", { name: "Approve activation" }).click();
  await expect(
    page.getByText("CRM Core is active in this workspace."),
  ).toBeVisible();
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => {
    document.documentElement.setAttribute("data-theme", value);
  }, theme);
}

async function capture(page: Page, name: string) {
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
  await page.mouse.move(0, 0);
  await page.screenshot({ path: join(screenshotDir, name), fullPage: true });
}

test.describe("BB-00 CRM Core reference", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("recommendation to activation to usage to suspension", async ({
    page,
  }) => {
    await startDemo(page);
    await page.goto(`${appUrl}/${northstarSlug}/admin/building-blocks`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("bb-recommended-crm")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/verified requirement/i)).toBeVisible();
    await page.getByRole("button", { name: "Save configuration" }).click();
    await page.getByRole("button", { name: "Submit for approval" }).click();
    await page.getByRole("button", { name: "Approve activation" }).click();
    await expect(
      page.getByText("CRM Core is active in this workspace."),
    ).toBeVisible();

    await page.goto(`${appUrl}/${northstarSlug}/admin/clients`);
    await expect(page.getByTestId("crm-directory")).toBeVisible();
    await expect(page.getByText("Meridian Health").first()).toBeVisible();
    const rows = page.getByTestId("crm-directory").locator("li");
    await expect(rows).toHaveCount(52);

    await page.getByRole("link", { name: "Duplicates" }).click();
    await expect(page.getByTestId("crm-duplicates")).toContainText(
      "Brightline",
    );
    await expect(
      page.getByRole("button", { name: "Merge requires approval" }),
    ).toBeDisabled();

    const composer = page.getByLabel("Ask anything about your business");
    await composer.fill("Which clients look like duplicates?");
    await composer.press("Enter");
    await expect(page.getByText("Answered from")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Brightline/i).last()).toBeVisible();

    await page.goto(`${appUrl}/${northstarSlug}/admin/building-blocks`);
    await page.getByRole("button", { name: "Suspend" }).click();
    await page.goto(`${appUrl}/${northstarSlug}/admin/clients`);
    await expect(
      page.getByRole("heading", { name: "Client directory is not active" }),
    ).toBeVisible();
  });

  test("six CRM UI states", async ({ page }) => {
    await startDemo(page);
    await activateCrm(page);

    await page.goto(`${appUrl}/${northstarSlug}/admin/clients?state=empty`);
    await expect(page.getByTestId("crm-state-empty")).toBeVisible();
    await page.goto(`${appUrl}/${northstarSlug}/admin/clients?state=loading`);
    await expect(page.getByTestId("crm-state-loading")).toBeVisible();
    await page.goto(`${appUrl}/${northstarSlug}/admin/clients?state=error`);
    await expect(page.getByTestId("crm-state-error")).toBeVisible();
    await page.goto(
      `${appUrl}/${northstarSlug}/admin/clients?state=restricted`,
    );
    await expect(page.getByTestId("crm-state-restricted")).toBeVisible();
    await page.goto(`${appUrl}/${northstarSlug}/admin/clients?state=populated`);
    await expect(page.getByTestId("crm-directory")).toBeVisible();
    await page.goto(`${appUrl}/${northstarSlug}/admin/clients?state=dense`);
    await expect(page.getByTestId("crm-directory")).toBeVisible();
  });

  test("Flow CRM directory controls preserve the verified read-only dataset", async ({
    page,
  }) => {
    await startDemo(page);
    await activateCrm(page);
    await page.goto(`${appUrl}/${northstarSlug}/admin/clients`);

    const rows = page.getByTestId("crm-directory").locator("li");
    await expect(rows).toHaveCount(52);
    await expect(
      page.getByRole("heading", { name: "Companies" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create company/i }),
    ).toHaveCount(0);

    await page
      .getByRole("searchbox", { name: "Search companies" })
      .fill("Meridian");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Meridian Health");

    await page.getByRole("searchbox", { name: "Search companies" }).clear();
    await page
      .getByLabel("Relationship", { exact: true })
      .selectOption("at_risk");
    expect(await rows.count()).toBeGreaterThan(0);
    for (const label of await rows.locator(".flow-badge").allTextContents()) {
      expect(label).toBe("At Risk");
    }

    await page.getByLabel("Relationship", { exact: true }).selectOption("all");
    await page.getByLabel("Sort", { exact: true }).selectOption("health");
    const health = (
      await rows.locator(".flow-crm-health b").allTextContents()
    ).map(Number);
    expect(health).toEqual([...health].sort((left, right) => right - left));
  });

  test("axe, overflow, and themes", async ({ page }) => {
    await startDemo(page);
    await activateCrm(page);
    await page.goto(`${appUrl}/${northstarSlug}/admin/clients`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter(
      (row) => row.impact === "serious" || row.impact === "critical",
    );
    expect(serious).toEqual([]);
    for (const theme of ["light", "dark"] as const) {
      await setTheme(page, theme);
      for (const width of [1440, 768, 375]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 8,
        );
        expect(overflow, `${theme} ${width}px overflow`).toBe(false);
      }
    }
  });

  test("capture registry and CRM Core screens", async ({ page }) => {
    await startDemo(page);
    await page.goto(`${appUrl}/${northstarSlug}/admin/building-blocks`);
    await expect(page.getByTestId("bb-recommended-crm")).toBeVisible({
      timeout: 30_000,
    });
    await setTheme(page, "light");
    await capture(page, "01-registry-recommended-1440-light.png");
    await setTheme(page, "dark");
    await capture(page, "02-registry-recommended-1440-dark.png");

    await setTheme(page, "light");
    await activateCrm(page);
    await capture(page, "03-registry-active-1440-light.png");

    await page.goto(`${appUrl}/${northstarSlug}/admin/clients`);
    await expect(page.getByTestId("crm-directory")).toBeVisible();
    await capture(page, "04-directory-1440-light.png");
    await setTheme(page, "dark");
    await capture(page, "05-directory-1440-dark.png");

    await setTheme(page, "light");
    await page.goto(`${appUrl}/${northstarSlug}/admin/clients/${meridianId}`);
    await expect(page.getByTestId("crm-360")).toBeVisible();
    await capture(page, "06-client-360-1440-light.png");

    await page.goto(`${appUrl}/${northstarSlug}/admin/clients/duplicates`);
    await expect(page.getByTestId("crm-duplicates")).toBeVisible();
    await capture(page, "07-duplicates-1440-light.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${appUrl}/${northstarSlug}/admin/building-blocks`);
    await capture(page, "08-registry-375-light.png");
    await page.goto(`${appUrl}/${northstarSlug}/admin/clients`);
    await capture(page, "09-directory-375-light.png");
    await setTheme(page, "dark");
    await capture(page, "10-directory-375-dark.png");
  });
});
