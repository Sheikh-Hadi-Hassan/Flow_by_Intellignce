import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { installAskStreamController } from "./helpers/ask-stream-controller";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";
const screenshotDir = join(
  process.cwd(),
  "../../docs/verification/ask-flow/screenshots/cb-01",
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

async function hideChrome(page: Page) {
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
}

async function startDemo(page: Page) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(new RegExp(`/${northstarSlug}/admin`));
  await expect(page.getByTestId("workspace-header")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("global-ask-flow")).toBeVisible();
  await hideChrome(page);
}

async function capture(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.screenshot({ path: join(screenshotDir, name) });
}

function composer(page: Page) {
  return page.getByLabel("Ask anything about your business");
}

async function submitDraft(page: Page, input: ReturnType<typeof composer>, question: string) {
  await input.fill(question);
  await page.waitForTimeout(400);
  if ((await page.getByRole("option").count()) > 0) {
    await input.press("Escape");
  }
  await input.press("Enter");
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((value) => {
    document.documentElement.setAttribute("data-theme", value);
    window.localStorage.setItem("flow-theme-v1", value);
  }, theme);
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

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

test.describe("CB-01 screenshot capture", () => {
  test("desktop light — idle, focus, suggestions, busy pipeline, answered, multiline, error", async ({
    page,
  }) => {
    const ctl = await installAskStreamController(page);
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    const input = composer(page);

    await capture(page, "01-idle-light.png");

    await input.click();
    await expect(root).toHaveAttribute("data-ask-phase", "focused");
    await capture(page, "02-focused-ring.png");

    await input.fill("invoice");
    await expect(page.getByRole("option").first()).toBeVisible({
      timeout: 5_000,
    });
    await capture(page, "03-typing-suggestions.png");
    await input.press("Escape");
    await input.fill("");

    await submitDraft(page, input, "How is the business performing?");
    await expect(root).toHaveAttribute("data-ask-phase", "submitted");
    await expect(page.getByTestId("ask-status")).toHaveText("Understanding");
    await capture(page, "05-busy-understanding.png");

    await ctl.push({
      type: "tool_status",
      tool: "get_workspace_summary",
      state: "running",
    });
    await expect(page.getByTestId("ask-status")).toHaveText(
      "Retrieving records",
    );
    await capture(page, "06-busy-retrieving-records.png");

    await ctl.push({
      type: "tool_status",
      tool: "get_workspace_summary",
      state: "done",
    });
    await ctl.push({ type: "status", phase: "generating" });
    await ctl.push({ type: "status", phase: "streaming" });
    await expect(root).toHaveAttribute("data-ask-phase", "streaming");
    await ctl.push({ type: "text", delta: "All primary metrics are steady." });
    await expect(page.getByTestId("ask-status")).toHaveText(
      "Preparing answer",
    );
    await capture(page, "07-streaming.png");

    await ctl.push({ type: "done", tool: "get_workspace_summary" });
    await ctl.end();
    await expect(root).toHaveAttribute("data-ask-phase", "answered");
    await expect(root.getByText("All primary metrics are steady.")).toBeVisible();
    await capture(page, "08-answered.png");

    await input.fill(
      "Draft a follow-up for the retainer review that covers exposure, delivery risk, and the Meridian renewal",
    );
    await page.waitForTimeout(150);
    await capture(page, "04-multiline.png");
    await input.fill("");

    await submitDraft(page, input, "What changed since last week?");
    await expect(root).toHaveAttribute("data-ask-phase", "submitted");
    await ctl.push({
      type: "error",
      code: "model_unavailable",
      message:
        "The assistant API did not respond. Your question was kept — retry.",
    });
    await ctl.push({ type: "done" });
    await ctl.end();
    await expect(root).toHaveAttribute("data-ask-phase", "error");
    await capture(page, "09-error-retry.png");
  });

  test("voice listening state", async ({ page }) => {
    await installFakeSpeechRecognition(page);
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    await page.getByRole("button", { name: "Voice input" }).click();
    await expect(root).toHaveAttribute("data-voice-state", "listening");
    await expect(page.getByTestId("ask-voice-text")).toHaveText(
      "what is our exposure",
    );
    await page.waitForTimeout(250);
    await capture(page, "10-voice-listening.png");
  });

  test("voice unavailable state", async ({ page }) => {
    await page.addInitScript(() => {
      const win = window as unknown as Record<string, unknown>;
      delete win.SpeechRecognition;
      delete win.webkitSpeechRecognition;
    });
    await startDemo(page);

    const mic = page.getByRole("button", { name: "Voice input" });
    await expect(mic).toHaveAttribute("data-state", "unavailable");
    await mic.click({ force: true });
    await expect(page.getByTestId("ask-voice-note")).toBeVisible();
    await capture(page, "11-voice-unavailable.png");
  });

  test("reduced motion keeps the busy chip readable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const ctl = await installAskStreamController(page);
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    const input = composer(page);
    await submitDraft(page, input, "How is the business performing?");
    await expect(root).toHaveAttribute("data-ask-phase", "submitted");
    await expect(page.getByTestId("ask-status")).toHaveText("Understanding");
    await capture(page, "12-reduced-motion-busy.png");

    await ctl.push({ type: "done" });
    await ctl.end();
    await expect(root).toHaveAttribute("data-ask-phase", "answered");
  });

  test("dark busy state", async ({ page }) => {
    const ctl = await installAskStreamController(page);
    await startDemo(page);
    await setTheme(page, "dark");

    const root = page.getByTestId("global-ask-flow");
    const input = composer(page);
    await submitDraft(page, input, "How is the business performing?");
    await expect(root).toHaveAttribute("data-ask-phase", "submitted");
    await expect(page.getByTestId("ask-status")).toHaveText("Understanding");
    await capture(page, "13-dark-busy.png");

    await ctl.push({ type: "done" });
    await ctl.end();
    await expect(root).toHaveAttribute("data-ask-phase", "answered");
  });

  test("mobile voice row", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await installFakeSpeechRecognition(page);
    await startDemo(page);

    const root = page.getByTestId("global-ask-flow");
    await page.getByRole("button", { name: "Voice input" }).click();
    await expect(root).toHaveAttribute("data-voice-state", "listening");
    await expect(page.getByTestId("ask-voice-text")).toHaveText(
      "what is our exposure",
    );
    await page.waitForTimeout(250);
    await capture(page, "14-mobile-voice.png");
  });

  test("settings sound section", async ({ page }) => {
    await startDemo(page);
    await page.goto(`${appUrl}/${northstarSlug}/admin/settings`, {
      waitUntil: "domcontentloaded",
    });
    await hideChrome(page);
    const select = page.getByLabel("Interface sounds");
    await expect(select).toBeVisible();
    await select.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await capture(page, "15-settings-sound.png");
  });
});
