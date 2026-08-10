export const databaseBoundary = {
  primaryDatastore: "postgresql",
  initialPlatform: "supabase",
  tenantIsolation: "workspace_id-required-for-tenant-owned-records",
} as const;

export type WorkspaceMembershipStatus = "ACTIVE" | "SUSPENDED";

export interface FlowUserRecord {
  readonly id: string;
  readonly authProvider: "supabase";
  readonly authSubjectId: string;
  readonly email?: string;
}

export interface WorkspaceRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

export interface WorkspaceMembershipRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly status: WorkspaceMembershipStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoleRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly key: string;
  readonly name: string;
}

export interface PermissionRecord {
  readonly id: string;
  readonly key: string;
  readonly description: string;
}

export interface RolePermissionRecord {
  readonly roleId: string;
  readonly permissionId: string;
}

export interface MembershipRoleRecord {
  readonly membershipId: string;
  readonly roleId: string;
}

export interface ResolvedMembershipAuthorization {
  readonly user: FlowUserRecord;
  readonly workspace: WorkspaceRecord;
  readonly membership: WorkspaceMembershipRecord;
  readonly roles: readonly RoleRecord[];
  readonly permissions: readonly PermissionRecord[];
}

export interface IdentityAuthorizationRepository {
  findUserByProviderSubject(input: {
    readonly authProvider: "supabase";
    readonly authSubjectId: string;
  }): Promise<FlowUserRecord | undefined>;

