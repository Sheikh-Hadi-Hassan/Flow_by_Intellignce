import { NextResponse } from "next/server";

import { LocalBusinessLanguageModelAdapter } from "../../../lib/ask-flow/assistant/local-adapter";
import { OpenRouterBusinessLanguageModelAdapter } from "../../../lib/ask-flow/assistant/openrouter-adapter";
import { resolveServerAskRequest } from "../../../lib/ask-flow/assistant/server-context";
import { runBusinessQueryAsk } from "../../../lib/ask-flow/business-query/ask-runtime";
import {
  planBusinessQueryAsk,
  type StructuredPlannerAttempt,
} from "../../../lib/ask-flow/business-query/structured-planner";
import type { AskStreamPart } from "../../../lib/ask-flow/assistant/types";
import { runDemoLifecycleAsk } from "../../../lib/hackathon/demo-lifecycle-ask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encoder() {
  return new TextEncoder();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resolved = resolveServerAskRequest(body);
  if (!resolved.ok && resolved.code === "bad_request") {
    return NextResponse.json({ error: resolved.message }, { status: 400 });
  }
  if (!resolved.ok) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder().encode(
            `${JSON.stringify({
              type: "error",
              code: "cross_workspace",
              message: resolved.message,
            })}\n`,
          ),
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  }

  const local = new LocalBusinessLanguageModelAdapter({
    unavailable: process.env.ASK_ASSISTANT_UNAVAILABLE === "1",
  });
  const adapter = new OpenRouterBusinessLanguageModelAdapter({}, local);
  const payload = resolved.request;
  let plannerAttempt: StructuredPlannerAttempt | null = null;
  const businessQuery =
    (await runDemoLifecycleAsk(payload)) ??
    runBusinessQueryAsk(payload) ??
    (await planBusinessQueryAsk(payload, undefined, (attempt) => {
      plannerAttempt = attempt;
    }));

  const stream = new ReadableStream({
    async start(controller) {
      const encode = encoder();
      let executionCount = 0;
      let evidenceEmissionCount = 0;
      const withPlannerTrace = (part: AskStreamPart): AskStreamPart => {
        if (part.type === "tool_status" && part.state === "running") {
          executionCount += 1;
        }
        if (part.type === "evidence") evidenceEmissionCount += 1;
        if (part.type !== "metadata") return part;
        if (!plannerAttempt) {
          return {
            ...part,
            plannerProvider: part.plannerProvider ?? "none",
            plannerModel: part.plannerModel ?? null,
            plannerOutcome: part.plannerOutcome ?? "not_run",
            plannerPlan: part.plannerPlan ?? null,
            plannerValidationResult: part.plannerValidationResult ?? "not_run",
            repairAttempted: part.repairAttempted ?? false,
            fallbackUsed: part.fallbackUsed ?? false,
            executionCount: part.executionCount ?? executionCount,
            evidenceEmissionCount:
              part.evidenceEmissionCount ?? evidenceEmissionCount,
          };
        }
        return {
          ...part,
          plannerProvider: plannerAttempt.provider,
          plannerModel: plannerAttempt.model,
          plannerOutcome: plannerAttempt.outcome,
          plannerPlan: plannerAttempt.plan,
          plannerValidationResult: plannerAttempt.validationResult,
          plannerFailureReason: plannerAttempt.failureReason,
          repairAttempted: plannerAttempt.repairAttempted,
          fallbackUsed: plannerAttempt.outcome === "failure",
          executionCount,
          evidenceEmissionCount,
          latencyMs: plannerAttempt.latencyMs,
        };
      };
      try {
        if (businessQuery) {
          for (const part of businessQuery.parts) {
            controller.enqueue(
              encode.encode(`${JSON.stringify(withPlannerTrace(part))}\n`),
            );
          }
        } else {
          for await (const part of adapter.stream(payload)) {
            controller.enqueue(
              encode.encode(`${JSON.stringify(withPlannerTrace(part))}\n`),
            );
          }
        }
      } catch {
        controller.enqueue(
          encode.encode(
            `${JSON.stringify({
              type: "error",
              code: "model_unavailable",
              message:
                "The assistant runtime failed while generating. Your question was kept — retry.",
            })}\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
