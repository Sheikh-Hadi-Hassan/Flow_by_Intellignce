import type { UserId, WorkspaceId } from "./identity.js";

export type OrganizationId = string & { readonly __brand: "OrganizationId" };
export type OrganizationUnitId = string & {
  readonly __brand: "OrganizationUnitId";
};

export interface OrganizationContext {
  readonly workspaceId: WorkspaceId;
  readonly organizationId: OrganizationId;
  readonly organizationUnitId?: OrganizationUnitId;
  readonly actorId: UserId;
  readonly locale?: string;
  readonly timezone?: string;
  readonly currency?: string;
}
