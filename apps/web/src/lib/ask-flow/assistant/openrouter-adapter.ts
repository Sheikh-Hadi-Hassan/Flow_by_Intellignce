import { LocalBusinessLanguageModelAdapter } from "./local-adapter";
import { composeFromTool } from "./compose";
import { detectAnswerLanguage, type AnswerLanguage } from "./phrases";
import { routeAskIntent } from "./planner";
import { deriveResponseWidgets } from "./response-shape";
import { runAskTool } from "./tools";
import type {
  AskAssistantRequest,
  AskHistoryTurn,
  AskStreamPart,
  AskToolResult,
  BusinessLanguageModelAdapter,
} from "./types";

export type FallbackReason =
  | "disabled"
  | "missing_key"
  | "unauthorized"
  | "insufficient_credit"
  | "rate_limited"
  | "timeout"
  | "provider_error"
  | "invalid_response";

export interface OpenRouterAdapterOptions {
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly enabled?: boolean;
  readonly fetchImpl?: typeof fetch;
}

interface EnvLike {
  readonly OPENROUTER_API_KEY?: string;
  readonly OPENROUTER_MODEL?: string;
  readonly OPENROUTER_BASE_URL?: string;
  readonly OPENROUTER_TIMEOUT_MS?: string;
  readonly OPENROUTER_MAX_RETRIES?: string;
  readonly OPENROUTER_ENABLED?: string;
  readonly OPENROUTER_DEBUG?: string;
}

const SYSTEM_INSTRUCTION =
  "You are Flow's business assistant. Answer using only the authorized business context supplied by Flow's tools. Never invent facts, amounts, people, dates or actions. Preserve exact calculated values. If context is insufficient, state what is missing. " +
  "Answer style: give the direct answer first, then any needed detail. Match response length to the question: one short sentence for simple lookups, a few sentences only when the question genuinely needs more. Do not force facts, risks and recommendations sections onto simple requests; include a risk or recommendation only when it is relevant and grounded in the context. " +
  "Use plain sentences and simple lists. Never use em dashes or emojis. Never mention internal tool names, providers, models or intent labels; you answer as Flow, not as a model. Clearly distinguish what the records state from what you infer or recommend. Never claim an operation was performed unless the tool result proves it.";

function readEnv(): EnvLike {
  const env =
    (globalThis as { process?: { env?: EnvLike } }).process?.env ?? {};
  return env;
}

function resolveOptions(explicit: OpenRouterAdapterOptions): {
  apiKey: string | undefined;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  enabled: boolean;
  debug: boolean;
  fetchImpl: typeof fetch;
} {
  const env = readEnv();
  const apiKey = explicit.apiKey ?? env.OPENROUTER_API_KEY;
  const enabled =
    explicit.enabled ??
    (env.OPENROUTER_ENABLED === undefined || env.OPENROUTER_ENABLED === ""
      ? true
      : env.OPENROUTER_ENABLED !== "false" && env.OPENROUTER_ENABLED !== "0");
  const model = explicit.model ?? env.OPENROUTER_MODEL ?? "x-ai/grok-4.3";
  const baseUrl =
    explicit.baseUrl ??
    env.OPENROUTER_BASE_URL ??
    "https://openrouter.ai/api/v1";
  const timeoutMs =
    explicit.timeoutMs ??
    (env.OPENROUTER_TIMEOUT_MS
      ? Number.parseInt(env.OPENROUTER_TIMEOUT_MS, 10)
      : 15000);
  const maxRetries =
    explicit.maxRetries ??
    (env.OPENROUTER_MAX_RETRIES
      ? Number.parseInt(env.OPENROUTER_MAX_RETRIES, 10)
      : 1);
  const debug = env.OPENROUTER_DEBUG === "1" || env.OPENROUTER_DEBUG === "true";
  const fetchImpl = explicit.fetchImpl ?? globalThis.fetch.bind(globalThis);
  return {
    apiKey,
    model,
    baseUrl,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 15000,
    maxRetries: Number.isFinite(maxRetries) ? maxRetries : 1,
    enabled,
    debug,
    fetchImpl,
  };
}

