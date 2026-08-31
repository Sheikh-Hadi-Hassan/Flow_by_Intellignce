-- Flow BLM skill framework persistence foundation.
-- Adds governed skill/expertise release storage and workspace-scoped installations.

create schema if not exists flow_internal;

revoke all on schema flow_internal from public;
revoke all on schema flow_internal from anon;
revoke all on schema flow_internal from authenticated;

alter table flow_internal.workspace_runtime_manifests
  add column if not exists available_skill_ids jsonb not null default '[]'::jsonb,
  add column if not exists skill_versions jsonb not null default '{}'::jsonb,
  add column if not exists skill_fingerprints jsonb not null default '{}'::jsonb,
  add column if not exists available_erp_capability_ids jsonb not null default '[]'::jsonb,
  add column if not exists installed_expertise_pack_ids jsonb not null default '[]'::jsonb;

alter table flow_internal.workspace_runtime_slices
  add column if not exists skill_ids jsonb not null default '[]'::jsonb;

create table if not exists flow_internal.business_skill_releases (
  id uuid primary key default gen_random_uuid(),
  skill_id text not null,
  version text not null,
  status text not null,
  name text not null,
  description text not null,
  authority text not null,
  execution_mode text not null,
  risk text not null,
  domain_ids jsonb not null default '[]'::jsonb,
  required_concept_ids jsonb not null default '[]'::jsonb,
  required_logic_ids jsonb not null default '[]'::jsonb,
  required_policy_ids jsonb not null default '[]'::jsonb,
  required_erp_capabilities jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  evaluation_cases jsonb not null default '[]'::jsonb,
  action_wall_required boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  release jsonb not null,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint business_skill_releases_status_check
    check (status in ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'SUPERSEDED', 'REJECTED')),
  constraint business_skill_releases_authority_check
    check (authority in ('KNOWLEDGE_ONLY', 'LLM_ADVISORY', 'LLM_DRAFT', 'DETERMINISTIC_REQUIRED', 'APPROVAL_REQUIRED', 'EXECUTABLE')),
  constraint business_skill_releases_execution_mode_check
    check (execution_mode in ('KNOWLEDGE_REASONING', 'STRUCTURED_ANALYSIS', 'DOCUMENT_DRAFT', 'REQUIRED_CALCULATION', 'DECISION_SUPPORT', 'ACTION_PROPOSAL', 'WORKFLOW_PROPOSAL')),
  constraint business_skill_releases_risk_check
    check (risk in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  constraint business_skill_releases_json_checks
    check (
      jsonb_typeof(domain_ids) = 'array'
      and jsonb_typeof(required_concept_ids) = 'array'
      and jsonb_typeof(required_logic_ids) = 'array'
      and jsonb_typeof(required_policy_ids) = 'array'
      and jsonb_typeof(required_erp_capabilities) = 'array'
      and jsonb_typeof(dependencies) = 'array'
      and jsonb_typeof(evaluation_cases) = 'array'
      and jsonb_typeof(release) = 'object'
    ),
  constraint business_skill_releases_temporal_check
    check (effective_to is null or effective_to >= effective_from),
  unique (skill_id, version)
);

create table if not exists flow_internal.business_skill_dependencies (
  id uuid primary key default gen_random_uuid(),
  skill_id text not null,
  skill_version text not null,
  dependency_skill_id text not null,
  dependency_version_range text not null,
  required boolean not null default true,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint business_skill_dependencies_release_fk
    foreign key (skill_id, skill_version)
    references flow_internal.business_skill_releases(skill_id, version)
    on delete cascade,
  unique (skill_id, skill_version, dependency_skill_id, dependency_version_range)
);

create table if not exists flow_internal.industry_expertise_releases (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null,
  version text not null,
  status text not null,
  industry text not null,
  business_types jsonb not null default '[]'::jsonb,
  domain_ids jsonb not null default '[]'::jsonb,
  skill_ids jsonb not null default '[]'::jsonb,
  release jsonb not null,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint industry_expertise_releases_status_check
    check (status in ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'SUPERSEDED', 'REJECTED')),
  constraint industry_expertise_releases_json_checks
    check (
      jsonb_typeof(business_types) = 'array'
      and jsonb_typeof(domain_ids) = 'array'
      and jsonb_typeof(skill_ids) = 'array'
      and jsonb_typeof(release) = 'object'
    ),
  unique (pack_id, version)
);

create table if not exists public.workspace_skill_installations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  skill_id text not null,
  skill_version text not null,
  status text not null,
  installed_at timestamptz not null default now(),
  installed_by uuid references public.users(id) on delete set null,
  configuration jsonb not null default '{}'::jsonb,
  configuration_fingerprint text not null,
  runtime_fingerprint text,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_skill_installations_status_check
    check (status in ('INSTALLED', 'DISABLED', 'DEPRECATED', 'REMOVED')),
  constraint workspace_skill_installations_configuration_object
    check (jsonb_typeof(configuration) = 'object'),
  constraint workspace_skill_installations_temporal_check
    check (effective_to is null or effective_to >= effective_from),
  unique (workspace_id, skill_id, skill_version)
);

