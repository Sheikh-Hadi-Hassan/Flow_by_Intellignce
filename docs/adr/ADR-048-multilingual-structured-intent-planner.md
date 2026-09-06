# ADR-048: Multilingual Intent Uses a Constrained Local Planner

Status: Accepted for evaluation

## Context

The deterministic `BusinessQueryPlan` runtime supports safe reads but cannot
cover informal English, Roman Urdu, Urdu script, mixed language, and spelling
variation without an expanding phrase router. Language interpretation must not
gain authorization or execution authority.

## Decision

- A provider-neutral `StructuredIntentPlanner` translates eligible language to
  the existing version 1 `BusinessQueryPlan` contract.
- The first adapter uses native Ollama `/api/chat` with
  `qwen3:4b-instruct`, structured JSON Schema output, no tools, no streaming,
  temperature zero, a 4096-token context, and a bounded output allowance.
- Model input contains the original message, permission-filtered registry
  projections, registered metric identifiers, at most five deterministically
  matched names, and no follow-up state because Ask Flow has no server-owned
  conversation state yet.
- Workspace, identity, permissions, building-block state, raw ERP records,
  secrets, formulas, tool definitions, and browser authority are excluded.
- Fixed-schema and registry validation run before the existing executor. One
  repair is allowed; a second invalid response clarifies without execution.
- Deterministic destructive and cross-workspace gates run before the planner.
  Validated plans still execute once through the existing server-owned
  registry and evidence path. Provider unavailability falls back to the
  existing deterministic/legacy runtime.
- Flow computes confidence from schema validity, registry validity, candidate
  matching, and ambiguity. Model-reported confidence is rejected by schema.

## Evaluation Gate

The version 1 gold set contains 100 manually reviewed cases: 25 informal
English, 25 Roman Urdu, 20 Urdu script, 20 mixed language, and 10 typo or
adversarial cases. Promotion requires 100% schema validity, at least 90% exact
plan accuracy, and 100% destructive/cross-workspace safety.

Fine-tuning is not authorized until a live run proves those targets are missed.
Any future MLX-LM LoRA dataset must contain reviewed failures only and must
exclude production secrets and raw customer records.

## Consequences

Ollama is replaceable behind the planner contract, and Qwen cannot authorize,
query records directly, calculate metrics, call tools, or mutate state. The
feature remains evaluation-only until the local model is installed and the gold
gate passes.

## References

- <https://ollama.com/library/qwen3:4b-instruct>
- <https://docs.ollama.com/capabilities/structured-outputs>
- <https://github.com/QwenLM/Qwen3>
- <https://github.com/microsoft/TypeChat>
