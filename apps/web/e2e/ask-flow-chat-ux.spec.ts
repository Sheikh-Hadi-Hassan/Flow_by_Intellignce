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
const FALLBACK_MARK =
  "I do not have a sourced match for that exact question yet";

const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/ask-flow/screenshots/chat-ux-01",
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

async function capture(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    const panel = document.querySelector(".flow-ask-global__panel");
    if (panel) panel.scrollTop = panel.scrollHeight;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.screenshot({ path: join(screenshotDir, name) });
}

async function ask(page: Page, question: string) {
  const composer = page.getByLabel("Ask anything about your business");
  await composer.click();
  await composer.fill(question);
  await composer.press("Enter");
  await expect(page.locator('[data-ask-phase="answered"], [data-ask-phase="asking_clarification"], [data-ask-phase="error"], [data-ask-phase="model_unavailable"], [data-ask-phase="permission_denied"], [data-ask-phase="tool_failure"]')).toBeVisible({
    timeout: 20_000,
  });
}

function latestTurn(page: Page) {
  return page.getByTestId("ask-turn").last();
}

test.describe("CHAT-UX-01 smart answers, widgets, and language mirroring", () => {
  test("overdue invoices answer renders metrics and entity widgets", async ({
    page,
  }) => {
    await startDemo(page);

    await ask(page, "Show all overdue invoices");
    const dock = page.getByTestId("global-ask-flow");
    const turn = latestTurn(page);

    await expect(turn).toHaveAttribute("data-ask-tool", "list_overdue_invoices");
    await expect(turn.locator('[data-testid="ask-response"]')).toBeVisible();

    const metrics = turn.locator('[data-testid="ask-response-metrics"]');
    await expect(metrics).toBeVisible();
    await expect(metrics).toContainText("Overdue invoices");
    await expect(metrics).toContainText("2");
    await expect(metrics).toContainText("Total overdue");
    await expect(metrics).toContainText("$27,750");

    const entities = turn.locator('[data-testid="ask-response-entities"]');
    await expect(entities).toBeVisible();
    await expect(entities).toContainText("Vantage Logistics");
    await expect(entities).toContainText("INV-2041");

    await expect(turn.locator('[data-testid="ask-response-analysis"]')).toHaveCount(0);
    await expect(turn.locator("[data-claim]")).toHaveCount(0);
    await expect(turn.locator(".flow-ask-global__answer")).toContainText("$27,750");
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    await capture(page, "01-invoices-widgets.png");

    const axe = await new AxeBuilder({ page })
      .include("[data-testid='global-ask-flow']")
      .analyze();
    const serious = axe.violations.filter(
      (row) => row.impact === "serious" || row.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  test("payment behaviour answer renders comparison with FACT analysis", async ({
    page,
  }) => {
    await startDemo(page);

    await ask(page, "Show clients with worsening payment behaviour");
    const dock = page.getByTestId("global-ask-flow");
    const turn = latestTurn(page);

    await expect(turn).toHaveAttribute(
      "data-ask-tool",
      "analyze_client_payment_behavior",
    );

    const comparison = turn.locator('[data-testid="ask-response-comparison"]');
    await expect(comparison).toBeVisible();
    await expect(comparison).toContainText("Vantage Logistics");
    await expect(comparison).toContainText("$18,500");
    await expect(comparison).toContainText("34 days overdue");
    await expect(comparison).toContainText("on-time baseline");

    const analysis = turn.locator('[data-testid="ask-response-analysis"]');
    await expect(analysis).toBeVisible();
    await expect(analysis.locator('[data-claim="FACT"]')).not.toHaveCount(0);
    await expect(analysis.locator('[data-claim="INFERENCE"]')).toHaveCount(0);
    await expect(analysis.locator('[data-claim="RECOMMENDATION"]')).toHaveCount(0);
    await expect(analysis).toContainText("Deteriorated from on-time");

    await expect(turn.locator(".flow-ask-global__answer")).not.toContainText(
      "RECOMMENDATION",
    );
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    await capture(page, "02-payment-comparison.png");
  });

  test("team capacity answer renders labelled recommendation analysis", async ({
    page,
  }) => {
    await startDemo(page);

    await ask(page, "Show team workload");
    const dock = page.getByTestId("global-ask-flow");
    const turn = latestTurn(page);

    await expect(turn).toHaveAttribute("data-ask-tool", "get_team_capacity");

    const entities = turn.locator('[data-testid="ask-response-entities"]');
    await expect(entities).toBeVisible();
    await expect(
      entities.locator('[data-testid="ask-response-entity"][data-tone="critical"]')
        .first(),
    ).toBeVisible();

    const analysis = turn.locator('[data-testid="ask-response-analysis"]');
    await expect(analysis).toBeVisible();
    await expect(analysis.locator('[data-claim="RECOMMENDATION"]')).toHaveCount(1);
    await expect(analysis.locator('[data-claim="INFERENCE"]')).toHaveCount(1);
    await expect(analysis).toContainText(
      "Taylor Kim can absorb the work while protecting the deadline",
    );

    await expect(turn.locator(".flow-ask-global__answer")).toContainText("Vantage");
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    await capture(page, "03-capacity-recommendations.png");
  });

  test("Roman Urdu answer mirrors language and keeps widgets grounded", async ({
    page,
  }) => {
    await startDemo(page);

    await ask(page, "mujhe overdue invoices list karo");
    const dock = page.getByTestId("global-ask-flow");
    const turn = latestTurn(page);

    await expect(turn).toHaveAttribute("data-ask-tool", "list_overdue_invoices");
    await expect(turn.locator(".flow-ask-global__answer")).toContainText(
      "total $27,750",
    );
    await expect(turn.locator(".flow-ask-global__answer")).toContainText(
      "Vantage Logistics",
    );
    await expect(turn.locator(".flow-ask-global__answer")).not.toContainText(
      "totalling",
    );

    const metrics = turn.locator('[data-testid="ask-response-metrics"]');
    await expect(metrics).toBeVisible();
    await expect(metrics).toContainText("$27,750");
    await expect(turn.locator('[data-testid="ask-response-entities"]')).toContainText(
      "Vantage Logistics",
    );
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    await capture(page, "04-roman-urdu-mirrored.png");
  });

  test("clarification and greetings render no widgets and no fallback", async ({
    page,
  }) => {
    await startDemo(page);

    await ask(page, "list projects");
    const clarifyTurn = latestTurn(page);
    const choices = clarifyTurn.locator(".flow-ask-global__choices button");
    await expect(choices.first()).toBeVisible();
    const choiceCount = await choices.count();
    expect(choiceCount).toBeGreaterThanOrEqual(2);
    await expect(clarifyTurn.locator('[data-testid="ask-response"]')).toHaveCount(0);

    await ask(page, "hi");
    const dock = page.getByTestId("global-ask-flow");
    const greetingTurn = latestTurn(page);
    await expect(greetingTurn).toHaveAttribute("data-ask-tool", "");
    await expect(greetingTurn.locator(".flow-ask-global__answer")).toContainText(
      /workspace records/i,
    );
    await expect(greetingTurn.locator('[data-testid="ask-response"]')).toHaveCount(0);
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
  });
});
