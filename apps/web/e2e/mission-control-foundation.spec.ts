import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/mission-control/screenshots/mc-02r-04",
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
            // Unauthenticated demo — no Supabase session is expected.
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

/**
 * Viewport capture keeps the docked command bar in its real position; a
 * full-page capture would float it over the middle of the image.
 */
async function captureViewport(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(screenshotDir, name) });
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((value) => {
    document.documentElement.setAttribute("data-theme", value);
    window.localStorage.setItem("flow-theme-v1", value);
  }, theme);
}

/**
 * No retry on purpose. WorkspaceGate seeds the demo on arrival, so a click that
 * lands before hydration must still reach Mission Control.
 */
async function startDemo(page: Page) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  const link = page.getByRole("link", { name: "Explore the Northstar demo" });
  await link.waitFor({ state: "visible" });
  await link.click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
  await expect(page.locator(".flow-canvas-hero__value")).toContainText(
    "$356,000",
    { timeout: 30_000 },
  );
}

async function openState(page: Page, state: string) {
  await page.goto(`${appUrl}/${northstarSlug}/admin?state=${state}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("banner")).toBeVisible({ timeout: 30_000 });
}

test.describe("MC-01 + MC-02 — Mission Control foundation", () => {
  test("populated screen at 1440 and 375 in light and dark", async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await startDemo(page);

    await expect(page.locator(".flow-canvas-hero__value")).toContainText("$356,000");
    await expect(page.getByText(/across 3 decisions/i).first()).toBeVisible();
    await expect(page.getByText(/2% under your margin floor/i).first()).toBeVisible();

    const header = page.getByTestId("workspace-header");
    await expect(header.getByText("Northstar Creative", { exact: true })).toBeVisible();
    await expect(header.getByRole("navigation", { name: "Workspace" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Search" })).toBeVisible();
    await expect(header.getByRole("button", { name: /Notifications/ })).toBeVisible();
    await expect(header.getByRole("button", { name: /Switch to/ })).toBeVisible();

    const signals = page.getByRole("region", { name: "Operating signals" });
    await expect(signals.getByText("Weighted pipeline")).toBeVisible();
    await expect(signals.getByText("$404.9K")).toBeVisible();
    await expect(signals.getByText("Forecast revenue")).toBeVisible();
    await expect(signals.getByText("Receivables")).toBeVisible();
    await expect(signals.getByText("Available capacity")).toBeVisible();
    await expect(signals.getByText("Active delivery")).toHaveCount(0);

    await expect(
      page.getByRole("heading", { name: "Decisions waiting on you" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Operating watch" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Cash and commitments" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "People and capacity" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Business activity" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent operations" }),
    ).toBeVisible();

    await expect(page.getByLabel("Ask anything about your business")).toBeVisible();

    await setTheme(page, "light");
    await captureViewport(page, "01-mission-control-1440-light.png");
    await capture(page, "01b-mission-control-1440-light-full.png");

    await setTheme(page, "dark");
    await captureViewport(page, "02-mission-control-1440-dark.png");
    await capture(page, "02b-mission-control-1440-dark-full.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await setTheme(page, "light");
    await expect(page.locator(".flow-canvas-hero__value")).toContainText("$356,000");
    await captureViewport(page, "03-mission-control-375-light.png");
    await capture(page, "03b-mission-control-375-light-full.png");

    await setTheme(page, "dark");
    await captureViewport(page, "04-mission-control-375-dark.png");
    await capture(page, "04b-mission-control-375-dark-full.png");

    diag.assertClean();
  });

  test("no serious axe violations in light or dark at either width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await startDemo(page);

    for (const size of [
      { width: 1440, height: 900 },
      { width: 375, height: 812 },
    ]) {
      for (const theme of ["light", "dark"] as const) {
        await page.setViewportSize(size);
        await setTheme(page, theme);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const serious = results.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
        );
        expect(
          serious,
          `${size.width}px ${theme}: ${JSON.stringify(serious, null, 2)}`,
        ).toEqual([]);
      }
    }
  });

  test("keyboard reaches the instrument bar, field and dock", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await startDemo(page);

    // Tab order is walked rather than asserted by index, because the Next.js
    // dev overlay injects its own first tab stop outside the app.
    const reachable: string[] = [];
    for (let index = 0; index < 30; index += 1) {
      await page.keyboard.press("Tab");
      reachable.push(
        await page.evaluate(
          () =>
            document.activeElement?.getAttribute("aria-label") ??
            document.activeElement?.textContent?.trim().slice(0, 40) ??
            "",
        ),
      );
    }

    expect(reachable.join("|")).toContain("Skip to Bird Eye View");
    expect(reachable.some((label) => label.includes("Notifications"))).toBe(
      true,
    );

    await page.getByLabel("Ask anything about your business").focus();
    await expect(
      page.getByLabel("Ask anything about your business"),
    ).toBeFocused();
  });

  test("Ask Flow dock expands to a conversation with sourced answers", async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await startDemo(page);

    const composer = page.getByLabel("Ask anything about your business");
    await composer.fill("What needs my approval?");
    await composer.press("Enter");
    await expect(page.getByText("Answered from")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Meridian Health/i).first()).toBeVisible();

    await captureViewport(page, "05-ask-flow-dock-expanded.png");

    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Ask anything about your business")).toBeVisible();

    diag.assertClean();
  });

  test("seeded states render and survive a reload", async ({ page }) => {
    const diag = attachDiagnostics(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await startDemo(page);

    await openState(page, "empty");
    await expect(page.locator(".flow-canvas-hero__value")).toContainText(
      "Nothing needs you yet",
    );
    await capture(page, "06-state-empty.png");

    await openState(page, "error");
    await expect(page.locator(".flow-mc-state[role=alert]")).toContainText(
      "Bird Eye View could not load",
    );
    await capture(page, "07-state-error.png");

    await openState(page, "restricted");
    await expect(
      page.getByRole("heading", { name: /limited to founders/i }),
    ).toBeVisible();
    await capture(page, "08-state-restricted.png");

    await openState(page, "dense");
    await expect(page.getByText(/across 4 decisions/i).first()).toBeVisible();
    await expect(page.locator(".flow-canvas-hero__value")).toContainText("$360,200");
    await capture(page, "09-state-dense.png");

    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(/across 4 decisions/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const keys = await page.evaluate(() => Object.keys(window.sessionStorage));
    expect(keys).toContain("flow-mission-control-demo-v1");

    await openState(page, "populated");
    await expect(page.locator(".flow-canvas-hero__value")).toContainText("$356,000");

    diag.assertClean();
  });
});
