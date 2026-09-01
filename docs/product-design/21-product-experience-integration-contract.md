# 21 — Product Experience Integration Contract

## Phase name

**Phase 5.5: Product Experience Integration**

## Problem statement

Phases 1–5 delivered governed commercial, project, and resource-capacity backends with E2E coverage. The authenticated frontend still presented module-oriented navigation and setup summaries instead of a coherent Business Operating System. Users could not see lifecycle progression, decision queues, or evidence-backed assistance in one place.

## Current UX weaknesses (baseline `4df312c`)

| Area | Weakness |
| ---- | -------- |
| Home | Setup checklist and placeholder pulse — not Mission Control |
| Navigation | Database modules (Twin, Setup, Services) as peers to commercial work |
| Lifecycle | No hub routes for proposals, contracts, delivery |
| Intelligence | No visible Ask Flow; copilot context absent |
| Density | Inconsistent mission framing across list/detail pages |
| Reporting | No honest reporting entry without fake charts |

## User outcomes

1. Founders land on **Mission Control** with real pipeline data and attention queue.
2. Navigation describes **how the business operates** (Mission Control → Clients → Pipeline → Delivery → Team → My Work).
3. Lifecycle hubs filter opportunities by stage with contextual next actions.
4. **Ask Flow** answers from stored data with Proof, limitations, and Guard flags.
5. Northstar demo presents the same shell and journey as authenticated workspaces.
6. No invented metrics, revenue, or AI claims.

## In-scope routes

| Route | Integration |
| ----- | ----------- |
| `/[workspace]/admin` | Mission Control |
| `/[workspace]/admin/clients` | Existing list (shell + tokens) |
| `/[workspace]/admin/opportunities/**` | Existing detail flows (shell) |
| `/[workspace]/admin/lifecycle/proposals` | Lifecycle hub |
| `/[workspace]/admin/lifecycle/contracts` | Lifecycle hub |
| `/[workspace]/admin/lifecycle/projects` | Delivery hub |
| `/[workspace]/admin/lifecycle/reporting` | Honest reporting links |
| `/[workspace]/admin/team` | Capacity (existing Phase 5) |
| `/[workspace]/work` | My Work (existing) |
| `/[workspace]/admin/settings` | Theme, accent, identity |
| `/[workspace]/onboarding/**` | Shell consistency (no API break) |
| Northstar (`northstar-creative`) | Demo journey with new shell |

## Out of scope

Phase 6 backend, new migrations, BLM, payroll/timesheets, decorative analytics, GPL UI libraries, autonomous agents, service-role browser calls, apptech Supabase project.

## Experience architecture

```text
AppProviders
  ThemeProvider → PrototypeProvider → WorkspaceApiProvider → AskFlowProvider
FounderShell
  lifecycle sidebar + utility menu + Ask Flow + theme
MissionScreen pattern
  lifecycle label → title → why/decision/next → copilot → body
MissionControl
  parallel opportunity fetch → priorities + pipeline counts + twin card
LifecycleHub
  filtered opportunity list per commercial stage
AskFlowDrawer
  intent picker → answerAskFlow() → proof + records + guard flag
```

## Design principles

1. **Operational truth** — every widget explains state, risk, or next action.
2. **Premium restraint** — monochromatic accent, dotted surfaces, no marketing hero inside app.
3. **Evidence-oriented AI** — Ask Flow is aggregation + explanation, not a chatbot.
4. **Guard by default** — recommendations only; mutations via existing APIs.
5. **Reuse** — extend tokens, shell, CommercialRoute; no parallel design system.

## Responsive behavior

| Breakpoint | Behavior |
| ---------- | -------- |
| 320–767px | Bottom lifecycle nav (Mission, Pipeline, Delivery, My Work, More); drawer sidebar |
| 768px+ | Compact sidebar with icons; Ask Flow bar in header |
| 1440px | Content max-width preserved; mission grids 3-column |

## Accessibility requirements

WCAG AA contrast; `:focus-visible`; landmarks; icon button labels; status not color-only; drawer Escape close; `prefers-reduced-motion`; async `aria-live` on Ask Flow responses.

## Data-integrity rules

- Mission Control metrics from `listOpportunities()` and session twin only.
- `hasFakeMetrics()` must remain false in tests.
- Ask Flow uses `answerAskFlow()` — no LLM, no internet.
- Northstar remains `sessionStorage`-isolated.
- Preserve commercial guards, RLS, and immutable approved records.

## Acceptance criteria

| # | Criterion |
| - | --------- |
| 1 | Mission Control shows pipeline, attention queue, twin when present |
| 2 | All primary nav links resolve to real routes |
| 3 | Lifecycle hubs filter by stage |
| 4 | Ask Flow lists supported intents and shows Proof |
| 5 | Theme/accent persistence unchanged |
| 6 | Phase 2–5 Playwright matrix passes (0 skipped) |
| 7 | New product-experience E2E passes |
| 8 | `pnpm typecheck`, lint, test, production build pass |
| 9 | 14 screenshots under `docs/verification/product-experience/screenshots/` |
| 10 | No secrets in staged files |

## Verification gates

```bash
npx pnpm@11.16.0 install && npx pnpm@11.16.0 typecheck
# package lint + test matrix
NODE_ENV=production npx pnpm@11.16.0 --filter @flow/web build
FLOW_E2E_COMMERCIAL=1 playwright test e2e/*.spec.ts --workers=1
```

Migration alignment: `20260903000100`. Supabase project: `zuvtnmmnwohrapaecsuj` only.
