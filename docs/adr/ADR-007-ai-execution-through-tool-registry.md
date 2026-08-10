# ADR-007: AI Execution Through Tool Registry

Status: Accepted

## Context

AI will recommend and request actions, but unrestricted AI mutation access would violate Flow's permission model.

## Decision

AI execution must pass through a Tool Registry with declared schemas, permissions, risk, approval policy, evidence requirements, and audit metadata.

## Consequences

Agents cannot directly mutate arbitrary database state. Tool design becomes a first-class architecture boundary.

## Alternatives Considered

- Direct database access for AI: rejected because it bypasses deterministic authorization.
- Prompt-only tool restrictions: rejected because prompts are not security controls.
