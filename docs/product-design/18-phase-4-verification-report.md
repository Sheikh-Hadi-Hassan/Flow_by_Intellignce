# 18 — Phase 4 verification report

Project: **Flow by Intellignce** (`zuvtnmmnwohrapaecsuj` only). apptech-dev was not used.

Base commit before Phase 4 work: `c583506` (Phase 3 PASS).

## Verdict: **PASS**

Phase 4 contract-to-project engine is implemented, migrated, tested, and regression-closed. Authenticated and Northstar browser journeys pass. All quality gates pass.

---

## Contract

| Item | Status |
| ---- | ------ |
| `docs/product-design/17-phase-4-project-engine-implementation-contract.md` | Created |
| Self-consistent with Phases 2–3 ADRs, Action Wall, integer money | Yes |

### Key decisions

- XState machine in `@flow/commercial` for project lifecycle; Postgres stores canonical status.
- `ProjectEngineRepository` + `ProjectEngineService` following Phase 3 patterns.
- Deterministic `generateProjectPlan` from executed contract scope (no LLM).
- Recommendation drafts created at plan generation; manual assignment only.
- Northstar demo pre-seeds executed contract in `sessionStorage`; never writes to API workspaces.

---

## Migration status

| Check | Result |
| ----- | ------ |
| `npx supabase@2.116.0 migration list --linked` | Local/remote aligned through `20260902000100` |
| Applied to `zuvtnmmnwohrapaecsuj` | Yes — `20260902000100` already applied remotely; not renamed or rewritten |
| Git reproducibility | Seven previously-untracked applied migrations committed in migration-history checkpoint |

---

## Root cause: skipped / flaky Playwright (resolved)

| Spec | Skip guard | Required env |
| ---- | ---------- | ------------ |
| `commercial-golden-path.spec.ts` | `test.skip(!canRun, …)` | `FLOW_E2E_COMMERCIAL=1`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `phase-3-proposal-contract.spec.ts` | same | same |
| `phase-4-project-engine.spec.ts` (authenticated) | same | same |
| `phase-4-project-engine.spec.ts` (northstar) | none | local web on `NEXT_PUBLIC_APP_URL` |

**Why tests were skipped earlier:** `FLOW_E2E_COMMERCIAL` was not set when running Playwright without `node --env-file=.env.local`.

**Phase 2 timing fix:** `commercial-golden-path.spec.ts` calculate/brief steps aligned with `reachApprovedBrief` — atomic `Promise.all` on `/calculate` and `POST /brief`, plus `recommendedPriceMinor > 0` assertion. Shared helpers consolidated in `commercial-journey.ts`. `signInThroughUi` hardened (already-authenticated short-circuit, longer navigation timeout).

**Production build note:** `NODE_ENV=development` in `.env.local` breaks `next build` prerender; builds must run with `NODE_ENV=production` (documented in `.env.example`).

---

## Playwright regression (mandatory matrix)

Command:

```bash
FLOW_E2E_COMMERCIAL=1 NODE_ENV=production node --env-file=.env.local \
  ./apps/web/node_modules/@playwright/test/cli.js test \
  e2e/commercial-golden-path.spec.ts \
  e2e/phase-3-proposal-contract.spec.ts \
  e2e/phase-4-project-engine.spec.ts \
  --workers=1 --config=apps/web/playwright.config.ts
```

### Run 1 (2026-08-31, fresh servers)

```
Running 4 tests using 1 worker
  ✓ commercial-golden-path › completes discovery to immutable approved brief (3.6m)
  ✓ phase-3-proposal-contract › approved brief through executed contract (3.8m)
  ✓ phase-4-project-engine › northstar executed contract through project activation (1.4s)
  ✓ phase-4-project-engine › authenticated executed contract through project activation (4.6m)
  4 passed (12.1m)
```

### Run 2 (2026-08-31, clean browser state)

