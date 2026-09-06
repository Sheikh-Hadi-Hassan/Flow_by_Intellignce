-- DEMO-02D — BB-01 Business Registry RLS closure.
-- Repairs overly broad membership SELECT policies, moves sensitive org
-- financial/ownership metadata into satellite tables, introduces explicit
-- registry read/audit permissions, and hardens the organization delete trigger.
-- Does not create a second legal-entity identity table.

insert into public.permissions (key, description)
values
  ('registry.document.read', 'Read registration and insurance document metadata.'),
  ('registry.signatory.read', 'Read authorised signatories.'),
  ('registry.compliance.read', 'Read compliance obligations.'),
  ('registry.audit.read', 'Read business registry audit events.')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in (
    'registry.document.read',
    'registry.signatory.read',
    'registry.compliance.read',
    'registry.audit.read'
  )
where role.key in ('OWNER', 'FOUNDER')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Sensitive organization data → protected satellite tables (design A)
-- ---------------------------------------------------------------------------

create table if not exists public.organization_tax_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid not null,
  demo_key text,
  payload jsonb not null default '[]'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, organization_id),
  foreign key (organization_id, workspace_id)
    references public.organizations(id, workspace_id)
    on delete restrict
);

create table if not exists public.organization_bank_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid not null,
  demo_key text,
  payload jsonb not null default '[]'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, organization_id),
  foreign key (organization_id, workspace_id)
    references public.organizations(id, workspace_id)
    on delete restrict
);

create table if not exists public.organization_ownership_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid not null,
  demo_key text,
  payload jsonb not null default '[]'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, organization_id),
  foreign key (organization_id, workspace_id)
    references public.organizations(id, workspace_id)
    on delete restrict
);

insert into public.organization_tax_records (
  workspace_id, organization_id, payload, is_demo
)
select
  workspace_id,
  id,
  coalesce(tax_metadata, '[]'::jsonb),
  coalesce(is_demo, false)
from public.organizations
where jsonb_typeof(coalesce(tax_metadata, '[]'::jsonb)) = 'array'
  and coalesce(tax_metadata, '[]'::jsonb) <> '[]'::jsonb
on conflict (workspace_id, organization_id) do update
  set payload = excluded.payload,
      updated_at = now();

insert into public.organization_bank_records (
  workspace_id, organization_id, payload, is_demo
)
select
  workspace_id,
  id,
  coalesce(bank_metadata, '[]'::jsonb),
  coalesce(is_demo, false)
from public.organizations
where jsonb_typeof(coalesce(bank_metadata, '[]'::jsonb)) = 'array'
  and coalesce(bank_metadata, '[]'::jsonb) <> '[]'::jsonb
on conflict (workspace_id, organization_id) do update
  set payload = excluded.payload,
      updated_at = now();

insert into public.organization_ownership_records (
  workspace_id, organization_id, payload, is_demo
)
select
  workspace_id,
  id,
  coalesce(ownership, '[]'::jsonb),
  coalesce(is_demo, false)
from public.organizations
where jsonb_typeof(coalesce(ownership, '[]'::jsonb)) = 'array'
  and coalesce(ownership, '[]'::jsonb) <> '[]'::jsonb
on conflict (workspace_id, organization_id) do update
  set payload = excluded.payload,
      updated_at = now();

alter table public.organizations
  drop column if exists tax_metadata,
  drop column if exists bank_metadata,
  drop column if exists ownership;

-- Employee-safe public identity view (security_invoker; no second legal entity).
create or replace view public.organization_public_identity
with (security_invoker = true) as
select
  id,
  workspace_id,
  name,
  display_name,
  legal_name,
  trading_name,
  entity_type,
  registration_number,
  operating_jurisdiction,
  legal_status,
  formation_date,
  fiscal_year_label,
  business_model,
  slug,
  status,
  country_code,
  default_currency,
  timezone,
  website,
  description,
  primary_industry,
  firmographics,
  fictional_label,
  is_demo,
  demo_key,
  created_at,
  updated_at
from public.organizations;

grant select on public.organization_public_identity to authenticated;

-- Organization SELECT requires explicit organization.read (not bare membership).
drop policy if exists "members can read organizations in active workspaces"
  on public.organizations;
drop policy if exists "organization readers can read organizations"
  on public.organizations;
