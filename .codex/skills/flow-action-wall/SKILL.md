---
name: flow-action-wall
description: Use when Flow work involves authorization, tenant isolation, AI permissions, critical CRUD, external side effects, tool execution, approvals, drafts, action policies, sensitive data scope, or Action Wall design.
---

# Flow Action Wall

## Purpose

Define and enforce Flow's authorization and controlled-action model. This skill protects the rule that AI may reason, recommend, draft, and request actions, but deterministic backend systems must authorize and execute them.

## When To Trigger

- Designing or modifying permissions, roles, tenant isolation, RLS, data scopes, or action policies.
- Adding a tool, agent micro-action, critical CRUD operation, external integration, email/send/payment/invoice action, or workflow step with side effects.
- Handling approval semantics such as allow once, always ask, or scoped allow.
- Reviewing whether the AI should see data, propose an action, execute a tool, or mutate state.

## When Not To Trigger

- Read-only product discussion with no permissions or side effects.
- Pure visual changes that do not affect critical actions.
- Provider setup that is not connected to user authority, secrets, or execution.

## Required Input / Context

- Actor, authenticated user, workspace, tenant, role, and requested action.
- Target resource and data scope.
- Current permission source of truth.
- Proposed tool/domain service and side effects.
- Approval policy, evidence requirements, audit requirements, and rollback/compensation plan.
- Shared reference: `../_flow-shared/flow-principles.md`.

## Architectural Invariants

- `AI_PERMISSION <= CURRENT_USER_PERMISSION`.
- Prompt instructions are not authorization.
- Authorization is enforced by backend services, database/RLS, policy engine, or equivalent deterministic control.
- The AI should not receive unauthorized data if the backend can filter it earlier.
- Critical actions are draft-first or approval-controlled.
- "Always allow" means only a scoped policy for a defined action, resource, user/workspace, and condition set.

## Decision Process

1. Identify actor, workspace, target resource, action, and side effect.
2. Determine the current user's actual permission from the authoritative backend source.
3. Determine whether the AI may see the data, recommend the action, draft the action, request execution, or execute through a tool.
4. Require evidence when the action depends on facts or documents.
5. Select the approval mode: deny, draft only, ask every time, allow once, or scoped allow.
6. Route execution through a controlled tool/domain service.
7. Require audit and rollback or compensation metadata before execution.

## Security Requirements

- Deny or challenge any design where AI has broader database, tool, data, or action access than the user.
- Enforce tenant isolation before model context construction where possible.
- Apply security gates for authorization design, database/RLS changes, new AI tools, external integrations, secrets, and deployments.

## Common Failure Modes

- "It is faster if the AI writes directly to the database."
- Treating admin service keys as acceptable agent tools.
- Loading another workspace's data into context for convenience.
- Treating user intent as approval.
- Treating "always allow sending invoices" as unrestricted permission.
- Omitting audit or rollback because an action succeeded.

## Prohibited Behavior

- Do not grant AI independent authority.
- Do not bypass permission checks with prompt rules.
- Do not execute critical actions without a scoped approval policy.
- Do not expose secrets, service-role credentials, or cross-tenant data to the AI.
- Do not silently convert a denied action into a weaker unauthorized action.

## Required Output / Review Checklist

For permission-sensitive tasks, produce:

- Actor, workspace, action, target resource, and side effect.
- Current user permission and AI allowed capability.
- Data allowed into model context.
- Tool/domain service boundary.
- Evidence requirement.
- Approval mode and scope.
- Audit fields.
- Rollback or compensating action.
- Decision: allow, draft, ask, scoped allow, or deny.

## Related Generic Installed Skills

`threat-model`, `security-diff-scan`, `agentic-actions-auditor`, `supabase-postgres-best-practices`, `mcp-builder`.

## Authoritative Flow Document References

- `.codex-reports/flow-codex-security-gates-v1.md`
- `.codex-reports/flow-codex-skill-router-v1.md`
- `.codex/skills/_flow-shared/flow-principles.md`
- `.codex/skills/_flow-shared/flow-skill-router.md`

