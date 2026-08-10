import type { ApprovalRequirement } from "./approval.js";
import type {
  ActionRequest,
  ActionRiskLevel,
  ActionWall,
  AuthorizationDecision,
} from "./action-wall.js";
import type { AuditEvent } from "./audit.js";
import { createAuditEvent } from "./audit.js";
import type { EvidencePolicy } from "./evidence.js";

export interface InputSchema<TInput> {
  readonly description: string;
  parse(input: unknown): TInput;
}

export interface ToolExecutionResult<TOutput = unknown> {
  readonly output: TOutput;
  readonly auditEvent: AuditEvent;
  readonly authorization: AuthorizationDecision;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly description: string;
  readonly inputSchema: InputSchema<TInput>;
  readonly outputSchema: InputSchema<TOutput>;
  readonly riskLevel: ActionRiskLevel;
  readonly requiredAction: string;
  readonly evidencePolicy: EvidencePolicy;
  readonly approvalPolicy: ApprovalRequirement;
  readonly execute: (input: unknown) => Promise<TOutput>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition<unknown, unknown>>();

  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool already registered: ${tool.id}`);
    }

    this.tools.set(tool.id, tool);
  }

  list(): readonly ToolDefinition<unknown, unknown>[] {
    return [...this.tools.values()];
  }

  get<TInput, TOutput>(
    toolId: string,
  ): ToolDefinition<TInput, TOutput> | undefined {
    return this.tools.get(toolId) as
      ToolDefinition<TInput, TOutput> | undefined;
  }

  /**
   * Kept for existing callers, but normal application code should use
   * ActionExecutionEngine so evidence, approval, and denied/failed audit events
   * cannot be bypassed.
   */
  async execute<TInput, TOutput>(
    toolId: string,
    request: ActionRequest<TInput>,
    actionWall: ActionWall,
  ): Promise<ToolExecutionResult<TOutput>> {
    const tool = this.tools.get(toolId) as
      ToolDefinition<TInput, TOutput> | undefined;

    if (!tool) {
      throw new Error(`Unknown tool: ${toolId}`);
    }

    const authorization = await actionWall.authorize(request);

    if (authorization.outcome !== "ALLOW") {
      throw new Error(`Tool execution blocked: ${authorization.outcome}`);
    }

    const output = await tool.execute(request.input);
    const auditInput = {
      id: `${request.correlationId}:${toolId}`,
      context: {
        actor: request.actor,
        workspace: request.workspace,
        correlationId: request.correlationId,
        reason: `Executed tool ${toolId}`,
        evidence: request.evidence,
        approval: tool.approvalPolicy,
      },
      resourceType: request.resource.resourceType,
      action: request.action,
      toolId,
      decision: authorization,
      resultStatus: "EXECUTED" as const,
      after: output,
      ...(request.resource.resourceId
        ? { resourceId: request.resource.resourceId }
        : {}),
    };
    const auditEvent = createAuditEvent(auditInput);

    return {
      output,
      auditEvent,
      authorization,
    };
  }
}

const systemEchoSchema: InputSchema<{ readonly message: string }> = {
  description: "Object with a string message field.",
  parse(input) {
    if (
      typeof input !== "object" ||
      input === null ||
      !("message" in input) ||
      typeof input.message !== "string"
    ) {
      throw new Error("system.echo input must include a string message.");
    }

    return { message: input.message };
  },
};

export const systemEchoTool: ToolDefinition<
  { readonly message: string },
  { readonly message: string }
> = {
  id: "system.echo",
  description:
    "Zero-risk internal architecture proof tool that echoes validated input.",
  inputSchema: systemEchoSchema,
  outputSchema: systemEchoSchema,
  riskLevel: "LOW",
  requiredAction: "system.echo",
  evidencePolicy: "NONE",
  approvalPolicy: {
    mode: "not-required",
    reason:
      "The tool has no external side effects and only echoes request input.",
  },
  execute(input) {
    return Promise.resolve(systemEchoSchema.parse(input));
  },
};
