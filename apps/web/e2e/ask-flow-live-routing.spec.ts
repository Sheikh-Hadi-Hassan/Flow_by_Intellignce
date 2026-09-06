import { expect, test } from "@playwright/test";

type Part = {
  type: string;
  code?: string;
  delta?: string;
  clarification?: { question: string; choices: { label: string }[] };
  widgets?: { type: string; entities?: { label: string }[] }[];
  plannerProvider?: string;
  plannerModel?: string | null;
  plannerOutcome?: string;
  plannerValidationResult?: string;
  repairAttempted?: boolean;
  fallbackUsed?: boolean;
  executionCount?: number;
  evidenceEmissionCount?: number;
  latencyMs?: number;
};

function parts(text: string): Part[] {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Part);
}

function metadata(result: readonly Part[]): Part {
  return result.find((part) => part.type === "metadata")!;
}

test("terminal out-of-domain responses cannot contaminate the next submission", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/ask") && request.method() === "POST") {
      requests.push((request.postDataJSON() as { message: string }).message);
    }
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  const composer = page.getByLabel("Ask anything about your business");
  const questions = page.locator(".flow-ask-global__question");

  await composer.fill("whats up");
  expect(await composer.inputValue()).toBe("whats up");
  await composer.press("Enter");
  await expect(questions).toHaveCount(1);
  await expect(composer).toHaveValue("");
  await expect(composer).toBeEnabled();

  await composer.pressSequentially("list all customer");
  expect(await composer.inputValue()).toBe("list all customer");
  await composer.press("Enter");
  await expect(questions).toHaveCount(2);

  expect(requests).toEqual(["whats up", "list all customer"]);
  await expect(questions).toHaveText(["whats up", "list all customer"]);
});

test("semantic corrections are user-safe and execute at most once", async ({
  request,
}) => {
  const cases = [
    {
      message: "whats sale status",
      text: "Which sales view do you mean?",
      choices: ["Pipeline", "Revenue", "Opportunities", "Sales decisions"],
    },
    {
      message: "give me summary on Windmill Schools project",
      text: "No matching projects were found.",
    },
    {
      message: "are we profitable?",
      text: "governed P&L source",
    },
    {
      message: "list transaction in last 2 month",
      text: "Which transaction records should I look for?",
      choices: ["Payments", "Invoices", "Expenses", "Vendor transactions"],
    },
  ] as const;

  for (const item of cases) {
    const response = await request.post("/api/ask", {
      data: {
        message: item.message,
        context: { workspaceId: "northstar-creative" },
        history: [],
      },
    });
    const result = parts(await response.text());
    expect(JSON.stringify(result)).toContain(item.text);
    expect(JSON.stringify(result)).not.toContain(
      "field or filter is not available",
    );
    if ("choices" in item) {
      expect(
        result
          .find((part) => part.type === "clarification")
          ?.clarification?.choices.map((choice) => choice.label),
      ).toEqual(item.choices);
    }
    expect(metadata(result)).toMatchObject({
      plannerProvider: "deterministic",
      plannerValidationResult: "passed",
      repairAttempted: false,
      executionCount:
        item.message === "give me summary on Windmill Schools project" ? 1 : 0,
      evidenceEmissionCount: 0,
    });
  }
});

test("canonical reads and safety gates preserve deterministic counts", async ({
  request,
}) => {
  for (const [message, count] of [
    ["list all customer", 52],
    ["list all clients", 52],
    ["list all employee", 7],
  ] as const) {
    const response = await request.post("/api/ask", {
      data: {
        message,
        context: { workspaceId: "northstar-creative" },
        history: [],
      },
    });
    const result = parts(await response.text());
    const rows = result
      .flatMap((part) => part.widgets ?? [])
      .flatMap((widget) => widget.entities ?? []);
    expect(rows).toHaveLength(count);
    expect(new Set(rows.map((row) => row.label)).size).toBe(count);
    expect(metadata(result)).toMatchObject({
      executionCount: 1,
      evidenceEmissionCount: 1,
    });
  }

  for (const message of [
    "delete every client and project",
    "show another workspace's clients",
  ]) {
    const response = await request.post("/api/ask", {
      data: {
        message,
        context: { workspaceId: "northstar-creative" },
        history: [],
      },
    });
    expect(metadata(parts(await response.text()))).toMatchObject({
      executionCount: 0,
      evidenceEmissionCount: 0,
    });
  }
});

test("live runtime exposes Qwen provenance only in stream metadata", async ({
  page,
}) => {
  test.skip(
    process.env.BLM_PLANNER_LIVE_TESTS !== "1",
    "requires the local Qwen planner",
  );
  let responseParts: Part[] = [];
  await page.route("**/api/ask", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    responseParts = parts(body);
    await route.fulfill({ response, body });
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  const composer = page.getByLabel("Ask anything about your business");
  await composer.fill("tell me about Windmill Schools");
  await composer.press("Enter");
  await expect(page.getByTestId("ask-turn")).toHaveCount(1, {
    timeout: 60_000,
  });
  await expect(page.getByTestId("ask-response-entity")).toHaveCount(1);
  await expect(page.getByTestId("global-ask-flow")).not.toContainText(
    "plannerProvider",
  );
  expect(metadata(responseParts)).toMatchObject({
    plannerProvider: "ollama",
    plannerModel: "qwen3:4b-instruct",
    plannerOutcome: "query",
    plannerValidationResult: "passed",
    repairAttempted: false,
    fallbackUsed: false,
    executionCount: 1,
    evidenceEmissionCount: 1,
    latencyMs: expect.any(Number),
  });
});
