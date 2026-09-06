# MC-02R-04 — Mission Control V2 default and content parity

**Overall: PARTIAL**

V2 is the default Mission Control on `/northstar-creative/admin`. Every V1
metric, decision, operational list, and activity record is present on the V2
canvas, below a locked Ledgerix first viewport. Functionality, data, browser,
and axe checks pass. Visual design does not meet the 8/10 overall gate.

**Mission Control is frozen.** Do not redesign the first viewport. Do not
start another product screen from this job.

## How to see it

| URL | Surface |
|---|---|
| `/northstar-creative/admin` | Mission Control V2 (canonical) |
| `/northstar-creative/admin?variant=canvas-v2` | Same V2 canvas |
| `/northstar-creative/admin?variant=legacy` | Still V2 (legacy without `qa=1` is not user-facing) |
| `/northstar-creative/admin?variant=legacy&qa=1` | V1, QA-only, for parity comparison |

V1 is not deleted.

## Verdicts

| Category | Verdict | Evidence |
|---|---|---|
| Functionality | **PASS** | Playwright default-route, metric presence, six states, expand/keyboard, Ask Flow per section. Vitest selectors + seed rollups |
| Visual design | **PARTIAL** | Independent critic: primary 1440 light full page **8/10**, overall **7.1/10**. Critical defects remain (expanded-row dock overlay, 375 header collision, dark header plus). Product-owner approval not recorded |
| Accessibility | **PASS** | Axe: no serious or critical on populated canvas; foundation repeats axe at 1440/375 × light/dark. Evidence links keyboard-focusable. Touch-target and 375 header collision are visual/shell residuals, not axe failures |
| Security | **N/A** | No API, RLS, auth, or tenant-boundary change |
| Data integrity | **PASS** | Seed rollups (pipeline, delivery, receivables, headline = sum of largest decision impacts). Selectors shared with Ask Flow. Six `?state=` kinds |
| Browser verification | **PASS** | Playwright journeys on default V2. Overflow check at 1440 / 1024 / 768 / 430 / 375 / 320. Light/dark first-viewport geometry. Console clean on foundation (favicon / expected 401 filtered) |
| Performance | **N/A** | No new dependencies |

Overall PASS is blocked by visual PARTIAL. Unknown or unverified visual PO
approval stays PARTIAL.

## V1-to-V2 parity table

V2 follows V2’s scene and V1’s information. The four first-viewport panels are
not cloned as a second tile row. Extra metrics live in editorial ledgers below
the fold.

| V1 information | V2 location | Displayed populated value | Duplicate of first viewport? |
|---|---|---|---|
| Weighted pipeline | Signal panel `met-weighted-pipeline` + activity pulse legend | `$404.9K` | No — pulse is a weekly series, not a second tile |
| Forecast revenue | Signal panel `met-forecast` | `$312.4K` | No |
| Active delivery | Cash and commitments ledger `met-delivery-value` | `$347.5K` / 5 project rows | No — omitted from the four panels |
| Receivables | Signal panel `met-receivables` + cash ageing ledgers | `$115.8K`; overdue INV-2041 present | Detail ledger, not a fifth tile |
| At-risk work | Operating watch `met-at-risk` | 2 projects (Meridian Wayfinding, Vantage Brand Ops) | No |
| Available capacity | Signal panel `met-capacity` + People section | `63 hours`; Avery Brooks over-allocated | Detail ledger, not a fifth tile |
| Client actions | Operating watch: clients waiting on the agency / agency waiting on clients | 4 actions; Kestrel / Northwind present | No |
| Approval queue | Operating watch `met-approvals` → `#decisions` | `3 open` (4 in dense) | Count only; full rows live in Decisions |
| All open decisions | Decisions waiting on you | 3 rows populated / 4 dense; most urgent first | No |
| Business impact (hero) | Centred hero | `$356,000` populated / `$360,200` dense | Canonical; Ask Flow uses the same snapshot |
| What happened / why / recommended / owner / deadline / exposure / evidence / approve | Expanded `<details>` decision row | Meridian, Avery, Northwind (+ Halcyon in dense) | No |
| Delivery risks | Operating watch | 2 seeded risks | Same two jobs also appear under At-risk work (residual overlap) |
| Overdue / upcoming receivables | Cash ledgers | INV-2041 and due/scheduled rows | No |
| Active projects + status + value | Cash · Active delivery rows | 5 projects with contract values | No |
| Team capacity / over-allocated / available / assignments | People and capacity | Avery over-allocated; available hours as `%` + hours, not minutes | Notes can repeat free-hours (residual) |
| Business activity history | Business activity pulse + six-month chart (locked) | Pulse from `data.pulse`; chart from history module | Chart is first-viewport; pulse is compact weekly |
| Recent operations | Chronological timeline | Actor, summary, timestamp, evidence label, record href | No |

