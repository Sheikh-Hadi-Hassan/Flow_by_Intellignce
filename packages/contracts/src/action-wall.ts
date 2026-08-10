import type { ApprovalRequirement } from "./approval.js";
import type { ApprovalGrant } from "./approval.js";
import type { EvidenceReference } from "./evidence.js";
import type {
  ActorContext,
  CorrelationId,
  WorkspaceContext,
} from "./identity.js";

export type AuthorizationOutcome = "ALLOW" | "DENY" | "REQUIRES_APPROVAL";

export type ActionRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ResourceReference {
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly workspaceId: string;
}

export interface ActionRequest<TInput = unknown> {
  readonly action: string;
  readonly requestedToolId: string;
  readonly actor: ActorContext;
  readonly workspace: WorkspaceContext;
  readonly resource: ResourceReference;
  readonly input: TInput;
  readonly riskLevel: ActionRiskLevel;
  readonly evidence: readonly EvidenceReference[];
  readonly correlationId: CorrelationId;
  readonly approvalGrant?: ApprovalGrant;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface AuthorizationDecision {
  readonly outcome: AuthorizationOutcome;
  readonly reason: string;
  readonly requiredPermission: string;
  readonly approval?: ApprovalRequirement;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface ActionWall {
  authorize<TInput>(
    request: ActionRequest<TInput>,
  ): Promise<AuthorizationDecision>;
}

export class StaticActionWall implements ActionWall {
  authorize<TInput>(
    request: ActionRequest<TInput>,
  ): Promise<AuthorizationDecision> {
    const requiredPermission = request.action;
    const hasPermission =
      request.actor.permissionIds.includes(requiredPermission);
    const sameWorkspace =
      request.actor.workspace.workspaceId === request.workspace.workspaceId;

    if (
      !sameWorkspace ||
      request.resource.workspaceId !== request.workspace.workspaceId
    ) {
      return Promise.resolve({
        outcome: "DENY",
        reason:
          "Actor, resource, and request workspace must match before authorization can proceed.",
        requiredPermission,
      });
    }

    if (!hasPermission) {
      return Promise.resolve({
        outcome: "DENY",
        reason:
          "Actor does not hold the required permission in this workspace.",
        requiredPermission,
      });
    }

    if (request.riskLevel === "HIGH" || request.riskLevel === "CRITICAL") {
      const scope = {
        workspaceId: request.workspace.workspaceId,
        userId: request.actor.actorId,
        resourceType: request.resource.resourceType,
        action: request.action,
        ...(request.resource.resourceId
          ? { resourceId: request.resource.resourceId }
          : {}),
      };

      return Promise.resolve({
        outcome: "REQUIRES_APPROVAL",
        reason: "High-risk actions require scoped approval before execution.",
        requiredPermission,
        approval: {
          mode: "always-ask",
          reason: "Risk level requires explicit human approval.",
          scope,
        },
      });
    }

    return Promise.resolve({
      outcome: "ALLOW",
      reason: "Actor has the required permission in the request workspace.",
      requiredPermission,
    });
  }
}
