import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";
const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/ask-flow/screenshots/af-01r",
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

async function hideChrome(page: Page) {
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
}

async function startDemo(page: Page) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
  await expect(page.getByTestId("workspace-header")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("ask-dock")).toBeVisible();
  await hideChrome(page);
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
  await page.screenshot({ path: join(screenshotDir, name) });
}

function composer(page: Page) {
  return page.getByLabel("Ask anything about your business");
}

async function dockGeometry(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-testid='global-ask-flow']");
    const dock = document.querySelector("[data-testid='ask-dock']");
    const input = document.querySelector(".flow-ask-global__input");
    const main = document.querySelector(".flow-shell__main");
    if (!(root instanceof HTMLElement) || !(dock instanceof HTMLElement) || !(input instanceof HTMLElement)) {
      throw new Error("dock missing");
    }
    const dockBox = dock.getBoundingClientRect();
    const inputBox = input.getBoundingClientRect();
    const styles = getComputedStyle(dock);
    const row = getComputedStyle(dock.querySelector(".flow-ask-global__row")!);
    return {
      width: dockBox.width,
      height: dockBox.height,
      bottom: window.innerHeight - dockBox.bottom,
      left: dockBox.left,
      dockCenter: dockBox.left + dockBox.width / 2,
      inputCenter: inputBox.left + inputBox.width / 2,
      viewportCenter: window.innerWidth / 2,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      padding: styles.paddingTop,
      radius: styles.borderRadius,
      columns: row.gridTemplateColumns,
      // Clearance is reserved via margin-bottom in workspace-header.css, so
      // measure the geometric gap instead of a single CSS property.
      mainClearance: main
        ? window.innerHeight - main.getBoundingClientRect().bottom
        : 0,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
}

