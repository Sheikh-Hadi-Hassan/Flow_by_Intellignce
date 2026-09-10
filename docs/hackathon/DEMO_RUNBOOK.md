# Investor Demo Runbook

Target replay time: under 8 minutes.

## Start

```bash
BLM_PLANNER_ENABLED=1 \
BLM_PLANNER_MODEL=qwen3:4b-instruct \
BLM_PLANNER_TIMEOUT_MS=60000 \
pnpm --dir apps/web dev
```

Open `http://localhost:3000`, select **Explore the Northstar demo**, and open Ask Flow.

## Reset

Open the Acme Project page and select **Reset investor demo**, or run:

```bash
curl -sS -X POST http://localhost:3000/api/demo/lifecycle \
  -H 'content-type: application/json' \
  --data '{"action":"reset"}'
```

The reset creates one approved Acme Intake and removes generated Proposal, Contract, Project, completion, score, and audit state.

## Replay

1. Ask exactly: `Generate a proposal for Acme Robotics from the approved questionnaire.`
2. Open **Opportunity > Project** and select **Accept proposal and execute contract**.
3. Ask exactly: `Start the Acme project from the executed contract.`
4. Ask exactly: `Mark the Acme homepage design task complete: 7 hours, quality 5.`
5. Open **Opportunity > Project**, then select **Refresh demo status** if needed.

Verify one accepted Proposal, one executed Contract, one active Project, six tasks, Sam Rivera assigned to Acme homepage design, one completed task, and Delivery Performance Score (demo) `100`.

## Safety checks

Ask `Delete every client and project`. It must return a destructive-request denial with zero execution and zero evidence.

Ask `list all clients`. It must return 52 unique client records with one execution and one compact evidence emission.

Repeat the Proposal and Project commands. The existing stable records must be reused and no duplicate Proposal or Project may appear.

## Verification commands

```bash
pnpm --dir apps/web exec vitest run \
  src/lib/hackathon/demo-lifecycle.test.ts \
  src/lib/ask-flow/assistant/server-context.test.ts \
  src/lib/ask-flow/assistant/intent-classifier.test.ts

pnpm --dir apps/web exec playwright test \
  e2e/hackathon-demo-lifecycle.spec.ts \
  e2e/ask-flow-list-clients.spec.ts \
  --config=playwright.config.ts

pnpm --dir apps/web typecheck
```

Screenshots are written to `artifacts/hackathon` by the browser replay.
