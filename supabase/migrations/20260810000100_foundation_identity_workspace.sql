-- Flow foundation identity/workspace migration.
-- This intentionally creates only the minimum tenant primitives required for Architecture v1.

create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_memberships enable row level security;

create policy "members can read their workspaces"
  on public.workspaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = workspaces.id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "members can read memberships in their workspaces"
  on public.workspace_memberships
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships own_membership
      where own_membership.workspace_id = workspace_memberships.workspace_id
        and own_membership.user_id = (select auth.uid())
    )
  );

create index if not exists workspace_memberships_user_id_idx
  on public.workspace_memberships(user_id);

create index if not exists workspace_memberships_workspace_id_idx
  on public.workspace_memberships(workspace_id);

