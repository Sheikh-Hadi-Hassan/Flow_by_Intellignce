---
name: flow-evidence-and-audit
description: Use when Flow work involves evidence, provenance, facts versus inference, recommendations, audit logs, state history, undo, rollback, compensating actions, traceability, compliance-facing records, or source-backed AI actions.
---

# Flow Evidence And Audit

## Purpose

Define Flow's evidence, provenance, audit, and rollback conventions. This skill keeps recommendations and actions traceable, distinguishes fact from inference, and records enough history to explain or compensate important changes.

## When To Trigger

- Designing evidence-backed recommendations, document-derived actions, audit logs, state history, undo, rollback, or compensation.
- Extracting facts from contracts, files, conversations, or external systems to propose business actions.
- Reviewing whether an AI recommendation or action has adequate provenance.
- Designing compliance-facing reports or activity history.

## When Not To Trigger

- Purely aesthetic UI work with no evidence display or critical action.
- Internal refactors with no business state, recommendation, or audit effect.
- Simple read-only answers that do not claim business facts or propose actions.

## Required Input / Context

- Source material and trust level.
- Whether each claim is a fact, inference, recommendation, or assumption.
- Related actor, workspace, action, tool, approval, previous state, resulting state, and workflow context.
- Required retention, visibility, and tenant boundaries.
- Shared reference: `../_flow-shared/flow-principles.md`.

## Architectural Invariants

- Never silently convert an assumption into a fact.
- Important recommendations and actions should be traceable to evidence where evidence is applicable.
- Audit records for important actions should include actor, workspace, action, tool, reason, evidence, approval, previous state, resulting state, workflow context, and timestamp.
- Audit history should be append-only or tamper-evident by design.
- Rollback must identify what can be truly reversed and what requires compensation.
- LLM calculations are not authoritative deterministic truth.

## Decision Process

1. Classify each claim as fact, inference, recommendation, or assumption.
2. Link facts to sources and record source trust level.
3. For recommendations, explain reasoning and uncertainty.
4. For actions, capture evidence, approval, actor, tool, state before, and expected state after.
5. Decide whether rollback is true reversal, partial reversal, or compensation.
6. Define retention and visibility by workspace/user permission.
7. Route to `flow-action-wall` if evidence authorizes an action.
8. Route to `flow-workflow-architecture` if evidence affects workflow state.

## Security Requirements

- Evidence visibility must obey tenant, workspace, and user permissions.
- Do not put unauthorized source documents or audit records into model context.
- Redact secrets and sensitive unrelated data from evidence shown to the model or user.
- Use deterministic computation for totals, quantities, balances, formulas, and financial values.

## Common Failure Modes

- Treating a model summary of a contract as the contract fact.
- Losing source links after extracting tasks or invoices.
- Audit records that say what changed but not why, by whom, or under which approval.
- Presenting "undo" for an external email, invoice send, or payment without explaining compensation.
- Letting the LLM calculate invoice totals.

## Prohibited Behavior

- Do not cite evidence that was not actually inspected.
- Do not hide uncertainty or assumptions.
- Do not overwrite audit history.
- Do not use LLM arithmetic as final business truth.
- Do not expose one workspace's evidence or audit records to another workspace.

## Required Output / Review Checklist

For evidence/audit-sensitive work, produce:

- Claim classification: fact, inference, recommendation, assumption.
- Evidence references and trust level.
- Gaps, uncertainty, and assumptions.
- Action/audit fields required.
- Deterministic computation requirements.
- Rollback versus compensation classification.
- Visibility and retention boundaries.
- Related Flow skills to load next, if any.

## Related Generic Installed Skills

`supabase-postgres-best-practices`, `workflow`, `verification-before-completion`, `test-driven-development`, `threat-model`.

## Authoritative Flow Document References

- `.codex-reports/flow-codex-custom-skills-plan-v1.md`
- `.codex-reports/flow-codex-context-strategy-v1.md`
- `.codex/skills/_flow-shared/flow-principles.md`
- `.codex/skills/_flow-shared/flow-skill-router.md`

