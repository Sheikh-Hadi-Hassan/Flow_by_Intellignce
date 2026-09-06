---
name: flow-visual-audit
description: Live browser visual audit with screenshots, responsive checks, and critic scoring. Use when evaluating UI quality, preparing visual evidence, or before claiming visual PASS on any phase or feature.
disable-model-invocation: true
---

# Flow Visual Audit

## Prerequisites

- Live browser (cursor-ide-browser or Playwright)
- Northstar demo or authenticated workspace with real data
- Light, dark, and custom accent themes available

## Workflow

1. **Inspect live** — navigate each screen; do not rely on code review alone.
2. **Console review** — record console errors and failed network requests.
3. **Screenshot** at widths: 320, 375, 430, 768, 1440.
4. **Themes** — capture light, dark, custom accent for each critical screen.
5. **Keyboard** — tab through primary actions; note focus traps and unreachable controls.
6. **States** — verify loading, empty, and error states (not just happy path).
7. **Overflow** — check for horizontal scroll and text collisions.
8. **Score** each screen 0–10 with explicit defect list.

## Scoring rules

- **No visual PASS below 8/10** on any primary journey screen.
- Reject: raw bullet lists, bare links as lists, exposed enums, placeholder reports, fake metrics, generic CRUD, desktop-only layouts.
- No self-congratulatory language in reports.

## Output

Save report to `docs/quality/critic-reports/ui-critic-<date>.md`:

```markdown
# UI Critic Report

## Screens reviewed
| Screen | Score | Verdict |
|--------|-------|---------|

## Defects
- [severity] description — viewport — theme

## Console/network issues

## Product-owner approval
Status: pending | approved | rejected
```

Record screenshot paths in `.cursor/quality/evidence-manifest.json`.
