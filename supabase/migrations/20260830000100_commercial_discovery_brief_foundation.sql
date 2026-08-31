-- Phase 2 commercial discovery and brief foundation.
-- Additive only. Reuses flow_private RLS helpers and flow_internal audit/idempotency.

create extension if not exists "pgcrypto";

insert into public.permissions (key, description)
values
  ('catalog.read', 'Read the workspace service catalogue.'),
  ('catalog.manage', 'Create and update services and cost components.'),
  ('questionnaire.publish', 'Publish or archive questionnaire versions.'),
  ('client.read', 'Read clients and contacts.'),
  ('client.manage', 'Create and update clients and contacts.'),
  ('opportunity.read', 'Read opportunities and related commercial records.'),
  ('opportunity.manage', 'Create and update opportunities and discovery.'),
  ('discovery.manage', 'Write discovery sources and extraction runs.'),
  ('fact.verify', 'Verify or reject extracted facts.'),
  ('brief.manage', 'Create and edit brief drafts.'),
  ('brief.approve', 'Approve an immutable brief version.'),
  ('commercial.audit.read', 'Read commercial Guard and audit history.')
on conflict (key) do nothing;

create table public.catalog_services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  pricing_model text not null,
  currency text not null,
  default_target_margin_bps integer not null default 4000,
  default_contingency_bps integer not null default 1000,
  status text not null default 'draft',
  revision integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  unique (id, workspace_id),
  unique (workspace_id, slug),
  constraint catalog_services_pricing_check
    check (pricing_model in ('retainer', 'project', 'hourly', 'hybrid')),
  constraint catalog_services_status_check
    check (status in ('draft', 'active', 'archived')),
  constraint catalog_services_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint catalog_services_bps_check
    check (
      default_target_margin_bps >= 0
      and default_target_margin_bps < 10000
      and default_contingency_bps >= 0
    )
);

create table public.catalog_service_cost_components (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  service_id uuid not null,
  role_key text not null,
  estimated_minutes integer not null,
  internal_rate_per_hour_minor bigint not null,
  vendor_cost_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (service_id, workspace_id)
    references public.catalog_services(id, workspace_id)
    on delete cascade,
  constraint catalog_cost_minutes_check
    check (estimated_minutes >= 0),
  constraint catalog_cost_money_check
    check (internal_rate_per_hour_minor >= 0 and vendor_cost_minor >= 0)
);

create table public.catalog_questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  service_id uuid not null,
  version_number integer not null,
  status text not null default 'draft',
  json_schema jsonb not null,
  ui_schema jsonb not null default '{}'::jsonb,
  question_meta jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (service_id, version_number),
  foreign key (service_id, workspace_id)
    references public.catalog_services(id, workspace_id)
    on delete cascade,
  constraint catalog_questionnaire_status_check
    check (status in ('draft', 'published', 'archived')),
  constraint catalog_questionnaire_schema_object
    check (jsonb_typeof(json_schema) = 'object')
);

create unique index catalog_questionnaire_one_published
  on public.catalog_questionnaire_versions(service_id)
  where status = 'published';

create table public.crm_clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  industry text,
  website text,
  status text not null default 'active',
  notes text,
  revision integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  constraint crm_clients_status_check
    check (status in ('active', 'prospect', 'archived'))
);

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id uuid not null,
  first_name text not null,
  last_name text not null,
  title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (client_id, workspace_id)
    references public.crm_clients(id, workspace_id)
    on delete cascade
);

create table public.crm_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null,
  primary_contact_id uuid,
  service_id uuid not null,
  name text not null,
  journey_status text not null default 'collecting_information',
  currency text not null,
  budget_min_minor bigint,
  budget_max_minor bigint,
  timeline_start date,
  timeline_end date,
  completeness integer not null default 0,
  latest_calculation jsonb,
  revision integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (client_id, workspace_id)
    references public.crm_clients(id, workspace_id)
    on delete restrict,
  foreign key (service_id, workspace_id)
    references public.catalog_services(id, workspace_id)
    on delete restrict,
  constraint crm_opportunities_status_check
    check (journey_status in (
      'collecting_information',
      'missing_information',
      'ready_for_brief',
      'brief_draft',
      'founder_review',
      'changes_requested',
      'approved'
    )),
  constraint crm_opportunities_currency_check
    check (currency ~ '^[A-Z]{3}$')
);

create table public.catalog_questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  questionnaire_version_id uuid not null,
  answers jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (opportunity_id, questionnaire_version_id),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade,
  foreign key (questionnaire_version_id, workspace_id)
    references public.catalog_questionnaire_versions(id, workspace_id)
    on delete restrict
);

create table public.discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  title text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade
);

create table public.discovery_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  session_id uuid not null,
  source_kind text not null,
  original_text text not null,
  content_type text not null default 'text/plain',
  filename text,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  unique (id, workspace_id),
  foreign key (session_id, workspace_id)
    references public.discovery_sessions(id, workspace_id)
    on delete cascade,
  constraint discovery_sources_kind_check
    check (source_kind in ('meeting_notes', 'transcript', 'document')),
  constraint discovery_sources_content_type_check
    check (content_type in ('text/plain', 'text/markdown'))
);

create table public.extracted_facts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  source_id uuid not null,
  extraction_run_id uuid not null,
  candidate_fact text not null,
  category text not null,
  confidence_bps integer not null,
  character_start integer,
  character_end integer,
  timecode text,
  status text not null default 'draft',
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, source_id, candidate_fact, category),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade,
  foreign key (source_id, workspace_id)
    references public.discovery_sources(id, workspace_id)
    on delete cascade,
  constraint extracted_facts_status_check
    check (status in ('draft', 'verified', 'rejected')),
  constraint extracted_facts_confidence_check
    check (confidence_bps >= 0 and confidence_bps <= 10000)
);

