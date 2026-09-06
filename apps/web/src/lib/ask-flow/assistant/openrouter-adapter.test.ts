import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OpenRouterBusinessLanguageModelAdapter,
  type OpenRouterAdapterOptions,
} from "./openrouter-adapter";
import type {
  AskAssistantRequest,
  AskStreamPart,
} from "./types";
import { ASK_TOOL_DEFINITIONS } from "./tools";

const BASE_REQUEST: AskAssistantRequest = {
  context: {
    workspaceId: "northstar-creative",
    userId: "user-test",
    role: "founder",
    permissions: ["workspace.mission_control"],
    route: "/northstar-creative/admin",
    visibleRecordIds: [],
    locale: "en",
    currency: "USD",
    timezone: "UTC",
    conversationId: "conv-test",
  },
  message: "Why is money exposed?",
  history: [],
  tools: ASK_TOOL_DEFINITIONS,
};

interface FetchStubOptions {
  status?: number;
  body?: string;
  headers?: Record<string, string>;
  failOnce?: { status: number; thenStatus: number; thenBody: string };
  throwOnFirst?: { error: Error; thenStatus: number; thenBody: string };
  neverRespond?: boolean;
  timeoutMs?: number;
}

function buildFetchStub(opts: FetchStubOptions) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let attempt = 0;
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: typeof url === "string" ? url : url.toString(), init: init ?? {} });

    if (opts.failOnce && attempt === 0) {
      attempt += 1;
      return new Response(null, {
        status: opts.failOnce.status,
        headers: opts.headers ?? {},
      });
    }
    if (opts.failOnce && attempt >= 1) {
      attempt += 1;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(opts.failOnce!.thenBody));
          controller.close();
        },
      });
      return new Response(stream, {
        status: opts.failOnce.thenStatus,
        headers: { "content-type": "text/event-stream", ...(opts.headers ?? {}) },
      });
    }

    if (opts.throwOnFirst && attempt === 0) {
      attempt += 1;
      throw opts.throwOnFirst.error;
    }
    if (opts.throwOnFirst && attempt >= 1) {
      attempt += 1;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(opts.throwOnFirst!.thenBody));
          controller.close();
        },
      });
      return new Response(stream, {
        status: opts.throwOnFirst.thenStatus,
        headers: { "content-type": "text/event-stream", ...(opts.headers ?? {}) },
      });
    }

    if (opts.neverRespond) {
      await new Promise(() => {});
      return new Response(null, { status: 599 });
    }

    if (opts.status && opts.status >= 400) {
      return new Response(null, {
        status: opts.status,
        headers: opts.headers ?? {},
      });
    }

    const stream = new ReadableStream({
      start(controller) {
        if (opts.body !== undefined) controller.enqueue(new TextEncoder().encode(opts.body));
        controller.close();
      },
    });
    return new Response(stream, {
      status: opts.status ?? 200,
      headers: { "content-type": "text/event-stream", ...(opts.headers ?? {}) },
    });
  });
  return { fn, calls };
}

function buildAdapter(opts: OpenRouterAdapterOptions) {
  return new OpenRouterBusinessLanguageModelAdapter(opts);
}

async function collect(parts: AsyncIterable<AskStreamPart>): Promise<AskStreamPart[]> {
  const out: AskStreamPart[] = [];
  for await (const part of parts) out.push(part);
  return out;
}

function textOf(parts: AskStreamPart[]): string {
  return parts.filter((p): p is Extract<AskStreamPart, { type: "text" }> => p.type === "text")
    .map((p) => p.delta)
    .join("");
}

function metadataOf(parts: AskStreamPart[]): Extract<AskStreamPart, { type: "metadata" }> | undefined {
  return parts.find(
    (p): p is Extract<AskStreamPart, { type: "metadata" }> => p.type === "metadata",
  );
}

function errorOf(parts: AskStreamPart[]): Extract<AskStreamPart, { type: "error" }> | undefined {
  return parts.find(
    (p): p is Extract<AskStreamPart, { type: "error" }> => p.type === "error",
  );
}

const GOOD_BODY = [
  'data: {"choices":[{"delta":{"content":"Meridian holds "}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"$124K. "}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"Northwind "}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"$180K. Vantage $52K."}}]}\n\n',
  "data: [DONE]\n\n",
].join("");

const GROUND_BODY = [
  'data: {"choices":[{"delta":{"content":"3 open decisions hold $356,000: "}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"Meridian Health $124,000, "}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"Vantage Logistics $52,000, "}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"Northwind Bank $180,000."}}]}\n\n',
  "data: [DONE]\n\n",
].join("");

describe("OpenRouterBusinessLanguageModelAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. streams a grounded answer from OpenRouter on success", async () => {
    const { fn, calls } = buildFetchStub({ status: 200, body: GOOD_BODY, headers: { "x-request-id": "req-1" } });
    const adapter = buildAdapter({
      apiKey: "sk-or-test-success",
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const init = calls[0]!.init as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk-or-test-success");
    expect(textOf(parts)).toBe("Meridian holds $124K. Northwind $180K. Vantage $52K.");

    const meta = metadataOf(parts);
    expect(meta).toBeDefined();
    expect(meta!.provider).toBe("openrouter");
    expect(meta!.fallbackUsed).toBe(false);
    expect(meta!.requestId).toBe("req-1");
    expect(meta!.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("2. falls back to local when OPENROUTER_API_KEY is missing", async () => {
    const { fn } = buildFetchStub({ status: 200, body: GOOD_BODY });
    const adapter = buildAdapter({
      apiKey: "",
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));

    expect(fn).not.toHaveBeenCalled();
    const meta = metadataOf(parts);
    expect(meta).toBeDefined();
    expect(meta!.provider).toBe("local");
    expect(meta!.fallbackUsed).toBe(true);
    expect(meta!.fallbackReason).toBe("missing_key");
    expect(textOf(parts).length).toBeGreaterThan(0);
  });

  it("3. falls back to local when OPENROUTER_ENABLED=false", async () => {
    const { fn } = buildFetchStub({ status: 200, body: GOOD_BODY });
    const adapter = buildAdapter({
      apiKey: "sk-or-test-disabled",
      enabled: false,
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));

    expect(fn).not.toHaveBeenCalled();
    const meta = metadataOf(parts);
    expect(meta!.provider).toBe("local");
    expect(meta!.fallbackUsed).toBe(true);
    expect(meta!.fallbackReason).toBe("disabled");
  });

  it("4. falls back with reason=unauthorized on 401 and does NOT retry", async () => {
    const { fn } = buildFetchStub({ status: 401 });
    const adapter = buildAdapter({
      apiKey: "sk-or-test-401",
      maxRetries: 1,
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));

    expect(fn).toHaveBeenCalledTimes(1);
    const meta = metadataOf(parts);
    expect(meta!.provider).toBe("local");
    expect(meta!.fallbackUsed).toBe(true);
    expect(meta!.fallbackReason).toBe("unauthorized");
  });

  it("5. falls back with reason=insufficient_credit on 402 and does NOT retry", async () => {
    const { fn } = buildFetchStub({ status: 402 });
    const adapter = buildAdapter({
      apiKey: "sk-or-test-402",
      maxRetries: 1,
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));

    expect(fn).toHaveBeenCalledTimes(1);
    const meta = metadataOf(parts);
    expect(meta!.fallbackReason).toBe("insufficient_credit");
    expect(meta!.fallbackUsed).toBe(true);
  });

  it("6. retries 429 once then succeeds with OpenRouter as provider", async () => {
    const { fn } = buildFetchStub({
      failOnce: { status: 429, thenStatus: 200, thenBody: GOOD_BODY },
      headers: { "x-request-id": "req-429" },
    });
    const adapter = buildAdapter({
      apiKey: "sk-or-test-429",
      maxRetries: 1,
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));

    expect(fn).toHaveBeenCalledTimes(2);
    const meta = metadataOf(parts);
    expect(meta!.provider).toBe("openrouter");
    expect(meta!.fallbackUsed).toBe(false);
    expect(textOf(parts)).toBe("Meridian holds $124K. Northwind $180K. Vantage $52K.");
  });

  it("7. falls back with reason=timeout when OpenRouter hangs past OPENROUTER_TIMEOUT_MS", async () => {
    let aborted = false;
    const fn = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("synthetic-hang"));
        }, 60_000);
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          clearTimeout(timer);
          const err = new DOMException("The operation was aborted.", "AbortError");
          reject(err);
        });
      });
    });
    const adapter = buildAdapter({
      apiKey: "sk-or-test-timeout",
      timeoutMs: 50,
      fetchImpl: fn as unknown as typeof fetch,
    });

    const partsPromise = collect(adapter.stream(BASE_REQUEST));
    await vi.advanceTimersByTimeAsync(200);
    const parts = await partsPromise;

    expect(aborted).toBe(true);
    const meta = metadataOf(parts);
    expect(meta!.provider).toBe("local");
    expect(meta!.fallbackUsed).toBe(true);
    expect(meta!.fallbackReason).toBe("timeout");
  });

  it("8. falls back with reason=invalid_response when OpenRouter streams malformed payload", async () => {
    const { fn } = buildFetchStub({
      status: 200,
      body: 'data: NOT_JSON_AT_ALL\n\n{"no-data-prefix":true}\ndata: [DONE]\n\n',
    });
    const adapter = buildAdapter({
      apiKey: "sk-or-test-malformed",
      maxRetries: 1,
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));

    const meta = metadataOf(parts);
    expect(meta!.provider).toBe("local");
    expect(meta!.fallbackUsed).toBe(true);
    expect(meta!.fallbackReason).toBe("invalid_response");
  });

  it("9. retries a 500 once then falls back when second attempt also 500s", async () => {
    const fn = vi.fn(async () => new Response(null, { status: 500 }));
    const adapter = buildAdapter({
      apiKey: "sk-or-test-500",
      maxRetries: 1,
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));

    expect(fn).toHaveBeenCalledTimes(2);
    const meta = metadataOf(parts);
    expect(meta!.provider).toBe("local");
    expect(meta!.fallbackUsed).toBe(true);
    expect(meta!.fallbackReason).toBe("provider_error");
  });

  it("10. preserves exact grounded financial values ($356K = 124+180+52 across 3 decisions)", async () => {
    const { fn } = buildFetchStub({ status: 200, body: GROUND_BODY, headers: { "x-request-id": "req-ground" } });
    const adapter = buildAdapter({
      apiKey: "sk-or-test-ground",
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));
    const text = textOf(parts);

    expect(text).toContain("$356,000");
    expect(text).toContain("3 open decisions");
    expect(text).toContain("Meridian Health");
    expect(text).toContain("$124,000");
    expect(text).toContain("Vantage Logistics");
    expect(text).toContain("$52,000");
    expect(text).toContain("Northwind Bank");
    expect(text).toContain("$180,000");

    const init = (fn.mock.calls[0]![1] as RequestInit);
    const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
    const userMessage = body.messages[body.messages.length - 1]!.content;
    expect(userMessage).toContain('"exposure"');
    expect(userMessage).toContain("Meridian Health");
    expect(userMessage).toContain("Vantage Logistics");
    expect(userMessage).toContain("Northwind Bank");
    expect(userMessage).toContain("$356,000");
  });

  it("11. never leaks unauthorized workspace records (tool result is workspace-scoped before LLM call)", async () => {
    const { fn } = buildFetchStub({ status: 200, body: GOOD_BODY });
    const adapter = buildAdapter({
      apiKey: "sk-or-test-scope",
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));
    expect(errorOf(parts)).toBeUndefined();

    const init = (fn.mock.calls[0]![1] as RequestInit);
    const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
    const userMessage = body.messages[body.messages.length - 1]!.content;
    expect(userMessage).toContain("northstar-creative");
    expect(userMessage).not.toContain("acme-");
    expect(userMessage).not.toContain("other-workspace");
  });

  it("12. never writes the API key into stream output, request body, or observable logs", async () => {
    const secret = "sk-or-VERY-SECRET-KEY-DO-NOT-LEAK";
    const { fn } = buildFetchStub({ status: 200, body: GOOD_BODY });
    const adapter = buildAdapter({
      apiKey: secret,
      fetchImpl: fn as unknown as typeof fetch,
    });

    const parts = await collect(adapter.stream(BASE_REQUEST));

    expect(textOf(parts)).not.toContain(secret);
    const init = (fn.mock.calls[0]![1] as RequestInit);
    const body = init.body as string;
    expect(body).not.toContain(secret);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${secret}`);

    const meta = metadataOf(parts);
    expect(JSON.stringify(meta)).not.toContain(secret);

    const serialized = JSON.stringify(parts);
    expect(serialized).not.toContain(secret);
  });

  it("13. existing deterministic behaviour still works when OpenRouter is disabled (regression)", async () => {
    const adapter = buildAdapter({ enabled: false, apiKey: "" });
    const parts = await collect(adapter.stream(BASE_REQUEST));

    const text = textOf(parts);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/decision|exposure|\$/i);

    const meta = metadataOf(parts);
    expect(meta!.provider).toBe("local");
    expect(meta!.fallbackUsed).toBe(true);
    expect(meta!.fallbackReason).toBe("disabled");
  });
});
