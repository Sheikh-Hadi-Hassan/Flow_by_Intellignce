# Flow Project Guidance

Use the relevant project-local Flow skill before architectural work:

- `.codex/skills/flow-system-architect/SKILL.md` for system/module/provider decisions.
- `.codex/skills/flow-action-wall/SKILL.md` for authorization, tenant isolation, tools, approvals, and side effects.
- `.codex/skills/flow-agent-architecture/SKILL.md` for agents, tools, MCP, and memory.
- `.codex/skills/flow-workflow-architecture/SKILL.md` for durable workflows, retries, approvals, and compensation.
- `.codex/skills/flow-evidence-and-audit/SKILL.md` for provenance, audit, rollback, and evidence.

Execution rules:

- Inspect before modifying.
- Keep changes scoped to the requested phase.
- Respect module boundaries.
- Never bypass the Action Wall.
- Never expose cross-tenant data.
- Never expose secrets or service-role keys.
- Do not add dependencies without documenting purpose, license, boundary, and replacement difficulty.
- Test meaningful changes.
- Verify before claiming completion.
- Document architectural changes with ADRs.
