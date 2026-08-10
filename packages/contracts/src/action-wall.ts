import type { ApprovalRequirement } from "./approval.js";
import type { ApprovalGrant } from "./approval.js";
import type { EvidenceReference } from "./evidence.js";
import type {
  ActorContext,
  CorrelationId,
  MembershipStatus,
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

export interface AuthorizationProviderInput {
  readonly actorId: string;
  readonly userId: string;
  readonly workspaceId: string;
  readonly membershipId: string;
  readonly action: string;
  readonly resource: ResourceReference;
  readonly requestSource: string;
}

export interface AuthorizationProviderDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly requiredPermission: string;
  readonly membershipStatus?: MembershipStatus;
  readonly roleIds?: readonly string[];
  readonly permissionIds?: readonly string[];
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface AuthorizationProvider {
  authorize(
    input: AuthorizationProviderInput,
  ): Promise<AuthorizationProviderDecision>;
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

export class ProviderBackedActionWall implements ActionWall {
  constructor(private readonly authorizationProvider: AuthorizationProvider) {}

  async authorize<TInput>(
    request: ActionRequest<TInput>,
  ): Promise<AuthorizationDecision> {
    const requiredPermission = request.action;

    if (
      request.actor.workspace.workspaceId !== request.workspace.workspaceId ||
      request.resource.workspaceId !== request.workspace.workspaceId
    ) {
      return {
        outcome: "DENY",
        reason:
          "Actor, resource, and request workspace must match before authorization can proceed.",
        requiredPermission,
      };
    }

    const providerDecision = await this.authorizationProvider.authorize({
      actorId: request.actor.actorId,
      userId: request.actor.userId,
      workspaceId: request.workspace.workspaceId,
      membershipId: request.actor.membershipId,
      action: requiredPermission,
      resource: request.resource,
      requestSource: request.actor.requestSource,
    });

    if (!providerDecision.allowed) {
      return {
        outcome: "DENY",
        reason: providerDecision.reason,
        requiredPermission,
        metadata: {
          ...providerDecision.metadata,
          membershipStatus: providerDecision.membershipStatus ?? "UNKNOWN",
        },
      };
    }

    if (request.riskLevel === "HIGH" || request.riskLevel === "CRITICAL") {
      const scope = {
        workspaceId: request.workspace.workspaceId,
        userId: request.actor.userId,
        resourceType: request.resource.resourceType,
        action: request.action,
        ...(request.resource.resourceId
          ? { resourceId: request.resource.resourceId }
          : {}),
      };

      return {
        outcome: "REQUIRES_APPROVAL",
        reason: "High-risk actions require scoped approval before execution.",
        requiredPermission,
        approval: {
          mode: "always-ask",
          reason: "Risk level requires explicit human approval.",
          scope,
        },
        ...(providerDecision.metadata
          ? { metadata: providerDecision.metadata }
          : {}),
      };
    }

    return {
      outcome: "ALLOW",
      reason: providerDecision.reason,
      requiredPermission,
      ...(providerDecision.metadata
        ? { metadata: providerDecision.metadata }
        : {}),
    };
  }
}
