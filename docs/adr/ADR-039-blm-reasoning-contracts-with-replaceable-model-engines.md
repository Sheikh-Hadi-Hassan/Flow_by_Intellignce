# ADR-039: BLM Reasoning Contracts Use Replaceable Model Engines

## Status

Accepted

## Context

Previous BLM chapters established governed business knowledge and a compiler
that emits bounded, authorization-aware context. The next layer must reason
over that context without gaining new authority or becoming tied to a model
vendor.

## Decision

BLM owns business reasoning contracts and authority boundaries. Underlying
LLM, SLM, specialized, deterministic, or no-model engines are replaceable
reasoning infrastructure that operate only on compiled authorized context.

The reasoning runtime exposes provider-neutral contracts:

- `BusinessReasoningRequest`
- `BusinessReasoningResult`
- `ModelRouter`
- `ModelReasoningEnvelope`
- `BusinessReasoningModelAdapter`

The runtime validates model drafts before accepting structured output. Unknown
records, policies, skills, permissions, authority escalation, and out-of-context
semantic references are rejected or contained as warnings.

## Consequences

Flow can add model providers later without changing BLM authority semantics.
Reasoning remains audit-ready, context-bound, and least-privilege.

Reasoning can propose actions and calculations, but cannot execute them,
approve itself, mutate workspace state, retrieve more data, or bypass Action
Wall.

## Alternatives Considered

- Couple reasoning directly to one hosted model provider: rejected because the
  model is replaceable infrastructure.
- Store raw hidden reasoning traces: rejected because Flow needs structured
  business rationale and audit evidence, not private scratchpads.
- Let models fetch additional context: rejected because context expansion must
  go back through the compiler.
- Execute proposed skills immediately: rejected because future skill planning
  and Action Wall must remain authoritative.