function maskBearer(s: string): string {
  return s.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***");
}
function maskSkOr(s: string): string {
  return s.replace(/sk-or-[A-Za-z0-9._-]+/g, "sk-or-***");
}
function maskApiKey(): string {
  return "<apikey>";
}
function sanitize(text: string, apiKey: string | undefined): string {
  let out = maskBearer(maskSkOr(text));
  if (apiKey && apiKey.length >= 8) {
    const escaped = apiKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "g"), "<apikey>");
  }
  return out;
}
function trimBody(body: string, max = 2000): string {
  return body.length > max
    ? `${body.slice(0, max)}…[truncated ${body.length - max}]`
    : body;
}

function formatToolContent(result: AskToolResult): string {
  return JSON.stringify({
    tool: result.name,
    ok: result.ok,
    workspaceId: result.workspaceId,
    asOf: result.asOf,
    values: result.values,
    evidence: result.evidence.map((row) => ({
      id: row.id,
      kind: row.kind,
      label: row.label,
      source: row.source,
      claim: row.claim,
      trust: row.trust,
    })),
    related: result.related.map((row) => ({
      id: row.id,
      label: row.label,
      href: row.href,
    })),
    actions: result.actions.map((row) => ({
      id: row.id,
      label: row.label,
      href: row.href,
    })),
    error: result.error ?? null,
  });
}

const LANGUAGE_DIRECTIVES: Record<AnswerLanguage, string> = {
  en: "",
  ur: " Respond in Urdu using Urdu script. Keep client names, references, invoice IDs, amounts and currency codes exactly as given, never translated or transliterated.",
  ur_roman:
    " Respond in Roman Urdu (Urdu written in Latin script). Keep client names, references, invoice IDs, amounts and currency codes exactly as given, never translated or transliterated.",
  ar: " Respond in Arabic. Keep client names, references, invoice IDs, amounts and currency codes exactly as given, never translated or transliterated.",
};

function buildMessages(
  history: readonly AskHistoryTurn[],
  toolResult: AskToolResult,
  language: AnswerLanguage = "en",
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    {
      role: "system",
      content: SYSTEM_INSTRUCTION + LANGUAGE_DIRECTIVES[language],
    },
  ];
  for (const turn of history) {
    if (turn.role === "user")
      messages.push({ role: "user", content: turn.text });
    else if (turn.role === "assistant")
      messages.push({ role: "assistant", content: turn.text });
  }
  messages.push({
    role: "user",
    content: `Authorized tool result (${toolResult.name}):\n${formatToolContent(toolResult)}\n\nCompose the answer using only this context.`,
  });
  return messages;
}

interface OpenRouterDelta {
  readonly delta?: { readonly content?: string | null };
  readonly message?: { readonly content?: string | null };
}

interface OpenRouterChatResponse {
  id?: string | null;
  model?: string | null;
  choices?: readonly OpenRouterDelta[];
  error?: { code?: number | string; message?: string } | null;
}

function classifyHttpError(status: number): {
  retryable: boolean;
  reason: FallbackReason;
} {
  if (status === 401) return { retryable: false, reason: "unauthorized" };
  if (status === 402)
    return { retryable: false, reason: "insufficient_credit" };
  if (status === 404) return { retryable: false, reason: "invalid_response" };
  if (status === 429) return { retryable: true, reason: "rate_limited" };
  if (status >= 500) return { retryable: true, reason: "provider_error" };
  return { retryable: false, reason: "provider_error" };
}

export class OpenRouterBusinessLanguageModelAdapter implements BusinessLanguageModelAdapter {
  readonly id = "flow-openrouter-blm";
  readonly runtime = "openrouter-grok";

  private readonly local: LocalBusinessLanguageModelAdapter;
  private readonly resolved: ReturnType<typeof resolveOptions>;

  constructor(
    options: OpenRouterAdapterOptions = {},
    local: LocalBusinessLanguageModelAdapter = new LocalBusinessLanguageModelAdapter(),
  ) {
    this.local = local;
    this.resolved = resolveOptions(options);
  }

