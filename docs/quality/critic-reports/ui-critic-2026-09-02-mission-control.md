# UI Critic Report — Mission Control (MC-01 + MC-02)

Reviewed: 2026-09-02. Scope: `/[workspace]/admin` for `northstar-creative`, seed-driven.
Artifacts: `docs/verification/mission-control/screenshots/` (9 captures + 4 full-page).
Method: pixel inspection of each capture at 2–6x, cross-checked against
`apps/web/src/components/mission/*`, `apps/web/src/lib/mission-control/*`,
`apps/web/src/styles/mission-control.css`.

## Summary

Overall visual verdict: **PARTIAL**
Average score: **6.2/10**

The populated screen is genuinely good product work — the dominant answer, the
decision narratives and the right rail read like a real operating console, not a
CRUD page. It is blocked from PASS by: a required state (loading) with no
evidence at all, a dense state whose fourth decision is visibly incoherent
fixture data, an expanded-dock overlay that slices the signal strip mid-glyph,
raw permission scopes in the restricted state, and a set of mechanical alignment
defects on the primary strip.

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| 01 populated | 1440 | light | 7 | Signal cells not baseline-aligned; sparklines unitless/normalized; dock sparkle clipped by avatar; activity timestamp column ragged; capacity meter invisible; business activity not full-width; duplicate `Mon` axis label |
| 02 populated | 1440 | dark | 7 | Same as 01; theme parity otherwise clean |
| 03 populated | 375 | light | 7 | Accent control, search and Ask Flow button dropped; nav clipped mid-word at right edge; dock loses scope/tools/authority |
| 04 populated | 375 | dark | 7 | Same as 03 |
| 05 dock expanded | 1440 | light | 5 | Panel overlay cuts signal-strip captions in half; first "Try asking" chip is the question already answered above it; authority note floats outside the panel over page content |
| 06 empty | 1440 | light | 5 | No action control at all; ~400px dead region; inconsistent with error/restricted which do have buttons |
| 07 error | 1440 | light | 8 | Right two-thirds of viewport empty; heading not in hero scale |
| 08 restricted | 1440 | light | 6 | `opportunity.read` and `workspace.mission_control` exposed to the user; heading orphans "leads" onto line 2 with 1000px of unused width beside it |
| 09 dense | 1440 | light | 4 | Fourth decision is decision #1 cloned: "Halcyon Energy" invoice carries the Meridian proposal body and stakes, under a Meridian client label; headline says 4 decisions while impact card and context receipt still say three |
| loading | — | — | n/a | **No screenshot supplied.** Code path exists (`MissionLoading`); rendering unverified |

## Critical defects (must fix)

1. **09-state-dense.png — fourth decision card is incoherent.** Title is
   "Contractor invoice for Halcyon Energy exceeds the approved vendor budget by
   $4,200"; the body underneath reads "Proposal v3 was rebuilt after Meridian
   added two wayfinding audits… 38% margin against your 40% floor", the stakes
   quote is "the largest open proposal in the pipeline", and the client label is
   Meridian Health. Source: `states.ts` `densify()` spreads
   `missionDecisions[0]` and overrides only `title`/`clientName`/`urgency`.
2. **09-state-dense.png — stale counts.** Headline "4 decisions need you" while
   BUSINESS IMPACT still reads "$356,000 · Combined exposure across the three
   decisions" and the receipt reads "3 decisions routed by workspace policy".
   `densify()` overrides `answer`/`because` but not `impactLabel`/`evidence`.
3. **05-ask-flow-dock-expanded.png — panel overlay clips live content.** The
   expanded panel's top edge cuts the signal-strip captions through the middle
   of the glyphs ("$689K unweighted", "close inside 90 days", "invoices",
   "blocking or elevated risk", "week · team at 80%", "policy" are all sliced).
4. **08-state-restricted.png — internal permission scopes in user copy.** "…which
   grants `opportunity.read`" and "Missing `workspace.mission_control` · Ask Maya
   Chen for access".
5. **01/02/03/04 — signal strip cells are not baseline-aligned.** `.flow-mc-signal`
   is a per-cell flex column, so a one-line caption (Active Delivery) lifts its
   sparkline and delta ~17px above the seven neighbours. Measured at x≈380–520,
   y≈408–455 in `01`.
6. **01/02/03/04 — sparklines are decorative.** `Sparkline` maps each series to
   `20% + (v−min)/span × 80%`, so every metric renders the same rising ramp
   regardless of magnitude, with no unit, no timeframe and no axis. Under counts
   ("Client actions 4", "Approval queue 3") a 12-bar histogram asserts nothing.
   Available Capacity's current bar degenerates to a ~3px stub that reads as a
   render error.
7. **01/02 — Business Activity chart misstates magnitude.** Bars are min–max
   normalised inside `.flow-mc-field`'s 3fr column (`scaleWithin` → `24% + …×76%`),
   so Monday renders at ~25% and Today at 100% for a stated $369K → $404.9K
   move (+9.7%). No axis or "indexed to range" caption; the real numbers exist
   only in a `title` tooltip.
