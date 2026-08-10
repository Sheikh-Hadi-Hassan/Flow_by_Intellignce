# ADR-012: Authorization Provider Abstraction Before External FGA Engine

Status: Accepted

## Context

Flow needs real authorization semantics now: identity, workspace, membership,
action, permission, and resource scope. External fine-grained authorization
engines can be valuable, but introducing one before these semantics are proven
would add operational and modeling complexity too early.

## Decision

Use Flow-owned authorization contracts with PostgreSQL-backed foundational
roles and permissions first. Keep an `AuthorizationProvider` adapter boundary
so OpenFGA, SpiceDB, Cerbos, or another engine can be introduced later without
rewiring the Universal Execution Spine.

## Consequences

The initial system remains understandable and migration-driven. Permission
checks are deterministic and testable. Future FGA adoption remains possible
through an adapter once resource relationships justify it.

## Tradeoffs

This does not solve every future relationship authorization problem. It does
avoid prematurely committing Flow to a relationship model before business
resource ownership and sharing rules exist.

## Trigger For Reconsideration

Reconsider an external FGA engine when Flow needs nested resource sharing,
delegated permissions, object-level relationship checks, cross-workspace
collaboration, or policy analysis that is awkward in workspace RBAC.
