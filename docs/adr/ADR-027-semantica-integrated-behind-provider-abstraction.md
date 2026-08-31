# ADR-027: Semantica Is Integrated Behind Provider Abstraction

Status: Accepted

## Context

Semantica may provide useful graph, ontology, provenance, conflict, and
temporal semantics, but Flow must remain provider-neutral.

## Decision

Integrate Semantica behind Flow's `BusinessSemanticProvider` abstraction.

## Consequences

Core Flow contracts do not expose Semantica classes. Semantica can be replaced,
wrapped, upgraded, or rejected without changing Flow's semantic contract.
