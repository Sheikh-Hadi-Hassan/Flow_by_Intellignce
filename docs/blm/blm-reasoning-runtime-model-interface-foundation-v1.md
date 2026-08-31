# BLM Reasoning Runtime and Model Interface Foundation v1

## Purpose

The BLM Reasoning Runtime consumes a `CompiledBusinessContextBundle` and
produces a structured `BusinessReasoningResult`.

The runtime is model-independent. It does not retrieve tenant data, expand
context, execute business skills, call tools, mutate workspace state, grant
approval, or depend on a specific model provider.

## Reasoning Request

`BusinessReasoningRequest` contains:

- `compiledContext`
- `objective`
- `expectedOutputType`
- optional `modelRequirements`
- `riskProfile`
- optional `taskType`
- `responseMode`
- optional `constraints`

The request intentionally does not duplicate the compiled context. Validation
requires a compiled bundle, non-empty objective, context fingerprint, bundle
identity, and matching task type when provided.

## Reasoning Result

`BusinessReasoningResult` is structured, not `{ text: string }`.

It can contain:

- status
- answer and summary
- findings
- diagnostic hypotheses
- decision factors
- recommendations
- proposed skills
- required calculations
- required approvals
- missing information
- uncertainties
- evidence, concept, record, and policy references
- warnings
- confidence
- model execution metadata
- authority boundary
- provenance
- audit metadata
- context expansion requests

It does not store private chain-of-thought.

## Structured Rationale

Structured rationale is represented as findings, hypotheses, factors,
recommendations, evidence references, missing information, uncertainties, and
required handoffs.

Important business statements should cite evidence where possible. Unsupported
conclusions remain uncertain or missing-information results.

## Model Router

`ModelRouter` is a deterministic port. It receives task requirements, context
characteristics, risk, and model capability profiles, then returns a
`ModelRoutingDecision`.

v1 routing policy:

- calculation with formula context -> `DETERMINISTIC_ENGINE`
- read operation with authorized records -> `NO_MODEL`
- diagnostic, decision support, drafts, and general analysis -> structured
  reasoning profile
- critical risk may analyze, but cannot grant execution authority

## Execution Classes

Execution classes are capability classes, not vendors:

- `GENERAL_LLM`
- `BUSINESS_SLM`
- `SPECIALIZED_MODEL`
- `DETERMINISTIC_ENGINE`
- `NO_MODEL`

The runtime reuses `ModelCapabilityProfile` from BLM contracts. Representative
profiles are fixtures, not deployed providers.

## Model Adapter Boundary

`BusinessReasoningModelAdapter` accepts a model-independent
`ModelReasoningEnvelope` and returns a structured draft.

Provider adapters can be added later outside canonical BLM core. v1 includes
only a deterministic fake adapter for tests.

## Model Reasoning Envelope

`ModelReasoningEnvelope` carries:

- task instruction
- bounded business context
- authority rules
- output schema description
- evidence requirements
- prohibited actions
- context fingerprint

It is not a vendor prompt and is not presentation output.

## Authority Boundary

Reasoning authority is not execution authority.

The runtime carries the compiler's authority constraints and validates proposed
skills against context-exposed skills, required permissions, approval policy,
and compiled execution authority.

Executable skills still do not execute in this chapter.

## Calculation Handoff

When authoritative calculation is required, the runtime returns
`RequiredCalculation` entries with formula IDs, required inputs, reason, and
status. It does not let a reasoning model invent deterministic calculation
results.

## Output Validation

Raw model drafts are not trusted. The runtime validates:

- draft shape
- record references
- policy references
- semantic concept membership
- skill IDs
- skill context membership
- permissions
- authority escalation

Hallucinated or out-of-context references are rejected from authoritative
structured output and surfaced as warnings.

## Context Expansion

The runtime cannot fetch more context. Missing information becomes structured
`MissingInformation` and `ContextExpansionRequest` entries. A future
orchestrator may use those to ask the Context Compiler for a new bounded
context.

## Confidence And Uncertainty

Confidence is categorical: `LOW`, `MEDIUM`, `HIGH`.

Uncertainty is first-class and uses categories such as missing data,
conflicting data, ambiguous business rule, insufficient evidence, model
uncertainty, and outside domain coverage. Confidence never overrides policy or
authority.

## Domain Maturity

The runtime uses existing domain expertise scores and domain coverage status.
Foundational or low-coverage domains produce warnings so future UI can avoid
presenting early domain coverage as complete authority.

## Voice And Text Independence

The runtime consumes normalized compiled context. It is independent of whether
the original input came from voice, text, UI, API, automation, or agent flows.
Presentation adapters remain future work.

## Future Work

- production provider adapters
- Business Skill Planner
- deterministic calculation engine
- Action Wall integration after skill planning
- presentation adapters
- model evaluation and fine-tuning policy

These are not implemented in this chapter.