test.describe("AF-01R dock visual refinement", () => {
  test("desktop geometry, suggestions, keyboard, and captures", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await startDemo(page);
    await setTheme(page, "light");

    const resting = await dockGeometry(page);
    expect(resting.width).toBeLessThanOrEqual(820);
    expect(Math.round(resting.height)).toBe(72);
    expect(resting.bottom).toBeGreaterThanOrEqual(16);
    expect(Math.abs(resting.dockCenter - resting.viewportCenter)).toBeLessThan(2);
    expect(Math.abs(resting.inputCenter - resting.dockCenter)).toBeLessThan(2);
    expect(resting.overflowX).toBe(false);
    expect(resting.columns).toMatch(/112px/);
    expect(resting.mainClearance).toBeGreaterThanOrEqual(88);
    await expect(page.getByRole("option")).toHaveCount(0);
    await expect(page.locator(".flow-ask-global__panel")).toHaveCount(0);
    await capture(page, "01-1440-light-resting.png");

    const field = composer(page);
    await field.click();
    await expect(page.getByRole("option")).toHaveCount(0);
    await expect(field).toBeFocused();
    await capture(page, "02-1440-light-focused.png");

    await field.fill("invoice");
    await expect(
      page.getByRole("option", { name: "Which invoices are overdue?" }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("option")).toHaveCount(2);
    const suggestionGap = await page.evaluate(() => {
      const list = document.querySelector(".flow-ask-global__suggestions");
      const dock = document.querySelector("[data-testid='ask-dock']");
      if (!(list instanceof HTMLElement) || !(dock instanceof HTMLElement)) {
        return { gap: 0, overflow: false, listCenter: 0, dockCenter: 0 };
      }
      const listBox = list.getBoundingClientRect();
      const dockBox = dock.getBoundingClientRect();
      return {
        gap: dockBox.top - listBox.bottom,
        overflow: listBox.right > window.innerWidth || listBox.left < 0,
        listCenter: listBox.left + listBox.width / 2,
        dockCenter: dockBox.left + dockBox.width / 2,
      };
    });
    expect(suggestionGap.gap).toBeGreaterThanOrEqual(8);
    expect(suggestionGap.overflow).toBe(false);
    expect(Math.abs(suggestionGap.listCenter - suggestionGap.dockCenter)).toBeLessThan(8);
    await capture(page, "03-1440-light-typing.png");

    await field.fill("");
    await expect(page.getByRole("option")).toHaveCount(0);

    await field.fill("invoice");
    await expect(page.getByRole("option", { name: "Which invoices are overdue?" })).toBeVisible();
    await field.press("Enter");
    await expect(page.getByText("Answered from")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("option")).toHaveCount(0);
    const open = await dockGeometry(page);
    expect(Math.abs(open.width - resting.width)).toBeLessThan(1);
    await capture(page, "04-1440-light-submitted.png");

    await page.getByRole("link", { name: "Team", exact: true }).click();
    await page.waitForURL(new RegExp(`/${northstarSlug}/admin/team`));
    await expect(page.getByText("Answered from")).toBeVisible();

    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await hideChrome(page);
    await setTheme(page, "dark");
    await expect(page.getByTestId("ask-dock")).toBeVisible();
    const darkRest = await dockGeometry(page);
    expect(darkRest.width).toBeCloseTo(resting.width, 0);
    expect(Math.round(darkRest.height)).toBe(72);
    expect(darkRest.columns).toBe(resting.columns);
    await capture(page, "05-1440-dark-resting.png");

    await composer(page).fill("invoice");
    await expect(
      page.getByRole("option", { name: "Which invoices are overdue?" }),
    ).toBeVisible();
    await composer(page).press("Enter");
    await expect(page.getByText("Answered from").first()).toBeVisible({
      timeout: 15_000,
    });
    await capture(page, "06-1440-dark-submitted.png");

    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await hideChrome(page);
    await setTheme(page, "light");
    await page.getByRole("button", { name: "Ask Flow" }).hover();
    // Tooltip fades in (--duration-enter); poll until the transition settles.
    await expect
      .poll(() =>
        page
          .locator('[data-tooltip="Ask Flow"]')
          .evaluate((el) => getComputedStyle(el, "::after").opacity),
      )
      .not.toBe("0");
    await page.getByRole("button", { name: "Voice input" }).hover();
    expect(
      await page
        .locator('[data-tooltip="Voice input"]')
        .evaluate((el) => getComputedStyle(el, "::after").content),
    ).toContain("Voice input");
    await page.getByRole("button", { name: "Actions" }).hover();
    expect(
      await page
        .locator('[data-tooltip="Actions"]')
        .evaluate((el) => getComputedStyle(el, "::after").content),
    ).toContain("Actions");

    await page.getByRole("button", { name: "Ask Flow" }).focus();
    await page.keyboard.press("Tab");
    await expect(composer(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Voice input" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Actions" })).toBeFocused();

    const axe = await new AxeBuilder({ page })
      .include("[data-testid='global-ask-flow']")
      .analyze();
    const serious = axe.violations.filter(
      (row) => row.impact === "serious" || row.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  test("mobile geometry and captures", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await startDemo(page);
    await setTheme(page, "light");

    const resting = await dockGeometry(page);
    expect(Math.round(resting.width)).toBe(359);
    expect(Math.round(resting.height)).toBe(64);
    expect(resting.bottom).toBeGreaterThanOrEqual(8);
    expect(Math.abs(resting.inputCenter - resting.dockCenter)).toBeLessThan(2);
    expect(resting.overflowX).toBe(false);
    await capture(page, "07-375-light-resting.png");

    await composer(page).fill("invoice");
    await expect(
      page.getByRole("option", { name: "Which invoices are overdue?" }),
    ).toBeVisible({ timeout: 5_000 });
    await capture(page, "08-375-light-typing.png");

    await composer(page).press("Enter");
    await expect(page.locator(".flow-ask-global--full")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Answered from")).toBeVisible();
    await capture(page, "09-375-light-submitted.png");

    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "domcontentloaded",
    });
    await hideChrome(page);
    await setTheme(page, "dark");
    await expect(page.getByTestId("ask-dock")).toBeVisible();
    const dark = await dockGeometry(page);
    expect(Math.round(dark.height)).toBe(64);
    expect(Math.round(dark.width)).toBe(359);
    await capture(page, "10-375-dark-resting.png");
  });
});
