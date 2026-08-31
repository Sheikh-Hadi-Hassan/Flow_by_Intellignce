# ADR-041 — Phase 2 commercial records are first-class tables

## Status

Accepted.

## Context

Phase 1B already has tenant identity, workspace `organizations` (the agency itself), canonical semantic records, and `flow_internal` audit/idempotency/calculation tables. Phase 2 needs services, clients, opportunities, discovery, and briefs with lifecycle, money, and approval rules.

## Decision

Create dedicated `public` tables for the commercial journey. Do not reuse `organizations` for CRM clients (that table is the workspace’s own legal entity). Do not store the journey only as `canonical_business_records` payloads. Reuse `flow_internal.business_audit_events` and `flow_internal.request_idempotency_records` instead of a second audit/idempotency system.

## Consequences

- Composite `(id, workspace_id)` uniqueness supports tenant-safe foreign keys.
- Canonical records remain available for later semantic linking; they are not the Phase 2 write path.
