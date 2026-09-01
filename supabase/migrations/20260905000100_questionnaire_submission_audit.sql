-- Phase questionnaire: submission audit and questionnaire discovery source kind
alter table public.catalog_questionnaire_responses
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid;

alter table public.discovery_sources
  drop constraint if exists discovery_sources_source_kind_check;

alter table public.discovery_sources
  add constraint discovery_sources_source_kind_check
  check (source_kind in ('meeting_notes', 'transcript', 'document', 'questionnaire'));
