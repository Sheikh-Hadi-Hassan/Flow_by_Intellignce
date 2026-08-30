# 15 — Phase 3 Implementation Contract

## Phase name

**Phase 3: Proposal and Contract Engine**

## User outcome

A founder with an **immutable approved brief** can complete:

Approved brief → Proposal draft (from verified facts) → Founder review → Changes requested **or** approved → Secure client review link → Client accepts / declines / requests changes → Contract generated from accepted proposal → Founder review → Client acceptance → **Executed immutable contract** → Ready to create project (Phase 4).

## Authority

- All authenticated mutations go through NestJS `CommercialService` (repository pattern).
- Client review uses **hash-only share tokens** on a dedicated anonymous route; no workspace enumeration.
- RLS + permission keys enforce tenant isolation (ADR-041).
- Money and percentages use bigint minor units and basis points (ADR-042).
- Proposal and contract lifecycles defined in XState; Postgres stores canonical status (ADR-043).
- Deterministic pricing in `@flow/commercial`; **no LLM for arithmetic, transitions, or legal claims**.
- Approved proposal versions and executed contracts are **immutable** at repository and DB trigger level.
- Audit via `flow_internal.business_audit_events` and `commercial_guard_decisions`; idempotency via `flow_internal.request_idempotency_records`.

## In scope

### Backend

| Area | Deliverable |
| ---- | ----------- |
| Migration | Additive tables: proposals, proposal_versions, proposal_sections, proposal_pricing_packages, proposal_line_items, proposal_shares, proposal_client_responses, contracts, contract_versions, contract_clauses, contract_parties, contract_payment_schedule_items, contract_acceptances |
| Permissions | `proposal.manage`, `proposal.approve`, `proposal.share`, `contract.manage`, `contract.approve`, `contract.execute`, `commercial.audit.read` (reuse) |
| Domain | `@flow/commercial`: proposal lifecycle machine, contract lifecycle machine, proposal pricing (subtotal, discount, tax, contingency, margin, gross profit, payment schedule) |
| API | Extend `/api/v1/workspaces/:id/commercial/*`; anonymous `/api/v1/client-review/:tokenHash/*` |
| Guards | Server-side transition validation; source links brief_version → proposal → contract |
| Shares | SHA-256 token hash storage, expiry, revoke; plaintext token returned once on create |

### Frontend

| Route | Purpose |
| ----- | ------- |
| `/:workspace/admin/opportunities/:id/proposal` | Compose, preview, version history, pricing editor |
| `/:workspace/admin/opportunities/:id/proposal/approvals` | Founder Guard approval |
| `/:workspace/admin/opportunities/:id/contract` | Contract preview, clauses, parties, payment schedule |
| `/:workspace/admin/opportunities/:id/contract/acceptance` | Founder + client acceptance states |
| `/review/:token` | Minimal client-review surface (no admin nav, no workspace leakage) |

Status badges: **Draft**, **In review**, **Changes requested**, **Approved**, **Sent**, **Accepted**, **Declined**, **Executed**.

### Proposal sections (required keys)

`executive_summary`, `client_goals`, `scope_deliverables`, `timeline_milestones`, `assumptions`, `exclusions`, `pricing_packages`, `optional_addons`, `payment_schedule`, `terms`, `approval_section`.

Pricing models supported: **fixed-project**, **retainer**, **milestone** (mapped from catalog `pricing_model`).

Generation requires approved brief version; missing required brief sections block submission with readable questions.

## Out of scope

Project creation, invoicing, full client portal, employee/vendor portals, voice, agents, LangGraph/MCP, UI redesign, paid e-sign services, Northstar writes to authenticated workspaces.

---

## State machines

### Proposal (`proposal_versions.status`)

```text
draft → in_review → changes_requested | approved
approved → sent → client_review → accepted | declined | changes_requested
accepted → (contract generation eligible)
any active → superseded | expired
```

| Event | From | To | Guard |
| ----- | ---- | -- | ----- |
| SUBMIT_FOR_REVIEW | draft, changes_requested | in_review | Sections complete; pricing calculated |
| REQUEST_CHANGES (founder) | in_review | changes_requested | Actor has proposal.approve |
| APPROVE (founder) | in_review | approved | Actor has proposal.approve; pricing valid |
| CREATE_SHARE | approved | sent | Actor has proposal.share |
| CLIENT_OPEN | sent | client_review | Valid non-revoked share token |
| CLIENT_ACCEPT | client_review | accepted | Explicit consent + document hash |
| CLIENT_DECLINE | client_review | declined | Explicit consent |
| CLIENT_REQUEST_CHANGES | client_review | changes_requested | Message required |

Approved proposal versions are immutable (DB trigger + repository guard).

### Contract (`contract_versions.status`)

```text
draft → in_review → changes_requested | pending_client_acceptance
pending_client_acceptance → executed
executed is final (immutable)
terminated | superseded for edge cases
```

| Event | From | To | Guard |
| ----- | ---- | -- | ----- |
| GENERATE_FROM_PROPOSAL | — | draft | Accepted proposal exists; no duplicate contract |
| SUBMIT_FOR_REVIEW | draft, changes_requested | in_review | Clauses + parties + payment schedule complete |
| APPROVE (founder) | in_review | pending_client_acceptance | Actor has contract.approve |
| CLIENT_ACCEPT | pending_client_acceptance | executed | Acceptance evidence recorded |
| REQUEST_CHANGES | in_review | changes_requested | Founder only |

Executed contract versions are immutable.

### Opportunity journey extension

After brief `approved`, opportunity may advance:

```text
approved → proposal_in_progress → proposal_accepted → contract_executed
```

Stored on `crm_opportunities.journey_status` (constraint extended additively).

---

## Data model

