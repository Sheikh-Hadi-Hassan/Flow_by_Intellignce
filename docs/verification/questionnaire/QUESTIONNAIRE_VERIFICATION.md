# Questionnaire Module Verification

**Overall verdict: PARTIAL**

Branch: `feat/questionnaire-production-ready`  
Date: 2026-09-01 (updated)

## Summary

Questionnaire builder, answering, governed submit, discovery draft facts, missing-info integration, and E2E coverage are implemented and substantially hardened. **Not PASS** yet: product-owner visual approval, independent UI critic score ≥ 8, full screenshot matrix capture, production web build, and migration history repair on Supabase remain open.

## Milestone status

| Milestone | Verdict | Notes |
|-----------|---------|-------|
| M1 E2E regression fix | PASS | `commercial-journey.ts` + golden path use builder publish helper |
| M2 Missing-info integration | PASS | Unanswered required questionnaire fields surfaced with link |
| M3 API tests | PASS | Submit idempotency, duplicate draft, validation rejection |
| M4 Questionnaire E2E | PASS | Authenticated + Northstar specs green (`FLOW_E2E_COMMERCIAL=1`) |
| M5 Bundle submission status | PASS | `questionnaireSubmission` on opportunity bundle |
| M6 Database | PARTIAL | SQL applied manually; `supabase db push --dry-run` blocked by remote-only `20260904000100` |
| M7 Quality closure | PARTIAL | Unit/API tests green; UI critic + PO approval pending |

## Fixes landed this session

- Legacy enum schemas now parse to single-choice options (unblocks publish)
- AJV schema reuse prevents submit 500 after autosave
- `discovery_sources_kind_check` corrected to allow `questionnaire`
- Questionnaire submit uses `text/plain` content type (DB constraint)
- `unansweredQuestionnaireFields` helper + missing page integration
- `questionnaireSubmission` exposed on opportunity bundle
- API test for submit / duplicate-draft

## Tests run

| Suite | Result |
|-------|--------|
| `@flow/commercial` | 58/58 pass |
| `@flow/database` | 37/37 pass (prior) |
| `@flow/api` | 26/26 pass |
| `@flow/web` unit | 69/69 pass |
| `pnpm typecheck` | pass |
| E2E authenticated questionnaire | pass (with `FLOW_E2E_COMMERCIAL=1`) |
| E2E northstar questionnaire | pass |

## Known gaps

1. Drag-and-drop reorder — accessible up/down only
2. File upload — metadata only
3. Conditional visibility — schema support; limited builder UI
4. Client portal answering — admin only
5. Migration history mismatch with remote finance migration
6. `next build` fails on home page hydration (pre-existing)
7. No UI critic report or PO sign-off

## Evidence

Screenshots: `docs/verification/questionnaire/screenshots/` (partial; E2E writes on green run)

## Next safe actions

1. Repair migration history or merge finance migration file before `db push`
2. Re-run authenticated E2E to green and refresh screenshot matrix
3. Run `flow-ui-critic` + `flow-functional-reviewer` on questionnaire routes
4. Record product-owner visual approval before PASS
