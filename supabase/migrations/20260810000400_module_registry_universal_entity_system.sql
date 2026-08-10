-- Flow module registry and universal entity metadata foundation.
-- Code-defined module manifests remain authoritative for trusted executable behavior.

create table public.module_definitions (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  version text not null,
  name text not null,
  description text not null,
  category text,
  status text not null default 'ACTIVE',
  capabilities jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  entity_types jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  configuration_schema jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint module_definitions_status_check
    check (status in ('ACTIVE', 'DEPRECATED', 'DISABLED')),
  constraint module_definitions_no_executable_metadata
    check (
      description !~* '(javascript:|https?://|<script|select |insert |delete |drop |shell )'
    )
);

create table public.workspace_module_activations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  module_key text not null references public.module_definitions(module_key) on delete restrict,
  version text not null,
  status text not null default 'ENABLED',
  configuration jsonb not null default '{}'::jsonb,
  enabled_at timestamptz not null default now(),
  enabled_by uuid not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (workspace_id, module_key),
  constraint workspace_module_activations_status_check
    check (status in ('ENABLED', 'DISABLED')),
  constraint workspace_module_activations_configuration_object_check
    check (jsonb_typeof(configuration) = 'object')
);

create table public.entity_type_definitions (
  id uuid primary key default gen_random_uuid(),
  entity_key text not null,
  module_key text not null references public.module_definitions(module_key) on delete restrict,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  plural_name text,
  description text,
  kind text not null,
  status text not null default 'DRAFT',
  version text not null,
  ownership_scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_key, workspace_id),
  constraint entity_type_definitions_kind_check
    check (kind in ('SYSTEM', 'CUSTOM')),
  constraint entity_type_definitions_status_check
    check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  constraint entity_type_definitions_ownership_check
    check (ownership_scope in ('WORKSPACE', 'ORGANIZATION', 'USER')),
  constraint entity_type_definitions_scope_check
    check (
      (kind = 'SYSTEM' and workspace_id is null)
      or (kind = 'CUSTOM' and workspace_id is not null)
    )
);

create table public.field_definitions (
  id uuid primary key default gen_random_uuid(),
  entity_type_definition_id uuid not null references public.entity_type_definitions(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null,
  is_required boolean not null default false,
  is_immutable boolean not null default false,
  source text not null,
  version text not null,
  enum_values jsonb,
  reference_target_entity_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type_definition_id, field_key),
  constraint field_definitions_type_check
    check (
      field_type in (
        'STRING',
        'TEXT',
        'BOOLEAN',
        'INTEGER',
        'DECIMAL',
        'DATE',
        'DATETIME',
        'ENUM',
        'REFERENCE',
        'JSON'
      )
    ),
  constraint field_definitions_source_check
    check (source in ('SYSTEM', 'CUSTOM')),
  constraint field_definitions_enum_check
    check (
      field_type <> 'ENUM'
      or (enum_values is not null and jsonb_typeof(enum_values) = 'array')
    ),
  constraint field_definitions_reference_check
    check (
      field_type <> 'REFERENCE'
      or reference_target_entity_key is not null
    )
);

create table public.relationship_definitions (
  id uuid primary key default gen_random_uuid(),
  relationship_key text not null,
  owner text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  source_entity_key text not null,
  target_entity_key text not null,
  cardinality text not null,
  status text not null default 'DRAFT',
  version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (relationship_key, workspace_id),
  constraint relationship_definitions_owner_check
    check (owner in ('PLATFORM', 'WORKSPACE')),
  constraint relationship_definitions_workspace_scope_check
    check (
      (owner = 'PLATFORM' and workspace_id is null)
      or (owner = 'WORKSPACE' and workspace_id is not null)
    ),
  constraint relationship_definitions_cardinality_check
    check (cardinality in ('ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY')),
  constraint relationship_definitions_status_check
    check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED'))
);

create index workspace_module_activations_workspace_status_idx
  on public.workspace_module_activations(workspace_id, status);

create index entity_type_definitions_workspace_kind_idx
  on public.entity_type_definitions(workspace_id, kind);

create index field_definitions_workspace_idx
  on public.field_definitions(workspace_id);

create index relationship_definitions_workspace_idx
  on public.relationship_definitions(workspace_id);

