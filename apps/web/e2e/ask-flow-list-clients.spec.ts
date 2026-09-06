import { northstarCrmSeed } from "@flow/contracts";
import { expect, test } from "@playwright/test";

test("List clients uses one canonical execution and renders the complete structured list", async ({
  page,
}) => {
  const seed = northstarCrmSeed();
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await expect(page.getByTestId("global-ask-flow")).toBeVisible();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/ask") &&
      response.request().method() === "POST",
  );
  const composer = page.getByLabel("Ask anything about your business");
  await composer.fill("List clients");
  await composer.press("Enter");

  const response = await responsePromise;
  expect(response.ok()).toBe(true);

  const dock = page.getByTestId("global-ask-flow");
  await expect(dock.getByTestId("ask-response-metrics")).toContainText(
    String(seed.clients.length),
  );
  const entities = dock.getByTestId("ask-response-entity");
  await expect(entities).toHaveCount(seed.clients.length);
  const labels = await entities
    .locator("a, .flow-ask-response__entity-label")
    .allTextContents();
  expect(labels).toEqual(seed.clients.map((client) => client.name));
  expect(new Set(labels).size).toBe(labels.length);
  await expect(dock.getByText(/I can look that up as/i)).toHaveCount(0);
  await expect(dock.getByText("Answered from")).toBeVisible();
  await expect(dock.locator(".flow-mc-receipt__item")).toHaveCount(1);
  await expect(dock.locator(".flow-mc-receipt__item")).toContainText(
    "52 CRM client records",
  );
});

test("typed client-list text wins over stale suggestions and rapid Enter", async ({
  page,
}) => {
  const requestBodies: Array<{
    message: string;
    history: readonly unknown[];
  }> = [];
  let streamParts: readonly {
    type: string;
    tool?: string;
    state?: string;
  }[] = [];
  let releaseRequest!: () => void;
  const requestGate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route("**/api/ask", async (route) => {
    requestBodies.push(
      route.request().postDataJSON() as {
        message: string;
        history: readonly unknown[];
      },
    );
    await requestGate;
    const response = await route.fetch();
    const body = await response.text();
    streamParts = body
      .split("\n")
      .filter(Boolean)
      .map(
        (line) =>
          JSON.parse(line) as {
            type: string;
            tool?: string;
            state?: string;
          },
      );
    await route.fulfill({ response, body });
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  const composer = page.getByLabel("Ask anything about your business");

  await composer.fill("client");
  await expect(
    page.getByRole("option", {
      name: /Show clients with worsening payment behaviour/i,
    }),
  ).toBeVisible();
  expect(requestBodies).toHaveLength(0);

  await composer.fill("list all customers");
  await composer.evaluate((element) => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });

  await expect.poll(() => requestBodies.length).toBe(1);
  await expect(composer).toHaveValue("");
  await expect(composer).toBeDisabled();
  expect(requestBodies[0]).toMatchObject({
    message: "list all customers",
    history: [],
  });

  releaseRequest();
  await expect.poll(() => streamParts.length).toBeGreaterThan(0);
  expect(
    streamParts.filter(
      (part) => part.type === "tool_status" && part.state === "running",
    ),
  ).toHaveLength(1);
  expect(streamParts.filter((part) => part.type === "done")).toEqual([
    expect.objectContaining({ tool: "list_clients" }),
  ]);
  const dock = page.getByTestId("global-ask-flow");
  await expect(dock.getByTestId("ask-turn")).toHaveCount(1);
  await expect(dock.getByTestId("ask-pending-turn")).toHaveCount(0);
  await expect(dock.locator(".flow-ask-global__question")).toHaveText(
    "list all customers",
  );
  await expect(dock).toHaveAttribute("data-ask-phase", "answered");
  await expect(composer).toBeEnabled();
  await expect(dock.getByTestId("ask-response-entity")).toHaveCount(52);
  await expect(dock.getByText(/worsening payment behaviour/i)).toHaveCount(0);
});

test("an existing conversation cannot replace or duplicate a new command", async ({
  page,
}) => {
  const requestBodies: Array<{
    message: string;
    history: readonly { role: string; text: string }[];
  }> = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/ask") && request.method() === "POST") {
      requestBodies.push(
        request.postDataJSON() as {
          message: string;
          history: readonly { role: string; text: string }[];
        },
      );
    }
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  const dock = page.getByTestId("global-ask-flow");
  const composer = page.getByLabel("Ask anything about your business");

  await composer.fill("Why is $356K exposed?");
  await composer.press("Enter");
  await expect(dock.getByTestId("ask-turn")).toHaveCount(1);

  await composer.fill("client");
  await expect(page.getByRole("option").first()).toBeVisible();
  await composer.fill("list all customers");
  await composer.press("Enter");

  await expect(dock.getByTestId("ask-turn")).toHaveCount(2);
  const latestTurn = dock.getByTestId("ask-turn").last();
  await expect(latestTurn.getByTestId("ask-response-entity")).toHaveCount(52);
  expect(requestBodies).toHaveLength(2);
  expect(requestBodies[1]?.message).toBe("list all customers");
  expect(requestBodies[1]?.history).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        role: "user",
        text: "Why is $356K exposed?",
      }),
    ]),
  );
  await expect(latestTurn.locator(".flow-ask-global__question")).toHaveText(
    "list all customers",
  );
});
