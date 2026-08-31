# Flow BLM Human Review Workflow v1

## Implemented

- `KnowledgeReviewItem`
- review reasons and lifecycle states
- deterministic state transitions
- human-only authorization boundary
- Action Wall permission metadata
- review queue/filtering
- acquisition-to-review generation
- license/semantic publication gates
- evidence bundles
- mapping revision history
- decision records
- audit-compatible events
- release candidates
- source-update reviews
- mapping-change reviews
- impact reports

## Proof Scenarios

- ambiguous mapping generates review
- conflict generates review
- license block remains unpublishable after semantic approval
- UBL Invoice evidence includes source/version/license/provenance
- source update creates new review and leaves old release unchanged
- release candidate excludes unresolved knowledge
- mapping revision preserves prior history

## Boundaries Preserved

- no AI approval
- no LLM/RAG/embeddings/vector DB
- no Semantica implementation dependency
- no tenant boundary regression
- no Business Context Compiler or Composition Resolver
