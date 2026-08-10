# ADR-008: Action Wall As Deterministic Authorization Boundary

Status: Accepted

## Context

Flow's core invariant is `AI_PERMISSION <= CURRENT_USER_PERMISSION`.

## Decision

Use the Action Wall as the deterministic authorization boundary for AI and user action execution.

## Consequences

Authorization decisions return `ALLOW`, `DENY`, or `REQUIRES_APPROVAL` with structured reason and metadata. Approval is scoped, not global.

## Alternatives Considered

- Frontend-only checks: rejected.
- Model-instruction authorization: rejected.
