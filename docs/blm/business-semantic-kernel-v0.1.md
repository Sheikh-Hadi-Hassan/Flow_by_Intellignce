# Business Semantic Kernel v0.1

## Provider Contract

Flow owns the provider-neutral `BusinessSemanticProvider` contract in
`packages/blm-contracts`. It supports the minimum justified operations:

- add entity
- add relationship
- resolve entity
- get neighbors
- record fact
- trace decision
- get provenance
- find conflicts
- validate ontology

The contract does not expose Semantica classes.

## Semantica Adapter

`services/blm-semantic-kernel` contains `SemanticaBusinessSemanticProvider`.
Semantica imports are isolated inside that adapter. Native `semantica==0.6.0`
has been validated in a dedicated Python 3.11 environment, but the TypeScript
core still treats Semantica as optional infrastructure behind the Flow-owned
provider boundary.

## Tenant Model

Every semantic entity, relationship, fact, and query carries `workspace_id`.
Relationships require both source and target entities to exist inside the same
workspace. Workspace-local semantic knowledge must not leak into another
workspace graph.

## Fact Types

Semantic facts distinguish:

- FACT
- INFERENCE
- ASSUMPTION
- RECOMMENDATION
- USER_CONFIRMED_FACT
- AI_EXTRACTED_FACT

AI-extracted facts are not silently promoted to confirmed business truth.

## Provenance

Semantic provenance records source, confidence, and optional Flow
`EvidenceReference` identifiers. Semantic provenance explains where a fact or
decision came from. It does not replace Flow audit.

## Conflict Handling

Conflicting non-temporal facts are reported as conflicts. Time-scoped facts
with effective dates can represent valid changes rather than conflicts.

## Business Semantic Model

Business Semantic Model v0.1 now lives in `packages/blm-contracts` as the
canonical contract for future Business Composition Engine work. It defines
BusinessProfile, BusinessCapability, Component semantic contracts, semantic IDs,
global-vs-tenant scope validation, and deterministic relationship validation.
Semantica may mirror or enrich this model, but it does not own it.
