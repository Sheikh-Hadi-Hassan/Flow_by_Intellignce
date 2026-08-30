# Phase 2.1 BLM Discovery Extraction Contract

## Purpose

Phase 2.1 converts authenticated discovery from fixture-only extraction into a provider-backed, evidence-linked intelligence workflow while preserving Phase 2 commercial boundaries.

## Architecture reused (no duplicate BLM stack)

| Layer | Package / module | Role |
|-------|------------------|------|
| Extraction port | `@flow/commercial` `discovery/provider.ts` | Replaceable provider interface |
| Schema + validation | `@flow/commercial` `discovery/schema-v1.ts`, `validate.ts` | Strict JSON output, evidence checks |
| Prompt versioning | `@flow/commercial` `discovery/prompt-v1.ts` | `flow.discovery.extraction-prompt.v1` |
| Fixture provider | `@flow/commercial` `discovery/fixture-provider.ts` | Tests, Northstar demo, default runtime |
| OpenAI-compatible transport | `@flow/commercial` `discovery/openai-provider.ts` | Real endpoint when configured |
| Persistence | `@flow/database` `commercial-persistence.ts` | `discovery_extraction_runs`, existing `extracted_facts` |
| API orchestration | `apps/api/src/commercial/commercial.service.ts` | Save vs analyze split, idempotency, audit |
| UI | `apps/web/.../discovery/page.tsx` | Save, analyze, review, evidence highlight |

**Not used for discovery notes:** `BusinessReasoningRuntime`, knowledge adapters, autonomous tool execution.

## Provider boundary

- Server-only env: `BLM_PROVIDER`, `BLM_BASE_URL`, `BLM_MODEL`, `BLM_API_KEY`, `BLM_TIMEOUT_MS`, `BLM_MAX_RETRIES`
- Default: `BLM_PROVIDER=fixture` (no paid model required)
- Provider may draft structured candidates only; it may not verify, approve, calculate, or mutate authoritative records

## Data flow

1. `POST .../notes` — save `discovery_sources` (sanitized, length-limited)
2. `POST .../analyze` — create idempotent `discovery_extraction_runs`, call provider
3. Validate JSON schema + evidence anchors + duplicate detection
4. Persist draft `extracted_facts` + `evidence_references`
5. Human `POST .../facts/:id/verify` — only verified facts update structured scope (existing Phase 2 path)
6. Deterministic completeness, missing questions, calculations, brief generation unchanged

## Security boundary

- Notes are untrusted input; system/source separation in prompt payload
- Workspace authorization on source load and result read
- Tenant isolation via existing RLS (`flow_private.has_active_membership` / `has_workspace_permission`)
- No browser exposure of model credentials
- Idempotent analyze via `flow_internal.request_idempotency_records` + run fingerprint

## Schema

- Version: `discovery-extraction-v1`
- Categories: client, contact, business_problem, objective, requirement, deliverable, budget, currency, timeline, deadline, constraint, assumption, decision, dependency, risk, open_question, selected_service, exclusion, audience, note
- Every candidate: `candidateId`, evidence offsets, `status: draft` only

## Out of scope

Phase 3, proposals, contracts, invoicing, portals, voice, MCP, LangGraph, deployment, autonomous execution.
