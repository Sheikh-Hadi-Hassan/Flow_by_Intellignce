export const databaseBoundary = {
  primaryDatastore: "postgresql",
  initialPlatform: "supabase",
  tenantIsolation: "workspace_id-required-for-tenant-owned-records",
} as const;

export * from "./commercial-persistence.js";
export * from "./proposal-contract-persistence.js";
export * from "./project-persistence.js";
export * from "./resource-persistence.js";
export * from "./finance-persistence.js";
export * from "./sql-executor.js";
export * from "./identity-persistence.js";
export * from "./postgres-sql-executor.js";
export * from "./workspace-phase1.js";
export * from "./workspace-phase1-persistence.js";
export * from "./workspace-provisioning.js";

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
  readonly primaryOrganizationId?: string;
  readonly defaultTimezone?: string;
  readonly defaultLocale?: string;
  readonly defaultCurrency?: string;
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

export type OrganizationStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type OrganizationClassificationSource =
  "USER_CONFIRMED" | "AI_SUGGESTED" | "SYSTEM_TEMPLATE";
export type OrganizationUnitStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type OrganizationUnitType =
  "DIVISION" | "DEPARTMENT" | "TEAM" | "BRANCH" | "OTHER";
export type OrganizationLocationStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface OrganizationRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly displayName?: string;
  readonly legalName?: string;
  readonly slug?: string;
  readonly status: OrganizationStatus;
  readonly countryCode?: string;
  readonly defaultCurrency?: string;
  readonly timezone?: string;
  readonly website?: string;
  readonly description?: string;
  readonly primaryIndustry?: string;
  readonly classificationSource?: OrganizationClassificationSource;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrganizationUnitRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly organizationId: string;
  readonly parentUnitId?: string;
  readonly name: string;
  readonly type: OrganizationUnitType;
  readonly status: OrganizationUnitStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrganizationLocationRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly type?: string;
  readonly countryCode: string;
  readonly region?: string;
  readonly city?: string;
  readonly timezone?: string;
  readonly status: OrganizationLocationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrganizationUnitMembershipRecord {
  readonly workspaceMembershipId: string;
  readonly organizationUnitId: string;
  readonly relationshipType?: string;
  readonly businessTitle?: string;
  readonly isPrimary: boolean;
  readonly createdAt: string;
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
    readonly organizations?: readonly OrganizationRecord[];
    readonly organizationUnits?: readonly OrganizationUnitRecord[];
    readonly organizationLocations?: readonly OrganizationLocationRecord[];
    readonly organizationUnitMemberships?: readonly OrganizationUnitMembershipRecord[];
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
    for (const organization of input.organizations ?? []) {
      this.organizations.set(organization.id, organization);
    }
    for (const unit of input.organizationUnits ?? []) {
      this.organizationUnits.set(unit.id, unit);
    }
    for (const location of input.organizationLocations ?? []) {
      this.organizationLocations.set(location.id, location);
    }
    this.organizationUnitMemberships = [
      ...(input.organizationUnitMemberships ?? []),
    ];
  }

  private readonly organizations = new Map<string, OrganizationRecord>();
  private readonly organizationUnits = new Map<
    string,
    OrganizationUnitRecord
  >();
  private readonly organizationLocations = new Map<
    string,
    OrganizationLocationRecord
  >();
  private organizationUnitMemberships: OrganizationUnitMembershipRecord[] = [];

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

  getPrimaryOrganization(
    workspaceId: string,
  ): Promise<OrganizationRecord | undefined> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace?.primaryOrganizationId) {
      return Promise.resolve(undefined);
    }

    const organization = this.organizations.get(
      workspace.primaryOrganizationId,
    );
    if (organization?.workspaceId !== workspaceId) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve(organization);
  }

  getOrganization(input: {
    readonly workspaceId: string;
    readonly organizationId: string;
  }): Promise<OrganizationRecord | undefined> {
    const organization = this.organizations.get(input.organizationId);
    if (organization?.workspaceId !== input.workspaceId) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve(organization);
  }

  updateOrganizationProfile(input: {
    readonly workspaceId: string;
    readonly organizationId: string;
    readonly displayName?: string;
    readonly website?: string;
    readonly description?: string;
  }): Promise<OrganizationRecord> {
    const organization = this.organizations.get(input.organizationId);
    if (!organization || organization.workspaceId !== input.workspaceId) {
      return Promise.reject(
        new Error("Organization is outside the requested workspace."),
      );
    }

    const updated = {
      ...organization,
      ...(input.displayName !== undefined
        ? { displayName: input.displayName }
        : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      updatedAt: new Date(0).toISOString(),
    };
    this.organizations.set(updated.id, updated);
    return Promise.resolve(updated);
  }

  archiveOrganization(input: {
    readonly workspaceId: string;
    readonly organizationId: string;
  }): Promise<OrganizationRecord> {
    const organization = this.organizations.get(input.organizationId);
    if (!organization || organization.workspaceId !== input.workspaceId) {
      return Promise.reject(
        new Error("Organization is outside the requested workspace."),
      );
    }

    const archived = {
      ...organization,
      status: "ARCHIVED" as const,
      updatedAt: new Date(0).toISOString(),
    };
    this.organizations.set(archived.id, archived);
    return Promise.resolve(archived);
  }

  createOrganizationUnit(
    unit: OrganizationUnitRecord,
  ): Promise<OrganizationUnitRecord> {
    const organization = this.organizations.get(unit.organizationId);
    if (!organization || organization.workspaceId !== unit.workspaceId) {
      return Promise.reject(
        new Error(
          "Organization unit must belong to its organization workspace.",
        ),
      );
    }

    if (unit.parentUnitId) {
      const parent = this.organizationUnits.get(unit.parentUnitId);
      if (
        !parent ||
        parent.workspaceId !== unit.workspaceId ||
        parent.organizationId !== unit.organizationId
      ) {
        return Promise.reject(
          new Error("Parent unit must belong to the same organization."),
        );
      }
    }

    this.organizationUnits.set(unit.id, unit);
    return Promise.resolve(unit);
  }

  moveOrganizationUnit(input: {
    readonly workspaceId: string;
    readonly organizationId: string;
    readonly organizationUnitId: string;
    readonly parentUnitId?: string;
  }): Promise<OrganizationUnitRecord> {
    const unit = this.organizationUnits.get(input.organizationUnitId);
    if (
      !unit ||
      unit.workspaceId !== input.workspaceId ||
      unit.organizationId !== input.organizationId
    ) {
      return Promise.reject(
        new Error("Organization unit is outside the requested organization."),
      );
    }

    if (input.parentUnitId) {
      const parent = this.organizationUnits.get(input.parentUnitId);
      if (
        !parent ||
        parent.workspaceId !== input.workspaceId ||
        parent.organizationId !== input.organizationId
      ) {
        return Promise.reject(
          new Error("Parent unit must belong to the same organization."),
        );
      }

      let cursor: OrganizationUnitRecord | undefined = parent;
      while (cursor) {
        if (cursor.id === unit.id) {
          return Promise.reject(
            new Error("Organization unit hierarchy cycle rejected."),
          );
        }
        cursor = cursor.parentUnitId
          ? this.organizationUnits.get(cursor.parentUnitId)
          : undefined;
      }
    }

    const updated = {
      ...unit,
      ...(input.parentUnitId ? { parentUnitId: input.parentUnitId } : {}),
      updatedAt: new Date(0).toISOString(),
    };
    this.organizationUnits.set(updated.id, updated);
    return Promise.resolve(updated);
  }

  createOrganizationLocation(
    location: OrganizationLocationRecord,
  ): Promise<OrganizationLocationRecord> {
    const organization = this.organizations.get(location.organizationId);
    if (!organization || organization.workspaceId !== location.workspaceId) {
      return Promise.reject(
        new Error("Location must belong to its organization workspace."),
      );
    }

    this.organizationLocations.set(location.id, location);
    return Promise.resolve(location);
  }

  addOrganizationUnitMembership(
    membership: OrganizationUnitMembershipRecord,
  ): Promise<OrganizationUnitMembershipRecord> {
    const workspaceMembership = this.memberships.get(
      membership.workspaceMembershipId,
    );
    const unit = this.organizationUnits.get(membership.organizationUnitId);
    if (!workspaceMembership || !unit) {
      return Promise.reject(
        new Error(
          "Organization unit membership requires existing workspace membership and unit.",
        ),
      );
    }
    if (workspaceMembership.workspaceId !== unit.workspaceId) {
      return Promise.reject(
        new Error("Organization unit membership cannot cross workspaces."),
      );
    }

    this.organizationUnitMemberships.push(membership);
    return Promise.resolve(membership);
  }

  createUser(input: {
    readonly authProvider: "supabase";
    readonly authSubjectId: string;
    readonly email?: string;
  }): FlowUserRecord {
    const user: FlowUserRecord = {
      id: crypto.randomUUID(),
      authProvider: input.authProvider,
      authSubjectId: input.authSubjectId,
      ...(input.email ? { email: input.email } : {}),
    };
    this.users.set(user.id, user);
    return user;
  }

  findWorkspaceBySlug(slug: string): WorkspaceRecord | undefined {
    return [...this.workspaces.values()].find(
      (workspace) => workspace.slug === slug,
    );
  }

  findWorkspaceById(workspaceId: string): WorkspaceRecord | undefined {
    return this.workspaces.get(workspaceId);
  }

  listWorkspacesForUser(userId: string): readonly WorkspaceRecord[] {
    const workspaceIds = new Set(
      [...this.memberships.values()]
        .filter(
          (membership) =>
            membership.userId === userId && membership.status === "ACTIVE",
        )
        .map((membership) => membership.workspaceId),
    );
    return [...this.workspaces.values()].filter((workspace) =>
      workspaceIds.has(workspace.id),
    );
  }

  createWorkspace(input: {
    readonly name: string;
    readonly slug: string;
  }): WorkspaceRecord {
    const workspace: WorkspaceRecord = {
      id: crypto.randomUUID(),
      name: input.name,
      slug: input.slug,
    };
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  createRole(input: {
    readonly workspaceId: string;
    readonly key: string;
    readonly name: string;
    readonly permissionKeys: readonly string[];
  }): RoleRecord {
    const role: RoleRecord = {
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      key: input.key,
      name: input.name,
    };
    this.roles.set(role.id, role);
    for (const permissionKey of input.permissionKeys) {
      let permission = [...this.permissions.values()].find(
        (candidate) => candidate.key === permissionKey,
      );
      if (!permission) {
        permission = {
          id: crypto.randomUUID(),
          key: permissionKey,
          description: permissionKey,
        };
        this.permissions.set(permission.id, permission);
      }
      this.rolePermissions.push({
        roleId: role.id,
        permissionId: permission.id,
      });
    }
    return role;
  }

  createMembership(input: {
    readonly workspaceId: string;
    readonly userId: string;
    readonly roleIds: readonly string[];
  }): WorkspaceMembershipRecord {
    const now = new Date().toISOString();
    const membership: WorkspaceMembershipRecord = {
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    this.memberships.set(membership.id, membership);
    this.membershipRoles.push(
      ...input.roleIds.map((roleId) => ({
        membershipId: membership.id,
        roleId,
      })),
    );
    return membership;
  }

  updateWorkspaceName(workspaceId: string, name: string): WorkspaceRecord {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found.");
    }
    const updated = { ...workspace, name };
    this.workspaces.set(workspaceId, updated);
    return updated;
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
      {
        id: "workspace-alpha",
        slug: "alpha",
        name: "Workspace Alpha",
        primaryOrganizationId: "organization-alpha-primary",
        defaultTimezone: "UTC",
        defaultLocale: "en",
        defaultCurrency: "USD",
      },
      {
        id: "workspace-beta",
        slug: "beta",
        name: "Workspace Beta",
        primaryOrganizationId: "organization-beta-primary",
        defaultTimezone: "UTC",
        defaultLocale: "en",
        defaultCurrency: "USD",
      },
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
      {
        id: "permission-organization-read",
        key: "organization.read",
        description: "Read organization context.",
      },
      {
        id: "permission-organization-update-profile",
        key: "organization.update_profile",
        description: "Update safe organization profile fields.",
      },
      {
        id: "permission-organization-unit-create",
        key: "organization_unit.create",
        description: "Create organization units.",
      },
    ],
    rolePermissions: [
      { roleId: "role-alpha-owner", permissionId: "permission-system-echo" },
      {
        roleId: "role-alpha-owner",
        permissionId: "permission-system-high-risk",
      },
      {
        roleId: "role-alpha-owner",
        permissionId: "permission-organization-read",
      },
      {
        roleId: "role-alpha-owner",
        permissionId: "permission-organization-update-profile",
      },
      {
        roleId: "role-alpha-owner",
        permissionId: "permission-organization-unit-create",
      },
      { roleId: "role-alpha-member", permissionId: "permission-system-echo" },
      {
        roleId: "role-alpha-member",
        permissionId: "permission-organization-read",
      },
    ],
    membershipRoles: [
      { membershipId: "membership-alice-alpha", roleId: "role-alpha-member" },
      { membershipId: "membership-alice-beta", roleId: "role-beta-member" },
      { membershipId: "membership-bob-beta", roleId: "role-beta-member" },
    ],
    organizations: [
      {
        id: "organization-alpha-primary",
        workspaceId: "workspace-alpha",
        name: "Alpha LLC",
        displayName: "Alpha",
        legalName: "Alpha LLC",
        slug: "alpha-primary",
        status: "ACTIVE",
        countryCode: "US",
        defaultCurrency: "USD",
        timezone: "UTC",
        website: "https://alpha.example.test",
        primaryIndustry: "software",
        classificationSource: "USER_CONFIRMED",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "organization-beta-primary",
        workspaceId: "workspace-beta",
        name: "Beta LLC",
        displayName: "Beta",
        slug: "beta-primary",
        status: "ACTIVE",
        countryCode: "US",
        defaultCurrency: "USD",
        timezone: "UTC",
        classificationSource: "SYSTEM_TEMPLATE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    organizationUnits: [
      {
        id: "unit-alpha-technology",
        workspaceId: "workspace-alpha",
        organizationId: "organization-alpha-primary",
        name: "Technology",
        type: "DEPARTMENT",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "unit-alpha-backend",
        workspaceId: "workspace-alpha",
        organizationId: "organization-alpha-primary",
        parentUnitId: "unit-alpha-technology",
        name: "Backend",
        type: "TEAM",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "unit-beta-operations",
        workspaceId: "workspace-beta",
        organizationId: "organization-beta-primary",
        name: "Operations",
        type: "DEPARTMENT",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    organizationLocations: [
      {
        id: "location-alpha-hq",
        workspaceId: "workspace-alpha",
        organizationId: "organization-alpha-primary",
        name: "Alpha HQ",
        type: "office",
        countryCode: "US",
        city: "New York",
        timezone: "America/New_York",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    organizationUnitMemberships: [
      {
        workspaceMembershipId: "membership-alice-alpha",
        organizationUnitId: "unit-alpha-technology",
        relationshipType: "member",
        businessTitle: "Founder",
        isPrimary: true,
        createdAt: now,
      },
    ],
  });
}
