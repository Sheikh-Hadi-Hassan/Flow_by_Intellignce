# UI Critic Report

Reviewed: 2026-09-03. **Recapture pass** for **BB-00 Building Block Registry +
CRM Core**. Prior pass on this file scored 6.4/10; those scores are not reused.
This pass inspects the ten recapture PNGs only (pixel inspection + Vision OCR
of the files). Code was not used as evidence. Mission Control was not scored.

Method: file dimensions and first-viewport white density via PIL. Vision OCR
on full frames and viewport crops. Tight crops of registry body, directory
tabs, 360 document, duplicate A/B columns, 375 chrome, 375 tab row, and Ask
Flow docks.

Artifacts (recapture):

- `docs/verification/building-blocks/screenshots/01-registry-recommended-1440-light.png` (**1440×1725**, primary)
- `docs/verification/building-blocks/screenshots/02-registry-recommended-1440-dark.png` (**1440×1725**)
- `docs/verification/building-blocks/screenshots/03-registry-active-1440-light.png` (**1440×1725**, primary)
- `docs/verification/building-blocks/screenshots/04-directory-1440-light.png` (**1440×4673**, primary)
- `docs/verification/building-blocks/screenshots/05-directory-1440-dark.png` (**1440×4673**)
- `docs/verification/building-blocks/screenshots/06-client-360-1440-light.png` (**1440×1047**, primary)
- `docs/verification/building-blocks/screenshots/07-duplicates-1440-light.png` (**1440×936**, primary)
- `docs/verification/building-blocks/screenshots/08-registry-375-light.png` (**375×2285**)
- `docs/verification/building-blocks/screenshots/09-directory-375-light.png` (**375×9746**)
- `docs/verification/building-blocks/screenshots/10-directory-375-dark.png` (**375×9746**)

## Summary

Overall visual verdict: **PARTIAL**
Average score: **7.8/10**

The schema dump is gone. Registry copy is founder language. CRM Core is not
repeated under Available. Config CTAs sit above the facts. Directory has
column headers and title-cased, colour-coded stages. Client 360 now carries
emails, two related records, and a next step. Duplicate review is a
side-by-side Record A/B document with a title-cased Open chip. Config is a
single-line tab at 375. The Next.js `N` is not on the dock tile.

Primary bar is met. Overall PASS is still blocked: product-owner visual
approval is not recorded, and 375 chrome remains crowded.

Score bar (primary journey screens ≥ 8/10): **met**.

| Primary screen | Score | Bar (≥8) |
|---|---|---|
| Registry recommended (`01`) | 8 | met |
| Registry active (`03`) | 8 | met |
| Directory (`04`) | 9 | met |
| Client 360 (`06`) | 8 | met |
| Duplicates (`07`) | 8 | met |

## Screen-by-screen

| Screen | Viewport | Theme | Score | Defects |
|---|---|---|---|---|
| Registry recommended | 1440×1725 | light | **8** | Editorial row, not a card. Founder sentences throughout. Threshold 80 + Save / Submit sit above the facts. CRM Core absent from Available. **Why** repeats the lede verbatim. Two equal blue primaries. Dock clips the Ask Flow sentence |
| Registry recommended | 1440×1725 | dark | **8** | Same copy and CTA stack. Dark holds. Charcoal dock on near-black is quiet, not broken |
| Registry active | 1440×1725 | light | **8** | Status **Active**, Open client directory, Suspend. Available does not relist CRM Core. The featured row still sits under **Recommended for your business** while Active is only a sentence |
| Client directory | 1440×4673 | light | **9** | Seeded ledger (Acme Robotics, Meridian Health, Northwind Bank, …). Headers CLIENT / INDUSTRY / STAGE / OWNER. Stages title-cased and colour-coded (Active green, At Risk orange, Dormant red, Former / Lead). Tabs Directory / Segments / Duplicates / Config on one line. Dock overlay expected |
| Client directory | 1440×4673 | dark | **8** | Same structure. At Risk is orange on charcoal and readable. Active green holds |
| Client 360 | 1440×1047 | light | **8** | Meridian Health, At Risk, health 38, last contact 48 days. Two named contacts with roles and emails. Two timeline lines. Opportunity + Project. Next-step sentence. Emails use `.example.test`. Timeline is thin. Health 38 has no scale |
| Duplicate review | 1440×936 | light | **8** | Brightline pair, Score 92, Open (title case), Record A / Record B columns (name, industry, stage, owner), Merge requires approval, Back to directory. Names have no field label. Conflicting industry / stage / owner are not highlighted. Open is a small orphaned chip. One pair |
| Registry | 375×2285 | light | **7** | Same founder copy; CRM Core not under Available; CTAs above facts. Workspace truncated to “Northstar C…”. Seven chrome controls in 375px. Dock covers Verified Requirement. Capture is **active**, not recommended |
| Client directory | 375×9746 | light | **7** | Stacked rows with CLIENT / INDUSTRY / STAGE / OWNER and title-cased Active. Config stays on the tab row (no wrap into a fake section). Header still truncates the workspace; search crowds the wordmark. Dock covers Meridian Health |
| Client directory | 375×9746 | dark | **7** | Same nowrap tabs and stacked rows. Stage colour holds. Workspace “Northstar C…”. Dock tile is the spark, not an `N` |

Primary screens below 8: none.

## Claimed-fix check (visual only)

