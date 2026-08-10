# ADR-006: Supabase As Initial Postgres Platform

Status: Accepted

## Context

The initial platform direction is Supabase for PostgreSQL, Auth-adjacent tooling, local development, and migrations.

## Decision

Use Supabase as the initial PostgreSQL platform.

## Consequences

Supabase accelerates local and hosted database setup. Flow core must remain PostgreSQL-centered and avoid unnecessary Supabase lock-in.

## Alternatives Considered

- Self-managed PostgreSQL: more operational work now.
- Neon/RDS/Cloud SQL: viable future alternatives.
