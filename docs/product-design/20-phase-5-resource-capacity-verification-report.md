# 20 — Phase 5 Resource Capacity Verification Report

**Branch:** `feat/phase-5-resource-capacity`
**Status:** **PASS**
**Date:** 2026-08-31
**Supabase project:** `zuvtnmmnwohrapaecsuj`

## Final verdict

Phase 5 governed capacity and assignment planning is complete. Migration history is checkpointed, the workspace BLM install blocker is repaired without importing unfinished BLM packages, all mandatory quality gates passed, and authenticated Playwright Phase 2–5 ran twice with zero skipped tests.

## BLM dependency root cause

Evidence-based classification: **Case B — optional/non-Phase-5 BLM coupling**.

| Question | Evidence |
| -------- | -------- |
| Does tracked `packages/database/src` import BLM for Phase 1–5 runtime? | Only `business-persistence.ts` imported `@flow/blm-core` / `@flow/blm-contracts`. Commercial / project / resource persistence did not. |
| Were deps only stale package.json entries? | Partly. Dependencies existed in `packages/database/package.json`, and `index.ts` re-exported BLM-backed business persistence. |
| Did a tracked commit add imports without packages? | Yes historically: database listed BLM packages that were never tracked on this branch (WIP packages existed only locally / on `origin/wip/pre-phase5-local-work`). |
| Required for Phase 1–5 runtime? | No. API Phase 1–5 uses commercial/project/resource persistence only. |
| Did prior builds rely on untracked WIP BLM artifacts? | Yes. Local ignored `dist/` remnants were not valid workspace packages; install failed once they were absent. |

### Exact repair

1. Extracted neutral `SqlExecutor` to `packages/database/src/sql-executor.ts`.
2. Pointed commercial/project/resource/identity/workspace persistence at `sql-executor.ts`.
3. Stopped exporting `business-persistence` from `@flow/database` public index; excluded BLM-backed files from package tsconfig/eslint/test.
4. Removed `@flow/blm-core` and `@flow/blm-contracts` from `packages/database/package.json` and refreshed `pnpm-lock.yaml`.

Commit: `000e926` — `fix(workspace): remove orphaned BLM package dependencies`

## Migration checkpoint

| Item | Result |
| ---- | ------ |
| File | `supabase/migrations/20260903000100_resource_capacity_foundation.sql` |
| Checkpoint commit | `d62a878` — `chore(db): checkpoint applied resource capacity migration` |
| Local/remote alignment | Aligned through `20260903000100` on `zuvtnmmnwohrapaecsuj` |
| Secrets in migration | None |
| Rewritten/reapplied | No — history recorded only |

## Quality gates

| Gate | Result |
| ---- | ------ |
| `pnpm typecheck` | PASS |
| `@flow/commercial` lint | PASS |
| `@flow/commercial` test | PASS — 48/48 |
| `@flow/database` lint | PASS |
| `@flow/database` test | PASS — 37/37 |
| `@flow/api` lint | PASS |
| `@flow/api` test | PASS — 25/25 |
| `@flow/web` lint | PASS |
| `@flow/web` test | PASS — 55/55 |
| `@flow/api` build | PASS |
| `NODE_ENV=production @flow/web` build | PASS |

## Playwright (Phase 2–5)

Command (serial, authenticated credentials loaded from ignored `.env.local`, values not printed):

```bash
FLOW_E2E_COMMERCIAL=1 npx pnpm@11.16.0 --filter @flow/web exec playwright test \
  e2e/commercial-golden-path.spec.ts \
  e2e/phase-3-proposal-contract.spec.ts \
  e2e/phase-4-project-engine.spec.ts \
  e2e/phase-5-resource-capacity.spec.ts \
  --workers=1
```

| Run | Result | Skipped |
| --- | ------ | ------- |
| Run 1 | **6 passed** (17.9m) | **0** |
| Run 2 | **6 passed** (17.5m) | **0** |

Coverage confirmed:

- Phase 2 authenticated
- Phase 3 authenticated
- Phase 4 Northstar
- Phase 4 authenticated
- Phase 5 Northstar
- Phase 5 authenticated (publish + hard refresh persistence)

Northstar was not used as authenticated evidence. No static development tokens. No weakened assertions.

## Security and persistence

### RLS

Direct query against linked project: every Phase 5 table has `relrowsecurity = true`:

