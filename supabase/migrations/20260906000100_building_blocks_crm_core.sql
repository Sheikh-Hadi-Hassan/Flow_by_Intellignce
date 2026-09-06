-- AI-composable building blocks and CRM Core reference tables.
-- Reuses crm_clients / crm_contacts. Does not create per-workspace schemas.

insert into public.permissions (key, description)
values
  ('building_block.read', 'Read building-block manifests, recommendations, and installations.'),
  ('building_block.configure', 'Prepare configuration for a building block.'),
  ('building_block.approve', 'Approve activation of a building block.'),
  ('building_block.suspend', 'Suspend an active building block without deleting records.'),
  ('crm.duplicate.propose', 'Propose duplicate client merges.'),
  ('crm.duplicate.merge', 'Approve and apply duplicate client merges.')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in (
    'building_block.read',
    'building_block.configure',
    'building_block.approve',
    'building_block.suspend',
    'crm.duplicate.propose',
    'crm.duplicate.merge'
  )
where role.key in ('OWNER', 'FOUNDER')
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
  'crm.core',
  '1.0.0',
  'CRM Core',
  'Client organisations, contacts, relationship history, segments, and duplicate review.',
  'commercial',
  'ACTIVE',
  '["crm.client","crm.contact"]'::jsonb,
  '[]'::jsonb,
  '["crm.client","crm.contact","crm.interaction"]'::jsonb,
  '["client.read","client.manage"]'::jsonb
)
on conflict (module_key) do nothing;

alter table public.crm_clients
  add column if not exists owner_user_id uuid,
  add column if not exists client_type text,
  add column if not exists lifecycle_stage text not null default 'active',
  add column if not exists demo_key text,
  add column if not exists health_score integer,
  add column if not exists last_interaction_label text,
  add column if not exists days_since_interaction integer,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists is_demo boolean not null default false;

alter table public.crm_clients
  drop constraint if exists crm_clients_lifecycle_stage_check;

alter table public.crm_clients
  add constraint crm_clients_lifecycle_stage_check
  check (lifecycle_stage in ('lead', 'active', 'dormant', 'at_risk', 'former'));

create unique index if not exists crm_clients_workspace_demo_key_idx
  on public.crm_clients(workspace_id, demo_key)
  where demo_key is not null;

create table if not exists public.workspace_building_block_installations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  block_id text not null references public.module_definitions(module_key) on delete restrict,
  block_version text not null,
  status text not null,
  configuration jsonb not null default '{}'::jsonb,
  proposed_by uuid references public.users(id) on delete restrict,
  approved_by uuid references public.users(id) on delete restrict,
  proposed_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, block_id),
  constraint workspace_building_block_installations_status_check
    check (status in (
      'available',
      'recommended',
      'configuring',
      'awaiting_approval',
      'active',
      'suspended',
      'deprecated'
    )),
  constraint workspace_building_block_installations_configuration_object
    check (jsonb_typeof(configuration) = 'object')
);

create table if not exists public.building_block_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  block_id text not null references public.module_definitions(module_key) on delete restrict,
  reason text not null,
  requirement_evidence jsonb not null default '[]'::jsonb,
  recommended_configuration jsonb not null default '{}'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  confidence text not null,
  risks jsonb not null default '[]'::jsonb,
  alternatives jsonb not null default '[]'::jsonb,
  requires_human_approval boolean not null default true,
  created_at timestamptz not null default now(),
  constraint building_block_recommendations_confidence_check
    check (confidence in ('low', 'medium', 'high')),
  constraint building_block_recommendations_requires_approval
    check (requires_human_approval = true)
);

create table if not exists public.crm_interactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id uuid not null,
  actor_name text not null,
  kind text not null,
  summary text not null,
  at_label text not null,
  days_ago integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (client_id, workspace_id)
    references public.crm_clients(id, workspace_id)
    on delete cascade,
  constraint crm_interactions_kind_check
    check (kind in ('email', 'meeting', 'note'))
);

