-- Flow BLM source, knowledge, provenance, and training-governance foundation.
-- Non-destructive: this migration only creates new Flow-owned objects.

create schema if not exists flow_internal;

revoke all on schema flow_internal from anon;
revoke all on schema flow_internal from authenticated;

insert into public.permissions (key, description)
values
  ('knowledge.read', 'Read governed business knowledge available to the workspace.'),
  ('knowledge.manage', 'Manage workspace-scoped governed business knowledge.'),
  ('knowledge.review', 'Review governed business knowledge provenance and freshness.'),
  ('training_export.evaluate', 'Evaluate governed knowledge for training-export eligibility.')
on conflict (key) do nothing;

create table if not exists flow_internal.business_sources (
  source_id text primary key,
  canonical_name text not null,
  source_type text not null check (source_type in (
    'CLASSIFICATION',
    'STANDARD',
    'REGULATORY',
    'PROFESSIONAL_REFERENCE',
    'FLOW_INTERNAL',
    'WORKSPACE_EVIDENCE',
    'VENDOR_REFERENCE',
    'OPEN_WEB',
    'MODEL_PRIOR',
    'OTHER'
  )),
  publisher text not null,
  authority_class text not null check (authority_class in (
    'OFFICIAL_CLASSIFICATION',
    'STANDARDS_BODY',
    'INDUSTRY_STANDARD',
    'GOVERNMENT_REGULATOR',
    'PEER_REVIEWED',
    'PROFESSIONAL_REFERENCE',
    'FLOW_INTERNAL',
    'WORKSPACE_EVIDENCE',
    'VENDOR_REFERENCE',
    'OPEN_WEB',
    'MODEL_PRIOR',
    'OTHER'
  )),
  description text not null,
  homepage_locator text,
  default_jurisdiction jsonb not null default '[]'::jsonb check (jsonb_typeof(default_jurisdiction) = 'array'),
  default_language jsonb not null default '[]'::jsonb check (jsonb_typeof(default_language) = 'array'),
  status text not null check (status in ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED', 'REVOKED')),
  source jsonb not null check (jsonb_typeof(source) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists flow_internal.source_license_profiles (
  license_profile_id text primary key,
  reference_allowed text not null check (reference_allowed in ('ALLOWED', 'PROHIBITED', 'UNKNOWN_REQUIRES_REVIEW')),
  mapping_allowed text not null check (mapping_allowed in ('ALLOWED', 'PROHIBITED', 'UNKNOWN_REQUIRES_REVIEW')),
  ingestion_allowed text not null check (ingestion_allowed in ('ALLOWED', 'PROHIBITED', 'UNKNOWN_REQUIRES_REVIEW')),
  context_use_allowed text not null check (context_use_allowed in ('ALLOWED', 'PROHIBITED', 'UNKNOWN_REQUIRES_REVIEW')),
  evaluation_use_allowed text not null check (evaluation_use_allowed in ('ALLOWED', 'PROHIBITED', 'UNKNOWN_REQUIRES_REVIEW')),
  model_training_allowed text not null check (model_training_allowed in ('ALLOWED', 'PROHIBITED', 'UNKNOWN_REQUIRES_REVIEW')),
  commercial_training_allowed text not null check (commercial_training_allowed in ('ALLOWED', 'PROHIBITED', 'UNKNOWN_REQUIRES_REVIEW')),
  redistribution_allowed text not null check (redistribution_allowed in ('ALLOWED', 'PROHIBITED', 'UNKNOWN_REQUIRES_REVIEW')),
  attribution_required boolean not null default false,
  license_name text not null,
  license_reference text,
  restrictions jsonb not null default '[]'::jsonb check (jsonb_typeof(restrictions) = 'array'),
  notes text not null default '',
  legal_review_status text not null check (legal_review_status in ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED')),
  legal_reviewed_at timestamptz,
  legal_reviewed_by text,
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists flow_internal.source_releases (
  release_id text primary key,
  source_id text not null references flow_internal.business_sources(source_id),
  version text not null,
  release_name text not null,
  published_at timestamptz,
  observed_at timestamptz not null,
  effective_from date not null,
  effective_to date,
  status text not null check (status in ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED', 'REVOKED')),
  supersedes_release_id text references flow_internal.source_releases(release_id),
  content_fingerprint text not null,
  metadata_fingerprint text not null,
  license_profile_id text not null references flow_internal.source_license_profiles(license_profile_id),
  jurisdiction jsonb not null default '[]'::jsonb check (jsonb_typeof(jurisdiction) = 'array'),
  languages jsonb not null default '[]'::jsonb check (jsonb_typeof(languages) = 'array'),
  source_locator text not null,
  machine_readable_locator text,
  review_status text not null check (review_status in ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED')),
  reviewed_at timestamptz,
  reviewed_by text,
  release jsonb not null check (jsonb_typeof(release) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, version),
  constraint source_releases_no_self_supersession check (supersedes_release_id is null or supersedes_release_id <> release_id),
  constraint source_releases_effective_range check (effective_to is null or effective_to >= effective_from)
);

create table if not exists flow_internal.business_knowledge_units (
  knowledge_id text primary key,
  claim_type text not null check (claim_type in (
    'CLASSIFICATION_FACT',
    'STANDARD_FACT',
    'STANDARD_MAPPING',
    'DOMAIN_PATTERN',
    'FLOW_DERIVED_PATTERN',
    'REQUIREMENT_HYPOTHESIS',
    'WORKSPACE_FACT',
    'LIVE_EVIDENCE',
    'POLICY',
    'DETERMINISTIC_RESULT'
  )),
  subject_id text not null,
  predicate text not null,
  object_value text not null,
  canonical_concept_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(canonical_concept_refs) = 'array'),
  relation_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(relation_refs) = 'array'),
  source_id text not null references flow_internal.business_sources(source_id),
  source_release_id text not null references flow_internal.source_releases(release_id),
  source_locator text not null,
  source_authority text not null,
  source_version text not null,
  source_published_at timestamptz,
  source_observed_at timestamptz not null,
  jurisdiction jsonb not null default '[]'::jsonb check (jsonb_typeof(jurisdiction) = 'array'),
  effective_from date not null,
  effective_to date,
  license_profile_id text not null references flow_internal.source_license_profiles(license_profile_id),
  permitted_uses jsonb not null default '[]'::jsonb check (jsonb_typeof(permitted_uses) = 'array'),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  review_status text not null check (review_status in ('DRAFT', 'IN_REVIEW', 'REVIEWED', 'PUBLISHED', 'REJECTED')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(review_evidence) = 'array'),
  provenance_fingerprint text not null,
  supersedes_knowledge_id text references flow_internal.business_knowledge_units(knowledge_id),
  superseded_by_knowledge_id text,
  status text not null check (status in ('DRAFT', 'REVIEWED', 'PUBLISHED', 'SUPERSEDED', 'REJECTED', 'RETIRED')),
  scope text not null default 'GLOBAL' check (scope = 'GLOBAL'),
  workspace_id uuid,
  knowledge jsonb not null check (jsonb_typeof(knowledge) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_knowledge_units_no_workspace_scope check (workspace_id is null),
  constraint business_knowledge_units_no_workspace_fact check (claim_type <> 'WORKSPACE_FACT'),
  constraint business_knowledge_units_no_self_supersession check (supersedes_knowledge_id is null or supersedes_knowledge_id <> knowledge_id),
  constraint business_knowledge_units_effective_range check (effective_to is null or effective_to >= effective_from),
  constraint business_knowledge_units_reviewed_has_provenance check (status not in ('REVIEWED', 'PUBLISHED') or provenance_fingerprint <> '')
);

create table if not exists public.workspace_business_knowledge_units (
  knowledge_id text primary key,
  workspace_id uuid not null references public.workspaces(id),
  claim_type text not null check (claim_type in (
    'CLASSIFICATION_FACT',
    'STANDARD_FACT',
    'STANDARD_MAPPING',
    'DOMAIN_PATTERN',
    'FLOW_DERIVED_PATTERN',
    'REQUIREMENT_HYPOTHESIS',
    'WORKSPACE_FACT',
    'LIVE_EVIDENCE',
    'POLICY',
    'DETERMINISTIC_RESULT'
  )),
  subject_id text not null,
  predicate text not null,
  object_value text not null,
  canonical_concept_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(canonical_concept_refs) = 'array'),
  relation_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(relation_refs) = 'array'),
  source_id text not null references flow_internal.business_sources(source_id),
  source_release_id text not null references flow_internal.source_releases(release_id),
  source_locator text not null,
  source_authority text not null,
  source_version text not null,
  source_published_at timestamptz,
  source_observed_at timestamptz not null,
  jurisdiction jsonb not null default '[]'::jsonb check (jsonb_typeof(jurisdiction) = 'array'),
  effective_from date not null,
  effective_to date,
  license_profile_id text not null references flow_internal.source_license_profiles(license_profile_id),
  permitted_uses jsonb not null default '[]'::jsonb check (jsonb_typeof(permitted_uses) = 'array'),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  review_status text not null check (review_status in ('DRAFT', 'IN_REVIEW', 'REVIEWED', 'PUBLISHED', 'REJECTED')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(review_evidence) = 'array'),
  provenance_fingerprint text not null,
  supersedes_knowledge_id text,
  superseded_by_knowledge_id text,
  status text not null check (status in ('DRAFT', 'REVIEWED', 'PUBLISHED', 'SUPERSEDED', 'REJECTED', 'RETIRED')),
  scope text not null default 'WORKSPACE' check (scope = 'WORKSPACE'),
  knowledge jsonb not null check (jsonb_typeof(knowledge) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_business_knowledge_units_no_self_supersession check (supersedes_knowledge_id is null or supersedes_knowledge_id <> knowledge_id),
  constraint workspace_business_knowledge_units_effective_range check (effective_to is null or effective_to >= effective_from),
  constraint workspace_business_knowledge_units_reviewed_has_provenance check (status not in ('REVIEWED', 'PUBLISHED') or provenance_fingerprint <> '')
);

alter table flow_internal.business_sources enable row level security;
alter table flow_internal.source_license_profiles enable row level security;
alter table flow_internal.source_releases enable row level security;
alter table flow_internal.business_knowledge_units enable row level security;
alter table public.workspace_business_knowledge_units enable row level security;

create policy workspace_business_knowledge_units_select
on public.workspace_business_knowledge_units
for select
to authenticated
using (
  flow_private.has_active_membership(workspace_id)
  and flow_private.has_workspace_permission(workspace_id, 'knowledge.read')
);

create policy workspace_business_knowledge_units_insert
on public.workspace_business_knowledge_units
for insert
to authenticated
with check (
  flow_private.has_active_membership(workspace_id)
  and flow_private.has_workspace_permission(workspace_id, 'knowledge.manage')
);

create policy workspace_business_knowledge_units_update
on public.workspace_business_knowledge_units
for update
to authenticated
using (
  flow_private.has_active_membership(workspace_id)
  and flow_private.has_workspace_permission(workspace_id, 'knowledge.manage')
)
with check (
  flow_private.has_active_membership(workspace_id)
  and flow_private.has_workspace_permission(workspace_id, 'knowledge.manage')
);

create index if not exists business_sources_status_authority_idx
on flow_internal.business_sources (status, authority_class);

create index if not exists source_license_profiles_training_idx
on flow_internal.source_license_profiles (
  model_training_allowed,
  commercial_training_allowed,
  legal_review_status
);

create index if not exists source_releases_source_status_effective_idx
on flow_internal.source_releases (source_id, status, effective_from, effective_to);

create index if not exists source_releases_content_fingerprint_idx
on flow_internal.source_releases (content_fingerprint);

create index if not exists business_knowledge_units_claim_status_idx
on flow_internal.business_knowledge_units (claim_type, status, effective_from, effective_to);

create index if not exists business_knowledge_units_source_release_idx
on flow_internal.business_knowledge_units (source_id, source_release_id);

create index if not exists business_knowledge_units_permitted_uses_idx
on flow_internal.business_knowledge_units using gin (permitted_uses);

create index if not exists business_knowledge_units_jurisdiction_idx
on flow_internal.business_knowledge_units using gin (jurisdiction);

create index if not exists business_knowledge_units_concepts_idx
on flow_internal.business_knowledge_units using gin (canonical_concept_refs);

create index if not exists workspace_business_knowledge_units_workspace_status_idx
on public.workspace_business_knowledge_units (workspace_id, status, effective_from, effective_to);

create index if not exists workspace_business_knowledge_units_source_release_idx
on public.workspace_business_knowledge_units (workspace_id, source_id, source_release_id);

create index if not exists workspace_business_knowledge_units_permitted_uses_idx
on public.workspace_business_knowledge_units using gin (permitted_uses);

create index if not exists workspace_business_knowledge_units_jurisdiction_idx
on public.workspace_business_knowledge_units using gin (jurisdiction);
