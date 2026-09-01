# Phase Closure

Complete phase closure with evidence-enforced verdicts.

## Steps

1. Read `.cursor/skills/flow-feature-closure/SKILL.md`
2. Run `/quality-gate` command
3. Run `/visual-audit` command
4. Run `/security-review` command
5. Invoke independent reviewers:
   - `flow-ui-critic`
   - `flow-functional-reviewer`
   - `flow-security-reviewer`
   - `flow-investor-demo-reviewer` (if demo-facing)
6. Create `.cursor/quality/evidence-manifest.json`
7. Create `docs/product-design/<phase>-verification-report.md`
8. Only then create `.cursor/quality/closure-request.json`

## Verdict rules

- Overall PASS requires all mandatory categories PASS
- PARTIAL is honest when blockers remain
- Never forge evidence — the closure guard will deny incomplete PASS
