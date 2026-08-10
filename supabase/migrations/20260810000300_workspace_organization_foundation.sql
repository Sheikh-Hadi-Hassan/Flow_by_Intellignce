-- Flow workspace and organization foundation.
-- Workspace remains the tenant/security boundary. Organization is a business entity inside it.

alter table public.workspaces
  add column if not exists primary_organization_id uuid,
  add column if not exists default_timezone text,
  add column if not exists default_locale text,
  add column if not exists default_currency text;

alter table public.workspace_memberships
  add column if not exists primary_organization_id uuid,
  add column if not exists primary_organization_unit_id uuid,
  add column if not exists business_title text;

alter table public.workspace_memberships
  add constraint workspace_memberships_id_workspace_unique
  unique (id, workspace_id);

create table public.organizations (
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
    check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  constraint organizations_classification_source_check
    check (
      classification_source is null
      or classification_source in ('USER_CONFIRMED', 'AI_SUGGESTED', 'SYSTEM_TEMPLATE')
    )
);

alter table public.workspaces
  add constraint workspaces_primary_organization_fk
  foreign key (primary_organization_id, id)
  references public.organizations(id, workspace_id)
  deferrable initially deferred;

alter table public.workspace_memberships
  add constraint workspace_memberships_primary_organization_fk
  foreign key (primary_organization_id, workspace_id)
  references public.organizations(id, workspace_id)
  deferrable initially deferred;

create table public.organization_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid not null,
  parent_unit_id uuid,
  name text not null,
  type text not null default 'OTHER',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (id, organization_id, workspace_id),
  foreign key (organization_id, workspace_id)
    references public.organizations(id, workspace_id)
    on delete restrict,
  foreign key (parent_unit_id, organization_id, workspace_id)
    references public.organization_units(id, organization_id, workspace_id)
    on delete restrict,
  constraint organization_units_parent_not_self
    check (parent_unit_id is null or parent_unit_id <> id),
  constraint organization_units_status_check
    check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  constraint organization_units_type_check
    check (type in ('DIVISION', 'DEPARTMENT', 'TEAM', 'BRANCH', 'OTHER'))
);

alter table public.workspace_memberships
  add constraint workspace_memberships_primary_unit_fk
  foreign key (primary_organization_unit_id, workspace_id)
  references public.organization_units(id, workspace_id)
  deferrable initially deferred;

create table public.organization_locations (
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

create table public.organization_unit_memberships (
  workspace_membership_id uuid not null,
  organization_unit_id uuid not null,
  workspace_id uuid not null,
  relationship_type text,
  business_title text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (workspace_membership_id, organization_unit_id),
  foreign key (workspace_membership_id, workspace_id)
    references public.workspace_memberships(id, workspace_id)
    on delete cascade,
  foreign key (organization_unit_id, workspace_id)
    references public.organization_units(id, workspace_id)
    on delete cascade
);

create index organizations_workspace_status_idx
  on public.organizations(workspace_id, status);

create index organization_units_workspace_organization_idx
  on public.organization_units(workspace_id, organization_id);

create index organization_units_parent_idx
  on public.organization_units(parent_unit_id);

create index organization_locations_workspace_organization_idx
  on public.organization_locations(workspace_id, organization_id);

alter table public.organizations enable row level security;
alter table public.organization_units enable row level security;
alter table public.organization_locations enable row level security;
alter table public.organization_unit_memberships enable row level security;

create or replace function flow_private.prevent_organization_unit_cycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cursor_parent uuid;
begin
  if new.parent_unit_id is null then
    return new;
  end if;

  cursor_parent := new.parent_unit_id;
  while cursor_parent is not null loop
    if cursor_parent = new.id then
      raise exception 'organization unit hierarchy cycle rejected';
    end if;

    select parent_unit_id
      into cursor_parent
    from public.organization_units
    where id = cursor_parent
      and workspace_id = new.workspace_id
      and organization_id = new.organization_id;
  end loop;

  return new;
end;
$$;

revoke all on function flow_private.prevent_organization_unit_cycle() from public;

create trigger organization_units_prevent_cycle
  before insert or update of parent_unit_id, organization_id, workspace_id
  on public.organization_units
  for each row
  execute function flow_private.prevent_organization_unit_cycle();

create policy "members can read organizations in active workspaces"
  on public.organizations
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "organization creators can insert organizations"
  on public.organizations
  for insert
  to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'organization.create'));

create policy "organization updaters can update organizations"
  on public.organizations
  for update
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'organization.update_profile'))
  with check (flow_private.has_workspace_permission(workspace_id, 'organization.update_profile'));

create policy "members can read organization units"
  on public.organization_units
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "organization unit creators can insert units"
  on public.organization_units
  for insert
  to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'organization_unit.create'));

create policy "organization unit updaters can update units"
  on public.organization_units
  for update
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'organization_unit.update'))
  with check (flow_private.has_workspace_permission(workspace_id, 'organization_unit.update'));

create policy "members can read organization locations"
  on public.organization_locations
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "location managers can manage locations"
  on public.organization_locations
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'location.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'location.manage'));

create policy "members can read organization unit memberships"
  on public.organization_unit_memberships
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "member managers can manage organization unit memberships"
  on public.organization_unit_memberships
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'member.update'))
  with check (flow_private.has_workspace_permission(workspace_id, 'member.update'));

insert into public.permissions (key, description)
values
  ('organization.read', 'Read organization context.'),
  ('organization.create', 'Create organizations inside a workspace.'),
  ('organization.update_profile', 'Update safe organization profile fields.'),
  ('organization.archive', 'Archive an organization.'),
  ('organization_unit.read', 'Read organization units.'),
  ('organization_unit.create', 'Create organization units.'),
  ('organization_unit.update', 'Update organization units.'),
  ('organization_unit.archive', 'Archive organization units.'),
  ('location.read', 'Read organization locations.'),
  ('location.manage', 'Manage organization locations.')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in (
    'organization.read',
    'organization.create',
    'organization.update_profile',
    'organization.archive',
    'organization_unit.read',
    'organization_unit.create',
    'organization_unit.update',
    'organization_unit.archive',
    'location.read',
    'location.manage'
  )
where role.key = 'OWNER'
on conflict do nothing;
