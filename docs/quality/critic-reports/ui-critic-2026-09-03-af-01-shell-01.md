# UI Critic Report

Reviewed: 2026-09-03. Recapture pass 4: 2026-09-03. Scope: AF-01 global Ask
Flow dock and SHELL-01 global navigation. Mission Control chart/body
composition is **locked separately** and was not scored. Team page body is
existing commercial list chrome and was scored only for header/dock overlay.

Method: pixel inspection of the supplied captures (not code). This pass
re-opened only `03-active-team.png` (1440×900). Maroon overlay hunt, header
tooltip hunt, and bottom-left crop measured with PIL. Scores for screens
not re-opened in this pass are unchanged.

## Summary

Overall visual verdict: **PARTIAL**
Average score: **8.0/10**

The score bar is **met**. Every primary screen is ≥8/10 and no critical
defects remain. Overall stays PARTIAL only because product-owner approval is
not recorded.

`03-active-team.png` is now **8**. The maroon `N 1 Iss` pill is gone (0 maroon
samples in the bottom-left 220×120). The Theme tooltip is gone (0 near-black
pixels under the utility row). Team active pill and the six circular
utilities are intact. A small circular Next.js `N` mark is still visible at
about (19,843)–(56,880); that is a leftover, not a score-bar block.

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| AF-01 resting dock | 1440×900 | light | **8** | Not re-opened this pass |
| AF-01 typing suggestions | 1440×900 | light | **8** | Not re-opened this pass |
| AF-01 streaming | 1440×900 | light | **8** | Not re-opened this pass |
| AF-01 answered evidence | 1440×900 | light | **8** | Not re-opened this pass |
| AF-01 counter-question | 1440×900 | light | **8** | Recapture. Version 1 selected, Version 2 quiet. Counter-question present. Route path remains |
| AF-01 edited versions | 1440×900 | light | **8** | Not re-opened this pass |
| AF-01 after navigation | 1440×900 | light | **8** | Not re-opened this pass |
| AF-01 fullscreen | 1440×900 | light | **8** | Not re-opened this pass |
| AF-01 dark resting | 1440×900 | dark | **8** | Recapture. Rim at y≈820 (RGB ≈ 58) lifts the bar. Fill still close to the canvas |
| SHELL-01 light header | 1440×900 | light | **8** | Not re-opened this pass |
| SHELL-01 dark header | 1440×900 | dark | **8** | Not re-opened this pass |
| SHELL-01 active Team | 1440×900 | light | **8** | Recapture. Team pill + people glyph. No Theme tooltip. Maroon issue pill gone. Small circular Next.js `N` remains bottom-left |
| SHELL-01 search expanded | 1440×900 | light | **8** | Not re-opened this pass |
| SHELL-01 quick create | 1440×900 | light | **8** | Recapture. Menu is Client…Task. Tooltip is above the plus, not covering the rows. Hover leftover remains |
| SHELL-01 header + dock | 1440×900 | light | **8** | Not re-opened this pass |

Primary screens below 8: none. Score bar is met.

## Recapture evidence (this pass)

| Previous 7 | New score | Evidence |
|---|---|---|
| Counter-question: inert “2 versions” | **8** | `05-counter-question.png`: Version 1 outlined, Version 2 grey. Answer + `ANSWERED FROM` Receivables ledger. Follow-ups include “Which matters more: protecting the deadline or protecting margin?” |
| Dark resting: dock ≈ canvas | **8** | `09-dark-resting.png`: y=810 page (14,16,19); y=820 rim (58,58,56); y=830 dock (17,17,17). No suggestion chips. Maroon hits at (58,854) are a page “days” chip, not Next.js |
| Active Team: Next.js + tooltip | **8** | `03-active-team.png` (pass 4): maroon 0. Header tooltip pixels 0. Team pill x=862–952, y=12–55. Small circular `N` still at ≈(19,843)–(56,880) |
| Quick create: tooltip on the menu | **8** | `05-quick-create.png`: six-row white menu under the plus. “Quick Create” tooltip sits above the trigger. Utilities stay visible |

## Prior recapture evidence (unchanged)

| Previous critical | Status | Evidence |
|---|---|---|
| Fullscreen is still the floating card | **FIXED** | `08-fullscreen.png` (prior pass) |
| Search expanded deletes the utility cluster | **FIXED** | `04-search-expanded.png` (prior pass) |
| Versions is a dead label | **FIXED** | `06-edited-versions.png` (prior pass); also confirmed on 05 this pass |

## Requirement coverage

| Criterion | Verdict | Evidence |
|---|---|---|
| Header 1fr / auto / 1fr | MET | Unchanged |
| Flow + Northstar Creative | MET | Confirmed on 05, 09, 03, 05-create |
| Circular brand accent tile, not Finora yellow | MET | Unchanged |
| Dark active pill, quiet inactive links | MET | Team dark pill + people glyph on 03. Dark header inverts the Mission Control pill |
| Circular utilities | MET | Six circles on 03 and 05-create while menus/tooltips are open |
| No extra Ask Flow header button | MET | Unchanged |
| Header ~64–72px | MISS | Not recaptured as a fix |
| Light and dark | MET as themes | 09 dark header + dark dock re-opened |
| One global dock; resting has no chips | MET | 09 resting: placeholder only |
| Typing shows centred suggestions | MET | Not re-opened |
| Conversation expands upward | MET | 05 card sits on the dock |
| Evidence receipt | MET | 05 Receivables ledger + invoice pills |
| Counter-question | MET | Deadline vs margin prompt on 05 |
| Versions | MET | Version 1 / Version 2 on 05 |
| Fullscreen, same thread | MET | Not re-opened this pass |
| Header + dock coexistence | MET | 03 and 05-create keep both |
| Team body out of scope | HONOURED | List chrome not scored. Header + dock overlay scored |

## Critical defects (must fix)

None. First-pass criticals stay fixed. The Team score-bar block is cleared.

Overall remains PARTIAL only because product-owner approval is pending.

## Recommendations

- Hide the remaining circular Next.js `N` at the bottom-left of the Team
  frame. The issue pill is gone; the mark is still an engineering leftover.
- Dismiss utility tooltips when the matching menu is open (Quick Create
  leftover on 05-create, Search leftover on 04). Theme tooltip on 03 is gone.
- Grow the header band to ~64–72px. Not re-measured this pass.
- Dark dock fill is still near the canvas; the new rim is enough for 8, not
  for a strong lift.
- Replace `/northstar-creative/admin · Founder` with a human context receipt.
  Still on 05.
- In fullscreen, swap the expand glyph for an exit control (prior pass).
- Finish Version 2 before the versions comparison capture (prior pass).

## Product-owner approval

Status: pending
