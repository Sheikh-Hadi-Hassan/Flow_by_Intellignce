import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";
const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/demo-data/screenshots",
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
  await page.goto(`${appUrl}/${northstarSlug}/admin`, {
    waitUntil: "domcontentloaded",
  });
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
  await expect(page.getByTestId("workspace-header")).toBeVisible({
    timeout: 30_000,
  });
}

async function openRegistry(page: Page, extra = "") {
  await page.goto(
    `${appUrl}/${northstarSlug}/admin/settings/business${extra}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => {
    document.documentElement.setAttribute("data-theme", value);
  }, theme);
}

async function capture(page: Page, name: string, fullPage = true) {
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: join(screenshotDir, name),
    fullPage,
  });
}

async function ask(page: Page, question: string, expectText: RegExp) {
  const composer = page.getByLabel("Ask anything about your business");
  const answers = page.locator(".flow-ask-global__answer");
  const before = await answers.count();
  await composer.click();
  await composer.fill(question);
  await composer.press("Enter");
  await expect(answers).toHaveCount(before + 1, { timeout: 20_000 });
  await expect(answers.last()).toContainText(expectText);
}

async function assertDockClearance(page: Page) {
  const result = await page.evaluate(() => {
    const dock = document.querySelector<HTMLElement>("[data-testid='ask-dock']");
    const main = document.querySelector<HTMLElement>("#main-content");
    if (!dock || !main) return { ok: false, reason: "missing dock or main" };
    const dockBox = dock.getBoundingClientRect();
    const mainBox = main.getBoundingClientRect();
    const gapMainToDock = dockBox.top - mainBox.bottom;
    const audit = document.querySelector<HTMLElement>(
      "[aria-labelledby='br-audit']",
    );
    const target = audit ?? (main.lastElementChild as HTMLElement | null);
    if (!target) return { ok: false, reason: "no bottom content" };
    main.scrollTop = main.scrollHeight;
    const targetBox = target.getBoundingClientRect();
    const gap = dockBox.top - targetBox.bottom;
    return {
      ok: gapMainToDock >= 0 && gap >= 0 && mainBox.bottom <= dockBox.top + 1,
      gap,
      gapMainToDock,
      mainBottom: mainBox.bottom,
      dockTop: dockBox.top,
      targetBottom: targetBox.bottom,
    };
  });
  expect(result.ok, JSON.stringify(result)).toBe(true);
}

test.describe("DEMO-02C dock clearance and Ask state", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("dock does not cover bottom content; Ask states reconcile", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await startDemo(page);
    await openRegistry(page);
    await expect(page.getByTestId("br-state-populated")).toBeVisible({
      timeout: 30_000,
    });

    await page.getByTestId("br-locations").scrollIntoViewIfNeeded();
    await setTheme(page, "light");
    await capture(page, "13-dock-clearance-locations-1440-light.png", false);
    await setTheme(page, "dark");
    await capture(page, "14-dock-clearance-locations-1440-dark.png", false);
    await setTheme(page, "light");

    await page.locator("#br-audit").scrollIntoViewIfNeeded();
    await assertDockClearance(page);
    await capture(page, "15-dock-clearance-audit-1440-light.png", false);

    await ask(page, "Where is Northstar registered?", /DEMO-LLC-2021-08417/);
    await capture(page, "16-ask-populated-registration-1440-light.png", false);

    await openRegistry(page, "?state=partial");
    await expect(page.getByTestId("br-state-partial")).toBeVisible();
    await ask(
      page,
      "Where is Northstar registered?",
      /registration profile is incomplete/i,
    );
    await capture(page, "17-ask-missing-incomplete-1440-light.png", false);

    await openRegistry(page, "?role=employee");
    await expect(page.getByTestId("br-state-restricted")).toBeVisible();
    await ask(
      page,
      "Who can sign contracts for the company?",
      /cannot read authorised signatories|permission/i,
    );
    await capture(page, "18-ask-restricted-employee-1440-light.png", false);

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = axe.violations.filter(
      (row) => row.impact === "serious" || row.impact === "critical",
    );
    expect(serious).toEqual([]);
  });
});

test.describe("DEMO-02C mobile header and bottom", () => {
  for (const width of [375, 320] as const) {
    test(`${width} header and bottom clearance`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 812 });
      await startDemo(page);
      await openRegistry(page);
      await expect(page.getByTestId("br-state-populated")).toBeVisible({
        timeout: 30_000,
      });
      await setTheme(page, "light");
      await capture(page, `19-header-${width}-light.png`, false);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      await page.locator("#br-audit").scrollIntoViewIfNeeded();
      await assertDockClearance(page);
      await capture(page, `20-bottom-${width}-light.png`, false);
      await setTheme(page, "dark");
      await capture(page, `21-bottom-${width}-dark.png`, false);
      if (width === 375) {
        await expect(page.getByLabel("More actions")).toBeVisible();
      }
    });
  }
});

test.describe("DEMO-02C contact sheet", () => {
  test("build PO review contact sheet HTML capture", async ({ page }) => {
    const tiles = [
      "13-dock-clearance-locations-1440-light.png",
      "14-dock-clearance-locations-1440-dark.png",
      "20-bottom-375-light.png",
      "21-bottom-375-dark.png",
      "17-ask-missing-incomplete-1440-light.png",
      "18-ask-restricted-employee-1440-light.png",
      "15-dock-clearance-audit-1440-light.png",
    ];
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>DEMO-02 PO Review</title>
<style>
  body{margin:0;font:14px/1.4 system-ui;background:#111;color:#eee}
  h1{font-size:18px;padding:16px 20px;margin:0;border-bottom:1px solid #333}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px}
  figure{margin:0;background:#1a1a1a;border:1px solid #333;border-radius:8px;overflow:hidden}
  img{display:block;width:100%;height:220px;object-fit:cover;object-position:top}
  figcaption{padding:8px 10px;font-size:12px;color:#bbb}
</style></head><body>
<h1>DEMO-02 Business Registry — product-owner review (approval not recorded)</h1>
<div class="grid">
${tiles
  .map(
    (name) =>
      `<figure><img src="./${name}" alt="${name}"/><figcaption>${name}</figcaption></figure>`,
  )
  .join("\n")}
</div></body></html>`;
    const sheetHtml = join(screenshotDir, "DEMO-02-PO-REVIEW.html");
    writeFileSync(sheetHtml, html, "utf8");
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`file://${sheetHtml}`, { waitUntil: "load" });
    await page.screenshot({
      path: join(screenshotDir, "DEMO-02-PO-REVIEW.png"),
      fullPage: true,
    });
  });
});