`resource_profiles`, `workspace_skill_definitions`, `resource_profile_skills`, `resource_working_schedules`, `resource_availability_exceptions`, `project_task_skill_requirements`, `project_resource_plans`, `resource_plan_recommendations`, `resource_plan_assignment_drafts`, `resource_plan_versions`, `resource_plan_guard_decisions`

Policies use membership / workspace permission helpers. Write paths require resource plan permissions. Published versions are immutable via trigger. Internal rates are redacted unless `resource.cost.read` / `resource.manage`.

### Advisors (`npx supabase@2.116.0 db advisors --linked`)

| Level | Count | Notes |
| ----- | ----- | ----- |
| ERROR | **0** | No errors to fix |
| WARN | 42 | Pre-existing patterns: leaked-password protection disabled; multiple permissive SELECT policies (including Phase 5 read+write policy pairs matching earlier commercial tables) |

Phase 5 tables follow the same read/write policy pattern as prior phases. No new ERROR-class findings.

### Other evidence

- Cross-tenant isolation: workspace_id FK + RLS membership checks (migration + API Action Wall).
- Recommendations remain drafts until Guard approval (lifecycle machine + API status transitions).
- Idempotent publish uses idempotency keys; assignment upserts use conflict keys; getOrCreate plan uses `ON CONFLICT (project_id, revision) DO NOTHING` to avoid duplicate-plan races.
- Capacity/money math uses integer arithmetic in `@flow/commercial` capacity engine (48/48 domain tests).
- Northstar isolation: sessionStorage key `flow-northstar-commercial-v1`; demo routes do not write authenticated Postgres.

## Screenshot inventory

Under `docs/verification/phase-5/screenshots/`:

| # | File | Subject |
| - | ---- | ------- |
| 1 | `01-project-active.png` | Activated project |
| 2 | `02-team-list.png` | Team / resource profiles |
| 3 | `03-recommendations.png` | Capacity / recommendations |
| 4 | `04-published-workload.png` | Published workload (Northstar) |
| 5 | `05-my-work.png` | Employee My Work |
| 6 | `06-auth-published.png` | Authenticated published plan |
| 7 | `07-auth-persisted.png` | Persisted after refresh |
| 8 | `08-skill-gap.png` | Skill gap warning |
| 9 | `09-over-allocation.png` | Over-allocation evidence |
| 10 | `10-founder-review.png` | Founder / PM review |
| 11 | `11-guard-approval.png` | Guard approval / publish ready |
| 12 | `12-published-plan.png` | Published staffing plan |
| 13 | `13-light-mode.png` | Light mode |
| 14 | `14-dark-mode.png` | Dark mode |
| 15 | `15-mobile.png` | Mobile viewport |

No passwords, tokens, or private rates appear in screenshots.

## Files included

- Implementation contract + this verification report
- Migration (already checkpointed in `d62a878`)
- Domain: resource-plan lifecycle, capacity engine, recommendation engine + tests; commercial exports
- Persistence: `resource-persistence.ts`, workspace provisioning permissions, database index export
- API: resource-capacity service/controller, module wiring, persistence providers, commercial journey test
- Web: team / capacity / my-work pages, API client, Northstar store, AppShell/Status nav, Phase 5 E2E
- Screenshots under `docs/verification/phase-5/`

## Files intentionally excluded

- `.env*` and credentials
- `apps/web/scripts/debug-*.mjs`
- `supabase/config.toml`
- WIP UI redesign / BLM packages / BLM reports from `wip/pre-phase5-local-work`
- `packages/database/src/business-persistence.ts` (retained on disk, excluded from package build)
- Phase 3 / Phase 4 screenshot drift from unrelated E2E reruns
- Playwright auth state / generated builds / ignored `dist` artifacts

## Known limitations

- Minimal UI (no full calendar editor; team create primarily via API)
- Recommendation scoring is deterministic but simplified
- `Cover role requirements` is a pragmatic E2E/coverage helper
- Advisor WARN noise for multiple permissive policies remains (consistent with prior phases; not ERROR)

## Commits and push

| Commit | Message |
| ------ | ------- |
| `d62a878` | `chore(db): checkpoint applied resource capacity migration` |
| `000e926` | `fix(workspace): remove orphaned BLM package dependencies` |
| `d331c1e` | `feat(resources): add governed capacity and assignment planning` |

Push target: `origin/feat/phase-5-resource-capacity` (not merged to `main`).

## Phase 6

Not started.
