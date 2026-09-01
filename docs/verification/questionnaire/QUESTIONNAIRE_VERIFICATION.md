# Questionnaire Module Verification

**Overall verdict: PARTIAL**

Branch: `feat/questionnaire-production-ready`  
Date: 2026-09-01

## Summary

The Questionnaire module now has a builder domain model, server-side validation, draft/publish/duplicate flows, Flow-styled answering UI, autosave/submit with draft discovery facts, and initial E2E coverage. It is **not** production-PASS yet: visual critic review, product-owner approval, full authenticated E2E green run, migration application, and several builder UX requirements remain incomplete or unverified.

## Category verdicts

| Category | Verdict | Evidence |
|----------|---------|----------|
| Functionality | PARTIAL | Builder CRUD/reorder/duplicate/preview/publish implemented; conditional visibility partial; file upload not implemented |
| Backend | PARTIAL | API submit/duplicate-draft/schema validation added; migration created not applied in this session |
| Database | PARTIAL | Additive migration `20260905000100_questionnaire_submission_audit.sql` |
| Security | PARTIAL | Existing RLS/permissions reused; cross-tenant tests not re-run this session |
| Validation | PARTIAL | 7 new domain tests + existing questionnaire tests pass |
| Accessibility | PARTIAL | Flow fields used; axe not re-run on new routes |
| Responsive | PARTIAL | CSS grid breakpoints added; not verified at all widths |
| Visual design | PARTIAL | Improved over raw RJSF; no UI critic score ≥ 8 |
| Browser | PARTIAL | E2E spec added; authenticated run requires credentials |
| Product-owner approval | FAIL | Not recorded |

## Implemented

- `packages/commercial/src/questionnaire-builder.ts` — portable builder model, compile/parse, validation, draft facts
- API: `duplicate-draft`, `submit` with idempotency, server-side schema validation on draft save
- Persistence: duplicate published → draft, submission audit columns
- UI: `QuestionnaireBuilder`, `QuestionnaireAnswerForm`, dedicated routes
- Discovery: submitted answers create **draft** facts (not auto-verified)
- Storybook stories for questionnaire components
- Playwright: `questionnaire-production.spec.ts`

## Known gaps

1. Drag-and-drop reorder — accessible up/down only
2. File/document reference — metadata only, no storage integration
3. Conditional visibility — schema support exists; limited builder UI
4. Published version immutability — enforced server-side; UI read-only mode basic
5. Missing-info page still uses follow-ups only, not questionnaire gaps
6. Client-facing portal answer flow — admin only
7. Migration not applied to remote Supabase in this session
8. Screenshot evidence incomplete (E2E not run to completion here)
9. No independent reviewer reports filed

## Tests run

- `@flow/commercial` test: 55/55 pass
- `@flow/database` test: 37/37 pass
- `@flow/api` test: 25/25 pass
- `@flow/web` test: 69/69 pass
- `pnpm typecheck`: pass

## Next safe actions

1. Apply migration to `zuvtnmmnwohrapaecsuj` after dry-run
2. Run authenticated E2E with `FLOW_E2E_COMMERCIAL=1`
3. Run `/visual-audit` and invoke `flow-ui-critic`
4. Capture full screenshot matrix
5. Record product-owner visual approval before claiming PASS
