# BB-00 — Building-block foundation and CRM Core reference

Stop after the foundation and CRM Core. Do not begin Sales Pipeline,
Marketing Automation, or Integration Hub.

Architecture: `docs/product-architecture/AI-COMPOSABLE-BUILDING-BLOCKS.md`
ADR: `docs/adr/ADR-026-ai-composable-building-blocks.md`

## How to see it

Sign into the Northstar demo, then:

```
/northstar-creative/admin/building-blocks
/northstar-creative/admin/clients
/northstar-creative/admin/clients/00000000-0000-4000-a000-000000000002
/northstar-creative/admin/clients/duplicates
```

Journey: Save configuration → Submit for approval → Approve activation →
open the 52-row directory → ask Ask Flow “Which clients look like
duplicates?” → Suspend. Historical seed rows stay in session state; the
directory hides.

## Audit — reused, adapted, missing

| Existing capability | Finding |
|---|---|
| `public.crm_clients` / `public.crm_contacts` | Reused. No parallel CRM tables |
| Commercial client CRUD | Reused for non-demo workspaces (`ClientsList`) |
| Opportunities, projects, contracts, invoices | Referenced only |
| Questionnaires / discovery | Composer input profile |
| Workflows / approvals / Action Wall | Write tools create proposals |
| Permissions / audit | Extended with `building_block.*` and `crm.duplicate.*` |
| Mission Control selectors and headline math | Unchanged |
| Ask Flow `/api/ask` | CRM tools gated on `activeBuildingBlocks` |
| Sales Pipeline / Marketing / Integration Hub | Not started |

## Journey evidence (browser)

Playwright `apps/web/e2e/building-blocks-crm-core.spec.ts` — **4 passed**
(2026-09-03):

1. Recommendation → configure → approve → 52 clients including Meridian
   Health → Brightline duplicate pair with merge disabled → Ask Flow
   “Answered from” + Brightline → suspend hides the directory
2. Six UI states via `?state=`
3. axe wcag2a/aa: no serious or critical; no horizontal overflow at
   1440 / 768 / 375 in light and dark
4. Screenshot capture into `docs/verification/building-blocks/screenshots/`

Ask Flow CRM tools were failing because `/api/ask` is Node and
`sessionStorage` is empty on the server. The request now sends
`context.activeBuildingBlocks` from the client. Unit coverage:
`assistant.test.ts` active vs inactive CRM Core.

## Tests

| Suite | Result |
|---|---|
| `@flow/contracts` including building-block tests | 51 passed |
| `@flow/database` `building-block-persistence.test.ts` | 2 passed |
| `@flow/web` Ask Flow + building-block store | 27 Ask Flow + 1 store |
| `@flow/api` `building-blocks.spec.ts` | 2 passed (cross-tenant deny; recommend→approve→52 clients→proposal→suspend) |
| Playwright BB-00 | 4 passed |

## Verdicts

| Category | Verdict | Evidence |
|---|---|---|
| Functionality | PASS | Unit, API, and browser journey above. AI cannot activate. Unknown model blocks/stages rejected. Merge is a disabled protected action. Independent functional review: `docs/quality/critic-reports/functional-reviewer-2026-09-03-bb-00.md` |
| Visual design | PARTIAL | Independent critic recapture: average **7.8/10**, all five primary screens ≥8. Product-owner approval is not recorded. Report: `docs/quality/critic-reports/ui-critic-2026-09-03-bb-00-crm-core.md` |
| Accessibility | PASS | axe: no serious or critical on the populated directory |
| Security | PARTIAL | API anonymous 401 and cross-tenant 403. Migration authors RLS. Runtime installation store is still in-memory; live Postgres RLS was not queried. Report: `docs/quality/critic-reports/security-reviewer-2026-09-03-bb-00.md` |
| Data integrity | PASS | 52 deterministic demo keys; seed rerun stable; Mission Control totals not rewritten; suspend keeps `clients.length === 52` in demo state |
| Browser verification | PASS | Journey, six states, 1440/768/375, light/dark overflow. Ask Flow returned Brightline evidence after activation |
| Performance | N/A | No new runtime dependencies |

**Overall: PARTIAL.** The recommendation-to-activation-to-usage journey
works in the browser and the automated tests passed. Overall PASS is
blocked by missing product-owner visual approval and live RLS query
evidence. Do not treat this as overall PASS.

## Screenshots

`docs/verification/building-blocks/screenshots/`

| File | What it shows |
|---|---|
| `01-registry-recommended-1440-light.png` | Recommended CRM Core editorial row |
| `02-registry-recommended-1440-dark.png` | Same, dark |
| `03-registry-active-1440-light.png` | Active status + open directory |
| `04-directory-1440-light.png` | 52-row client directory |
| `05-directory-1440-dark.png` | Directory, dark |
| `06-client-360-1440-light.png` | Meridian Health 360 |
| `07-duplicates-1440-light.png` | Brightline pair, merge disabled |
| `08-registry-375-light.png` | Registry, mobile |
| `09-directory-375-light.png` | Directory, mobile |
| `10-directory-375-dark.png` | Directory, mobile dark |

## Commands

```
npx pnpm --filter @flow/contracts test
npx pnpm --filter @flow/database exec -- vitest run src/building-block-persistence.test.ts
npx pnpm --filter @flow/web exec -- vitest run src/lib/ask-flow src/lib/building-blocks
npx pnpm --filter @flow/api exec -- vitest run test/building-blocks.spec.ts
npx pnpm --filter @flow/web exec -- node --env-file=../../.env.local node_modules/@playwright/test/cli.js test e2e/building-blocks-crm-core.spec.ts
```

## Residuals

- Workspace installations in the API process are in-memory. SQL tables and
  RLS policies exist in
  `supabase/migrations/20260906000100_building_blocks_crm_core.sql` but
  this job did not apply and query them on a live database.
- Northstar CRM Core UI is seed-backed. Live create/update still uses the
  existing commercial client API on non-demo workspaces.
- Product-owner visual approval is not recorded.

## Stopped

CRM Core reference is the only building block in this job. Mission Control
layout and calculations were not changed.
