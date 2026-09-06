# AI-composable building blocks

Flow is not a fixed CRM. It recommends, configures, and activates trusted
building blocks after a founder approves them.

## Boundaries

| Layer | Owns | Does not own |
|---|---|---|
| Platform | Identity, shell, design system, audit, events, Ask Flow, Action Wall | Industry-specific UI |
| Building-block contract | Manifest, configuration schema, lifecycle, eligibility | Arbitrary React or SQL generation |
| CRM Core | Clients, contacts, interactions, segments, duplicates | Opportunities, projects, contracts, invoices |
| Shared records | Referenced by canonical IDs | Copied into CRM |

CRM Core reuses `public.crm_clients` and `public.crm_contacts`. It does not
create a parallel CRM domain.

## Audit — reused, adapted, missing

| Capability | Status |
|---|---|
| `crm_clients` / `crm_contacts` | Reused. Extra columns for owner, lifecycle, demo key, custom fields |
| Commercial client create/read API | Reused for non-demo workspaces |
| Module Registry (ADR-020/021) | Adapted. `crm.core` is a first-party module definition |
| Action Wall / write proposals | Adapted. Duplicate merge and CRM writes are proposals |
| Audit events | Adapted. Building-block lifecycle writes audit rows |
| Ask Flow | Adapted. CRM tools register only when the block is active |
| Mission Control selectors and totals | Unchanged |
| Questionnaires / discovery facts | Reused as composer input (`NORTHSTAR_COMPOSER_PROFILE`) |
| Opportunities, projects, contracts, invoices | Referenced by ID. Not copied |
| Sales Pipeline, Marketing, Integration Hub | Missing by design. Stop after CRM Core |

## Shared platform responsibilities

- Workspace identity and RLS (`workspace_id`)
- Application shell and design tokens
- Audit sink (`flow_internal.business_audit_events` plus building-block audit)
- Ask Flow tool registration
- Trusted Module Registry (ADR-020 / ADR-021)
- Deterministic financial calculations (unchanged; Mission Control totals stay locked)

## Manifest schema

`BuildingBlockManifest` is typed in `@flow/contracts`. Required fields include
id, version, routes, configuration schema version, owned and referenced
entities, commands, queries, permissions, AI tools, events, seed profile,
supported UI states, and test requirements.

Unknown model output is rejected: unknown block, field, stage, permission, or
integration throws.

## Installation lifecycle

```
available → recommended → configuring → awaiting_approval → active → suspended → deprecated
```

- AI may recommend and prepare configuration.
- `building_block.approve` is required to reach `active`.
- Dependencies and incompatibilities are checked before activation.
- Installations are workspace-scoped.
- Suspend hides capability and keeps records.
- Every transition writes an audit event.

See `WorkspaceBuildingBlockInstallation` and `BuildingBlockRegistry`.

## AI configuration rules

The Business Language Model may:

- Interpret natural-language requirements
- Map them onto approved capabilities
- Explain a recommendation
- Suggest values that already exist on the configuration schema
- Ask for missing information

The model may not:

- Generate production React
- Create tables at runtime
- Bypass permissions
- Change deterministic calculations
- Activate a block

`composeBuildingBlockRecommendations` applies deterministic eligibility first,
then validates any model array with `rejectUnknownModelOutput`.

## Dependency rules

- Manifest `dependencies` must already be `active` in the same workspace
- `incompatibleBlocks` cannot be co-active
- Cycles are rejected by the Module Registry underneath

## Event model

CRM Core emits typed events (`client.created`, `duplicate.merge_proposed`, …).
Other blocks integrate through those names and canonical record IDs. There is
no UI-to-UI import between blocks.

## Data ownership

| Entity | Owner | Storage |
|---|---|---|
| Client organisation | CRM Core | `crm_clients` |
| Contact | CRM Core | `crm_contacts` |
| Interaction | CRM Core | `crm_interactions` |
| Duplicate candidate | CRM Core | `crm_duplicate_candidates` |
| Opportunity / project / contract / invoice | Existing commercial modules | Existing tables, referenced only |
| Custom fields | Configuration JSON | `crm_clients.custom_fields` — not a new table per workspace |

## Permission model

| Permission | Use |
|---|---|
| `building_block.read` | Registry and recommendations |
| `building_block.configure` | Prepare configuration |
| `building_block.approve` | Activate |
| `building_block.suspend` | Hide capability |
| `client.read` / `client.manage` | CRM records |
| `crm.duplicate.propose` | Propose a merge |
| `crm.duplicate.merge` | Apply a merge after approval |

`AI_PERMISSION <= CURRENT_USER_PERMISSION`. Write tools create proposals.

## Seed-data standard

- Deterministic IDs and `demo_key`
- Workspace-scoped
- Safe to rerun (unique demo key)
- Marked `is_demo`
- Northstar CRM seed: 52 clients including Meridian, Kestrel, Northwind, Acme
- Does not rewrite Mission Control history or headline totals

## Template for a future block

1. Add a `BuildingBlockManifest` next to `crmCoreManifest`.
2. Add a configuration parser.
3. Register deterministic eligibility in the composer.
4. Reuse existing domain tables where they exist.
5. Expose routes only after `active`.
6. Register Ask Flow tools with read vs propose.
7. Emit typed events.
8. Add six UI states, unit/API/browser tests, and a seed profile.
9. Stop. Do not generate a one-off schema per workspace.
