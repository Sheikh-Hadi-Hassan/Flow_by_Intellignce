# UI Critic Report

Reviewed: 2026-09-03. Scope: Mission Control `canvas-v2` light mobile
translation (MC-02R-03). Primary gate is the exact **375×812** first
viewport. Ask Flow resting, expanded, and the six UI states were scored as
supporting screens.

Locked 1440 light (`mc-02r-reset-01/final-1440x900.png`, 1440×900) and locked
1440 dark (`mc-02r-02/dark-1440x900.png`, 1440×900) were opened only to
confirm they are not this milestone. They were not rescored and were not
reopened for recomposition.

Method: pixel inspection of the supplied captures (not code). Confirmed PNG
dimensions with `sips`. Crops at header, hero, tabs, Capacity, chart, y-axis,
tooltip, axis/dock seam, and each state body. Hue scan every second pixel.
macOS Vision OCR of all eight frames. Dock vs month-axis geometry. Resting vs
expanded Ask Flow compared by size and OCR, not guesswork. Live
`localhost:3000` was not available in this review, so below-fold ledger and
decision preview were not independently confirmed.

Artifacts:

- `docs/verification/mission-control/screenshots/mc-02r-03/light-375x812.png` (**375×812**, primary)
- `docs/verification/mission-control/screenshots/mc-02r-03/ask-flow-resting-375.png` (351×101 crop)
- `docs/verification/mission-control/screenshots/mc-02r-03/ask-flow-expanded-375.png` (**375×812**)
- `docs/verification/mission-control/screenshots/mc-02r-03/state-empty-375.png` (**375×812**)
- `docs/verification/mission-control/screenshots/mc-02r-03/state-loading-375.png` (**375×812**)
- `docs/verification/mission-control/screenshots/mc-02r-03/state-error-375.png` (**375×812**)
- `docs/verification/mission-control/screenshots/mc-02r-03/state-restricted-375.png` (**375×812**)
- `docs/verification/mission-control/screenshots/mc-02r-03/state-dense-375.png` (**375×812**)

## Summary

Overall visual verdict: **PARTIAL**
Average score: **6.6/10**
Primary 375×812 populated screen: **8/10** (meets the visual PASS threshold of 8)

The first viewport is a mobile translation of the approved canvas-v2 editorial
composition, not the old dense dashboard. Compact header is hamburger +
`Flow` wordmark + icon cluster — not a clipped word nav. Hero `$356,000` is
centred (bbox x=95–280, centre 187.5 vs 187.5). Six-month hairline field is
present and honest: Apr–Sep all OCR at 1.00, grey daily bars, black stepped
trend, green terminal, `$500K` readable. Fixed Ask Flow dock sits at
y=708–793 with a 53px gap above the month labels. Hue scan found green only
(workspace green RGB ≈ 22, 163, 74 on the 52×52 tile). No Next.js overlay.
No generic mobile browser chrome.

Product-owner approval is not recorded. Three supporting-state defects are
still embarrassing: a `DEMO STATES` fixture on loading / error / restricted,
error and restricted headlines at x=2, and a dense state whose chips and
chart caption still say `$356K` / three decisions while the hero says
`$360,200` / four. Those block overall visual PASS.

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| Canvas-v2 first viewport | **375×812** | light | **8** | `Capacity` ink ends at x=372 (2px from the edge; Vision reads `Capacitu`); suggestion chips ellipsized (`expo…` / `ap…`); `$1M` / `0` are quiet; chart caption wraps; ledger and decision preview are not in this frame |
| Ask Flow resting | 351×101 crop | dark dock | **7** | Both chips truncated mid-phrase. Housing, circular arrows, full-height green tile, centred placeholder, and outlined mic + grid otherwise match the desktop dock |
| Ask Flow expanded | **375×812** | light | **7** | Real full-screen surface with answer text and evidence receipt. `Try asking` repeats the question just answered. Category middots are unspaced. Third suggestion sits under the dock. Truncated chips persist on the floor |
| Empty | **375×812** | light | **8** | Editorial copy, no fake metrics. Dock present without suggestion chips. No `DEMO STATES` in frame |
| Loading | **375×812** | light | **5** | Skeleton is a fair canvas stand-in. Lower half is an empty field plus a `DEMO STATES` chip tray. Ask Flow dock is absent (0 dark dock samples y=600–812) |
| Error | **375×812** | light | **6** | Copy and CTAs are product-grade; no raw permission enums. Headline ink starts at x=2. `DEMO STATES` tray occupies the floor. No Ask Flow dock |
| Restricted | **375×812** | light | **6** | Role-specific copy (`Taylor Kim (Copywriter)`), `TK` avatar, no internal scopes. Headline ink starts at x=2. `DEMO STATES` tray at y≈720. No Ask Flow dock |
| Dense | **375×812** | light | **6** | Same editorial skeleton as populated. Hero `$360,200` / `4 decisions` vs chips `Why is $356K expo…` and caption `3 decisions opened` |

## Requirement coverage (375×812 populated)

