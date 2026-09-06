import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";
const adminUrl = `${appUrl}/${northstarSlug}/admin`;

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/mission-control/screenshots/mc-02r-04",
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

const METRIC_IDS = [
  "met-weighted-pipeline",
  "met-forecast",
  "met-receivables",
  "met-capacity",
  "met-delivery-value",
  "met-at-risk",
  "met-client-actions",
  "met-approvals",
];

async function hideChrome(page: Page) {
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
}

async function openAdmin(page: Page, query = "") {
  await page.goto(`${adminUrl}${query}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".flow-canvas, .flow-mc")).toBeVisible({
    timeout: 30_000,
  });
  await hideChrome(page);
}

test.describe("MC-02R-04 V2 default and content parity", () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  test("V2 is the default and legacy V1 is QA-only", async ({ page }) => {
    await openAdmin(page);
    await expect(page.locator(".flow-canvas")).toHaveCount(1);
    await expect(page.locator(".flow-mc-bar")).toHaveCount(0);

    await openAdmin(page, "?variant=canvas-v2");
    await expect(page.locator(".flow-canvas")).toHaveCount(1);

    await openAdmin(page, "?variant=legacy");
    await expect(page.locator(".flow-canvas")).toHaveCount(1);

    await openAdmin(page, "?variant=legacy&qa=1");
    await expect(page.locator(".flow-mc")).toHaveCount(1);
    await expect(page.locator(".flow-canvas")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "3 decisions need you" }),
    ).toBeVisible();
  });

  test("every V1 metric exists once and values match the seed", async ({
    page,
  }) => {
    await openAdmin(page);
    const found = await page.evaluate((ids) => {
      const nodes = [...document.querySelectorAll("[data-metric-id]")];
      const present = nodes.map((node) => node.getAttribute("data-metric-id"));
      return {
        present,
        unique: new Set(present).size,
        text: document.body.innerText,
      };
    }, METRIC_IDS);

    expect(found.present.sort()).toEqual([...METRIC_IDS].sort());
    expect(found.unique).toBe(METRIC_IDS.length);
    expect(found.text).toContain("$404.9K");
    expect(found.text).toContain("$312.4K");
    expect(found.text).toContain("$115.8K");
    expect(found.text).toContain("63 hours");
    expect(found.text).toMatch(/at-risk work/i);
    expect(found.text).toMatch(/approval queue/i);
    expect(found.text).toMatch(/active delivery/i);
    expect(found.text).not.toMatch(/\bbps\b|minor units|\bminutes\b/i);
    expect(found.text).toContain("Meridian Health");
    expect(found.text).toContain("Avery Brooks");
    expect(found.text).toContain("INV-2041");
    expect(found.text).toContain("Northwind Bank");
  });

  test("six states reconcile and Ask Flow follows the page", async ({
    page,
  }) => {
    await openAdmin(page, "?state=populated");
    await expect(page.locator(".flow-canvas-hero__value")).toContainText("$356,000");

    await openAdmin(page, "?state=dense");
    await expect(page.getByText(/across 4 decisions/i).first()).toBeVisible();
    await expect(page.locator(".flow-canvas-hero__value")).toContainText("$360,200");

    const composer = page.getByLabel("Ask anything about your business");
    await composer.fill("Why is $360,200 exposed?");
    await composer.press("Enter");
    await expect(page.getByText("Answered from")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/4 open/i).first()).toBeVisible();

    await openAdmin(page, "?state=empty");
    await expect(page.locator(".flow-canvas-hero__value")).toContainText(
      "Nothing needs you yet",
    );

    await openAdmin(page, "?state=error");
    await expect(page.locator(".flow-mc-state[role=alert]")).toContainText(
      "Bird Eye View could not load",
    );

    await openAdmin(page, "?state=restricted");
    await expect(page.getByRole("heading", { name: /limited to founders/i })).toBeVisible();

    await openAdmin(page, "?state=loading");
    await expect(page.locator(".flow-canvas-load")).toBeVisible();
  });

  test("decisions expand and records stay keyboard reachable", async ({
    page,
  }) => {
    await openAdmin(page);
    const first = page.locator(".flow-canvas-queue__item").first();
    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", "");
    await expect(first.getByText("What happened")).toBeVisible();
    await expect(first.getByRole("link", { name: /Deterministic scope/i })).toBeVisible();
    await first.getByRole("link", { name: /Deterministic scope/i }).focus();
    await expect(first.getByRole("link", { name: /Deterministic scope/i })).toBeFocused();
    await expect(first.getByRole("button", { name: "Approve" })).toBeVisible();
  });

  test("no horizontal overflow across required widths", async ({ page }) => {
    await openAdmin(page);
    for (const width of [1440, 1024, 768, 430, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8,
      );
      expect(overflow, `${width}px overflow`).toBe(false);
    }
  });

  test("light and dark first viewport share geometry", async ({ page }) => {
    await openAdmin(page);
    const measure = async () =>
      page.evaluate(() => {
        const hero = document.querySelector(".flow-canvas-hero__value")!.getBoundingClientRect();
        const panels = document.querySelector(".flow-canvas-panels")!.getBoundingClientRect();
        const queue = document.querySelector(".flow-canvas-queue")!.getBoundingClientRect();
        return {
          heroY: Math.round(hero.top),
          panelsY: Math.round(panels.top),
          queueY: Math.round(queue.top),
        };
      });

    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
    });
    const light = await measure();
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    const dark = await measure();
    expect(Math.abs(dark.heroY - light.heroY)).toBeLessThan(2);
    expect(Math.abs(dark.panelsY - light.panelsY)).toBeLessThan(2);
    expect(Math.abs(dark.queueY - light.queueY)).toBeLessThan(2);
    expect(light.queueY).toBeGreaterThanOrEqual(900);
  });

  test("Ask Flow answers one question per major section", async ({ page }) => {
    await openAdmin(page);
    const composer = page.getByLabel("Ask anything about your business");
    const asks: Array<{ q: string; expect: RegExp }> = [
      { q: "What needs my approval?", expect: /Meridian Health/i },
      { q: "Which projects are at risk?", expect: /Wayfinding|Brand Ops/i },
      { q: "Which invoices are overdue?", expect: /INV-2041/i },
      { q: "Who is overallocated?", expect: /Avery Brooks/i },
      { q: "What is recent operations activity?", expect: /proposal|capacity|Northwind/i },
      { q: "Who is waiting on a client questionnaire?", expect: /Kestrel/i },
    ];
    for (const row of asks) {
      await composer.fill(row.q);
      await composer.press("Enter");
      await expect(page.getByText("Answered from").last()).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(row.expect).last()).toBeVisible();
    }
  });

  test("axe has no serious or critical violations on the populated canvas", async ({
    page,
  }) => {
    await openAdmin(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (row) => row.impact === "serious" || row.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  test("capture V2 populated, dense, expanded, and mobile", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAdmin(page);
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: join(screenshotDir, "01-default-1440-light.png"),
    });
    await page.screenshot({
      path: join(screenshotDir, "01b-full-1440-light.png"),
      fullPage: true,
    });

    await page.locator(".flow-canvas-queue__item").first().locator("summary").click();
    await page.screenshot({
      path: join(screenshotDir, "05-expanded-decision.png"),
      fullPage: true,
    });

    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: join(screenshotDir, "02-default-1440-dark.png"),
    });
    await page.screenshot({
      path: join(screenshotDir, "02b-full-1440-dark.png"),
      fullPage: true,
    });

    await openAdmin(page, "?state=dense");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: join(screenshotDir, "06-dense-1440-light.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => {
      window.sessionStorage.removeItem("flow-mission-control-demo-v1");
    });
    await openAdmin(page, "?state=populated");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: join(screenshotDir, "03-375-light.png"),
    });
    await page.screenshot({
      path: join(screenshotDir, "03b-375-light-full.png"),
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: join(screenshotDir, "04-375-dark.png"),
    });
    await page.screenshot({
      path: join(screenshotDir, "04b-375-dark-full.png"),
      fullPage: true,
    });
  });
});
