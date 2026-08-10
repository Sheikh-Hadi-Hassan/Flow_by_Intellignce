import type { ApprovalGrant, ApprovalRequirement } from "./approval.js";
import type { AuthorizationDecision } from "./action-wall.js";
import type { EvidenceReference } from "./evidence.js";
import type {
  ActorContext,
  CorrelationId,
  WorkspaceContext,
} from "./identity.js";

export interface AuditContext {
  readonly actor: ActorContext;
  readonly workspace: WorkspaceContext;
  readonly correlationId: CorrelationId;
  readonly reason: string;
  readonly evidence: readonly EvidenceReference[];
  readonly approval?: ApprovalRequirement;
  readonly approvalGrant?: ApprovalGrant;
}

export interface AuditEvent<TBefore = unknown, TAfter = unknown> {
  readonly id: string;
  readonly occurredAt: string;
  readonly actorId: string;
  readonly workspaceId: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly action: string;
  readonly toolId?: string;
  readonly decision: AuthorizationDecision;
  readonly resultStatus: "EXECUTED" | "DENIED" | "AWAITING_APPROVAL" | "FAILED";
  readonly reason: string;
  readonly evidence: readonly EvidenceReference[];
  readonly approval?: ApprovalRequirement;
  readonly approvalGrant?: ApprovalGrant;
  readonly before?: TBefore;
  readonly after?: TAfter;
  readonly error?: string;
  readonly correlationId: CorrelationId;
}

export function createAuditEvent<TBefore, TAfter>(input: {
  readonly id: string;
  readonly context: AuditContext;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly action: string;
  readonly toolId?: string;
  readonly decision: AuthorizationDecision;
  readonly resultStatus: "EXECUTED" | "DENIED" | "AWAITING_APPROVAL" | "FAILED";
  readonly before?: TBefore;
  readonly after?: TAfter;
  readonly error?: string;
  readonly occurredAt?: string;
}): AuditEvent<TBefore, TAfter> {
  return {
    id: input.id,
    occurredAt: input.occurredAt ?? new Date(0).toISOString(),
    actorId: input.context.actor.actorId,
    workspaceId: input.context.workspace.workspaceId,
    resourceType: input.resourceType,
    action: input.action,
    decision: input.decision,
    resultStatus: input.resultStatus,
    reason: input.context.reason,
    evidence: input.context.evidence,
    correlationId: input.context.correlationId,
    ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    ...(input.toolId ? { toolId: input.toolId } : {}),
    ...(input.context.approval ? { approval: input.context.approval } : {}),
    ...(input.context.approvalGrant
      ? { approvalGrant: input.context.approvalGrant }
      : {}),
    ...(input.before !== undefined ? { before: input.before } : {}),
    ...(input.after !== undefined ? { after: input.after } : {}),
    ...(input.error ? { error: input.error } : {}),
  };
}

export interface AuditSink {
  record(event: AuditEvent): Promise<void>;
}

export class InMemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  list(): readonly AuditEvent[] {
    return [...this.events];
  }
}
