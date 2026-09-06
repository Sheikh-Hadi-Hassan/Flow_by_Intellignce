import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * MC-02R-02 — 1440×900 dark desktop translation.
 * Does not recapture the locked light RESET-01 screenshots.
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
  "../../docs/verification/mission-control/screenshots/mc-02r-02",
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

function pngSize(path: string): { width: number; height: number } {
  const buffer = readFileSync(path);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function hideChrome(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
}

async function openCanvas(page: Page, theme: "light" | "dark") {
  await page.addInitScript((value) => {
    localStorage.setItem("flow-theme-v1", value);
    (window as Window & { __flowCanvasBgs?: string[] }).__flowCanvasBgs = [];
    const probe = () => {
      const el = document.querySelector(".flow-canvas");
      if (el) {
        (window as Window & { __flowCanvasBgs?: string[] }).__flowCanvasBgs!.push(
          getComputedStyle(el).backgroundColor,
        );
      }
      const samples =
        (window as Window & { __flowCanvasBgs?: string[] }).__flowCanvasBgs ?? [];
      if (samples.length < 90) requestAnimationFrame(probe);
    };
    requestAnimationFrame(probe);
  }, theme);

  await page.goto(canvasUrl, { waitUntil: "networkidle" });
  await expect(page.locator(".flow-canvas-hero__value")).toBeVisible({
    timeout: 30_000,
  });
  await hideChrome(page);
}

function layoutScript() {
  return () => {
    const queue = document.querySelector(".flow-canvas-queue")!;
    const dock = document.querySelector(".flow-canvas-dock")!;
    const panels = document.querySelector(".flow-canvas-panels")!;
    const months = document.querySelector(".flow-canvas-field__months")!;
    const overlay = document.querySelector(
      "nextjs-portal, [data-next-badge-root]",
    );
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
          hits.push(`${selector}:${(el.textContent ?? "").trim().slice(0, 40)}`);
        }
      }
    }
    return {
      theme: document.documentElement.getAttribute("data-theme"),
      queueTop: queue.getBoundingClientRect().top,
      dockTop: dockBox.top,
      dockBottom: dockBox.bottom,
      panelsTop: panels.getBoundingClientRect().top,
      monthsBottom: months.getBoundingClientRect().bottom,
      overlayVisible: overlay
        ? getComputedStyle(overlay).display !== "none"
        : false,
      plotHeight: document
        .querySelector(".flow-canvas-field__plot")!
        .getBoundingClientRect().height,
      headHeight: document
        .querySelector(".flow-canvas-head")!
        .getBoundingClientRect().height,
      occluded: hits,
      paper: getComputedStyle(document.querySelector(".flow-canvas")!)
        .backgroundColor,
    };
  };
}

