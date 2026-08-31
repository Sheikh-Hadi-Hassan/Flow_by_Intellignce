# ADR-038: BLM Compiles Bounded Authorized Context Before Reasoning

## Status

Accepted

## Context

BLM now contains structured business semantic contracts, component mapping,
business brain proof packs, governed knowledge acquisition, human approval, and
expanded universal business expertise domains.

Before any model reasoning layer can consume BLM knowledge, Flow needs a
deterministic boundary that decides which business knowledge and workspace
facts are relevant and authorized for a task.

## Decision

BLM compiles bounded, authorization-aware business context before model
reasoning. Models never receive unrestricted workspace data or unrestricted BLM
knowledge.

The compiler emits `CompiledBusinessContextBundle` from
`BusinessContextRequest` using deterministic domain selection, bounded
relationship expansion, provider-filtered records and policies, redaction
metadata, provenance, budget limits, authority constraints, and a stable
fingerprint.

## Consequences

Flow can provide rich business context to future reasoning layers while
preserving tenant isolation, permission boundaries, auditability, and
determinism.

The model layer remains replaceable because the compiler output is a structured
contract rather than provider-specific prompt construction.

The compiler does not execute skills, approve decisions, mutate state, perform
retrieval over unrestricted data, or bypass Action Wall.

## Alternatives Considered

- Send all BLM knowledge to a model: rejected because it violates least
  privilege, context budgets, and tenant-data boundaries.
- Let the model choose which workspace records to inspect: rejected because
  authorization and redaction must happen before model context.
- Build RAG or embeddings first: rejected because retrieval does not define
  business authority, tenant boundaries, or deterministic scope.
- Couple context assembly to a specific model provider: rejected because model
  providers remain replaceable.
