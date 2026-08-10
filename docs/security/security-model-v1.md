# Security Model v1

## Core Rule

`AI_PERMISSION <= CURRENT_USER_PERMISSION`

An AI acting for a user can never obtain permissions the authenticated user does not have.

AI prompts are not a security boundary.

## Trust Boundaries

- Browser to API.
- API to database.
- API to external providers.
- AI/model context to deterministic backend systems.
- Workspace to workspace.
- User to user.
- Tool Registry to domain services.
- Workflow runtime to action execution.

## Tenant Isolation

Flow is multi-tenant. Workspace data must never leak across application APIs, database access, AI tools, search, memory, documents, reports, workflow execution, background jobs, accidental joins, or model context.

Tenant-owned records should include workspace identity where appropriate. Database policies and backend authorization must make tenant isolation structural rather than dependent on developers remembering `WHERE workspace_id = ...`.

## Authentication vs Authorization

Authentication identifies the actor. Authorization determines what the actor may do in a workspace. Authentication provider claims are not sufficient authorization by themselves.

## AI Context Boundaries

Unauthorized information should not enter model context when avoidable. Model-visible context must be scoped to the authenticated user's workspace and permission.

## Tool Authorization

AI tools must declare required permissions, risk, evidence requirements, approval policy, and audit metadata. Tools execute only after deterministic authorization through the Action Wall.

The request source, including `AI`, never grants additional authority. AI-originated Action Requests use the same Actor Context permissions as UI, API, workflow, or voice requests.

## Database Security

PostgreSQL is the authoritative data platform. Supabase is the initial platform. RLS must be enabled on exposed tenant-owned tables. Service-role credentials are server-only and must not be exposed to frontend code or model context.

## Secrets Handling

Secrets belong in environment variables or managed secret stores. Never commit `.env`, API keys, service-role keys, credentials, certificates, or private tokens.

## Approval Boundaries

Critical actions are draft-first or approval-controlled. Approval policies must be scoped. "Always allow" cannot grant unlimited future authority.

## Audit Integrity

Important actions should produce append-only or tamper-evident audit events containing actor, workspace, resource, action, tool, reason, evidence, approval, before state, after state, timestamp, and correlation ID.
