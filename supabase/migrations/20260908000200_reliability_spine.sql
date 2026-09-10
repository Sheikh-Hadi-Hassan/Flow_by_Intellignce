-- Flow reliability spine: durable delivery, replay-safe inbound events, and trace linkage.

begin;

alter table flow_internal.request_idempotency_records
  add column if not exists traceparent text;

alter table flow_internal.request_idempotency_records
  add constraint request_idempotency_records_status_check
  check (status in ('STARTED', 'COMPLETED', 'FAILED'));

alter table flow_internal.request_idempotency_records
  add constraint request_idempotency_records_traceparent_check
  check (traceparent is null or traceparent ~ '^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$');

create table if not exists flow_internal.outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idempotency_key text not null,
  destination text not null,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null default '{}'::jsonb,
  payload_fingerprint text not null,
  evidence jsonb not null default '[]'::jsonb,
  correlation_id text not null,
  traceparent text,
  status text not null default 'PENDING',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  locked_by text,
  locked_until timestamptz,
  last_error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outbox_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint outbox_events_evidence_array check (jsonb_typeof(evidence) = 'array'),
  constraint outbox_events_attempt_count check (attempt_count >= 0),
  constraint outbox_events_status check (status in ('PENDING', 'PROCESSING', 'DELIVERED', 'RETRY', 'DEAD')),
  constraint outbox_events_traceparent_check check (
    traceparent is null or traceparent ~ '^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$'
  ),
  unique (workspace_id, event_id),
  unique (workspace_id, idempotency_key)
);

create table if not exists flow_internal.webhook_inbox_events (
  id uuid primary key default gen_random_uuid(),
  inbox_id text not null unique,
  provider text not null,
  provider_event_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  payload_fingerprint text not null,
  signature_verified boolean not null default false,
  status text not null default 'RECEIVED',
  attempt_count integer not null default 0,
  correlation_id text not null,
  traceparent text,
  received_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  locked_by text,
  locked_until timestamptz,
  last_error_code text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webhook_inbox_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint webhook_inbox_events_attempt_count check (attempt_count >= 0),
  constraint webhook_inbox_events_status check (status in ('RECEIVED', 'PROCESSING', 'PROCESSED', 'REJECTED', 'DEAD')),
  constraint webhook_inbox_events_traceparent_check check (
    traceparent is null or traceparent ~ '^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$'
  ),
  constraint webhook_inbox_events_processing_authority check (
    status not in ('PROCESSING', 'PROCESSED')
    or (signature_verified = true and workspace_id is not null)
  ),
  unique (provider, provider_event_id)
);

create index if not exists outbox_events_claim_idx
  on flow_internal.outbox_events(status, available_at, locked_until);

create index if not exists outbox_events_workspace_aggregate_idx
  on flow_internal.outbox_events(workspace_id, aggregate_type, aggregate_id, created_at);

create index if not exists webhook_inbox_events_claim_idx
  on flow_internal.webhook_inbox_events(status, available_at, locked_until);

create index if not exists webhook_inbox_events_workspace_time_idx
  on flow_internal.webhook_inbox_events(workspace_id, received_at);

alter table flow_internal.outbox_events enable row level security;
alter table flow_internal.webhook_inbox_events enable row level security;

revoke all on table flow_internal.outbox_events from public, anon, authenticated;
revoke all on table flow_internal.webhook_inbox_events from public, anon, authenticated;

commit;
