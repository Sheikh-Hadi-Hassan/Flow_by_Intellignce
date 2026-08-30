import type {
  FlowUserRecord,
  PermissionRecord,
  RolePermissionRecord,
  RoleRecord,
  WorkspaceMembershipRecord,
  WorkspaceRecord,
} from "./index.js";
import type { FlowIdentityRepository } from "./identity-persistence.js";

export interface ProvisionWorkspaceInput {
  readonly authProvider: "supabase";
  readonly authSubjectId: string;
  readonly email?: string;
  readonly firstName: string;
  readonly workspaceName: string;
  readonly workspaceSlug: string;
}

export interface ProvisionWorkspaceResult {
  readonly user: FlowUserRecord;
  readonly workspace: WorkspaceRecord;
  readonly membership: WorkspaceMembershipRecord;
  readonly created: boolean;
}

const FOUNDER_PERMISSION_KEYS = [
  "workspace.read",
  "workspace.manage",
  "member.read",
  "member.invite",
  "member.update",
  "onboarding.read",
  "onboarding.manage",
  "twin.read",
  "twin.compile",
  "system.echo",
  "catalog.read",
  "catalog.manage",
  "questionnaire.publish",
  "client.read",
  "client.manage",
  "opportunity.read",
  "opportunity.manage",
  "discovery.manage",
  "fact.verify",
  "brief.manage",
  "brief.approve",
  "proposal.manage",
  "proposal.approve",
  "proposal.share",
  "contract.manage",
  "contract.approve",
  "contract.execute",
  "commercial.audit.read",
] as const;

export async function provisionWorkspaceForUser(
  repository: FlowIdentityRepository,
  input: ProvisionWorkspaceInput,
): Promise<ProvisionWorkspaceResult> {
  const existingUser = await repository.findUserByProviderSubject({
    authProvider: input.authProvider,
    authSubjectId: input.authSubjectId,
  });

  const user =
    existingUser ??
    (await repository.createUser({
      authProvider: input.authProvider,
      authSubjectId: input.authSubjectId,
      ...(input.email ? { email: input.email } : {}),
    }));

  const existingWorkspace = await repository.findWorkspaceBySlug(
    input.workspaceSlug,
  );
  if (existingWorkspace) {
    const membership = await repository.resolveMembership({
      userId: user.id,
      workspaceId: existingWorkspace.id,
    });
    if (!membership) {
      throw new Error("Workspace slug is already taken.");
    }
    return {
      user,
      workspace: existingWorkspace,
      membership: membership.membership,
      created: false,
    };
  }

  const workspace = await repository.createWorkspace({
    name: input.workspaceName,
    slug: input.workspaceSlug,
  });
  const founderRole = await repository.createRole({
    workspaceId: workspace.id,
    key: "FOUNDER",
    name: "Founder",
    permissionKeys: [...FOUNDER_PERMISSION_KEYS],
  });
  const membership = await repository.createMembership({
    workspaceId: workspace.id,
    userId: user.id,
    roleIds: [founderRole.id],
  });

  return { user, workspace, membership, created: true };
}

export type { RoleRecord, PermissionRecord, RolePermissionRecord };
