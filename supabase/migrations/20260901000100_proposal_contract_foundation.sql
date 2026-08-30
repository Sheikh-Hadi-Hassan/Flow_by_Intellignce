-- Phase 3 proposal and contract foundation. Additive only.

insert into public.permissions (key, description)
values
  ('proposal.manage', 'Create and edit proposal drafts.'),
  ('proposal.approve', 'Approve proposal versions for client sharing.'),
  ('proposal.share', 'Create and revoke client review links.'),
  ('contract.manage', 'Create and edit contract drafts.'),
  ('contract.approve', 'Approve contracts for client acceptance.'),
  ('contract.execute', 'Record executed contract acceptance.')
on conflict (key) do nothing;

alter table public.crm_opportunities
  drop constraint if exists crm_opportunities_status_check;

alter table public.crm_opportunities
  add constraint crm_opportunities_status_check
  check (journey_status in (
    'collecting_information',
    'missing_information',
    'ready_for_brief',
    'brief_draft',
    'founder_review',
    'changes_requested',
    'approved',
    'proposal_in_progress',
    'proposal_accepted',
    'contract_executed'
  ));

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null,
  brief_version_id uuid not null,
  currency text not null,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade,
  foreign key (brief_version_id, workspace_id)
    references public.brief_versions(id, workspace_id)
    on delete restrict,
  constraint proposals_currency_check check (currency ~ '^[A-Z]{3}$')
);

create table public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  proposal_id uuid not null,
  version_number integer not null,
  status text not null default 'draft',
  pricing_model text not null,
  calculation jsonb not null default '{}'::jsonb,
  document_hash text,
  approved_at timestamptz,
  approved_by uuid references public.users(id) on delete set null,
  immutable_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (proposal_id, version_number),
  foreign key (proposal_id, workspace_id)
    references public.proposals(id, workspace_id)
    on delete cascade,
  constraint proposal_versions_status_check
    check (status in (
      'draft', 'in_review', 'changes_requested', 'approved', 'sent',
      'client_review', 'accepted', 'declined', 'superseded', 'expired'
    )),
  constraint proposal_versions_pricing_check
    check (pricing_model in ('project', 'retainer', 'milestone', 'hourly', 'hybrid'))
);

create table public.proposal_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  proposal_version_id uuid not null,
  section_key text not null,
  title text not null,
  body text not null default '',
  sort_order integer not null default 0,
  unique (id, workspace_id),
  unique (proposal_version_id, section_key),
  foreign key (proposal_version_id, workspace_id)
    references public.proposal_versions(id, workspace_id)
    on delete cascade
);

create table public.proposal_pricing_packages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  proposal_version_id uuid not null,
  name text not null,
  pricing_model text not null,
  subtotal_minor bigint not null default 0,
  discount_bps integer not null default 0,
  tax_bps integer not null default 0,
  contingency_bps integer not null default 0,
  total_minor bigint not null default 0,
  is_recommended boolean not null default false,
  unique (id, workspace_id),
  foreign key (proposal_version_id, workspace_id)
    references public.proposal_versions(id, workspace_id)
    on delete cascade,
  constraint proposal_packages_money_check check (
    subtotal_minor >= 0 and total_minor >= 0
    and discount_bps >= 0 and tax_bps >= 0 and contingency_bps >= 0
  )
);

create table public.proposal_line_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  package_id uuid not null,
  description text not null,
  quantity integer not null default 1,
  unit_price_minor bigint not null,
  line_total_minor bigint not null,
  sort_order integer not null default 0,
  unique (id, workspace_id),
  foreign key (package_id, workspace_id)
    references public.proposal_pricing_packages(id, workspace_id)
    on delete cascade,
  constraint proposal_line_items_check check (
    quantity > 0 and unit_price_minor >= 0 and line_total_minor >= 0
  )
);

create table public.proposal_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  proposal_version_id uuid not null,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (token_hash),
  foreign key (proposal_version_id, workspace_id)
    references public.proposal_versions(id, workspace_id)
    on delete cascade
);

create table public.proposal_client_responses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  proposal_version_id uuid not null,
  response text not null,
  message text,
  consent_text text not null,
  document_hash text not null,
  responded_at timestamptz not null default now(),
  actor_label text not null,
  unique (id, workspace_id),
  foreign key (proposal_version_id, workspace_id)
    references public.proposal_versions(id, workspace_id)
    on delete cascade,
  constraint proposal_client_response_check
    check (response in ('accepted', 'declined', 'changes_requested'))
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null,
  proposal_version_id uuid not null,
  currency text not null,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id)
    on delete cascade,
  foreign key (proposal_version_id, workspace_id)
    references public.proposal_versions(id, workspace_id)
    on delete restrict,
  constraint contracts_currency_check check (currency ~ '^[A-Z]{3}$')
);

