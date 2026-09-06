# UI Critic Report

Reviewed: 2026-09-03. Scope: **MC-02R-04** Mission Control V2 default at
`/northstar-creative/admin`. The first viewport (hero, six-month chart, four
signal panels, Ask Flow dock) is a **locked** Ledgerix-inspired canvas and was
not scored for recomposition. This review scores **full-page composition**:
the locked canvas plus the below-fold editorial transfer (Decisions waiting
on you, Operating watch, Cash and commitments, People and capacity, Business
activity, Recent operations).

Method: pixel inspection of the eight named captures (not code). Confirmed
PNG dimensions with `sips`. Crops at header, dock/panel seam, fold, each
editorial section, expanded recommendation, dense fourth row, and the 375
header. Hue scan every 2nd–3rd pixel. Pairwise first-viewport MSE against
the matching full-page stitch. macOS Vision OCR of first viewports, section
crops, the expanded overlay band, and the 375 header. Live `localhost:3000`
was not used.

Artifacts (all under `docs/verification/mission-control/screenshots/mc-02r-04/`):

| File | Pixels | Role |
|---|---|---|
| `01-default-1440-light.png` | **1440×900** | First viewport, default populated |
| `01b-full-1440-light.png` | **1440×5634** | Full page, default populated (primary) |
| `02-default-1440-dark.png` | **1440×900** | First viewport, dark |
| `02b-full-1440-dark.png` | **1440×6326** | Full page, dark (first decision expanded) |
| `03-375-light.png` | **375×812** | Mobile first viewport (**dense** seed, not default 3-decision) |
| `03b-375-light-full.png` | **375×8852** | Mobile full page (same dense seed) |
| `05-expanded-decision.png` | **1440×6326** | Full page, light, first decision expanded |
| `06-dense-1440-light.png` | **1440×6380** | Full page, dense |

## Summary

Overall visual verdict: **PARTIAL**
Average score: **7.1/10**
Primary full-page (1440 light, `01b`): **8/10**
Meets the 8/10 gate: **no** (primary collapsed desktop page is 8; required
companion screens are not, and two critical defects remain)

The below-fold transfer is the right shape. Decisions, watch, cash, people,
activity, and operations read as one editorial document: hairline rows,
typographic hierarchy, right-aligned money, no card grid, no right sidebar,
no eight-tile wall, no blue dashboard bars. First-viewport MSE of `01` vs
`01b` is 0.25 — the locked canvas was not redesigned. Dense’s fourth row is
a real Halcyon Energy invoice (`$4,200`), not the V1 Meridian clone.

What blocks overall PASS is not a relapse into a generic dashboard. It is
chrome and overlay: the 375 header still collides, and the Ask Flow dock
sits on the expanded decision’s RECOMMENDED copy in `05`. Dark chrome adds a
saturated blue plus (`RGB 61, 109, 242`) beside workspace green. Product-owner
approval is not recorded.

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| First viewport (locked) | 1440×900 | light | **8** | Inherited: dock packs the panel footers (`$689K unwe`, `ned this week · team at 80%`); red bell dot; SaaS word nav. Canvas otherwise unchanged |
| **Full page (primary)** | 1440×5634 | light | **8** | Editorial transfer holds. Operating watch repeats the same two jobs under Delivery risk and At-risk work. Active delivery is filed under Cash and commitments. People notes duplicate hours (`4 hours free this week · 4h free`). Dock does not cover editorial rows in this from-top stitch |
| First viewport (locked) | 1440×900 | dark | **7** | Header create control is saturated blue `(61, 109, 242)` at x≈1198–1209, y≈15–52 — same disc that is workspace green `(22, 163, 74)` in light. Second accent on a green-only canvas. Panel footers still clipped |
| Full page | 1440×6326 | dark | **7** | First decision is expanded in this “default” capture (page height matches `05`, not collapsed `01b`). Expanded copy is complete because the dock stayed at y≈820. Blue plus remains. Editorial sections otherwise match light |
| First viewport | **375×812** | light | **6** | Header collision: `Flow` / `Mission Control` / `Northstar` overlap; OCR of the header crop reads `Norths` + `G` + `MC`. Capture is dense (`$360,200` / 4 decisions), not the default `$356,000` / 3. Chart caption still `3 decisions opened`. Dock covers the four-panel row; panels only appear after scroll |
| Full page | 375×8852 | light | **7** | Editorial stack is readable once past the dock: 4 distinct decisions, watch, cash, people. Same header collision on every frame. Same dense seed (`4 open`). No card grid |
| Expanded decision | 1440×6326 | light | **6** | Expand itself is editorial (WHAT HAPPENED / WHY IT MATTERS / stakes / Recommend / Approve–Revise–Reject–Open record). Ask Flow dock is composited over RECOMMENDED: OCR `Ask anything about your business` at the same band as `Approve at 38% and recover th` / `change order, which restores`. Green dock tile bbox y=1424–1478 |
| Dense full page | 1440×6380 | light | **8** | Four distinct rows; `4 open` matches hero `$360,200` / 4. Halcyon Energy is its own invoice, not Meridian body. Locked chart caption still says `3 decisions opened` |

