# ADR-001: TypeScript As Primary Application Language

Status: Accepted

## Context

Flow needs shared contracts across frontend, backend, tools, and tests with strong editor and compile-time feedback.

## Decision

Use TypeScript as the primary application language.

## Consequences

Shared contracts can be compiled and reused across apps and packages. Runtime validation is still required for untrusted inputs.

## Alternatives Considered

- JavaScript: faster initial setup but weaker contracts.
- Python: useful for future AI/document helpers, but not the primary app language.