Internal units: Playwright asserts the populated body does not match `\bbps\b`,
`minor units`, or `\bminutes\b`. Money uses `formatMoney` / `formatMoneyCompact`;
hours use `formatHours`; utilisation uses `formatBps` as `%`.

## Default-route verification

`apps/web/src/app/[workspace]/admin/page.tsx`:

- Northstar demo + no query → `MissionControlCanvas`
- `variant=canvas-v2` → same canvas
- `variant=legacy` without `qa=1` → still canvas
- `variant=legacy` and `qa=1` → `MissionControlScreen` (V1)

Playwright `e2e/mission-control-parity.spec.ts` “V2 is the default and legacy
V1 is QA-only”:

- Default: `.flow-canvas` count 1, `.flow-mc-bar` count 0
- `?variant=canvas-v2`: `.flow-canvas` count 1
- `?variant=legacy`: `.flow-canvas` count 1
- `?variant=legacy&qa=1`: `.flow-mc` count 1, heading “3 decisions need you”

Foundation journey: Explore Northstar demo lands on `/northstar-creative/admin`
with hero `$356,000` and no `variant` query.

## Data reconciliation

Shared selectors: `apps/web/src/lib/mission-control/selectors.ts`. Ask Flow
reads `ask-snapshot.ts` from the same view `use-mission-control` exposes after
resolutions.

| Check | Result |
|---|---|
| Seed metric IDs === `ALL_METRIC_IDS` (8, unique) | Vitest |
| Weighted pipeline = sum of opportunity weighted values | `40487500` minor → `$404.9K` |
| Active delivery = sum of project contract values | `34750000` minor |
| Receivables = sum of open invoices | `11575000` minor → `$115.8K` |
| Headline exposure = sum of each open decision’s largest money impact | `$356,000` / 3 decisions; dense `$360,200` / 4 |
| Hero and Ask Flow exposure / decision count | Dense Ask Flow “Why is $360,200 exposed?” answers with `4 open` |
| Six states | populated, dense, empty, error, restricted, loading — Playwright |
| Dense fourth decision | Halcyon Energy `$4,200` over budget, not a Meridian clone |
| Client-action `waitingOn` | Kestrel / Meridian / Lumen = `client`; Northwind redlines = `agency` |
| Pulse plotted values | `data.pulse` pipeline/delivery minors; legend `$369K → $404.9K` |

Demo states are not hardcoded in canvas components. `?state=` drives
`missionViewForState`.

## Test results

### Unit (2026-09-03)

```
npx pnpm --filter @flow/web exec -- vitest run src/lib/mission-control src/lib/ask-flow
```

**7 files, 103 passed.**

### Playwright (2026-09-03)

From `apps/web`, env from `.env.local`:

| Spec | Result |
|---|---|
| `e2e/mission-control-parity.spec.ts` (excluding capture, then capture separately) | **8 passed** + **1 capture passed** |
| `e2e/mission-control-foundation.spec.ts` | **5 passed** |

Combined non-capture run: **13 passed** in 14.2s.

Covered:

- V2 default / V1 QA-only
- Every V1 metric id present once; seed strings on the page
- Six states; Ask Flow follows dense snapshot
- Decision expand, evidence link focus, Approve visible
- No horizontal overflow at 1440, 1024, 768, 430, 375, 320
- Light/dark hero, panels, queue Y within 2px; `queueTop >= 900`
- Ask Flow questions: approvals, at-risk, overdue, overallocated, operations, waiting/questionnaire
- Axe wcag2a/aa + wcag21a/aa: no serious or critical
- Foundation: demo entry, sections present, keyboard skip + dock, states persist in `sessionStorage`, reload keeps dense until `?state=populated`

**Not re-run:** `e2e/mission-control-canvas.spec.ts`, dark-desktop, and mobile lock specs. Those write locked screenshot directories (`mc-02r-reset-01`, MC-02R-02, MC-02R-03A). Existing locks remain the visual contract for the first viewport.

## Accessibility results

| Surface | Tool | Result |
|---|---|---|
| Populated V2 canvas, 1440 light | axe-core Playwright | no serious/critical |
| 1440 and 375 × light and dark | foundation axe loop | no serious/critical |
| Decision evidence | keyboard | link focused after expand |
| Ask Flow composer | `aria-label` “Ask anything about your business” | focusable |

Residual (not axe): 375 header wordmarks collide (SHELL / MC-02R-03A). Dock
still overlaps locked panel captions. Expanded-row `scrollIntoView` is in
code; full-page PNG of the expanded state still composites the fixed dock.

## Screenshot paths

All under `docs/verification/mission-control/screenshots/mc-02r-04/`.

