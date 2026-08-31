# Persistence Portability

## Status

Accepted.

## Context

Supabase Postgres is the initial production persistence platform, but Flow's BLM and deterministic runtime need to remain portable across future storage and deployment environments.

## Decision

Keep canonical BLM contracts and runtime packages independent from Supabase/Postgres. Persistence capabilities are represented as repository interfaces and adapter implementations in `@flow/database`.

SQL adapters accept a generic `SqlExecutor` boundary so connection pooling, Supabase clients, direct Postgres drivers, or test fakes can be selected outside the core runtime.

## Consequences

- Provider replacement does not require changing canonical BLM contracts.
- Offline tests can use in-memory repositories and fake SQL executors.
- Database-specific RLS and migrations remain version controlled near the persistence package.
- Portability is bounded by documented adapter behavior, not by dashboard-only database changes.