create table public.opportunity_requirements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  key text not null,
  statement text not null,
  fact_id uuid,
  created_at timestamptz not null default now(),
  unique (opportunity_id, key),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade
);

create table public.opportunity_deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade
);

create table public.opportunity_budget_constraints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null unique,
  min_minor bigint,
  max_minor bigint,
  currency text not null,
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade
);

create table public.opportunity_timeline_constraints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null unique,
  start_on date,
  end_on date,
  notes text,
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade
);

create table public.opportunity_risks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  statement text not null,
  blocking boolean not null default false,
  handled boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade
);

create table public.follow_up_questions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  question_key text not null,
  prompt text not null,
  required boolean not null default true,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (opportunity_id, question_key),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade
);

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade
);

create table public.brief_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  brief_id uuid not null,
  version_number integer not null,
  status text not null default 'draft',
  calculation jsonb,
  expected_revision integer not null default 1,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (brief_id, version_number),
  foreign key (brief_id, workspace_id)
    references public.briefs(id, workspace_id)
    on delete cascade,
  constraint brief_versions_status_check
    check (status in ('draft', 'in_review', 'approved', 'superseded'))
);

create table public.brief_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  brief_version_id uuid not null,
  key text not null,
  title text not null,
  body text not null,
  unique (brief_version_id, key),
  foreign key (brief_version_id, workspace_id)
    references public.brief_versions(id, workspace_id)
    on delete cascade
);

create table public.evidence_references (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  source_id uuid,
  fact_id uuid,
  claim_classification text not null,
  excerpt text,
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade,
  constraint evidence_claim_check
    check (claim_classification in ('FACT', 'INFERENCE', 'RECOMMENDATION', 'ASSUMPTION'))
);

create table public.commercial_guard_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null,
  brief_version_id uuid,
  action text not null,
  outcome text not null,
  actor_id uuid references public.users(id) on delete set null,
  reason text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade,
  constraint commercial_guard_outcome_check
    check (outcome in ('ALLOW', 'DENY', 'REQUIRES_APPROVAL'))
);

create index catalog_services_workspace_status_idx
  on public.catalog_services(workspace_id, status);
create index crm_clients_workspace_status_idx
  on public.crm_clients(workspace_id, status);
create index crm_contacts_workspace_client_idx
  on public.crm_contacts(workspace_id, client_id);
create index crm_opportunities_workspace_status_idx
  on public.crm_opportunities(workspace_id, journey_status);
create index extracted_facts_workspace_status_idx
  on public.extracted_facts(workspace_id, status);
create index brief_versions_workspace_status_idx
  on public.brief_versions(workspace_id, status);
create index discovery_sources_workspace_session_idx
  on public.discovery_sources(workspace_id, session_id);
create index follow_up_questions_workspace_opp_idx
  on public.follow_up_questions(workspace_id, opportunity_id);

create or replace function flow_private.prevent_approved_brief_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and old.status = 'approved' then
    raise exception 'approved brief versions are immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then
    raise exception 'approved brief versions are immutable';
  end if;
  return new;
end;
$$;

create trigger brief_versions_immutable_approved
  before update or delete on public.brief_versions
  for each row
  execute function flow_private.prevent_approved_brief_version_mutation();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'catalog_services',
    'catalog_service_cost_components',
    'catalog_questionnaire_versions',
    'catalog_questionnaire_responses',
    'crm_clients',
    'crm_contacts',
    'crm_opportunities',
    'discovery_sessions',
    'discovery_sources',
    'extracted_facts',
    'opportunity_requirements',
    'opportunity_deliverables',
    'opportunity_budget_constraints',
    'opportunity_timeline_constraints',
    'opportunity_risks',
    'follow_up_questions',
    'briefs',
    'brief_versions',
    'brief_sections',
    'evidence_references',
    'commercial_guard_decisions'
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

create policy catalog_services_write
  on public.catalog_services for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_cost_write
  on public.catalog_service_cost_components for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_questionnaire_write
  on public.catalog_questionnaire_versions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_responses_write
  on public.catalog_questionnaire_responses for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy crm_clients_write
  on public.crm_clients for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'client.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'client.manage'));

create policy crm_contacts_write
  on public.crm_contacts for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'client.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'client.manage'));

create policy crm_opportunities_write
  on public.crm_opportunities for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy discovery_sessions_write
  on public.discovery_sessions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy discovery_sources_write
  on public.discovery_sources for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy extracted_facts_write
  on public.extracted_facts for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy extracted_facts_verify
  on public.extracted_facts for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'fact.verify'))
  with check (flow_private.has_workspace_permission(workspace_id, 'fact.verify'));

create policy opportunity_children_write
  on public.opportunity_requirements for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_deliverables_write
  on public.opportunity_deliverables for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_budget_write
  on public.opportunity_budget_constraints for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_timeline_write
  on public.opportunity_timeline_constraints for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_risks_write
  on public.opportunity_risks for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy follow_up_write
  on public.follow_up_questions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy briefs_write
  on public.briefs for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'brief.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy brief_versions_write
  on public.brief_versions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'brief.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy brief_sections_write
  on public.brief_sections for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'brief.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy evidence_write
  on public.evidence_references for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy guard_write
  on public.commercial_guard_decisions for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.approve')
    or flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in (
    'catalog.read',
    'catalog.manage',
    'questionnaire.publish',
    'client.read',
    'client.manage',
    'opportunity.read',
    'opportunity.manage',
    'discovery.manage',
    'fact.verify',
    'brief.manage',
    'brief.approve',
    'commercial.audit.read'
  )
where role.key in ('FOUNDER', 'OWNER')
on conflict do nothing;
