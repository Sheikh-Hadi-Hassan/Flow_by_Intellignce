# MC-02R-RESET-01 — Mission Control canvas-v2 visual fidelity

**MC-02R-RESET-01 LIGHT DESKTOP: PASS**

Light-desktop visual direction is approved. MC-02R-RESET-01C closed the remaining usability items without recomposing the screen. Dark mode and mobile were not started.

The P0 class-name CSS regression is accepted and was not reopened. Canvas markup still uses `flow-canvas-head`, `flow-canvas-field`, `flow-canvas-dock`, and `flow-canvas-panel`.

## How to see it

```
/northstar-creative/admin?variant=canvas-v2
```

Default Mission Control at `/northstar-creative/admin` is unchanged.

## Verdicts

| Category | Verdict | Evidence |
|----|----|----|
| Functionality | PASS | 6 Playwright specs: class-coverage, typeface, first-viewport layout, Ask Flow chips / voice / palette / expand-up / evidence / Escape / minimise / focus restore / fullscreen, default route, comparison plate |
| Visual design | PASS | Product-owner approved the light-desktop direction. Critic **8/10** on the 1440×900 capture. 01C reserved panel-band space so the dock no longer covers titles or values |
| Browser verification | PASS | Recaptured 1440×900, `deviceScaleFactor: 1`, `fullPage: false`, network idle, `document.fonts.ready`, Next.js indicator hidden, PNG IHDR 1440×900. Decisions not in frame. Dock still overlaps the panel band. Protected metric boxes do not intersect the dock (16px shadow pad) |
| Data integrity | PASS | No seed or history change in 01C |
| Accessibility | PARTIAL | Escape, minimise, focus trap, focus restore, and keyboard-reachable evidence receipt verified in Playwright. No axe pass |
| Security | N/A | No backend, database, API, or authorisation change |
| Performance | N/A | Preview-gated prototype, not the default route |

Light desktop is PASS. Dark mode, mobile, and an axe pass remain out of scope.

## Three visual-fidelity passes

### Pass 1 — Composition

- Header is 48px, 11px word nav, labels kept (Mission Control / Clients / Pipeline / Delivery / Team).
- Hero `$356,000` stays centred (critic: glyph centre x=722 vs 720).
- Operating-history plot is 292px; the analytical canvas fills the 1440×900 first viewport.
- Decision queue is a sibling below `.flow-canvas__viewport`. Playwright asserts `queueTop >= 900`.
- Ask Flow is `bottom: -112px` on the stage. Playwright asserts the dock starts at or below the month axis and overlaps the panel band by more than 48px.

### Pass 2 — Data visual character

- One hairline per history day. Zero/unchanged days use `.flow-canvas-field__bar--quiet` (2px). Activity days are stronger. Trend path is unchanged and still scaled from real values.
- Annotation demoted from a green `$356K exposed` headline to “3 decisions opened / Waiting on you today”. The only green on the plot is the terminal mark.
- Supporting panels: compact weekly pipeline bars, restrained forecast line, greyscale receivables ageing (`$27,750` / `$58,500` / `$29,500`, matching the `$27,750 overdue` caption), semicircular capacity gauge at 80%.
- Colour scan of the first viewport: red=0, orange=0, blue=0. Workspace green is the only saturated accent (dock tile, two deltas, chart terminal).

### Pass 3 — Command dock and polish

- Medium-grey housing, tight chips with circular `→`, near-black 52px command row, full-height green intelligence tile, centred “Ask anything or search”, outlined voice and actions, suggestions visible at rest.
- Playwright exercises chip → evidence receipt, voice `aria-pressed`, action-palette toggle, upward expansion, and fullscreen (`flow-canvas-dock--full`).
- Space Grotesk is loaded through `next/font` as `--font-flow-sans` and asserted on `.flow-canvas` and the hero. The canvas does not fall back to `ui-sans-serif`.

## MC-02R-RESET-01C — approved-direction usability

Did not redesign or recompose. Three targeted fixes:

