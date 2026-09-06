# UI Critic Report

Reviewed: 2026-09-03. Scope: **MC-02R-03A** 375×812 light mobile approval
closure. Primary gate is the exact **375×812** first viewport (not
full-page, `deviceScaleFactor` 1). Ask Flow resting / typing / submitted /
counter and the six UI states were scored as supporting screens.

Dark mode and extra widths were not scored. Locked 1440 light and dark
geometry were not opened and were not reopened.

Method: pixel inspection of the eleven named PNGs (not code). Confirmed
dimensions with PIL. Vision OCR of every frame. Crops at header, hero, tabs,
chart annotation, axis/dock seam, suggestion chip, and each state body. Hue
scan every second pixel. Pairwise MSE across the populated family. Live
`localhost:3000` was not used in this review.

Artifacts (all **375×812**, RGB PNG):

- `docs/verification/mission-control/screenshots/mc-02r-03/ask-flow-resting-375.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/ask-flow-typing-375.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/ask-flow-submitted-375.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/ask-flow-counter-375.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/state-populated-375.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/state-dense-375.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/light-375x812.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/state-empty-375.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/state-loading-375.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/state-error-375.png`
- `docs/verification/mission-control/screenshots/mc-02r-03/state-restricted-375.png`

`light-375x812.png`, `state-populated-375.png`, and
`ask-flow-resting-375.png` are the same bitmap (MSE 0.0). They are one
screen recorded three times.

## Summary

Overall visual verdict: **PARTIAL**
Average score: **7.6/10**
Primary 375×812 first viewport: **7/10** (does **not** meet the visual PASS
threshold of 8)

The approved 375 stack is still there: centred `$356,000`, one six-month
hairline chart, fixed Ask Flow dock. The three MC-02R-03 blockers named in
the prior mobile critic are gone from these pixels. Ask Flow now matches the
product contract (no chips at rest, one centred complete suggestion while
typing, full-screen answer on submit). Dense hero is `$360,200` / 4 and the
dock no longer ships leftover `$356K` chips. Chart caption `3 decisions
opened` is present and is allowed. `DEMO STATES` is not in any frame. Error
and restricted headlines start at x=18, not x=2. Dock is on every state.

What keeps the first viewport at 7 is the global header. On every 375 frame
the SHELL-01 utility row is a pile-up: overlapping disks, the green brand
tile crushed between search and plus (green ink only x=78–99), and
desktop wordmark type (`Flow` / `Mission Control` / `northstar`) readable
through the cluster (Vision 1.00 on fragments `rtl.` at (128, 36) and
`ont.` at (221, 38)). That is the same class of collision that failed
earlier mobile Mission Control — clipped word chrome on a 375 bezel. Hero,
chart, and dock were not redesigned. The chrome sitting on them was.

Product-owner approval is not recorded. Header collision is a critical
defect. Those two facts block overall visual PASS even though the named
Ask Flow / dense / switcher contract is met.

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| First viewport (populated / light / resting) | **375×812** | light | **7** | Header disks overlap; wordmark type shows through the icon cluster. Hero `$356,000` / 3, chart, and dock still read as the locked composition |
| Ask Flow resting | **375×812** | light | **7** | Same bitmap as the first viewport. Dock placeholder only — no suggestion chips |
| Ask Flow typing | **375×812** | light | **8** | One centred chip `Why is $356,000 exposed?` (ink bbox x=34–364, centre 199 vs 187.5). Input shows `exposed` with a green focus rim. Header collision remains but is not the subject of this frame |
| Ask Flow submitted | **375×812** | light | **8** | Full-screen answer card. `$356,000` / `3 open decisions` match the populated hero. Evidence receipt present. No `Try asking` leftovers. No switcher |
| Ask Flow counter | **375×812** | light | **8** | Full-screen counter-question (`Which matters more: protecting the deadline or protecting margin?`). Trade-off pills. Dock empty (follow-up *may* suggest; this frame is the answered state) |
| Populated | **375×812** | light | **7** | Identical to first viewport |
| Dense | **375×812** | light | **7** | Hero `$360,200` / `4 decisions`. Dock identical to populated (MSE 0.0 on y=690–812) — no leftover `$356K` chips. Caption `3 decisions opened` present and allowed. Same header collision |
| Empty | **375×812** | light | **8** | Editorial `Nothing needs you yet`. No fake metrics. Dock present, no chips, no switcher |
| Loading | **375×812** | light | **8** | Skeleton stand-in for hero + chart. Dock present. Floor y=400–740 has no `DEMO STATES` tray |
| Error | **375×812** | light | **8** | Product copy + Retry / Open pipeline. Headline first ink **x=18**. Dock present. No switcher |
| Restricted | **375×812** | light | **8** | Role copy (`Taylor Kim (Copywriter)`), no internal scopes. Headline first ink **x=18**. Dock present. No switcher |

