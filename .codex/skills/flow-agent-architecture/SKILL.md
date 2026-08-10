---
name: flow-agent-architecture
description: Use when designing Flow agents, tool registry, MCP tools, conversational CRUD, agent micro-actions, agent memory, planning/execution separation, provider abstraction, tool permissions, or agent observability.
---

# Flow Agent Architecture

## Purpose

Define Flow's agent, tool, and memory architecture before choosing a provider runtime. This skill keeps agents scoped, observable, permission-aware, and separated from direct execution authority.

## When To Trigger

- Designing agents, assistant roles, planners, executors, tool registries, MCP servers, or tool contracts.
- Adding conversational CRUD, agent micro-actions, memory, automated recommendations, or tool-calling flows.
- Evaluating agent providers, hosted MCP, Cloudflare Agents, OpenAI, or other agent runtimes.
- Reviewing whether an agent can perform an operation or must draft/request it.

## When Not To Trigger

- Pure backend CRUD with no AI/tool involvement.
- Provider-specific coding after the agent contract and authority model are already approved.
- General workflow design with no agent or tool boundary.

## Required Input / Context

- Agent purpose and allowed user/workspace scope.
- Tool contracts, input/output schemas, side effects, and error behavior.
- Memory type: global, workspace-local, user-personal, or transient task context.
- Required evidence, approval, audit, and observability.
- Shared references: `../_flow-shared/flow-principles.md` and `../_flow-shared/flow-skill-router.md`.

## Architectural Invariants

- Agents plan and request; controlled tools/domain services execute.
- Agents cannot exceed the current user's permission.
- Every side-effecting tool must declare permission requirements, evidence requirements, idempotency expectations, audit fields, and rollback or compensation behavior.
- Tool access should be scoped by actor, workspace, resource, action, and environment.
- Memory must obey tenant and user boundaries.
- Provider runtime is an adapter decision, not the Flow agent model.

## Decision Process

1. Classify the agent role: planner, recommender, drafter, executor-through-tool, monitor, or reviewer.
2. Define tool registry entries with action, resource, schema, side effect, permission, evidence, approval, audit, and rollback metadata.
3. Separate model reasoning from deterministic validation and execution.
4. Define memory scope and retention rules.
5. Define observability: tool calls, decisions, failures, denials, approvals, and results.
6. Route to `flow-action-wall` for authority-sensitive tools.
7. Route to `flow-evidence-and-audit` for recommendation/action traceability.
8. Only then use provider-specific skills for implementation.

## Security Requirements

- Do not give agents service-role credentials, unrestricted database access, or broad filesystem/external-service authority.
- Validate all tool inputs server-side.
- Treat model output as untrusted until checked by deterministic policy and schema validation.
- Keep unauthorized workspace/user memory out of context.

## Common Failure Modes

- Designing a "super agent" with broad implicit authority.
- Letting model prompts define tool permissions.
- Treating MCP/tool descriptions as security controls.
- Mixing personal, workspace, and global memory.
- Optimizing for provider demos instead of Flow's Action Wall.

## Prohibited Behavior

- Do not make provider-specific agent SDKs the architecture authority.
- Do not let agents write arbitrary database rows directly.
- Do not skip schemas, permission metadata, or audit metadata for internal tools.
- Do not treat tool success as evidence that the action was authorized.

## Required Output / Review Checklist

For agent/tool designs, produce:

- Agent role and non-role.
- User/workspace/data scope.
- Tool registry entries and side effects.
- Permission and approval requirements.
- Evidence and audit requirements.
- Memory scope and retention.
- Failure, denial, retry, and compensation behavior.
- Provider-neutral contract and optional provider implementation skills.

## Related Generic Installed Skills

`mcp-builder`, `workflow`, `agents-sdk` on demand, `building-ai-agent-on-cloudflare` on demand, `building-mcp-server-on-cloudflare` on demand, `threat-model`, `agentic-actions-auditor`.

## Authoritative Flow Document References

- `.codex-reports/flow-codex-custom-skills-plan-v1.md`
- `.codex-reports/flow-codex-skill-router-v1.md`
- `.codex/skills/_flow-shared/flow-principles.md`
- `.codex/skills/_flow-shared/flow-skill-router.md`

