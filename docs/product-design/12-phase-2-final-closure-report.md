# Phase 2 Final Closure Report

## 1. Final verdict

* **PASS** — Authenticated **browser** golden path and Playwright e2e **PASS** end-to-end (UI sign-in, commercial hydration, discovery analyze, brief approval, re-auth, light/dark, 390px/1440px). API golden path, RLS isolation, unit/integration tests, typecheck, production builds, and monorepo lint all pass.

## 2. Environment verified

* **Supabase project reference:** `zuvtnmmnwohrapaecsuj` (Flow by Intellignce)
* **Branch:** `main` at `8c08337`
* **Base commit:** `f580816` (`feat(intelligence): add evidence-linked discovery extraction`)
* **Web/API ports:** Web `3000`, API `4000`
* **Cold start:** Killed ports 3000/4000, rebuilt `@flow/commercial` + `@flow/database` + `@flow/api`, `next build`, then `node apps/api/dist/main.js` + `next start --port 3000`
* **Environment names (never values):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DATABASE_POOLER_URL`, `API_PORT`, `FLOW_DB_INTEGRATION_TESTS`, `FLOW_E2E_COMMERCIAL`, `E2E_TEST_PASSWORD`

## 3. Root causes (authenticated commercial browser failure)

**Symptom A:** Playwright reached `/{slug}/admin/services` but `getByLabel("Service name")` was missing; page showed sign-in or empty shell.

**Cause A — workspace hydration race:** `useUnifiedWorkspaceSession` returned `isResolving: false` on the first paint while `loadWorkspace()` was still in flight. `WorkspaceGate` redirected to `/sign-in` before the API bundle loaded, even though middleware auth and `/api/auth/session` were valid.

**Fix A:** Treat `awaitingApiSession` as resolving until `apiSession` matches the URL slug or an error is set (`apps/web/src/lib/workspace/context.tsx`).

**Symptom B:** Discovery **Analyze notes** failed with `Analysis failed` / API `500 time zone "gmt+0500" not recognized`.

**Cause B — Postgres timestamp round-trip:** `PostgresCommercialRepository.updateExtractionRun` reused `String(row.started_at)` where `row.started_at` is a `Date`. Node stringified with local `GMT+0500`, which Postgres rejected on write.

**Fix B:** `postgresTimestamp()` helper serializes `Date` values with `toISOString()` (`packages/database/src/commercial-persistence.ts`). API pool also sets `options: "-c timezone=UTC"` (`apps/api/src/database/persistence.providers.ts`).

**Symptom C:** Onboarding API `PATCH` returned `500 null value in column "current_step"`.

**Cause C:** `workspace.service.ts` spread the full NestJS DTO into the SQL patch, writing `undefined` fields as `NULL`.

**Fix C:** Merge only defined onboarding patch fields (`apps/api/src/workspace/workspace.service.ts`).

**Supporting fixes (e2e + packages):**

| Layer | Change |
|-------|--------|
| E2E harness | Real UI sign-in (`signInThroughUi`), nested onboarding body in `provisionCommercialWorkspace`, `CommercialDataGate` wait (`commercial-data-pending`) |
| `@flow/commercial` resolution | Workspace `package.json` exports + `prebuild`/`predev` build commercial before consumers; removed brittle `tsconfig` dist aliases |

## 4. Authenticated browser golden path

| Step | Action | Result | Persistence | Evidence |
|------|--------|--------|-------------|----------|
| A Auth | UI sign-in (isolated `@flow-phase2.test` user) | **PASS** — redirect to `/{slug}/admin` | Supabase session in browser | Playwright trace |
| B Services | Create + publish questionnaire | **PASS** | Postgres `commercial_services` | Playwright log |
| C Clients | Create client + contact | **PASS** | Postgres `commercial_clients` | Playwright log |
| D Opportunities | Create opportunity + questionnaire answers | **PASS** | Postgres `commercial_opportunities` | Playwright log |
| E Discovery | Save notes → analyze (fixture provider) → verify facts → handle blocking risk | **PASS** | `discovery_extraction_runs`, `extracted_facts` | Playwright log |
| F Missing | Answer required follow-up | **PASS** | `commercial_follow_ups` | Playwright log |
| G Calculate | Deterministic calculation | **PASS** | `latest_calculation` JSON on opportunity | Playwright log |
| H Brief / approvals | v1 → request changes → v2 → approve immutable | **PASS** | `brief_versions` v2 `approved`, guards | Playwright log |
| I Persistence | Reload, dark theme, 390px mobile, re-sign-in | **PASS** | Approved state survives refresh + re-auth | Playwright log |
| API path | `scripts/phase2-golden-path-api.mjs` | **PASS** | `docs/verification/phase-2/golden-path-api.json` | `journeyStatus: approved`, `approvedVersion: 2`, `mutateAfterApproveStatus: 403` |

**Playwright command (2026-08-31 cold run):**

```bash
cd apps/web && FLOW_E2E_COMMERCIAL=1 node --env-file=../../.env.local \
  ./node_modules/@playwright/test/cli.js test e2e/commercial-golden-path.spec.ts \
  --project=chromium-light --timeout=300000 --reporter=line
