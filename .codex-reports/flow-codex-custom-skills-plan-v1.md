# FLOW-SPECIFIC SKILLS PLAN v1

Do not create many tiny Flow skills. Create a small architectural layer that captures Flow-specific rules, then keep generic skills on demand for implementation details.

| Name | Purpose | When Triggered | Required Knowledge | Rules It Must Enforce | Existing Generic Skills It Complements | Existing Skills It Could Replace | Should Create? |
|---|---|---|---|---|---|---|---|
| flow-system-architect | Authoritative Flow product/architecture guardrails across modules, tenants, agents, workflows, tools, evidence, approvals, memory, and business rules. | Architecture, module design, major feature planning, cross-cutting decisions. | Flow product principles, target customers, modularity, AI_PERMISSION rule, portability. | No provider lock-in; deterministic backend security; action/evidence/approval first; modular business entities. | writing-plans, workflow, supabase-postgres-best-practices, mcp-builder | Could replace repeated loading of writing-plans plus scattered architecture notes for Flow-specific decisions. | YES |
| flow-action-wall | Action authorization model for AI/user/tool operations. | Any external side effect, critical CRUD, approval flow, tool execution, or agent micro-action. | Permission model, draft-first actions, approval policies, audit logs, rollback. | AI_PERMISSION <= CURRENT_USER_PERMISSION; prompt is not boundary; backend enforces; actions need evidence and undo plan. | threat-model, agentic-actions-auditor, supabase-postgres-best-practices | Could replace repeated custom prompts about action wall/security invariants. | YES |
| flow-agent-architecture | Flow-specific agent/tool/memory architecture. | Agent design, tool registry, conversational CRUD, memory, micro-actions. | Agent roles, tool contracts, evidence, permissions, scoped memory. | Agents use tools only through contracts; cannot exceed user permission; every action has provenance. | mcp-builder, workflow, agents-sdk on-demand | Could replace provider-specific agent skills for early architecture. | YES |
| flow-workflow-architecture | Durable business workflow architecture for Flow. | Long-running processes, approval chains, queues, retries, compensating actions. | Workflow states, idempotency, retries, auditability, human-in-loop. | Critical actions draft first; idempotent steps; rollback or compensation required; evidence retained. | workflow, temporal-developer on-demand, test-driven-development | Could replace generic workflow context for Flow-specific rules. | YES |
| flow-evidence-and-audit | Evidence, provenance, audit log, and rollback conventions. | Recommendations/actions/evidence trails, audit/undo work, compliance-facing features. | Evidence schema principles, provenance types, immutable audit logs, rollback semantics. | No recommendation/action without source trace; audit logs immutable; rollback explicit. | supabase-postgres-best-practices, workflow, verification-before-completion | Could replace repeated evidence/audit reminders in task prompts. | YES |
| flow-ui-system | Flow-specific frontend philosophy and product UX rules. | New Flow UI surfaces, major redesign, dashboard/workspace interfaces. | Target users, custom BOS UX, dense operational UI, action wall UX, evidence display. | Do not copy ERP UI; support conversation-first plus structured controls; critical actions visibly gated. | frontend-design, react-best-practices, frontend-design-review | Could replace broad creative design skill for routine Flow UI once established. | LATER |

## Recommended Creation Order

1. `flow-system-architect`
2. `flow-action-wall`
3. `flow-agent-architecture`
4. `flow-workflow-architecture`
5. `flow-evidence-and-audit`
6. `flow-ui-system` after UI direction is documented
