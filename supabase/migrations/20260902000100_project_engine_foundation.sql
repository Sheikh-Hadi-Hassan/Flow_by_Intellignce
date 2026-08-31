-- Phase 4 project engine foundation. Additive only.

insert into public.permissions (key, description)
values
  ('project.manage', 'Create and edit project drafts.'),
  ('project.approve', 'Approve project plans for publication.'),
  ('project.publish', 'Publish and activate approved project plans.'),
  ('project.assign', 'Manually assign team members to project tasks.')
on conflict (key) do nothing;

alter table public.crm_opportunities
  drop constraint if exists crm_opportunities_status_check;

alter table public.crm_opportunities
  add constraint crm_opportunities_status_check
  check (journey_status in (
    'collecting_information',
    'missing_information',
    'ready_for_brief',
    'brief_draft',
    'founder_review',
    'changes_requested',
    'approved',
    'proposal_in_progress',
    'proposal_accepted',
    'contract_executed',
    'project_in_progress',
    'project_published',
    'project_active'
  ));

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null,
  contract_version_id uuid not null,
  name text not null,
  status text not null default 'draft',
  currency text not null,
  revision integer not null default 1,
  plan_hash text,
  approved_at timestamptz,
  approved_by uuid references public.users(id) on delete set null,
  published_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade,
  foreign key (contract_version_id, workspace_id)
    references public.contract_versions(id, workspace_id)
    on delete restrict,
  constraint projects_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint projects_status_check check (status in (
    'draft', 'in_review', 'changes_requested', 'approved',
    'published', 'active', 'on_hold', 'completed', 'archived'
  ))
);

create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  phase_key text not null,
  name text not null,
  sort_order integer not null default 0,
  status text not null default 'planned',
  unique (id, workspace_id),
  unique (project_id, phase_key),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint project_phases_status_check
    check (status in ('planned', 'active', 'complete'))
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  phase_id uuid not null,
  milestone_key text not null,
  name text not null,
  due_offset_days integer not null default 0,
  sort_order integer not null default 0,
  status text not null default 'pending',
  unique (id, workspace_id),
  unique (project_id, milestone_key),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (phase_id, workspace_id)
    references public.project_phases(id, workspace_id)
    on delete cascade,
  constraint project_milestones_status_check
    check (status in ('pending', 'met', 'missed'))
);

create table public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  phase_id uuid not null,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  unique (id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (phase_id, workspace_id)
    references public.project_phases(id, workspace_id)
    on delete cascade
);

create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  deliverable_id uuid not null,
  task_key text not null,
  name text not null,
  status text not null default 'todo',
  estimated_minutes integer not null default 0,
  sort_order integer not null default 0,
  unique (id, workspace_id),
  unique (project_id, task_key),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (deliverable_id, workspace_id)
    references public.project_deliverables(id, workspace_id)
    on delete cascade,
  constraint project_tasks_status_check
    check (status in ('todo', 'in_progress', 'in_review', 'done', 'cancelled')),
  constraint project_tasks_minutes_check check (estimated_minutes >= 0)
);

create table public.project_task_dependencies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  task_id uuid not null,
  depends_on_task_id uuid not null,
  unique (id, workspace_id),
  unique (task_id, depends_on_task_id),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (task_id, workspace_id)
    references public.project_tasks(id, workspace_id)
    on delete cascade,
  foreign key (depends_on_task_id, workspace_id)
    references public.project_tasks(id, workspace_id)
    on delete cascade
);

create table public.project_role_requirements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  task_id uuid not null,
  role_key text not null,
  estimated_minutes integer not null default 0,
  required_count integer not null default 1,
  unique (id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (task_id, workspace_id)
    references public.project_tasks(id, workspace_id)
    on delete cascade,
  constraint project_role_requirements_check
    check (estimated_minutes >= 0 and required_count > 0)
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  task_id uuid not null,
  role_key text not null,
  assignee_label text not null,
  assigned_by uuid references public.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (task_id, role_key),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (task_id, workspace_id)
    references public.project_tasks(id, workspace_id)
    on delete cascade
);

create table public.project_recommendation_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  task_id uuid not null,
  role_key text not null,
  suggested_assignee_label text not null,
  confidence_bps integer not null default 5000,
  rationale text not null default '',
  status text not null default 'draft',
  unique (id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  foreign key (task_id, workspace_id)
    references public.project_tasks(id, workspace_id)
    on delete cascade,
  constraint project_recommendation_drafts_status_check
    check (status in ('draft')),
  constraint project_recommendation_drafts_confidence_check
    check (confidence_bps >= 0 and confidence_bps <= 10000)
);

create index projects_workspace_opp_idx
  on public.projects(workspace_id, opportunity_id);
create index projects_workspace_status_idx
  on public.projects(workspace_id, status);
create index project_tasks_workspace_project_idx
  on public.project_tasks(workspace_id, project_id);

create or replace function flow_private.prevent_published_project_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_status text;
begin
  select status into parent_status
  from public.projects
  where id = coalesce(new.project_id, old.project_id)
    and workspace_id = coalesce(new.workspace_id, old.workspace_id);

  if parent_status in ('published', 'active', 'on_hold', 'completed', 'archived') then
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    raise exception 'published project structure is immutable';
  end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger project_phases_immutable
  before update or delete on public.project_phases
  for each row execute function flow_private.prevent_published_project_mutation();

create trigger project_milestones_immutable
  before update or delete on public.project_milestones
  for each row execute function flow_private.prevent_published_project_mutation();

create trigger project_deliverables_immutable
  before update or delete on public.project_deliverables
  for each row execute function flow_private.prevent_published_project_mutation();

create trigger project_tasks_immutable
  before update or delete on public.project_tasks
  for each row execute function flow_private.prevent_published_project_mutation();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'projects',
    'project_phases',
    'project_milestones',
    'project_deliverables',
    'project_tasks',
    'project_task_dependencies',
    'project_role_requirements',
    'project_assignments',
    'project_recommendation_drafts'
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

create policy projects_write
  on public.projects for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'project.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'project.manage'));

create policy project_phases_write
  on public.project_phases for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'project.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'project.manage'));

create policy project_milestones_write
  on public.project_milestones for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'project.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'project.manage'));

create policy project_deliverables_write
  on public.project_deliverables for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'project.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'project.manage'));

create policy project_tasks_write
  on public.project_tasks for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'project.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'project.manage'));

create policy project_dependencies_write
  on public.project_task_dependencies for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'project.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'project.manage'));

create policy project_role_requirements_write
  on public.project_role_requirements for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'project.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'project.manage'));

create policy project_assignments_write
  on public.project_assignments for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'project.assign'))
  with check (flow_private.has_workspace_permission(workspace_id, 'project.assign'));

create policy project_recommendation_drafts_write
  on public.project_recommendation_drafts for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'project.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'project.manage'));

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in (
    'project.manage',
    'project.approve',
    'project.publish',
    'project.assign'
  )
where role.key in ('FOUNDER', 'OWNER')
on conflict do nothing;