alter table public.module_definitions enable row level security;
alter table public.workspace_module_activations enable row level security;
alter table public.entity_type_definitions enable row level security;
alter table public.field_definitions enable row level security;
alter table public.relationship_definitions enable row level security;

create policy "members can read platform module definitions"
  on public.module_definitions
  for select
  to authenticated
  using (true);

create policy "members can read workspace module activations"
  on public.workspace_module_activations
  for select
  to authenticated
  using (flow_private.has_active_membership(workspace_id));

create policy "module enablers can insert workspace module activations"
  on public.workspace_module_activations
  for insert
  to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'module.enable'));

create policy "module configurators can update workspace module activations"
  on public.workspace_module_activations
  for update
  to authenticated
  using (
    flow_private.has_workspace_permission(workspace_id, 'module.configure')
    or flow_private.has_workspace_permission(workspace_id, 'module.disable')
  )
  with check (
    flow_private.has_workspace_permission(workspace_id, 'module.configure')
    or flow_private.has_workspace_permission(workspace_id, 'module.disable')
  );

create policy "members can read visible entity definitions"
  on public.entity_type_definitions
  for select
  to authenticated
  using (
    kind = 'SYSTEM'
    or (
      workspace_id is not null
      and flow_private.has_active_membership(workspace_id)
    )
  );

create policy "entity definition creators can insert custom definitions"
  on public.entity_type_definitions
  for insert
  to authenticated
  with check (
    kind = 'CUSTOM'
    and workspace_id is not null
    and flow_private.has_workspace_permission(workspace_id, 'entity_definition.create')
  );

create policy "entity definition updaters can update custom definitions"
  on public.entity_type_definitions
  for update
  to authenticated
  using (
    kind = 'CUSTOM'
    and workspace_id is not null
    and flow_private.has_workspace_permission(workspace_id, 'entity_definition.update')
  )
  with check (
    kind = 'CUSTOM'
    and workspace_id is not null
    and flow_private.has_workspace_permission(workspace_id, 'entity_definition.update')
  );

create policy "members can read field definitions"
  on public.field_definitions
  for select
  to authenticated
  using (
    workspace_id is null
    or flow_private.has_active_membership(workspace_id)
  );

create policy "custom field managers can manage workspace fields"
  on public.field_definitions
  for all
  to authenticated
  using (
    source = 'CUSTOM'
    and workspace_id is not null
    and flow_private.has_workspace_permission(workspace_id, 'custom_field.manage')
  )
  with check (
    source = 'CUSTOM'
    and workspace_id is not null
    and flow_private.has_workspace_permission(workspace_id, 'custom_field.manage')
  );

create policy "members can read relationship definitions"
  on public.relationship_definitions
  for select
  to authenticated
  using (
    owner = 'PLATFORM'
    or (
      workspace_id is not null
      and flow_private.has_active_membership(workspace_id)
    )
  );

create policy "entity definition updaters can manage workspace relationships"
  on public.relationship_definitions
  for all
  to authenticated
  using (
    owner = 'WORKSPACE'
    and workspace_id is not null
    and flow_private.has_workspace_permission(workspace_id, 'entity_definition.update')
  )
  with check (
    owner = 'WORKSPACE'
    and workspace_id is not null
    and flow_private.has_workspace_permission(workspace_id, 'entity_definition.update')
  );

insert into public.permissions (key, description)
values
  ('module.read', 'Read available modules and workspace activations.'),
  ('module.enable', 'Enable a trusted module for a workspace.'),
  ('module.disable', 'Disable a module activation for a workspace.'),
  ('module.configure', 'Update validated module configuration.'),
  ('entity_definition.read', 'Read entity definition metadata.'),
  ('entity_definition.create', 'Create draft workspace entity definitions.'),
  ('entity_definition.update', 'Update workspace entity definitions.'),
  ('entity_definition.archive', 'Archive workspace entity definitions.'),
  ('custom_field.manage', 'Manage workspace custom field definitions.')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in (
    'module.read',
    'module.enable',
    'module.disable',
    'module.configure',
    'entity_definition.read',
    'entity_definition.create',
    'entity_definition.update',
    'entity_definition.archive',
    'custom_field.manage'
  )
where role.key = 'OWNER'
on conflict do nothing;
