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
  "../../docs/verification/ask-flow/screenshots/af-02",
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

type AskApiCapture = {
  url: string;
  body: {
    message?: string;
    history?: unknown[];
    context?: {
      workspaceId?: string;
      route?: string;
      role?: string;
    };
  };
};

async function postAsk(
  page: Page,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return page.evaluate(
    async ({ message: text, extra: extraContext }) => {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: [],
          context: {
            workspaceId: "northstar-creative",
            userId: "ns-res-maya",
            role: "Founder",
            permissions: [
              "opportunity.read",
              "opportunity.manage",
              "proposal.approve",
              "project.manage",
              "finance.read",
            ],
            route: "/northstar-creative/admin",
            visibleRecordIds: [],
            locale: "en-US",
            currency: "USD",
            timezone: "America/Chicago",
            conversationId: "ask-af02-api",
            missionStateKind: "populated",
            ...extraContext,
          },
        }),
      });
      const raw = await response.text();
      const parts = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { type: string; delta?: string; code?: string; tool?: string; message?: string });
      const textOut = parts
        .filter((part) => part.type === "text")
        .map((part) => part.delta ?? "")
        .join("");
      const done = parts.find((part) => part.type === "done");
      const error = parts.find((part) => part.type === "error");
      return {
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        text: error?.message ?? textOut,
        tool: done?.tool,
        errorCode: error?.code,
        partTypes: parts.map((part) => part.type),
      };
    },
    { message, extra },
  );
}

test.describe("AF-02 real read-only assistant", () => {
  test("answers natural questions through /api/ask without the generic fallback", async ({
    page,
  }) => {
    const apiCalls: AskApiCapture[] = [];
    await page.route("**/api/ask", async (route) => {
      if (route.request().method() === "POST") {
        apiCalls.push({
          url: route.request().url(),
          body: route.request().postDataJSON() as AskApiCapture["body"],
        });
      }
      await route.continue();
    });

    await startDemo(page);

    await ask(page, "hi");
    const dock = page.getByTestId("global-ask-flow");
    await expect(dock.getByText(/hello/i)).toBeVisible();
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    await expect(page.getByTestId("ask-turn")).toHaveCount(1);
    await capture(page, "01-greeting-hi.png");

    await ask(page, "Show clients with worsening payment behaviour");
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      "Vantage Logistics",
    );
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      "$18,500",
    );
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      "34 days",
    );
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      "last 30 days",
    );
    await expect(dock.getByText("Answered from").last()).toBeVisible();
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    await capture(page, "02-payment-behaviour.png");

    await ask(page, "list today sales update");
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      /sales update/i,
    );
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      "Pipeline",
    );
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    await capture(page, "03-today-sales.png");

    await ask(page, "lis all project");
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      /Q4 Product Launch|Wayfinding/,
    );
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    await capture(page, "04-lis-all-project.png");

    await ask(page, "Which one is most urgent?");
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      /urgent|Meridian|Wayfinding/i,
    );
    await expect(page.getByTestId("ask-turn")).toHaveCount(5);
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    const followUpCall = apiCalls.at(-1);
    expect(followUpCall?.body.message).toBe("Which one is most urgent?");
    expect(followUpCall?.body.context?.workspaceId).toBe(northstarSlug);
    expect(followUpCall?.body.context?.route).toMatch(
      new RegExp(`/${northstarSlug}/`),
    );
    expect((followUpCall?.body.history ?? []).length).toBeGreaterThan(0);
    await capture(page, "07-follow-up-urgent.png");

    await ask(page, "What needs my approval?");
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      "Meridian",
    );
    await expect(dock.getByText(FALLBACK_MARK)).toHaveCount(0);
    await capture(page, "05-approvals.png");

    await ask(page, "Why is $356K exposed?");
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      "$356,000",
    );
    await expect(dock.locator(".flow-ask-global__answer").last()).toContainText(
      "3 open",
    );
    await capture(page, "06-exposure.png");

    await ask(page, "list projects");
    await expect(
      dock.getByText(/active projects, at-risk projects, or every project/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Active projects" })).toBeVisible();
    await expect(page.getByRole("button", { name: "At-risk projects" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Every project" })).toBeVisible();
    await capture(page, "08-clarification.png");

    const streamed = await postAsk(page, "lis all project");
    expect(streamed.contentType).toMatch(/ndjson/);
    expect(streamed.tool).toBe("list_projects");
    expect(streamed.partTypes).toContain("tool_status");
    expect(streamed.partTypes).toContain("text");
    expect(streamed.text).not.toContain(FALLBACK_MARK);

    const denied = await postAsk(page, "explain the open exposure", {
      workspaceId: "acme-other",
    });
    expect(denied.errorCode).toBe("cross_workspace");
    expect(denied.text).toMatch(/not available to this session/i);

    const forbidden = await postAsk(
      page,
      "Show clients with worsening payment behaviour",
      {
        role: "Copywriter",
        permissions: ["opportunity.read"],
      },
    );
    expect(forbidden.errorCode).toBe("permission_denied");

    await page.unroute("**/api/ask");
    await page.route("**/api/ask", (route) => route.abort());
    const composer = page.getByLabel("Ask anything about your business");
    await composer.fill("hi again");
    await composer.press("Enter");
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(composer).toHaveValue("hi again");
    await capture(page, "09-retry-unavailable.png");
    const turnsBeforeRetry = await page.getByTestId("ask-turn").count();
    await page.unroute("**/api/ask");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByTestId("ask-turn")).toHaveCount(turnsBeforeRetry + 1, {
      timeout: 20_000,
    });
    await expect(page.getByTestId("ask-turn").last()).toContainText(/hello/i);
    await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
    await capture(page, "10-turns-separate.png");

    const axe = await new AxeBuilder({ page })
      .include("[data-testid='global-ask-flow']")
      .analyze();
    const serious = axe.violations.filter(
      (row) => row.impact === "serious" || row.impact === "critical",
    );
    expect(serious).toEqual([]);
  });
});
