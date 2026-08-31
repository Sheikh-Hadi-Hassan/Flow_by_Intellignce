# Phase 2 schema mapping (pre-implementation)

Migration head before Phase 2: `20260829000100` (local = remote).  
Project: Flow by Intellignce / `zuvtnmmnwohrapaecsuj`.

| Existing | Phase 2 need | Action | Reason |
| -------- | ------------- | ------ | ------ |
| `workspaces`, `users`, memberships, roles, permissions, RLS helpers | Tenancy + authz | Extend permissions | Do not replace |
| `organizations` | Agency legal entity | Reuse as-is | Not CRM clients |
| `canonical_business_records` | Semantic corpus | Do not use as write path | Wrong lifecycle/money/approval shape |
| `flow_internal.business_audit_events` | Audit | Reuse | Avoid parallel audit model |
| `flow_internal.request_idempotency_records` | Idempotent retries | Reuse | Already tenant-scoped |
| `flow_internal.calculation_execution_audits` | Calculation provenance | Reuse | Fingerprints, not LLM math |
| Onboarding `services` JSON | High-level Twin list | Leave | Catalog is a different entity |
| Clients / contacts / opportunities | CRM | **Create** | Not implemented |
| Services / questionnaires | Catalog | **Create** | Not implemented |
| Discovery / facts / briefs | Journey | **Create** | Not implemented |

No parallel service, client, contact, activity, evidence, or approval tables existed. Evidence contracts in `@flow/contracts` are types only; Phase 2 persists `evidence_references` and Guard rows.
