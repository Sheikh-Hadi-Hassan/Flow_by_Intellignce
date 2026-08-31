-- Flow business persistence foundation.
-- Source-controlled schema for canonical records, runtime manifests, logic releases,
-- calculation audit metadata, import sessions, idempotency, and business audit events.

create extension if not exists "pgcrypto";

create schema if not exists flow_internal;

revoke all on schema flow_internal from public;
revoke all on schema flow_internal from anon;
revoke all on schema flow_internal from authenticated;

create table if not exists public.workspace_configurations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_taxonomy text not null,
  industry text not null,
  business_type text not null,
  jurisdiction text not null,
  currency text not null,
  enabled_modules jsonb not null default '[]'::jsonb,
  configuration_version integer not null default 1,
  configuration_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  unique (workspace_id, configuration_fingerprint),
  constraint workspace_configurations_enabled_modules_array
    check (jsonb_typeof(enabled_modules) = 'array'),
  constraint workspace_configurations_currency_check
    check (currency ~ '^[A-Z]{3}$')
);

create table if not exists public.canonical_business_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null,
  semantic_id text not null,
  schema_version text not null,
  source_type text not null,
  source_id text not null,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  corpus_classification text not null,
  data_use_classification text not null default 'WORKSPACE_ONLY',
  field_provenance jsonb not null default '{}'::jsonb,
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  fingerprint text not null,
  deleted_at timestamptz,
  constraint canonical_business_records_payload_object
    check (jsonb_typeof(payload) = 'object'),
  constraint canonical_business_records_provenance_object
    check (jsonb_typeof(provenance) = 'object'),
  constraint canonical_business_records_corpus_check
    check (corpus_classification in (
      'SYNTHETIC_CORPUS',
      'PUBLIC_REAL_CORPUS',
      'WORKSPACE_PRIVATE_CORPUS'
    )),
  constraint canonical_business_records_data_use_check
    check (data_use_classification in (
      'WORKSPACE_ONLY',
      'EVALUATION_ALLOWED',
      'ANONYMIZED_LEARNING_ALLOWED',
      'TRAINING_ALLOWED',
      'TRAINING_PROHIBITED'
    )),
  unique (workspace_id, source_type, source_id, external_id, schema_version),
  unique (id, workspace_id)
);

create table if not exists public.canonical_business_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  relationship_type text not null,
  from_record_id uuid not null,
  to_record_id uuid not null,
  semantic_relationship_id text not null,
  effective_from timestamptz,
  effective_to timestamptz,
  provenance jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint canonical_business_relationships_provenance_object
    check (jsonb_typeof(provenance) = 'object'),
  constraint canonical_business_relationships_time_check
    check (effective_to is null or effective_from is null or effective_to >= effective_from),
  constraint canonical_business_relationships_from_fk
    foreign key (from_record_id, workspace_id)
    references public.canonical_business_records(id, workspace_id)
    on delete cascade,
  constraint canonical_business_relationships_to_fk
    foreign key (to_record_id, workspace_id)
    references public.canonical_business_records(id, workspace_id)
    on delete cascade
);

create table if not exists public.import_sessions (
  id uuid primary key default gen_random_uuid(),
  import_session_id text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null,
  source_system text not null,
  source_fingerprint text not null,
  mapping_version text not null,
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_received integer not null default 0,
  records_accepted integer not null default 0,
  records_rejected integer not null default 0,
  error_summary jsonb not null default '{}'::jsonb,
  data_use_classification text not null default 'WORKSPACE_ONLY',
  privacy_classification jsonb not null default '{}'::jsonb,
  provenance_release_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_sessions_status_check
    check (status in (
      'CREATED',
      'VALIDATING',
      'MAPPING',
      'IMPORTING',
      'COMPLETED',
      'PARTIAL',
      'FAILED',
      'CANCELLED'
    )),
  constraint import_sessions_data_use_check
    check (data_use_classification in (
      'WORKSPACE_ONLY',
      'EVALUATION_ALLOWED',
      'ANONYMIZED_LEARNING_ALLOWED',
      'TRAINING_ALLOWED',
      'TRAINING_PROHIBITED'
    )),
  unique (workspace_id, source_fingerprint, mapping_version),
  unique (workspace_id, import_session_id)
);

