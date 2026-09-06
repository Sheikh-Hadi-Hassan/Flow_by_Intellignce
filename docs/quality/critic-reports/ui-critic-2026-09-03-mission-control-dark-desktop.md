# UI Critic Report

Reviewed: 2026-09-03. Scope: Mission Control `canvas-v2` dark desktop
translation (MC-02R-02). Light 1440×900 is **locked** and was not scored for
recomposition. Dark 1440×900 first viewport is the primary visual PASS gate.
Ask Flow resting, expanded, and chart tooltip were scored as supporting
screens. Composition was checked against the locked light capture only to
confirm translation, not redesign.

Method: pixel inspection of the supplied captures (not code). Confirmed PNG
dimensions with `sips`. Crops at header, hero, chart, axis/dock seam, y-axis,
annotation, and each supporting panel. Hue scan every second pixel. Dock vs
title geometry. Resting vs expanded Ask Flow compared by size and OCR, not
guesswork. macOS Vision OCR of the full 1440×900 frame, inverted full frame,
axis, panels, y-axis, dock seam, and all Ask Flow / tooltip crops. Light
regression checked by sample-wise RGB against the locked file.

Artifacts:

- `docs/verification/mission-control/screenshots/mc-02r-02/dark-1440x900.png` (**1440×900**)
- `docs/verification/mission-control/screenshots/mc-02r-02/ask-flow-resting-dark.png` (560×102)
- `docs/verification/mission-control/screenshots/mc-02r-02/ask-flow-expanded-dark.png` (584×693)
- `docs/verification/mission-control/screenshots/mc-02r-02/chart-tooltip-dark.png` (181×85)
- `docs/verification/mission-control/screenshots/mc-02r-02/light-dark-comparison.png` (1800×1400)
- `docs/verification/mission-control/screenshots/mc-02r-02/light-regression-1440x900.png` (1440×900)
- Locked light: `docs/verification/mission-control/screenshots/mc-02r-reset-01/final-1440x900.png` (**1440×900**)

## Summary

Overall visual verdict: **PARTIAL**
Average score: **8.0/10**
Primary dark 1440×900 screen: **8/10** (meets the visual PASS threshold of 8)

The dark first viewport is the locked light canvas with values inverted, not a
new layout. Canvas is warm near-black RGB ≈ (20, 20, 18–19), not `#000`, not
blue. Surfaces that need to lift (Ask Flow housing, tooltip, expanded cards)
are charcoal. Primary type is warm off-white ≈ (244, 241, 234). Saturated hue
scan found green only — no red, orange, blue, or cyan. Workspace green
RGB ≈ (22, 163, 74) appears on the dock tile, two panel deltas, and the chart
terminal. Next.js overlay is absent. Decision-queue cards are not in the
1440×900 frame.

Light was not redesigned: `light-regression-1440x900.png` is pixel-identical
to the locked file (0 changed samples, MSE 0). Product-owner approval for this
dark translation is not recorded, so this cannot be an overall visual PASS.

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| Canvas-v2 first viewport | **1440×900** | dark | **8** | Inherited SaaS word-nav; panel row still packed under the dock; `$1M` is 10px and full-frame OCR reads `81M`; Apr missed on full-frame OCR (present on invert, ink is there); mic control instead of reference info glyph; green used on tile, two deltas, and terminal |
| Ask Flow resting | 560×102 crop | dark | **8** | Right-hand control is still a microphone. Housing, chips, near-black command row, and full-height green tile otherwise match the locked dock |
| Ask Flow expanded | 584×693 crop | dark | **8** | Real expanded state, not a flat black rectangle. `Try asking` repeats the question just answered. Context header wraps (`8 opportunities • 5` / `projects • 8 people`). A 2px green hairline sits at the right of the command row (x≈480–481), a second green besides the tile |
| Chart tooltip | 181×85 crop | dark | **8** | Compact, readable, hairline charcoal plate. Crop-only; not a full-screen judgement |
| Light regression | 1440×900 | light | n/a | Pixel-identical to locked light. Composition was not redesigned |
| Light/dark comparison | 1800×1400 | — | n/a | Same skeleton on both sides: header, centred hero, hairline field, dock on the panel band, four instruments |

## Requirement coverage (dark 1440×900)

