# ADR-004: NestJS Backend

Status: Accepted

## Context

Flow needs a structured TypeScript backend with clear modules, validation, middleware, and testability.

## Decision

Use NestJS for the initial API application.

## Consequences

NestJS supports modular backend organization. Flow-specific authorization and domain rules remain ours; NestJS is the framework, not the architecture.

## Alternatives Considered

- Fastify/Express directly: lower overhead but less structure.
- tRPC-only backend: not enough for long-term service boundaries and external clients.
