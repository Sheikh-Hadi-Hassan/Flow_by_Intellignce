import type {
  FlowUserRecord,
  IdentityAuthorizationRepository,
  PermissionRecord,
  ResolvedMembershipAuthorization,
  RoleRecord,
  WorkspaceMembershipRecord,
  WorkspaceRecord,
} from "./index.js";
import type { InMemoryIdentityAuthorizationRepository } from "./index.js";
import type { SqlExecutor } from "./sql-executor.js";

export interface FlowIdentityRepository extends IdentityAuthorizationRepository {
  findWorkspaceBySlug(slug: string): Promise<WorkspaceRecord | undefined>;
  findWorkspaceById(workspaceId: string): Promise<WorkspaceRecord | undefined>;
  updateWorkspaceName(workspaceId: string, name: string): Promise<void>;
  createUser(input: {
    readonly authProvider: "supabase";
    readonly authSubjectId: string;
    readonly email?: string;
  }): Promise<FlowUserRecord>;
  createWorkspace(input: {
    readonly name: string;
    readonly slug: string;
  }): Promise<WorkspaceRecord>;
  createRole(input: {
    readonly workspaceId: string;
    readonly key: string;
    readonly name: string;
    readonly permissionKeys: readonly string[];
  }): Promise<RoleRecord>;
  createMembership(input: {
    readonly workspaceId: string;
    readonly userId: string;
    readonly roleIds: readonly string[];
  }): Promise<WorkspaceMembershipRecord>;
}

export function asFlowIdentityRepository(
  repository: InMemoryIdentityAuthorizationRepository,
): FlowIdentityRepository {
  return {
    findUserByProviderSubject: (input) =>
      repository.findUserByProviderSubject(input),
    resolveMembership: (input) => repository.resolveMembership(input),
    findWorkspaceBySlug: (slug) =>
      Promise.resolve(repository.findWorkspaceBySlug(slug)),
    findWorkspaceById: (workspaceId) =>
      Promise.resolve(repository.findWorkspaceById(workspaceId)),
    updateWorkspaceName: (workspaceId, name) => {
      repository.updateWorkspaceName(workspaceId, name);
      return Promise.resolve();
    },
    createUser: (input) => Promise.resolve(repository.createUser(input)),
    createWorkspace: (input) => Promise.resolve(repository.createWorkspace(input)),
    createRole: (input) => Promise.resolve(repository.createRole(input)),
    createMembership: (input) =>
      Promise.resolve(repository.createMembership(input)),
  };
}

interface UserRow {
  id: string;
  auth_provider: string;
  auth_subject_id: string;
  email: string | null;
}

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
}

interface MembershipRow {
  id: string;
  workspace_id: string;
  user_id: string;
  status: WorkspaceMembershipRecord["status"];
  created_at: string;
  updated_at: string;
}

interface RoleRow {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
}

interface PermissionRow {
  id: string;
  key: string;
  description: string;
}

function mapUser(row: UserRow): FlowUserRecord {
  return {
    id: row.id,
    authProvider: "supabase",
    authSubjectId: row.auth_subject_id,
    ...(row.email ? { email: row.email } : {}),
  };
}

function mapWorkspace(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
  };
}

function mapMembership(row: MembershipRow): WorkspaceMembershipRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRole(row: RoleRow): RoleRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    key: row.key,
    name: row.name,
  };
}

function mapPermission(row: PermissionRow): PermissionRecord {
  return {
    id: row.id,
    key: row.key,
    description: row.description,
  };
}

export class PostgresFlowIdentityRepository implements FlowIdentityRepository {
  constructor(private readonly db: SqlExecutor) {}

