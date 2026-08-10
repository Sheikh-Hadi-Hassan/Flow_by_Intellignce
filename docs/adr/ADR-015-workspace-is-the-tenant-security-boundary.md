# ADR-015: Workspace Is The Tenant Security Boundary

Status: Accepted

## Context

Flow needs a stable boundary for tenant isolation, memberships,
authorization, data scoping, and future account-level configuration.

## Decision

Workspace is the tenant and security boundary. Protected actions must resolve
a workspace context before ActorContext is trusted. Tenant-owned records must
carry workspace identity where appropriate.

## Consequences

Future modules, agents, tools, reports, memory, and workflows must scope data
to workspace authorization before use. Organization and business structures
exist inside the workspace boundary.
