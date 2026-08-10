# ADR-010: Provider-Neutral Architecture Where Justified

Status: Accepted

## Context

Flow may use Supabase, OpenAI, Cloudflare, Temporal, Vercel, or other providers, but long-term architecture should remain portable where practical.

## Decision

Use provider-neutral contracts and adapters where replacement has realistic future value. Do not create abstractions merely for theoretical purity.

## Consequences

Core business logic should not depend directly on provider SDKs. Provider decisions require documentation when they create meaningful coupling.

## Alternatives Considered

- Provider lock-in for speed: acceptable only behind documented boundaries.
- Abstract every dependency: rejected as over-engineering.
