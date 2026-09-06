-- BB-01 Business Registry. Extends organizations / organization_locations.
-- Does not create a parallel legal-entity or company identity table.

insert into public.permissions (key, description)
values
  ('registry.document.manage', 'Manage business registration document metadata.'),
  ('registry.tax.manage', 'Manage masked tax and banking metadata.'),
  ('registry.signatory.manage', 'Manage authorised signatories.'),
  ('registry.compliance.manage', 'Assign compliance owners and obligations.')
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
    'location.manage',
    'registry.document.manage',
    'registry.tax.manage',
    'registry.signatory.manage',
    'registry.compliance.manage'
  )
where role.key in ('OWNER', 'FOUNDER')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in ('organization.read', 'location.read', 'registry.tax.manage')
where role.key in ('FINANCE')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in ('organization.read', 'location.read', 'location.manage')
where role.key in ('OPERATIONS', 'OPERATOR')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in ('organization.read')
where role.key in ('EMPLOYEE', 'MEMBER')
on conflict do nothing;

insert into public.module_definitions (
  module_key,
  version,
  name,
  description,
  category,
  status,
  capabilities,
  dependencies,
  entity_types,
  actions
)
values (
  'registry.business',
  '1.0.0',
  'Business Registry',
  'Canonical workspace organisation profile, locations, and compliance metadata.',
  'foundation',
  'ACTIVE',
  '["organization.profile","organization.location"]'::jsonb,
  '[]'::jsonb,
  '["organization","organization_location"]'::jsonb,
  '["organization.read","organization.update_profile","location.manage"]'::jsonb
)
on conflict (module_key) do nothing;

alter table public.organizations
  add column if not exists demo_key text,
  add column if not exists is_demo boolean not null default false,
  add column if not exists fictional_label text,
  add column if not exists trading_name text,
  add column if not exists entity_type text,
  add column if not exists registration_number text,
  add column if not exists operating_jurisdiction text,
  add column if not exists legal_status text,
  add column if not exists formation_date date,
  add column if not exists fiscal_year_label text,
  add column if not exists business_model text,
  add column if not exists firmographics jsonb not null default '{}'::jsonb,
  add column if not exists tax_metadata jsonb not null default '[]'::jsonb,
  add column if not exists bank_metadata jsonb not null default '[]'::jsonb,
  add column if not exists ownership jsonb not null default '[]'::jsonb;

create unique index if not exists organizations_workspace_demo_key_idx
  on public.organizations(workspace_id, demo_key)
  where demo_key is not null;

alter table public.organization_locations
  add column if not exists demo_key text,
  add column if not exists is_primary boolean not null default false,
  add column if not exists is_registration_correspondence boolean not null default false,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists postal_code text,
  add column if not exists work_mode text,
  add column if not exists operating_hours text,
  add column if not exists primary_contact_name text,
  add column if not exists departments_supported text[] not null default '{}'::text[],
  add column if not exists function_note text,
  add column if not exists start_date date,
  add column if not exists is_demo boolean not null default false;

create unique index if not exists organization_locations_workspace_demo_key_idx
  on public.organization_locations(workspace_id, demo_key)
  where demo_key is not null;

create unique index if not exists organization_locations_one_primary_idx
  on public.organization_locations(workspace_id, organization_id)
  where is_primary = true and status = 'ACTIVE';

create table if not exists public.organization_compliance_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid not null,
  demo_key text,
  record_type text not null,
  title text not null,
  status text not null,
  issued_date date,
  effective_date date,
  expiry_or_review_date date,
  reminder_date date,
  reference text not null,
  owner_member_id text,
  owner_name text,
  version text not null default '1',
  evidence_note text,
  binary_deferred boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (organization_id, workspace_id)
    references public.organizations(id, workspace_id)
    on delete restrict,
  constraint organization_compliance_reference_demo_check
    check (reference like 'DEMO-%')
);

create unique index if not exists organization_compliance_workspace_demo_key_idx
  on public.organization_compliance_records(workspace_id, demo_key)
  where demo_key is not null;

create table if not exists public.organization_signatories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid not null,
  member_id text,
  name text not null,
  title text,
  can_sign_contracts boolean not null default false,
  authority text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (organization_id, workspace_id)
    references public.organizations(id, workspace_id)
    on delete restrict
);

create table if not exists public.organization_registry_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid,
  actor_id text not null,
  actor_name text,
  action text not null,
  record_type text not null,
  record_id text not null,
  previous_value text,
  new_value text,
  reason text,
  occurred_at timestamptz not null,
  unique (id, workspace_id)
);

create index if not exists organization_registry_audit_workspace_time_idx
  on public.organization_registry_audit_events(workspace_id, occurred_at);

alter table public.organization_compliance_records enable row level security;
alter table public.organization_signatories enable row level security;
alter table public.organization_registry_audit_events enable row level security;

create policy "members can read organization compliance records"
  on public.organization_compliance_records
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "document managers can manage organization compliance records"
  on public.organization_compliance_records
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'registry.document.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'registry.document.manage'));

create policy "members can read organization signatories"
  on public.organization_signatories
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "signatory managers can manage organization signatories"
  on public.organization_signatories
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'registry.signatory.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'registry.signatory.manage'));

create policy "members can read organization registry audit"
  on public.organization_registry_audit_events
  for select
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'organization.read'));

create policy "profile managers can append organization registry audit"
  on public.organization_registry_audit_events
  for insert
  to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'organization.update_profile')
    or flow_private.has_workspace_permission(workspace_id, 'location.manage')
    or flow_private.has_workspace_permission(workspace_id, 'registry.document.manage'));

create or replace function flow_private.prevent_organization_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'Canonical organization identity cannot be deleted.';
end;
$$;

drop trigger if exists organizations_prevent_delete on public.organizations;
create trigger organizations_prevent_delete
before delete on public.organizations
for each row
execute function flow_private.prevent_organization_delete();
