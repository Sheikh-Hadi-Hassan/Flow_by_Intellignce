import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { installAskStreamController } from "./helpers/ask-stream-controller";

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";

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

function composer(page: Page) {
  return page.getByLabel("Ask anything about your business");
}

/**
 * Enter submits the highlighted suggestion when the suggestion list is open,
 * so dismiss it first when the intent is to submit the raw draft.
 */
async function submitDraft(
  page: Page,
  input: Locator,
  question: string,
) {
  await input.fill(question);
  await page.waitForTimeout(400);
  if ((await page.getByRole("option").count()) > 0) {
    await input.press("Escape");
  }
  await input.press("Enter");
}

interface FakeSpeechResultEvent {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly 0: { readonly isFinal: boolean; readonly 0: { readonly transcript: string } };
  };
}

async function installFakeSpeechRecognition(page: Page) {
  await page.addInitScript(() => {
    // The session restarts recognition after onend; emit once per page so
    // restarted instances stay silent and the transcript stays stable.
    let emitted = false;
    class FakeSpeechRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: FakeSpeechResultEvent) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        if (emitted) return;
        emitted = true;
        const result = (transcript: string, isFinal: boolean) => ({
          isFinal,
          length: 1,
          0: { transcript },
        });
        window.setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: { length: 1, 0: result("what is our", false) },
          });
        }, 80);
        window.setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: {
              length: 1,
              0: result("what is our exposure", true),
            },
          });
          this.onend?.();
        }, 220);
      }

      stop() {
        window.setTimeout(() => this.onend?.(), 40);
      }

      abort() {
        window.setTimeout(() => this.onend?.(), 40);
      }
    }
    const win = window as unknown as Record<string, unknown>;
    win.SpeechRecognition = FakeSpeechRecognition;
    win.webkitSpeechRecognition = FakeSpeechRecognition;
  });
}

async function startListening(page: Page) {
  const root = page.getByTestId("global-ask-flow");
  await page.getByRole("button", { name: "Voice input" }).click();
  await expect(root).toHaveAttribute("data-voice-state", "listening");
  await expect(page.getByTestId("ask-voice-cancel")).toBeVisible();
  await expect(page.getByTestId("ask-voice-finish")).toBeVisible();
  await expect(page.getByTestId("ask-voice-text")).toHaveText(
    "what is our exposure",
  );
}

