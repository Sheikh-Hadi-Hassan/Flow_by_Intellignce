# UI Critic Report

Reviewed: 2026-09-03. Scope: Mission Control `canvas-v2` reset
(MC-02R-RESET-01), light theme only, 1440×900 CSS viewport, 100% zoom,
deviceScaleFactor 1. Dark mode and mobile were not reviewed.

Method: pixel inspection of the supplied captures (not code). Confirmed PNG
dimensions with `sips`. Crops at header, hero, chart, axis/dock seam, and each
supporting panel. Resting vs expanded Ask Flow were compared by geometry, not
guesswork. Colour scan for competing accents and Next.js overlay. macOS Vision
OCR of the full 1440×900 frame, the axis band, and both Ask Flow crops.
Compared against Ledgerix dashboard and Ask Flow command-dock references.

Artifacts:

- `docs/verification/mission-control/screenshots/mc-02r-reset-01/final-1440x900.png` (**1440×900**)
- `docs/verification/mission-control/screenshots/mc-02r-reset-01/ask-flow-resting.png` (560×102)
- `docs/verification/mission-control/screenshots/mc-02r-reset-01/ask-flow-expanded.png` (584×547)
- `docs/verification/mission-control/screenshots/mc-02r-reset-01/reference-comparison.png` (1800×1400)
- `docs/product-design/references/mission-control/ledgerix-dashboard-reference.png`
- `docs/product-design/references/mission-control/ask-flow-command-dock-reference.png`

## Summary

Overall visual verdict: **PARTIAL**
Average score: **8.0/10**
Primary 1440×900 screen: **8/10** (meets the visual PASS threshold of 8)

The first viewport is an editorial canvas: a centred `$356,000`, a hairline
six-month field, four supporting instruments, a dark Ask Flow dock on the
panel band, and workspace green as the only saturated hue. Next.js overlay is
absent. Decisions are below the fold. Type reads as Space Grotesk, not
system-ui.

The three defects that held the previous review at 7 are gone. Axis labels
Apr–Sep are readable above the dock. The chart annotation is a compact
caption, not a second money headline. Expanded Ask Flow is a real 547px
surface with answer text and an evidence receipt. Product-owner approval is
not recorded, so this cannot be an overall visual PASS.

It is still not Ledgerix. The header is a five-link application bar. The
panel row is pinched under the dock. The right-hand dock control is a
microphone, not the reference info glyph. Those are remaining gaps, not
reasons to fail the first viewport.

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| Canvas-v2 first viewport | 1440×900 | light | **8** | Header remains word-nav SaaS chrome (allowed by product, still louder than Ledgerix); panel row packed into the last ~160px; dock shadow sits close to Jun/Jul; mic control instead of reference info glyph; green used on dock tile, two deltas, and the chart terminal |
| Ask Flow resting | 560×102 crop | dark dock | **8** | Right-hand control is a microphone, not the reference info glyph. Two-tier grey housing, arrow chips, centred placeholder, full-height green tile, and outlined squares otherwise match the dock reference |
| Ask Flow expanded | 584×547 crop | light card + dark dock | **8** | Real expanded state. “Try asking” repeats the question just answered. Evidence receipt is present but quiet. Not a fixture; not yet as considered as the first viewport |
| Side-by-side vs Ledgerix | 1800×1400 | — | n/a | Comparison plate only. Body composition is materially closer to Ledgerix than a card grid. Remaining tells: word nav, denser Ledgerix hairline field, dock glyph language |

## Previous critical defects

| # | Previous defect | Status | Evidence |
|---|---|---|---|
| 1 | Ask Flow chip tray covered the operating-history month axis (Apr–Sep) | **FIXED** | Month-label ink at y≈617–623, x-clusters 200 / 417 / 642 / 859 / 1083 / 1308. Chip tray housing begins y≈644 (gap ~21px). Dark command row y≈686–736, x≈494–991, over the panel band, not the plot floor. Vision OCR of the axis crop and the full 1440×900 frame both read Apr, May, Jun, Jul, Aug, Sep at confidence 1.00 |
| 2 | Chart annotation repeated “$356K exposed” in green against the hero `$356,000` | **FIXED** | Annotation OCR: “3 decisions opened” / “Waiting on you today”. No `$356K` / `$356,000` in the chart callout. Remaining green on the plot is a terminal dot at ≈(1324, 398), not a second money headline. Hero remains the only large figure: dark-glyph bbox x=559–885, centre 722 vs 720, cap-height ~74px |
| 3 | `ask-flow-expanded.png` was identical 560×102 to resting | **FIXED** | Resting 560×102. Expanded 584×547 (+24× +445). Mean RGB resting (53, 60, 56) vs expanded (206, 208, 208). OCR of expanded: answer paragraph, `ANSWERED FROM`, `Founder approval queue`, `3 decisions routed by workspace policy · Today, 08:12 · high trust` |

