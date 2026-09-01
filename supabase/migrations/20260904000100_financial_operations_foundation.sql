-- Phase 6 financial operations foundation. Additive only.

insert into public.permissions (key, description)
values
  ('finance.time.own', 'Create and submit own time entries.'),
  ('finance.time.read', 'View workspace time entries.'),
  ('finance.time.approve', 'Approve or reject submitted time entries.'),
  ('finance.expense.own', 'Create and submit own expenses.'),
  ('finance.expense.read', 'View workspace expenses.'),
  ('finance.expense.approve', 'Approve or reject submitted expenses.'),
  ('finance.invoice.read', 'View invoices and schedules.'),
  ('finance.invoice.manage', 'Create and edit draft invoices.'),
  ('finance.invoice.approve', 'Review, approve, issue, and void invoices.'),
  ('finance.payment.record', 'Record payments and allocations.'),
  ('finance.report.read', 'View financial summaries and receivables.'),
  ('finance.profitability.read', 'View project profitability and labour cost.')
on conflict (key) do nothing;

create table public.workspace_billing_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  invoice_prefix text not null default 'INV',
  next_invoice_sequence integer not null default 1,
  default_payment_terms_days integer not null default 30,
  default_currency text not null default 'USD',
  default_tax_bps integer not null default 0,
  tax_inclusive boolean not null default false,
  invoice_footer_notes text not null default '',
  updated_at timestamptz not null default now(),
  constraint workspace_billing_settings_currency_check
    check (default_currency ~ '^[A-Z]{3}$'),
  constraint workspace_billing_settings_tax_bps_check
    check (default_tax_bps >= 0 and default_tax_bps <= 10000),
  constraint workspace_billing_settings_sequence_check
    check (next_invoice_sequence >= 1)
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  task_id uuid,
  phase_id uuid,
  resource_profile_id uuid,
  submitted_by_membership_id uuid not null references public.workspace_memberships(id) on delete restrict,
  work_date date not null,
  duration_minutes integer not null,
  billable boolean not null default true,
  description text not null default '',
  hourly_rate_minor bigint,
  currency text not null,
  status text not null default 'draft',
  invoice_id uuid,
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  constraint time_entries_duration_check check (duration_minutes > 0),
  constraint time_entries_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint time_entries_status_check check (status in (
    'draft', 'submitted', 'approved', 'rejected', 'invoiced'
  )),
  constraint time_entries_rate_check
    check (hourly_rate_minor is null or hourly_rate_minor >= 0)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  submitted_by_membership_id uuid not null references public.workspace_memberships(id) on delete restrict,
  vendor_name text not null default '',
  expense_date date not null,
  description text not null default '',
  category text not null default 'general',
  amount_minor bigint not null,
  tax_amount_minor bigint not null default 0,
  currency text not null,
  billable boolean not null default true,
  receipt_reference text not null default '',
  status text not null default 'draft',
  invoice_id uuid,
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.users(id) on delete set null,
  reimbursed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  constraint expenses_amount_check check (amount_minor >= 0),
  constraint expenses_tax_check check (tax_amount_minor >= 0),
  constraint expenses_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint expenses_status_check check (status in (
    'draft', 'submitted', 'approved', 'rejected', 'reimbursed', 'invoiced'
  ))
);

create table public.invoice_schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  contract_schedule_item_id uuid,
  schedule_type text not null,
  label text not null,
  trigger_description text not null default '',
  amount_minor bigint not null,
  currency text not null,
  due_date date,
  status text not null default 'pending',
  generated_invoice_id uuid,
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, idempotency_key),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  constraint invoice_schedules_type_check check (schedule_type in (
    'deposit', 'milestone', 'retainer', 'final', 'manual'
  )),
  constraint invoice_schedules_status_check check (status in (
    'pending', 'scheduled', 'generated', 'cancelled'
  )),
  constraint invoice_schedules_amount_check check (amount_minor >= 0),
  constraint invoice_schedules_currency_check check (currency ~ '^[A-Z]{3}$')
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  client_id uuid not null,
  opportunity_id uuid not null,
  invoice_number text,
  status text not null default 'draft',
  currency text not null,
  subtotal_minor bigint not null default 0,
  discount_minor bigint not null default 0,
  tax_minor bigint not null default 0,
  total_minor bigint not null default 0,
  amount_paid_minor bigint not null default 0,
  balance_due_minor bigint not null default 0,
  issue_date date,
  due_date date,
  payment_terms_days integer not null default 30,
  notes text not null default '',
  client_snapshot jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, invoice_number),
  unique (workspace_id, idempotency_key),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  foreign key (client_id, workspace_id)
    references public.crm_clients(id, workspace_id) on delete restrict,
  foreign key (opportunity_id, workspace_id)
    references public.crm_opportunities(id, workspace_id) on delete restrict,
  constraint invoices_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint invoices_status_check check (status in (
    'draft', 'founder_review', 'changes_requested', 'approved',
    'issued', 'partially_paid', 'paid', 'overdue', 'void'
  )),
  constraint invoices_amounts_check check (
    subtotal_minor >= 0 and discount_minor >= 0 and tax_minor >= 0
    and total_minor >= 0 and amount_paid_minor >= 0 and balance_due_minor >= 0
  )
);

