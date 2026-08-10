import type {
  ApprovalPolicyEvaluator,
  ApprovalPolicyResult,
} from "./approval.js";
import { DefaultApprovalPolicyEvaluator } from "./approval.js";
import type {
  ActionRequest,
  ActionWall,
  AuthorizationDecision,
} from "./action-wall.js";
import type { AuditEvent, AuditSink } from "./audit.js";
import { createAuditEvent, InMemoryAuditSink } from "./audit.js";
import type {
  EvidenceValidationResult,
  EvidenceValidator,
} from "./evidence.js";
import { DefaultEvidenceValidator } from "./evidence.js";
import type { ToolDefinition, ToolRegistry } from "./tool-registry.js";

export type ExecutionStatus =
  "EXECUTED" | "DENIED" | "AWAITING_APPROVAL" | "FAILED";

export interface ActionExecutionResult<TOutput = unknown> {
  readonly status: ExecutionStatus;
  readonly action: string;
  readonly toolId: string;
  readonly actorId: string;
  readonly workspaceId: string;
  readonly correlationId: string;
  readonly authorization?: AuthorizationDecision;
  readonly approval?: ApprovalPolicyResult;
  readonly evidence?: EvidenceValidationResult;
  readonly output?: TOutput;
  readonly error?: string;
  readonly auditEvent: AuditEvent;
}

export class ActionExecutionEngine {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly actionWall: ActionWall,
    private readonly auditSink: AuditSink = new InMemoryAuditSink(),
    private readonly evidenceValidator: EvidenceValidator = new DefaultEvidenceValidator(),
    private readonly approvalEvaluator: ApprovalPolicyEvaluator = new DefaultApprovalPolicyEvaluator(),
  ) {}

  async execute<TInput, TOutput>(
    request: ActionRequest<TInput>,
  ): Promise<ActionExecutionResult<TOutput>> {
    const tool = this.toolRegistry.get<TInput, TOutput>(
      request.requestedToolId,
    );

    if (!tool) {
      return this.auditAndReturn<TOutput>({
        request,
        status: "FAILED",
        reason: "Unknown tool.",
        error: "Requested tool is not registered.",
        decision: this.failureDecision(
          request,
          "Requested tool is not registered.",
        ),
      });
    }

    let parsedInput: TInput;
    try {
      parsedInput = tool.inputSchema.parse(request.input);
    } catch (error) {
      return this.auditAndReturn<TOutput>({
        request,
        tool,
        status: "FAILED",
        reason: "Invalid tool input.",
        error: error instanceof Error ? error.message : "Invalid tool input.",
        decision: this.failureDecision(request, "Invalid tool input."),
      });
    }

    const authorization = await this.actionWall.authorize({
      ...request,
      action: tool.requiredAction,
      input: parsedInput,
      riskLevel: tool.riskLevel,
    });

    if (authorization.outcome === "DENY") {
      return this.auditAndReturn<TOutput>({
        request,
        tool,
        status: "DENIED",
        reason: authorization.reason,
        decision: authorization,
      });
    }

    if (authorization.outcome === "REQUIRES_APPROVAL") {
      return this.auditAndReturn<TOutput>({
        request,
        tool,
        status: "AWAITING_APPROVAL",
        reason: authorization.reason,
        decision: authorization,
        approval: {
          decision: "APPROVAL_REQUIRED",
          reason: authorization.reason,
          requirement: authorization.approval ?? tool.approvalPolicy,
        },
      });
    }

    const evidence = this.evidenceValidator.validate(
      tool.evidencePolicy,
      request.evidence,
    );

    if (!evidence.valid) {
      return this.auditAndReturn<TOutput>({
        request,
        tool,
        status: "DENIED",
        reason: evidence.reason,
        decision: authorization,
        evidence,
      });
    }

    const approval = this.approvalEvaluator.evaluate({
      requirement: tool.approvalPolicy,
      ...(request.approvalGrant ? { grant: request.approvalGrant } : {}),
    });

    if (approval.decision === "APPROVAL_REQUIRED") {
      return this.auditAndReturn<TOutput>({
        request,
        tool,
        status: "AWAITING_APPROVAL",
        reason: approval.reason,
        decision: authorization,
        approval,
        evidence,
      });
    }

    try {
      const output = tool.outputSchema.parse(await tool.execute(parsedInput));
      return this.auditAndReturn<TOutput>({
        request,
        tool,
        status: "EXECUTED",
        reason: "Action executed through Universal Execution Spine.",
        decision: authorization,
        approval,
        evidence,
        output,
      });
    } catch (error) {
      return this.auditAndReturn<TOutput>({
        request,
        tool,
        status: "FAILED",
        reason: "Tool execution failed.",
        decision: authorization,
        approval,
        evidence,
        error:
          error instanceof Error ? error.message : "Tool execution failed.",
      });
    }
  }

  private failureDecision(
    request: ActionRequest<unknown>,
    reason: string,
  ): AuthorizationDecision {
    return {
      outcome: "DENY",
      reason,
      requiredPermission: request.action,
    };
  }

  private async auditAndReturn<TOutput>(input: {
    readonly request: ActionRequest<unknown>;
    readonly tool?: ToolDefinition<unknown, unknown>;
    readonly status: ExecutionStatus;
    readonly reason: string;
    readonly decision: AuthorizationDecision;
    readonly approval?: ApprovalPolicyResult;
    readonly evidence?: EvidenceValidationResult;
    readonly output?: TOutput;
    readonly error?: string;
  }): Promise<ActionExecutionResult<TOutput>> {
    const auditInput = {
      id: `${input.request.correlationId}:${input.request.requestedToolId}:${input.status}`,
      context: {
        actor: input.request.actor,
        workspace: input.request.workspace,
        correlationId: input.request.correlationId,
        reason: input.reason,
        evidence: input.request.evidence,
        ...(input.tool ? { approval: input.tool.approvalPolicy } : {}),
        ...(input.request.approvalGrant
          ? { approvalGrant: input.request.approvalGrant }
          : {}),
      },
      resourceType: input.request.resource.resourceType,
      action: input.request.action,
      toolId: input.request.requestedToolId,
      decision: input.decision,
      resultStatus: input.status,
      ...(input.request.resource.resourceId
        ? { resourceId: input.request.resource.resourceId }
        : {}),
      ...(input.output !== undefined ? { after: input.output } : {}),
      ...(input.error ? { error: input.error } : {}),
    };
    const event = createAuditEvent(auditInput);

    await this.auditSink.record(event);

    return {
      status: input.status,
      action: input.request.action,
      toolId: input.request.requestedToolId,
      actorId: input.request.actor.actorId,
      workspaceId: input.request.workspace.workspaceId,
      correlationId: input.request.correlationId,
      authorization: input.decision,
      auditEvent: event,
      ...(input.approval ? { approval: input.approval } : {}),
      ...(input.evidence ? { evidence: input.evidence } : {}),
      ...(input.output !== undefined ? { output: input.output } : {}),
      ...(input.error ? { error: input.error } : {}),
    };
  }
}