1. **Ask Flow occlusion.** `.flow-canvas-panels` keeps a 132px reserved top band (whitespace + divider). The dock still sinks `112px` into that band, so it stays embedded rather than sitting in a disconnected gap. Titles, values, deltas, ageing amounts and panel charts start below the dock, including its shadow. Playwright inflates the dock hit box by 16px and asserts no protected metric intersects it.
2. **Expanded context labels.** Tools render as `Pipeline · Delivery · Receivables · Capacity`.
3. **Expanded interaction.** Escape and the minimise control close the panel and return focus to the originating chip or prompt. Tab is trapped in the dock. The evidence receipt link is keyboard-focusable. Fullscreen is `position: fixed; top: 72px; bottom: 8px` so the panel cannot exceed the viewport.

## Screenshot discipline

Capture: Playwright `chromium-light`, viewport 1440×900, `deviceScaleFactor: 1`, `fullPage: false`. Before capture: `waitUntil: "networkidle"`, `document.fonts.ready`, Next.js portal/badge hidden via injected CSS.

| File | Size | What it shows |
|----|----|----|
| `docs/verification/mission-control/screenshots/mc-02r-reset-01/final-1440x900.png` | **1440×900** | First viewport. Metrics readable under the dock. Decisions not in frame. Next.js indicator absent |
| `docs/verification/mission-control/screenshots/mc-02r-reset-01/ask-flow-resting.png` | 560×102 | Dock at rest, chips visible |
| `docs/verification/mission-control/screenshots/mc-02r-reset-01/ask-flow-expanded.png` | 584×693 | Answer, `ANSWERED FROM` / Founder approval queue, `Pipeline · Delivery · Receivables · Capacity`, dock still attached |
| `docs/verification/mission-control/screenshots/mc-02r-reset-01/reference-comparison.png` | 1800×1400 | Ledgerix + dock reference beside the captures above |

PNG IHDR for the primary capture is asserted in Playwright as `{ width: 1440, height: 900 }`.

## Independent UI critic

Report: `docs/quality/critic-reports/ui-critic-2026-09-03-mission-control-canvas-reset.md`

| Screen | Score |
|----|----|
| Canvas-v2 first viewport | **8/10** |
| Ask Flow resting | 8/10 |
| Ask Flow expanded | 8/10 |
| Average | 8.0/10 |

Previous critical defects (dock on the month axis; second `$356K exposed`; expanded crop identical to resting) are all **FIXED**. Product-owner visual approval for light desktop: **recorded in this gate**.

## Tests run

| Command | Result |
|----|----|
| `npx playwright test e2e/mission-control-canvas.spec.ts` (from `apps/web`) | **6 passed** (01C recapture) |
| `npx vitest run src/lib/mission-control/history.test.ts src/lib/mission-control/seed.test.ts` | **51 passed** (unchanged in 01C) |

Class-coverage spec: every rendered `flow-canvas*` (and resting `flow-ask*` / `skip-link` / `sr-only`) root has a matching stylesheet rule. Missing set is empty.

Layout spec also asserts: no Next overlay, no horizontal overflow, nav is flex/grid, plot ≤ 340px, header ≤ 52px, dock clears the month axis, dock overlaps the panel band by more than 48px, protected metric titles/values/deltas/charts/ageing amounts do not intersect the dock (16px shadow pad), hero/dock centred, annotation is not `$356K`.

Ask Flow spec also asserts: tools read `Pipeline · Delivery · Receivables · Capacity`; expanded panel stays below the header and inside 900px; Escape and Collapse restore focus to the originating control; Tab from the last dock control wraps to fullscreen; evidence link `Founder approval queue` is focusable; fullscreen panel stays inside the 1440×900 viewport.

## Files touched in 01C

- `apps/web/src/styles/mission-canvas.css` — reserved panel-band padding; expanded tool separators; fullscreen panel pinned in the viewport
- `apps/web/src/components/mission/canvas/AskFlowCommandSurface.tsx` — focus trap, origin restore, Escape/minimise, viewport-capped panel
- `apps/web/e2e/mission-control-canvas.spec.ts` — occlusion, labels, keyboard, recapture

No backend, Supabase, migration, or seed-value change. Component class names were not rewritten.

## Stop

**MC-02R-RESET-01 LIGHT DESKTOP: PASS**

Do not start dark mode or mobile from this gate.
