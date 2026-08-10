# ADR-009: Multi-Tenant Workspace Isolation

Status: Accepted

## Context

Flow is multi-tenant and will handle business data, documents, workflows, memory, and AI context.

## Decision

Workspace isolation is a foundational invariant. Tenant-owned records carry workspace identity where appropriate and database/backend policies enforce isolation.

## Consequences

Cross-workspace access must be structurally denied. Tests should cover workspace boundary primitives.

## Alternatives Considered

- Convention-only `WHERE workspace_id = ...`: rejected as too fragile.
- Single-tenant architecture first: rejected because it would delay core security design.