create policy "organization readers can read organizations"
  on public.organizations
  for select
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'organization.read'));

-- Locations: read requires location.read; manage unchanged.
drop policy if exists "members can read organization locations"
  on public.organization_locations;
drop policy if exists "location readers can read organization locations"
  on public.organization_locations;
create policy "location readers can read organization locations"
  on public.organization_locations
  for select
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'location.read'));

alter table public.organization_tax_records enable row level security;
alter table public.organization_bank_records enable row level security;
alter table public.organization_ownership_records enable row level security;

drop policy if exists "tax managers can manage organization tax records"
  on public.organization_tax_records;
create policy "tax managers can manage organization tax records"
  on public.organization_tax_records
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'registry.tax.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'registry.tax.manage'));

drop policy if exists "tax managers can manage organization bank records"
  on public.organization_bank_records;
create policy "tax managers can manage organization bank records"
  on public.organization_bank_records
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'registry.tax.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'registry.tax.manage'));

-- Ownership is private: only profile managers (Founder/Admin), not Finance tax.manage.
drop policy if exists "profile managers can manage organization ownership records"
  on public.organization_ownership_records;
create policy "profile managers can manage organization ownership records"
  on public.organization_ownership_records
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'organization.update_profile'))
  with check (flow_private.has_workspace_permission(workspace_id, 'organization.update_profile'));

grant select, insert, update, delete on public.organization_tax_records to authenticated;
grant select, insert, update, delete on public.organization_bank_records to authenticated;
grant select, insert, update, delete on public.organization_ownership_records to authenticated;

-- ---------------------------------------------------------------------------
-- Compliance records — record-type-aware policies (drop membership SELECT)
-- ---------------------------------------------------------------------------

drop policy if exists "members can read organization compliance records"
  on public.organization_compliance_records;
drop policy if exists "document managers can manage organization compliance records"
  on public.organization_compliance_records;
drop policy if exists "document readers can read registration documents"
  on public.organization_compliance_records;
drop policy if exists "document managers can manage registration documents"
  on public.organization_compliance_records;
drop policy if exists "tax managers can manage tax compliance records"
  on public.organization_compliance_records;
drop policy if exists "compliance managers can manage compliance obligations"
  on public.organization_compliance_records;
drop policy if exists "insurance document readers can read insurance metadata"
  on public.organization_compliance_records;
drop policy if exists "insurance document managers can manage insurance metadata"
  on public.organization_compliance_records;

create policy "document readers can read registration documents"
  on public.organization_compliance_records
  for select
  to authenticated
  using (
    record_type in (
      'formation',
      'registration_certificate',
      'privacy_policy',
      'retention_policy',
      'authorised_signatory_record',
      'w9'
    )
    and (
      flow_private.has_workspace_permission(workspace_id, 'registry.document.read')
      or flow_private.has_workspace_permission(workspace_id, 'registry.document.manage')
    )
  );

create policy "document managers can manage registration documents"
  on public.organization_compliance_records
  for all
  to authenticated
  using (
    record_type in (
      'formation',
      'registration_certificate',
      'privacy_policy',
      'retention_policy',
      'authorised_signatory_record',
      'w9'
    )
    and flow_private.has_workspace_permission(workspace_id, 'registry.document.manage')
  )
  with check (
    record_type in (
      'formation',
      'registration_certificate',
      'privacy_policy',
      'retention_policy',
      'authorised_signatory_record',
      'w9'
    )
    and flow_private.has_workspace_permission(workspace_id, 'registry.document.manage')
  );

create policy "tax managers can manage tax compliance records"
  on public.organization_compliance_records
  for all
  to authenticated
  using (
    record_type in ('tax_registration', 'tax', 'banking')
    and flow_private.has_workspace_permission(workspace_id, 'registry.tax.manage')
  )
  with check (
    record_type in ('tax_registration', 'tax', 'banking')
    and flow_private.has_workspace_permission(workspace_id, 'registry.tax.manage')
  );

create policy "insurance document readers can read insurance metadata"
  on public.organization_compliance_records
  for select
  to authenticated
  using (
    record_type in ('general_liability', 'professional_liability', 'insurance')
    and (
      flow_private.has_workspace_permission(workspace_id, 'registry.document.read')
      or flow_private.has_workspace_permission(workspace_id, 'registry.document.manage')
      or flow_private.has_workspace_permission(workspace_id, 'registry.compliance.read')
      or flow_private.has_workspace_permission(workspace_id, 'registry.compliance.manage')
    )
  );

