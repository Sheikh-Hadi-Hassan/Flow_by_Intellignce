-- Flow identity, authorization, and tenant-isolation foundation.
-- Supabase Auth provides authentication. Flow tables below own authorization.

create extension if not exists "pgcrypto";

drop table if exists public.workspace_memberships cascade;
drop table if exists public.profiles cascade;

create schema if not exists flow_private;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_provider text not null,
  auth_subject_id uuid not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_provider, auth_subject_id)
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  constraint workspace_memberships_status_check
    check (status in ('ACTIVE', 'SUSPENDED'))
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.membership_roles (
  membership_id uuid not null references public.workspace_memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id)
);

create index users_auth_subject_idx
  on public.users(auth_provider, auth_subject_id);

create index workspace_memberships_user_workspace_idx
  on public.workspace_memberships(user_id, workspace_id);

create index workspace_memberships_workspace_status_idx
  on public.workspace_memberships(workspace_id, status);

create index roles_workspace_idx
  on public.roles(workspace_id);

create index role_permissions_permission_idx
  on public.role_permissions(permission_id);

create index membership_roles_role_idx
  on public.membership_roles(role_id);

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.membership_roles enable row level security;

create or replace function flow_private.current_flow_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id
  from public.users
  where auth_provider = 'supabase'
    and auth_subject_id = (select auth.uid())
  limit 1
$$;

create or replace function flow_private.has_active_membership(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = target_workspace_id
      and membership.user_id = flow_private.current_flow_user_id()
      and membership.status = 'ACTIVE'
  )
$$;

create or replace function flow_private.has_workspace_permission(
  target_workspace_id uuid,
  permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    join public.membership_roles membership_role
      on membership_role.membership_id = membership.id
    join public.roles role
      on role.id = membership_role.role_id
     and role.workspace_id = membership.workspace_id
    join public.role_permissions role_permission
      on role_permission.role_id = role.id
    join public.permissions permission
      on permission.id = role_permission.permission_id
    where membership.workspace_id = target_workspace_id
      and membership.user_id = flow_private.current_flow_user_id()
      and membership.status = 'ACTIVE'
      and permission.key = permission_key
  )
$$;

revoke all on function flow_private.current_flow_user_id() from public;
revoke all on function flow_private.has_active_membership(uuid) from public;
revoke all on function flow_private.has_workspace_permission(uuid, text) from public;

grant usage on schema flow_private to authenticated;
grant execute on function flow_private.current_flow_user_id() to authenticated;
grant execute on function flow_private.has_active_membership(uuid) to authenticated;
grant execute on function flow_private.has_workspace_permission(uuid, text) to authenticated;

create policy "users can read their own flow user"
  on public.users
  for select
  to authenticated
  using (id = flow_private.current_flow_user_id());

create policy "members can read active workspaces"
  on public.workspaces
  for select
  to authenticated
  using (flow_private.has_active_membership(id));

create policy "workspace managers can update workspaces"
  on public.workspaces
  for update
  to authenticated
  using (flow_private.has_workspace_permission(id, 'workspace.manage'))
  with check (flow_private.has_workspace_permission(id, 'workspace.manage'));

create policy "members can read memberships in active workspaces"
  on public.workspace_memberships
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "member inviters can create memberships"
  on public.workspace_memberships
  for insert
  to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'member.invite'));

create policy "member managers can update memberships"
  on public.workspace_memberships
  for update
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'member.update'))
  with check (flow_private.has_workspace_permission(workspace_id, 'member.update'));

create policy "members can read roles in active workspaces"
  on public.roles
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "members can read permission catalog"
  on public.permissions
  for select
  to authenticated
  using (true);

create policy "members can read role permissions in active workspaces"
  on public.role_permissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.roles role
      where role.id = role_permissions.role_id
        and flow_private.has_active_membership(role.workspace_id)
    )
  );

create policy "members can read membership roles in active workspaces"
  on public.membership_roles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.id = membership_roles.membership_id
        and flow_private.has_active_membership(membership.workspace_id)
    )
  );

insert into public.permissions (key, description)
values
  ('workspace.read', 'Read workspace metadata.'),
  ('workspace.manage', 'Update workspace settings.'),
  ('member.read', 'Read workspace memberships.'),
  ('member.invite', 'Invite or add workspace members.'),
  ('member.update', 'Update workspace member state.'),
  ('system.echo', 'Execute the system echo proof action.')
on conflict (key) do nothing;
