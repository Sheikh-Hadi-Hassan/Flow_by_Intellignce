import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
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
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
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

async function capture(page: Page, name: string) {
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
  await page.mouse.move(0, 0);
  await page.screenshot({ path: join(screenshotDir, name), fullPage: true });
}

async function ask(page: Page, question: string) {
  const composer = page.getByLabel("Ask anything about your business");
  const answers = page.locator(".flow-ask-global__answer");
  const before = await answers.count();
  await composer.click();
  await composer.fill(question);
  await composer.press("Enter");
  await expect(page.getByTestId("ask-turn").last()).toBeVisible({
    timeout: 20_000,
  });
  await expect(answers).toHaveCount(before + 1, { timeout: 20_000 });
  await expect(answers.last()).toContainText(/fictional|permission|incomplete/i);
}

test.describe("DEMO-02 Business Registry", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("populated registry, edits, states, Ask Flow, axe", async ({ page }) => {
    await startDemo(page);
    await openRegistry(page);
    await expect(page.getByTestId("br-state-populated")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Fictional demonstration company")).toBeVisible();
    await expect(page.getByText("Northstar Creative LLC", { exact: true })).toBeVisible();
    await expect(page.getByText("DEMO-LLC-2021-08417", { exact: true })).toBeVisible();
    await expect(page.getByText("Declared target").first()).toBeVisible();
    await expect(page.getByText("Computed actual").first()).toBeVisible();
    await expect(page.getByText("Chicago headquarters", { exact: true })).toBeVisible();
    await expect(page.getByText("Remote operations", { exact: true })).toBeVisible();
    await setTheme(page, "light");
    await capture(page, "01-overview-1440-light.png");
    await setTheme(page, "dark");
    await capture(page, "02-overview-1440-dark.png");
    await setTheme(page, "light");

    await page.getByRole("button", { name: "Edit identity" }).click();
    await expect(page.getByTestId("br-identity-edit")).toBeVisible();
    await capture(page, "03-identity-edit-1440-light.png");
    await page.getByRole("button", { name: "Save identity" }).click();

    await page.getByTestId("br-locations").scrollIntoViewIfNeeded();
    await capture(page, "04-locations-1440-light.png");
    await page.getByTestId("br-documents").scrollIntoViewIfNeeded();
    await capture(page, "05-registration-documents-1440-light.png");

    await openRegistry(page, "?state=partial");
    await expect(page.getByTestId("br-state-partial")).toBeVisible();
    await capture(page, "06-missing-information-1440-light.png");

    await openRegistry(page, "?role=employee");
    await expect(page.getByTestId("br-state-restricted")).toBeVisible();
    await expect(page.getByText("DEMO-36-0008417")).toHaveCount(0);
    await capture(page, "07-restricted-employee-1440-light.png");

    await openRegistry(page);
    await ask(page, "Where is Northstar registered?");
    await expect(
      page.getByRole("link", { name: "DEMO-LLC-2021-08417" }),
    ).toBeVisible();
    await capture(page, "08-ask-registered-1440-light.png");
    await ask(page, "Which business documents need renewal?");
    await capture(page, "09-ask-renewals-1440-light.png");
    await ask(page, "Who can sign contracts for the company?");
    await expect(page.getByText(/Maya Chen/).first()).toBeVisible();
    await capture(page, "10-ask-signatories-1440-light.png");

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = axe.violations.filter(
      (row) => row.impact === "serious" || row.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  test("six UI states exist", async ({ page }) => {
    await startDemo(page);
    for (const state of [
      "empty",
      "loading",
      "populated",
      "partial",
      "error",
      "restricted",
      "dense",
    ]) {
      await openRegistry(page, `?state=${state}`);
      await expect(page.getByTestId(`br-state-${state === "dense" ? "populated" : state}`)).toBeVisible();
    }
  });
});

test.describe("DEMO-02 Business Registry mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("375 light and dark have no horizontal overflow", async ({ page }) => {
    await startDemo(page);
    await openRegistry(page);
    await expect(page.getByTestId("br-state-populated")).toBeVisible({
      timeout: 30_000,
    });
    await setTheme(page, "light");
    await capture(page, "11-overview-375-light.png");
    const overflowLight = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflowLight).toBeLessThanOrEqual(1);
    await setTheme(page, "dark");
    await capture(page, "12-overview-375-dark.png");
    const overflowDark = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflowDark).toBeLessThanOrEqual(1);
  });
});
