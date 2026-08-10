# Flow Universal Execution Spine v1

## Files Created / Modified

Created:

- `packages/contracts/src/execution-engine.ts`
- `packages/contracts/src/execution-engine.test.ts`
- `apps/api/src/internal-actions.controller.ts`
- `apps/api/test/internal-actions.spec.ts`
- `docs/architecture/universal-execution-spine-v1.md`
- `docs/adr/ADR-011-universal-execution-spine.md`

Modified:

- `packages/contracts/src/identity.ts`
- `packages/contracts/src/action-wall.ts`
- `packages/contracts/src/approval.ts`
- `packages/contracts/src/evidence.ts`
- `packages/contracts/src/audit.ts`
- `packages/contracts/src/tool-registry.ts`
- `packages/contracts/src/index.ts`
- existing contract tests
- `apps/api/src/app.module.ts`
- `docs/architecture/architecture-v1.md`
- `docs/security/security-model-v1.md`

## Architecture Implemented

Implemented `ActionExecutionEngine`, the first deterministic Universal Execution Spine:

Actor Context -> Action Request -> Action Wall -> Evidence Validation -> Approval Policy Evaluation -> Tool Registry -> Tool Execution -> Audit Event -> Execution Result.

The engine supports:

- `EXECUTED`
- `DENIED`
- `AWAITING_APPROVAL`
- `FAILED`

Request source is captured as `UI`, `VOICE`, `AI`, `WORKFLOW`, `API`, or `SYSTEM`, but source never grants authority.

## Tests

Contract test matrix covers:

- Allowed execution.
- Cross-workspace denial.
- Explicit authorization denial.
- Approval-required blocking.
- Approved execution.
- Missing required evidence blocking.
- Unknown tool safe failure.
- Invalid input safe failure.
- Tool execution failure audit.
- Correlation ID propagation.
- Denied request audit.
- AI request source receives no privilege.

API proof test covers:

- `POST /internal/actions/execute`
- constrained `system.echo` execution through the real spine.

## Security Properties Proved

- `AI_PERMISSION <= CURRENT_USER_PERMISSION`.
- AI request source does not bypass Action Wall.
- Cross-workspace requests are denied.
- Unknown tools cannot execute.
- Invalid input cannot execute.
- Missing required evidence blocks execution.
- Approval-required actions do not execute before scoped approval.
- Denied and failed attempts create audit events.
- Business logic is not embedded in the executor.
- No provider lock-in was introduced.

## Dependencies Added

None.

## Database Changes

None.

No schema expansion was required for v1 because the requested audit storage abstraction is satisfied by `AuditSink` and `InMemoryAuditSink` for tests/proof.

## API Proof

`POST /internal/actions/execute` is a development architecture proof route. It only registers and executes `system.echo`; it is not a public arbitrary tool-execution API.

## Limitations

- Audit persistence is in-memory only.
- Authorization policy is deterministic but test/in-memory oriented.
- Approval grants are supplied as request context only; there is no approval management store yet.
- Tool input/output schema is a minimal local interface, not a full validation library.
- API proof uses fixed internal dev actor/workspace context and is not production authentication.
- Direct tool handler invocation cannot be perfectly prevented by TypeScript visibility alone; application architecture documents require use of `ActionExecutionEngine`.

## Open Questions

1. Durable authorization policy model.
2. Approval grant persistence and scope validation.
3. Audit event persistence and retention policy.
4. Runtime schema validation library choice.
5. Production Actor Context resolution from authentication/session data.
6. Whether the internal proof route remains after the next phase or moves behind a development-only module flag.

## Verification Results

| Gate | Result |
|---|---|
| `pnpm format:check` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS |
| `pnpm build` | PASS |

## Git Recommendation

The repository has no commits yet. Prefer clean architectural history:

1. Commit Project Initiation v1 first.
2. Commit Universal Execution Spine v1 second.

No commit or push was performed.

