# Visual test infrastructure

Playwright visual tests for Flow web app.

## Modes

### Audit evidence (`visual-audit.spec.ts`)

Captures **unapproved current state** screenshots to:

```text
docs/quality/evidence/unapproved-current-state/
```

These are audit artifacts only — not approved visual baselines.

### Regression (`visual-regression.spec.ts`)

Compares against snapshots in `snapshots/` **only when** the product owner has approved baselines:

```text
.cursor/quality/visual-baseline-approved.json
```

## Safeguards

- Agents must **NOT** run `--update-snapshots` without PO approval
- CI fails if snapshots change without approval marker
- Current poor UI is not the permanent baseline

## Deterministic settings

- Fixed viewport (1440×900 default)
- `prefers-reduced-motion: reduce`
- Stable fonts via app CSS
- Chromium only

## Run

```bash
# Audit capture (no baseline comparison)
npx pnpm@11.16.0 --filter @flow/web test:e2e --grep "visual audit"

# Regression (requires approval marker + existing snapshots)
npx pnpm@11.16.0 --filter @flow/web test:e2e --grep "visual regression"
```

## Baseline approval

Product owner creates `.cursor/quality/visual-baseline-approved.json`:

```json
{
  "approved": true,
  "approvedBy": "product-owner",
  "approvedAt": "2026-09-01T00:00:00.000Z",
  "screens": ["mission-control", "pipeline"]
}
```
