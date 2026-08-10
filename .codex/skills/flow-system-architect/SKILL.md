---
name: flow-system-architect
description: Use when designing Flow architecture, modules, domain boundaries, provider choices, major features, business entities, skills, agents, tools, workflows, permissions, evidence, approvals, memory, or cross-cutting product decisions.
---

# Flow System Architect

## Purpose

Protect Flow's modular AI-native Business Operating System architecture. Use this skill to keep architectural decisions portable, permission-aware, evidence-aware, and grounded in Flow's product model instead of provider convenience.

## When To Trigger

- Designing or changing Flow modules, business entities, domain boundaries, or cross-module contracts.
- Choosing or evaluating providers, frameworks, runtimes, workflow engines, AI vendors, or storage systems.
- Planning major features involving agents, tools, workflows, approvals, evidence, audit, memory, or business rules.
- Reviewing whether a proposed shortcut creates coupling, permission leakage, or future migration risk.

## When Not To Trigger

- Small local bug fixes with no architectural implication.
- Pure UI polish unless it affects Flow product identity or critical action UX.
- Provider-specific implementation after an ADR has already selected that provider.

## Required Input / Context

- The user goal and task scope.
- Existing ADRs or project docs if they exist.
- Relevant module/domain context from source code or plans.
- Shared references when needed: `../_flow-shared/flow-principles.md` and `../_flow-shared/flow-skill-router.md`.

## Architectural Invariants

- Flow core must not be coupled to one industry, AI provider, cloud, workflow engine, UI framework, or business module without an approved ADR.
- Security, permissions, execution, and mathematical truth belong in deterministic systems, not prompt instructions.
- AI actions must pass through controlled tools or domain services.
- Architecture must preserve tenant isolation and workspace/user skill boundaries.
- Build abstractions only when they remove real coupling or represent a stable Flow concept.

## Decision Process

1. Identify the Flow capability being designed: module, entity, tool, agent, workflow, evidence, approval, memory, or UI surface.
2. Name the authority boundary: frontend, backend service, database/RLS, workflow engine, tool registry, or external provider.
3. Check whether the decision affects permissions, data scope, evidence, audit, rollback, or deterministic computation.
4. Prefer capability interfaces over provider-specific assumptions.
5. Decide whether an ADR is required. Require one for provider lock-in, irreversible data model choices, security model changes, workflow runtime choices, and cross-module contracts.
6. Route to another Flow skill only if needed: Action Wall for authority, Agent Architecture for tools/agents, Workflow Architecture for durable processes, Evidence/Audit for traceability.

## Security Requirements

- Apply `AI_PERMISSION <= CURRENT_USER_PERMISSION`.
- Treat prompt-only authorization as invalid.
- Keep unauthorized data out of model context where practical.
- For permission-sensitive architecture, require backend enforcement and a security gate.

## Common Failure Modes

- Choosing Cloudflare, Vercel, Supabase, Temporal, or OpenAI because a skill exists rather than because an ADR justifies it.
- Treating authentication as authorization.
- Letting agents bypass domain services and write directly to database state.
- Creating generic abstractions before there is a stable Flow concept.
- Hiding business rules in frontend or prompt text.

## Prohibited Behavior

- Do not start app scaffolding, package installation, database creation, deployment, or feature implementation from this skill alone.
- Do not approve broad provider lock-in without an ADR.
- Do not weaken Action Wall, tenant isolation, evidence, audit, or deterministic computation requirements to satisfy a framework recommendation.

## Required Output / Review Checklist

For architecture decisions, produce:

- Decision summary.
- Affected Flow capability and boundary.
- Provider-neutral capability requirement.
- Permission, tenant, evidence, audit, rollback, and deterministic computation impact.
- ADR needed: yes/no with reason.
- Generic skills to load next, if any.
- Open risks or assumptions.

## Related Generic Installed Skills

`writing-plans`, `workflow`, `mcp-builder`, `supabase-postgres-best-practices`, `threat-model`, `verification-before-completion`.

## Authoritative Flow Document References

- `.codex-reports/flow-codex-core-stack-v1.md`
- `.codex-reports/flow-codex-skill-router-v1.md`
- `.codex-reports/flow-codex-context-strategy-v1.md`
- `.codex/skills/_flow-shared/flow-principles.md`
- `.codex/skills/_flow-shared/flow-skill-router.md`

