-- Phase 2.1: discovery extraction runs (additive)
-- Tracks BLM/provider extraction attempts without duplicating extracted_facts.

create table public.discovery_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  source_id uuid not null,
  source_fingerprint text not null,
  prompt_version text not null,
  schema_version text not null,
  provider text not null,
  model text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  idempotency_key text not null,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  usage_metadata jsonb not null default '{}'::jsonb,
  latency_ms integer,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, idempotency_key),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade,
  foreign key (source_id, workspace_id)
    references public.discovery_sources(id, workspace_id)
    on delete cascade,
  constraint discovery_extraction_runs_status_check
    check (status in ('pending', 'running', 'succeeded', 'failed', 'cancelled', 'reviewed')),
  constraint discovery_extraction_runs_attempt_count_check
    check (attempt_count >= 0)
);

alter table public.extracted_facts
  add column if not exists candidate_id text,
  add column if not exists contradiction_ref text,
  add column if not exists duplicate_of_candidate_id text;

create index discovery_extraction_runs_workspace_opportunity_idx
  on public.discovery_extraction_runs(workspace_id, opportunity_id, created_at desc);

create index discovery_extraction_runs_workspace_source_idx
  on public.discovery_extraction_runs(workspace_id, source_id);

create index extracted_facts_workspace_run_idx
  on public.extracted_facts(workspace_id, extraction_run_id);

alter table public.discovery_extraction_runs enable row level security;

create policy discovery_extraction_runs_read
  on public.discovery_extraction_runs for select to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy discovery_extraction_runs_insert
  on public.discovery_extraction_runs for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy discovery_extraction_runs_update
  on public.discovery_extraction_runs for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy discovery_extraction_runs_delete
  on public.discovery_extraction_runs for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

grant select, insert, update, delete on public.discovery_extraction_runs to authenticated;
