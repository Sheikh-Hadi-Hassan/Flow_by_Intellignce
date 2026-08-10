# ADR-002: Modular Monolith Initially

Status: Accepted

## Context

Flow needs clear module boundaries, but early distributed services would add coordination cost before domains stabilize.

## Decision

Start as a modular monolith in a monorepo with explicit package and module boundaries.

## Consequences

Development remains simple while preserving future extraction paths. Boundaries must be enforced by code ownership, contracts, and tests.

## Alternatives Considered

- Microservices from day one: too much operational overhead.
- Single giant app service: too risky for long-term modularity.
