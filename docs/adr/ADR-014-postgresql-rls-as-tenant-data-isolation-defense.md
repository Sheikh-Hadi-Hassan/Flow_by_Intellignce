# ADR-014: PostgreSQL RLS As Tenant Data Isolation Defense

Status: Accepted

## Context

Flow is multi-tenant. Application authorization is necessary but insufficient
as the only tenant boundary because query mistakes, future APIs, and direct
database paths can accidentally omit workspace constraints.

## Decision

Use PostgreSQL Row Level Security on foundational tenant-owned tables as
defense in depth. Backend authorization through the Action Wall remains the
primary action authorization path; RLS provides an additional database-level
tenant isolation boundary.

## Consequences

Schema changes must include RLS review and tests. Policies must check real
workspace membership or permissions, not only `TO authenticated`. Service-role
credentials are treated as privileged server-only credentials because they can
bypass RLS.

## Tradeoffs

Some policies require private helper functions to avoid recursive membership
checks. Those helpers must be narrow, audited, and based on `auth.uid()`.