| Claim | Verdict | Evidence |
|---|---|---|
| Founder language instead of `industry:agency` / `crm.client` / `search_clients` / permission keys | **HELD** | OCR of `01`–`03`, `08`: no contract keys. Tools read “Search clients, open a client 360…”. Permissions read “Propose a duplicate merge, and approve a merge.” |
| CRM Core not listed again under Available | **HELD** | `01` Available: “No other first-party blocks are published yet.” `03` / `08`: same, plus “CRM Core is active in this workspace.” |
| Config CTAs moved above the facts | **HELD** | `01`/`02`: threshold 80, Save configuration, Submit for approval, then Why. `03`/`08`: Open client directory / Suspend, then Why |
| Directory column headers and title-cased stages | **HELD** | `04`/`05`/`09`/`10`: CLIENT, INDUSTRY, STAGE, OWNER. Active / At Risk / Dormant / Lead / Former |
| 360: emails, two related records, next step | **HELD** | `06`: `contact@…` and `ops@…`; Opportunity · Meridian Health proposal; Project · Meridian Brand Ops; “Next step: Avery Brooks follows up…” |
| Duplicate review: side-by-side Record A/B, Open title case | **HELD** | `07`: RECORD A Brightline Media vs RECORD B Brightline Media LLC. Open chip is title case |
| Config tab shortened; subnav nowrap | **HELD** | `04`/`05`/`09`/`10`: “Config” on the same line as Directory / Segments / Duplicates. No stranded Configuration heading over empty hairlines |
| Next.js overlay hidden | **HELD** | Dock tile is the blue spark on every crop checked (`01`, `06`, `07`, `08`, `09`). No `N` on the left edge |

## Spec coverage (visual)

| Criterion | Verdict | Evidence |
|---|---|---|
| Editorial rows, hairline separators, not a card grid | **MET** | `01`–`05`, `09`, `10`: no drop-shadow marketplace cards |
| Monochromatic Flow language | **MET** | White/charcoal + blue reserved for logo, +, dock tile, and primary actions. Stage colour is functional, not decoration |
| Hierarchy: recommended / active / available / configuration required | **NEAR** | Four section headings exist. Available no longer contradicts. Active CRM Core still occupies the Recommended slot (`03`, `08`) |
| Registry answers why, verified requirement, data, roles, tools, risk | **MET** | Labels exist and values are sentences. Why is a duplicate of the lede |
| CRM directory / 360 / duplicates look like a product | **MET** | Directory `04` = 9. 360 `06` = 8. Duplicates `07` = 8 |
| Desktop 1440 and mobile 375, light and dark | **PARTIAL** | 1440 light+dark for recommended registry and directory. No 1440 dark 360 or duplicates. No 375 360 or duplicates. `08` is registry-active, not recommended |
| Ask Flow dock overlay expected | **MET** | Dock present on every capture. Spark tile, not Next.js `N`. 375 dock still covers body copy |
| Reject generic card grids | **MET** | None in this set |
| Reject exposed internal enums | **MET** | No `industry:agency`, `crm.client`, snake_case tools, or permission keys in OCR |
| Reject unusable mobile / collisions | **NEAR** | Config wrap is gone. Header still truncates “Northstar C…” and packs seven controls |
| Reject placeholder chrome / excessive whitespace | **NEAR** | 360 and duplicates remain ~90% near-white in the first 900px — same density as the directory ledger (`04` first-900 = 90.1%). Content in the column is no longer a stub |

## Pixel notes

- `01`/`02`/`03` are 1725 tall (was 1784). First-900 white on `01` is **88.5%**. Dock sits over the Ask Flow / Dependency band; CTAs now sit *above* that band, so Save / Submit are in the first viewport.
- `04`/`05` are 4673 tall. Visible names include Acme Robotics, Meridian Health, Northwind Bank, Vantage Logistics, Halcyon Energy, Lumen Studios, Harbor & Pine, Brightline Media / Brightline Media LLC. Not empty.
- `06` is 1047 tall (was 900). First-900 white **89.8%**. Content column x≈284–1155. Two contacts, two timeline lines, two related records, next step — a short editorial 360, not a dashboard.
- `07` is 936 tall. First-900 white **90.8%**. Content column the same width. Comparison occupies the middle of the canvas; side margins are the editorial language, not a missing table.
- `08` header: logo blue cluster x≈62–93, + button x≈203–238. Wordmark + search share the gap. Subtitle clipped to “Northstar C…”.
- `09`/`10` tabs at y≈288–296: Directory, Segments, Duplicates, Config on one line. CLIENT headers follow. No dead Configuration band.
- 375 dock: charcoal capsule, blue spark tile, microphone + grid. No Next.js `N`.

## Critical defects (must fix)

None on the primary bar.

The previous must-fix list is visually cleared on these files: schema dump, Available double-listing, stub 360, fixture duplicate row, Configuration wrap, Next.js `N`.

## Recommendations

- Stop repeating the CRM Core lede under Why. Use Why for a consequence the founder would reject a spreadsheet for.
- When status is Active, do not keep the editorial row under Recommended. Put it in Active.
- Make Submit for approval the only filled blue on the recommended row. Save configuration should be secondary.
- Duplicate review: label the name row, and mark the fields that disagree (Energy vs Food, Lead vs Dormant, two owners).
- 360: replace `.example.test` with demo-plausible addresses, and give health 38 a scale.
- 375 header: menu, mark, one utility cluster. Do not clip the workspace into “Northstar C…”.
- Capture 1440 dark 360/duplicates and a 375 recommended registry if this set is meant to stand as coverage.

## Product-owner approval

Status: pending

No recorded product-owner visual approval was found for BB-00. Visual PASS
cannot be claimed without it, even though the primary score bar is met.
