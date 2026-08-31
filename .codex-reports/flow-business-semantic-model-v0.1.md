# FLOW BUSINESS SEMANTIC MODEL v0.1

## Implemented

- Flow-owned Business Semantic Model contracts in `packages/blm-contracts`.
- Stable semantic ID validation using `flow.<kind>.<domain>.<name>` with
  optional semantic version suffix.
- Global `BusinessCapability` definitions with hierarchy validation.
- Global business `Component` definitions with provided capabilities, required
  capabilities, dependencies, conflicts, semantic references, DataContract,
  AIContract, and constraints.
- Tenant-scoped `BusinessProfile` and `WorkspaceSemanticConfiguration`.
- Deterministic validation for IDs, global/workspace scope, unknown
  capabilities, duplicate references, self-dependency, self-conflict,
  dependency cycles, and unsatisfied workspace profile capabilities.
- Marketing-agency proof scenario tests.

## Reused

- Workspace remains the tenant and security boundary.
- Organization remains a business entity inside a workspace.
- Module Registry remains the trusted platform module source of truth.
- Universal Entity System remains the entity metadata and typed-domain boundary.
- Action Wall remains deterministic authorization for actions.
- BLM/Semantica adapter boundary remains provider-neutral and replaceable.

## Extended

- `packages/blm-contracts` now exports `business-semantic-model`.
- BLM documentation now distinguishes the canonical Flow semantic model from
  optional Semantica implementation capability.
- Ontology documentation now includes composition-facing concepts.

## Deferred

- AI business discovery.
- Composition planner/resolver.
- Workspace blueprint compiler.
- Dynamic UI generation.
- Industry template generation.
- External ontology synchronization.
- Vector search, RAG, and LLM-based validation.

## Architectural Decisions

- Templates will become saved/versioned known-good Composition Plans, not the
  primary architecture.
- Global semantic definitions cannot carry `workspaceId`.
- Tenant-specific BusinessProfile/configuration remains workspace-scoped.
- Semantica may mirror or enrich semantics behind the adapter but is not the
  canonical source of truth.
- No new external dependency was added.

## Verification

- `pnpm --filter @flow/blm-contracts typecheck`
- `pnpm --filter @flow/blm-contracts lint`
- `pnpm --filter @flow/blm-contracts test`
- `pnpm --filter @flow/blm-contracts build`
- `pnpm format:check`
