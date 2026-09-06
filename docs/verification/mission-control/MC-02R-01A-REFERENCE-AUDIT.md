# MC-02R-01A — Reference alignment audit

Audit only. No implementation code was changed in this job.

**Headline: 3 of 15 dimensions aligned, 7 partially aligned, 5 not aligned.**
The composition skeleton is right; the visual character is not. Five of the six
worst gaps sit in the Ask Flow dock, and the single highest-leverage fix is
colour restraint.

## Sources

| Role | Path |
|----|----|
| Reference — dashboard | `docs/product-design/references/mission-control/ledgerix-dashboard-reference.png` (752×564 native) |
| Reference — command dock | `docs/product-design/references/mission-control/ask-flow-command-dock-reference.png` (1024×227 native) |
| Implementation | `docs/verification/mission-control/screenshots/mc-02r-01/01-canvas-1440-first-viewport.png` (1440×900) |
| Side-by-side | `docs/verification/mission-control/screenshots/mc-02r-01/reference-comparison.png` |

The dashboard reference was supplied as PNG, not WEBP. It is stored under the
requested name with a `.png` extension; `sips` on this machine does not encode
WEBP. This is a filename difference only.

## Screenshot identity — verified

The concern was justified in principle, so this was checked directly rather
than assumed. A fresh capture was driven against the variant URL and the DOM
inspected at the moment of capture:

| Check | Result |
|----|----|
| Requested URL | `http://localhost:3000/northstar-creative/admin?variant=canvas-v2` |
| Resolved URL after load | identical — no redirect |
| Hero value in DOM | `$356,000` |
| canvas-v2 markers | `.flow-canvas` 1, `.flow-canvas-hero__value` 1, `.flow-canvas-mode` 5, `.flow-canvas-chart__plot` 1, `.flow-canvas-signal` 4 |
| Default-screen markers | `.flow-mc-bar` 0, `.flow-mc-signal` 0, `.flow-mc-dock` 0 |
| Same page loaded without the query | `.flow-canvas` 0, `.flow-mc-bar` 1 |
| `data-theme` | `light` on both routes |

The two screens' markers are mutually exclusive, and the default route carries
none of the canvas markers. **The audited screenshot is canvas-v2.**

Note on the earlier external screenshot: neither route renders dark in these
captures — both report `data-theme="light"`. Any dark Mission Control image
came from a different session or a manually toggled theme, not from this
variant's default state.

---

## Comparisons

Severity is the size of the visual gap, not the effort to close it.

### 1. Overall composition — partially aligned

- **Reference:** two-row header; a three-column hero band (statement label and
  series legend at left, hero centred, period selector at right); a full-bleed
  chart with a range scrubber; a four-panel secondary row; a dark dock floating
  over the lower content.
- **Current:** one-row header; hero left with the mode selector right; a
  contained chart; a four-signal ledger; a light bar between chart and ledger.
- **Difference:** the vertical order matches, but the reference organises the
  hero band across three columns and lets the chart bleed to the page edges.
  Ours is a two-column band inside a 1200px column.
- **Severity:** medium — **Component:** `MissionControlCanvas.tsx`,
  `mission-canvas.css` — **Presentation only.**
- **Correction:** widen the sheet toward full-bleed for the chart, and give the
  hero band a left slot for the statement label and legend.

### 2. Dominant focal point — partially aligned

- **Reference:** hero horizontally centred, with a single tiny grey caption
  ("Income") directly beneath. Nothing else on that band carries weight.
- **Current:** hero left-aligned at ~76px, with an 18px full-sentence label
  beneath it and a blue-tinted active mode pill on the same band.
- **Difference:** two competitors the reference does not have — a heavy
  supporting sentence and a coloured pill — plus left rather than centre
  alignment.
- **Severity:** medium — **Component:** `BusinessImpactHero.tsx` —
  **Presentation only.**
- **Correction:** centre the hero, demote the sentence to a small grey caption,
  and make the active mode read as text weight rather than a filled pill.

### 3. Negative space — partially aligned

- **Reference:** large empty regions above and around the hero; the chart has
  room on all sides.
- **Current:** generous by dashboard standards, but hero, chart, dock and the
  full ledger are all packed into the first 900px.
- **Difference:** the reference spends roughly a third of its first viewport on
  air; ours spends noticeably less because the ledger is pulled up into it.
