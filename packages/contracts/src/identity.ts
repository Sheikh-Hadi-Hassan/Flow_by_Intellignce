export type WorkspaceId = string & { readonly __brand: "WorkspaceId" };
export type UserId = string & { readonly __brand: "UserId" };
export type MembershipId = string & { readonly __brand: "MembershipId" };
export type CorrelationId = string & { readonly __brand: "CorrelationId" };

export type ActorKind = "user" | "system" | "service";
export type RequestSource =
  "UI" | "VOICE" | "AI" | "WORKFLOW" | "API" | "SYSTEM";
export type MembershipStatus = "ACTIVE" | "SUSPENDED";

export interface WorkspaceContext {
  readonly workspaceId: WorkspaceId;
  readonly slug?: string;
}

export interface ActorContext {
  readonly actorId: UserId;
  readonly userId: UserId;
  readonly membershipId: MembershipId;
  readonly actorKind: ActorKind;
  readonly workspace: WorkspaceContext;
  readonly roleIds: readonly string[];
  readonly permissionIds: readonly string[];
  readonly requestSource: RequestSource;
  readonly correlationId: CorrelationId;
}
