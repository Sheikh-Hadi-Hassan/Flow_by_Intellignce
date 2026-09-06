# Functional Review

Independent review of **BB-00 — AI-composable building blocks + CRM Core reference**.
Date: 2026-09-03. Reviewer did not author the implementation. Other building blocks were not started. Mission Control selector/headline math was not reopened.

## Verdict: PARTIAL

| Category | Verdict | Why |
|----|----|----|
| Functionality | **PASS** | All ten required journeys have code plus automated evidence. Independently re-ran unit/API this review. Playwright journey cited from this session’s 4/4 run, not re-executed here. |
| Persistence | **PARTIAL** | Northstar keeps 52 seed rows in session state after suspend. API `listClients` hides after suspend; the in-memory map is not cleared, but that keep is inferred from code, not asserted. Runtime store is still in-memory even when Postgres is configured. Refresh after activation was not in Playwright. |
| Role restrictions | **PARTIAL** | SQL grants `building_block.*` / `crm.duplicate.*` only to OWNER/FOUNDER. API asserts those permissions. No employee-token deny journey. Directory `restricted` is a `?state=` fixture. |
| Northstar isolation | **PASS** with residual | Demo CRM is sessionStorage on `northstar-creative`; authenticated workspaces keep `ClientsList`. API cross-tenant 403. Ask Flow remains Northstar-only. Residual: `/api/ask` still trusts client-supplied `activeBuildingBlocks`. |
| Overall (BB-00) | **PARTIAL** | Required journeys work. Visual PASS, live RLS query, employee deny, and durable Postgres installations remain open. Do not close as overall product PASS. |

**Functionality: PASS**, with residuals listed below. Residuals are coverage and durability gaps, not broken journeys.

This review did **not** re-run Playwright. Browser evidence is the session run of `apps/web/e2e/building-blocks-crm-core.spec.ts` (**4 passed**, 0 skipped, 2026-09-03) plus screenshots on disk under `docs/verification/building-blocks/screenshots/`.

Independent unit/API re-run (this review, 2026-09-03):

```
npx pnpm --filter @flow/contracts test
→ 51 passed / 0 failed (includes building-blocks.test.ts, 7 tests)

npx pnpm --filter @flow/database exec -- vitest run src/building-block-persistence.test.ts
→ 2 passed / 0 failed

npx pnpm --filter @flow/web exec -- vitest run src/lib/ask-flow src/lib/building-blocks
→ 28 passed / 0 failed (27 Ask Flow + 1 store)

npx pnpm --filter @flow/api exec -- vitest run test/building-blocks.spec.ts
→ 2 passed / 0 failed
```

## Journeys tested

| Journey | Result | Evidence |
|----|----|----|
| 1. Business profile → CRM Core recommended | **PASS** | `composeBuildingBlockRecommendations(NORTHSTAR_COMPOSER_PROFILE)` returns one row, `blockId: crm.core`, `requiresHumanApproval: true`, evidence length > 0 (`building-blocks.test.ts`). API `GET /building-blocks` returns the same recommendation. Playwright: `bb-recommended-crm` visible with `/verified requirement/i`. |
| 2. Founder configures duplicate threshold | **PASS** | Registry UI number input 50–100; Save writes `duplicateThreshold`. API configure `85` → 201; `1` → ≥400. `parseCrmCoreConfiguration({ duplicateThreshold: 10 })` throws. Web store test uses `82`. **Residual:** Playwright clicks Save without changing or asserting the saved value. |
| 3. Submit for approval; AI cannot jump to active | **PASS** | After submit, `isActive` is false (`building-blocks.test.ts`, `store.test.ts`). `approve()` from `available` throws `Cannot move`. Composer always sets `requiresHumanApproval: true`; `parseRecommendation` throws if it is not `true`. Playwright: Submit, then separate Approve. No composer path calls `approve()`. |
| 4. Approve → active, 52 clients, directory | **PASS** | Playwright: “CRM Core is active…”, `/admin/clients` shows `crm-directory` with **52** `li` and Meridian Health. API clients length 52 including Meridian. Seed: 9 named + 43 generated; unique `demoKey`. **Residual:** Primary Clients nav in `founderLifecycleNav` is always present; it is not gated on `appearsWhen: "active"` from the manifest. Directory *content* is gated. |
| 5. Ask Flow CRM when `activeBuildingBlocks` includes `crm.core` | **PASS** | Unit: duplicates question with `["crm.core"]` → `find_duplicate_clients` + Brightline; with `[]` → `tool_unavailable` / “CRM Core is not active”. `AskFlowProvider` sends `activeBuildingBlocks: ["crm.core"]` only when `isCrmCoreActive()`. Playwright after activation: Ask “Which clients look like duplicates?” → “Answered from” + Brightline. Tools read `northstarCrmSeed()`, not session rows (same deterministic seed). |
| 6. Duplicate merge protected | **PASS** | Playwright: “Merge requires approval” is **disabled**. API `POST .../crm/proposals` → `proposed`; approve → `approved`. Ask Flow `propose_duplicate_merge` returns a proposal, not a write. **Residual:** Northstar UI never posts a proposal; the button is inert. API test uses `clients.body[0].id` as `duplicateId` (client id, not candidate id). Approve still marks a matching candidate `merged`. |
| 7. Suspend hides directory without deleting seed | **PASS** | Playwright after Suspend: heading “Client directory is not active”. `crmClientsVisible()` is `[]` while `readBuildingBlockState().clients.length === 52` (`store.test.ts`). API `listClients` after suspend is `[]`. `InMemoryBuildingBlockStore.suspend` does not clear the clients map; `seedIfActive` will not re-seed if rows remain. **Residual:** API/persistence tests assert hide, not keep. Playwright does not inspect sessionStorage after suspend. |
| 8. Workspace isolation | **PASS** | Registry: `listInstallations("beta")` is `[]`. API anonymous 401; Alice on Maya’s workspace 403 and body has no Meridian. Northstar uses sessionStorage + `isMissionDemoWorkspace`; other workspaces keep commercial `ClientsList`. Ask Flow denies non-`northstar-creative`. Installations keyed `workspaceId:blockId`. |
| 9. Six UI states | **PASS** | Playwright `?state=` empty / loading / error / restricted / populated / dense. Manifest `supportedUiStates` is the six `BUILDING_BLOCK_UI_STATES`. **Residual:** Query-param fixtures, not live load/error. `dense` only reuses `crm-directory`. `restricted` is not an employee session. |
| 10. Unknown AI recommendations rejected | **PASS** | `rejectUnknownModelOutput` throws “Unknown building block” for `crm.sales_pipeline`. Composer + model stage `"won"` throws “Unknown lifecycle stage”. Unknown client type / required field / threshold rejected in `parseCrmCoreConfiguration`. **Residual:** Unknown permission / field / integration branches in `rejectUnknownModelOutput` are untested. |