## Requirement coverage (full-page composition)

| Criterion | Verdict | Evidence |
|---|---|---|
| First viewport not redesigned | MET | `01` vs first 900px of `01b`: mean channel delta 0.25, RMS 3.6. Hero `$356,000`, Apr–Sep, four hairline panels, dark dock |
| Editorial below-fold, not a card-grid dashboard | MET | `01b` OCR: list rows + hairlines. No equal-card wall, no permanent right sidebar, no eight tiles |
| Decisions waiting on you, expandable | MET, with overlay defect | Collapsed `01b`: three rows, `3 open`, `$124,000` / `$52,000` / `$180,000`. Expand in `05` / `02b` has narrative + actions. `05` dock occludes the recommendation |
| Operating watch / Cash / People / Activity / Operations present | MET | All five sections OCR’d on `01b`. Activity: `25 Aug`–`2 Sep`, `Weighted pipeline $369K → $404.9K`. Operations: timestamp + actor list |
| No dense card grids, blue bars, heavy borders, large shadows | MET on the body | Body is type + hairlines. Dock has a tight shadow (allowed). Header is separate chrome |
| No multiple accent colours | **FAIL on dark chrome** | Light saturated hue is green (+ 12 red bell pixels). Dark first viewport: green 1180 + **blue 325** + red 12. Blue cluster is the header plus disc |
| No internal units (bps, minutes, raw minor-unit money) | MET | Dollars as `$124,000` / `$404.9K` / `$2,480`. Time as hours and days. No `bps`, no minutes, no cent strings |
| No content occlusion | **FAIL** | (1) Locked canvas: dock clips panel footers (inherited). (2) `05`: dock covers expanded RECOMMENDED. (3) 375 header: wordmarks collide |
| No duplicate information | PARTIAL | Same two projects appear as Delivery risk and At-risk work. People lines repeat `4h free` / `12h free` after a prose hours clause. Northwind `$180K` in Decisions and Clients waiting — related, not a cloned tile |
| Dense state coherent | MET vs V1 | Fourth row OCR: `Halcyon Energy · Rebrand` / `A contractor invoice for Halcyon Energy is $4,200 over the approved budget` / `$4,200`. Not Meridian proposal body |
| Mobile usable | **FAIL chrome** | Header pile-up is the same class that held MC-02R-03A at 7. Below-fold editorial on `03b` is fine |

## Previous defects (V1 dense / overlay)

| # | Previous defect | Status | Evidence |
|---|---|---|---|
| Dense fourth card cloned Meridian body | **FIXED** in collapsed dense | `06` fourth row is Halcyon `$4,200` over budget, client `Halcyon Energy · Rebrand` |
| Dense headline 4 vs impact still 3 | **PARTIAL** | Hero and `4 open` match. Locked chart annotation still `3 decisions opened` on `06` and `03` |
| Expanded dock clipped signal-strip glyphs | n/a (V1 strip gone) | New overlay: dock on expanded RECOMMENDED in `05` |
| Restricted scopes in user copy | not in this set | No restricted capture was required |

