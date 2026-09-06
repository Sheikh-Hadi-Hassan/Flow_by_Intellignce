# Flow Quality Gates

## Mandatory gates before overall PASS

| Gate | Command / evidence | Blocks PASS if |
|------|-------------------|----------------|
| Typecheck | `pnpm typecheck` | Any error |
| Lint | `pnpm lint` | Any error |
| Unit tests | `pnpm test` | Any failure |
| Build | `NODE_ENV=production pnpm build` | Any failure |
| Hook tests | `pnpm quality:hooks:test` | Any failure |
| Secret scan | `pnpm quality:secret-scan` | Secret detected |
| Skipped tests | E2E output | `skippedTestCount > 0` |
| Visual critic | `flow-ui-critic` report | Score < 8 or no PO approval |
| Functional review | `flow-functional-reviewer` | Journey broken |
| Security review | `flow-security-reviewer` | RLS/auth failure |
| Browser journey | Playwright E2E | Console errors |
| Independent evaluator | Evidence manifest | Builder is only evaluator |

## Verdict categories

Each must be independently assessed:

1. **Functionality** — features work as specified
2. **Visual design** — meets visual acceptance checklist
3. **Accessibility** — axe serious/critical + keyboard review
4. **Security** — auth, RLS, secrets, cross-tenant
5. **Data integrity** — migrations, calculations, immutability
6. **Browser verification** — E2E journeys, console clean
7. **Performance** — build size, load time, or explicit N/A

## CI enforcement

GitHub Actions runs: install, typecheck, lint, test, build, hook tests, secret scan, accessibility tests (when server available), Storybook build (when installed).

## Visual baseline policy

- Visual regression snapshots in `apps/web/e2e/visual/snapshots/` require PO approval marker
- Marker file: `.cursor/quality/visual-baseline-approved.json`
- Agents must NOT run `--update-snapshots` without explicit PO approval
- Current UI captures go to `docs/quality/evidence/unapproved-current-state/` only
