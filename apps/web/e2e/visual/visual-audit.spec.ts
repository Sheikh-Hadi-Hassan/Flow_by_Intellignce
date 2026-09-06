import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";

const evidenceDir = join(
  process.cwd(),
  "../../docs/quality/evidence/unapproved-current-state",
);
mkdirSync(evidenceDir, { recursive: true });

async function startNorthstarDemo(page: import("@playwright/test").Page) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
}

const routes = [
  { name: "mission-control", path: `/${northstarSlug}/admin` },
  { name: "pipeline", path: `/${northstarSlug}/admin/lifecycle/pipeline` },
  { name: "my-work", path: `/${northstarSlug}/work` },
  { name: "team", path: `/${northstarSlug}/admin/team` },
  { name: "reports", path: `/${northstarSlug}/admin/lifecycle/reporting` },
];

test.describe("visual audit evidence", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });

  for (const route of routes) {
    test(`capture unapproved current state: ${route.name}`, async ({ page }) => {
      await startNorthstarDemo(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${appUrl}${route.path}`, { waitUntil: "networkidle" });
      await page.screenshot({
        path: join(evidenceDir, `${route.name}-1440-light.png`),
        fullPage: true,
      });
      expect(await page.title()).toBeTruthy();
    });
  }

  test("capture mobile mission control", async ({ page }) => {
    await startNorthstarDemo(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${appUrl}/${northstarSlug}/admin`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: join(evidenceDir, "mission-control-375-light.png"),
      fullPage: true,
    });
  });
});
