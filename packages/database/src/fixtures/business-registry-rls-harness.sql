-- Isolated harness for DEMO-02D Business Registry RLS.
-- Not for production. Creates auth stubs + minimal tenant schema so
-- supabase/migrations/20260907000100_business_registry.sql (and the
-- DEMO-02D closure migration) can be applied and exercised with
-- authenticated JWT claims via set_config('request.jwt.claim.sub', ...).

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;

create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema if not exists flow_private;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_provider text not null,
  auth_subject_id uuid not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_provider, auth_subject_id)
);

create table if not exists public.workspace_memberships (
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

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.membership_roles (
  membership_id uuid not null references public.workspace_memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id)
);

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

alter table public.workspaces
  add column if not exists primary_organization_id uuid,
  add column if not exists default_timezone text,
  add column if not exists default_locale text,
  add column if not exists default_currency text;

alter table public.workspace_memberships
  add column if not exists primary_organization_id uuid,
  add column if not exists primary_organization_unit_id uuid,
  add column if not exists business_title text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workspace_memberships_id_workspace_unique'
  ) then
    alter table public.workspace_memberships
      add constraint workspace_memberships_id_workspace_unique
      unique (id, workspace_id);
  end if;
end
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  display_name text,
  legal_name text,
  slug text,
  status text not null default 'ACTIVE',
  country_code text,
  default_currency text,
  timezone text,
  website text,
  description text,
  primary_industry text,
  classification_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, slug),
  constraint organizations_status_check
    check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED'))
);

create table if not exists public.organization_locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid not null,
  name text not null,
  type text,
  country_code text not null,
  region text,
  city text,
  timezone text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, workspace_id)
    references public.organizations(id, workspace_id)
    on delete restrict,
  constraint organization_locations_status_check
    check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED'))
);

create table if not exists public.module_definitions (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  version text not null,
  name text not null,
  description text not null,
  category text,
  status text not null default 'ACTIVE',
  capabilities jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  entity_types jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  configuration_schema jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_locations enable row level security;

drop policy if exists "members can read organizations in active workspaces" on public.organizations;
create policy "members can read organizations in active workspaces"
  on public.organizations
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

drop policy if exists "organization creators can insert organizations" on public.organizations;
create policy "organization creators can insert organizations"
  on public.organizations
  for insert
  to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'organization.create'));

drop policy if exists "organization updaters can update organizations" on public.organizations;
create policy "organization updaters can update organizations"
  on public.organizations
  for update
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'organization.update_profile'))
  with check (flow_private.has_workspace_permission(workspace_id, 'organization.update_profile'));

drop policy if exists "members can read organization locations" on public.organization_locations;
create policy "members can read organization locations"
  on public.organization_locations
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

drop policy if exists "location managers can manage locations" on public.organization_locations;
create policy "location managers can manage locations"
  on public.organization_locations
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'location.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'location.manage'));

insert into public.permissions (key, description)
values
  ('organization.read', 'Read organization context.'),
  ('organization.create', 'Create organizations inside a workspace.'),
  ('organization.update_profile', 'Update safe organization profile fields.'),
  ('organization.archive', 'Archive an organization.'),
  ('location.read', 'Read organization locations.'),
  ('location.manage', 'Manage organization locations.')
on conflict (key) do nothing;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
