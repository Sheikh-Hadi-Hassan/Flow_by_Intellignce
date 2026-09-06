import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/application-shell/screenshots/shell-01",
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

const ROUTES = [
  { name: "Bird Eye View", path: `/${northstarSlug}/admin`, id: "mission" },
  { name: "Clients", path: `/${northstarSlug}/admin/clients`, id: "clients" },
  { name: "Pipeline", path: `/${northstarSlug}/admin/opportunities`, id: "pipeline" },
  { name: "Delivery", path: `/${northstarSlug}/admin/lifecycle/projects`, id: "delivery" },
  { name: "Team", path: `/${northstarSlug}/admin/team`, id: "team" },
] as const;

async function startDemo(page: Page) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
  await expect(page.getByTestId("workspace-header")).toBeVisible({
    timeout: 30_000,
  });
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((value) => {
    document.documentElement.setAttribute("data-theme", value);
    window.localStorage.setItem("flow-theme-v1", value);
  }, theme);
}

async function capture(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.screenshot({ path: join(screenshotDir, name) });
}

test.describe("SHELL-01 global navigation", () => {
  test("centred header coexists with Ask Flow on desktop", async ({ page }) => {
    await startDemo(page);
    await setTheme(page, "light");

    await expect(page.getByTestId("workspace-header")).toHaveCount(1);
    await expect(page.getByTestId("global-ask-flow")).toHaveCount(1);
    await expect(page.getByText("Northstar Creative")).toBeVisible();
    await capture(page, "01-light-header.png");

    const geometry = await page.evaluate(() => {
      const header = document.querySelector("[data-testid='workspace-header']");
      const nav = header?.querySelector("nav");
      if (!header || !nav) return null;
      const headerBox = header.getBoundingClientRect();
      const navBox = nav.getBoundingClientRect();
      return {
        headerCenter: headerBox.left + headerBox.width / 2,
        navCenter: navBox.left + navBox.width / 2,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(Math.abs(geometry!.headerCenter - geometry!.navCenter)).toBeLessThan(8);
    expect(geometry!.overflow).toBe(false);

    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("[data-theme='dark']")).toHaveCount(1);
    await capture(page, "02-dark-header.png");
    await page.getByRole("button", { name: "Switch to light mode" }).click();

    for (const route of ROUTES) {
      await page.goto(`${appUrl}${route.path}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("workspace-header")).toHaveCount(1);
      await expect(
        page.getByRole("navigation", { name: "Workspace" }).getByRole("link", {
          name: route.name,
          exact: true,
        }),
      ).toHaveAttribute("aria-current", "page");
    }
    await capture(page, "03-active-team.png");

    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByLabel("Search workspace")).toBeVisible();
    await capture(page, "04-search-expanded.png");
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Search workspace")).toHaveCount(0);

    await page.getByRole("button", { name: "Quick Create" }).click();
    await expect(page.getByRole("menuitem", { name: "Client" })).toBeVisible();
    await capture(page, "05-quick-create.png");

    const composer = page.getByLabel("Ask anything about your business");
    await composer.fill("capacity");
    await expect(
      page.getByRole("option", { name: "Who can take the Vantage work?" }),
    ).toBeVisible();
    await composer.press("Enter");
    await expect(page.getByText("Answered from")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("link", { name: "Delivery", exact: true }).click();
    await expect(page.getByText("Answered from")).toBeVisible();
    await capture(page, "06-header-with-dock.png");

    const axe = await new AxeBuilder({ page })
      .include("[data-testid='workspace-header']")
      .analyze();
    const serious = axe.violations.filter(
      (row) => row.impact === "serious" || row.impact === "critical",
    );
    expect(serious).toEqual([]);
  });
});