8. **01/02 — duplicate axis label.** Day labels read Mon, Tue, Wed, Thu, Fri,
   **Mon**, Today. The seed carries `dateLabel` ("25 Aug" … "1 Sep") but
   `Pulse` renders `label` only.
9. **01/02 — unexplained orange dots** above Wed/Thu/Fri/Today bars. They mark
   `point.note` ("Acme contract executed", etc.) but the note is
   `aria-hidden` with a `title` only: no legend, no visible text, nothing for
   keyboard or screen-reader users.
10. **01/02 — Team capacity utilisation meter does not render.** Avery Brooks at
    110% should show a full-width 3px `--color-danger` fill; both themes show
    only a neutral hairline indistinguishable from the row divider.
11. **01/02 — Recent operations timestamp column is ragged.**
    `.flow-mc-activity__row` is a per-row grid with `auto` first column, so
    titles start at x≈107 ("08:12"), x≈167 ("29 Aug 16:30") and x≈186
    ("Yesterday 17:40"). No shared left edge down the timeline.
12. **06-state-empty.png — empty state has no action.** Guidance is card text
    only ("Start by adding a client, then open a discovery opportunity") with no
    control, while error and restricted both ship buttons. Below the fold the
    page is ~400px of empty background.
13. **Loading state unverified.** Required by the milestone; no capture exists.

## Non-blocking nits

1. `01` dock: the Sparkles glyph is half-occluded by the "N" workspace avatar,
   which also covers the input's left rounded corner.
2. `01` Receivables cell repeats "$27,750 overdue" as both caption and delta,
   ~30px apart.
3. `05` first "Try asking" chip duplicates the question already answered
   directly above it, answer preview included.
4. "Fact ·" prefix, "high trust", "Deterministic scope calculation",
   "Capacity engine · Team capacity engine" and "the capacity engine puts Avery
   at 110%" are internal provenance/engine vocabulary in user-facing copy.
   "Capacity engine · Team capacity engine" prints two labels for one source.
5. Activity dot colours (crimson/amber/orange/green) carry meaning with no
   legend, and are colour-only.
6. "Open pipeline" (a real link) is styled identically to "3 open" / "2 open"
   (static meta text); interactive and non-interactive metas are
   indistinguishable.
7. Whole signal cells are links but only reveal it on hover.
8. "Alex Vendor" reads as a placeholder name in a list of otherwise plausible
   people, and carries a 40h/week baseline for an on-demand vendor.
9. "Maya Chen 82.5%" is the only fractional percentage in the capacity list.
10. "utilisation" (en-GB) against American spelling elsewhere.
11. `Available capacity` value "63" has no unit at value scale; the unit lives
    in the caption.
12. Error and restricted headings use a smaller scale and drop the
    "MISSION CONTROL · TODAY" eyebrow that empty and populated keep — three
    different heading treatments across states.
13. `DEMO STATES` switcher renders at the bottom of the Northstar page. It is
    correctly gated to the demo workspace (`isDemo`), but it is on the exact
    surface shown to investors; consider `?state=` only, or a quiet affordance.
14. 375px nav strip clips "Delivery" mid-word at the viewport edge with no
    scroll affordance or fade.
15. Accent control is hidden below 1024px, so it is absent on tablet as well as
    phone.

## Requirement coverage

| Group | Verdict | Evidence |
|---|---|---|
| Instrument bar | PARTIAL | `01` shows all nine elements at 1440; `03` drops search (<768), Ask Flow (<480) and accent control (<1024) |
| Dominant answer | MET | `01`: "3 decisions need you" at 3.25rem with a three-clause because line and a $356,000 BUSINESS IMPACT card — but `09` breaks the impact/receipt pairing |
| Operational workspace | PARTIAL | `01b` has the four signal families on hairline separators with no equal-card wall and no sidebar; Business Activity sits in a 3fr column beside Team Capacity rather than full-width, and its bars are normalised without an axis |
| AI dock | PARTIAL | `01` collapsed shows prompt, mic, scope and tool pills; authority ("Needs a second approver…") only appears once expanded (`05`), and scope/tools/authority are all hidden below 1024px |

## Judgement

Ninety percent of the populated screen reads as a finished commercial product:
the copy is specific and consequential, every number is attributed, the decision
cards carry a narrative and stakes rather than a form, and the right rail is
denser and more useful than most shipped agency tools. What breaks the illusion
is mechanical rather than conceptual — a metric strip whose rows visibly ripple
out of alignment, eight sparklines that resolve to the same decorative ramp, a
bar chart that turns a 10% move into a 4x visual, a capacity meter that never
paints, and a timeline whose left edge wanders. The non-populated states are the
weaker half: error and restricted are designed and actionable, but empty has no
action, restricted prints raw permission scopes, and dense — the state most
likely to be opened to prove the layout holds under load — contains a decision
card that visibly contradicts itself. None of this requires new architecture; it
is one pass of alignment, copy and state-derivation fixes. Until they land this
is a strong prototype, not a shippable console.

## Product-owner approval

Status: pending
