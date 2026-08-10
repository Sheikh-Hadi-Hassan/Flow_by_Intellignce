# Flow Skill Interaction Router

Load the smallest useful set of Flow-specific skills for the task. Do not load every Flow skill by default.

## Routing Rules

| Task Signal | Required Flow Skill | Add When Needed |
|---|---|---|
| Product architecture, module boundaries, stack choice, provider choice, major feature planning | `flow-system-architect` | `flow-action-wall` for permissions or side effects |
| Authorization, tenant isolation, action approval, sensitive CRUD, tool execution | `flow-action-wall` | `flow-evidence-and-audit` when evidence or audit model is involved |
| Agent roles, tool registry, conversational CRUD, memory, agent micro-actions, MCP/tool design | `flow-agent-architecture` | `flow-action-wall` for authority, `flow-evidence-and-audit` for provenance |
| Long-running workflow, retry, wait, approval chain, queue, resumability, compensating operation | `flow-workflow-architecture` | `flow-action-wall` for approval, `flow-evidence-and-audit` for traceability |
| Evidence model, provenance, audit log, state history, undo, rollback, recommendation source trace | `flow-evidence-and-audit` | `flow-workflow-architecture` for process state |

## Generic Skill Composition

Flow skills define what Flow requires. Generic installed skills help with how to implement those requirements.

Use generic skills only when their task is active:

- Planning: `writing-plans`.
- Debugging: `systematic-debugging`.
- Verification: `verification-before-completion`.
- TDD: `test-driven-development`.
- Supabase/Postgres/RLS: `supabase`, `supabase-postgres-best-practices`.
- Tool/MCP implementation: `mcp-builder`.
- Workflow implementation: `workflow`, `temporal-developer` only if Temporal is selected.
- Security review: `threat-model`, `security-diff-scan`, `agentic-actions-auditor`.
- Frontend: `frontend-design`, `react-best-practices`, `nextjs`.

## Provider Neutrality

Cloudflare, Vercel, Supabase, Temporal, OpenAI, and other providers may be candidates, but Flow-specific skills should define capability requirements first. Provider-specific skills are on-demand implementation aids, not architecture authorities.

