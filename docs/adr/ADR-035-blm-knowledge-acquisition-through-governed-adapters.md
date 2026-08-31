# ADR-035: BLM Knowledge Acquisition Uses Governed Source Adapters

## Status

Accepted

## Context

BLM Business Brain Foundation v1 established Flow-owned business semantics,
source governance, domain packs, skills, formulas, rules, documents, metrics,
evaluation contracts, and the global/tenant boundary.

Flow needs a way to acquire structured business knowledge from approved
external standards and reference models without making those sources the
runtime source of truth.

## Decision

Add `@flow/blm-core` as the deterministic acquisition/validation/release
boundary.

The pipeline uses source adapters, reproducible snapshots, source-independent
normalized knowledge, explicit external-to-Flow mappings, provenance, license
gates, conflict detection, publication stages, knowledge releases,
fingerprints, and release diffs.

External ontologies and reference models never become Flow's runtime source of
truth. Flow-owned canonical semantic IDs remain authoritative.

## Consequences

Approved sources can enrich Flow-owned Domain Packs only through explicit
curated mappings. Review-required, rejected, reference-only, or unknown sources
fail closed.

The pipeline has no runtime internet dependency, no Semantica implementation
dependency, no LLM provider dependency, no RAG/vector store, and no model
training.

## Alternatives Considered

- Put acquisition logic inside `@flow/blm-contracts`: rejected because this is
  deterministic pipeline logic, not only contracts.
- Mirror Mantle/gist/FIBO/UBL wholesale: rejected because Flow needs curated
  business expertise, not ontology replication.
- Use LLM semantic merging: rejected for v1 because canonical mappings must be
  deterministic and reviewable.
- Depend on source services at runtime: rejected because runtime BLM must
  consume trusted published Flow knowledge.