- **Severity:** low — **Component:** `mission-canvas.css` — **Presentation only.**
- **Correction:** increase the hero band's vertical padding and let the ledger
  fall to the fold.

### 4. Typography scale — partially aligned

- **Reference:** hero roughly 8–9× body size; section labels are tiny uppercase
  letterspaced grey micro-labels; metric values sit in a clear middle tier.
- **Current:** hero ~76px against 14px body, roughly 5.4×; section labels are
  sentence-case small grey, with no micro-label treatment.
- **Difference:** a compressed top-to-bottom range and a missing micro-label
  tier, which is much of what reads as "accounting-grade" in the reference.
- **Severity:** medium — **Component:** `mission-canvas.css` —
  **Presentation only.**
- **Correction:** introduce an uppercase letterspaced micro-label class for
  section titles and widen the hero-to-body ratio.

### 5. Header density — not aligned

- **Reference:** primary navigation is a centred cluster of seven small square
  icon buttons with one filled active state; search is a wide placeholder
  field; identity shows avatar with name and role; page title and actions live
  on a second row.
- **Current:** five text navigation links, icon actions, four saturated accent
  swatches, and an avatar, all on one 60px row.
- **Difference:** the reference has no text navigation at all, and separates
  global chrome from page context across two rows. Ours reads as a
  conventional application bar.
- **Severity:** high — **Component:** `CanvasHeader.tsx` — **Presentation only.**
- **Correction:** move navigation to icon buttons with accessible names and
  tooltips, restore a wide search field, and split page context onto a second
  row. Retain text labels for any icon whose meaning is not obvious; this is
  the trade-off flagged in MC-02R-01.

### 6. Chart scale and treatment — partially aligned

- **Reference:** a dense field of roughly 200 thin grey hairline bars, a
  meandering black line, right-hand y-axis labels (100k / 50k / 0 / −50k),
  month labels beneath, a range scrubber, and an annotation pill carrying a
  value and a green delta badge.
- **Current:** seven wide light-blue bars, a near-flat black line, four faint
  gridlines, date labels beneath, no y-axis, no scrubber, and a text
  annotation without a delta badge.
- **Difference:** the largest single character gap. The reference reads as a
  dense instrument; ours reads as a weekly summary. Bar colour also differs —
  grey there, blue here.
- **Severity:** high — **Component:** `OperatingOutlookChart.tsx`,
  `outlook.ts`, `mission-canvas.css`.
- **Data:** **mixed.** Bar colour, y-axis labels and the annotation delta badge
  are presentation only, all derivable from `axisMax` and existing pulse
  values. Hairline density and a working scrubber **require data** — `pulse`
  holds seven points and cannot produce ~200 bars. That is an MC-01 contract
  change and must not be faked with interpolation.
- **Correction:** recolour bars to neutral grey, add right-hand axis labels and
  a delta badge now; raise seed granularity as a separate, explicitly approved
  data change before attempting the dense treatment.

### 7. Secondary metric presentation — partially aligned

- **Reference:** four hairline-separated panels, each with a micro-label, a
  large value, a unit caption, a series legend, small icon controls, and its
  own mini chart or radial gauge.
- **Current:** four hairline-separated signals with label, value, delta and
  caption. No legends, controls or charts.
- **Difference:** structurally aligned — no cards, hairline separation — but
  substantially shallower per panel.
- **Severity:** medium — **Component:** `SignalLedger.tsx` — **Presentation
  only** (`metric.trend` already exists in the contract).
- **Correction:** **hold pending your decision.** The MC-02R-01 brief said "Do
  not include a miniature chart in every signal"; the reference does exactly
  that. The brief and the reference conflict here and the brief should win
  until you say otherwise.

### 8. Border and surface usage — aligned

- **Reference:** effectively borderless; separation by hairlines; the only
  raised surfaces are the floating dock and the annotation pill.
- **Current:** the same discipline — hairline ledger dividers, faint gridlines,
  no card grid, with the dock as the only raised surface.
- **Difference:** none material. The header's bottom border matches the
  reference's own header separation.
- **Severity:** none — **Component:** `mission-canvas.css` — no action.

### 9. Colour restraint — not aligned

