# MC-02R-01 — Mission Control editorial data-canvas prototype

**Status: PARTIAL — awaiting product-owner visual approval.**

Functionality, browser verification and regression safety are PASS at the one
viewport in scope. Visual design is explicitly unverified: the milestone exists
to obtain that approval, and the reference image was never received in the
working session, so the composition was built from the written brief alone.
Accessibility, security, performance and data integrity are out of scope for a
preview-gated prototype and are recorded as such below.

## How to see it

```
/northstar-creative/admin?variant=canvas-v2
```

The default route `/northstar-creative/admin` is unchanged. The variant is
gated to the isolated Northstar demo workspace, so it cannot render in a real
workspace before approval — covered by a test.

## Verdicts

| Category | Verdict | Evidence |
|----|----|----|
| Functionality | PASS | 7 Playwright specs; 5 chart modes switch and report distinct relationships |
| Browser verification | PASS | 1440px light, 100% zoom, console clean, no horizontal overflow |
| Data integrity | PASS | 13 reconciliation tests in `outlook.test.ts`; every plotted value traced to a seed record |
| Regression safety | PASS | 112 unit tests, existing Mission Control and product-experience e2e all pass |
| Visual design | **UNVERIFIED** | No reference image available; requires product-owner review |
| Accessibility | PARTIAL | Keyboard reach and labelled chart points verified; no axe run at this gate |
| Security | N/A | No backend, database, API or authorisation change |
| Performance | N/A | Preview-gated prototype, not on the default route |

## Files changed

**New**

- `apps/web/src/lib/mission-control/outlook.ts` — derived chart series
- `apps/web/src/lib/mission-control/outlook.test.ts` — reconciliation tests
- `apps/web/src/components/mission/canvas/MissionControlCanvas.tsx`
- `apps/web/src/components/mission/canvas/CanvasHeader.tsx`
- `apps/web/src/components/mission/canvas/BusinessImpactHero.tsx`
- `apps/web/src/components/mission/canvas/OperatingOutlookChart.tsx`
- `apps/web/src/components/mission/canvas/SignalLedger.tsx`
- `apps/web/src/components/mission/canvas/AskFlowCommandSurface.tsx`
- `apps/web/src/components/mission/canvas/DecisionQueuePreview.tsx`
- `apps/web/src/styles/mission-canvas.css`
- `apps/web/e2e/mission-control-canvas.spec.ts`

**Modified**

- `apps/web/src/app/[workspace]/admin/page.tsx` — variant branch only
- `apps/web/src/components/mission/InstrumentBar.tsx` — exported `AccentPicker`
  and `NotificationBell` so the canvas header reuses them instead of copying
- `apps/web/src/app/globals.css` — one stylesheet import

No backend, Supabase, migration or authoritative calculation was touched.

## Data reused, not duplicated

The canvas reads the same MC-01 contract through the same
`useMissionControl()` hook as the default screen, so the two views cannot
disagree about the business.

| Surface | Source |
|----|----|
| Hero value | `data.headline.impactAmount` |
| Decision count | `data.decisions.length` |
| Signal ledger | `data.metrics` ids `met-weighted-pipeline`, `met-forecast`, `met-receivables`, `met-capacity` |
| Chart | `data.pulse`, `data.metrics`, `data.invoices`, `data.projects`, `data.risks`, `data.capacity`, `data.decisions` |
| Ask Flow | `data.askFlow` — existing suggestions, authority state and evidence |
| Queue preview | `data.decisions[0]` |

## Derived values and formulas

All five series share one zero-based axis, so a bar twice the height is twice
the value. No series is normalised to its own min and max.

| Mode | Bars | Line | Annotation |
|----|----|----|----|
| Impact | `pulse[].deliveryValue` (protected) | `pulse[].pipelineValue` (expected) | Decision count and total exposure |
| Revenue | `pulse[].pipelineValue` | `met-forecast` held flat as target | Amount above the forecast line |
| Cash | Invoice amount, overdue first | Running sum of all invoices | Overdue count and total |
| Delivery | `project.contractValue` | Same value when the project carries a risk, else 0 | The blocking risk's impact |
| Capacity | `capacity[].allocatedMinutes` | `capacity[].availableMinutes` | People over capacity, and by how much |