| File | Pixels | What it shows |
|---|---|---|
| `01-default-1440-light.png` | 1440×900 | Default V2 first viewport, light |
| `01b-full-1440-light.png` | 1440×5634 | Full page, populated, collapsed decisions |
| `02-default-1440-dark.png` | 1440×900 | First viewport, dark |
| `02b-full-1440-dark.png` | 1440×6326 | Full page, dark (first decision expanded in this stitch) |
| `03-375-light.png` | 375×812 | Mobile first viewport, **populated** `$356,000` / 3 after sessionStorage clear |
| `03b-375-light-full.png` | 375×7598 | Mobile full page, populated |
| `04-375-dark.png` | 375×812 | Mobile first viewport, dark, populated |
| `04b-375-dark-full.png` | 375×7598 | Mobile full page, dark |
| `05-expanded-decision.png` | 1440×6326 | Full page, first decision open (fixed dock composites mid-page) |
| `05-ask-flow-dock-expanded.png` | 1440×900 | Ask Flow answering “What needs my approval?” |
| `06-dense-1440-light.png` | 1440×6380 | Dense state, 4 decisions, Halcyon `$4,200` |
| `07-1024-light.png` | 1024×5706 | Mid-width editorial stack |
| `08-768-light.png` | 768×5736 | Tablet stack |
| `09-430-light.png` | 430×7488 | Large mobile |
| `10-320-light.png` | 320×7594 | Small mobile; overflow spec asserts no horizontal scroll |
| `01-mission-control-1440-light.png` (and `01b`/`02`/`02b`/`03`/`03b`/`04`/`04b` aliases) | same family | Foundation recapture of the same routes |
| `06-state-empty.png` / `07-state-error.png` / `08-state-restricted.png` / `09-state-dense.png` | — | Six-state stills from foundation |

Independent critic report (full-page composition, not first viewport only):

`docs/quality/critic-reports/ui-critic-2026-09-03-mc-02r-04-v2-parity.md`

Critic scored an earlier 375 pair that still carried dense sessionStorage
(`$360,200` / 4). Those files were recaptured with `?state=populated` after
the review. Header collision on 375 remains. Primary 1440 light full page
(`01b`) was the critic’s 8/10 editorial page and was not redesigned.

### Locked first-viewport files (do not recapture)

| Gate | File |
|---|---|
| MC-02R-RESET-01 light desktop | `docs/verification/mission-control/screenshots/mc-02r-reset-01/final-1440x900.png` |
| MC-02R-02 dark desktop | existing dark lock under `screenshots/mc-02r-02/` |
| MC-02R-03A mobile first viewport | existing mobile lock; PARTIAL for header collision |

## Independent UI critic

Reviewed 2026-09-03 against full-page composition.

| Screen | Score |
|---|---|
| 1440 light first viewport (locked) | 8 |
| **1440 light full page (`01b`) — primary** | **8** |
| 1440 dark first viewport | 7 |
| 1440 dark full page | 7 |
| 375 light first viewport | 6 (header + then-dense seed) |
| 375 light full page | 7 |
| Expanded decision (`05`) | 6 |
| Dense full page | 8 |
| **Average** | **7.1** |

Meets 8/10 gate: **no** (primary collapsed desktop is 8; required companions
and two chrome defects are not). Product-owner approval: **pending**.

The below-fold transfer is editorial: hairline rows, no card grid, no
permanent right sidebar, no eight-tile wall, no blue dashboard bars on the
canvas body.

## Known residual issues

1. **Ask Flow dock on expanded recommendation in `05`.** Full-page capture of
   `position: fixed` paints the dock over RECOMMENDED copy. Runtime
   `scrollIntoView({ block: "center" })` is wired on expand. Do not shrink
   the locked first viewport to solve this.
2. **375 header collision** (`Flow` / `Mission Control` / `Northstar`).
   Inherited from SHELL-01 / MC-02R-03A. Out of Mission Control freeze
   unless product reopens the shell.
3. **Dark header Quick Create is saturated blue**, not workspace green.
   Shell chrome, not canvas. Second accent on dark frames.
4. Operating watch lists the same two jobs under Delivery risk and At-risk
   work (related records, not cloned tiles).
5. People notes can repeat free hours (`4 hours free this week · 4h free`).
6. Locked six-month chart caption still says “3 decisions opened” in dense.
7. Locked panel captions remain clipped by the dock (`$689K unwe`,
   `ned this week`). Inherited RESET-01 overlap.
8. Dedicated stills of Ask Flow answering every section exist as e2e
   assertions; only one viewport capture (`05-ask-flow-dock-expanded.png`)
   is filed.
9. Dark “default” full page (`02b`) was captured with the first decision
   expanded, so it is not a theme twin of collapsed `01b`.

## Freeze

Mission Control V2 layout is **frozen**:

- Centred business-impact hero
- Six-month operating-history chart
- Four signal panels
- Fixed centred Ask Flow dock
- Editorial sections A–F below `y = 900`
- Light and dark canvas tokens already shipped

Do not reopen composition. Do not delete V1 until a later job explicitly
retires `?variant=legacy&qa=1`. Do not begin another product screen.

## Stop

**MC-02R-04: PARTIAL**

Mission Control work stops here.
