# FLOW COMPONENT REGISTRY v0.1

## Implemented

- Component Registry contract/API in `packages/blm-contracts`.
- Trusted component registration with stable semantic IDs and separate version.
- Lifecycle states: `EXPERIMENTAL`, `ACTIVE`, `DEPRECATED`, `RETIRED`.
- Semantic-only vs executable availability reports.
- Explicit Component -> ModuleDefinition-shaped implementation binding.
- Capability provider lookup and component capability lookup.
- Component dependency and conflict lookup.
- Candidate component-set validation for missing dependencies and conflicts.
- Workspace-scoped component configuration validation.
- Structured validation errors.

## Reused

- Business Semantic Model v0.1 semantic IDs and capabilities.
- Existing ModuleDefinition shape as trusted implementation metadata.
- Existing workspace module activation remains the executable activation path.
- Existing Action Wall and tenant isolation remain unchanged.
- Existing BLM/Semantica adapter boundary remains unchanged.

## Extended

- `packages/blm-contracts` now exports `component-registry`.
- Documentation adds Component Registry v0.1 and ADR-033.

## Deferred

- Composition Resolver.
- Automatic component activation.
- Workspace Blueprint Compiler.
- Component persistence/publishing.
- Component marketplace or UI.
- Dynamic screen/workflow generation.

## Proof Components

- Customer Management
- Lead Management
- Quotation Management
- Quotation Approval
- Project Management
- Invoice Management
- Task Management
- Organization Profile

## Semantic-Only Components

Customer, lead, quotation, project, invoice, and task components are
semantic-only because trusted CRM/sales/projects/finance/task ModuleDefinitions
do not exist yet.

## Executably Available Components

Organization Profile is executable in the proof because it binds to the existing
trusted `core.organization` ModuleDefinition shape.

## Verification

- `pnpm --filter @flow/blm-contracts typecheck`
- `pnpm --filter @flow/blm-contracts lint`
- `pnpm --filter @flow/blm-contracts test`
- `pnpm --filter @flow/blm-contracts build`
