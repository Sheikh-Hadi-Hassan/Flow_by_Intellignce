# Database Schema Boundaries

## Status

Accepted.

## Context

Flow has app-facing tenant data and internal runtime/audit data. Mixing both into public Data API tables would increase leakage risk and make authorization semantics harder to audit.

## Decision

Use `public` only for app-facing tenant tables that ordinary authenticated clients may access through RLS. Use `flow_internal` for server-owned runtime, business logic, calculation audit, idempotency, and audit-event tables.

The `flow_internal` schema is revoked from `anon` and `authenticated`, and internal tables have RLS enabled without broad client policies.

## Consequences

- App-facing tables use workspace membership and permission helpers for RLS.
- Internal data is available only through reviewed server-side repository adapters.
- Views are avoided in this foundation to prevent accidental RLS bypass.
- Future server APIs must preserve the same workspace and authority constraints.