test.describe("MC-02R-02 dark desktop", () => {
  test("1440×900 dark first viewport, no overlays, no occlusion", async ({
    page,
  }) => {
    await openCanvas(page, "dark");

    const layout = await page.evaluate(layoutScript());
    expect(layout.theme).toBe("dark");
    expect(layout.queueTop).toBeGreaterThanOrEqual(900);
    expect(layout.overlayVisible).toBe(false);
    expect(layout.plotHeight).toBeLessThanOrEqual(340);
    expect(layout.headHeight).toBeLessThanOrEqual(52);
    expect(layout.dockTop).toBeGreaterThanOrEqual(layout.monthsBottom - 2);
    expect(layout.dockBottom).toBeGreaterThan(layout.panelsTop);
    expect(layout.occluded).toEqual([]);

    const paper = await page.evaluate(() => {
      const bg = getComputedStyle(document.querySelector(".flow-canvas")!)
        .backgroundColor;
      const nums = bg.match(/[\d.]+/g)?.map(Number) ?? [];
      return { bg, r: nums[0] ?? 255, g: nums[1] ?? 255, b: nums[2] ?? 255 };
    });
    expect(paper.r).toBeLessThan(40);
    expect(paper.g).toBeLessThan(40);
    expect(paper.b).toBeLessThan(40);

    const flashes = await page.evaluate(() => {
      const samples =
        (window as Window & { __flowCanvasBgs?: string[] }).__flowCanvasBgs ??
        [];
      return samples.filter((value) => {
        const nums = value.match(/[\d.]+/g)?.map(Number) ?? [];
        const r = nums[0] ?? 255;
        const g = nums[1] ?? 255;
        const b = nums[2] ?? 255;
        return r > 180 && g > 180 && b > 180;
      });
    });
    expect(flashes).toEqual([]);

    const path = join(screenshotDir, "dark-1440x900.png");
    await page.screenshot({ path, fullPage: false });
    expect(pngSize(path)).toEqual({ width: 1440, height: 900 });
  });

  test("dark Ask Flow resting, expanded, tooltip; WCAG samples", async ({
    page,
  }) => {
    await openCanvas(page, "dark");

    const dock = page.locator(".flow-canvas-dock");
    await dock.screenshot({
      path: join(screenshotDir, "ask-flow-resting-dark.png"),
    });

    const plot = page.locator(".flow-canvas-field__plot");
    const plotBox = await plot.boundingBox();
    await plot.hover({
      position: { x: Math.floor((plotBox?.width ?? 400) * 0.72), y: 80 },
    });
    await expect(page.locator(".flow-canvas-field__readout")).toBeVisible();
    await page.locator(".flow-canvas-field__readout").screenshot({
      path: join(screenshotDir, "chart-tooltip-dark.png"),
    });

    const contrast = await page.evaluate(() => {
      const lum = (rgb: number[]) => {
        const f = (c: number) => {
          const x = c / 255;
          return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(rgb[0]!) + 0.7152 * f(rgb[1]!) + 0.0722 * f(rgb[2]!);
      };
      const parse = (value: string) =>
        (value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]).slice(0, 3);
      const ratio = (fg: string, bg: string) => {
        const a = lum(parse(fg));
        const b = lum(parse(bg));
        const hi = Math.max(a, b);
        const lo = Math.min(a, b);
        return (hi + 0.05) / (lo + 0.05);
      };
      const canvas = document.querySelector(".flow-canvas")!;
      const paper = getComputedStyle(canvas).backgroundColor;
      const hero = getComputedStyle(
        document.querySelector(".flow-canvas-hero__value")!,
      );
      const muted = getComputedStyle(
        document.querySelector(".flow-canvas-hero__label")!,
      );
      const label = getComputedStyle(
        document.querySelector(".flow-canvas-microlabel")!,
      );
      const axis = getComputedStyle(
        document.querySelector(".flow-canvas-field__axis span")!,
      );
      const chip = document.querySelector(".flow-canvas-dock__chip")!;
      const prompt = getComputedStyle(
        document.querySelector(".flow-canvas-dock__prompt")!,
      );
      const housing = getComputedStyle(
        document.querySelector(".flow-canvas-dock__housing")!,
      );
      return {
        hero: ratio(hero.color, paper),
        muted: ratio(muted.color, paper),
        microlabel: ratio(label.color, paper),
        axis: ratio(axis.color, paper),
        chip: ratio(getComputedStyle(chip).color, getComputedStyle(chip).backgroundColor),
        prompt: ratio(prompt.color, housing.backgroundColor),
      };
    });

    expect(contrast.hero).toBeGreaterThanOrEqual(4.5);
    expect(contrast.muted).toBeGreaterThanOrEqual(4.5);
    expect(contrast.microlabel).toBeGreaterThanOrEqual(4.5);
    expect(contrast.axis).toBeGreaterThanOrEqual(4.5);
    expect(contrast.chip).toBeGreaterThanOrEqual(4.5);
    expect(contrast.prompt).toBeGreaterThanOrEqual(4.5);

    await page.getByRole("button", { name: "Why is $356K exposed?" }).click();
    await expect(
      page.locator(".flow-ask-response").getByText("Answered from"),
    ).toBeVisible();

    const receipt = page.getByRole("link", { name: "Founder approval queue" });
    await expect(receipt).toBeVisible();
    const receiptContrast = await receipt.evaluate((el) => {
      const lum = (rgb: number[]) => {
        const f = (c: number) => {
          const x = c / 255;
          return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(rgb[0]!) + 0.7152 * f(rgb[1]!) + 0.0722 * f(rgb[2]!);
      };
      const parse = (value: string) =>
        (value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]).slice(0, 3);
      const fg = getComputedStyle(el).color;
      const bg = getComputedStyle(
        el.closest(".flow-ask-response") ?? el,
      ).backgroundColor;
      const a = lum(parse(fg));
      const b = lum(parse(bg));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(receiptContrast).toBeGreaterThanOrEqual(4.5);

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
    await page.screenshot({
      path: join(screenshotDir, "ask-flow-expanded-dark.png"),
      clip: expandedClip,
    });

    const tile = await page
      .locator(".flow-canvas-dock__tile")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const tileNums = tile.match(/[\d.]+/g)?.map(Number) ?? [];
    expect(tileNums[1] ?? 0).toBeGreaterThan(80);
  });

  test("axe has no serious or critical violations in dark canvas-v2", async ({
    page,
  }) => {
    await openCanvas(page, "dark");
    const results = await new AxeBuilder({ page })
      .include(".flow-canvas")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test("theme toggle persists and light layout stays locked", async ({
    page,
  }) => {
    await page.goto(canvasUrl, { waitUntil: "networkidle" });
    await expect(page.locator(".flow-canvas-hero__value")).toBeVisible({
      timeout: 30_000,
    });
    await page.evaluate(() => {
      localStorage.setItem("flow-theme-v1", "light");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".flow-canvas-hero__value")).toBeVisible({
      timeout: 30_000,
    });
    await hideChrome(page);

    const lightLayout = await page.evaluate(layoutScript());
    expect(lightLayout.theme).toBe("light");
    expect(lightLayout.queueTop).toBeGreaterThanOrEqual(900);
    expect(lightLayout.occluded).toEqual([]);
    expect(lightLayout.plotHeight).toBeLessThanOrEqual(340);
    expect(lightLayout.dockTop).toBeGreaterThanOrEqual(
      lightLayout.monthsBottom - 2,
    );

    const lightPath = join(screenshotDir, "light-regression-1440x900.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    expect(pngSize(lightPath)).toEqual({ width: 1440, height: 900 });

    const lightPaper = await page.evaluate(() => {
      const raw = getComputedStyle(document.querySelector(".flow-canvas")!)
        .backgroundColor;
      const nums = raw.match(/[\d.]+/g)?.map(Number) ?? [];
      const r = nums[0] ?? 0;
      return r > 1 ? r : r * 255;
    });
    expect(lightPaper).toBeGreaterThan(200);

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.getAttribute("data-theme")),
      )
      .toBe("dark");

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".flow-canvas-hero__value")).toBeVisible({
      timeout: 30_000,
    });
    await hideChrome(page);
    expect(
      await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      ),
    ).toBe("dark");
    expect(await page.evaluate(() => localStorage.getItem("flow-theme-v1"))).toBe(
      "dark",
    );

    const darkAfter = await page.evaluate(layoutScript());
    expect(darkAfter.plotHeight).toBe(lightLayout.plotHeight);
    expect(darkAfter.headHeight).toBe(lightLayout.headHeight);
    expect(Math.abs(darkAfter.dockTop - lightLayout.dockTop)).toBeLessThan(2);
  });

  test("light/dark side-by-side comparison plate", async ({ page }) => {
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
      .plate { box-sizing: border-box; width: 1800px; height: 1400px; padding: 28px 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; }
      h1 { grid-column: 1 / -1; margin: 0; font-size: 18px; font-weight: 600; }
      figure { margin: 0; min-height: 0; }
      figcaption { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #a3a3a3; margin-bottom: 8px; }
      img { display: block; width: 100%; height: 620px; object-fit: contain; object-position: top; background: #000; border-radius: 8px; }
    </style>
  </head>
  <body>
    <div class="plate">
      <h1>MC-02R-02 — light (locked) versus dark desktop · 1440×900</h1>
      <figure>
        <figcaption>Locked light final-1440x900</figcaption>
        <img alt="Light" src="${toDataUrl("docs/verification/mission-control/screenshots/mc-02r-reset-01/final-1440x900.png", "image/png")}">
      </figure>
      <figure>
        <figcaption>Dark dark-1440x900</figcaption>
        <img alt="Dark" src="${toDataUrl("docs/verification/mission-control/screenshots/mc-02r-02/dark-1440x900.png", "image/png")}">
      </figure>
    </div>
  </body>
</html>`;

    await page.setViewportSize({ width: 1800, height: 1400 });
    await page.setContent(html, { waitUntil: "load" });
    const comparisonPath = join(screenshotDir, "light-dark-comparison.png");
    await page.screenshot({ path: comparisonPath, fullPage: false });
    expect(pngSize(comparisonPath)).toEqual({ width: 1800, height: 1400 });
  });
});