```
Running 4 tests using 1 worker
  ✓ commercial-golden-path › completes discovery to immutable approved brief (3.4m)
  ✓ phase-3-proposal-contract › approved brief through executed contract (3.6m)
  ✓ phase-4-project-engine › northstar executed contract through project activation (1.3s)
  ✓ phase-4-project-engine › authenticated executed contract through project activation (4.5m)
  4 passed (11.6m)
```

**Skipped tests:** 0 (both runs).

---

## Coverage: authenticated vs Northstar

| Journey | Evidence |
| ------- | -------- |
| **Northstar demo** | `phase-4-project-engine.spec.ts` — sessionStorage-only; screenshots `docs/verification/phase-4/screenshots/01`–`08` |
| **Authenticated API** | `apps/api/test/commercial.spec.ts` — project create → submit → approve → publish → activate → assign; cross-tenant 403 |
| **Authenticated browser** | `phase-4-project-engine.spec.ts` (authenticated) — real sign-in → Supabase/Postgres → API → UI project lifecycle |

---

## Automated quality gates

| Gate | Result |
| ---- | ------ |
| `npx pnpm@11.16.0 typecheck` | **Pass** |
| `@flow/commercial` lint + test | **Pass** (38) |
| `@flow/database` test | **Pass** (75) |
| `@flow/api` lint + test | **Pass** (24) |
| `@flow/web` lint + test | **Pass** (58) |
| `@flow/api` build (`NODE_ENV=production`) | **Pass** |
| `@flow/web` build (`NODE_ENV=production`) | **Pass** |

---

## Security / immutability evidence

- **RLS:** enabled on all Phase 4 tables in `20260902000100_project_engine_foundation.sql`.
- **Cross-tenant:** API tests deny outsider reads (403, no data leakage).
- **Workspace isolation:** `project-persistence.test.ts` enforces tenant boundaries on in-memory repo.
- **Guard approval chain:** draft → in_review → approved → published → active (XState + API guards).
- **Idempotent generation:** replayed approve/publish idempotency keys in API integration test.
- **Executed contract baseline:** project generation requires executed contract (API + UI).
- **No privileged local execution:** Northstar project state stays in demo `sessionStorage`; authenticated path uses API only.

---

## Closure commits

| Commit | Purpose |
| ------ | ------- |
| `36a5ab7` | `chore(db): checkpoint applied supabase migration history` |
| `f89ef2e` | `feat(projects): close Phase 4 contract-to-project execution` |

### Files in Phase 4 closure commit

- Domain: `packages/commercial/src/project-*.ts`, `types.ts`, `index.ts`
- Persistence: `packages/database/src/project-persistence.ts`, tests, `workspace-provisioning.ts`, `index.ts`
- API: `project-engine.{service,controller}.ts`, `commercial.module.ts`, `persistence.providers.ts`, `workspace.module.ts`, `commercial.spec.ts`
- Web: `opportunities/[id]/project/page.tsx`, `lib/commercial/api.ts`, `northstar-store.ts` (+ test)
- E2E: `phase-4-project-engine.spec.ts`, `commercial-golden-path.spec.ts`, `commercial-journey.ts`, `supabase-auth.ts`
- Docs: `17-phase-4-*`, `18-phase-4-*`, `docs/verification/phase-4/**`
- Migration: `supabase/migrations/20260902000100_project_engine_foundation.sql`

### Intentionally excluded

- BLM packages/docs/experiments/knowledge
- UI redesign (`MissionControl`, lifecycle hubs, shell/tokens/os.css, etc.)
- Debug scripts (`apps/web/scripts/debug-*.mjs`)
- Modified Phase 3 screenshots
- `.codex-reports/*`, `dependency-register-v1.md`, `next-env.d.ts`

---

## Known limitations

- Northstar project journey is demo evidence only (not authenticated persistence proof).
- Reporting hub and mission-control UI redesign remain out of scope for Phase 4.
- Local `next build` requires `NODE_ENV=production` when `.env.local` sets `NODE_ENV=development`.

---

## Push result

Pushed `36a5ab7` and `f89ef2e` to `origin/main` — success (`c583506..f89ef2e`).
