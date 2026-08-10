# ADR-013: Supabase Auth As Initial Authentication Provider

Status: Accepted

## Context

Flow selected Supabase as the initial PostgreSQL platform. Supabase Auth works
with local development, hosted Supabase, and PostgreSQL RLS through `auth.uid()`.

## Decision

Use Supabase Auth as the initial authentication provider. Supabase Auth answers
"who is this subject?" Flow-owned tables and authorization contracts answer
"what may this user do in this workspace?"

## Consequences

Provider-specific token verification is isolated behind an authentication
adapter. Business/domain code receives provider-neutral `AuthenticatedIdentity`
and Flow `ActorContext` values. Replacement remains possible if Flow later
moves to another identity provider.

## Alternatives Considered

- Build custom authentication now: rejected because it increases security
  burden without improving Flow's authorization semantics.
- Treat Supabase JWT claims as authorization: rejected because authentication
  claims are not Flow's workspace permission source of truth.