Mandatory skipped tests in the Playwright spec: **0** (`test.skip` / `test.fixme` absent).

## Persistence checks

- **Northstar demo:** `BUILDING_BLOCK_STORAGE_KEY` in `sessionStorage`. Activate seeds 52 clients only when `clients.length === 0`. Suspend rebuilds lifecycle via `registryFor("suspended")` and **keeps** the current `clients` / `duplicates` arrays. Store test proves keep.
- **Across refresh:** Not exercised in Playwright. SessionStorage should survive a same-tab refresh; that is inferred, not observed.
- **API:** `InMemoryBuildingBlockStore` is process memory. `createPersistenceStack()` still injects `InMemoryBuildingBlockStore` when a Postgres pool exists. Migration `20260906000100_building_blocks_crm_core.sql` defines tables and RLS; this review did not apply or query them.
- **Seed rerun:** `northstarCrmSeed()` IDs are stable (`building-blocks.test.ts`). `seedIfActive` no-ops when the workspace already has clients.
- **Mission Control math:** Building-block seed does not call `decisionHeadline` / history rollups. Named clients (Meridian, Kestrel, Northwind, Acme) are referenced by ID, not copied into Mission Control totals.

## Role restriction checks

- API: `building_block.read|configure|approve|suspend`, `client.read`, `crm.duplicate.propose`, `crm.duplicate.merge` are asserted on the matching methods.
- Provisioning adds those keys to founder permissions. Migration attaches them only to `OWNER` and `FOUNDER`.
- Northstar CRM routes use `WorkspaceGate` `variant="founder"`.
- **Not proven:** Employee / copywriter token denied on approve, suspend, or merge. Directory `restricted` copy is a demo state, not a live role.
- Ask Flow CRM tools still honor `ASK_TOOL_DEFINITIONS` permissions, then the `activeBuildingBlocks` gate. `/api/ask` trusts client `role` / `permissions` / `activeBuildingBlocks` (same AF-02 residual).

## Northstar isolation

- Demo CRM Core UI mounts only when `isMissionDemoWorkspace(workspace)`. Authenticated workspaces still render commercial client create/list.
- Ask Flow: `workspaceId !== northstar-creative` → `cross_workspace` before tools.
- API: workspace header must match path; Alice cannot read Maya’s catalog.
- Seed hrefs stay under `/northstar-creative/admin/...`.
- Northstar installations are not written to live `crm_clients` from the web demo store.

## Blockers

None that fail the ten BB-00 journeys.

Do **not** close as overall PASS while these remain:

1. Playwright not independently re-run in this review (session 4/4 cited; screenshots present).
2. Duplicate threshold change not asserted in the browser journey.
3. API suspend-keep of 52 rows inferred from the in-memory map, not asserted.
4. No employee deny journey.
5. Building-block store is in-memory in API production wiring; live RLS unqueried.
6. `/api/ask` trusts client `activeBuildingBlocks`.
7. Clients primary nav is not gated on CRM Core `active`.
8. Merge UI is disabled-only; it does not call the proposal API.
9. Product-owner visual approval and independent UI critic are out of this review’s scope and still required for overall PASS.

## Files cited

- `packages/contracts/src/building-blocks/{registry,composer,schema,building-blocks.test}.ts`
- `packages/contracts/src/building-blocks/crm-core/{manifest,config,seed}.ts`
- `packages/database/src/building-block-persistence.ts`
- `apps/api/src/building-blocks/{building-blocks.service,building-blocks.controller}.ts`
- `apps/api/test/building-blocks.spec.ts`
- `apps/web/src/lib/building-blocks/{store,store.test,use-building-blocks}.ts`
- `apps/web/src/components/building-blocks/BuildingBlockRegistry.tsx`
- `apps/web/src/components/crm-core/CrmCoreScreens.tsx`
- `apps/web/src/lib/ask-flow/assistant/{crm-tools,tools,assistant.test,planner}.ts`
- `apps/web/src/components/ask/AskFlowProvider.tsx`
- `apps/web/e2e/building-blocks-crm-core.spec.ts`
- `apps/api/src/database/persistence.providers.ts`
- `supabase/migrations/20260906000100_building_blocks_crm_core.sql`
- `docs/verification/building-blocks/BB-00-CRM-CORE-REFERENCE.md`