| Criterion | Verdict | Evidence |
|---|---|---|
| Judged as 1440×900 | MET | `sips`: pixelWidth 1440, pixelHeight 900 |
| Near-black warm-neutral canvas, not pure black, not blue-tinted | MET | Corner / mid-canvas means (20, 20, 18–19). R−B = +1 to +2. Pure `#000` samples: 0. Hue scan: blue = 0 |
| Elevated charcoal surfaces | MET | Ask Flow housing (39, 39, 38) / (58, 58, 56) vs canvas 20. Tooltip fill (38, 38, 35). Expanded answer card mean (41.6, 41.4, 39.2). Four floor panels stay on-canvas with hairlines — same as locked light, not a dark-mode card grid |
| Warm off-white primary, controlled grey secondary | MET | Hero `$356,000` ink (244, 241, 234), bbox x=552–892 y=102–197, centre x=719.5 vs 720. Subtitle OCR 1.00. Nav inactive ≈ (69, 67, 64). Month labels ≈ (175–182, 171–179, 163–169) |
| Subtle hairlines, no bright borders, no glow, no gradients, one workspace green | MET as hue | Red/orange/blue/cyan/purple = 0. Green clusters: terminal (1322–1326, 372–376); tile (448–499, 661–712); two deltas y=804–812 x=214–640. Tile bloom 0. Canvas vertical samples identical (20, 20, 19) at y=50 / 850 |
| Chart: off-white trend, grey daily hairlines, quiet zeros visible, accent terminal, readable labels | MET, with quiet y-axis | Trend ink (244, 241, 234) through the field. Daily bars at floor y≈575 from x≈115; Apr mid-height y=500–520 has no lifted bars (zeros). Terminal green at (1324, 374). Months: inverted OCR Apr–Sep all 1.00 at y≈592, x-clusters 199 / 414 / 640 / 858 / 1082 / 1306. `$500K` OCR 1.00 on invert. `$1M` ink luma mean 110 vs canvas 20; full-frame OCR `81M` at (1306, 303). `0` ink at ≈(1323–1326, 578–579) |
| Ask Flow: housing distinct, near-black command row, full-height green tile, legible chips | MET | Housing x=440–999 y=620–720. Command row (17, 17, 17). Tile 52×52 at x=448–499 y=661–712 — identical origin to locked light. Chip OCR 1.00: `Why is $356K exposed?` / `What needs my approval?`. Placeholder centred `Ask anything or search` |
| Four supporting panels readable without extra semantic colours | MET | Titles at y=764, all OCR 1.00: WEIGHTED PIPELINE / FORECAST REVENUE / RECEIVABLES / AVAILABLE CAPACITY. Values `$404.9K`, `$312.4K`, `$115.8K`, `63 hours`. Receivables ageing is greyscale, not red. Forecast title ink under the dock luma mean 112.5, max 181 |
| Dock must not cover metric titles/values | MET | Housing bottom y=720; tile bottom y=712; titles y=764 (gap 44px from housing). Values y=789–813. All four titles and values OCR at 1.00 on the full frame and on the centre-under-dock crop |
| Decisions waiting on you must not appear in the 1440×900 frame | MET | Full-frame OCR has no decision-queue cards. Floor of the frame is the four-panel row. `Waiting on you today` appears only as the chart caption (same as locked light), not as a list |
| Composition matches locked light (header, hero, chart, dock, four panels) | MET | Green tile identical x/y on light and dark. Month x-clusters match. Light regression MSE 0. Comparison plate is the same skeleton, values inverted |

## Critical defects (must fix)

None.

## Recommendations

These are leftover polish. None of them is a reason to fail the dark 1440×900.
Do not recompose the locked light desktop to address them.

1. **Give `$1M` / `$500K` / `0` one more step of value.** They are present and
   a human can read them on the y-axis crop. Full-frame OCR still collapses
   `$1M` to `81M` at 10px. Dark type at that size is the first thing that will
   look unfinished on a projector.

2. **Remove the 2px green hairline on the right of the expanded command row.**
   Resting 1440×900 has green only on the tile (plus the chart terminal and two
   deltas). Expanded crop has a second green stroke at x≈480–481, y=621–672.
   That is one accent too many.

3. **Do not repeat the answered question under `Try asking`.** The expanded
   surface already answered `Why is $356K exposed?`. Offering the same card
   again is the same stub the light review already named. Dark did not invent
   it; dark also did not fix it.

4. **Keep the inherited gaps inherited.** Word-nav chrome, the pinched panel
   row, and the microphone control are locked light. They are still visible in
   dark. They are not a dark-translation failure.

## Judgement

This is a value translation of a locked 8, not a redesign. The palette does
the job: warm near-black canvas, charcoal housing, off-white money, one green.
The dock sits on the panel band and leaves the four titles and values readable.
The chart still has a stepped off-white trend, grey daily hairlines, a quiet
zero floor, and a green terminal. Expanded Ask Flow is a 693px surface with an
answer paragraph and an evidence receipt, not a duplicate resting crop.

What keeps it at 8 rather than 9 is the same family of leftovers the light
review already accepted, plus dark-specific quiet on the y-axis and a stray
green hairline in the expanded command row.

Visual PASS on the primary dark 1440×900 screen is available on score. Overall
visual PASS is not, because product-owner approval is not recorded.

## Product-owner approval

Status: pending
