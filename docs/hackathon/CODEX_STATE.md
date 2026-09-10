# Flow Investor Demo State

Updated: 2026-09-07
Job: `FLOW-MVP-2H-01`
Git baseline: `003add6`

## Path decision

Existing Flow selected. No operational Twenty application or Flow-to-Twenty synchronization path exists in this workspace. Twenty was deferred after the truth gate; Twenty core was not cloned or modified.

## Frozen vertical slice

The Northstar demo has one resettable, server-owned Acme lifecycle:

- Approved Intake: `ns-intake-acme-approved`
- Generated Proposal: `ns-prop-acme-generated`
- Executed Contract: `ns-contract-acme-executed`
- Active Project: `ns-project-acme`
- Six deterministic delivery tasks
- Assigned employee: `ns-res-designer`, Sam Rivera
- Completed task: `ns-task-2`, Acme homepage design

Ask Flow exposes only these registered demo commands:

- `commercial.generate_proposal`
- `delivery.create_project_from_contract`
- `delivery.complete_task`

Workspace, permissions, stable IDs, formulas, execution, and audit remain server-owned. Legacy intent scoring has no signals for these tools. The deterministic command bridge validates the bounded command shape and rechecks authority through `StaticActionWall` before mutation.

## Demo score

No pre-existing Delivery Performance Score formula was found in the repository. The vertical slice therefore uses this documented demo-only formula:

`score = min(100, round(qualityScore / 5 * 60) + round(min(estimatedMinutes / actualMinutes, 1) * 40))`

The UI labels it **Delivery Performance Score (demo)**. It is delivery evidence for this one completed task, not an HR appraisal or a production performance model.

## Runtime

- Web: `http://localhost:3000` via `pnpm --dir apps/web dev`
- Node: `v22.21.0`
- pnpm: `11.16.0`
- Ollama: `0.33.3`
- Frozen planner model: `qwen3:4b-instruct` (`0edcdef34593`)
- Mutation planner used: deterministic fallback; Qwen is unchanged and does not authorize or execute

## Known limits

- Demo lifecycle state is process-memory state and resets when the Next.js server restarts.
- The authenticated production commercial API was not extended in this timed slice.
- Proposal acceptance and contract execution use the controlled demo transition, not an external e-signature flow.
- The demo score formula needs product governance before production use.
- The working tree contains substantial pre-existing user changes; no commit was created.
