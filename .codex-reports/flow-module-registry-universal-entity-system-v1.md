# Flow Module Registry And Universal Entity System v1

## Module Registry Architecture

Implemented provider-neutral module contracts and a deterministic
`ModuleRegistry` service. First-party module manifests are code-defined.
Database metadata stores registry/activation state and never executes module
code.

## Entity Architecture

Implemented an `EntityRegistry` service with system/custom entity
definitions, field definitions, relationship definitions, lifecycle state, and
deterministic validation.

## Database Schema

Migration `20260810000400_module_registry_universal_entity_system.sql` creates:

- `module_definitions`
- `workspace_module_activations`
- `entity_type_definitions`
- `field_definitions`
- `relationship_definitions`

## Services And Contracts

Contracts added:

- `ModuleDefinition`
- `WorkspaceModuleActivation`
- `ModuleRegistry`
- `EntityTypeDefinition`
- `FieldDefinition`
- `EntityRelationshipDefinition`
- `EntityRegistry`
- `module.enable` proof tool

## Authorization

Registry mutations use the existing Action Wall and permission model. Added
minimal permissions for module and entity definition management. AI request
source receives no additional permission.

## RLS

RLS is enabled on all workspace-owned registry/configuration tables. Workspace
reads and mutations are scoped by active membership and explicit permissions.
Live Supabase validation remains unavailable because Supabase CLI is not
installed.

## Tests

Automated tests cover module uniqueness, activation, dependencies, dependency
cycles, configuration validation, workspace isolation, arbitrary code
protection, system/custom entity separation, field validation, relationship
validation, lifecycle archive state, entity metadata not granting permission,
RLS migration guardrails, and execution-spine audit for `module.enable`.

## Hybrid Storage Decision

Flow avoids universal EAV. First-party business records will use typed domain
tables. Custom value persistence is deferred until real business records
exist; v1 implements metadata definitions and validators only.

## Dependencies

No new dependencies.

## Security Properties

- tenant isolation preserved
- global definitions separated from workspace state
- module metadata cannot execute arbitrary code
- workspace custom definitions cannot mutate system definitions
- AI does not bypass permissions
- module activation is audited

## Future Template Compatibility

Templates can later use registry services to enable modules and propose
entity configuration. Templates must not directly mutate arbitrary metadata.

## Future AI Compatibility

AI-generated schema changes must be draft-first, deterministically validated,
audited, and approved before activation.

## Open Questions

- Which first business module should become the first typed domain storage
  proof?
- Which live Supabase setup should be used for RLS execution?

## Verification

- `pnpm format:check`: PASS
- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm test`: PASS
- `pnpm build`: PASS