- **Reference:** essentially monochrome. Green appears in about three small
  places: the annotation's delta badge, one legend dot, and the dock's leading
  tile. Bars and line are grey and black.
- **Current:** blue fills all seven bars (the largest coloured area on the
  page), the active mode pill, the annotation text and the Ask Flow icon;
  four saturated accent swatches sit in the header; red and green deltas appear
  in the ledger.
- **Difference:** colour covers a large area and several unrelated roles. This
  also contradicts the MC-02R-01 brief directly, which said to avoid blue
  dashboard bars by default.
- **Severity:** high — **Component:** `mission-canvas.css`,
  `OperatingOutlookChart.tsx`, `CanvasHeader.tsx` — **Presentation only.**
- **Correction:** make bars neutral grey; reserve the accent for the single
  chart annotation and the Ask Flow tile; collapse the four header swatches
  into one control that opens a popover; keep semantic red only where an
  operational state genuinely demands it.

### 10. Ask Flow dock structure — not aligned

- **Reference:** a near-black rounded bar; a bright green rounded tile at the
  left; placeholder text centred in the bar; two outlined dark square controls
  at the right; a translucent grey chip tray sitting above the bar.
- **Current:** a white bar with a hairline border and shadow; a small pale-blue
  circular sparkle icon at the left; left-aligned placeholder; scope text and a
  borderless mic button at the right; no chip tray.
- **Difference:** inverted surface (dark versus light), different alignment of
  the placeholder, different control treatment, and a missing tray. This is the
  most recognisable element of the reference and currently the least similar.
- **Severity:** high — **Component:** `AskFlowCommandSurface.tsx`,
  `mission-canvas.css` — **Presentation only.**
- **Correction:** rebuild as a dark surface with a centred placeholder and
  outlined right-hand controls, keeping the existing evidence and authority
  behaviour untouched.

### 11. Ask Flow placement — partially aligned

- **Reference:** the dock spans roughly 37% of the page width, sits centre-left,
  and genuinely floats over dense content beneath it.
- **Current:** spans the full 1200px content width and sits in reserved empty
  space between chart and ledger, overlapping the chart's bounding box by only
  18px.
- **Difference:** ours reads as a full-width toolbar rather than a floating
  command palette, and nothing of consequence sits behind it.
- **Severity:** medium — **Component:** `mission-canvas.css` — **Presentation
  only.**
- **Correction:** constrain to roughly 40–55% width, centre it, and let it
  overlap real content. Note the constraint recorded in MC-02R-01: a deeper
  overlap must not cover the chart's axis labels, so the axis treatment in item
  6 should be settled first.

### 12. Contextual suggestion chips — not aligned

