import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const artifacts = join(process.cwd(), "../../artifacts/hackathon");
mkdirSync(artifacts, { recursive: true });

async function capture(page: Page, name: string) {
  await page.screenshot({ path: join(artifacts, name), fullPage: true });
}

async function submit(page: Page, message: string, expected: string) {
  const composer = page.getByLabel("Ask anything about your business");
  const dock = page.getByTestId("global-ask-flow");
  const before = await dock.getByTestId("ask-turn").count();
  await composer.fill(message);
  await composer.press("Enter");
  await expect(dock.getByTestId("ask-turn")).toHaveCount(before + 1);
  const turn = dock.getByTestId("ask-turn").last();
  await expect(turn.locator(".flow-ask-global__question")).toHaveText(message);
  await expect(turn.locator(".flow-ask-global__answer")).toContainText(
    expected,
  );
  await expect(composer).toBeEnabled();
}

test("replays the investor demo through three Ask mutations", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await request.post("/api/demo/lifecycle", { data: { action: "reset" } });
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();

  await submit(
    page,
    "Generate a proposal for Acme Robotics from the approved questionnaire.",
    "Generated the Acme Robotics proposal",
  );
  await capture(page, "01-proposal-generated.png");

  const transition = await request.post("/api/demo/lifecycle", {
    data: { action: "execute_contract" },
  });
  expect(transition.ok()).toBe(true);
  await page.goto(
    "/northstar-creative/admin/opportunities/ns-opp-acme-brand/contract",
  );
  await expect(page.getByText("executed", { exact: true })).toBeVisible();
  await capture(page, "02-contract-executed.png");

  await submit(
    page,
    "Start the Acme project from the executed contract.",
    "six delivery tasks",
  );
  await capture(page, "03-project-started.png");

  await submit(
    page,
    "Mark the Acme homepage design task complete: 7 hours, quality 5.",
    "Delivery Performance Score (demo): 100",
  );
  await capture(page, "04-task-completed.png");

  await page.goto(
    "/northstar-creative/admin/opportunities/ns-opp-acme-brand/project",
  );
  const status = page.getByTestId("demo-lifecycle-status");
  await expect(status).toContainText("Proposal: accepted");
  await expect(status).toContainText("Contract: executed");
  await expect(status).toContainText("Project: active");
  await expect(
    status.getByTestId("demo-delivery-tasks").locator("li"),
  ).toHaveCount(6);
  await expect(status).toContainText("Acme homepage design · complete");
  await expect(status.getByTestId("demo-performance-score")).toContainText(
    "100",
  );
  await capture(page, "05-delivery-performance.png");
});