  async findUserByProviderSubject(input: {
    readonly authProvider: "supabase";
    readonly authSubjectId: string;
  }): Promise<FlowUserRecord | undefined> {
    const result = await this.db.query<UserRow>(
      `select id, auth_provider, auth_subject_id, email
       from public.users
       where auth_provider = $1
         and auth_subject_id = $2::uuid`,
      [input.authProvider, input.authSubjectId],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : undefined;
  }

  async resolveMembership(input: {
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<ResolvedMembershipAuthorization | undefined> {
    const membershipResult = await this.db.query<MembershipRow>(
      `select id, workspace_id, user_id, status, created_at, updated_at
       from public.workspace_memberships
       where user_id = $1
         and workspace_id = $2`,
      [input.userId, input.workspaceId],
    );
    const membershipRow = membershipResult.rows[0];
    if (!membershipRow) return undefined;

    const [userResult, workspaceResult, rolesResult, permissionsResult] =
      await Promise.all([
        this.db.query<UserRow>(
          `select id, auth_provider, auth_subject_id, email
           from public.users
           where id = $1`,
          [input.userId],
        ),
        this.db.query<WorkspaceRow>(
          `select id, name, slug
           from public.workspaces
           where id = $1`,
          [input.workspaceId],
        ),
        this.db.query<RoleRow>(
          `select role.id, role.workspace_id, role.key, role.name
           from public.roles role
           join public.membership_roles membership_role
             on membership_role.role_id = role.id
           where membership_role.membership_id = $1`,
          [membershipRow.id],
        ),
        this.db.query<PermissionRow>(
          `select distinct permission.id, permission.key, permission.description
           from public.permissions permission
           join public.role_permissions role_permission
             on role_permission.permission_id = permission.id
           join public.membership_roles membership_role
             on membership_role.role_id = role_permission.role_id
           where membership_role.membership_id = $1`,
          [membershipRow.id],
        ),
      ]);

    const user = userResult.rows[0];
    const workspace = workspaceResult.rows[0];
    if (!user || !workspace) return undefined;

    return {
      user: mapUser(user),
      workspace: mapWorkspace(workspace),
      membership: mapMembership(membershipRow),
      roles: rolesResult.rows.map(mapRole),
      permissions: permissionsResult.rows.map(mapPermission),
    };
  }

  async findWorkspaceBySlug(slug: string): Promise<WorkspaceRecord | undefined> {
    const result = await this.db.query<WorkspaceRow>(
      `select id, name, slug
       from public.workspaces
       where slug = $1`,
      [slug],
    );
    const row = result.rows[0];
    return row ? mapWorkspace(row) : undefined;
  }

  async findWorkspaceById(
    workspaceId: string,
  ): Promise<WorkspaceRecord | undefined> {
    const result = await this.db.query<WorkspaceRow>(
      `select id, name, slug
       from public.workspaces
       where id = $1`,
      [workspaceId],
    );
    const row = result.rows[0];
    return row ? mapWorkspace(row) : undefined;
  }

  async updateWorkspaceName(workspaceId: string, name: string): Promise<void> {
    await this.db.query(
      `update public.workspaces
       set name = $2,
           updated_at = now()
       where id = $1`,
      [workspaceId, name],
    );
  }

  async createUser(input: {
    readonly authProvider: "supabase";
    readonly authSubjectId: string;
    readonly email?: string;
  }): Promise<FlowUserRecord> {
    const result = await this.db.query<UserRow>(
      `insert into public.users (auth_provider, auth_subject_id, email)
       values ($1, $2::uuid, $3)
       on conflict (auth_provider, auth_subject_id) do update
         set email = coalesce(excluded.email, public.users.email),
             updated_at = now()
       returning id, auth_provider, auth_subject_id, email`,
      [input.authProvider, input.authSubjectId, input.email ?? null],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to create Flow user.");
    }
    return mapUser(row);
  }

  async createWorkspace(input: {
    readonly name: string;
    readonly slug: string;
  }): Promise<WorkspaceRecord> {
    const result = await this.db.query<WorkspaceRow>(
      `insert into public.workspaces (name, slug)
       values ($1, $2)
       returning id, name, slug`,
      [input.name, input.slug],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to create workspace.");
    }
    return mapWorkspace(row);
  }

  async createRole(input: {
    readonly workspaceId: string;
    readonly key: string;
    readonly name: string;
    readonly permissionKeys: readonly string[];
  }): Promise<RoleRecord> {
    const roleResult = await this.db.query<RoleRow>(
      `insert into public.roles (workspace_id, key, name)
       values ($1, $2, $3)
       returning id, workspace_id, key, name`,
      [input.workspaceId, input.key, input.name],
    );
    const role = roleResult.rows[0];
    if (!role) {
      throw new Error("Failed to create workspace role.");
    }

    if (input.permissionKeys.length > 0) {
      await this.db.query(
        `insert into public.role_permissions (role_id, permission_id)
         select $1, permission.id
         from public.permissions permission
         where permission.key = any($2::text[])
         on conflict do nothing`,
        [role.id, [...input.permissionKeys]],
      );
    }

    return mapRole(role);
  }

  async createMembership(input: {
    readonly workspaceId: string;
    readonly userId: string;
    readonly roleIds: readonly string[];
  }): Promise<WorkspaceMembershipRecord> {
    const membershipResult = await this.db.query<MembershipRow>(
      `insert into public.workspace_memberships (workspace_id, user_id, status)
       values ($1, $2, 'ACTIVE')
       returning id, workspace_id, user_id, status, created_at, updated_at`,
      [input.workspaceId, input.userId],
    );
    const membership = membershipResult.rows[0];
    if (!membership) {
      throw new Error("Failed to create workspace membership.");
    }

    for (const roleId of input.roleIds) {
      await this.db.query(
        `insert into public.membership_roles (membership_id, role_id)
         values ($1, $2)
         on conflict do nothing`,
        [membership.id, roleId],
      );
    }

    return mapMembership(membership);
  }
}
