-- Phase 5 resource capacity foundation. Additive only.

insert into public.permissions (key, description)
values
  ('resource.read', 'View workspace resource profiles and staffing plans.'),
  ('resource.manage', 'Manage resource profiles, skills, and availability.'),
  ('resource.plan.manage', 'Create and edit project resource plans and draft assignments.'),
  ('resource.plan.approve', 'Approve project resource staffing plans.'),
  ('resource.plan.publish', 'Publish approved resource staffing plans.'),
  ('resource.cost.read', 'View authorized internal labour cost forecasts.'),
  ('resource.work.read', 'View own assigned workload.')
on conflict (key) do nothing;

create table public.resource_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  display_name text not null,
  resource_type text not null default 'employee',
  role_keys text[] not null default '{}',
  timezone text not null default 'UTC',
  workspace_membership_id uuid references public.workspace_memberships(id) on delete set null,
  internal_rate_minor bigint,
  currency text,
  status text not null default 'active',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  constraint resource_profiles_type_check
    check (resource_type in ('employee', 'contractor', 'vendor_linked')),
  constraint resource_profiles_status_check
    check (status in ('active', 'inactive', 'archived')),
  constraint resource_profiles_currency_check
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint resource_profiles_rate_check
    check (internal_rate_minor is null or internal_rate_minor >= 0)
);

create table public.workspace_skill_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  skill_key text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, skill_key),
  unique (id, workspace_id)
);

create table public.resource_profile_skills (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  resource_profile_id uuid not null,
  skill_key text not null,
  proficiency_bps integer not null default 5000,
  unique (id, workspace_id),
  unique (resource_profile_id, skill_key),
  foreign key (resource_profile_id, workspace_id)
    references public.resource_profiles(id, workspace_id)
    on delete cascade,
  constraint resource_profile_skills_bps_check
    check (proficiency_bps >= 0 and proficiency_bps <= 10000)
);

create table public.resource_working_schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  resource_profile_id uuid not null,
  day_of_week integer not null,
  start_minute integer not null,
  end_minute integer not null,
  unique (id, workspace_id),
  foreign key (resource_profile_id, workspace_id)
    references public.resource_profiles(id, workspace_id)
    on delete cascade,
  constraint resource_working_schedules_dow_check
    check (day_of_week >= 0 and day_of_week <= 6),
  constraint resource_working_schedules_minute_check
    check (
      start_minute >= 0 and start_minute < 1440
      and end_minute > 0 and end_minute <= 1440
      and end_minute > start_minute
    )
);

create table public.resource_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  resource_profile_id uuid not null,
  exception_type text not null default 'leave',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (resource_profile_id, workspace_id)
    references public.resource_profiles(id, workspace_id)
    on delete cascade,
  constraint resource_availability_exceptions_type_check
    check (exception_type in ('leave', 'unavailable', 'partial')),
  constraint resource_availability_exceptions_range_check
    check (ends_at > starts_at)
);

create table public.project_task_skill_requirements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  task_id uuid not null,
  skill_key text not null,
  min_proficiency_bps integer not null default 5000,
  unique (id, workspace_id),
  unique (task_id, skill_key),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (task_id, workspace_id)
    references public.project_tasks(id, workspace_id)
    on delete cascade,
  constraint project_task_skill_requirements_bps_check
    check (min_proficiency_bps >= 0 and min_proficiency_bps <= 10000)
);

create table public.project_resource_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  status text not null default 'draft',
  revision integer not null default 1,
  approved_at timestamptz,
  approved_by uuid references public.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (project_id, revision),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint project_resource_plans_status_check check (status in (
    'draft', 'recommendations_ready', 'founder_review',
    'changes_requested', 'approved', 'published'
  ))
);

create table public.resource_plan_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  resource_plan_id uuid not null,
  project_id uuid not null,
  task_id uuid not null,
  role_key text not null,
  resource_profile_id uuid,
  rank integer not null default 0,
  confidence_bps integer not null default 0,
  evidence jsonb not null default '{}',
  excluded_reason text,
  status text not null default 'draft',
  unique (id, workspace_id),
  foreign key (resource_plan_id, workspace_id)
    references public.project_resource_plans(id, workspace_id)
    on delete cascade,
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (task_id, workspace_id)
    references public.project_tasks(id, workspace_id)
    on delete cascade,
  foreign key (resource_profile_id, workspace_id)
    references public.resource_profiles(id, workspace_id)
    on delete set null,
  constraint resource_plan_recommendations_status_check
    check (status in ('draft')),
  constraint resource_plan_recommendations_confidence_check
    check (confidence_bps >= 0 and confidence_bps <= 10000)
);

create table public.resource_plan_assignment_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  resource_plan_id uuid not null,
  project_id uuid not null,
  task_id uuid not null,
  role_key text not null,
  resource_profile_id uuid not null,
  allocation_minutes integer not null default 0,
  status text not null default 'draft',
  unique (id, workspace_id),
  unique (resource_plan_id, task_id, role_key),
  foreign key (resource_plan_id, workspace_id)
    references public.project_resource_plans(id, workspace_id)
    on delete cascade,
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (task_id, workspace_id)
    references public.project_tasks(id, workspace_id)
    on delete cascade,
  foreign key (resource_profile_id, workspace_id)
    references public.resource_profiles(id, workspace_id)
    on delete restrict,
  constraint resource_plan_assignment_drafts_status_check
    check (status in ('draft', 'approved')),
  constraint resource_plan_assignment_drafts_minutes_check
    check (allocation_minutes >= 0)
);