create table public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contract_id uuid not null,
  version_number integer not null,
  status text not null default 'draft',
  calculation jsonb not null default '{}'::jsonb,
  document_hash text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (contract_id, version_number),
  foreign key (contract_id, workspace_id)
    references public.contracts(id, workspace_id)
    on delete cascade,
  constraint contract_versions_status_check
    check (status in (
      'draft', 'in_review', 'changes_requested',
      'pending_client_acceptance', 'executed', 'terminated', 'superseded'
    ))
);

create table public.contract_clauses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contract_version_id uuid not null,
  clause_key text not null,
  title text not null,
  body text not null default '',
  sort_order integer not null default 0,
  unique (id, workspace_id),
  unique (contract_version_id, clause_key),
  foreign key (contract_version_id, workspace_id)
    references public.contract_versions(id, workspace_id)
    on delete cascade
);

create table public.contract_parties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contract_version_id uuid not null,
  party_role text not null,
  legal_name text not null,
  email text,
  sort_order integer not null default 0,
  unique (id, workspace_id),
  foreign key (contract_version_id, workspace_id)
    references public.contract_versions(id, workspace_id)
    on delete cascade,
  constraint contract_parties_role_check
    check (party_role in ('provider', 'client', 'witness'))
);

create table public.contract_payment_schedule_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contract_version_id uuid not null,
  label text not null,
  due_description text not null,
  amount_minor bigint not null,
  sort_order integer not null default 0,
  unique (id, workspace_id),
  foreign key (contract_version_id, workspace_id)
    references public.contract_versions(id, workspace_id)
    on delete cascade,
  constraint contract_payment_amount_check check (amount_minor >= 0)
);

create table public.contract_acceptances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contract_version_id uuid not null,
  consent_text text not null,
  document_hash text not null,
  actor_label text not null,
  accepted_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (contract_version_id, workspace_id)
    references public.contract_versions(id, workspace_id)
    on delete cascade
);

create index proposals_workspace_opp_idx
  on public.proposals(workspace_id, opportunity_id);
create index proposal_versions_workspace_status_idx
  on public.proposal_versions(workspace_id, status);
create index contracts_workspace_opp_idx
  on public.contracts(workspace_id, opportunity_id);
create index contract_versions_workspace_status_idx
  on public.contract_versions(workspace_id, status);

create or replace function flow_private.prevent_immutable_proposal_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and old.status in ('accepted', 'declined') then
    raise exception 'final proposal versions cannot be deleted';
  end if;
  if tg_op = 'UPDATE' and old.status in ('accepted', 'declined') then
    raise exception 'final proposal versions cannot be updated';
  end if;
  return new;
end;
$$;

create trigger proposal_versions_immutable
  before update or delete on public.proposal_versions
  for each row
  execute function flow_private.prevent_immutable_proposal_version_mutation();

create or replace function flow_private.prevent_executed_contract_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and old.status = 'executed' then
    raise exception 'executed contract versions are immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'executed' then
    raise exception 'executed contract versions are immutable';
  end if;
  return new;
end;
$$;

create trigger contract_versions_immutable_executed
  before update or delete on public.contract_versions
  for each row
  execute function flow_private.prevent_executed_contract_version_mutation();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'proposals',
    'proposal_versions',
    'proposal_sections',
    'proposal_pricing_packages',
    'proposal_line_items',
    'proposal_shares',
    'proposal_client_responses',
    'contracts',
    'contract_versions',
    'contract_clauses',
    'contract_parties',
    'contract_payment_schedule_items',
    'contract_acceptances'
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

create policy proposals_write
  on public.proposals for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'));

create policy proposal_versions_write
  on public.proposal_versions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'));

create policy proposal_sections_write
  on public.proposal_sections for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'));

create policy proposal_packages_write
  on public.proposal_pricing_packages for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'));

create policy proposal_line_items_write
  on public.proposal_line_items for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'));

create policy proposal_shares_write
  on public.proposal_shares for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'proposal.share'))
  with check (flow_private.has_workspace_permission(workspace_id, 'proposal.share'));

create policy proposal_responses_write
  on public.proposal_client_responses for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'proposal.manage'));

create policy contracts_write
  on public.contracts for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'contract.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'contract.manage'));

create policy contract_versions_write
  on public.contract_versions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'contract.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'contract.manage'));

create policy contract_clauses_write
  on public.contract_clauses for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'contract.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'contract.manage'));

create policy contract_parties_write
  on public.contract_parties for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'contract.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'contract.manage'));

create policy contract_payment_write
  on public.contract_payment_schedule_items for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'contract.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'contract.manage'));

create policy contract_acceptances_write
  on public.contract_acceptances for insert to authenticated
  with check (
    flow_private.has_workspace_permission(workspace_id, 'contract.execute')
    or flow_private.has_workspace_permission(workspace_id, 'contract.approve')
  );

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in (
    'proposal.manage',
    'proposal.approve',
    'proposal.share',
    'contract.manage',
    'contract.approve',
    'contract.execute'
  )
where role.key in ('FOUNDER', 'OWNER')
on conflict do nothing;
