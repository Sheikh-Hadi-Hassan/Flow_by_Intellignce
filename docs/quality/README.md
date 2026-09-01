# Flow Quality System

Evidence-enforced quality gates for Cursor agents working on Flow by Intellignce.

## Components

| Component | Location |
|-----------|----------|
| Rules | `.cursor/rules/00-05-*.mdc` |
| Hooks | `.cursor/hooks.json`, `.cursor/hooks/*.mjs` |
| Skills | `.cursor/skills/flow-*/SKILL.md` |
| Subagents | `.cursor/agents/flow-*-reviewer.md` |
| Commands | `.cursor/commands/*.md` |
| Evidence | `.cursor/quality/evidence-manifest.json` |

## Quick start

```bash
# Run hook tests
pnpm quality:hooks:test

# Secret scan
pnpm quality:secret-scan

# Full quality gate
pnpm quality:gate
```

## Closure workflow

1. Complete implementation and tests
2. Run independent reviewer subagents
3. Fill evidence manifest with real artifacts
4. Create verification report in `docs/quality/` or `docs/product-design/`
5. Create closure request only when ready

## Key principle

**Never claim PASS without deterministic evidence.** Unknown means PARTIAL.

See [FLOW_QUALITY_GATES.md](./FLOW_QUALITY_GATES.md) for full gate definitions.