test.describe("CB-01 command bar composer", () => {
  test("processing labels move through the busy pipeline", async ({ page }) => {
    const ctl = await installAskStreamController(page);
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    const chip = page.getByTestId("ask-status");
    const input = composer(page);

    await expect(chip).toHaveCount(0);
    await submitDraft(page, input, "How is the business performing?");

    await expect(root).toHaveAttribute("data-ask-phase", "submitted");
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute("role", "status");
    await expect(chip).toHaveText("Understanding");
    await expect(input).toHaveAttribute("aria-busy", "true");

    await ctl.push({ type: "status", phase: "retrieving" });
    await expect(root).toHaveAttribute("data-ask-phase", "retrieving");
    await expect(chip).toHaveText("Checking Flow");

    await ctl.push({
      type: "tool_status",
      tool: "get_workspace_summary",
      state: "running",
    });
    await expect(chip).toHaveText("Retrieving records");
    await expect(root).toHaveAttribute("data-ask-phase", "retrieving");

    await ctl.push({
      type: "tool_status",
      tool: "get_workspace_summary",
      state: "done",
    });
    await expect(chip).toHaveText("Checking Flow");

    await ctl.push({ type: "status", phase: "generating" });
    await expect(root).toHaveAttribute("data-ask-phase", "generating");
    await expect(chip).toHaveText("Analyzing");

    await ctl.push({ type: "status", phase: "streaming" });
    await expect(root).toHaveAttribute("data-ask-phase", "streaming");
    await expect(chip).toHaveText("Preparing answer");

    await ctl.push({ type: "text", delta: "All primary metrics are steady." });
    await expect(chip).toHaveText("Preparing answer");

    await ctl.push({ type: "done", tool: "get_workspace_summary" });
    await ctl.end();
    await expect(root).toHaveAttribute("data-ask-phase", "answered");
    await expect(chip).toHaveCount(0);
    await expect(input).toHaveAttribute("aria-busy", "false");
    await expect(
      root.getByText("All primary metrics are steady."),
    ).toBeVisible();
    expect((await ctl.requests()).length).toBe(1);
  });

  test("rapid submit is guarded while a stream is running", async ({ page }) => {
    const ctl = await installAskStreamController(page);
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    const input = composer(page);
    const send = page.getByTestId("ask-send");

    await submitDraft(page, input, "How is the business performing?");
    await expect(root).toHaveAttribute("data-ask-phase", "submitted");
    await expect.poll(async () => (await ctl.requests()).length).toBe(1);

    await input.fill("And how did last quarter go?");
    await expect(send).toBeVisible();
    await expect(send).toBeDisabled();

    await input.press("Enter");
    await input.press("Enter");
    await expect(input).toHaveValue("And how did last quarter go?");
    await page.waitForTimeout(400);
    expect((await ctl.requests()).length).toBe(1);

    await ctl.push({ type: "done" });
    await ctl.end();
    await expect(root).toHaveAttribute("data-ask-phase", "answered");
    await expect(send).toBeEnabled();

    await send.click();
    await expect.poll(async () => (await ctl.requests()).length).toBe(2);
    const bodies = await ctl.requests();
    expect((bodies[1]?.body as { message?: string }).message).toBe(
      "And how did last quarter go?",
    );

    await ctl.push({ type: "done" });
    await ctl.end();
    await expect(root).toHaveAttribute("data-ask-phase", "answered");
  });

  test("reduced motion keeps the status chip readable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const ctl = await installAskStreamController(page);
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    const chip = page.getByTestId("ask-status");
    const input = composer(page);

    await input.fill("invoice");
    await expect(
      page.getByRole("option", { name: "Which invoices are overdue?" }),
    ).toBeVisible({ timeout: 5_000 });
    await input.press("Escape");
    await expect(page.getByRole("option")).toHaveCount(0);

    await submitDraft(page, input, "How is the business performing?");
    await expect(root).toHaveAttribute("data-ask-phase", "submitted");
    await expect(chip).toBeVisible();
    await expect(chip).toHaveText("Understanding");

    const dot = root.locator(".flow-ask-global__status-dot");
    await expect(dot).toBeVisible();
    expect(await dot.evaluate((el) => getComputedStyle(el).animationName)).toBe(
      "none",
    );

    await ctl.push({ type: "done" });
    await ctl.end();
    await expect(root).toHaveAttribute("data-ask-phase", "answered");
  });

  test("send button swaps with the mic and the placeholder follows the route", async ({
    page,
  }) => {
    await startDemo(page);

    const input = composer(page);
    const send = page.getByTestId("ask-send");
    const mic = page.getByRole("button", { name: "Voice input" });

    await expect(send).toHaveCount(0);
    await expect(mic).toBeVisible();

    await input.fill("hello");
    await expect(send).toBeVisible();
    await expect(send).toBeEnabled();
    await expect(send).toHaveAttribute("aria-label", "Send");
    await expect(mic).toHaveCount(0);

    await input.fill("");
    await expect(send).toHaveCount(0);
    await expect(mic).toBeVisible();

    // The demo workspace carries open exposure, so the exposure variant of
    // the dynamic placeholder wins over the route variant on every route.
    await expect(input).toHaveAttribute(
      "placeholder",
      "Ask why exposure is climbing",
    );

    await page.getByRole("link", { name: "Team", exact: true }).click();
    await page.waitForURL(new RegExp(`/${northstarSlug}/admin/team`));
    await expect(page.getByTestId("global-ask-flow")).toBeVisible();
    await expect(input).toHaveAttribute(
      "aria-label",
      "Ask anything about your business",
    );
    await expect(mic).toBeVisible();
  });

  test("mic reports unavailability when Web Speech is missing", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const win = window as unknown as Record<string, unknown>;
      delete win.SpeechRecognition;
      delete win.webkitSpeechRecognition;
    });
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    const mic = page.getByRole("button", { name: "Voice input" });

    await expect(mic).toHaveAttribute("data-state", "unavailable");
    await expect(mic).toHaveAttribute("aria-disabled", "true");
    await expect(mic).toHaveAttribute("data-tooltip", "Voice input");

    // aria-disabled="true" blocks Playwright's actionability check; the mic
    // intentionally stays clickable so the notice can announce.
    await mic.click({ force: true });
    await expect(page.getByTestId("ask-voice-note")).toBeVisible();
    await expect(page.getByTestId("ask-voice-note")).toHaveText(
      "Voice input isn't available in this browser",
    );
    await expect(root).toHaveAttribute("data-voice-state", "off");
    await expect(page.getByTestId("ask-voice-cancel")).toHaveCount(0);
  });

  test("voice session transcribes and finishes into a submit", async ({
    page,
  }) => {
    const ctl = await installAskStreamController(page);
    await installFakeSpeechRecognition(page);
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    await startListening(page);

    const results = await new AxeBuilder({ page })
      .include('[data-testid="global-ask-flow"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);

    await page.getByTestId("ask-voice-finish").click();
    await expect(root).toHaveAttribute("data-ask-phase", "submitted");
    await expect(root).toHaveAttribute("data-voice-state", "off");
    await expect.poll(async () => (await ctl.requests()).length).toBe(1);
    const bodies = await ctl.requests();
    expect((bodies[0]?.body as { message?: string }).message).toBe(
      "what is our exposure",
    );

    await ctl.push({ type: "status", phase: "retrieving" });
    await ctl.push({ type: "text", delta: "Exposure is stable this week." });
    await ctl.push({ type: "done" });
    await ctl.end();
    await expect(root).toHaveAttribute("data-ask-phase", "answered");
    await expect(root).toHaveAttribute("data-voice-state", "off");
  });

  test("cancelling voice keeps the transcript and never submits", async ({
    page,
  }) => {
    const ctl = await installAskStreamController(page);
    await installFakeSpeechRecognition(page);
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    const input = composer(page);
    await startListening(page);

    await page.getByTestId("ask-voice-cancel").click();
    await expect(root).toHaveAttribute("data-voice-state", "off");
    await expect(page.getByTestId("ask-voice-cancel")).toHaveCount(0);
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("what is our exposure");
    await expect(input).toBeFocused();
    await page.waitForTimeout(300);
    expect((await ctl.requests()).length).toBe(0);
  });

  test("sound preference persists across reloads from settings", async ({
    page,
  }) => {
    await startDemo(page);
    await page.goto(`${appUrl}/${northstarSlug}/admin/settings`, {
      waitUntil: "domcontentloaded",
    });

    const select = page.getByLabel("Interface sounds");
    await expect(select).toHaveValue("on");

    await select.selectOption("off");
    await expect(select).toHaveValue("off");
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem("flow-sound-v1")),
      )
      .toBe("off");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Interface sounds")).toHaveValue("off");
  });
});
