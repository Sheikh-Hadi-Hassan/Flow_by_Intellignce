import type { AskApplicationContext, AskAnswerVersion } from "../types";
import type { AskHistoryTurn, AskStreamPart, AskToolName } from "./types";

export async function* streamAskAssistant(input: {
  readonly context: AskApplicationContext;
  readonly message: string;
  readonly history: readonly AskHistoryTurn[];
}): AsyncIterable<AskStreamPart> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok || !response.body) {
    yield {
      type: "error",
      code: "model_unavailable",
      message:
        "The assistant API did not respond. Your question was kept — retry.",
    };
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      yield JSON.parse(line) as AskStreamPart;
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as AskStreamPart;
}

export function versionFromParts(
  question: string,
  parts: readonly AskStreamPart[],
): {
  version: AskAnswerVersion;
  tool?: AskToolName;
  errorCode?: Extract<AskStreamPart, { type: "error" }>["code"];
} {
  let text = "";
  let clarification;
  let evidence: AskAnswerVersion["evidence"] = [];
  let related: AskAnswerVersion["related"] = [];
  let actions: AskAnswerVersion["actions"] = [];
  let widgets: AskAnswerVersion["widgets"];
  let tool: AskToolName | undefined;
  let errorCode: Extract<AskStreamPart, { type: "error" }>["code"] | undefined;
  for (const part of parts) {
    if (part.type === "text") text += part.delta;
    if (part.type === "clarification") clarification = part.clarification;
    if (part.type === "evidence") evidence = [...part.evidence];
    if (part.type === "sources") related = [...part.related];
    if (part.type === "widgets") widgets = [...part.widgets];
    if (part.type === "actions") actions = [...part.actions];
    if (part.type === "done") tool = part.tool;
    if (part.type === "error") {
      errorCode = part.code;
      text = part.message;
    }
  }
  return {
    version: {
      id: `ver-${Date.now()}`,
      question,
      answer: text,
      evidence,
      related,
      actions,
      ...(widgets ? { widgets } : {}),
      ...(clarification ? { clarification } : {}),
      createdAt: Date.now(),
    },
    ...(tool ? { tool } : {}),
    ...(errorCode ? { errorCode } : {}),
  };
}
