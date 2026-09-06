import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * MC-02R-RESET-01 — 1440×900 light only, deviceScaleFactor 1.
 */

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";
const canvasUrl = `${appUrl}/${northstarSlug}/admin`;

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/mission-control/screenshots/mc-02r-reset-01",
);
mkdirSync(screenshotDir, { recursive: true });

const HIDE_DEV_CHROME = `
  nextjs-portal,
  [data-next-badge-root],
  [data-nextjs-toast],
  [data-nextjs-dev-overlay],
  #__next-build-watcher {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

function attachDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const failedCss: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    const url = response.url();
    const isCss =
      response.request().resourceType() === "stylesheet" ||
      /\.css(\?|$)/.test(url);
    if (isCss && (response.status() === 404 || response.status() >= 500)) {
      failedCss.push(`${response.status()} ${url}`);
    }
  });

  return {
    assertClean: () => {
      expect(failedCss).toEqual([]);
      expect(
        consoleErrors.filter(
          (row) =>
            !row.includes("favicon") &&
            !row.includes("Download the React DevTools") &&
            !/401.*Unauthorized/i.test(row) &&
            !/Failed to load resource:.*404/i.test(row),
        ),
      ).toEqual([]);
    },
  };
}

async function openCanvas(page: Page) {
  const diag = attachDiagnostics(page);
  await page.goto(canvasUrl, { waitUntil: "networkidle" });
  await expect(page.locator(".flow-canvas-hero__value")).toBeVisible({
    timeout: 30_000,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
  return diag;
}

function pngSize(path: string): { width: number; height: number } {
  const buffer = readFileSync(path);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test.describe("MC-02R-RESET-01 canvas fidelity", () => {
  test("every rendered canvas class has a corresponding style", async ({
    page,
  }) => {
    await openCanvas(page);

    const coverage = await page.evaluate(() => {
      const used = new Set<string>();
      for (const el of document.querySelectorAll(".flow-canvas, .flow-canvas *")) {
        for (const name of el.classList) {
          if (name.startsWith("flow-canvas") || name.startsWith("flow-ask") || name === "tabular-nums" || name === "skip-link" || name === "sr-only") {
            used.add(name);
          }
        }
      }

      const styled = new Set<string>();
      for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of rules) {
          const text = rule.cssText;
          for (const name of used) {
            if (text.includes(`.${name}`)) styled.add(name);
          }
        }
      }

      const missing = [...used].filter((name) => !styled.has(name) && name !== "tabular-nums");
      return { used: [...used].sort(), missing };
    });

    expect(coverage.used.length).toBeGreaterThan(20);
    expect(coverage.missing).toEqual([]);
  });

  test("Space Grotesk is loaded and applied on the canvas", async ({ page }) => {
    await openCanvas(page);
    const type = await page.evaluate(() => {
      const families = [...document.fonts].map((font) => font.family);
      const canvas = document.querySelector(".flow-canvas")!;
      const hero = document.querySelector(".flow-canvas-hero__value")!;
      return {
        families,
        canvasFont: getComputedStyle(canvas).fontFamily,
        heroFont: getComputedStyle(hero).fontFamily,
      };
    });

    expect(type.families.some((family) => /Space Grotesk/i.test(family))).toBe(
      true,
    );
    expect(type.canvasFont).toMatch(/Space Grotesk/i);
    expect(type.heroFont).toMatch(/Space Grotesk/i);
    expect(type.canvasFont).not.toMatch(/^ui-sans-serif/);
  });

  test("1440×900 first viewport: decisions below the fold, no overlays", async ({
    page,
  }) => {
    const diag = await openCanvas(page);

    const layout = await page.evaluate(() => {
      const queue = document.querySelector(".flow-canvas-queue")!;
      const dock = document.querySelector(".flow-canvas-dock")!;
      const panels = document.querySelector(".flow-canvas-panels")!;
      const months = document.querySelector(".flow-canvas-field__months")!;
      const overlay = document.querySelector("nextjs-portal, [data-next-badge-root]");
      const dockBox = dock.getBoundingClientRect();
      const dockHit = {
        left: dockBox.left,
        right: dockBox.right,
        top: dockBox.top,
        bottom: dockBox.bottom + 16,
      };
      const hits: string[] = [];
      const protectedSelectors = [
        ".flow-canvas-microlabel",
        ".flow-canvas-panel__value",
        ".flow-canvas-panel__delta",
        ".flow-canvas-panel__age-label",
        ".flow-canvas-panel__age-value",
        ".flow-canvas-panel__chart",
        ".flow-canvas-panel__ageing",
        ".flow-canvas-panel__gauge-wrap",
        ".flow-canvas-panel__gauge-value",
      ];
      const overlaps = (
        a: { left: number; right: number; top: number; bottom: number },
        b: { left: number; right: number; top: number; bottom: number },
      ) =>
        !(
          a.right <= b.left ||
          a.left >= b.right ||
          a.bottom <= b.top ||
          a.top >= b.bottom
        );
      for (const selector of protectedSelectors) {
        for (const el of document.querySelectorAll(selector)) {
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;
          if (overlaps(box, dockHit)) {
            hits.push(
              `${selector}:${(el.textContent ?? "").trim().slice(0, 40)}`,
            );
          }
        }
      }
      return {
        queueTop: queue.getBoundingClientRect().top,
        dockTop: dockBox.top,
        dockBottom: dockBox.bottom,
        dockCenter: dockBox.left + dockBox.width / 2,
        panelsTop: panels.getBoundingClientRect().top,
        monthsBottom: months.getBoundingClientRect().bottom,
        overlayVisible: overlay
          ? getComputedStyle(overlay).display !== "none"
          : false,
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        navDisplay: getComputedStyle(
          document.querySelector(".flow-canvas-head__nav")!,
        ).display,
        plotHeight: document
          .querySelector(".flow-canvas-field__plot")!
          .getBoundingClientRect().height,
        headHeight: document
          .querySelector(".flow-canvas-head")!
          .getBoundingClientRect().height,
        occluded: hits,
      };
    });

    expect(layout.queueTop).toBeGreaterThanOrEqual(900);
    expect(layout.overlayVisible).toBe(false);
    expect(layout.overflow).toBe(false);
    expect(["flex", "grid"]).toContain(layout.navDisplay);
    expect(layout.plotHeight).toBeLessThanOrEqual(340);
    expect(layout.headHeight).toBeLessThanOrEqual(52);
    expect(layout.dockTop).toBeGreaterThanOrEqual(layout.monthsBottom - 2);
    expect(layout.dockBottom).toBeGreaterThan(layout.panelsTop);
    expect(layout.dockBottom - layout.panelsTop).toBeGreaterThan(48);
    expect(layout.occluded).toEqual([]);
    expect(Math.abs(layout.dockCenter - 720)).toBeLessThan(40);
    await expect(page.locator(".flow-canvas-dock__chip")).toHaveCount(2);
    await expect(page.locator(".flow-canvas-field__note")).not.toContainText(
      "$356K",
    );
    await expect(page.locator(".flow-canvas-field__note")).toContainText(
      "3 decisions opened",
    );

    diag.assertClean();

    const finalPath = join(screenshotDir, "final-1440x900.png");
    await page.screenshot({
      path: finalPath,
      fullPage: false,
    });
    expect(pngSize(finalPath)).toEqual({ width: 1440, height: 900 });
  });

  test("Ask Flow chips, voice, palette, expansion and fullscreen", async ({
    page,
  }) => {
    const diag = await openCanvas(page);

    const dock = page.locator(".flow-canvas-dock");
    await expect(dock.locator(".flow-canvas-dock__chip")).toHaveCount(2);

    await dock.screenshot({
      path: join(screenshotDir, "ask-flow-resting.png"),
    });

    await page.getByRole("button", { name: "Why is $356K exposed?" }).click();
    await expect(
      page.locator(".flow-ask-response").getByText("Answered from"),
    ).toBeVisible();
    await expect(page.locator(".flow-canvas-dock__panel-tools")).toContainText(
      "Pipeline · Delivery · Receivables · Capacity",
    );

    const panel = page.locator(".flow-canvas-dock__panel");
    await panel.evaluate((el) => {
      el.scrollTop = 0;
    });
    const panelBox = await panel.boundingBox();
    const barBox = await page.locator(".flow-canvas-dock__bar").boundingBox();
    expect(panelBox!.y).toBeGreaterThanOrEqual(48);
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(900);
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(barBox!.y + 8);

    const receipt = page.getByRole("link", { name: "Founder approval queue" });
    await expect(receipt).toBeVisible();
    await receipt.focus();
    await expect(receipt).toBeFocused();

    await page.getByRole("button", { name: "Browse available actions" }).focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Open Ask Flow full screen" }),
    ).toBeFocused();

    const expandedClip = await page.evaluate(() => {
      const dockEl = document.querySelector(".flow-canvas-dock")!;
      const panelEl = document.querySelector(".flow-canvas-dock__panel")!;
      panelEl.scrollTop = 0;
      const a = dockEl.getBoundingClientRect();
      const b = panelEl.getBoundingClientRect();
      const x = Math.max(Math.min(a.left, b.left) - 12, 0);
      const y = Math.max(Math.min(a.top, b.top) - 12, 0);
      const right = Math.min(Math.max(a.right, b.right) + 12, 1440);
      const bottom = Math.min(Math.max(a.bottom, b.bottom) + 12, 900);
      return { x, y, width: right - x, height: bottom - y };
    });
    expect(expandedClip.height).toBeGreaterThan(180);
    await page.screenshot({
      path: join(screenshotDir, "ask-flow-expanded.png"),
      clip: expandedClip,
    });

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Why is $356K exposed?" }),
    ).toBeFocused();

    await page.getByRole("button", { name: "Ask anything or search" }).click();
    await expect(panel).toBeVisible();
    await page.getByRole("button", { name: "Collapse Ask Flow" }).click();
    await expect(panel).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Ask anything or search" }),
    ).toBeFocused();

    await page.getByRole("button", { name: "Why is $356K exposed?" }).click();
    await expect(panel).toBeVisible();

    await page.getByRole("button", { name: "Ask with voice" }).click();
    await expect(
      page.getByRole("button", { name: "Stop listening" }).first(),
    ).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Browse available actions" }).click();
    await expect(panel).toBeHidden();

    await page.getByRole("button", { name: "Ask anything or search" }).click();
    await expect(
      page.getByRole("textbox", { name: "Ask anything or search" }),
    ).toBeFocused();

    await page.getByRole("button", { name: /Why is the Meridian proposal/ }).click();
    await expect(
      page.locator(".flow-ask-response").getByText("Answered from"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Open Ask Flow full screen" }).click();
    await expect(dock).toHaveClass(/flow-canvas-dock--full/);
    const fullBox = await panel.boundingBox();
    expect(fullBox!.y).toBeGreaterThanOrEqual(0);
    expect(fullBox!.y + fullBox!.height).toBeLessThanOrEqual(900);

    diag.assertClean();
  });

  test("the default Bird Eye View route is the V2 canvas", async ({ page }) => {
    await page.goto(`${appUrl}/${northstarSlug}/admin`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator(".flow-canvas-hero__value")).toContainText(
      "356,000",
      { timeout: 30_000 },
    );
    await expect(page.locator(".flow-canvas")).toHaveCount(1);
    await expect(page.locator(".flow-mc-bar")).toHaveCount(0);
  });

  test("side-by-side reference comparison plate", async ({ page }) => {
    const root = join(process.cwd(), "../..");
    const toDataUrl = (rel: string, mime: string) => {
      const buffer = readFileSync(join(root, rel));
      return `data:${mime};base64,${buffer.toString("base64")}`;
    };

    const html = `<!doctype html>