## Critical defects (must fix)

1. **`05-expanded-decision.png` — Ask Flow dock occludes the expanded recommendation.**
   Green tile bbox y=1424–1478. Vision OCR of the overlay crop: placeholder
   `Ask anything about your business` on the same band as `RECOMMENDED` and
   the split sentence `Approve at 38% and recover th` … `change order, which
   restores`. Approve / Revise / Reject / Open record sit *below* the dock
   and remain readable. The advice the row exists to show does not. A
   from-top stitch (`02b`) keeps the dock at y≈820 and the same copy is
   whole — so this is the scrolled/fixed-dock state a person hits when the
   expanded row is in the viewport, not a missing section.

2. **`03-375-light.png` / `03b` — 375 header still collides.**
   Header crop y=0–80: hamburger, green brand disc, overlapping `Flow` /
   `Mission Control` / `Northstar Creative`, then search + green plus + bell
   + moon + `MC`. Vision OCR of that 80px band: `Norths`, `G`, `MC`. This is
   the same collision class that blocked MC-02R-03A. Hero / chart / dock
   were not the failure; the chrome sitting on them still is.

3. **Dark header create control is blue, not workspace green.**
   Light plus: `(22, 163, 74)` n=1140 at (1198, 15)–(1209, 52). Dark plus:
   `(61, 109, 242)` n=1140 at the same disc. Hue scan of `02-default-1440-dark.png`:
   blue=325, green=1180, red=12. The locked canvas is still green-only; the
   shell now introduces a second saturated accent on every dark frame.

## Residual issues (not critical)

- Locked panel footers remain clipped by the dock (`$689K unwe`,
  `ned this week`). Inherited; do not redesign the canvas to “fix” this
  unless product reopens the lock.
- `03` / `03b` are the **dense** seed (`$360,200`, `4 open`), not default
  populated. There is no 375 capture of the 3-decision default in this set.
- `02b` is expanded (6326px) while `01b` is collapsed (5634px). Dark “default”
  full page is not a theme translation of the light default stitch.
- Operating watch lists Meridian Wayfinding and Vantage Brand Ops twice
  (Delivery risk + At-risk work).
- Active delivery projects sit under Cash and commitments instead of their
  own section.
- People capacity notes tautologise (`4 hours free this week · 4h free`,
  `12 hours free … · 12h free`).
- Dense / 375 chart caption still `3 decisions opened` against a 4-decision
  hero. Allowed as locked-canvas leftover; it is still stale.
- Recent operations: `Capacity engine · Team capacity engine` and
  `Receivables · Receivables ledger` repeat the source twice.
- Dock right-hand control remains a microphone, not the Ledgerix info glyph
  (inherited, previously residual).

## Recommendations

1. Keep the dock from covering expanded-row copy: reserve bottom padding on
   the expanded body equal to dock height, or collapse the dock to a chip
   while a decision is expanded. Do not shrink the locked first viewport to
   solve this.
2. Reflow SHELL-01 at 375 so wordmark and utilities do not share one 80px
   band. Until that lands, Mission Control V2 cannot pass mobile.
3. Paint the dark create control with workspace green, or mute it to the
   same charcoal as search / bell. Blue is a second brand.
4. Stop filing Active delivery inside Cash. Give it its own editorial
   heading, or fold those rows into Operating watch once.
5. Drop the duplicated hours suffix and the second watch grouping of the
   same two jobs.

## Judgement

The V2 page-as-document works. Below the fold is not a card dashboard and
not a dump of V1 tiles. The locked Ledgerix first viewport is intact on
1440 light. That is why the primary full-page score is 8.

It is not a visual PASS. Expand, the 375 header, and the dark plus are
visible product defects on required screens. Unknown PO approval stays
PARTIAL even after those three are gone.

## Product-owner approval

Status: pending
