# UI Critic Report

Reviewed: 2026-09-03. Scope: **AF-01R global Ask Flow dock chrome only**.
Mission Control composition was not scored. Assistant answer copy, evidence
pills, and version chrome were not scored. Locked Mission Control capture
sets were not recaptured.

Method: pixel inspection of the supplied AF-01R frames (not code). PNG
dimensions confirmed. Dock, tile, tool, housing, suggestion-gap, and glow
scans with PIL. Tight crops of the 1440 resting tile/tools, the 1440 typing
seam, and the 375 dark left edge.

Artifacts:

- `docs/verification/ask-flow/screenshots/af-01r/01-1440-light-resting.png` (**1440×900**, primary)
- `docs/verification/ask-flow/screenshots/af-01r/02-1440-light-focused.png`
- `docs/verification/ask-flow/screenshots/af-01r/03-1440-light-typing.png`
- `docs/verification/ask-flow/screenshots/af-01r/04-1440-light-submitted.png`
- `docs/verification/ask-flow/screenshots/af-01r/05-1440-dark-resting.png`
- `docs/verification/ask-flow/screenshots/af-01r/06-1440-dark-submitted.png`
- `docs/verification/ask-flow/screenshots/af-01r/07-375-light-resting.png` (**375×812**)
- `docs/verification/ask-flow/screenshots/af-01r/08-375-light-typing.png`
- `docs/verification/ask-flow/screenshots/af-01r/09-375-light-submitted.png`
- `docs/verification/ask-flow/screenshots/af-01r/10-375-dark-resting.png`

## Summary

Overall visual verdict: **PARTIAL**
Average score: **7.8/10**
Primary 1440 light resting dock: **8/10** (meets the visual PASS threshold of 8)

The 1440 resting dock is a specific object, not generic AI chrome. It is an
820×72 charcoal capsule, centred, with a 56px brand-blue tile and a black
spark, the specified placeholder, and two 44px outlined tools. There is no
blue glow, no neon rim, and no suggestion chips at rest. That primary frame
clears the score bar.

Overall stays PARTIAL because product-owner approval is not recorded, and
because `10-375-dark-resting.png` still carries a Next.js `N` badge on the
accent tile.

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| AF-01R 1440 light resting | 1440×900 | light | **8** | Primary. Spec geometry holds. Thin 6px charcoal rim reads as a black bar at a glance |
| AF-01R 1440 light focused | 1440×900 | light | **8** | Inset well ring only. No chips. Same chrome as resting |
| AF-01R 1440 light typing | 1440×900 | light | **8** | Three suggestion cards, 13px gap, not touching the dock |
| AF-01R 1440 light submitted | 1440×900 | light | **8** | Dock chrome unchanged. Panel sits 13px above. Answer body not scored |
| AF-01R 1440 dark resting | 1440×900 | dark | **8** | Housing rim (42,42,40) lifts off canvas (15,17,20). Same 820×72 / 56 / 44 |
| AF-01R 1440 dark submitted | 1440×900 | dark | **8** | Dock width/height hold. Panel out of scope |
| AF-01R 375 light resting | 375×812 | light | **8** | 358×64. Tile 47×48 (1px short of 48). Tools 40px. Placeholder wraps to two lines |
| AF-01R 375 light typing | 375×812 | light | **8** | Chips stacked above dock, 13px gap |
| AF-01R 375 light submitted | 375×812 | light | **8** | Fullscreen shell. Dock chrome still charcoal + 48px tile. Placeholder wraps. Answer body not scored |
| AF-01R 375 dark resting | 375×812 | dark | **6** | Next.js `N` badge overlaps the left edge of the accent tile |

Primary screens below 8: none. Score bar is met on the primary 1440 light
resting dock.

## Spec coverage (dock chrome)

| Criterion | Verdict | Evidence |
|---|---|---|
| 1440 dock 72 × ≤820 | **MET** | `01`: housing x=310–1129, y=812–883 → **820×72**. Bottom clearance 16. Centre delta 0.5px |
| 112 / 1fr / 112 grid | **MET** | Tile left offset 34 = pad 6 + (112−56)/2. Tile centre x=371.5 vs left-zone centre 372 |
| 56px accent tile, black spark | **MET** | Tile 56×56 at (344,820). Fill (26,86,219). Spark samples (17,17,17). 272 black pixels inside the tile |
| Placeholder “Ask anything about your business” | **MET** | Visible and centred on `01`, `02`, `04`, `05`, `07`, `10`. Replaced by “invoice” only while typing |
| Charcoal housing, 22 / 16 radii | **MET** | Housing rim (47,47,45) = `#2f2f2d`. Inner well (17,17,17). Top-edge inset 19px on y=812 (22px class with AA). Inner well height 60 |
| 44px controls | **MET** | Mic box x=1020–1063 (44), top/bottom borders y≈826 and y≈869. Second tool starts after an 8px gap |
| Suggestions above, not touching | **MET** | `03`: last chip white at y=798, dock top y=812, **gap 13**. `08`: last chip white at y=726, housing top y=740, **gap 13**. Resting frames have zero chips |
| 375 dock 64px, 48px tile, 40px controls | **NEAR** | `07`: housing **358×64** (spec 359×64, 1px). Tile **47×48**. Tools **40×40** (x=270–309, y=752–791). Dark `10` tile **46×48** |
| Reject generic AI / blue-glow chrome | **MET** | `01` exterior blue-glow pixels: **0**. Tile is a flat brand square, not a halo. Focused state is a 14%-white inset ring, not a glow |

## Pixel notes (primary `01`)

- Viewport 1440×900. Dock centred with 310px insets on both sides.
- Housing is a 6px charcoal pad around a black well. The two-tone is correct
  in the pixel values; from a normal viewing distance it still reads as one
  near-black capsule. That is why the primary score is 8, not 9.
- Tools are outlined rounded squares, not circular orbs and not glowing
  pills. Microphone and 2×2 grid sit in the right 112 zone.
- Focused `02` differs from `01` only in the well ring (sample at (332,818)
  is (51,51,51) vs resting (17,17,17)). No suggestion layer on focus.

## Critical defects (must fix)

1. **Next.js `N` on the 375 dark dock.** In `10-375-dark-resting.png` a
   circular black badge with a white `N` sits on the left edge of the blue
   accent tile (bright pixels bbox ≈ (18,724)–(89,778)). That is an
   engineering leftover on the object under review. It is absent from `07`
   (same crop, light). Re-apply the hide-dev-chrome style after the dark
   `goto`, or hide the badge in the product. Do not recapture locked Mission
   Control files to do this.

## Recommendations

- Fit the placeholder to one line on 375, or accept a shorter mobile string.
  `07` / `09` / `10` wrap “Ask anything about your business” onto two lines
  inside the 64px bar. Readable, but cramped next to the 48px tile.
- Dark 375 tile measured 46×48. Bring it back to a true 48 if the 2px loss
  is layout, not AA.
- The 6px charcoal rim is enough for 8. A slightly wider housing pad would
  make the 22px radius and the charcoal material easier to read against both
  themes.
- `04` / `06` / `09` still show `/northstar-creative/admin · Founder` in the
  panel head. Out of dock-chrome scope; still not a human context receipt.

## Product-owner approval

Status: pending
