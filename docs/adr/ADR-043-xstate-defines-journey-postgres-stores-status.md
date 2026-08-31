# ADR-043 — XState defines the journey; Postgres stores status

## Status

Accepted.

## Context

Phase 2 needs an explicit discovery-to-approval lifecycle with guards. A workflow engine is out of scope.

## Decision

Adopt XState v5 to define states, events, and guards. Persist `journey_status` on `crm_opportunities`. The machine is not the datastore. Every transition is authorized in NestJS, then applied with optimistic concurrency.

## Consequences

- Tests can exercise the machine without Postgres.
- Runtime still re-checks guards against live records before writing.
