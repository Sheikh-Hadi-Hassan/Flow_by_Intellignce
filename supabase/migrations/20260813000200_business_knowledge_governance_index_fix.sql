-- Forward-only index fix for Task 001.1 live Supabase advisor findings.
-- Adds covering indexes for knowledge-governance foreign keys.

create index if not exists source_releases_license_profile_fk_idx
on flow_internal.source_releases (license_profile_id);

create index if not exists source_releases_supersedes_fk_idx
on flow_internal.source_releases (supersedes_release_id)
where supersedes_release_id is not null;

create index if not exists business_knowledge_units_license_profile_fk_idx
on flow_internal.business_knowledge_units (license_profile_id);

create index if not exists business_knowledge_units_source_release_fk_idx
on flow_internal.business_knowledge_units (source_release_id);

create index if not exists business_knowledge_units_supersedes_fk_idx
on flow_internal.business_knowledge_units (supersedes_knowledge_id)
where supersedes_knowledge_id is not null;

create index if not exists workspace_business_knowledge_units_license_profile_fk_idx
on public.workspace_business_knowledge_units (license_profile_id);

create index if not exists workspace_business_knowledge_units_source_fk_idx
on public.workspace_business_knowledge_units (source_id);

create index if not exists workspace_business_knowledge_units_source_release_fk_idx
on public.workspace_business_knowledge_units (source_release_id);
