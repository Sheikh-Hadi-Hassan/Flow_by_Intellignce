import type { EvidenceRef } from "../mission-control/types";
import type {
  AskAssistantRequest,
  AskStreamPart,
  AskToolName,
} from "../ask-flow/assistant/types";
import {
  executeDemoLifecycleAction,
  type DemoLifecycleAction,
  type DemoLifecycleSnapshot,
} from "./demo-lifecycle";

interface CommandPlan {
  readonly action: DemoLifecycleAction;
  readonly tool: AskToolName;
  readonly args: Readonly<Record<string, number | string>>;
}

const COMMANDS: readonly {
  readonly action: DemoLifecycleAction;
  readonly tool: AskToolName;
  readonly matches: (message: string) => boolean;
  readonly args: (message: string) => CommandPlan["args"];
}[] = [
  {
    action: "commercial.generate_proposal",
    tool: "commercial.generate_proposal",
    matches: (message) =>
      /\b(?:generate|create|draft)\b/i.test(message) &&
      /\bproposal\b/i.test(message) &&
      /\bacme(?:\s+robotics)?\b/i.test(message) &&
      /\b(?:questionnaire|intake|brief)\b/i.test(message),
    args: () => ({ intakeId: "ns-intake-acme-approved" }),
  },
  {
    action: "delivery.create_project_from_contract",
    tool: "delivery.create_project_from_contract",
    matches: (message) =>
      /\b(?:start|create|launch)\b/i.test(message) &&
      /\bproject\b/i.test(message) &&
      /\bacme(?:\s+robotics)?\b/i.test(message) &&
      /\bcontract\b/i.test(message),
    args: () => ({ contractId: "ns-contract-acme-executed" }),
  },
  {
    action: "delivery.complete_task",
    tool: "delivery.complete_task",
    matches: (message) =>
      /\b(?:mark|set|complete|finish)\b/i.test(message) &&
      /\bhomepage\b/i.test(message) &&
      /\bdesign\b/i.test(message) &&
      /\btask\b/i.test(message) &&
      /\bquality\s*[1-5]\b/i.test(message) &&
      /\b\d+\s*hours?\b/i.test(message),
    args: (message) => ({
      actualHours: Number(message.match(/\b(\d+)\s*hours?\b/i)?.[1]),
      qualityScore: Number(message.match(/\bquality\s*([1-5])\b/i)?.[1]),
      taskName: "Homepage design",
    }),
  },
];

export function resolveDemoLifecycleCommand(
  message: string,
): CommandPlan | null {
  const matches = COMMANDS.filter((command) => command.matches(message));
  if (matches.length !== 1) return null;
  const command = matches[0]!;
  return {
    action: command.action,
    tool: command.tool,
    args: command.args(message),
  };
}

function evidence(action: DemoLifecycleAction, recordId: string): EvidenceRef {
  return {
    id: `demo-evidence-${recordId}`,
    kind: action === "delivery.complete_task" ? "calculation" : "system-record",
    label: "Northstar demo lifecycle",
    source: action,
    capturedAtLabel: "Now",
    claim: "FACT",
    trust: "high",
    href: "/northstar-creative/admin/opportunities/ns-opp-acme-brand/project",
  };
}

function answer(
  action: DemoLifecycleAction,
  idempotent: boolean,
  snapshot: DemoLifecycleSnapshot,
) {
  const suffix = idempotent ? " The existing record was reused." : "";
  if (action === "commercial.generate_proposal") {
    return `Generated the Acme Robotics proposal from the approved intake.${suffix}`;
  }
  if (action === "delivery.create_project_from_contract") {
    return `Started the Acme Robotics project from the executed contract with six delivery tasks and an assigned homepage design task.${suffix}`;
  }
  const completedTask = snapshot.project?.tasks.find(
    (task) => task.status === "complete",
  );
  const hours = completedTask?.actualMinutes
    ? completedTask.actualMinutes / 60
    : "unavailable";
  return `Completed the Acme homepage design task with ${hours} actual hours and quality ${completedTask?.qualityScore ?? "unavailable"}. Delivery Performance Score (demo): ${snapshot.employee.deliveryPerformanceScore ?? "unavailable"}.${suffix}`;
}

export async function runDemoLifecycleAsk(
  request: AskAssistantRequest,
): Promise<{ readonly parts: readonly AskStreamPart[] } | null> {
  const plan = resolveDemoLifecycleCommand(request.message);
  if (!plan) return null;

  try {
    const result = await executeDemoLifecycleAction(
      plan.action,
      plan.args,
      request.context,
    );
    const recordEvidence = evidence(plan.action, result.recordId);
    return {
      parts: [
        { type: "status", phase: "submitted" },
        { type: "tool_status", tool: plan.tool, state: "running" },
        { type: "tool_status", tool: plan.tool, state: "done" },
        { type: "status", phase: "generating" },
        {
          type: "text",
          delta: answer(plan.action, result.idempotent, result.snapshot),
        },
        { type: "evidence", evidence: [recordEvidence] },
        {
          type: "sources",
          related: [
            {
              id: result.recordId,
              label: "Open Acme delivery journey",
              href: recordEvidence.href!,
            },
          ],
        },
        { type: "status", phase: "complete" },
        {
          type: "metadata",
          provider: "local",
          model: "deterministic-command-bridge",
          requestId: null,
          latencyMs: 0,
          fallbackUsed: true,
          fallbackReason: "deterministic_command",
          plannerProvider: "deterministic",
          plannerModel: null,
          plannerOutcome: "command",
          plannerValidationResult: "passed",
          repairAttempted: false,
          executionCount: 1,
          evidenceEmissionCount: 1,
          commandPlan: plan,
        },
        { type: "done", tool: plan.tool },
      ],
    };
  } catch (error) {
    return {
      parts: [
        { type: "status", phase: "submitted" },
        { type: "tool_status", tool: plan.tool, state: "failed" },
        {
          type: "error",
          code: "tool_unavailable",
          message:
            error instanceof Error
              ? error.message
              : "The demo lifecycle action could not be completed.",
        },
        {
          type: "metadata",
          provider: "local",
          model: "deterministic-command-bridge",
          requestId: null,
          latencyMs: 0,
          fallbackUsed: true,
          fallbackReason: "deterministic_command",
          plannerProvider: "deterministic",
          plannerModel: null,
          plannerOutcome: "command",
          plannerValidationResult: "passed",
          repairAttempted: false,
          executionCount: 0,
          evidenceEmissionCount: 0,
          commandPlan: plan,
        },
      ],
    };
  }
}
