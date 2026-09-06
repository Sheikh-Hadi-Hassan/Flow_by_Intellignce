# Mission Control MC-01 + MC-02 Verification

**Overall verdict: PARTIAL** — blocked only on product-owner visual approval (MC-07), which this milestone was explicitly instructed to stop for.

Date: 2026-09-02
Scope: MC-01 (isolated Northstar Mission Control seed) and MC-02 (Mission Control visual foundation).
Explicitly out of scope, and not done: MC-03 onward, design-guide changes, database or migration changes, new API connections, Questionnaire changes.

## Scope delivered

### MC-01 — seed and data contract

Deterministic, workspace-isolated seed with no backend reads. Restored across refresh from `sessionStorage` under `flow-mission-control-demo-v1`, and only active for the `northstar-creative` demo slug.

| Requirement | Count in seed |
|---|---|
| Active opportunities | 8 |
| Weighted pipeline and forecast | $404.9K weighted, $312.4K forecast |
| Active projects | 5 |
| Delivery risks | 2 (1 blocking, 1 elevated) |
| Founder decisions | 3 |
| Pending client actions | 4 |
| Invoices | 5 (2 overdue, 3 upcoming) |
| Team capacity | 8 people, 2 over-allocated |
| Activity events | 10 |
| Evidence references | attached to every AI claim |
| Ask Flow recommendations | 4 sourced suggestions |

Six states are reachable at `?state=<kind>`: `populated`, `empty`, `loading`, `error`, `restricted`, `dense`.

### MC-02 — visual foundation

| Requirement | Status |
|---|---|
| Instrument bar: mark, workspace, nav, search, Ask Flow, notifications, identity, theme, accent | Present |
| Dominant answer "3 decisions need you" with reason and combined impact | Present, $356,000 combined exposure |
| Full-width activity field, embedded labels, thin separators | Present |
| Pipeline / delivery / finance / capacity signals | Present, 8 signals |
| No wall of equal cards, no meaningless charts, no permanent sidebar | Held |
| AI dock: prompt, voice, context, tools, authority, expand-to-conversation | Present |

## Verdicts by mandatory category

| Category | Verdict | Evidence |
|---|---|---|
| Functionality | PASS | 5/5 Playwright tests; 23/23 unit tests; six states render and survive reload |
| Visual design | PARTIAL | Screenshots captured and independently critiqued; product-owner approval outstanding by instruction |
| Accessibility | PASS | axe: no serious/critical violations in light or dark at 375px and 1440px; keyboard reaches skip link, Ask Flow, accent picker, notifications |
| Security | PASS (N/A for changes) | No database, migration, API or auth change in this milestone; seed is client-side and demo-slug gated. Secret scan PASS |
| Data integrity | PASS | Seed is deterministic; roll-ups asserted against records in `seed.test.ts`; copy guard rejects internal units |
| Browser verification | PASS | 375px and 1440px, light and dark; console clean apart from expected unauthenticated 401s |
| Performance | N/A | No production build measured in this milestone; frontend-only, no new dependencies |

Overall stays PARTIAL because visual design is unapproved. That is the intended stopping point.

## Commands run

```
npx tsc --noEmit                                             exit 0
npx eslint src/components/mission src/lib/mission-control     exit 0
npx eslint e2e/mission-control-foundation.spec.ts             exit 0
npx vitest run src/lib/mission-control                        23 passed
npx playwright test e2e/mission-control-foundation.spec.ts    5 passed
npx playwright test <both specs> x3                           6 passed, 1 skipped, each run
node .cursor/hooks/secret-scan.mjs                            PASS
```

The skipped product-experience test requires authenticated credentials and is unrelated to this milestone.

Four pre-existing lint errors remain in `e2e/helpers/commercial-journey.ts`, `e2e/visual/visual-audit.spec.ts` and `e2e/visual/visual-regression.spec.ts`. They are untouched by this milestone.

## Defects found and fixed during verification

1. Operations timeline collided relative timestamps ("Yesterday 17:40") with the summary text at a fixed 72px column. Column now sizes to content and stacks below 640px.
2. Internal representations leaked into founder-facing copy: basis points ("3800 bps"), raw minor-unit money ("27,750.00") and raw minutes ("240 minutes"). All converted to percentages, formatted currency and hours. A unit test now walks every string in all six states and fails on any recurrence.
3. A capacity impact rendered its own label twice because it had neither a money nor a day value. Added `valueLabel` for quantities that are neither.
4. Empty state rendered the operational field's rules and gutters around no content, and labelled a guidance sentence "Business impact". The field now returns nothing when every block is empty, and the panel reads "Next step" when there is no monetary impact.
5. The expanded Ask Flow capture was full-page, which paints the fixed dock at the top of the document rather than where a founder sees it. That capture is now viewport-scoped.
6. Dark mode lacked foreground tokens for semantic and proof colors, failing contrast. Added dark overrides in `tokens.css`.
7. No route out of Mission Control at 375px because the bar navigation was hidden below 1024px. Navigation now wraps to its own scrollable row.
8. **Pre-existing product bug, found by cross-suite testing.** The Northstar demo session was seeded only in the home page link's `onClick`. A click landing before hydration followed the href without running the handler, so the visitor arrived at a dead end reading "Northstar is an isolated local demo. Start the demo from the home page." This reproduced in 2 of 3 combined runs. `WorkspaceGate` now seeds the demo on arrival for demo slugs and shows the loading placeholder during the gap, which fixes every demo route rather than one caller. The workaround retry loop in the mission-control spec was removed so the spec now genuinely exercises the fix; the combined suite then passed 3 of 3 and dropped from ~1.4 minutes to ~19 seconds.

## Screenshots

`docs/verification/mission-control/screenshots/`

| File | What it shows |
|---|---|
| `01-mission-control-1440-light.png` | Populated, 1440px, light |
| `02-mission-control-1440-dark.png` | Populated, 1440px, dark |
| `03-mission-control-375-light.png` | Populated, 375px, light |
| `04-mission-control-375-dark.png` | Populated, 375px, dark |
| `01b`–`04b` `-full.png` | Full-page equivalents of the four above |
| `05-ask-flow-dock-expanded.png` | AI dock expanded to conversation with sourced answer |
| `06-state-empty.png` | Empty state |
| `07-state-error.png` | Error state |
| `08-state-restricted.png` | Restricted-permission state |
| `09-state-dense.png` | Dense-data state |

Loading state is asserted in the spec but not captured as a still, since it is a transient skeleton.

In the full-page captures (`01b`–`04b` and `09`), the Ask Flow dock appears part-way down the image. That is a Playwright artifact: fixed-position elements paint at the scroll offset rather than pinned to the viewport. In the browser the dock stays pinned to the bottom, as the viewport captures show.

## Open before MC-07 closure

- Product-owner visual approval.
- Remaining MC-06 viewport matrix: 320px, 430px, 768px, 1024px, and the non-default accent colors. This milestone was scoped to 375px and 1440px only.
