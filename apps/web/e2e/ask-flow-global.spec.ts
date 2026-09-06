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
  "../../docs/verification/ask-flow/screenshots/af-01",
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
  await expect(page.getByTestId("workspace-header")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("global-ask-flow")).toBeVisible();
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

test.describe("AF-01 global Ask Flow dock", () => {
  test("interaction contract on Mission Control and lifecycle routes", async ({
    page,
  }) => {
    await startDemo(page);
    await setTheme(page, "light");

    await expect(page.getByTestId("global-ask-flow")).toHaveCount(1);
    await expect(page.getByTestId("workspace-header")).toHaveCount(1);
    await expect(page.getByRole("option")).toHaveCount(0);
    await capture(page, "01-resting-dock.png");

    const composer = page.getByLabel("Ask anything about your business");
    await composer.click();
    await expect(page.getByRole("option")).toHaveCount(0);
    await composer.fill("invoice");
    await expect(
      page.getByRole("option", { name: "Which invoices are overdue?" }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("option")).toHaveCount(2);
    await capture(page, "02-typing-suggestions.png");

    await composer.fill("");
    await expect(page.getByRole("option")).toHaveCount(0);

    await composer.fill("invoice");
    await expect(
      page.getByRole("option", { name: "Which invoices are overdue?" }),
    ).toBeVisible();
    await composer.press("Enter");
    await page.waitForTimeout(80);
    await capture(page, "03-streaming.png");
    await expect(page.getByText("Answered from")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-ask-phase="streaming"]')).toHaveCount(0);
    await capture(page, "04-answered-evidence.png");

    await page.getByRole("button", { name: "Edit question" }).click();
    await page
      .getByLabel("Edit previous question")
      .fill("Who can take the Vantage work?");
    await page.getByRole("button", { name: "Resubmit" }).click();
    await expect(page.getByRole("button", { name: "Version 2" })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Version 1" }).click();
    await capture(page, "06-edited-versions.png");

    await composer.fill("Move this project to another employee.");
    await composer.press("Enter");
    await expect(
      page.getByRole("button", { name: "Protect the deadline" }),
    ).toBeVisible({ timeout: 10_000 });
    await capture(page, "05-counter-question.png");
    await page.getByRole("button", { name: "Protect the deadline" }).click();
    await expect(
      page.getByTestId("global-ask-flow").getByText(/Protecting the deadline/),
    ).toBeVisible({ timeout: 10_000 });

    const conversationId = await page.getByTestId("global-ask-flow").getAttribute("data-ask-route");
    await page.getByRole("link", { name: "Team", exact: true }).click();
    await page.waitForURL(new RegExp(`/${northstarSlug}/admin/team`));
    await expect(page.getByTestId("global-ask-flow")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Version 2" }).first()).toBeVisible();
    await expect(page.getByTestId("global-ask-flow")).toHaveAttribute(
      "data-ask-route",
      new RegExp(`/${northstarSlug}/admin/team`),
    );
    expect(conversationId).not.toEqual(`/${northstarSlug}/admin/team`);
    await capture(page, "07-after-navigation.png");

    await page.getByRole("button", { name: "Open Ask Flow full screen" }).click();
    await expect(page.locator(".flow-ask-global--full")).toBeVisible();
    await expect(page.getByRole("button", { name: "Version 2" }).first()).toBeVisible();
    await capture(page, "08-fullscreen.png");
    await page.getByRole("button", { name: "Exit full screen" }).click();

    for (const path of [
      `/${northstarSlug}/admin/clients/ns-client-acme`,
      `/${northstarSlug}/admin/opportunities/ns-opp-acme-brand`,
      `/${northstarSlug}/admin/lifecycle/projects`,
    ]) {
      await page.goto(`${appUrl}${path}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("global-ask-flow")).toHaveCount(1);
      await expect(page.getByTestId("workspace-header")).toHaveCount(1);
    }

    await page.goto(`${appUrl}/sign-in`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("global-ask-flow")).toHaveCount(0);

    await setTheme(page, "dark");
    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("global-ask-flow")).toBeVisible();
    await capture(page, "09-dark-resting.png");

    const axe = await new AxeBuilder({ page })
      .include("[data-testid='global-ask-flow']")
      .include("[data-testid='workspace-header']")
      .analyze();
    const serious = axe.violations.filter(
      (row) => row.impact === "serious" || row.impact === "critical",
    );
    expect(serious).toEqual([]);
  });
});