- **Reference:** two suggestion chips are visible above the collapsed bar
  ("What is our gross margin %?", "Why did gross margin change during the
  period?"), each with a small trailing action button.
- **Current:** no chips in the collapsed state; suggestions appear only after
  the panel is expanded.
- **Difference:** the reference offers its intelligence before any interaction;
  ours hides it behind a click.
- **Severity:** high — **Component:** `AskFlowCommandSurface.tsx` —
  **Presentation only.** `askFlow.suggestions` already carries the prompts and
  their evidence.
- **Correction:** surface the first two suggestions as chips above the collapsed
  bar, each still opening its sourced answer.

### 13. Accent intelligence tile — not aligned

- **Reference:** a bright green rounded square filling the bar's height, with a
  dark glyph. It is the strongest colour moment in the entire interface and the
  clearest signal of where intelligence lives.
- **Current:** a 26px pale-blue circle with a sparkle icon — small, low
  contrast, easy to miss.
- **Difference:** roughly half the size, far lower contrast, and no sense of
  being the product's focal control.
- **Severity:** high — **Component:** `AskFlowCommandSurface.tsx`,
  `mission-canvas.css` — **Presentation only.**
- **Correction:** promote to a full-height rounded tile in the accent colour
  with a dark glyph, and make it the only saturated element in the dock.

### 14. Voice and action controls — partially aligned

- **Reference:** two right-hand controls, each in its own outlined dark rounded
  square, with an indicator glyph and a grid or apps glyph.
- **Current:** a single borderless mic icon button, plus a chevron once
  expanded, alongside a run of scope text.
- **Difference:** different glyph set, no outlined containers, and the scope
  text occupies space the reference gives to controls.
- **Severity:** low — **Component:** `AskFlowCommandSurface.tsx` —
  **Presentation only.**
- **Correction:** place voice and one secondary control in outlined squares and
  move the scope text into the chip tray row.

### 15. Premium visual character — partially aligned

- **Reference:** premium quality comes from extreme monochrome, micro-labels,
  dense data, generous air, and one accent used sparingly.
- **Current:** materially calmer than the previous dashboard, but blue bars,
  blue pills, header colour swatches, sentence-case labels and a sparse chart
  pull it toward a conventional SaaS look.
- **Difference:** an accumulation of items 4, 5, 6, 9 and 10 rather than a
  separate defect.
- **Severity:** medium — **Component:** cross-cutting — **Presentation only.**
- **Correction:** resolved by fixing the items above; re-judge afterwards.

---

## Scorecard

| # | Dimension | Verdict | Severity |
|----|----|----|----|
| 1 | Overall composition | partially aligned | medium |
| 2 | Dominant focal point | partially aligned | medium |
| 3 | Negative space | partially aligned | low |
| 4 | Typography scale | partially aligned | medium |
| 5 | Header density | **not aligned** | high |
| 6 | Chart scale and treatment | partially aligned | high |
| 7 | Secondary metric presentation | partially aligned | medium |
| 8 | Border and surface usage | **aligned** | none |
| 9 | Colour restraint | **not aligned** | high |
| 10 | Ask Flow dock structure | **not aligned** | high |
| 11 | Ask Flow placement | partially aligned | medium |
| 12 | Contextual suggestion chips | **not aligned** | high |
| 13 | Accent intelligence tile | **not aligned** | high |
| 14 | Voice and action controls | partially aligned | low |
| 15 | Premium visual character | partially aligned | medium |

## Prioritised correction list

Ordered by visual gain per unit of change. Every item down to P9 is
presentation only.

| P | Correction | Items | Component | Data |
|----|----|----|----|----|
| 1 | Neutral grey bars; accent reserved for annotation and Ask Flow tile; collapse header swatches to one control | 9, 15 | `mission-canvas.css`, `OperatingOutlookChart.tsx`, `CanvasHeader.tsx` | No |
| 2 | Rebuild the dock as a dark surface with centred placeholder and outlined controls | 10 | `AskFlowCommandSurface.tsx` | No |
| 3 | Promote the intelligence tile to a full-height accent tile | 13 | `AskFlowCommandSurface.tsx` | No |
| 4 | Show two suggestion chips above the collapsed bar | 12 | `AskFlowCommandSurface.tsx` | No |
| 5 | Centre the hero, demote its sentence to a caption, unfill the active mode | 2 | `BusinessImpactHero.tsx` | No |
| 6 | Add the uppercase micro-label tier and widen the type range | 4 | `mission-canvas.css` | No |
| 7 | Icon-led header navigation, wide search, second context row | 5 | `CanvasHeader.tsx` | No |
| 8 | Narrow the dock to ~40–55% width, centre it, overlap real content | 11 | `mission-canvas.css` | No |
| 9 | Right-hand axis labels and an annotation delta badge | 6 (part) | `OperatingOutlookChart.tsx` | No |
| 10 | Widen the sheet toward full-bleed; add a left slot to the hero band | 1, 3 | `mission-canvas.css` | No |
| 11 | Outlined voice and secondary controls; scope text into the chip row | 14 | `AskFlowCommandSurface.tsx` | No |
| 12 | Mini charts in the ledger — **decision required** | 7 | `SignalLedger.tsx` | No |
| 13 | Dense hairline bars and a range scrubber — **needs approval** | 6 (rest) | `outlook.ts`, seed | **Yes** |

## Two decisions needed before corrections begin

1. **Ledger mini charts (P12).** The brief forbids them, the reference uses
   them. Which wins?
2. **Chart density (P13).** Matching the reference's ~200 hairline bars means
   raising seed granularity from 7 pulse points to daily. That changes the
   MC-01 data contract, which this milestone was told not to touch. It should
   be a separate approved job, and the values must stay derived — not
   interpolated to look dense.

## Scope honoured

No implementation code changed. No data contract changed. No dark mode or
mobile work. Reference images were added under
`docs/product-design/references/mission-control/`, and the audited screenshot
was re-captured from the verified canvas-v2 URL.
