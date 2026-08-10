---
name: flow-workflow-architecture
description: Use when designing Flow workflows, long-running processes, approval chains, queues, retries, resumability, state transitions, idempotency, workflow evidence, agentic jobs, rollback, or compensating actions.
---

# Flow Workflow Architecture

## Purpose

Define Flow's durable business workflow model independently of any runtime. This skill keeps long-running and agentic processes stateful, resumable, auditable, permission-aware, and recoverable.

## When To Trigger

- Designing workflow engines, business processes, approval chains, background jobs, queues, scheduled jobs, or agentic workflows.
- Adding retries, durable waits, human-in-loop steps, idempotent actions, external side effects, or compensating operations.
- Modeling state transitions, workflow history, or workflow-level evidence.
- Evaluating Temporal, Cloudflare Workflows, queues, cron, or other execution runtimes.

## When Not To Trigger

- Single synchronous CRUD operations with no multi-step state.
- Pure UI flow that does not alter backend workflow state.
- Runtime-specific implementation after the workflow contract is already approved.

## Required Input / Context

- Workflow goal, trigger, actor, workspace, and involved resources.
- States, transitions, side effects, and terminal conditions.
- Required permissions, evidence, approvals, audit fields, and rollback/compensation rules.
- Timeout, retry, idempotency, concurrency, and resumability requirements.
- Shared reference: `../_flow-shared/flow-principles.md`.

## Architectural Invariants

- Critical workflow actions are draft-first or approval-controlled.
- Workflow steps with side effects must be idempotent or protected by idempotency keys.
- Durable waits and resumability must be explicit capability requirements.
- Every state transition should have a reason and actor/system source.
- External side effects may require compensation instead of true rollback.
- Workflow runtime is selected after the state model and invariants are clear.

## Decision Process

1. Define the workflow type: micro-action, human approval process, background job, document-to-action process, agentic workflow, or long-running business process.
2. Model states, transitions, guards, and terminal outcomes.
3. Mark side-effecting steps and required Action Wall checks.
4. Define evidence required before each important decision or action.
5. Define retry, timeout, idempotency, concurrency, and resumability rules.
6. Define audit and state history records.
7. Define rollback or compensating actions.
8. Only then choose runtime-specific implementation guidance.

## Security Requirements

- Permissions are checked at execution time, not only at workflow start.
- Approval scope must be preserved across pauses and resumes.
- Workflow context must not cross workspace boundaries.
- Retried steps must not duplicate external side effects.
- Secrets and provider credentials must remain outside model context.

## Common Failure Modes

- Treating a workflow as a chain of prompts with no persisted state.
- Losing permission context after a pause.
- Retrying an email, invoice, payment, or external action without idempotency.
- Calling "undo" on an irreversible external side effect without a compensating plan.
- Choosing Temporal or Cloudflare before knowing required workflow semantics.

## Prohibited Behavior

- Do not implement durable business workflows as untracked chat history.
- Do not rely on the LLM to remember state as the source of truth.
- Do not skip approval checks after workflow resume.
- Do not hide failed steps or compensating actions from audit history.

## Required Output / Review Checklist

For workflow designs, produce:

- Workflow type, trigger, actor, and workspace.
- State machine with guards and terminal states.
- Permission checks and approval points.
- Evidence needed per decision/action.
- Idempotency, retry, timeout, and concurrency rules.
- Audit/state history requirements.
- Rollback or compensation plan.
- Runtime capabilities required and provider-specific skills to load later.

## Related Generic Installed Skills

`workflow`, `temporal-developer` on demand, `test-driven-development`, `mcp-builder`, `threat-model`, `verification-before-completion`.

## Authoritative Flow Document References

- `.codex-reports/flow-codex-security-gates-v1.md`
- `.codex-reports/flow-codex-skill-router-v1.md`
- `.codex/skills/_flow-shared/flow-principles.md`
- `.codex/skills/_flow-shared/flow-skill-router.md`

