# BLM Real Model Integration and Reasoning Evaluation v1

## Purpose

Chapter 09 connects one production-capable model provider through the existing
BLM model adapter boundary and introduces an evaluation harness for measuring
whether compiled BLM context improves business reasoning compared with the same
model operating without BLM context.

This is not an execution chapter. It does not add skill planning, Action Wall
mutation, deterministic calculation execution, RAG, embeddings, web search,
provider file search, voice, or persistent conversation memory.

## Provider Boundary

Provider-specific OpenAI code lives in `@flow/blm-provider-openai`.

Canonical packages remain provider-neutral:

- `@flow/blm-contracts` has no OpenAI dependency.
- `@flow/blm-core` has no OpenAI dependency.
- `@flow/blm-provider-openai` implements the adapter boundary.

## OpenAI Responses API Assumptions

The adapter is based on the official OpenAI documentation current on
2026-08-11:

- Responses API is the direct model request surface.
- API credentials are server-side bearer credentials.
- request IDs should be logged for production troubleshooting.
- structured outputs should use JSON Schema with strict mode.
- strict schemas require explicit `required` and `additionalProperties: false`
  discipline.
- rate-limit retry behavior should be bounded, respect retry headers where
  available, and use exponential backoff with jitter otherwise.

References:

- `https://developers.openai.com/api/reference/overview`
- `https://developers.openai.com/api/docs/guides/structured-outputs`
- `https://developers.openai.com/api/docs/guides/error-codes`
- `https://developers.openai.com/api/docs/guides/rate-limits`

## Model Configuration

The adapter is configured by environment, not core contracts:

- `OPENAI_API_KEY`
- `BLM_OPENAI_MODEL`
- `BLM_OPENAI_TIMEOUT_MS`
- `BLM_OPENAI_MAX_RETRIES`
- `BLM_REAL_MODEL_TESTS`

Ordinary CI does not require live provider credentials.

## Structured Output Mapping

The provider adapter uses `text.format` with `type: "json_schema"`,
`strict: true`, and a provider-facing schema aligned with
`ModelBusinessReasoningDraft`.

Provider schema validation is not treated as business authority. BLM runtime
validation still rejects hallucinated records, out-of-context concepts,
unknown skills, unauthorized skill proposals, and authority escalation.

## Privacy Policy

The OpenAI request uses `store: false` by default. The request disables tools
with `tools: []`.

The adapter does not log full prompts by default and does not include secrets
in reasoning results or provider metadata.

## Prompt Architecture

Prompt serialization is versioned as:

`flow.blm.reasoning-prompt.openai.responses.v1`

The provider prompt is separated into:

- BLM role
- task
- business context
- workspace facts
- rules and formulas
- diagnostic and decision structures
- available business skills
- authority constraints
- evidence requirements
- output contract
- safety and non-fabrication rules

The canonical source remains `ModelReasoningEnvelope`.

## Reliability Handling

The adapter handles:

- malformed output
- empty/refusal-like output
- timeout
- rate limit
- authentication failure
- provider unavailable

Retries are bounded by configuration and deterministic validation failures are
not retried as provider reliability failures.

## Evaluation Harness

`@flow/blm-evaluation` defines:

- `BusinessReasoningEvaluationScenario`
- `BusinessReasoningEvaluationResult`
- `BusinessReasoningEvaluationComparison`
- `BusinessReasoningEvaluationReport`

It supports:

- baseline mode
- BLM-augmented mode
- comparison mode
- selected scenario
- full synthetic suite

Command:

`pnpm blm:eval:model -- --mode=comparison`

Generated reports are written to `artifacts/blm-evals/`, which is gitignored.

## Scoring Methodology

The harness scores deterministic dimensions:

- business concept correctness
- business process correctness
- cross-domain reasoning
- workspace fact grounding
- evidence usage
- missing-information detection
- calculation authority compliance
- policy compliance
- permission compliance
- skill selection validity
- hallucination rate
- unsupported assertion rate
- diagnostic quality
- decision factor coverage
- psychology safety
- domain coverage awareness
- action authority compliance

It does not use model-as-judge as sole authority.

## BLM Lift

Comparison reports compute selected lift dimensions:

- business correctness
- grounding
- authority violations
- hallucinations
- missing-information accuracy

The harness keeps these separate instead of collapsing them into one
misleading score.

## Failure Attribution

Evaluation results can attribute failure to:

- context selection
- BLM knowledge gap
- model reasoning failure
- model output validation
- authority policy
- missing workspace data
- unknown

## Synthetic Data

All first evaluation scenarios use synthetic records, policies, and profiles.
No committed report contains sensitive tenant business context.

## Future Work

- run real OpenAI evaluation when credentials are configured
- add more providers behind adapters
- add local Business SLM integration
- add cost pricing tables
- add deterministic calculation engine
- add Business Skill Planner after real-model safety evaluation
- add voice after reasoning quality is validated
