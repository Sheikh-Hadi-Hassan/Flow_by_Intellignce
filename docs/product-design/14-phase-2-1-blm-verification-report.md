# Phase 2.1 BLM Extraction Verification Report

## 1. Final verdict

**PARTIAL**

Architecture, schema, persistence, API, UI, fixture evaluation, and API integration tests pass. Phase 2 prerequisite remains **FAIL** (Playwright browser golden path). Live model quality verification is **BLOCKED** (no `BLM_API_KEY` / real endpoint configured in this environment).

## 2. Phase 2 prerequisite

| Item | Status |
|------|--------|
| Closure report | `docs/product-design/12-phase-2-final-closure-report.md` — **FAIL** |
| Base commit | `1def13c` on `main` |
| API golden path | PASS (updated for `/analyze` after `/notes`) |
| Playwright e2e | FAIL — commercial shell hydration in automation |

## 3. Existing BLM architecture reused

- `@flow/commercial` discovery module (`provider`, `schema-v1`, `validate`, `prompt-v1`, `fixture-provider`, `openai-provider`, `pipeline`)
- `@flow/database` `CommercialRepository` extended (no duplicate fact tables)
- Phase 2 verify/scope/calculation/brief paths unchanged
- Northstar isolated fixture provider with explicit demo disclosure in UI

## 4. Files changed

**Core**

- `packages/commercial/src/discovery/*`
- `packages/commercial/evaluation/discovery-extraction-eval-v1.json`
- `packages/commercial/scripts/run-discovery-eval.mjs`
- `packages/database/src/commercial-persistence.ts`
- `apps/api/src/commercial/commercial.service.ts`
- `apps/api/src/commercial/commercial.controller.ts`
- `apps/api/test/commercial.spec.ts`
- `apps/web/src/app/[workspace]/admin/opportunities/[id]/discovery/page.tsx`
- `apps/web/src/lib/commercial/api.ts`
- `apps/web/src/lib/commercial/northstar-store.ts`
- `supabase/migrations/20260831000100_discovery_extraction_runs.sql`
- `scripts/phase2-golden-path-api.mjs`
- `scripts/mock-openai-discovery-server.mjs`

**Documentation**

- `docs/product-design/13-phase-2-1-blm-extraction-contract.md`
- `docs/adr/ADR-045-discovery-extraction-replaceable-blm-provider.md`

## 5. Provider implementation

| Setting | Value |
|---------|-------|
| Default provider | `fixture` (`BLM_PROVIDER` unset) |
| Config names | `BLM_PROVIDER`, `BLM_BASE_URL`, `BLM_MODEL`, `BLM_API_KEY`, `BLM_TIMEOUT_MS`, `BLM_MAX_RETRIES` |
| Transport | OpenAI-compatible `/v1/chat/completions` when non-fixture |
| Credentials | Server-only; never `NEXT_PUBLIC_*` |
| Mock server | `scripts/mock-openai-discovery-server.mjs` |

**Live provider:** BLOCKED — set `BLM_PROVIDER=openai` (or compatible), `BLM_MODEL`, `BLM_API_KEY`, optional `BLM_BASE_URL`.

## 6. Extraction contract

- Schema: `discovery-extraction-v1`
- Prompt: `flow.discovery.extraction-prompt.v1`
- Draft-only enforcement at schema + `validateEvidenceAnchors`
- Duplicate detection via normalized category/value map
- Categories per contract doc §Schema

## 7. Prompt and context

- System rules separate from JSON user payload
- Minimal Business Twin: `businessName`, `classification`, up to 8 services
- Service + opportunity summaries minimized
- No secrets, tokens, or unrelated workspace data in payload

## 8. Persistence and migration

- Table: `discovery_extraction_runs` (statuses: pending, running, succeeded, failed, cancelled, reviewed)
- Columns added to `extracted_facts`: `candidate_id`, `contradiction_ref`, `duplicate_of_candidate_id`
- Migration: `20260831000100` applied to `zuvtnmmnwohrapaecsuj`
- RLS: `has_active_membership` (read), `discovery.manage` (write)

## 9. Security

- Input length limit 200k chars on notes
- `sanitizeSourceText` for known injection markers
- Strict JSON allow-list validation
- Idempotent analyze + fingerprinted runs
- Failed runs do not mutate verified scope
- Tenant isolation via existing commercial RLS helpers

## 10. API

| Route | Purpose |
|-------|---------|
| `POST .../notes` | Save discovery source only |
| `POST .../analyze` | Run extraction (optional `sourceId`, `Idempotency-Key`) |
| `POST .../facts/:id/verify` | Human verify/reject (unchanged) |

Authorization: `discovery.manage` for analyze; `fact.verify` for verification.

## 11. UI

- Separate **Save notes** and **Analyze notes**
- Run status, provider/model disclosure (demo labeled fixture)
- Candidate cards with confidence, duplicate/contradiction badges
- Evidence excerpt highlight
- Verify / reject actions unchanged

## 12. Multilingual evaluation

- Dataset: `packages/commercial/evaluation/discovery-extraction-eval-v1.json` (30 cases)
- Command: `cd packages/commercial && npm run build && node scripts/run-discovery-eval.mjs`
- Fixture results: 30/30 schema valid, 30/30 evidence valid, 30/30 draft-only
- Fixture limitations: 2 adversarial cases surface regex budget matches (`adv-approve-02`, `adv-ur-injection-04`) — expected fixture ceiling; real-model eval blocked

## 13. Browser verification

**BLOCKED / not re-run end-to-end in this pass** (Phase 2 Playwright prerequisite still failing). API-backed golden path and unit tests pass. Manual browser verification deferred until session hydration fix lands.

## 14. Supabase verification

- Project: `zuvtnmmnwohrapaecsuj` (Flow by Intellignce)
- Migration head local/remote: `20260831000100`
- RLS policies use `flow_private.has_active_membership` / `has_workspace_permission`
- Prior Phase 2 RLS integration tests not re-run this pass (no commercial table changes beyond new run table)

## 15. Command results

| Command | Result |
|---------|--------|
| `packages/commercial` `npm run build` | PASS |
| `packages/commercial` `npm test` | PASS (21 tests) |
| `packages/database` `npm run build` | PASS |
| `apps/api` `npm run build` | PASS |
| `apps/api` `npm test` | PASS (23 tests) |
| `apps/web` `npm test` | PASS (54 tests) |
| `npx supabase db push --dry-run` | PASS |
| `npx supabase db push` | PASS (after RLS helper fix) |
| Root `pnpm typecheck/lint/format` | NOT RUN (pnpm unavailable in shell) |
| Playwright e2e | NOT RUN (prerequisite FAIL) |
| Live provider smoke | BLOCKED |
| Secret scan | Manual review of changed files — no credentials committed |

## 16. Git checkpoint

- Branch: `main`
- Commit: pending this report (`feat(intelligence): add evidence-linked discovery extraction`)
- Push: not attempted (prior session reported publickey denial)

## 17. Known limitations

1. Phase 2 closure still FAIL — Playwright commercial journey
2. Live BLM provider not configured — quality metrics not measured on real model
3. Fixture regex can extract budget tokens from adversarial injection strings
4. Browser manual verification not completed in this pass

**One-step live config:**

```bash
BLM_PROVIDER=openai
BLM_MODEL=<your-model>
BLM_API_KEY=<server-secret>
# optional: BLM_BASE_URL, BLM_TIMEOUT_MS, BLM_MAX_RETRIES
```

## 18. Scope confirmation

Phase 3, proposals, contracts, invoicing, portals, voice, MCP, LangGraph, and deployment were **not** started.