Primary screens below 8: the populated first viewport (and its two identical
aliases). Score bar for visual PASS is **not** met.

## Product-contract coverage (this gate only)

| Criterion | Verdict | Evidence |
|---|---|---|
| Do not redesign approved 375 composition (hero, chart, dock) | MET | Hero `$356,000` ink x=99–278, centre 188.5 vs 187.5. Tabs Impact / Revenue / Cash / Delivery / Capacity. Months Apr–Sep at y=674–676. Dock housing y=742–793. Month-to-dock gap ~66px. Not the old equal-card dashboard |
| Empty / focused input: no suggested questions | MET | Resting / populated / light / empty / loading / error / restricted / dense: OCR of the floor is `Ask anything or search` only. No chip row above the dock |
| Typing: centred contextual suggestions | MET | Typing frame: chip `Why is $356,000 exposed?` at y=700, x-centre 199. Complete phrase — not the old `expo…` / `ap…` pair |
| Submit: full-screen answer | MET | Submitted card from x≈24, y≈100; answer + `ANSWERED FROM` + entity pills + Edit / Regenerate / Copy. Dock drops to y=726–777 |
| Follow-up may suggest again | MET as allowed | Counter frame is a full-screen answer with an empty dock. Contract permits a later typing suggest; this PNG does not have to show it |
| Hero exposure and decision count match Ask Flow | MET on populated | Hero `$356,000` / `3 decisions`. Typing chip and submitted answer use the same `$356,000` / 3. Dense typing/submitted was not in the evidence set |
| Dense is `$360,200` / 4 in Ask Flow, not leftover `$356K` / 3 | MET on the supplied dense frame | Hero OCR `$360,200` and `4 decisions`. Dense dock bytes equal populated dock — placeholder only, no `$356K` chip. History caption `3 decisions opened` is allowed |
| Chart annotation `3 decisions opened` allowed on dense | MET | Dense OCR 1.00 at (189, 494): `3 decisions opened` / `Waiting on you` / `today`. Not scored as a leftover |
| Demo-state switcher must not appear | MET | No `DEMO` / `Demo states` / `Populated` switcher labels in any OCR dump. Loading / error / restricted floors y=480–720: 0 dark chip-tray samples (was the prior fixture band) |
| Locked 1440 light/dark out of scope | MET | Those files were not opened |

## Prior MC-02R-03 defects (re-checked)

| Prior critical | Status in these pixels |
|---|---|
| `DEMO STATES` tray on loading / error / restricted | **Gone.** No switcher OCR. Dock is back on those three frames (placeholder at y=762) |
| Dense chips / copy still `$356K` / 3 while hero is `$360,200` / 4 | **Gone from Ask Flow.** Dense dock has no money chips. Hero is `$360,200` / 4. Chart caption remains `3 decisions opened` and is now in-contract |
| Error / restricted headlines at x=2 | **Gone.** First headline ink at **x=18** on both frames |

## Critical defects (must fix)

1. **The 375 global header is a collision, not a compact bar.** On every
   named frame the utility disks overlap (search into the green brand tile
   into plus). Green brand ink is only 22px wide (x=78–99). Desktop
   wordmark / title type remains readable through the gaps — Vision 1.00
   `rtl.` (128, 36) and `ont.` (221, 38); contrast crop shows `ow` / `ssi`
   / `rth` / `nt` (Flow / Mission Control / northstar). This sits in the
   first 72px of the primary journey. Text collisions are a reject. Do not
   fix it by touching hero, chart, or dock.

No second critical from the named 03A contract. The Ask Flow behaviour,
dense leftover, and demo switcher items are met on these PNGs.

## Recommendations

1. **Collapse the header at 375** to hamburger + one wordmark + an overflow
   cluster so type and disks stop occupying the same pixels. That is a
   chrome fix, not a canvas redesign.

2. **Do not chase Capacity (ink ends at x=372) or the quiet `$1M` tick**
   in this gate. Both were already true of the locked 375 composition.

3. **Dense typing / submitted were not captured.** The resting dense frame
   is enough to show the leftover `$356K` chips are gone. A dense typing
   frame would make the `$360,200` Ask Flow match visible; it is not
   required to clear the named leftover.

4. **Do not start mobile dark, extra widths, or MC-03** to chase the
   header. The approved hero / chart / dock stack does not need another
   pass.

## Judgement

MC-02R-03A did the work it named. Resting has no chips. Typing shows one
complete, centred suggestion that matches the hero. Submit is a full-screen
answer. Dense no longer lies in the dock. The demo switcher is off the
product floor. Error and restricted are padded and keep the dock.

That is not enough for visual PASS. The first viewport an investor would
open still has colliding header chrome on top of an otherwise locked
composition. Primary score is 7, not 8. Product-owner approval is pending.

Visual PASS on the primary 375×812 first viewport is **not** available on
score. Overall visual PASS is not.

## Product-owner approval

Status: pending