alter table public.time_entries
  add constraint time_entries_invoice_fk
  foreign key (invoice_id, workspace_id)
  references public.invoices(id, workspace_id) on delete set null;

alter table public.expenses
  add constraint expenses_invoice_fk
  foreign key (invoice_id, workspace_id)
  references public.invoices(id, workspace_id) on delete set null;

alter table public.invoice_schedules
  add constraint invoice_schedules_invoice_fk
  foreign key (generated_invoice_id, workspace_id)
  references public.invoices(id, workspace_id) on delete set null;

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  invoice_id uuid not null,
  line_type text not null,
  description text not null,
  quantity bigint not null default 1,
  unit_amount_minor bigint not null,
  amount_minor bigint not null,
  source_type text,
  source_id uuid,
  sort_order integer not null default 0,
  unique (id, workspace_id),
  foreign key (invoice_id, workspace_id)
    references public.invoices(id, workspace_id) on delete cascade,
  constraint invoice_line_items_type_check check (line_type in (
    'fixed', 'milestone', 'time', 'expense', 'manual'
  )),
  constraint invoice_line_items_qty_check check (quantity >= 0),
  constraint invoice_line_items_amount_check check (
    unit_amount_minor >= 0 and amount_minor >= 0
  )
);

create table public.invoice_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  invoice_id uuid not null,
  version_number integer not null,
  snapshot jsonb not null,
  document_hash text not null,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.users(id) on delete set null,
  unique (id, workspace_id),
  unique (invoice_id, version_number),
  foreign key (invoice_id, workspace_id)
    references public.invoices(id, workspace_id) on delete cascade
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_date date not null,
  amount_minor bigint not null,
  currency text not null,
  payment_method text not null default 'manual',
  external_reference text not null default '',
  notes text not null default '',
  status text not null default 'recorded',
  idempotency_key text,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, idempotency_key),
  constraint payments_amount_check check (amount_minor > 0),
  constraint payments_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint payments_status_check check (status in ('recorded', 'reversed'))
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  payment_id uuid not null,
  invoice_id uuid not null,
  amount_minor bigint not null,
  unique (id, workspace_id),
  unique (payment_id, invoice_id),
  foreign key (payment_id, workspace_id)
    references public.payments(id, workspace_id) on delete cascade,
  foreign key (invoice_id, workspace_id)
    references public.invoices(id, workspace_id) on delete restrict,
  constraint payment_allocations_amount_check check (amount_minor > 0)
);

create table public.finance_guard_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  invoice_id uuid not null,
  decision text not null,
  actor_id uuid references public.users(id) on delete set null,
  rationale text not null default '',
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (invoice_id, workspace_id)
    references public.invoices(id, workspace_id) on delete cascade,
  constraint finance_guard_decisions_check
    check (decision in ('allow', 'deny', 'pending'))
);

create table public.finance_activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  event_type text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index time_entries_workspace_project_idx
  on public.time_entries(workspace_id, project_id, status);
create index time_entries_workspace_status_idx
  on public.time_entries(workspace_id, status);
create index expenses_workspace_project_idx
  on public.expenses(workspace_id, project_id, status);
create index invoice_schedules_workspace_project_idx
  on public.invoice_schedules(workspace_id, project_id);
create index invoices_workspace_status_idx
  on public.invoices(workspace_id, status);
create index invoices_workspace_client_idx
  on public.invoices(workspace_id, client_id);
create index invoice_line_items_invoice_idx
  on public.invoice_line_items(workspace_id, invoice_id);
