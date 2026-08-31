# 11 — Phase 2 verification

Project: **Flow by Intellignce** (`zuvtnmmnwohrapaecsuj`). apptech-dev was not used.

Migration head: `20260830000100` (additive). RLS is on for commercial tables.

## Automated results

| Check | Result |
| ----- | ------ |
| `@flow/commercial` unit tests | Pass (15) including extraction provenance and scope writes |
| `@flow/database` tests | Pass (71) including commercial isolation, immutability, idempotency, scoped requirements |
| `@flow/api` tests | Pass (23) including golden path, anonymous 401, cross-tenant 403 |
| `@flow/web` tests | Pass (54) including Northstar golden path, autosave race, demo isolation |
| Typecheck commercial/database/api/web | Pass |
| `@flow/api` production build | Pass (prior session; package rebuilt this session) |
| Lint (new commercial files) | Pass for web typecheck; repo-wide lint not claimed |
| Migration | Applied earlier; no new migration this session |
| Supabase advisors | Ran `supabase db advisors --linked`. No disabled-RLS findings. WARN: leaked password protection off (pre-existing Auth). WARN: multiple permissive SELECT policies on commercial tables (read+write overlap, same pattern as Phase 1). |

## Browser (Northstar isolated demo)

Verified on `http://localhost:3000` against workspace slug `northstar-creative`:

1. Home → Explore the Northstar demo → founder home (Maya)
2. Services list shows Brand Strategy & Identity
3. Clients list shows Acme Robotics
4. Opportunity questionnaire filled (brand maturity, audience, success metric)
5. Discovery notes extracted as **draft** facts; human Verify required
6. Missing information answered (Maya Chen, founder)
7. Deterministic calculation: recommended price USD 11,000.00
8. Brief version 1 generated with goals, audience, scope, requirements, risks
9. Founder review submitted; Guard ALLOW recorded
10. Approve immutable brief; approve/request-changes disabled
11. Refresh kept **Version 1 Approved** and both Guard events
12. Light and dark theme toggle on the approvals page; no Next.js error overlay

Direct URL navigation to `/northstar-creative/admin/opportunities/ns-opp-acme-brand/approvals` after refresh kept approved state.

Authenticated production-workspace click-through was not run in this session (API golden path covers that backend). Playwright script `apps/web/scripts/commercial-golden-path.mjs` exists but was not executed (Playwright is not a package dependency).

## Phase 3 not started

No proposals, contracts, invoicing, portals, voice, MCP server, LangGraph, or deployment.
