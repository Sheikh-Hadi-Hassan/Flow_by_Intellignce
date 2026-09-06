# Investor Demo Checklist

Evaluate the Northstar Creative demo journey before investor-facing presentations.

## 30-second test

- [ ] Mission Control communicates business health at a glance
- [ ] Value proposition clear without explanation
- [ ] No embarrassing empty screens
- [ ] No internal engineering jargon visible

## 5–10 minute journey

| Step | Screen | Pass criteria |
|------|--------|---------------|
| 1 | Mission Control | Real signals, not fake metrics |
| 2 | Pipeline | Opportunities with readable status |
| 3 | Opportunity detail | Coherent discovery → proposal → contract |
| 4 | Project delivery | Active project with milestones |
| 5 | Team / capacity | Readable resource presentation |
| 6 | My Work | Populated employee view |
| 7 | Ask Flow | Real answers with Proof labels |
| 8 | Reports | Meaningful data (not placeholder) |

## Reject for investor demo

- Empty states on primary path
- Raw forms dominating list views
- Exposed enum values (`founder_review`, etc.)
- Placeholder report pages
- AI claims without Proof/source
- Product looks like internal admin CRUD

## Reviewer

Invoke `flow-investor-demo-reviewer` subagent before demo.
Save report to `docs/quality/critic-reports/investor-demo-reviewer-<date>.md`.

## Verdict

- **PASS** — investor-ready, no embarrassing moments
- **PARTIAL** — usable but needs polish
- **FAIL** — not safe to demo
