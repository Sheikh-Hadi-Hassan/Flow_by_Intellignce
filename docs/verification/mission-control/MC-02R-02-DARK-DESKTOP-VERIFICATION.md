# MC-02R-02 — Dark desktop translation

**MC-02R-02 DARK DESKTOP: PASS** against the stated acceptance list.

Light desktop (MC-02R-RESET-01) remains locked. This milestone is colour only: no change to light composition, spacing, typography, chart/dock geometry, data, interactions, the default route, or mobile.

## How to see it

```
/northstar-creative/admin?variant=canvas-v2
```

Toggle the header sun/moon control, or persist `flow-theme-v1=dark` in localStorage. Default Mission Control is unchanged.

## Verdicts

| Category | Verdict | Evidence |
|----|----|----|
| Functionality | PASS | 5 Playwright specs: dark first viewport, Ask Flow + tooltip + contrast samples, axe, theme persist + light geometry lock, comparison plate |
| Visual design | PASS on score | Independent critic **8/10** on the dark 1440×900; no critical defects. Product-owner approval for the dark translation is not separately recorded |
| Browser verification | PASS | Dark PNG **1440×900**, `deviceScaleFactor: 1`, not full-page. Decisions below the fold. Dock does not cover metric titles/values. No Next.js overlay |
| Accessibility | PASS | axe on `.flow-canvas` in dark: no serious or critical violations. Sampled contrast ≥ 4.5:1 for hero, muted label, microlabels, axis, chips, prompt, evidence link |
| Data integrity | PASS | No seed, history, or calculation change |
| Security | N/A | No backend, API, or auth change |
| Performance | N/A | Preview-gated prototype |

Stated acceptance: critic ≥ 8/10, no serious a11y violations, exact 1440×900, decisions below fold, dock covers no metrics, no light flash on dark load, light layout unchanged — all met.

## What changed

Dark tokens are scoped to `[data-theme="dark"] .flow-canvas` in `mission-canvas.css`. The light `.flow-canvas` block was not edited.

- Canvas paper `#141413` (warm near-black, not `#000`, not blue)
- Elevated charcoal housing `#3a3a38` vs near-black command row `#111111`
- Warm off-white primary `#f4f1ea`, secondary `#c4c0b6`
- Chart trend inherits primary (off-white); daily hairlines and quiet zeros use restrained primary mixes; terminal mark stays workspace accent
- Tooltip and annotation use an elevated charcoal plate
- Expanded panel, suggestion cards, and evidence receipts use charcoal surfaces, not a flat black rectangle
- Workspace accent (`--color-brand`) unchanged; blue brand-surface tokens are remixed so they cannot tint the canvas

## Theme behaviour

- Manual toggle: header “Switch to dark theme” / “Switch to light theme”
- Persist: `flow-theme-v1` in localStorage; blocking `PREFERENCE_INIT_SCRIPT` sets `data-theme` before paint
- Playwright sampled `.flow-canvas` background across the first 90 animation frames after a dark load: no near-white samples
- After toggle + reload, `data-theme` and `localStorage` remain `dark`
- Light regression capture is pixel-identical to the locked RESET-01 file (critic: 0 changed samples, MSE 0)
- Plot height, header height, and dock top match between light and dark within 2px

## Screenshots

`docs/verification/mission-control/screenshots/mc-02r-02/`

| File | Size |
|----|----|
| `dark-1440x900.png` | **1440×900** |
| `ask-flow-resting-dark.png` | 560×102 |
| `ask-flow-expanded-dark.png` | 584×693 |
| `chart-tooltip-dark.png` | 181×85 |
| `light-regression-1440x900.png` | 1440×900 |
| `light-dark-comparison.png` | 1800×1400 |

Locked light file was not overwritten.

## Independent UI critic

Report: `docs/quality/critic-reports/ui-critic-2026-09-03-mission-control-dark-desktop.md`

| Screen | Score |
|----|----|
| Dark first viewport | **8/10** |
| Ask Flow resting | 8/10 |
| Ask Flow expanded | 8/10 |
| Chart tooltip | 8/10 |
| Average | 8.0/10 |

Critical defects: **none**. Light composition confirmed translated, not redesigned.

## Tests run

| Command | Result |
|----|----|
| `npx playwright test e2e/mission-control-canvas-dark.spec.ts` | **5 passed** |
| `npx vitest run src/lib/mission-control/history.test.ts src/lib/mission-control/seed.test.ts` | **51 passed** |

The locked light RESET-01 Playwright spec was not re-run, so those approved screenshots were not recaptured.

## Files

- `apps/web/src/styles/mission-canvas.css` — `[data-theme="dark"] .flow-canvas` colour translation only
- `apps/web/e2e/mission-control-canvas-dark.spec.ts` — dark captures, axe, contrast, persist, light regression

No component class names, layout CSS, data, or interactions were changed.

## Stop

Dark desktop verification is complete. Do not start the 375px mobile composition from this gate.