create table public.resource_plan_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  resource_plan_id uuid not null,
  project_id uuid not null,
  version_number integer not null,
  plan_hash text not null,
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references public.users(id) on delete set null,
  unique (id, workspace_id),
  unique (resource_plan_id, version_number),
  foreign key (resource_plan_id, workspace_id)
    references public.project_resource_plans(id, workspace_id)
    on delete restrict,
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete restrict
);

create table public.resource_plan_guard_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  resource_plan_id uuid not null,
  project_id uuid not null,
  action text not null,
  outcome text not null,
  reason text not null default '',
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (resource_plan_id, workspace_id)
    references public.project_resource_plans(id, workspace_id)
    on delete cascade,
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint resource_plan_guard_decisions_outcome_check
    check (outcome in ('ALLOW', 'WARN', 'BLOCK'))
);

alter table public.project_assignments
  add column if not exists resource_profile_id uuid,
  add column if not exists allocation_minutes integer not null default 0,
  add column if not exists resource_plan_version_id uuid;

alter table public.project_assignments
  add constraint project_assignments_resource_fk
    foreign key (resource_profile_id, workspace_id)
    references public.resource_profiles(id, workspace_id)
    on delete set null;

alter table public.project_assignments
  add constraint project_assignments_version_fk
    foreign key (resource_plan_version_id, workspace_id)
    references public.resource_plan_versions(id, workspace_id)
    on delete set null;

alter table public.project_assignments
  add constraint project_assignments_minutes_check
    check (allocation_minutes >= 0);

create index resource_profiles_workspace_status_idx
  on public.resource_profiles(workspace_id, status);
create index resource_profiles_workspace_membership_idx
  on public.resource_profiles(workspace_id, workspace_membership_id)
  where workspace_membership_id is not null;
create index resource_profile_skills_workspace_resource_idx
  on public.resource_profile_skills(workspace_id, resource_profile_id);
create index resource_working_schedules_workspace_resource_idx
  on public.resource_working_schedules(workspace_id, resource_profile_id);
create index resource_availability_exceptions_workspace_resource_idx
  on public.resource_availability_exceptions(workspace_id, resource_profile_id);
create index resource_availability_exceptions_range_idx
  on public.resource_availability_exceptions(workspace_id, starts_at, ends_at);
create index project_task_skill_requirements_project_idx
  on public.project_task_skill_requirements(workspace_id, project_id);
create index project_resource_plans_workspace_project_idx
  on public.project_resource_plans(workspace_id, project_id);
create index project_resource_plans_workspace_status_idx
  on public.project_resource_plans(workspace_id, status);
create index resource_plan_recommendations_plan_idx
  on public.resource_plan_recommendations(workspace_id, resource_plan_id);
create index resource_plan_assignment_drafts_plan_idx
  on public.resource_plan_assignment_drafts(workspace_id, resource_plan_id);
create index resource_plan_assignment_drafts_resource_idx
  on public.resource_plan_assignment_drafts(workspace_id, resource_profile_id)
  where status = 'draft';
create index resource_plan_versions_project_idx
  on public.resource_plan_versions(workspace_id, project_id);

create or replace function flow_private.prevent_published_resource_plan_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    raise exception 'published resource plan versions are immutable';
  end if;
  return new;
end;
$$;

create trigger resource_plan_versions_immutable
  before update or delete on public.resource_plan_versions
  for each row execute function flow_private.prevent_published_resource_plan_version_mutation();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'resource_profiles',
    'workspace_skill_definitions',
    'resource_profile_skills',
    'resource_working_schedules',
    'resource_availability_exceptions',
    'project_task_skill_requirements',
    'project_resource_plans',
    'resource_plan_recommendations',
    'resource_plan_assignment_drafts',
    'resource_plan_versions',
    'resource_plan_guard_decisions'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (flow_private.has_active_membership(workspace_id))',
      tbl || '_read',
      tbl
    );
  end loop;
end
$$;

create policy resource_profiles_write
  on public.resource_profiles for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.manage'));

create policy workspace_skill_definitions_write
  on public.workspace_skill_definitions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.manage'));

create policy resource_profile_skills_write
  on public.resource_profile_skills for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.manage'));

create policy resource_working_schedules_write
  on public.resource_working_schedules for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.manage'));

create policy resource_availability_exceptions_write
  on public.resource_availability_exceptions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.manage'));

create policy project_task_skill_requirements_write
  on public.project_task_skill_requirements for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'));

create policy project_resource_plans_write
  on public.project_resource_plans for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'));

create policy resource_plan_recommendations_write
  on public.resource_plan_recommendations for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'));

create policy resource_plan_assignment_drafts_write
  on public.resource_plan_assignment_drafts for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'));

create policy resource_plan_versions_insert
  on public.resource_plan_versions for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.plan.publish'));

create policy resource_plan_guard_decisions_write
  on public.resource_plan_guard_decisions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'resource.plan.manage'));

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in (
    'resource.read',
    'resource.manage',
    'resource.plan.manage',
    'resource.plan.approve',
    'resource.plan.publish',
    'resource.cost.read',
    'resource.work.read'
  )
where role.key in ('FOUNDER', 'OWNER')
on conflict do nothing;
