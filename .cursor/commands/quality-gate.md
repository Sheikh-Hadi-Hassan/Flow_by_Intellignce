# Quality Gate

Run mandatory quality gates before any closure claim.

## Commands

```bash
npx pnpm@11.16.0 install
npx pnpm@11.16.0 typecheck
npx pnpm@11.16.0 lint
npx pnpm@11.16.0 test
NODE_ENV=production npx pnpm@11.16.0 build
node --test .cursor/hooks/tests/*.test.mjs
node .cursor/hooks/secret-scan.mjs
```

## Optional (when credentials available)

```bash
FLOW_E2E_COMMERCIAL=1 npx pnpm@11.16.0 --filter @flow/web test:e2e --workers=1
npx pnpm@11.16.0 --filter @flow/web test:e2e --grep accessibility
```

## Record results

Update `docs/quality/evidence-manifest.json` with command outputs and test counts.

Use the `flow-feature-closure` skill for full closure workflow.