Exposure is the sum of each decision's largest money impact —
the same formula the headline uses, asserted equal in test.

Chart geometry applies 22% headroom above the tallest value so the annotation
has room. This raises the top of the axis only; the axis still starts at zero
and heights stay proportional.

## Tests run

| Command | Result |
|----|----|
| `npx tsc --noEmit` | clean |
| `npx eslint src/components/mission src/lib/mission-control src/app` | clean |
| `npx vitest run` | 112 passed, 22 files |
| `npx playwright test e2e/mission-control-canvas.spec.ts` | 7 passed |
| `npx playwright test e2e/mission-control-foundation.spec.ts e2e/product-experience-integration.spec.ts` | 6 passed, 1 skipped |

The skipped test is pre-existing and needs Supabase credentials.

What the canvas specs assert: hero reads `$356,000` with its supporting label;
page context is subordinate; Impact is the default mode; the plot occupies
260–340px; exactly four ledger signals; exactly one decision row; no horizontal
overflow; all five modes switch and each states its own relationship; chart
points take keyboard focus and announce both values; Ask Flow opens, focuses,
and answers with a visible source; the default route still renders
"3 decisions need you" and contains no canvas markup; and the variant does not
render in a non-demo workspace.

## Screenshots

`docs/verification/mission-control/screenshots/mc-02r-01/`

1. `01-canvas-1440-first-viewport.png`
2. `02-hero-and-chart.png`
3. `03-ask-flow-collapsed.png`
4. `04-ask-flow-expanded.png`
5. `05-current-default-for-comparison.png`

## Defects found and fixed during verification

1. The Ask Flow bar covered the chart's axis labels. The drawing now stops
   short of the plot floor so the labels sit clear above the bar.
2. The chart tooltip rendered 19px past the sheet edge and covered the data
   point it described. It now flips to the opposite side past the midpoint.
3. The tooltip was shown permanently, occluding three bars. Annotation and
   tooltip are now separate: the annotation is always visible and compact, the
   tooltip appears on hover and keyboard focus only.
4. The annotation was struck through by the forecast line. Added axis headroom.
5. The expanded Ask Flow panel grew upward and buried the hero number and the
   whole chart. The bar now holds its position and the panel opens downward.
6. The hero label orphaned the word "today" onto its own line.

## Known differences from the brief

- **The reference image was never received.** The composition follows the
  written brief (principles 1–12 and sections A–H) only. This is the main
  reason visual design is UNVERIFIED rather than PASS.
- **Header navigation stayed as words.** The brief asked for compact icon
  controls "where the meaning remains understandable"; icons for "Pipeline"
  and "Delivery" would not be. Navigation is instead set quietly at secondary
  weight so it does not read as a row of equally prominent links. Search, Ask
  Flow, notifications and theme are icons.
- **The command surface overlaps the chart's lower edge rather than its
  plotted area.** A deeper overlap would cover the axis labels. Worth a
  decision at review: keep the labels, or drop them for a deeper overlap.
- **The Impact line is nearly flat**, because weighted pipeline genuinely moves
  only +12.4% across the seeded week. The readable relationship is the gap
  between expected and protected value, not the slope. Not corrected, because
  exaggerating it would misstate the business.
- **The decision queue sits fully below the fold** at 1440×900 rather than
  peeking into the first viewport.

## Deferred deliberately

Dark mode; all viewports other than 1440px; replacing the default route;
axe accessibility pass; the remaining four signals (active delivery, at-risk
work, client actions, approval queue), which stay reachable through the chart
modes; the full decision queue; MC-02R-02.

## Stop

Awaiting visual approval before any further work on this composition.