  private unavailableReason(): {
    reason: FallbackReason;
    metadata: AskStreamPart;
  } | null {
    if (!this.resolved.enabled) {
      return {
        reason: "disabled",
        metadata: {
          type: "metadata",
          provider: "local",
          model: null,
          requestId: null,
          latencyMs: 0,
          fallbackUsed: true,
          fallbackReason: "disabled",
        },
      };
    }
    if (!this.resolved.apiKey) {
      return {
        reason: "missing_key",
        metadata: {
          type: "metadata",
          provider: "local",
          model: null,
          requestId: null,
          latencyMs: 0,
          fallbackUsed: true,
          fallbackReason: "missing_key",
        },
      };
    }
    return null;
  }

  private async *fallback(
    request: AskAssistantRequest,
    reason: FallbackReason,
  ): AsyncIterable<AskStreamPart> {
    this.log("fallback", { reason });
    for await (const part of this.local.stream(request)) {
      if (part.type === "metadata") continue;
      yield part;
    }
    yield {
      type: "metadata",
      provider: "local",
      model: "flow-intent-router",
      requestId: null,
      latencyMs: 0,
      fallbackUsed: true,
      fallbackReason: reason,
    };
  }

  private *fallbackFromResult(
    result: AskToolResult,
    language: AnswerLanguage,
    reason: FallbackReason,
  ): Iterable<AskStreamPart> {
    yield { type: "status", phase: "streaming" };
    yield { type: "text", delta: composeFromTool(result, false, language) };
    if (result.evidence.length)
      yield { type: "evidence", evidence: result.evidence };
    if (result.related.length)
      yield { type: "sources", related: result.related };
    const widgets = deriveResponseWidgets(result);
    if (widgets.length) yield { type: "widgets", widgets };
    if (result.actions.length)
      yield { type: "actions", actions: result.actions };
    yield {
      type: "metadata",
      provider: "local",
      model: "flow-intent-router",
      requestId: null,
      latencyMs: 0,
      fallbackUsed: true,
      fallbackReason: reason,
    };
    yield { type: "status", phase: "complete" };
    yield { type: "done", tool: result.name };
  }

