# Security Review

Run an independent security review before database or API closure.

## Steps

1. Read `.cursor/skills/flow-supabase-safety/SKILL.md`
2. Invoke the `flow-security-reviewer` subagent
3. Verify authorization, RLS, cross-tenant denial
4. Run `node .cursor/hooks/secret-scan.mjs`
5. Confirm Supabase project is `zuvtnmmnwohrapaecsuj`

## Evidence

Save report to `docs/quality/critic-reports/security-reviewer-<date>.md`

Update evidence manifest security verdict.