create policy "insurance document managers can manage insurance metadata"
  on public.organization_compliance_records
  for all
  to authenticated
  using (
    record_type in ('general_liability', 'professional_liability', 'insurance')
    and (
      flow_private.has_workspace_permission(workspace_id, 'registry.document.manage')
      or flow_private.has_workspace_permission(workspace_id, 'registry.compliance.manage')
    )
  )
  with check (
    record_type in ('general_liability', 'professional_liability', 'insurance')
    and (
      flow_private.has_workspace_permission(workspace_id, 'registry.document.manage')
      or flow_private.has_workspace_permission(workspace_id, 'registry.compliance.manage')
    )
  );

create policy "compliance managers can manage compliance obligations"
  on public.organization_compliance_records
  for all
  to authenticated
  using (
    record_type in ('compliance_obligation', 'obligation', 'licence', 'license')
    and (
      flow_private.has_workspace_permission(workspace_id, 'registry.compliance.read')
      or flow_private.has_workspace_permission(workspace_id, 'registry.compliance.manage')
    )
  )
  with check (
    record_type in ('compliance_obligation', 'obligation', 'licence', 'license')
    and flow_private.has_workspace_permission(workspace_id, 'registry.compliance.manage')
  );

-- ---------------------------------------------------------------------------
-- Signatories — explicit read/manage only (no membership SELECT)
-- ---------------------------------------------------------------------------

drop policy if exists "members can read organization signatories"
  on public.organization_signatories;
drop policy if exists "signatory readers can read organization signatories"
  on public.organization_signatories;
drop policy if exists "signatory managers can manage organization signatories"
  on public.organization_signatories;

create policy "signatory readers can read organization signatories"
  on public.organization_signatories
  for select
  to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'registry.signatory.read')
    or flow_private.has_workspace_permission(workspace_id, 'registry.signatory.manage')
  );

create policy "signatory managers can manage organization signatories"
  on public.organization_signatories
  for all
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'registry.signatory.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'registry.signatory.manage'));

-- ---------------------------------------------------------------------------
-- Registry audit — explicit audit permission; broader authorized append
-- ---------------------------------------------------------------------------

drop policy if exists "members can read organization registry audit"
  on public.organization_registry_audit_events;
drop policy if exists "audit readers can read organization registry audit"
  on public.organization_registry_audit_events;
drop policy if exists "profile managers can append organization registry audit"
  on public.organization_registry_audit_events;
drop policy if exists "authorized registry actors can append organization registry audit"
  on public.organization_registry_audit_events;

create policy "audit readers can read organization registry audit"
  on public.organization_registry_audit_events
  for select
  to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'registry.audit.read'));

create policy "authorized registry actors can append organization registry audit"
  on public.organization_registry_audit_events
  for insert
  to authenticated
  with check (
    flow_private.has_workspace_permission(workspace_id, 'organization.update_profile')
    or flow_private.has_workspace_permission(workspace_id, 'location.manage')
    or flow_private.has_workspace_permission(workspace_id, 'registry.document.manage')
    or flow_private.has_workspace_permission(workspace_id, 'registry.tax.manage')
    or flow_private.has_workspace_permission(workspace_id, 'registry.signatory.manage')
    or flow_private.has_workspace_permission(workspace_id, 'registry.compliance.manage')
  );

-- Append-only: no UPDATE/DELETE policies for audit events.

-- ---------------------------------------------------------------------------
-- Delete protection — invoker trigger (elevation not required)
-- ---------------------------------------------------------------------------

create or replace function flow_private.prevent_organization_delete()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- Invoker is sufficient: this trigger only raises and never reads or writes
  -- privileged rows. Kept in flow_private (not exposed schemas).
  raise exception 'Canonical organization identity cannot be deleted.';
end;
$$;

revoke all on function flow_private.prevent_organization_delete() from public;
revoke all on function flow_private.prevent_organization_delete() from anon, authenticated;
-- Trigger owner (table owner / migration role) retains EXECUTE implicitly.