  private log(tag: string, payload: Record<string, unknown>): void {
    if (!this.resolved.debug) return;
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === "string") safe[k] = sanitize(v, this.resolved.apiKey);
      else safe[k] = v;
    }
    console.error(`[flow:openrouter:${tag}]`, JSON.stringify(safe));
  }

  private logVerdict(summary: {
    provider: "openrouter" | "local";
    model: string | null;
    fallbackUsed: boolean;
    requestId: string | null;
    fallbackReason?: FallbackReason;
    upstreamStatus?: number | null;
    upstreamBody?: string | null;
  }): void {
    const parts: string[] = [
      `provider=${summary.provider}`,
      `model=${summary.model ?? "null"}`,
      `fallbackUsed=${summary.fallbackUsed}`,
      `requestId=${summary.requestId ?? "null"}`,
    ];
    if (summary.fallbackReason)
      parts.push(`fallbackReason=${summary.fallbackReason}`);
    if (summary.upstreamStatus != null)
      parts.push(`upstreamStatus=${summary.upstreamStatus}`);
    console.error(`[flow:openrouter:verdict] ${parts.join(", ")}`);
    if (summary.fallbackUsed && summary.upstreamBody) {
      console.error(
        `[flow:openrouter:upstream] ${trimBody(summary.upstreamBody, 2000)}`,
      );
    }
  }

  private async callProvider(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    attempt: number,
  ): Promise<{
    ok: boolean;
    stream: AsyncIterable<string> | null;
    requestId: string | null;
    bodyRequestId: { value: string | null };
    model: string | null;
    upstreamStatus: number | null;
    upstreamBody: string | null;
    reason?: FallbackReason;
    retryable?: boolean;
  }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.resolved.timeoutMs);
    const started = Date.now();
    const url = `${this.resolved.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const bodyRequestId: { value: string | null } = { value: null };
    const body = {
      model: this.resolved.model,
      messages,
      temperature: 0.1,
      max_tokens: 450,
      stream: true,
    };
    this.log("request", {
      attempt,
      url,
      model: this.resolved.model,
      timeoutMs: this.resolved.timeoutMs,
      maxRetries: this.resolved.maxRetries,
      apiKey: maskApiKey(),
      messageCount: messages.length,
      systemInstructionChars: messages[0]?.content?.length ?? 0,
      lastUserChars: messages[messages.length - 1]?.content?.length ?? 0,
      bodyShape: {
        model: body.model,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        stream: body.stream,
        roleSequence: messages.map((m) => m.role),
      },
    });
    try {
      const response = await this.resolved.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.resolved.apiKey}`,
          Accept: "text/event-stream",
          "X-Title": "Flow Bird Eye View",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      const xRequestId = response.headers.get("x-request-id");
      const xModel = response.headers.get("x-model");
      const contentType = response.headers.get("content-type");

      if (!response.ok || !response.body) {
        let raw = "";
        try {
          raw = await response.text();
        } catch {
          raw = "<body-read-failed>";
        }
        const classified = classifyHttpError(response.status);
        this.log("http-error", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          xRequestId,
          xModel,
          latencyMs: Date.now() - started,
          reason: classified.reason,
          retryable: classified.retryable,
          body: trimBody(raw),
        });
        return {
          ok: false,
          stream: null,
          requestId: xRequestId ?? null,
          bodyRequestId,
          model: this.resolved.model,
          upstreamStatus: response.status,
          upstreamBody: trimBody(sanitize(raw, this.resolved.apiKey)),
          reason: classified.reason,
          retryable: classified.retryable && attempt < this.resolved.maxRetries,
        };
      }

      const requestId = xRequestId ?? null;
      const model = xModel ?? this.resolved.model;
      this.log("http-ok", {
        status: response.status,
        contentType,
        xRequestId,
        xModel,
        latencyMs: Date.now() - started,
      });

      const log = (tag: string, payload: Record<string, unknown>) =>
        this.log(tag, payload);
      const stream = (async function* parseSse(
        body: ReadableStream<Uint8Array>,
      ) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let chunkCount = 0;
        let totalBytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          chunkCount += 1;
          totalBytes += text.length;
          buffer += text;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") return;
            let parsed: OpenRouterChatResponse;
            try {
              parsed = JSON.parse(payload) as OpenRouterChatResponse;
            } catch {
              log("sse-invalid-json", {
                chunkIndex: chunkCount,
                totalBytes,
                payloadPreview: trimBody(payload, 400),
              });
              const err = new Error("openrouter:invalid_json");
              (err as Error & { code?: string }).code =
                "openrouter:invalid_json";
              throw err;
            }
            if (parsed.error) {
              const errMsg =
                typeof parsed.error.message === "string"
                  ? parsed.error.message
                  : "OpenRouter returned an error payload";
              log("sse-error", {
                chunkIndex: chunkCount,
                errorCode: parsed.error.code ?? null,
                errorMessage: errMsg,
                raw: trimBody(payload, 800),
              });
              throw new Error(errMsg);
            }
            if (
              !bodyRequestId.value &&
              typeof parsed.id === "string" &&
              parsed.id.length > 0
            ) {
              bodyRequestId.value = parsed.id;
            }
            const delta =
              parsed.choices?.[0]?.delta?.content ??
              parsed.choices?.[0]?.message?.content;
            if (typeof delta === "string" && delta.length > 0) yield delta;
          }
        }
        if (buffer.trim().startsWith("data:")) {
          const payload = buffer.trim().slice(5).trim();
          if (payload && payload !== "[DONE]") {
            let parsed: OpenRouterChatResponse;
            try {
              parsed = JSON.parse(payload) as OpenRouterChatResponse;
            } catch {
              log("sse-trailing-invalid-json", {
                payloadPreview: trimBody(payload, 400),
              });
              const err = new Error("openrouter:invalid_json");
              (err as Error & { code?: string }).code =
                "openrouter:invalid_json";
              throw err;
            }
            const delta =
              parsed.choices?.[0]?.delta?.content ??
              parsed.choices?.[0]?.message?.content;
            if (typeof delta === "string" && delta.length > 0) yield delta;
          }
        }
        log("sse-complete", { chunkCount, totalBytes });
        void started;
      })(response.body);

      return {
        ok: true,
        stream,
        requestId,
        bodyRequestId,
        model: model ?? this.resolved.model,
        upstreamStatus: response.status,
        upstreamBody: null,
      };
    } catch (err) {
      clearTimeout(timer);
      const aborted =
        err instanceof Error &&
        (err.name === "AbortError" || /aborted/i.test(err.message));
      this.log("fetch-exception", {
        aborted,
        name: err instanceof Error ? err.name : typeof err,
        message: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - started,
      });
      return {
        ok: false,
        stream: null,
        requestId: null,
        bodyRequestId,
        model: this.resolved.model,
        upstreamStatus: null,
        upstreamBody: null,
        reason: aborted ? "timeout" : "provider_error",
        retryable: !aborted && attempt < this.resolved.maxRetries,
      };
    }
  }

  async *stream(request: AskAssistantRequest): AsyncIterable<AskStreamPart> {
    const safeHistory = request.history ?? [];
    const blocked = this.unavailableReason();
    if (blocked) {
      this.logVerdict({
        provider: "local",
        model: "flow-intent-router",
        fallbackUsed: true,
        requestId: null,
        fallbackReason: blocked.reason,
      });
      yield* this.fallback(
        { ...request, history: safeHistory },
        blocked.reason,
      );
      return;
    }

    const planned = routeAskIntent(request);

    if (planned.kind === "out_of_domain") {
      this.logVerdict({
        provider: "local",
        model: "flow-intent-router",
        fallbackUsed: false,
        requestId: null,
      });
      yield { type: "error", code: "out_of_domain", message: planned.reason };
      yield {
        type: "metadata",
        provider: "local",
        model: "flow-intent-router",
        requestId: null,
        latencyMs: 0,
        fallbackUsed: false,
      };
      return;
    }

    if (planned.kind === "clarify") {
      this.logVerdict({
        provider: "local",
        model: "flow-intent-router",
        fallbackUsed: false,
        requestId: null,
      });
      yield { type: "status", phase: "clarification" };
      yield { type: "clarification", clarification: planned.clarification };
      yield { type: "text", delta: planned.clarification.question };
      yield {
        type: "metadata",
        provider: "local",
        model: "flow-intent-router",
        requestId: null,
        latencyMs: 0,
        fallbackUsed: false,
      };
      yield { type: "done" };
      return;
    }

    yield { type: "status", phase: "submitted" };
    yield { type: "status", phase: "retrieving" };
    yield { type: "tool_status", tool: planned.call.name, state: "running" };
    const result = runAskTool(planned.call, request.context);
    yield {
      type: "tool_status",
      tool: planned.call.name,
      state: result.ok ? "done" : "failed",
    };

    if (!result.ok) {
      this.logVerdict({
        provider: "local",
        model: "flow-intent-router",
        fallbackUsed: false,
        requestId: null,
      });
      if (result.error?.code === "permission_denied") {
        yield {
          type: "error",
          code: "permission_denied",
          message: result.error.message,
        };
      } else if (result.error?.code === "cross_workspace") {
        yield {
          type: "error",
          code: "cross_workspace",
          message: result.error.message,
        };
      } else {
        yield {
          type: "error",
          code: "tool_unavailable",
          message: result.error?.message ?? "Tool failed.",
        };
      }
      yield {
        type: "metadata",
        provider: "local",
        model: "flow-intent-router",
        requestId: null,
        latencyMs: 0,
        fallbackUsed: false,
      };
      return;
    }

    yield { type: "status", phase: "generating" };
    const language = detectAnswerLanguage(
      request.message,
      request.context.locale,
    );
    const messages = buildMessages(safeHistory, result, language);

    let attempt = 0;
    let lastReason: FallbackReason = "provider_error";
    let lastRequestId: string | null = null;
    let lastModel: string | null = this.resolved.model;
    let lastUpstreamStatus: number | null = null;
    let lastUpstreamBody: string | null = null;
    while (attempt <= this.resolved.maxRetries) {
      const started = Date.now();
      const response = await this.callProvider(messages, attempt);
      const latencyMs = Date.now() - started;
      lastUpstreamStatus = response.upstreamStatus;
      lastUpstreamBody = response.upstreamBody;

      if (!response.ok || !response.stream) {
        lastReason = response.reason ?? "provider_error";
        lastRequestId =
          response.requestId ?? response.bodyRequestId.value ?? lastRequestId;
        lastModel = response.model ?? lastModel;
        if (response.retryable) {
          attempt += 1;
          continue;
        }
        this.logVerdict({
          provider: "local",
          model: "flow-intent-router",
          fallbackUsed: true,
          requestId: lastRequestId,
          fallbackReason: lastReason,
          upstreamStatus: lastUpstreamStatus,
          upstreamBody: lastUpstreamBody,
        });
        yield* this.fallbackFromResult(result, language, lastReason);
        return;
      }

      const bodyRequestId = response.bodyRequestId;
      let received = "";
      let providerError: FallbackReason | null = null;
      try {
        yield { type: "status", phase: "streaming" };
        for await (const chunk of response.stream) {
          if (typeof chunk !== "string") {
            providerError = "invalid_response";
            break;
          }
          received += chunk;
          yield { type: "text", delta: chunk };
        }
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        providerError =
          code === "openrouter:invalid_json"
            ? "invalid_response"
            : "provider_error";
      }
      if (!lastRequestId && bodyRequestId.value)
        lastRequestId = bodyRequestId.value;

      if (providerError) {
        if (
          providerError !== "invalid_response" &&
          attempt < this.resolved.maxRetries
        ) {
          attempt += 1;
          continue;
        }
        this.logVerdict({
          provider: "local",
          model: "flow-intent-router",
          fallbackUsed: true,
          requestId: lastRequestId ?? bodyRequestId.value,
          fallbackReason: providerError,
          upstreamStatus: lastUpstreamStatus,
          upstreamBody: lastUpstreamBody,
        });
        yield* this.fallbackFromResult(result, language, providerError);
        return;
      }

      if (!received.trim()) {
        if (attempt < this.resolved.maxRetries) {
          attempt += 1;
          continue;
        }
        this.logVerdict({
          provider: "local",
          model: "flow-intent-router",
          fallbackUsed: true,
          requestId: lastRequestId ?? bodyRequestId.value,
          fallbackReason: "invalid_response",
          upstreamStatus: lastUpstreamStatus,
          upstreamBody: lastUpstreamBody,
        });
        yield* this.fallbackFromResult(result, language, "invalid_response");
        return;
      }

      if (result.evidence.length)
        yield { type: "evidence", evidence: result.evidence };
      if (result.related.length)
        yield { type: "sources", related: result.related };
      const widgets = deriveResponseWidgets(result);
      if (widgets.length) yield { type: "widgets", widgets };
      if (result.actions.length)
        yield { type: "actions", actions: result.actions };
      const finalRequestId =
        response.requestId ?? lastRequestId ?? bodyRequestId.value ?? null;
      const finalModel = response.model ?? lastModel;
      this.logVerdict({
        provider: "openrouter",
        model: finalModel,
        fallbackUsed: false,
        requestId: finalRequestId,
        upstreamStatus: lastUpstreamStatus,
      });
      yield {
        type: "metadata",
        provider: "openrouter",
        model: finalModel,
        requestId: finalRequestId,
        latencyMs,
        fallbackUsed: false,
      };
      yield { type: "status", phase: "complete" };
      yield { type: "done", tool: planned.call.name };
      return;
    }

    this.logVerdict({
      provider: "local",
      model: "flow-intent-router",
      fallbackUsed: true,
      requestId: lastRequestId,
      fallbackReason: lastReason,
      upstreamStatus: lastUpstreamStatus,
      upstreamBody: lastUpstreamBody,
    });
    yield* this.fallbackFromResult(result, language, lastReason);
  }
}
