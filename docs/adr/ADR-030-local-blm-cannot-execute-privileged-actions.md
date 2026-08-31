# ADR-030: Local BLM Cannot Execute Privileged Actions

Status: Accepted

## Context

Local or cloud models may classify requests and draft plans, but action
authority belongs to Flow's deterministic execution foundation.

## Decision

The local BLM provider interface cannot execute tools or grant permissions.
All privileged actions still pass Action Wall and Universal Execution Spine.

## Consequences

Semantic interpretation cannot become privilege escalation.
