# Supabase Postgres Persistence

## Status

Accepted.

## Context

Flow needs durable multi-tenant persistence for workspace configuration, canonical business records, business logic releases, runtime manifests, calculation audit metadata, import sessions, idempotency, and business audit evidence. Core BLM packages must remain storage-neutral.

## Decision

Use Supabase Postgres as the first production persistence platform through version-controlled migrations and explicit repository adapters in `@flow/database`.

The BLM runtime, context compiler contracts, deterministic calculation engine, and canonical contracts must not import Supabase clients or depend on Postgres-specific APIs.

## Consequences

- Supabase provides managed Postgres, RLS, migrations, and operational fit for the first production foundation.
- Durable storage lives behind provider-neutral interfaces and parameterized SQL boundaries.
- Live database tests remain opt-in with `FLOW_DB_INTEGRATION_TESTS=1`.
- Secrets are supplied only by environment/config and are never committed.
