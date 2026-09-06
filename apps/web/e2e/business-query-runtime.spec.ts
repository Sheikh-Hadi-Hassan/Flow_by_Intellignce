import { expect, test } from "@playwright/test";

const MESSAGE = "Show clients whose name contains Brightline";

test("browser and direct API preserve and return the same filtered query", async ({
  page,
  request,
}) => {
  const direct = await request.post("/api/ask", {
    data: {
      message: MESSAGE,
      context: { workspaceId: "northstar-creative" },
      history: [],
    },
  });
  expect(direct.ok()).toBe(true);
  const directParts = (await direct.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; widgets?: unknown[] });
  const directLabels = directParts
    .flatMap((part) => part.widgets ?? [])
    .filter(
      (widget): widget is { type: "entities"; entities: { label: string }[] } =>
        typeof widget === "object" &&
        widget !== null &&
        (widget as { type?: string }).type === "entities",
    )
    .flatMap((widget) => widget.entities.map((entity) => entity.label));

  const requestBodies: { message?: string }[] = [];
  page.on("request", (outgoing) => {
    if (outgoing.url().endsWith("/api/ask") && outgoing.method() === "POST") {
      requestBodies.push(outgoing.postDataJSON() as { message?: string });
    }
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  const composer = page.getByLabel("Ask anything about your business");
  await composer.fill(MESSAGE);
  await composer.press("Enter");

  const dock = page.getByTestId("global-ask-flow");
  await expect(dock.getByTestId("ask-turn")).toHaveCount(1);
  await expect(dock.getByTestId("ask-response-entity")).toHaveCount(2);
  const browserLabels = await dock
    .getByTestId("ask-response-entity")
    .locator("a, .flow-ask-response__entity-label")
    .allTextContents();

  expect(requestBodies).toHaveLength(1);
  expect(requestBodies[0]?.message).toBe(MESSAGE);
  expect(browserLabels).toEqual(directLabels);
  expect(browserLabels).toEqual(["Brightline Media", "Brightline Media LLC"]);
  await expect(dock.getByText("Meridian Health")).toHaveCount(0);
  await expect(dock.getByText("Answered from")).toBeVisible();
});
