# DEMO-02 — Business Registry and firmographics (BB-01)

Stop after DEMO-02D. Do not begin DEMO-03.

Authoritative acceptance: `docs/demo-data/NORTHSTAR-MILESTONE-PLAN.md` § DEMO-02.
Route: `/northstar-creative/admin/settings/business`

## DEMO-02D checklist

| Area | Status |
|---|---|
| Contracts seed / safety / clock / manifest | Complete |
| Migration + in-memory persistence + API | Complete |
| Settings UI sections | Complete |
| Shell Ask Flow dock clearance | Complete |
| Ask Flow ↔ page-state reconciliation | Complete |
| Mobile header: no duplicated Flow wordmark | Complete (≤1080 hide wordmark; page title) |
| Sticky-header scroll offsets | Complete (`scroll-padding-top` / section `scroll-margin-top`) |
| Single-accent Incomplete badge | Complete |
| RLS closure migration `20260908000100_business_registry_rls_closure.sql` | Authored |
| Phase 1 leak inventory tests | Pass (document DEMO-02C leaks in `20260907`) |
| Live Postgres RLS matrix | **Blocked** — Docker Desktop I/O errors |
| PO review contact sheet (object-fit: contain) | Captured — **approval not recorded** |

## Schema reuse decision

| Decision | Evidence |
|---|---|
| Reuse `public.organizations` | No parallel legal-entity table |
| Sensitive tax/bank/ownership | Moved to satellite tables in DEMO-02D closure migration |
| Public identity | `organization_public_identity` view (`security_invoker`) |
| Canonical org ID | `00000000-0000-4000-b001-000000000001` |

## Permission matrix (Postgres target)

| Role | Profile | Locations | Docs | Tax/bank | Signatories | Audit |
|---|---|---|---|---|---|---|
| Founder/Admin | Full | Manage | Manage | Manage | Manage | Read |
| Finance | Read | Read | No | Manage | No | No |
| Operations | Read | Manage | No | No | No | No |
| Employee | Public identity | No | No | No | No | No |
| Anonymous | Denied | Denied | Denied | Denied | Denied | Denied |
| Cross-workspace | Denied | Denied | Denied | Denied | Denied | Denied |

API: anonymous 401; cross-tenant 403.

## RLS closure (DEMO-02D)

Migration `supabase/migrations/20260908000100_business_registry_rls_closure.sql`:

- Drops membership SELECT on compliance + signatories
- Record-type-aware compliance policies (documents / tax / insurance / obligations)
- Explicit `registry.*.read` + `registry.audit.read`
- Satellite tables for tax, bank, ownership; drops those columns from `organizations`
- Organization SELECT requires `organization.read`; location SELECT requires `location.read`
- Audit append expanded for tax/signatory/compliance/document/profile/location actors; append-only
- `prevent_organization_delete` → `SECURITY INVOKER` + revoke EXECUTE from PUBLIC

Harness: `packages/database/src/fixtures/business-registry-rls-harness.sql`

Live suite: `packages/database/src/business-registry-rls.integration.test.ts`  
(`FLOW_DB_INTEGRATION_TESTS=1`, optional `FLOW_DB_RLS_EXPECT_LEAKS=1` against pre-closure schema)

## Live Postgres blocker (exact)

```text
Docker Desktop storage I/O errors:
- docker images / run postgres:17 → input/output error on containerd blobs/meta.db
- existing supabase_db_AppTech reports Up but unhealthy; port 54322 ECONNREFUSED
- docker exec / restart → input/output error
- Homebrew postgresql not available on PATH
- Production DATABASE_URL was not used (productionTouched=false)
```

Security remains **PARTIAL** until an isolated local Postgres can apply migrations through `20260908000100` and the live matrix passes.

## Dock clearance + mobile

Shell variables `--ask-flow-*`; `#main-content` scrolls above resting dock.  
≤1080px: hide `.flow-ws-header__wordmark`; centre title = lifecycle label or “Business Registry” / “Settings” (not a second “Flow” or duplicated workspace name).  
Sticky header: `scroll-padding-top` and section `scroll-margin-top` include `--shell-header-height`.

## Tests

| Suite | Result |
|---|---|
| `@flow/contracts` registry-business | 7 passed |
| `@flow/database` persistence | 4 passed |
| `@flow/database` RLS integration | 7 passed static; 9 live skipped (no Postgres) |
| Playwright business-registry* | See evidence manifest after latest run |

## Screenshots (DEMO-02D)

Exact viewport captures (`fullPage: false`):

| File | Capture |
|---|---|
| `d02d-01-1440-populated-light-top.png` | 1440×900 populated light top |
| `d02d-02-1440-populated-dark-top.png` | 1440×900 populated dark top |
| `d02d-03-1440-mid-dock-clear.png` | Mid-scroll + resting dock |
| `d02d-04-1440-audit-dock.png` | Audit + resting dock |
| `d02d-05-1440-incomplete-ask.png` | Incomplete + Ask answer |
| `d02d-06-1440-restricted-ask.png` | Restricted employee + Ask deny |
| `d02d-07-375-mobile-top.png` | 375 top |
| `d02d-08-375-mobile-mid-dock.png` | 375 mid + dock |
| `d02d-09-375-mobile-bottom-dock.png` | 375 bottom + dock |
| `d02d-10-375-ask-expanded.png` | 375 expanded Ask |
| `d02d-11-320-header-dock.png` | 320 header + dock |
| `d02d-12-430-header-dock.png` | 430 header + dock |
| `DEMO-02-PO-REVIEW.png` | Contact sheet (`object-fit: contain`) |

## Verdicts

| Category | Verdict | Evidence |
|---|---|---|
| Functionality | PASS | Unit/API/Ask state; contracts + persistence green |
| Visual design | PARTIAL | New contact sheet; PO approval not recorded |
| Accessibility | PASS | Prior axe clean; 44×44 targets preserved; overflow checks |
| Security | PARTIAL | Policies repaired in migration + leak inventory tests; **live Postgres matrix blocked** (Docker I/O) |
| Data integrity | PASS | One org ID; satellite sensitive tables; no second legal entity |
| Browser verification | PARTIAL | Pending green Playwright re-run after header assertion fix |

**Overall: PARTIAL.**

Stop — do not begin DEMO-03.
