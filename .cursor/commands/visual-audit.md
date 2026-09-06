# Visual Audit

Run an independent visual audit using the `flow-visual-audit` skill.

## Steps

1. Read `.cursor/skills/flow-visual-audit/SKILL.md`
2. Invoke the `flow-ui-critic` subagent for independent review
3. Capture screenshots at 320, 375, 430, 768, 1440 widths
4. Verify light, dark, and custom accent themes
5. Check console errors and failed network requests
6. Save evidence to `docs/quality/evidence/unapproved-current-state/`
7. Save critic report to `docs/quality/critic-reports/`

## Output

Update `.cursor/quality/evidence-manifest.json` with screenshot paths and visual verdict.

Do not claim visual PASS without product-owner approval and critic score ≥ 8/10.