All tables: `uuid` PK, `workspace_id` FK, composite `(id, workspace_id)` for tenant-safe joins, `bigint` money, `integer` bps where applicable.

### proposals

- `id`, `workspace_id`, `opportunity_id`, `brief_version_id`, `currency`, `revision`, timestamps

### proposal_versions

- `id`, `workspace_id`, `proposal_id`, `version_number`, `status`, `pricing_model`, `calculation jsonb`, `document_hash`, `approved_at`, `approved_by`, `immutable_at`

### proposal_sections

- `id`, `workspace_id`, `proposal_version_id`, `section_key`, `title`, `body`, `sort_order`

### proposal_pricing_packages

- `id`, `workspace_id`, `proposal_version_id`, `name`, `pricing_model`, `subtotal_minor`, `discount_bps`, `tax_bps`, `contingency_bps`, `total_minor`, `is_recommended`

### proposal_line_items

- `id`, `workspace_id`, `package_id`, `description`, `quantity`, `unit_price_minor`, `line_total_minor`, `sort_order`

### proposal_shares

- `id`, `workspace_id`, `proposal_version_id`, `token_hash`, `expires_at`, `revoked_at`, `created_by`

### proposal_client_responses

- `id`, `workspace_id`, `proposal_version_id`, `response`, `message`, `consent_text`, `document_hash`, `responded_at`, `actor_label`

### contracts

- `id`, `workspace_id`, `opportunity_id`, `proposal_version_id`, `currency`, `revision`

### contract_versions

- `id`, `workspace_id`, `contract_id`, `version_number`, `status`, `calculation jsonb`, `document_hash`, `executed_at`

### contract_clauses / contract_parties / contract_payment_schedule_items / contract_acceptances

Standard normalized child records with workspace scoping.

---

## Permissions

| Permission | Roles (Phase 3) | Use |
| ---------- | --------------- | --- |
| proposal.manage | FOUNDER, OWNER | Draft, edit, submit |
| proposal.approve | FOUNDER, OWNER | Founder review |
| proposal.share | FOUNDER, OWNER | Create/revoke client links |
| contract.manage | FOUNDER, OWNER | Generate, edit drafts |
| contract.approve | FOUNDER, OWNER | Internal contract approval |
| contract.execute | FOUNDER, OWNER | Record client acceptance (admin path) |

Client token route validates share/acceptance scope only; no permission elevation.

---

## API routes

### Authenticated (`/api/v1/workspaces/:workspaceId/commercial`)

| Method | Path | Action |
| ------ | ---- | ------ |
| POST | `opportunities/:id/proposals` | Generate proposal from approved brief |
| GET | `opportunities/:id/proposals` | List versions |
| GET | `proposals/:versionId` | Get version detail |
| PATCH | `proposals/:versionId` | Edit draft sections/pricing |
| POST | `proposals/:versionId/submit` | Submit for founder review |
| POST | `proposals/:versionId/changes` | Request changes |
| POST | `proposals/:versionId/approve` | Founder approve (idempotent) |
| POST | `proposals/:versionId/share` | Create client share link |
| POST | `proposals/:versionId/revoke-share` | Revoke active share |
| POST | `opportunities/:id/contracts` | Generate contract from accepted proposal |
| GET | `opportunities/:id/contracts` | List contract versions |
| POST | `contracts/:versionId/submit` | Submit contract for review |
| POST | `contracts/:versionId/approve` | Founder approve for client |
| POST | `contracts/:versionId/accept` | Record acceptance evidence |

### Anonymous client review (`/api/v1/client-review`)

| Method | Path | Action |
| ------ | ---- | ------ |
| GET | `/:token/proposal` | Read shared proposal (no workspace id) |
| POST | `/:token/proposal/respond` | Accept / decline / request changes |

Token is opaque; server hashes and looks up `proposal_shares.token_hash`.

---

## Business rules

1. Proposal generation requires `brief_versions.status = approved` for the opportunity.
2. Missing brief sections → block submit with human-readable gaps list.
3. Pricing: `line_total = quantity * unit_price`; package subtotal = sum lines; discount/tax/contingency via bps half-up; margin from Phase 2 `calculateScope` baseline.
4. Payment schedule items must sum to contract total (deterministic validation).
5. One active executed contract per opportunity (Guard denies duplicate).
6. Client response stores: timestamp, actor label, document hash at response time, consent text (no fake e-sign legal claims).
7. Idempotency-Key honored on approve, share, accept, contract execute.

---

## Acceptance criteria

1. Authenticated golden path: approved brief → proposal → client accept → executed contract with DB persistence.
2. Approved proposal version cannot be updated (API 409 + DB trigger).
3. Executed contract cannot be updated.
4. Cross-tenant GET/POST returns 403 without leaked record content.
5. Anonymous client route works with share token; invalid/expired/revoked → 404 (no enumeration).
6. Deterministic pricing unit tests with documented examples.
7. Playwright extends Phase 2 golden path through contract execution (real auth).
8. Northstar demo remains isolated (localStorage only).
9. All package typecheck/test/build gates pass.
10. Migration applied only to `zuvtnmmnwohrapaecsuj` after dry-run.

---

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Large migration surface | Additive-only; follow Phase 2 RLS patterns |
| Client token leakage | Hash-only storage; short TTL; revoke |
| Pricing drift | Single `@flow/commercial` module; no frontend math |
| Scope creep to Phase 4 | Explicit out-of-scope; contract ends at executed state |

---

## Definition of done

- This contract document committed.
- Implementation merged with verification report (`16-phase-3-verification-report.md`).
- Verdict **PASS** requires authenticated browser journey, RLS evidence, immutability, deterministic pricing, and all quality gates — not unit tests alone.
- Commit and push only on PASS.