create table if not exists public.crm_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  left_client_id uuid not null,
  right_client_id uuid not null,
  score integer not null,
  reason text not null,
  status text not null default 'open',
  proposed_by uuid references public.users(id) on delete restrict,
  approved_by uuid references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (workspace_id, left_client_id, right_client_id),
  constraint crm_duplicate_candidates_status_check
    check (status in ('open', 'proposed', 'merged')),
  constraint crm_duplicate_candidates_score_check
    check (score >= 0 and score <= 100)
);

create table if not exists public.crm_write_proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tool_name text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'proposed',
  created_by uuid not null references public.users(id) on delete restrict,
  approved_by uuid references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint crm_write_proposals_status_check
    check (status in ('proposed', 'approved', 'rejected'))
);

create index if not exists workspace_building_block_installations_workspace_idx
  on public.workspace_building_block_installations(workspace_id, status);

create index if not exists crm_interactions_workspace_client_idx
  on public.crm_interactions(workspace_id, client_id);

create index if not exists crm_duplicate_candidates_workspace_idx
  on public.crm_duplicate_candidates(workspace_id, status);

alter table public.workspace_building_block_installations enable row level security;
alter table public.building_block_recommendations enable row level security;
alter table public.crm_interactions enable row level security;
alter table public.crm_duplicate_candidates enable row level security;
alter table public.crm_write_proposals enable row level security;

create policy building_block_installations_read
  on public.workspace_building_block_installations for select to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'building_block.read')
    or flow_private.has_active_membership(workspace_id)
  );

create policy building_block_installations_insert
  on public.workspace_building_block_installations for insert to authenticated
  with check (
    flow_private.has_workspace_permission(workspace_id, 'building_block.configure')
    or flow_private.has_workspace_permission(workspace_id, 'building_block.approve')
  );

create policy building_block_installations_update
  on public.workspace_building_block_installations for update to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'building_block.configure')
    or flow_private.has_workspace_permission(workspace_id, 'building_block.approve')
    or flow_private.has_workspace_permission(workspace_id, 'building_block.suspend')
  )
  with check (
    flow_private.has_workspace_permission(workspace_id, 'building_block.configure')
    or flow_private.has_workspace_permission(workspace_id, 'building_block.approve')
    or flow_private.has_workspace_permission(workspace_id, 'building_block.suspend')
  );

create policy building_block_recommendations_read
  on public.building_block_recommendations for select to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'building_block.read'));

create policy building_block_recommendations_write
  on public.building_block_recommendations for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'building_block.configure'));

create policy crm_interactions_read
  on public.crm_interactions for select to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy crm_interactions_insert
  on public.crm_interactions for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'client.manage'));

create policy crm_duplicate_candidates_read
  on public.crm_duplicate_candidates for select to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'crm.duplicate.propose')
    or flow_private.has_workspace_permission(workspace_id, 'client.read'));

create policy crm_duplicate_candidates_write
  on public.crm_duplicate_candidates for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'crm.duplicate.propose'));

create policy crm_duplicate_candidates_update
  on public.crm_duplicate_candidates for update to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'crm.duplicate.propose')
    or flow_private.has_workspace_permission(workspace_id, 'crm.duplicate.merge')
  )
  with check (
    flow_private.has_workspace_permission(workspace_id, 'crm.duplicate.propose')
    or flow_private.has_workspace_permission(workspace_id, 'crm.duplicate.merge')
  );

create policy crm_write_proposals_read
  on public.crm_write_proposals for select to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy crm_write_proposals_insert
  on public.crm_write_proposals for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'client.manage')
    or flow_private.has_workspace_permission(workspace_id, 'crm.duplicate.propose'));

create policy crm_write_proposals_update
  on public.crm_write_proposals for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'crm.duplicate.merge')
    or flow_private.has_workspace_permission(workspace_id, 'client.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'crm.duplicate.merge')
    or flow_private.has_workspace_permission(workspace_id, 'client.manage'));
