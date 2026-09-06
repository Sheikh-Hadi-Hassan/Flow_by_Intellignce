import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * DEMO-02D — exact viewport PO evidence (no full-page scaling / object-fit crop).
 */

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

type FrameMeta = {
  readonly file: string;
  readonly viewport: string;
  readonly theme: string;
  readonly role: string;
  readonly state: string;
  readonly note: string;
};

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

async function captureViewport(page: Page, file: string) {
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: join(screenshotDir, file),
    fullPage: false,
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

test.describe("DEMO-02D PO viewport evidence", () => {
  test("capture twelve exact viewports and contact sheet", async ({ page }) => {
    test.setTimeout(240_000);
    const frames: FrameMeta[] = [];

    await page.setViewportSize({ width: 1440, height: 900 });
    await startDemo(page);
    await openRegistry(page);
    await expect(page.getByTestId("br-state-populated")).toBeVisible({
      timeout: 30_000,
    });

    await setTheme(page, "light");
    await page.evaluate(() => {
      const main = document.querySelector("#main-content");
      if (main) main.scrollTop = 0;
    });
    await captureViewport(page, "d02d-01-1440-populated-light-top.png");
    frames.push({
      file: "d02d-01-1440-populated-light-top.png",
      viewport: "1440×900",
      theme: "light",
      role: "founder",
      state: "populated",
      note: "Top viewport",
    });

    await setTheme(page, "dark");
    await captureViewport(page, "d02d-02-1440-populated-dark-top.png");
    frames.push({
      file: "d02d-02-1440-populated-dark-top.png",
      viewport: "1440×900",
      theme: "dark",
      role: "founder",
      state: "populated",
      note: "Top viewport",
    });

    await setTheme(page, "light");
    await page.getByTestId("br-locations").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("ask-dock")).toBeVisible();
    await captureViewport(page, "d02d-03-1440-mid-dock-clear.png");
    frames.push({
      file: "d02d-03-1440-mid-dock-clear.png",
      viewport: "1440×900",
      theme: "light",
      role: "founder",
      state: "populated",
      note: "Mid-scroll + resting dock",
    });

    await page.locator("#br-audit").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("ask-dock")).toBeVisible();
    await captureViewport(page, "d02d-04-1440-audit-dock.png");
    frames.push({
      file: "d02d-04-1440-audit-dock.png",
      viewport: "1440×900",
      theme: "light",
      role: "founder",
      state: "populated",
      note: "Audit + resting dock",
    });

    await openRegistry(page, "?state=partial");
    await expect(page.getByTestId("br-state-partial")).toBeVisible();
    await ask(
      page,
      "Where is Northstar registered?",
      /registration profile is incomplete/i,
    );
    await captureViewport(page, "d02d-05-1440-incomplete-ask.png");
    frames.push({
      file: "d02d-05-1440-incomplete-ask.png",
      viewport: "1440×900",
      theme: "light",
      role: "founder",
      state: "incomplete",
      note: "Ask incomplete answer",
    });

    await openRegistry(page, "?role=employee");
    await expect(page.getByTestId("br-state-restricted")).toBeVisible();
    await ask(
      page,
      "Who can sign contracts for the company?",
      /cannot read authorised signatories|permission/i,
    );
    await captureViewport(page, "d02d-06-1440-restricted-ask.png");
    frames.push({
      file: "d02d-06-1440-restricted-ask.png",
      viewport: "1440×900",
      theme: "light",
      role: "employee",
      state: "restricted",
      note: "Ask permission denied",
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await openRegistry(page);
    await expect(page.getByTestId("br-state-populated")).toBeVisible({
      timeout: 30_000,
    });
    await setTheme(page, "light");
    await page.evaluate(() => {
      const main = document.querySelector("#main-content");
      if (main) main.scrollTop = 0;
    });
    await expect(
      page.locator(".flow-ws-header__wordmark"),
    ).toBeHidden();
    await expect(page.locator(".flow-ws-header__centre")).toBeHidden();
    await captureViewport(page, "d02d-07-375-mobile-top.png");
    frames.push({
      file: "d02d-07-375-mobile-top.png",
      viewport: "375×812",
      theme: "light",
      role: "founder",
      state: "populated",
      note: "Mobile top",
    });

    await page.getByTestId("br-locations").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("ask-dock")).toBeVisible();
    await captureViewport(page, "d02d-08-375-mobile-mid-dock.png");
    frames.push({
      file: "d02d-08-375-mobile-mid-dock.png",
      viewport: "375×812",
      theme: "light",
      role: "founder",
      state: "populated",
      note: "Mobile mid + dock",
    });

    await page.locator("#br-audit").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("ask-dock")).toBeVisible();
    await captureViewport(page, "d02d-09-375-mobile-bottom-dock.png");
    frames.push({
      file: "d02d-09-375-mobile-bottom-dock.png",
      viewport: "375×812",
      theme: "light",
      role: "founder",
      state: "populated",
      note: "Mobile bottom + dock",
    });

    const composer = page.getByLabel("Ask anything about your business");
    await composer.click();
    await composer.fill("Where is Northstar registered?");
    await composer.press("Enter");
    await expect(page.locator(".flow-ask-global__answer").last()).toBeVisible({
      timeout: 20_000,
    });
    await captureViewport(page, "d02d-10-375-ask-expanded.png");
    frames.push({
      file: "d02d-10-375-ask-expanded.png",
      viewport: "375×812",
      theme: "light",
      role: "founder",
      state: "populated",
      note: "Expanded Ask Flow",
    });

    await page.setViewportSize({ width: 320, height: 812 });
    await openRegistry(page);
    await expect(page.getByTestId("br-state-populated")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator(".flow-ws-header__wordmark")).toBeHidden();
    await expect(page.getByTestId("ask-dock")).toBeVisible();
    const overflow320 = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow320).toBeLessThanOrEqual(1);
    await captureViewport(page, "d02d-11-320-header-dock.png");
    frames.push({
      file: "d02d-11-320-header-dock.png",
      viewport: "320×812",
      theme: "light",
      role: "founder",
      state: "populated",
      note: "Header + dock",
    });

    await page.setViewportSize({ width: 430, height: 932 });
    await openRegistry(page);
    await expect(page.getByTestId("br-state-populated")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator(".flow-ws-header__wordmark")).toBeHidden();
    await expect(page.getByTestId("ask-dock")).toBeVisible();
    const overflow430 = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow430).toBeLessThanOrEqual(1);
    await captureViewport(page, "d02d-12-430-header-dock.png");
    frames.push({
      file: "d02d-12-430-header-dock.png",
      viewport: "430×932",
      theme: "light",
      role: "founder",
      state: "populated",
      note: "Header + dock",
    });

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>DEMO-02D PO Review</title>
<style>
  body{margin:0;font:13px/1.4 ui-sans-serif,system-ui;background:#0f0f0f;color:#eee}
  h1{font-size:18px;padding:16px 20px;margin:0;border-bottom:1px solid #333}
  p.meta{margin:0;padding:8px 20px 0;color:#9a9a9a}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:16px 20px 24px}
  figure{margin:0;background:#171717;border:1px solid #333;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
  .frame{height:280px;display:grid;place-items:center;background:#0b0b0b;padding:8px}
  img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}
  figcaption{padding:10px 12px;font-size:12px;color:#cfcfcf;border-top:1px solid #2a2a2a}
  figcaption strong{display:block;color:#fff;margin-bottom:4px}
</style></head><body>
<h1>DEMO-02D Business Registry — product-owner review</h1>
<p class="meta">Approval not recorded. Exact viewport captures; images use object-fit: contain (no crop).</p>
<div class="grid">
${frames
  .map(
    (frame) => `<figure>
  <div class="frame"><img src="./${frame.file}" alt="${frame.file}"/></div>
  <figcaption>
    <strong>${frame.file}</strong>
    viewport ${frame.viewport} · theme ${frame.theme} · role ${frame.role} · state ${frame.state}<br/>
    ${frame.note}
  </figcaption>
</figure>`,
  )
  .join("\n")}
</div></body></html>`;

    const sheetHtml = join(screenshotDir, "DEMO-02-PO-REVIEW.html");
    writeFileSync(sheetHtml, html, "utf8");
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto(`file://${sheetHtml}`, { waitUntil: "load" });
    await page.screenshot({
      path: join(screenshotDir, "DEMO-02-PO-REVIEW.png"),
      fullPage: true,
    });
  });
});
