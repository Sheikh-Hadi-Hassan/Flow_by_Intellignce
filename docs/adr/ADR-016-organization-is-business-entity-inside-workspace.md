# ADR-016: Organization Is A Business Entity Inside A Workspace

Status: Accepted

## Context

Workspace and Organization answer different questions. Workspace answers
"which tenant/account/security boundary?" Organization answers "which business
entity is represented?"

## Decision

Organization is a business entity inside exactly one workspace. One workspace
normally starts with one primary organization, but the database supports more
than one organization per workspace for future holding company, subsidiary,
and multi-entity scenarios.

## Consequences

Organization-owned records inherit workspace security. Business modules should
attach to organization context without treating organization as a replacement
for workspace tenancy.