<html>
  <head>
    <style>
      html, body { margin: 0; background: #111; color: #ececec; font: 13px/1.35 ui-sans-serif, sans-serif; }
      .plate { box-sizing: border-box; width: 1800px; height: 1400px; padding: 28px 32px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto 1fr auto; gap: 18px 28px; }
      h1 { grid-column: 1 / -1; margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
      figure { margin: 0; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      figcaption { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #a3a3a3; }
      img { display: block; width: 100%; height: auto; background: #fff; border-radius: 8px; }
      .canvas img { height: 760px; object-fit: contain; object-position: top; }
      .docks { display: flex; flex-direction: column; gap: 12px; }
      .docks img { width: auto; max-width: 100%; }
    </style>
  </head>
  <body>
    <div class="plate">
      <h1>MC-02R-RESET-01 — canvas-v2 versus visual reference · 1440×900 · light · Space Grotesk</h1>
      <figure class="canvas">
        <figcaption>Ledgerix dashboard reference</figcaption>
        <img alt="Ledgerix reference" src="${toDataUrl("docs/product-design/references/mission-control/ledgerix-dashboard-reference.png", "image/png")}">
      </figure>
      <figure class="canvas">
        <figcaption>canvas-v2 final-1440x900.png</figcaption>
        <img alt="Canvas capture" src="${toDataUrl("docs/verification/mission-control/screenshots/mc-02r-reset-01/final-1440x900.png", "image/png")}">
      </figure>
      <figure>
        <figcaption>Ask Flow command-dock reference</figcaption>
        <img alt="Dock reference" src="${toDataUrl("docs/product-design/references/mission-control/ask-flow-command-dock-reference.png", "image/jpeg")}">
      </figure>
      <figure class="docks">
        <figcaption>Ask Flow resting and expanded</figcaption>
        <img alt="Ask Flow resting" src="${toDataUrl("docs/verification/mission-control/screenshots/mc-02r-reset-01/ask-flow-resting.png", "image/png")}">
        <img alt="Ask Flow expanded" src="${toDataUrl("docs/verification/mission-control/screenshots/mc-02r-reset-01/ask-flow-expanded.png", "image/png")}">
      </figure>
    </div>
  </body>
</html>`;

    await page.setViewportSize({ width: 1800, height: 1400 });
    await page.setContent(html, { waitUntil: "load" });
    const comparisonPath = join(screenshotDir, "reference-comparison.png");
    await page.screenshot({
      path: comparisonPath,
      fullPage: false,
    });
    expect(pngSize(comparisonPath)).toEqual({ width: 1800, height: 1400 });
  });
});
