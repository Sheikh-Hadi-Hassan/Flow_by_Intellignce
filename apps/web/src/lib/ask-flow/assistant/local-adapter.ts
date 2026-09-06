import type { AskAnswerVersion, AskClarification } from "../types";
import { composeFromTool } from "./compose";
import { detectAnswerLanguage, tPhrase } from "./phrases";
import { routeAskIntent } from "./planner";
import { deriveResponseWidgets } from "./response-shape";
import { ASK_TOOL_DEFINITIONS, runAskTool } from "./tools";
import type {
  AskAssistantRequest,
  AskStreamPart,
  AskToolName,
  BusinessLanguageModelAdapter,
  CollectedAskAnswer,
} from "./types";

export interface LocalAdapterOptions {
  readonly unavailable?: boolean;
  readonly failTool?: AskToolName;
}

function* answerChunks(text: string): Generator<AskStreamPart> {
  for (const chunk of text.match(/\S+\s*/g) ?? [text]) {
    yield { type: "text", delta: chunk };
  }
}

export class LocalBusinessLanguageModelAdapter
  implements BusinessLanguageModelAdapter
{
  readonly id = "flow-intent-router";
  readonly runtime = "deterministic-engine";

  constructor(private readonly options: LocalAdapterOptions = {}) {}

  // eslint-disable-next-line @typescript-eslint/require-await -- deterministic engine is synchronous behind the adapter's async stream shape
  async *stream(request: AskAssistantRequest): AsyncIterable<AskStreamPart> {
    const language = detectAnswerLanguage(request.message, request.context.locale);
    if (this.options.unavailable) {
      yield {
        type: "error",
        code: "model_unavailable",
        message: tPhrase("error.runtimeUnavailable", language),
      };
      return;
    }

    yield { type: "status", phase: "submitted" };
    const planned = routeAskIntent(request);

    if (planned.kind === "out_of_domain") {
      yield {
        type: "error",
        code: "out_of_domain",
        message: planned.reason,
      };
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

    if (this.options.failTool === planned.call.name) {
      yield {
        type: "error",
        code: "tool_unavailable",
        message: tPhrase("error.toolUnavailable", language),
      };
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

    yield { type: "status", phase: "retrieving" };
    yield { type: "tool_status", tool: planned.call.name, state: "running" };
    const result = runAskTool(planned.call, request.context);
    yield {
      type: "tool_status",
      tool: planned.call.name,
      state: result.ok ? "done" : "failed",
    };

    if (!result.ok && result.error?.code === "permission_denied") {
      yield {
        type: "error",
        code: "permission_denied",
        message: result.error.message,
      };
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
    if (!result.ok && result.error?.code === "cross_workspace") {
      yield {
        type: "error",
        code: "cross_workspace",
        message: result.error.message,
      };
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
    if (!result.ok && result.error?.code === "unavailable") {
      yield {
        type: "error",
        code: "tool_unavailable",
        message: result.error.message,
      };
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
    const text = composeFromTool(
      result,
      planned.call.args.greet === "1",
      language,
    );
    yield { type: "status", phase: "streaming" };
    yield* answerChunks(text);
    if (result.evidence.length) yield { type: "evidence", evidence: result.evidence };
    if (result.related.length) yield { type: "sources", related: result.related };
    const widgets = deriveResponseWidgets(result);
    if (widgets.length) yield { type: "widgets", widgets };
    if (result.actions.length) yield { type: "actions", actions: result.actions };
    yield { type: "status", phase: "complete" };
    yield {
      type: "metadata",
      provider: "local",
      model: "flow-intent-router",
      requestId: null,
      latencyMs: 0,
      fallbackUsed: false,
    };
    yield { type: "done", tool: planned.call.name };
  }
}

export function defaultAskTools() {
  return ASK_TOOL_DEFINITIONS;
}

export function answerAskSync(
  request: AskAssistantRequest,
  options: LocalAdapterOptions = {},
): CollectedAskAnswer {
  const language = detectAnswerLanguage(request.message, request.context.locale);
  if (options.unavailable) {
    return {
      version: {
        id: "ver-unavailable",
        question: request.message,
        answer: tPhrase("error.runtimeUnavailable", language),
        evidence: [],
        related: [],
        actions: [],
        createdAt: Date.now(),
      },
      errorCode: "model_unavailable",
    };
  }
  const planned = routeAskIntent(request);
  if (planned.kind === "out_of_domain") {
    return {
      version: {
        id: "ver-domain",
        question: request.message,
        answer: planned.reason,
        evidence: [],
        related: [],
        actions: [],
        createdAt: Date.now(),
      },
      errorCode: "out_of_domain",
    };
  }
  if (planned.kind === "clarify") {
    return {
      version: {
        id: "ver-clarify",
        question: request.message,
        answer: planned.clarification.question,
        evidence: [],
        related: [],
        actions: [],
        clarification: planned.clarification,
        createdAt: Date.now(),
      },
    };
  }
  if (options.failTool === planned.call.name) {
    return {
      version: {
        id: "ver-tool-fail",
        question: request.message,
        answer: tPhrase("error.toolUnavailable", language),
        evidence: [],
        related: [],
        actions: [],
        createdAt: Date.now(),
      },
      errorCode: "tool_unavailable",
    };
  }
  const result = runAskTool(planned.call, request.context);
  const text = composeFromTool(
    result,
    planned.call.args.greet === "1",
    language,
  );
  const widgets = deriveResponseWidgets(result);
  return {
    version: {
      id: `ver-${planned.call.name}`,
      question: request.message,
      answer: text,
      evidence: result.evidence,
      related: result.related,
      actions: result.actions,
      ...(widgets.length ? { widgets } : {}),
      createdAt: Date.now(),
    },
    tool: planned.call.name,
    ...(result.error
      ? {
          errorCode:
            result.error.code === "permission_denied"
              ? "permission_denied"
              : result.error.code === "cross_workspace"
                ? "cross_workspace"
                : "tool_unavailable",
        }
      : {}),
  };
}

export async function collectAskAnswer(
  request: AskAssistantRequest,
  adapter: BusinessLanguageModelAdapter = new LocalBusinessLanguageModelAdapter(),
): Promise<CollectedAskAnswer> {
  let text = "";
  let clarification: AskClarification | undefined;
  let evidence: CollectedAskAnswer["version"]["evidence"] = [];
  let related: CollectedAskAnswer["version"]["related"] = [];
  let actions: CollectedAskAnswer["version"]["actions"] = [];
  let widgets: CollectedAskAnswer["version"]["widgets"];
  let tool: AskToolName | undefined;
  let errorCode: CollectedAskAnswer["errorCode"];

  for await (const part of adapter.stream(request)) {
    if (part.type === "text") text += part.delta;
    if (part.type === "clarification") clarification = part.clarification;
    if (part.type === "evidence") evidence = part.evidence;
    if (part.type === "sources") related = part.related;
    if (part.type === "widgets") widgets = part.widgets;
    if (part.type === "actions") actions = part.actions;
    if (part.type === "done") tool = part.tool;
    if (part.type === "error") {
      errorCode = part.code;
      text = part.message;
    }
  }

  const version: AskAnswerVersion = {
    id: `ver-${Date.now()}`,
    question: request.message,
    answer: text,
    evidence,
    related,
    actions,
    ...(widgets ? { widgets } : {}),
    ...(clarification ? { clarification } : {}),
    createdAt: Date.now(),
  };
  return { version, ...(tool ? { tool } : {}), ...(errorCode ? { errorCode } : {}) };
}
