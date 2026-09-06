import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * MC-02R-03A — 375×812 light mobile approval closure.
 * Does not recapture locked 1440 light or dark screenshots.
 */

test.use({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 1,
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";
const canvasUrl = `${appUrl}/${northstarSlug}/admin`;

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/mission-control/screenshots/mc-02r-03",
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

function attachDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return {
    assertClean: () => {
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

async function openCanvas(page: Page, state = "populated", qa = false) {
  const diag = attachDiagnostics(page);
  await page.addInitScript(() => {
    localStorage.setItem("flow-theme-v1", "light");
    sessionStorage.removeItem("flow-mission-control-demo-v1");
  });
  const params = new URLSearchParams();
  if (state !== "populated") params.set("state", state);
  if (qa) params.set("qa", "1");
  await page.goto(`${appUrl}/${northstarSlug}/admin?${params.toString()}`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
  await expect(page.getByTestId("global-ask-flow")).toHaveAttribute(
    "data-ask-state",
    state,
    { timeout: 15_000 },
  );
  return diag;
}

async function waitForReadyHero(page: Page) {
  await expect(page.locator(".flow-canvas-hero__value")).toBeVisible({
    timeout: 30_000,
  });
}

async function assertHeroMatchesAsk(page: Page) {
  const dock = page.getByTestId("global-ask-flow");
  const hero = (await page.locator(".flow-canvas-hero__value").innerText()).trim();
  const askExposure = (await dock.getAttribute("data-ask-exposure")) ?? "";
  const askDecisions = (await dock.getAttribute("data-ask-decisions")) ?? "";
  const label = await page.locator(".flow-canvas-hero__label").innerText();

  if (askExposure) {
    expect(hero).toBe(askExposure);
    expect(label).toContain(
      `${askDecisions} decision${askDecisions === "1" ? "" : "s"}`,
    );
  } else {
    expect(askDecisions).toBe("0");
    expect(hero).not.toMatch(/\$\d/);
  }
}

test.describe("MC-02R-03A 375×812 light mobile", () => {
  test("resting dock has no suggestions and no demo switcher", async ({
    page,
  }) => {
    const diag = await openCanvas(page);
    await waitForReadyHero(page);

    await expect(page.getByTestId("global-ask-flow")).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(0);
    await expect(page.getByTestId("mission-demo-switcher")).toHaveCount(0);
    await expect(page.getByText("Demo states")).toHaveCount(0);
    await expect(page.locator(".flow-canvas-hero__value")).toContainText(
      "356,000",
    );
    await assertHeroMatchesAsk(page);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    const path = join(screenshotDir, "ask-flow-resting-375.png");
    await page.screenshot({ path, fullPage: false });
    expect(pngSize(path)).toEqual({ width: 375, height: 812 });

    const firstViewport = join(screenshotDir, "light-375x812.png");
    await page.screenshot({ path: firstViewport, fullPage: false });
    expect(pngSize(firstViewport)).toEqual({ width: 375, height: 812 });

    diag.assertClean();
  });

  test("typing shows centred contextual suggestions aligned to the dock", async ({
    page,
  }) => {
    const diag = await openCanvas(page);
    await waitForReadyHero(page);

    const composer = page.getByLabel("Ask anything about your business");
    await composer.click();
    await expect(page.getByRole("option")).toHaveCount(0);

    await composer.fill("exposed");
    await expect(
      page.getByRole("option", { name: "Why is $356,000 exposed?" }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("option")).toHaveCount(1);
    await assertHeroMatchesAsk(page);

    const alignment = await page.evaluate(() => {
      const mid = (box: DOMRect) => box.top + box.height / 2;
      const center = (box: DOMRect) => box.left + box.width / 2;
      const tile = document
        .querySelector(".flow-ask-global__tile")!
        .getBoundingClientRect();
      const input = document
        .querySelector(".flow-ask-global__input")!
        .getBoundingClientRect();
      const tools = [
        ...document.querySelectorAll(".flow-ask-global__tool"),
      ].map((el) => el.getBoundingClientRect());
      const suggestions = document
        .querySelector(".flow-ask-global__suggestions")!
        .getBoundingClientRect();
      const dock = document
        .querySelector(".flow-ask-global__dock")!
        .getBoundingClientRect();
      return {
        tileMid: mid(tile),
        inputMid: mid(input),
        micMid: mid(tools[0]!),
        toolMid: mid(tools[1]!),
        suggestionCenter: center(suggestions),
        dockCenter: center(dock),
        toolClipped: tools.some((box) => box.right > dock.right + 1),
      };
    });

    expect(Math.abs(alignment.tileMid - alignment.inputMid)).toBeLessThan(3);
    expect(Math.abs(alignment.micMid - alignment.inputMid)).toBeLessThan(3);
    expect(Math.abs(alignment.toolMid - alignment.inputMid)).toBeLessThan(3);
    expect(
      Math.abs(alignment.suggestionCenter - alignment.dockCenter),
    ).toBeLessThan(8);
    expect(alignment.toolClipped).toBe(false);

    const path = join(screenshotDir, "ask-flow-typing-375.png");
    await page.screenshot({ path, fullPage: false });
    expect(pngSize(path)).toEqual({ width: 375, height: 812 });

    await composer.fill("");
    await expect(page.getByRole("option")).toHaveCount(0);

    diag.assertClean();
  });

  test("submit opens a full-screen answer; follow-up can suggest again", async ({
    page,
  }) => {
    const diag = await openCanvas(page);
    await waitForReadyHero(page);

    const composer = page.getByLabel("Ask anything about your business");
    await composer.fill("exposed");
    await expect(
      page.getByRole("option", { name: "Why is $356,000 exposed?" }),
    ).toBeVisible({ timeout: 5_000 });
    await composer.press("Enter");

    await expect(page.locator(".flow-ask-global--full")).toBeVisible();
    await expect(page.getByText("Answered from")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("global-ask-flow")).toContainText("3 open");
    await expect(page.getByTestId("global-ask-flow")).not.toContainText(
      "360,200",
    );
    await assertHeroMatchesAsk(page);

    const submitted = join(screenshotDir, "ask-flow-submitted-375.png");
    await page.screenshot({ path: submitted, fullPage: false });
    expect(pngSize(submitted)).toEqual({ width: 375, height: 812 });

    await composer.fill("invoice");
    await expect(
      page.getByRole("option", { name: "Which invoices are overdue?" }),
    ).toBeVisible({ timeout: 5_000 });

    diag.assertClean();
  });

  test("counter-question opens full screen with a choice", async ({ page }) => {
    const diag = await openCanvas(page);
    await waitForReadyHero(page);

    const composer = page.getByLabel("Ask anything about your business");
    await composer.fill("Move this project to another employee.");
    await composer.press("Enter");

    await expect(page.locator(".flow-ask-global--full")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Protect the deadline" }),
    ).toBeVisible({ timeout: 10_000 });

    const path = join(screenshotDir, "ask-flow-counter-375.png");
    await page.screenshot({ path, fullPage: false });
    expect(pngSize(path)).toEqual({ width: 375, height: 812 });

    diag.assertClean();
  });

  test("populated and dense stay internally consistent", async ({ page }) => {
    await openCanvas(page, "populated");
    await waitForReadyHero(page);
    await expect(page.locator(".flow-canvas-hero__value")).toContainText(
      "$356,000",
    );
    await expect(page.locator(".flow-canvas-queue__count")).toContainText(
      "3 open",
    );
    await expect(page.getByTestId("global-ask-flow")).toHaveAttribute(
      "data-ask-exposure",
      "$356,000",
    );
    await expect(page.getByTestId("global-ask-flow")).toHaveAttribute(
      "data-ask-decisions",
      "3",
    );
    await assertHeroMatchesAsk(page);
    const populated = join(screenshotDir, "state-populated-375.png");
    await page.screenshot({ path: populated, fullPage: false });
    expect(pngSize(populated)).toEqual({ width: 375, height: 812 });

    await openCanvas(page, "dense");
    await waitForReadyHero(page);
    await expect(page.locator(".flow-canvas-hero__value")).toContainText(
      "$360,200",
    );
    await expect(page.locator(".flow-canvas-queue__count")).toContainText(
      "4 open",
    );
    await expect(page.getByTestId("global-ask-flow")).toHaveAttribute(
      "data-ask-exposure",
      "$360,200",
    );
    await expect(page.getByTestId("global-ask-flow")).toHaveAttribute(
      "data-ask-decisions",
      "4",
    );
    await assertHeroMatchesAsk(page);

    const composer = page.getByLabel("Ask anything about your business");
    await composer.fill("exposed");
    await expect(
      page.getByRole("option", { name: "Why is $360,200 exposed?" }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("global-ask-flow")).not.toContainText(
      "356,000",
    );
    await expect(page.getByTestId("global-ask-flow")).not.toContainText("356K");

    const dense = join(screenshotDir, "state-dense-375.png");
    await page.screenshot({ path: dense, fullPage: false });
    expect(pngSize(dense)).toEqual({ width: 375, height: 812 });
  });

  test("demo switcher is hidden unless qa=1", async ({ page }) => {
    await openCanvas(page, "empty");
    await expect(page.getByTestId("mission-demo-switcher")).toHaveCount(0);
    await expect(page.locator(".flow-canvas-hero__value")).toContainText(
      "Nothing needs you yet",
    );
    await assertHeroMatchesAsk(page);

    await openCanvas(page, "populated", true);
    await waitForReadyHero(page);
    await expect(page.getByTestId("mission-demo-switcher")).toBeVisible();
    await expect(page.getByText("Demo states")).toBeVisible();
  });

  test("all six UI states render at 375 without overflow", async ({ page }) => {
    const cases: { state: string; ready: () => Promise<void> }[] = [
      {
        state: "populated",
        ready: async () => {
          await expect(page.locator(".flow-canvas-hero__value")).toContainText(
            "356,000",
          );
          await assertHeroMatchesAsk(page);
        },
      },
      {
        state: "empty",
        ready: async () => {
          await expect(page.locator(".flow-canvas-hero__value")).toContainText(
            "Nothing needs you yet",
          );
          await assertHeroMatchesAsk(page);
        },
      },
      {
        state: "loading",
        ready: async () => {
          await expect(page.getByText("Loading Bird Eye View")).toBeVisible();
          await expect(page.getByTestId("global-ask-flow")).toHaveAttribute(
            "data-ask-decisions",
            "0",
          );
        },
      },
      {
        state: "error",
        ready: async () => {
          await expect(
            page.getByRole("heading", {
              name: "Bird Eye View could not load",
            }),
          ).toBeVisible();
        },
      },
      {
        state: "restricted",
        ready: async () => {
          await expect(
            page.getByRole("heading", {
              name: "Bird Eye View is limited to founders and operations leads",
            }),
          ).toBeVisible();
        },
      },
      {
        state: "dense",
        ready: async () => {
          await expect(page.locator(".flow-canvas-hero__value")).toContainText(
            "$360,200",
          );
          await expect(page.locator(".flow-canvas-queue__count")).toContainText(
            "4 open",
          );
          await assertHeroMatchesAsk(page);
        },
      },
    ];

    for (const row of cases) {
      await openCanvas(page, row.state);
      await row.ready();
      await expect(page.getByTestId("mission-demo-switcher")).toHaveCount(0);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, row.state).toBe(false);
      await page.screenshot({
        path: join(screenshotDir, `state-${row.state}-375.png`),
        fullPage: false,
      });
    }
  });

  test("axe has no serious or critical violations at 375 light", async ({
    page,
  }) => {
    await openCanvas(page);
    await waitForReadyHero(page);
    const results = await new AxeBuilder({ page })
      .include(".flow-canvas")
      .include("[data-testid='global-ask-flow']")
      .include("[data-testid='workspace-header']")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});

test.describe("MC-02R-03A 1440 lock", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  test("approved desktop geometry is unchanged", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("flow-theme-v1", "light");
      sessionStorage.removeItem("flow-mission-control-demo-v1");
    });
    await page.goto(canvasUrl, { waitUntil: "networkidle" });
    await expect(page.locator(".flow-canvas-hero__value")).toBeVisible({
      timeout: 30_000,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: HIDE_DEV_CHROME });

    const layout = await page.evaluate(() => {
      const queue = document.querySelector(".flow-canvas-queue")!;
      return {
        queueTop: queue.getBoundingClientRect().top,
        plotHeight: document
          .querySelector(".flow-canvas-field__plot")!
          .getBoundingClientRect().height,
      };
    });

    expect(layout.queueTop).toBeGreaterThanOrEqual(900);
    expect(layout.plotHeight).toBeCloseTo(292, 0);
    await expect(page.getByTestId("mission-demo-switcher")).toHaveCount(0);
  });
});