create table if not exists public.workspace_expertise_installations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  expertise_pack_id text not null,
  expertise_version text not null,
  status text not null,
  installed_at timestamptz not null default now(),
  installed_by uuid references public.users(id) on delete set null,
  configuration jsonb not null default '{}'::jsonb,
  configuration_fingerprint text not null,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_expertise_installations_status_check
    check (status in ('INSTALLED', 'DISABLED', 'DEPRECATED', 'REMOVED')),
  constraint workspace_expertise_installations_configuration_object
    check (jsonb_typeof(configuration) = 'object'),
  constraint workspace_expertise_installations_temporal_check
    check (effective_to is null or effective_to >= effective_from),
  unique (workspace_id, expertise_pack_id, expertise_version)
);

create index if not exists business_skill_releases_status_idx
  on flow_internal.business_skill_releases(status, skill_id, version);
create index if not exists business_skill_releases_required_logic_idx
  on flow_internal.business_skill_releases using gin (required_logic_ids);
create index if not exists business_skill_dependencies_dependency_idx
  on flow_internal.business_skill_dependencies(dependency_skill_id);
create index if not exists industry_expertise_releases_status_idx
  on flow_internal.industry_expertise_releases(status, industry);
create index if not exists workspace_skill_installations_workspace_idx
  on public.workspace_skill_installations(workspace_id, status);
create index if not exists workspace_skill_installations_skill_idx
  on public.workspace_skill_installations(skill_id, skill_version);
create index if not exists workspace_expertise_installations_workspace_idx
  on public.workspace_expertise_installations(workspace_id, status);
create index if not exists workspace_runtime_manifests_available_skill_ids_idx
  on flow_internal.workspace_runtime_manifests using gin (available_skill_ids);
create index if not exists workspace_runtime_slices_skill_ids_idx
  on flow_internal.workspace_runtime_slices using gin (skill_ids);

create or replace function flow_internal.reject_immutable_business_skill_release_mutation()
returns trigger
language plpgsql
set search_path = flow_internal, public
as $$
begin
  if old.status in ('APPROVED', 'PUBLISHED') then
    raise exception 'approved business skill releases are immutable';
  end if;
  return old;
end;
$$;

create or replace trigger business_skill_releases_immutable_guard
before update or delete on flow_internal.business_skill_releases
for each row
execute function flow_internal.reject_immutable_business_skill_release_mutation();

create or replace function flow_internal.reject_immutable_industry_expertise_release_mutation()
returns trigger
language plpgsql
set search_path = flow_internal, public
as $$
begin
  if old.status in ('APPROVED', 'PUBLISHED') then
    raise exception 'approved industry expertise releases are immutable';
  end if;
  return old;
end;
$$;

create or replace trigger industry_expertise_releases_immutable_guard
before update or delete on flow_internal.industry_expertise_releases
for each row
execute function flow_internal.reject_immutable_industry_expertise_release_mutation();

alter table flow_internal.business_skill_releases enable row level security;
alter table flow_internal.business_skill_dependencies enable row level security;
alter table flow_internal.industry_expertise_releases enable row level security;
alter table public.workspace_skill_installations enable row level security;
alter table public.workspace_expertise_installations enable row level security;

create policy "members can read workspace skill installations"
  on public.workspace_skill_installations
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "skill installers can manage workspace skill installations"
  on public.workspace_skill_installations
  for all
  to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'skill.install')
    or flow_private.has_workspace_permission(workspace_id, 'runtime.manage')
  )
  with check (
    flow_private.has_workspace_permission(workspace_id, 'skill.install')
    or flow_private.has_workspace_permission(workspace_id, 'runtime.manage')
  );

create policy "members can read workspace expertise installations"
  on public.workspace_expertise_installations
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "expertise installers can manage workspace expertise installations"
  on public.workspace_expertise_installations
  for all
  to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'expertise.install')
    or flow_private.has_workspace_permission(workspace_id, 'runtime.manage')
  )
  with check (
    flow_private.has_workspace_permission(workspace_id, 'expertise.install')
    or flow_private.has_workspace_permission(workspace_id, 'runtime.manage')
  );

insert into public.permissions (key, description)
values
  ('skill.install', 'Install governed business skills for a workspace.'),
  ('expertise.install', 'Install governed expertise packs for a workspace.'),
  ('skill.read', 'Read workspace-installed governed business skill metadata.')
on conflict (key) do nothing;