| Criterion | Verdict | Evidence |
|---|---|---|
| Judged as exact 375×812 first viewport | MET | `sips`: pixelWidth 375, pixelHeight 812 |
| Compact header: wordmark + overflow nav, not clipped word nav | MET | Hamburger ink x=22–33, y=19–28. `Flow` letter ink x=57–83. Right cluster: bell, palette, moon, `MC` disc. No Pipeline / Delivery / Receivables word links. Full-frame OCR has no clipped nav words |
| Dominant `$356,000` | MET | OCR 1.00 at (95, 95) 185×53. Centre x=187.5 vs canvas 187.5. Subtitle: `Business impact across 3 decisions requiring you today` |
| Truthful six-month hairline chart | MET, with quiet y-axis | Months Apr–Sep all 1.00 at y=655, x-clusters 31 / 91 / 157 / 217 / 281 / 345. `$500K` OCR 1.00 at (325, 559). `$1M` ink at y=482–488, x=341–358 (Vision 0.30 `S111`). `0` is a few pixels at y=643–649. Black stepped trend; grey daily bars; green terminal ≈(358, 522) |
| Chart caption is not a second money headline | MET | OCR: `3 decisions opened` / `Waiting on you` / `today`. No `$356K` in the callout |
| Fixed Ask Flow command dock | MET | Dark housing x=20–354, y=708–793. Green tile 52×52 at (20, 742)–(71, 793), RGB (22, 163, 74). Placeholder `Ask anything or search` at (87, 761). Mic + grid outlined |
| Dock must not cover the hero or the month axis | MET | Hero y=95–148. Month labels y=655. Housing top y=708 (gap 53px). All six months OCR at 1.00 |
| Full-screen expanded Ask Flow | MET on the expanded capture | Resting 351×101. Expanded **375×812**. OCR: answer paragraph, `ANSWERED FROM`, `Founder approval queue`, `3 decisions routed by workspace policy · Today, 08:12 · high trust` |
| Supporting ledger and decision preview below the first viewport | UNVERIFIED | Primary frame OCR has no Weighted Pipeline / Forecast / Receivables / Capacity instruments and no decision-queue cards. That is correct for a first viewport. No scrolled 375 capture was supplied. Live page was not available |
| Six UI states captured at 375×812 | MET as a set | Empty, loading, error, restricted, dense, plus the populated primary. Loading / error / restricted are contaminated by the demo switcher |
| No red + orange above the fold; workspace green the only saturated hue | MET | Hue scan every 2nd px: green=622, red=0, orange=0, blue=0, cyan=0, purple=0 |
| No Next.js development indicator | MET | Corners near-white RGB ≈ (247, 248, 250). No near-black corner pixels except the dock itself |
| Editorial canvas, not the old dense dashboard | MET | No equal-card wall, no signal-strip CRUD, no clipped word nav. Hero + one chart + floor dock |

## Critical defects (must fix)

1. **`DEMO STATES` is in the product frame on three of six states.** Loading
   OCR at y=493: `DEMO STATES` / `Populated` / `Empty` / `Loading` / `Error` /
   `Restricted` / `Dense`. Error at y=579. Restricted at y=720. This is an
   engineering fixture. Populated and empty hide it behind the dock or omit
   it from the first viewport; loading, error, and restricted put it on the
   floor where an investor would see it.

2. **Dense state still ships stale counts.** Hero OCR `$360,200` and
   `Business impact across 4 decisions requiring you today`. The same frame
   still shows `Why is $356K expo…` and `3 decisions opened`. This is the
   same class of `densify()` leftover named on 2026-09-02 (headline four,
   everything else three). It is still here.

3. **Error and restricted headlines crash the left edge.** First dark
   headline ink is at **x=2** on both frames. Populated hero inset is x=99
   (centred); empty body inset is x=17. A display line 2px from the bezel
   reads as a missed mobile padding pass, not a designed state.

## Recommendations

1. **Remove or gate the demo switcher** so loading, error, and restricted
   can be captured as product. Those three screens also lose the Ask Flow
   dock; empty keeps it. Pick one rule and keep it.

2. **Drive dense chips and the chart caption from the same impact figure
   as the hero.** If the hero is `$360,200` across four decisions, the dock
   and the annotation have to say that.

3. **Give error and restricted the same ~15–16px content inset** the
   populated canvas already uses.

4. **Stop ellipsizing both chips into nonsense.** `Why is $356K expo…` and
   `What needs my ap…` are the only suggestions on a 351px dock. One full
   phrase, or two shorter ones, would read as intended. Truncation with an
   ellipsis is not the same as the old clipped word nav, but it is the
   loudest leftover on an otherwise competent floor.

5. **Give `Capacity` a sliver more room, or a scroll/fade affordance.**
   Ink ends at x=372. A human can read the word on a crop. Vision reads
   `Capacitu`. That is the first tab that will look unfinished on a 375
   device.

6. **Do not repeat the answered question under `Try asking`.** Named on
   both locked desktops. Mobile did not invent it and did not fix it. The
   third card (`Why is the Meridian proposal below our margin floor?`) is
   also under the dock.

7. **Space the expanded category middots** (`Pipeline · Delivery ·
   Receivables · Capacity`). The context line above them already does this;
   the category row does not.

8. **Do not start mobile dark, and do not start MC-03, to chase these.**
   The primary 375×812 is an 8. The blockers are fixture, stale dense copy,
   and state padding.

## Judgement

The previous mobile Mission Control (MC-01/MC-02, 2026-09-02) failed the
375 frame because word nav clipped mid-word and the dock shed its tools.
Those two problems are not in these pixels.

What is here is the locked canvas-v2 idea at phone width: one number, one
honest chart, one dark command dock. That is why the primary screen is an
8, not a 7.

What keeps the milestone at PARTIAL is not the first viewport. It is the
demo switcher on three states, a dense frame that disagrees with itself,
and two state headlines sitting on the bezel. Product-owner approval is
also pending.

Visual PASS on the primary 375×812 populated screen is available on score.
Overall visual PASS is not.

## Product-owner approval

Status: pending