  resolveMembership(input: {
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<ResolvedMembershipAuthorization | undefined>;
}

export interface MutableIdentityAuthorizationRepository extends IdentityAuthorizationRepository {
  replaceMembershipRoles(input: {
    readonly membershipId: string;
    readonly roleIds: readonly string[];
  }): void;

  updateMembershipStatus(input: {
    readonly membershipId: string;
    readonly status: WorkspaceMembershipStatus;
  }): void;
}

export class InMemoryIdentityAuthorizationRepository implements MutableIdentityAuthorizationRepository {
  private readonly users = new Map<string, FlowUserRecord>();
  private readonly workspaces = new Map<string, WorkspaceRecord>();
  private readonly memberships = new Map<string, WorkspaceMembershipRecord>();
  private readonly roles = new Map<string, RoleRecord>();
  private readonly permissions = new Map<string, PermissionRecord>();
  private rolePermissions: RolePermissionRecord[];
  private membershipRoles: MembershipRoleRecord[];

  constructor(input: {
    readonly users: readonly FlowUserRecord[];
    readonly workspaces: readonly WorkspaceRecord[];
    readonly memberships: readonly WorkspaceMembershipRecord[];
    readonly roles: readonly RoleRecord[];
    readonly permissions: readonly PermissionRecord[];
    readonly rolePermissions: readonly RolePermissionRecord[];
    readonly membershipRoles: readonly MembershipRoleRecord[];
  }) {
    for (const user of input.users) this.users.set(user.id, user);
    for (const workspace of input.workspaces) {
      this.workspaces.set(workspace.id, workspace);
    }
    for (const membership of input.memberships) {
      this.memberships.set(membership.id, membership);
    }
    for (const role of input.roles) this.roles.set(role.id, role);
    for (const permission of input.permissions) {
      this.permissions.set(permission.id, permission);
    }
    this.rolePermissions = [...input.rolePermissions];
    this.membershipRoles = [...input.membershipRoles];
  }

  findUserByProviderSubject(input: {
    readonly authProvider: "supabase";
    readonly authSubjectId: string;
  }): Promise<FlowUserRecord | undefined> {
    return Promise.resolve(
      [...this.users.values()].find(
        (user) =>
          user.authProvider === input.authProvider &&
          user.authSubjectId === input.authSubjectId,
      ),
    );
  }

  resolveMembership(input: {
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<ResolvedMembershipAuthorization | undefined> {
    const user = this.users.get(input.userId);
    const workspace = this.workspaces.get(input.workspaceId);
    const membership = [...this.memberships.values()].find(
      (candidate) =>
        candidate.userId === input.userId &&
        candidate.workspaceId === input.workspaceId,
    );

    if (!user || !workspace || !membership) {
      return Promise.resolve(undefined);
    }

    const roles = this.membershipRoles
      .filter((link) => link.membershipId === membership.id)
      .map((link) => this.roles.get(link.roleId))
      .filter((role): role is RoleRecord => Boolean(role));
    const roleIds = new Set(roles.map((role) => role.id));
    const permissions = this.rolePermissions
      .filter((link) => roleIds.has(link.roleId))
      .map((link) => this.permissions.get(link.permissionId))
      .filter((permission): permission is PermissionRecord =>
        Boolean(permission),
      );

    return Promise.resolve({
      user,
      workspace,
      membership,
      roles,
      permissions,
    });
  }

  replaceMembershipRoles(input: {
    readonly membershipId: string;
    readonly roleIds: readonly string[];
  }): void {
    this.membershipRoles = this.membershipRoles.filter(
      (link) => link.membershipId !== input.membershipId,
    );
    this.membershipRoles.push(
      ...input.roleIds.map((roleId) => ({
        membershipId: input.membershipId,
        roleId,
      })),
    );
  }

  updateMembershipStatus(input: {
    readonly membershipId: string;
    readonly status: WorkspaceMembershipStatus;
  }): void {
    const membership = this.memberships.get(input.membershipId);
    if (!membership) {
      return;
    }

    this.memberships.set(input.membershipId, {
      ...membership,
      status: input.status,
      updatedAt: new Date(0).toISOString(),
    });
  }
}

export function createFlowIdentityTestRepository(): InMemoryIdentityAuthorizationRepository {
  const now = "2026-08-10T00:00:00.000Z";
  return new InMemoryIdentityAuthorizationRepository({
    users: [
      {
        id: "flow-user-alice",
        authProvider: "supabase",
        authSubjectId: "supabase-auth-user-alice",
        email: "alice@example.test",
      },
      {
        id: "flow-user-bob",
        authProvider: "supabase",
        authSubjectId: "supabase-auth-user-bob",
        email: "bob@example.test",
      },
    ],
    workspaces: [
      { id: "workspace-alpha", slug: "alpha", name: "Workspace Alpha" },
      { id: "workspace-beta", slug: "beta", name: "Workspace Beta" },
    ],
    memberships: [
      {
        id: "membership-alice-alpha",
        workspaceId: "workspace-alpha",
        userId: "flow-user-alice",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "membership-alice-beta",
        workspaceId: "workspace-beta",
        userId: "flow-user-alice",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "membership-bob-beta",
        workspaceId: "workspace-beta",
        userId: "flow-user-bob",
        status: "SUSPENDED",
        createdAt: now,
        updatedAt: now,
      },
    ],
    roles: [
      {
        id: "role-alpha-owner",
        workspaceId: "workspace-alpha",
        key: "OWNER",
        name: "Owner",
      },
      {
        id: "role-alpha-member",
        workspaceId: "workspace-alpha",
        key: "MEMBER",
        name: "Member",
      },
      {
        id: "role-beta-member",
        workspaceId: "workspace-beta",
        key: "MEMBER",
        name: "Member",
      },
    ],
    permissions: [
      {
        id: "permission-system-echo",
        key: "system.echo",
        description: "Execute the system echo proof action.",
      },
      {
        id: "permission-system-high-risk",
        key: "system.highRisk",
        description: "Initiate a high-risk proof action.",
      },
    ],
    rolePermissions: [
      { roleId: "role-alpha-owner", permissionId: "permission-system-echo" },
      {
        roleId: "role-alpha-owner",
        permissionId: "permission-system-high-risk",
      },
      { roleId: "role-alpha-member", permissionId: "permission-system-echo" },
    ],
    membershipRoles: [
      { membershipId: "membership-alice-alpha", roleId: "role-alpha-member" },
      { membershipId: "membership-alice-beta", roleId: "role-beta-member" },
      { membershipId: "membership-bob-beta", roleId: "role-beta-member" },
    ],
  });
}
