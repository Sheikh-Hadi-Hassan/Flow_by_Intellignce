-- Phase 1B workspace onboarding, twin snapshot, and user profile foundation.

create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  first_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_onboarding_states (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  current_step text not null default 'business',
  business jsonb not null default '{}'::jsonb,
  operations jsonb not null default '{}'::jsonb,
  services jsonb not null default '[]'::jsonb,
  policies jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_onboarding_states_business_object
    check (jsonb_typeof(business) = 'object'),
  constraint workspace_onboarding_states_operations_object
    check (jsonb_typeof(operations) = 'object'),
  constraint workspace_onboarding_states_services_array
    check (jsonb_typeof(services) = 'array'),
  constraint workspace_onboarding_states_policies_object
    check (jsonb_typeof(policies) = 'object')
);

create table if not exists public.workspace_twin_snapshots (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  snapshot jsonb not null,
  completeness integer not null default 0,
  confidence text not null default 'low',
  version integer not null default 1,
  compiled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_twin_snapshots_snapshot_object
    check (jsonb_typeof(snapshot) = 'object'),
  constraint workspace_twin_snapshots_confidence_check
    check (confidence in ('high', 'medium', 'low'))
);

create table if not exists public.workspace_preferences (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  accent_color text,
  locale text,
  currency text,
  country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_preferences_accent_check
    check (
      accent_color is null
      or accent_color ~ '^#[0-9a-fA-F]{6}$'
    ),
  constraint workspace_preferences_currency_check
    check (currency is null or currency ~ '^[A-Z]{3}$')
);

create index if not exists workspace_onboarding_states_completed_idx
  on public.workspace_onboarding_states(completed_at);

alter table public.user_profiles enable row level security;
alter table public.workspace_onboarding_states enable row level security;
alter table public.workspace_twin_snapshots enable row level security;
alter table public.workspace_preferences enable row level security;

create policy "users can read their own profile"
  on public.user_profiles
  for select
  to authenticated
  using (user_id = flow_private.current_flow_user_id());

create policy "users can update their own profile"
  on public.user_profiles
  for update
  to authenticated
  using (user_id = flow_private.current_flow_user_id())
  with check (user_id = flow_private.current_flow_user_id());

create policy "members can read onboarding in active workspaces"
  on public.workspace_onboarding_states
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "onboarding editors can update onboarding"
  on public.workspace_onboarding_states
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'onboarding.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'onboarding.manage'));

create policy "members can read twin snapshots"
  on public.workspace_twin_snapshots
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "members can read workspace preferences"
  on public.workspace_preferences
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "workspace managers can update preferences"
  on public.workspace_preferences
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'workspace.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'workspace.manage'));

insert into public.permissions (key, description)
values
  ('onboarding.read', 'Read workspace onboarding state.'),
  ('onboarding.manage', 'Create and update workspace onboarding state.'),
  ('twin.read', 'Read workspace Business Twin snapshot.'),
  ('twin.compile', 'Compile workspace Business Twin from onboarding.')
on conflict (key) do nothing;
