# ADR-005: PostgreSQL As Primary Datastore

Status: Accepted

## Context

Flow requires relational integrity, tenant isolation, auditable state, and deterministic business data.

## Decision

Use PostgreSQL as the primary datastore.

## Consequences

Schema design, migrations, constraints, and RLS can become structural security tools. Non-relational stores may be added later for specific capabilities.

## Alternatives Considered

- Document database first: less suitable for relational tenant/business state.
- Provider-specific managed data API only: too much coupling.
