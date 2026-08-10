# FLOW-SPECIFIC CODEX SKILLS v1

Scope: project-local Codex skill layer only. No application code, framework scaffold, database schema, deployment, global Codex configuration, or third-party skill was modified.

## Skills Created

| Skill | Path | Purpose | Primary Triggers |
|---|---|---|---|
| `flow-system-architect` | `.codex/skills/flow-system-architect/SKILL.md` | Protects Flow's modular architecture, provider neutrality, domain boundaries, and architectural decision quality. | Architecture, modules, provider choices, major features, agents, workflows, tools, permissions, evidence, approvals, memory. |
| `flow-action-wall` | `.codex/skills/flow-action-wall/SKILL.md` | Defines Flow authorization, tenant isolation, approval, controlled execution, and AI permission boundaries. | Authorization, tenant isolation, critical CRUD, external side effects, tool execution, approvals, Action Wall design. |
| `flow-agent-architecture` | `.codex/skills/flow-agent-architecture/SKILL.md` | Defines Flow's provider-neutral agent, tool registry, MCP/tool, memory, and agent micro-action model. | Agents, tool registry, MCP tools, conversational CRUD, memory, planning/execution separation, agent observability. |
| `flow-workflow-architecture` | `.codex/skills/flow-workflow-architecture/SKILL.md` | Defines durable workflow, retry, resumability, approval-chain, idempotency, rollback, and compensation rules. | Long-running processes, workflows, queues, retries, state transitions, approvals, agentic jobs, compensating actions. |
| `flow-evidence-and-audit` | `.codex/skills/flow-evidence-and-audit/SKILL.md` | Defines evidence, provenance, fact/inference/recommendation separation, audit logs, state history, and rollback conventions. | Evidence, provenance, recommendations, audit logs, state history, undo, rollback, traceability, source-backed actions. |

## Shared References

| Reference | Purpose |
|---|---|
| `.codex/skills/_flow-shared/flow-principles.md` | Shared Flow product context, non-negotiable invariants, controlled action path, and instruction precedence. |
| `.codex/skills/_flow-shared/flow-skill-router.md` | Routing rules for loading the smallest useful combination of Flow-specific and generic skills. |

## Generic Skills Complemented

The Flow-specific skills define what Flow requires. Generic installed skills remain implementation aids:

- `writing-plans` for scoped planning.
- `systematic-debugging` for causal debugging.
- `test-driven-development` for behavior-first implementation.
- `verification-before-completion` for completion evidence.
- `supabase` and `supabase-postgres-best-practices` for current database/backend implementation details.
- `mcp-builder` for MCP/tool implementation.
- `workflow` and `temporal-developer` for workflow implementation when relevant.
- `threat-model`, `security-diff-scan`, and `agentic-actions-auditor` for checkpoint security review.
- Provider skills only after an explicit provider target exists.

## Conflicts Resolved

| Conflict | Resolution |
|---|---|
| Provider skills could bias architecture toward Cloudflare, Vercel, Supabase, Temporal, or OpenAI. | Flow skills define capability requirements first; provider skills are on-demand implementation aids. |
| Authentication provider guidance could be mistaken for authorization architecture. | `flow-action-wall` is authority for permissions, tenant isolation, approvals, and execution boundaries. |
| Agent SDK examples could encourage broad agent authority. | `flow-agent-architecture` requires scoped tools, server-side validation, audit metadata, and Action Wall checks. |
| Workflow runtime guidance could appear before workflow semantics. | `flow-workflow-architecture` requires states, guards, retries, idempotency, approvals, and compensation before runtime choice. |
| Evidence and audit requirements could be scattered across prompts. | `flow-evidence-and-audit` centralizes fact/inference/recommendation/assumption separation and audit fields. |
| Repeating Flow invariants in every skill could waste context and drift. | Shared references hold common invariants; each skill contains only task-specific rules. |

Conflicts resolved: 6.

## Validation Scenario Results

| Scenario | Expected Behavior | Result |
|---|---|---|
| Give the AI direct database write access because it is faster. | Reject or challenge; actions must route through controlled tools/domain services and Action Wall boundaries. | PASS |
| Employee A asks AI to update Employee B attendance. | Require backend authorization check; deny unless Employee A has actual permission. | PASS |
| Use this contract to create the client, project, invoices and schedule. | Treat contract as evidence; extract/plan; propose controlled operations; require permissions, approvals, and audit trail. | PASS |
| Use Cloudflare everywhere because we may deploy there. | Reject unnecessary provider coupling unless documented ADR approves it. | PASS |
| The LLM calculated the invoice total. | Reject as authoritative truth; require deterministic calculation. | PASS |
| Always allow sending invoices. | Require scoped approval policy; never interpret as unlimited authority. | PASS |
| A workflow sent an external email and user presses Undo. | Recognize true rollback may be impossible; design compensating action/state handling. | PASS |

Validation: PASS.

## Self-Review

- Duplicate instructions: acceptable. Shared invariants live in shared references; skill bodies repeat only the minimum local checks needed for trigger-time safety.
- Contradictory instructions: none found.
- Provider bias: none found. Provider names appear only as examples, candidates, or on-demand implementation skills.
- Excessive size: each `SKILL.md` is under 110 lines.
- Trigger clarity: each skill has frontmatter triggers plus explicit when-to-trigger and when-not-to-trigger sections.
- Security gaps: the five skills cover Action Wall, tenant isolation, tool-controlled execution, evidence, approval, audit, rollback/compensation, and deterministic computation.
- Ambiguous authority: precedence is defined in the shared principles reference.
- Over-abstraction: skills require interfaces/adapters only where they protect stable Flow boundaries.

## Remaining Concerns

1. Project-local skill discovery should be confirmed in the next Codex session because this workspace did not already contain a project-local skills convention.
2. `flow-ui-system` remains intentionally uncreated because the approved plan marked it `LATER`.
3. Flow Architecture v1 still needs to define ADR conventions, module boundaries, and the first concrete permission/tool/workflow contracts.

Open questions: 3.

## Recommended Next Step

Flow Architecture v1.

Do not execute this next step until explicitly approved.