create table if not exists flow_internal.business_logic_releases (
  id uuid primary key default gen_random_uuid(),
  logic_id text not null,
  version text not null,
  logic_type text not null,
  status text not null,
  scope jsonb not null default '{}'::jsonb,
  industry text,
  jurisdiction text,
  business_type text,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  effective_from date not null,
  effective_to date,
  input_schema jsonb not null default '[]'::jsonb,
  output_schema jsonb not null default '[]'::jsonb,
  implementation_id text,
  dependencies jsonb not null default '[]'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  approval_metadata jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  supersedes text,
  superseded_by text,
  created_at timestamptz not null default now(),
  constraint business_logic_releases_status_check
    check (status in ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'SUPERSEDED', 'REJECTED')),
  constraint business_logic_releases_temporal_check
    check (effective_to is null or effective_to >= effective_from),
  unique (logic_id, version)
);

create table if not exists flow_internal.workspace_runtime_manifests (
  id uuid primary key default gen_random_uuid(),
  runtime_id text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  runtime_version text not null,
  configuration_fingerprint text not null,
  runtime_fingerprint text not null,
  knowledge_release_id text not null,
  business_type text not null,
  industry text not null,
  jurisdiction text not null,
  currency text not null,
  enabled_domain_ids jsonb not null default '[]'::jsonb,
  enabled_module_ids jsonb not null default '[]'::jsonb,
  available_logic_ids jsonb not null default '[]'::jsonb,
  logic_versions jsonb not null default '{}'::jsonb,
  logic_fingerprints jsonb not null default '{}'::jsonb,
  runtime_slice_index jsonb not null default '[]'::jsonb,
  capability_metadata jsonb not null default '{}'::jsonb,
  compiled_at timestamptz not null,
  superseded_at timestamptz,
  active boolean not null default true,
  manifest jsonb not null,
  created_at timestamptz not null default now(),
  constraint workspace_runtime_manifests_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  unique (workspace_id, runtime_fingerprint),
  unique (runtime_id)
);

create table if not exists flow_internal.workspace_runtime_slices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  runtime_fingerprint text not null,
  slice_id text not null,
  domain_id text not null,
  logic_ids jsonb not null default '[]'::jsonb,
  dependency_slice_ids jsonb not null default '[]'::jsonb,
  capability_references jsonb not null default '[]'::jsonb,
  fingerprint text not null,
  slice jsonb not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, runtime_fingerprint, slice_id),
  constraint workspace_runtime_slices_manifest_fk
    foreign key (workspace_id, runtime_fingerprint)
    references flow_internal.workspace_runtime_manifests(workspace_id, runtime_fingerprint)
    on delete cascade
);

create table if not exists flow_internal.calculation_execution_audits (
  id uuid primary key default gen_random_uuid(),
  execution_id text not null,
  request_id text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id text not null,
  logic_id text not null,
  logic_version text,
  logic_fingerprint text,
  runtime_fingerprint text not null,
  status text not null,
  input_fingerprint text,
  result_fingerprint text,
  result_type text,
  unit text,
  currency text,
  started_at timestamptz not null,
  completed_at timestamptz,
  correlation_id text not null,
  error_code text,
  warnings jsonb not null default '[]'::jsonb,
  record_references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint calculation_execution_audits_status_check
    check (status in (
      'COMPLETED',
      'MISSING_INPUT',
      'INVALID_INPUT',
      'LOGIC_NOT_FOUND',
      'LOGIC_NOT_APPROVED',
      'LOGIC_NOT_APPLICABLE',
      'VERSION_MISMATCH',
      'UNIT_MISMATCH',
      'DEPENDENCY_CYCLE',
      'RUNTIME_MISMATCH',
      'AUTHORIZATION_DENIED',
      'DEADLINE_EXCEEDED',
      'RUNTIME_BUSY',
      'EXECUTION_FAILURE'
    )),
  unique (workspace_id, execution_id)
);

create table if not exists flow_internal.request_idempotency_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idempotency_key text not null,
  request_class text not null,
  request_fingerprint text not null,
  status text not null,
  result_reference text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);

create table if not exists flow_internal.business_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  actor_id text,
  event_type text not null,
  target_type text not null,
  target_id text not null,
  occurred_at timestamptz not null default now(),
  correlation_id text,
  metadata_fingerprint text,
  metadata jsonb not null default '{}'::jsonb,
  unique (event_id)
);

create index if not exists workspace_configurations_workspace_fingerprint_idx
  on public.workspace_configurations(workspace_id, configuration_fingerprint);

create index if not exists canonical_business_records_workspace_semantic_idx
  on public.canonical_business_records(workspace_id, semantic_id);

create index if not exists canonical_business_records_workspace_external_idx
  on public.canonical_business_records(workspace_id, source_type, source_id, external_id);

create index if not exists canonical_business_records_workspace_effective_idx
  on public.canonical_business_records(workspace_id, effective_at);

create index if not exists canonical_business_relationships_workspace_type_idx
  on public.canonical_business_relationships(workspace_id, relationship_type);

