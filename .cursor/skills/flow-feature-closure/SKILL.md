---
name: flow-feature-closure
description: Phase and feature closure with evidence manifest, independent reviewer reports, and honest PASS/PARTIAL/FAIL verdicts. Use when completing a phase, preparing a verification report, or before pushing feature work.
disable-model-invocation: true
---

# Flow Feature Closure

## Closure checklist

```
- [ ] Requirements mapped to implementation
- [ ] Functional tests pass (record counts)
- [ ] API/database evidence captured
- [ ] Browser journey verified
- [ ] Accessibility (axe + keyboard notes)
- [ ] Visual review (independent critic, score ≥ 8)
- [ ] Security review (RLS, cross-tenant, secrets)
- [ ] Performance noted or N/A
- [ ] Independent critic reports filed
- [ ] Evidence manifest complete
- [ ] Product-owner visual approval (if claiming visual PASS)
```

## Evidence manifest

Create `.cursor/quality/evidence-manifest.json`:

```json
{
  "overallVerdict": "PARTIAL",
  "verdicts": {
    "functionality": "PASS",
    "visual": "PARTIAL",
    "accessibility": "PARTIAL",
    "security": "PASS",
    "dataIntegrity": "PASS",
    "browser": "PASS",
    "performance": "PASS"
  },
  "commandsRun": [],
  "testCounts": { "passed": 0, "failed": 0, "total": 0 },
  "skippedTestCount": 0,
  "screenshotPaths": [],
  "criticReports": [],
  "productOwnerVisualApproval": false,
  "secretScanPassed": true,
  "browserConsoleErrors": false,
  "builderAgentId": "agent-id",
  "evaluatorAgentIds": ["independent-critic-id"]
}
```

## Verdict rules

- **PASS** — all mandatory categories PASS, zero skipped tests, complete evidence.
- **PARTIAL** — some categories unverified or below threshold; document blockers.
- **FAIL** — mandatory gate failed; do not push or merge.

## Closure guard

Only create `.cursor/quality/closure-request.json` when ready for automated review.
The closure guard will deny forged or incomplete PASS claims.

## Invoke reviewers

- `flow-ui-critic` — visual
- `flow-functional-reviewer` — journeys
- `flow-security-reviewer` — auth/RLS
- `flow-investor-demo-reviewer` — demo quality
