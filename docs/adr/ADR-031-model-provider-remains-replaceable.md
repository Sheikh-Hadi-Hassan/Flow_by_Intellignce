# ADR-031: Model Provider Remains Replaceable

Status: Accepted

## Context

Local model quality, licensing, and hardware fit may change.

## Decision

Use a provider-neutral `BusinessLanguageModelProvider` and model router
contract. Qwen3-4B is the first hypothesis to benchmark, not a permanent
provider choice.

## Consequences

Flow can route between deterministic lookup, local model, cloud model, and
human clarification without binding core architecture to one model family.