create index if not exists import_sessions_workspace_status_idx
  on public.import_sessions(workspace_id, status);

create index if not exists business_logic_releases_lookup_idx
  on flow_internal.business_logic_releases(logic_id, version, status, effective_from, effective_to);

create index if not exists business_logic_releases_scope_idx
  on flow_internal.business_logic_releases(workspace_id, industry, jurisdiction, business_type);

create index if not exists workspace_runtime_manifests_active_idx
  on flow_internal.workspace_runtime_manifests(workspace_id, active, runtime_fingerprint);

create index if not exists workspace_runtime_manifests_config_idx
  on flow_internal.workspace_runtime_manifests(workspace_id, configuration_fingerprint);

create index if not exists workspace_runtime_slices_lookup_idx
  on flow_internal.workspace_runtime_slices(workspace_id, runtime_fingerprint, slice_id);

create index if not exists calculation_execution_audits_workspace_logic_idx
  on flow_internal.calculation_execution_audits(workspace_id, logic_id, started_at);

create index if not exists request_idempotency_records_expiry_idx
  on flow_internal.request_idempotency_records(workspace_id, expires_at);

create index if not exists business_audit_events_workspace_time_idx
  on flow_internal.business_audit_events(workspace_id, occurred_at);

create or replace function flow_internal.reject_immutable_business_logic_release_mutation()
returns trigger
language plpgsql
set search_path = flow_internal, public
as $$
begin
  if tg_op = 'DELETE' and old.status in ('APPROVED', 'PUBLISHED') then
    raise exception 'approved or published business logic releases are immutable';
  end if;

  if tg_op = 'UPDATE'
    and old.status in ('APPROVED', 'PUBLISHED')
    and to_jsonb(new) is distinct from to_jsonb(old)
  then
    raise exception 'approved or published business logic releases are immutable';
  end if;

  return new;
end;
$$;

create or replace trigger business_logic_releases_immutable_guard
before update or delete on flow_internal.business_logic_releases
for each row
execute function flow_internal.reject_immutable_business_logic_release_mutation();

create or replace function flow_internal.reject_audit_row_mutation()
returns trigger
language plpgsql
set search_path = flow_internal, public
as $$
begin
  raise exception 'business audit rows are append-only';
end;
$$;

create or replace trigger calculation_execution_audits_append_only_guard
before update or delete on flow_internal.calculation_execution_audits
for each row
execute function flow_internal.reject_audit_row_mutation();

create or replace trigger business_audit_events_append_only_guard
before update or delete on flow_internal.business_audit_events
for each row
execute function flow_internal.reject_audit_row_mutation();

alter table public.workspace_configurations enable row level security;
alter table public.canonical_business_records enable row level security;
alter table public.canonical_business_relationships enable row level security;
alter table public.import_sessions enable row level security;
alter table flow_internal.business_logic_releases enable row level security;
alter table flow_internal.workspace_runtime_manifests enable row level security;
alter table flow_internal.workspace_runtime_slices enable row level security;
alter table flow_internal.calculation_execution_audits enable row level security;
alter table flow_internal.request_idempotency_records enable row level security;
alter table flow_internal.business_audit_events enable row level security;

create policy "members can read workspace configurations"
  on public.workspace_configurations
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "workspace managers can manage workspace configurations"
  on public.workspace_configurations
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'workspace.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'workspace.manage'));

create policy "members can read canonical business records"
  on public.canonical_business_records
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "record writers can insert canonical business records"
  on public.canonical_business_records
  for insert
  to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'business_record.write'));

create policy "record writers can update canonical business records"
  on public.canonical_business_records
  for update
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'business_record.write'))
  with check (flow_private.has_workspace_permission(workspace_id, 'business_record.write'));

create policy "members can read canonical business relationships"
  on public.canonical_business_relationships
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "record writers can insert canonical business relationships"
  on public.canonical_business_relationships
  for insert
  to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'business_record.write'));

create policy "record writers can update canonical business relationships"
  on public.canonical_business_relationships
  for update
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'business_record.write'))
  with check (flow_private.has_workspace_permission(workspace_id, 'business_record.write'));

create policy "members can read import sessions"
  on public.import_sessions
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "import managers can manage import sessions"
  on public.import_sessions
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'import.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'import.manage'));

insert into public.permissions (key, description)
values
  ('business_record.read', 'Read canonical business records.'),
  ('business_record.write', 'Write canonical business records and relationships.'),
  ('import.manage', 'Manage workspace import sessions.'),
  ('runtime.read', 'Read compiled runtime metadata through server APIs.'),
  ('runtime.manage', 'Manage compiled runtime metadata through server APIs.')
on conflict (key) do nothing;
