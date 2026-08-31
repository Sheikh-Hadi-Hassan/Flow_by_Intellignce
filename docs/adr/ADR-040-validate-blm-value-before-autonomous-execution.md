# ADR-040: Validate BLM Value Before Autonomous Execution

## Status

Accepted

## Context

BLM now compiles bounded context and has a provider-neutral reasoning runtime.
Before adding autonomous execution, Flow needs evidence that BLM context
materially improves business reasoning quality and safety compared with the
same underlying model without BLM context.

## Decision

Flow validates the value of BLM against the same underlying model with and
without compiled BLM context before expanding into autonomous business
execution.

Provider integrations remain adapters. BLM canonical contracts do not depend
on model vendors.

The first production provider adapter is OpenAI Responses API in
`@flow/blm-provider-openai`. It uses strict structured output, disables tools,
uses `store: false` by default, and maps output back into BLM's
provider-neutral draft contract.

Evaluation lives in `@flow/blm-evaluation` and compares baseline vs
BLM-augmented reasoning using deterministic rubrics and synthetic data.

## Consequences

Flow can measure BLM lift before building skill planning or execution. Provider
behavior remains isolated, and BLM validation remains authoritative even after
provider-side schema validation.

Real-model tests are environment-gated and ordinary CI remains deterministic.

## Alternatives Considered

- Add autonomous skill planning immediately: rejected because model quality and
  safety must be measured first.
- Put OpenAI code in BLM core: rejected because provider contracts must not
  leak into canonical BLM packages.
- Use only model-as-judge evaluation: rejected because deterministic rubrics
  are required for authority, evidence, hallucination, and missing-information
  checks.
- Add RAG or provider search: rejected because the Context Compiler remains
  the context authority.
