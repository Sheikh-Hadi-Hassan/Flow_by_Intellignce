import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated accessibility checks using axe-core.
 * Does NOT replace manual keyboard and screen-reader review.
 */
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";

async function startNorthstarDemo(page: Page) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
}

const routes = [
  { name: "Bird Eye View", path: `/${northstarSlug}/admin` },
  { name: "Pipeline", path: `/${northstarSlug}/admin/lifecycle/pipeline` },
  { name: "Delivery", path: `/${northstarSlug}/admin/lifecycle/delivery` },
  { name: "Team", path: `/${northstarSlug}/admin/team` },
  { name: "My Work", path: `/${northstarSlug}/work` },
  { name: "Reports", path: `/${northstarSlug}/admin/lifecycle/reporting` },
];

test.describe("accessibility — Northstar routes", () => {
  test.beforeEach(async ({ page }) => {
    await startNorthstarDemo(page);
  });

  for (const route of routes) {
    test(`${route.name} has no serious or critical axe violations`, async ({ page }) => {
      await page.goto(`${appUrl}${route.path}`, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  }
});

test.describe("accessibility — Ask Flow drawer", () => {
  test("Ask Flow drawer has no serious or critical violations when open", async ({
    page,
  }) => {
    await startNorthstarDemo(page);
    const askButton = page.getByRole("button", { name: /ask flow/i });
    await expect(askButton).toBeVisible();
    await askButton.click();
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
