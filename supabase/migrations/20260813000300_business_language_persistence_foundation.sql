-- Flow BLM canonical business language persistence foundation.
-- Non-destructive: creates governed global language objects and tenant-scoped workspace aliases.

create schema if not exists flow_internal;

revoke all on schema flow_internal from anon;
revoke all on schema flow_internal from authenticated;

insert into public.permissions (key, description)
values
  ('language.read', 'Read workspace-scoped business language aliases.'),
  ('language.manage', 'Manage workspace-scoped business language aliases.')
on conflict (key) do nothing;

create table if not exists flow_internal.business_language_concepts (
  concept_id text primary key,
  canonical_name text not null,
  canonical_label text not null,
  language_neutral_key text not null,
  concept_type text not null check (concept_type in (
    'ENTITY_TYPE',
    'ROLE',
    'RESPONSIBILITY',
    'ACTION',
    'STATE',
    'STATUS',
    'EVENT',
    'METRIC',
    'DIMENSION',
    'MEASURE',
    'UNIT',
    'TIME_CONCEPT',
    'DOCUMENT',
    'PROCESS',
    'WORKFLOW',
    'CAPABILITY',
    'POLICY_TERM',
    'RULE_TERM',
    'RISK_TERM',
    'CONTROL_TERM',
    'FINANCIAL_TERM',
    'COMMERCIAL_TERM',
    'OPERATING_TERM',
    'QUALIFIER',
    'RELATIONSHIP',
    'BUSINESS_OBJECTIVE',
    'BUSINESS_PROBLEM',
    'DECISION_TERM'
  )),
  domain text not null,
  subdomain text,
  definition text not null,
  semantic_description text not null,
  lifecycle_status text not null check (lifecycle_status in ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED', 'REJECTED')),
  version text not null,
  supersedes_concept_id text references flow_internal.business_language_concepts(concept_id),
  superseded_by_concept_id text references flow_internal.business_language_concepts(concept_id),
  provenance jsonb not null check (jsonb_typeof(provenance) = 'object'),
  concept jsonb not null check (jsonb_typeof(concept) = 'object'),
  fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_language_concepts_no_self_supersession
    check (
      (supersedes_concept_id is null or supersedes_concept_id <> concept_id)
      and (superseded_by_concept_id is null or superseded_by_concept_id <> concept_id)
    )
);

create table if not exists flow_internal.business_language_aliases (
  alias_id text primary key,
  alias_text text not null,
  normalized_alias text not null,
  language_tag text not null,
  script text,
  locale text,
  target_concept_id text not null references flow_internal.business_language_concepts(concept_id),
  alias_type text not null check (alias_type in (
    'EXACT_SYNONYM',
    'COLLOQUIAL',
    'FOUNDER_SPEAK',
    'ABBREVIATION',
    'ROMAN_URDU',
    'EXPERT_TERM',
    'PHRASE',
    'ACTION_PHRASE',
    'DEPRECATED_TERM'
  )),
  ambiguity_class text not null check (ambiguity_class in ('UNAMBIGUOUS', 'CONTEXTUAL', 'AMBIGUOUS', 'UNSAFE_REDEFINITION')),
  priority integer not null check (priority >= 0 and priority <= 100),
  status text not null check (status in ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED', 'REJECTED')),
  valid_from timestamptz,
  valid_to timestamptz,
  provenance jsonb not null check (jsonb_typeof(provenance) = 'object'),
  alias jsonb not null check (jsonb_typeof(alias) = 'object'),
  version text not null,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_language_aliases_valid_range
    check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint business_language_aliases_global_scope
    check ((alias->'workspaceScope') is null)
);

create table if not exists flow_internal.business_language_relations (
  relation_id text primary key,
  from_concept_id text not null references flow_internal.business_language_concepts(concept_id),
  to_concept_id text not null references flow_internal.business_language_concepts(concept_id),
  relation_type text not null check (relation_type in (
    'IS_A',
    'PART_OF',
    'HAS_STATUS',
    'MEASURED_BY',
    'DRIVES',
    'CONSTRAINS',
    'DEPENDS_ON',
    'CAUSES',
    'INDICATES',
    'OPPOSES',
    'REQUIRES_INFORMATION',
    'REQUIRES_AUTHORITY',
    'DISTINCT_FROM',
    'RELATED_TO'
  )),
  status text not null check (status in ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED', 'REJECTED')),
  provenance jsonb not null check (jsonb_typeof(provenance) = 'object'),
  relation jsonb not null check (jsonb_typeof(relation) = 'object'),
  version text not null,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_language_relations_no_is_a_self_reference
    check (relation_type <> 'IS_A' or from_concept_id <> to_concept_id)
);

create table if not exists public.workspace_business_language_aliases (
  alias_id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  alias_text text not null,
  normalized_alias text not null,
  language_tag text not null,
  script text,
  locale text,
  target_concept_id text not null references flow_internal.business_language_concepts(concept_id),
  alias_type text not null check (alias_type in (
    'EXACT_SYNONYM',
    'COLLOQUIAL',
    'FOUNDER_SPEAK',
    'ABBREVIATION',
    'ROMAN_URDU',
    'EXPERT_TERM',
    'PHRASE',
    'ACTION_PHRASE',
    'DEPRECATED_TERM'
  )),
  ambiguity_class text not null check (ambiguity_class in ('UNAMBIGUOUS', 'CONTEXTUAL', 'AMBIGUOUS', 'UNSAFE_REDEFINITION')),
  priority integer not null check (priority >= 0 and priority <= 100),
  status text not null check (status in ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED', 'REJECTED')),
  valid_from timestamptz,
  valid_to timestamptz,
  provenance jsonb not null check (jsonb_typeof(provenance) = 'object'),
  alias jsonb not null check (jsonb_typeof(alias) = 'object'),
  version text not null,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_business_language_aliases_valid_range
    check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint workspace_business_language_aliases_workspace_scope
    check ((alias->'workspaceScope'->>'workspaceId')::uuid = workspace_id)
);

create unique index if not exists business_language_aliases_unique_target_scope_idx
on flow_internal.business_language_aliases (
  normalized_alias,
  target_concept_id,
  language_tag,
  coalesce(script, ''),
  coalesce(locale, '')
);

create unique index if not exists workspace_business_language_aliases_unique_target_scope_idx
on public.workspace_business_language_aliases (
  workspace_id,
  normalized_alias,
  target_concept_id,
  language_tag,
  coalesce(script, ''),
  coalesce(locale, '')
);

create index if not exists business_language_concepts_name_idx
on flow_internal.business_language_concepts (lower(canonical_name));

create index if not exists business_language_concepts_status_domain_idx
on flow_internal.business_language_concepts (lifecycle_status, domain);

create index if not exists business_language_aliases_lookup_idx
on flow_internal.business_language_aliases (normalized_alias, status, language_tag);

create index if not exists business_language_aliases_target_idx
on flow_internal.business_language_aliases (target_concept_id, status);

create index if not exists business_language_relations_from_idx
on flow_internal.business_language_relations (from_concept_id, relation_type, status);

create index if not exists business_language_relations_to_idx
on flow_internal.business_language_relations (to_concept_id, relation_type, status);

create index if not exists workspace_business_language_aliases_lookup_idx
on public.workspace_business_language_aliases (workspace_id, normalized_alias, status, language_tag);

create index if not exists workspace_business_language_aliases_target_idx
on public.workspace_business_language_aliases (workspace_id, target_concept_id, status);

create or replace function flow_internal.reject_business_language_is_a_cycle()
returns trigger
language plpgsql
security definer
set search_path = flow_internal, pg_temp
as $$
begin
  if new.relation_type = 'IS_A' then
    if exists (
      with recursive ancestors(concept_id) as (
        select new.to_concept_id
        union
        select relation.to_concept_id
        from flow_internal.business_language_relations relation
        join ancestors on ancestors.concept_id = relation.from_concept_id
        where relation.relation_type = 'IS_A'
          and relation.status = 'ACTIVE'
          and relation.relation_id <> new.relation_id
      )
      select 1 from ancestors where concept_id = new.from_concept_id
    ) then
      raise exception 'business_language_relations IS_A cycle detected';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists business_language_relations_no_is_a_cycle
on flow_internal.business_language_relations;

create trigger business_language_relations_no_is_a_cycle
before insert or update on flow_internal.business_language_relations
for each row
execute function flow_internal.reject_business_language_is_a_cycle();

alter table flow_internal.business_language_concepts enable row level security;
alter table flow_internal.business_language_aliases enable row level security;
alter table flow_internal.business_language_relations enable row level security;
alter table public.workspace_business_language_aliases enable row level security;

create policy workspace_business_language_aliases_select
on public.workspace_business_language_aliases
for select
to authenticated
using (
  flow_private.has_active_membership(workspace_id)
  and flow_private.has_workspace_permission(workspace_id, 'language.read')
);

create policy workspace_business_language_aliases_insert
on public.workspace_business_language_aliases
for insert
to authenticated
with check (
  flow_private.has_active_membership(workspace_id)
  and flow_private.has_workspace_permission(workspace_id, 'language.manage')
);

create policy workspace_business_language_aliases_update
on public.workspace_business_language_aliases
for update
to authenticated
using (
  flow_private.has_active_membership(workspace_id)
  and flow_private.has_workspace_permission(workspace_id, 'language.manage')
)
with check (
  flow_private.has_active_membership(workspace_id)
  and flow_private.has_workspace_permission(workspace_id, 'language.manage')
);

create policy workspace_business_language_aliases_delete
on public.workspace_business_language_aliases
for delete
to authenticated
using (
  flow_private.has_active_membership(workspace_id)
  and flow_private.has_workspace_permission(workspace_id, 'language.manage')
);
