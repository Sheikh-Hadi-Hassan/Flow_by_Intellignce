import type { Page } from "@playwright/test";

export interface AskStreamRequestRecord {
  readonly url: string;
  readonly body: unknown;
}

export interface AskStreamController {
  push(part: unknown): Promise<void>;
  end(): Promise<void>;
  requests(): Promise<readonly AskStreamRequestRecord[]>;
}

const ASK_PATH = "/api/ask";

/**
 * Intercepts POST /api/ask in the page and answers it with an NDJSON stream
 * that the test feeds line by line. route.fulfill cannot stream, so the init
 * script returns a real ReadableStream whose chunks are enqueued from the
 * Node side via page.evaluate.
 */
export async function installAskStreamController(
  page: Page,
): Promise<AskStreamController> {
  const requests: AskStreamRequestRecord[] = [];

  await page.exposeFunction("__askStreamRecordRequest", (url: string, body: unknown) => {
    requests.push({ url, body });
  });

  await page.addInitScript((askPath: string) => {
    interface AskStreamPageState {
      lines: string[];
      controller: ReadableStreamDefaultController<Uint8Array> | null;
      closed: boolean;
      ended: boolean;
    }
    const state: AskStreamPageState = {
      lines: [],
      controller: null,
      closed: false,
      ended: false,
    };
    const win = window as unknown as Record<string, unknown>;
    win.__askStreamState = state;

    const flush = () => {
      if (!state.controller || state.closed) return;
      const encoder = new TextEncoder();
      while (state.lines.length > 0) {
        const line = state.lines.shift();
        if (line === undefined) break;
        state.controller.enqueue(encoder.encode(`${line}\n`));
      }
      if (state.ended) {
        state.closed = true;
        state.controller.close();
      }
    };

    win.__askStreamPush = (line: string) => {
      state.lines.push(line);
      flush();
    };
    win.__askStreamEnd = () => {
      state.ended = true;
      flush();
    };

    const originalFetch = window.fetch.bind(window);
    const recordRequest = win.__askStreamRecordRequest as (
      url: string,
      body: unknown,
    ) => void;

    win.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (new URL(url, window.location.origin).pathname !== askPath) {
        return originalFetch(input, init);
      }
      let body: unknown = null;
      if (typeof init?.body === "string") {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = init.body;
        }
      }
      recordRequest(url, body);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          state.controller = controller;
          state.closed = false;
          state.ended = false;
          flush();
        },
      });
      return Promise.resolve(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "application/x-ndjson" },
        }),
      );
    };
  }, ASK_PATH);

  return {
    async push(part: unknown) {
      const line = typeof part === "string" ? part : JSON.stringify(part);
      await page.evaluate((payload: string) => {
        const win = window as unknown as Record<string, unknown>;
        (win.__askStreamPush as (value: string) => void)(payload);
      }, line);
    },
    async end() {
      await page.evaluate(() => {
        const win = window as unknown as Record<string, unknown>;
        (win.__askStreamEnd as () => void)();
      });
    },
    requests(): Promise<readonly AskStreamRequestRecord[]> {
      return Promise.resolve(requests);
    },
  };
}