create index payments_workspace_date_idx
  on public.payments(workspace_id, payment_date);
create index payment_allocations_invoice_idx
  on public.payment_allocations(workspace_id, invoice_id);
create index finance_activity_events_workspace_idx
  on public.finance_activity_events(workspace_id, created_at desc);

create or replace function flow_private.prevent_issued_invoice_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status in ('issued', 'partially_paid', 'paid', 'overdue') then
    if new.status = old.status
      and new.subtotal_minor = old.subtotal_minor
      and new.total_minor = old.total_minor
      and new.invoice_number is not distinct from old.invoice_number
      and (new.amount_paid_minor <> old.amount_paid_minor
        or new.balance_due_minor <> old.balance_due_minor
        or new.status <> old.status) then
      return new;
    end if;
    if new.status in ('partially_paid', 'paid', 'overdue', 'void')
      and new.subtotal_minor = old.subtotal_minor
      and new.total_minor = old.total_minor
      and new.invoice_number is not distinct from old.invoice_number then
      return new;
    end if;
    raise exception 'issued invoices are immutable except payment status updates';
  end if;
  return new;
end;
$$;

create trigger invoices_issued_immutable
  before update on public.invoices
  for each row execute function flow_private.prevent_issued_invoice_mutation();

create or replace function flow_private.prevent_invoice_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    raise exception 'invoice versions are immutable';
  end if;
  return new;
end;
$$;

create trigger invoice_versions_immutable
  before update or delete on public.invoice_versions
  for each row execute function flow_private.prevent_invoice_version_mutation();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'workspace_billing_settings',
    'time_entries',
    'expenses',
    'invoice_schedules',
    'invoices',
    'invoice_line_items',
    'invoice_versions',
    'payments',
    'payment_allocations',
    'finance_guard_decisions',
    'finance_activity_events'
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

create policy workspace_billing_settings_write
  on public.workspace_billing_settings for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'finance.invoice.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'finance.invoice.manage'));

create policy time_entries_own_write
  on public.time_entries for insert to authenticated
  with check (
    flow_private.has_workspace_permission(workspace_id, 'finance.time.own')
    or flow_private.has_workspace_permission(workspace_id, 'finance.time.approve')
  );

create policy time_entries_update
  on public.time_entries for update to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'finance.time.approve')
    or (
      flow_private.has_workspace_permission(workspace_id, 'finance.time.own')
      and status in ('draft', 'rejected')
    )
  );

create policy expenses_own_write
  on public.expenses for insert to authenticated
  with check (
    flow_private.has_workspace_permission(workspace_id, 'finance.expense.own')
    or flow_private.has_workspace_permission(workspace_id, 'finance.expense.approve')
  );

create policy expenses_update
  on public.expenses for update to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'finance.expense.approve')
    or (
      flow_private.has_workspace_permission(workspace_id, 'finance.expense.own')
      and status in ('draft', 'rejected')
    )
  );

create policy invoice_schedules_write
  on public.invoice_schedules for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'finance.invoice.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'finance.invoice.manage'));

create policy invoices_write
  on public.invoices for all to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'finance.invoice.manage')
    or flow_private.has_workspace_permission(workspace_id, 'finance.invoice.approve')
  )
  with check (
    flow_private.has_workspace_permission(workspace_id, 'finance.invoice.manage')
    or flow_private.has_workspace_permission(workspace_id, 'finance.invoice.approve')
  );

create policy invoice_line_items_write
  on public.invoice_line_items for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'finance.invoice.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'finance.invoice.manage'));

create policy invoice_versions_insert
  on public.invoice_versions for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'finance.invoice.approve'));

create policy payments_write
  on public.payments for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'finance.payment.record'))
  with check (flow_private.has_workspace_permission(workspace_id, 'finance.payment.record'));

create policy payment_allocations_write
  on public.payment_allocations for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'finance.payment.record'))
  with check (flow_private.has_workspace_permission(workspace_id, 'finance.payment.record'));

create policy finance_guard_decisions_write
  on public.finance_guard_decisions for all to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'finance.invoice.approve'))
  with check (flow_private.has_workspace_permission(workspace_id, 'finance.invoice.approve'));

create policy finance_activity_events_insert
  on public.finance_activity_events for insert to authenticated
  with check (flow_private.has_active_membership(workspace_id));

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.key = 'FOUNDER'
  and permission.key like 'finance.%'
on conflict do nothing;
