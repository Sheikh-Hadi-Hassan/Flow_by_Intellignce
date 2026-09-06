# UI Critic Report

Reviewed: 2026-09-03. **DEMO-02 Business Registry (BB-01)** visual-only audit.
Inspected the ten listed Playwright PNGs (pixel crops + Vision OCR). Code was
not used as evidence. Milestone PASS is **not** claimed — scores only.

**Recapture pass (same day):** Re-read only
`06-missing-information-1440-light.png` and
`07-restricted-employee-1440-light.png` after densify. Other screen scores
unchanged from the first pass.

Rubric: Mission Control V2 — monochromatic surfaces, one workspace accent,
compact editorial layout, hairline separators, strong typography, no generic
card grid, no huge empty areas, clear fictional-demo identification.
Engineering fixtures rejected as finished product.

Artifacts scored:

| # | File | Size |
|---|---|---|
| 1 | `docs/verification/demo-data/screenshots/01-overview-1440-light.png` | 1440×5070 |
| 2 | `docs/verification/demo-data/screenshots/02-overview-1440-dark.png` | 1440×5070 |
| 3 | `docs/verification/demo-data/screenshots/03-identity-edit-1440-light.png` | 1440×5250 |
| 4 | `docs/verification/demo-data/screenshots/04-locations-1440-light.png` | 1440×5128 |
| 5 | `docs/verification/demo-data/screenshots/05-registration-documents-1440-light.png` | 1440×5128 |
| 6 | `docs/verification/demo-data/screenshots/06-missing-information-1440-light.png` | 1440×1032 (recapture) |
| 7 | `docs/verification/demo-data/screenshots/07-restricted-employee-1440-light.png` | 1440×1056 (recapture) |
| 8 | `docs/verification/demo-data/screenshots/08-ask-registered-1440-light.png` | 1440×900 |
| 9 | `docs/verification/demo-data/screenshots/11-overview-375-light.png` | 375×7649 |
| 10 | `docs/verification/demo-data/screenshots/12-overview-375-dark.png` | 375×7649 |

(Captures `09` / `10` Ask renewals/signatories exist on disk but were out of
scope for this request.)

## Summary

Overall visual verdict: **PARTIAL**
Average score (10 screens): **8.1/10**

Populated registry reads as a real Mission Control V2 document: hairline
sections, label/value ledger, masked banking, DEMO IDs, and a clear
**Fictional demo** chip. Light and dark hold. Mobile stacks without a card
grid.

Incomplete and restricted states were densified on recapture: missing now
pairs a requirements list with an **Already on file** ledger and CTA;
restricted pairs **Public workspace identity** with an explicit **Restricted
from this role** inventory. Both clear the empty-canvas reject from the first
pass. Primary ≥8 bar is now **met**. Overall stays PARTIAL — PO visual
approval is not recorded, and Ask dock / Ask-vs-page defects from the first
pass remain.

Score bar (primary journey screens ≥ 8/10): **met**.

| Primary screen | Score | Bar (≥8) |
|---|---|---|
| Overview populated light (`01`) | **8.5** | met |
| Overview populated dark (`02`) | **8.5** | met |
| Identity edit (`03`) | **8** | met |
| Missing information (`06`) | **8** | met |
| Mobile overview light (`11`) | **8** | met |

Overall score: **8.1/10**

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| Overview populated | 1440×5070 | light | **8.5** | Editorial stack, hairlines, one blue accent, **Fictional demo** chip, DEMO IDs, masked accounts. Dense firmographics / ownership / tax / insurance / policies / renewals / audit. Ask Flow dock occludes mid-page locations. Long scroll is expected, not sparse |
| Overview populated | 1440×5070 | dark | **8.5** | Dark parity holds. Same structure and demo labeling. Charcoal dock on near-black is quiet |
| Identity edit | 1440×5250 | light | **8** | Inline trading-name field + blue **Save identity**. Legal-name lock copy is clear. Edit chrome is minimal (one field) but not a raw admin form. Demo chip present |
| Locations (scroll) | 1440×5128 | light | **8** | Addresses carry `-DEMO` / “Fictional Harbor”. Tags Primary / correspondence. Dock sits on top of the location→firmographics seam and hides rows |
| Registration / documents (scroll) | 1440×5128 | light | **8** | Document ledger with DEMO-POL / DEMO-FY IDs, “Metadata only. Binary upload deferred.” Add-metadata row is editorial, not a CRUD card grid |
| Missing information | 1440×1032 | light | **8** | Recapture: **Incomplete** status chip, three missing requirements (incl. DEMO- prefix), **Already on file** label/value block (trading / legal / jurisdiction / timezone·currency), restorative copy, blue **Complete registration**. Hairlines; no empty-canvas stub. Minor: orange Incomplete chip is a second accent beside workspace blue; lower band still quieter than a full registry scroll |
| Restricted employee | 1440×1056 | light | **8** | Recapture: **Fictional demo** chip, role subtitle, **Public workspace identity** ledger (4 rows), **Restricted from this role** inventory (5 hidden domains), founder/ops escalation line. Reads as a designed ACL document, not a stub. Minor: still short vs populated registry; intentional for role scope |
| Ask · registered | 1440×900 | light | **7.5** | Answer panel has fictional disclaimer, DEMO-LLC citation, evidence lines, edit/regenerate/copy — interaction card is allowed. Ask asserts a full registration while an incomplete page state is in play — demo narrative collision. (Page density for incomplete was not re-audited on this Ask capture.) |
| Overview | 375×7649 | light | **8** | Compact stack; demo chip; DEMO registration ID. Header chrome is crowded (hamburger + icons). Dock covers lower registration fields |
| Overview | 375×7649 | dark | **8** | Dark mobile parity. Workspace truncates to “Northstar C…”. Same dock occlusion |

Primary screens below 8: **none**.

## Critical defects (must fix)

1. ~~Incomplete registration (`06`) empty-canvas fixture~~ — **cleared on densify recapture** (now **8/10**).
2. ~~Restricted employee (`07`) empty-canvas fixture~~ — **cleared on densify recapture** (now **8/10**).
3. **Ask Flow dock permanently covers mid-registry content** on populated desktop scrolls (`04` crop: dock over locations/firmographics). Long registries need reserved bottom padding or a dock that does not sit on live rows.
4. **Ask answer vs page state contradiction (`08`).** Ask: full DEMO-LLC jurisdiction + principal office with high-trust citations while incomplete registration is the page premise. Confusing for a demo; either answer from the visible incomplete state or label the answer as seeded snapshot while the page is incomplete.

## Recommendations

- Incomplete / restricted densify is accepted for the primary density bar; optional polish: drop the orange Incomplete chip to blue/grey to keep a single workspace accent.
- Keep the populated ledger’s hairline + label/value pattern — that is the V2 win.
- Preserve **Fictional demo** chip + DEMO-prefixed IDs + masked banking; they already clear the demo-identification bar on populated views.
- On 375, reduce header icon crowding or collapse utilities so the wordmark and title are not fighting chrome.
- Fix Ask dock occlusion and Ask-vs-incomplete narrative before claiming visual PASS.

## Product-owner approval

Status: pending

## Verdict note

Visual scoring only. Do **not** claim DEMO-02 / BB-01 visual PASS from this report.
Primary ≥8 bar is **met** after the densify recapture. Overall remains **PARTIAL**
until remaining Ask defects are fixed and PO visual approval is recorded.