## Requirement coverage (1440×900)

| Criterion | Verdict | Evidence |
|---|---|---|
| Editorial data-canvas, not a card-grid dashboard | MET | No equal-card wall. Hero, one chart, four hairline-separated panels. Background near-white (corner means ~247–250) |
| Hero `$356,000` centred | MET | OCR `$356,000` + “Business impact across 3 decisions requiring you today”. Dark-glyph centre x=722 vs canvas 720 |
| Header quieter/shorter; word nav allowed | MET, with leftover chrome | “Mission Control · Today, 08:12” is quiet. Five word links remain (product-allowed). Search, four line icons, grey `MC` avatar. Header band y=0–70 has 0 green / 0 red / 0 orange samples |
| Daily hairline field; quiet zeros; stronger activity; honest trend; not a default library look | MET | 1–2px bars: 25 at y=540, 42 at y=560, 49 at y=575. Black stepped trend Apr→Sep. Right y-axis `$1M` / `$500K` / `0`. Legend: Delivered daily / Trend. Impact tab is black weight + underline, not green type |
| Four designed panels | MET | Weighted Pipeline `$404.9K` + rising grey bars, last bar black, “8 open opportunities · $689K unweighted”. Forecast `$312.4K` + line, “Committed plus weighted close inside 90 days”. Receivables `$115.8K` + greyscale ageing Overdue `$27,750` / Due soon `$58,500` / Scheduled `$29,500`. Capacity `63 hours` + 80% semicircle |
| Ask Flow: grey housing, tight chips with arrows, near-black row, full-height green tile, centred prompt, outlined controls, suggestions at rest | MET | Chip tray y≈644–684; command row y≈686–736, width ~491px (~34% of 1440). Chips: “Why is $356K exposed?” / “What needs my approval?” with circular arrows. Placeholder centred. Mic + grid outlined. Suggestions visible at rest |
| No red+orange above the fold; workspace green the only dominant accent | MET as hue | Colour scan (every 2nd px): red=0, orange=0, blue=0. Green clusters: chart terminal ≈(1322, 398); dock tile x=440–520, y=680–760; two panel deltas around y=720 |
| No Next.js development indicator | MET | All four 80px corners mean RGB ≈(247–248, 248, 250). No near-black corner pixels |
| Decisions waiting on you not visible in the 1440×900 frame | MET | Full-frame OCR has no decision-queue cards. Floor of the frame is the four-panel row. “Waiting on you today” appears only as the chart caption, not as a list |
| Space Grotesk / geometric sans, not system-ui | MET | Geometric sans; uppercase letterspaced micro-labels (`SIX-MONTH OPERATING HISTORY`, `WEIGHTED PIPELINE`, `AVAILABLE CAPACITY`) |
| Side-by-side materially closer to Ledgerix than a card grid | MET | Same skeleton: centred hero, hairline field, four instruments, dark dock over the panel band. Ledgerix still quieter in chrome and denser in the daily field |

## Critical defects (must fix)

None.

## Recommendations

1. **Recede the header further.** Word nav is allowed. Five text links plus
   search plus four icons plus an avatar is still a SaaS bar. Ledgerix uses a
   compact icon cluster and named identity. The grey `MC` disc is better than
   the previous green one; it is still a product avatar, not a person.

2. **Give the panel row air.** Titles, figures, mini-charts, and footers live
   in roughly y=748–900. The dock is correctly on this band, so the two centre
   instruments sit in its shadow. Lift the canvas or shorten the dock so
   Forecast and Receivables titles stay as readable as Weighted Pipeline and
   Available Capacity.

3. **A few more pixels between Jun/Jul and the chip tray.** All six months
   OCR at 1.00. Jun and Jul read with a slightly shorter box than Apr/Sep.
   They are not covered. They are close.

4. **Match dock glyph language to the reference, or commit to Flow’s.**
   Chips now end in circular arrows (the previous sparkle is gone). The
   right-hand pair is still microphone + grid. The reference is info + grid.
   Structure is close enough that this is the remaining tell.

5. **Do not repeat the answered question under “Try asking”.** The expanded
   surface already answered “Why is $356K exposed?”. Offering the same card
   again reads like a stub, not a next step.

6. **Keep green scarce.** Hue discipline is correct — no red, no orange, no
   blue. Green still appears four times in the first viewport (tile, two
   deltas, terminal dot). That is acceptable. It should not grow.

## Judgement

The previous review failed this screen because the dock sat on the plot, the
chart competed with the hero, and “expanded” was a duplicate crop. Those
three problems are not in these pixels.

What remains is the difference between a competent Ledgerix-family canvas and
the reference itself: quieter chrome, more air on the floor, and a dock that
does not have to be explained as a close cousin. That is 8, not 9.

Visual PASS on the primary 1440×900 screen is available on score. Overall
visual PASS is not, because product-owner approval is not recorded.

## Product-owner approval

Status: pending