```

**Output:** `1 passed (3.3m)` — 2026-08-31 cold run with `next start` + API on `:4000`.

**Proof method:** Real Supabase UI sign-in only. No Northstar store, no sessionStorage token injection, no static bearer in browser storage.

## 5. Responsive and theme verification

| Viewport / theme | Inspected | Overflow | Result |
|------------------|-----------|----------|--------|
| 1440 light | Full golden path | None (`assertNoHorizontalOverflow`) | **PASS** |
| 1440 dark | Approvals after approve | None | **PASS** |
| 390 mobile | Opportunity overview | None | **PASS** |
| Re-auth | Sign-out flow via `/sign-in` + sign-in | N/A | **PASS** |

## 6. Browser technical evidence

* **Console errors:** Clean after filtering expected unauthenticated `401` on `/api/auth/session` during sign-in page load (session probe before credentials entered).
* **Hydration warnings:** None observed in passing run.
* **Failed requests:** Clean after ignoring `net::ERR_ABORTED` on Next.js `?_rsc=` prefetch cancellations during fast navigation.
* **Accessibility:** Form labels present; `status-a11y.test.ts` pass.
* **Autosave:** `autosave.test.ts` pass.

## 7. Playwright test

* **Test file:** `apps/web/e2e/commercial-golden-path.spec.ts`
* **Helpers:** `e2e/helpers/supabase-auth.ts`, `e2e/helpers/commercial-workspace.ts`
* **Scenarios:** Full authenticated journey through immutable approved brief; console/hydration/network/overflow diagnostics.
* **Result:** **PASS** — `1 passed (3.3m)` on 2026-08-31 cold environment.

## 8. Direct Postgres RLS results

**Command:** `FLOW_DB_INTEGRATION_TESTS=1 node --env-file=.env.local scripts/commercial-rls-test.mjs`  
**Evidence:** `docs/verification/phase-2/rls-results.json`

| Check | Result |
|-------|--------|
| Anonymous sees 0 rows on commercial tables | **PASS** |
| User A tenant isolation | **PASS** |
| User B cross-tenant insert denied | **PASS** |

## 9. Complete Phase 2 table-policy audit

Migration head: `20260831000100` (extraction runs) + `20260830000200` (RLS write split). Commercial tables workspace-scoped; `extracted_facts` dual UPDATE policies intentional. **PASS** for tenant isolation.

## 10. Supabase advisors

* **Security:** `auth_leaked_password_protection` — **DISABLED** (WARN). Unchanged.
* **Performance:** Permissive-policy warnings on Phase 1 tables; commercial SELECT overlaps resolved by `20260830000200`.

## 11. Package/build correction

* **Previous problem:** `apps/api/tsconfig.json` pointed `@flow/*` at `dist/index.d.ts`; `tsconfig.base.json` path to `@flow/commercial/src` broke Next.js Turbopack (`.js` import resolution from source).
* **Final resolution:**
  * `apps/api/tsconfig.json`: `"paths": {}` — resolve workspace packages via `node_modules` + `package.json` exports (`dist/index.js`).
  * `apps/web/tsconfig.json`: `"paths": {}` — same.
  * `apps/web/next.config.ts`: `turbopack.resolveAlias["@flow/commercial"] = "../../packages/commercial/dist"`.
  * `apps/web/package.json`: `prebuild` builds `@flow/commercial`.
  * Removed stray `packages/commercial/src/**/*.js` build artifacts; `.gitignore` guards `dist/` and accidental `src/` emits.

## 12. Command results

| Command | Result |
|---------|--------|
| `npm run build --prefix packages/commercial` | **PASS** |
| `npm run build --prefix packages/database` | **PASS** |
| `npm run build --prefix apps/api` | **PASS** |
| `npm run build --prefix apps/web` | **PASS** |
| `npm test --prefix packages/commercial` | **PASS** (21) |
| `npm test --prefix packages/database` | **PASS** (71) |
| `npm test --prefix apps/api` | **PASS** (23) |
| `npm test --prefix apps/web` | **PASS** (54) |
| `npm run typecheck --prefix apps/api` | **PASS** |
| `npm run typecheck --prefix apps/web` | **PASS** |
| `npm run lint --prefix packages/commercial` | **PASS** |
| `npm run lint --prefix packages/database` | **PASS** |
| `npm run lint --prefix apps/api` | **PASS** |
| `npm run lint --prefix apps/web` | **PASS** |
| `node --env-file=.env.local scripts/phase2-golden-path-api.mjs` | **PASS** — `golden-fe0d7f3f` |
| `FLOW_DB_INTEGRATION_TESTS=1 node --env-file=.env.local scripts/commercial-rls-test.mjs` | **PASS** |
| `FLOW_E2E_COMMERCIAL=1 … commercial-golden-path.spec.ts` | **PASS** — `1 passed (3.4m)` (2026-08-31 lint-closure re-run) |

## 13. Git checkpoint

* **Commit hash:** `8c08337` (`fix(commercial): close Phase 2 authenticated browser golden path`)
* **Branch:** `main`
* **Push status:** pending re-attempt after lint-closure verification

## 14. Known limitations

* Leaked-password protection still disabled on Supabase Auth.
* Playwright diagnostics filter expected 401 session probe and aborted RSC prefetches (documented above).
* Screenshot capture script (`capture-phase2-screenshots.mjs`) not re-run this pass; Playwright pass log is primary browser evidence.

## 15. Scope confirmation

Real BLM integration, Phase 3, proposals, contracts, invoices, portals, voice, MCP, LangGraph, and deployment were **not** started. `docs/product-design/14-phase-2-1-blm-verification-report.md` was **not** modified.
