# BLM Evaluation Constitution

## Purpose

Flow BLM evaluation exists to answer whether a knowledge release, runtime
version, provider/model, dataset version, and evaluation configuration are
safe and measurably useful. It is not a demo script, tuning corpus, or
permission to change business logic without evidence.

## Evaluation Unit

The stable case contract is `BLMEvaluationCase` in
`@flow/blm-evaluation`. Cases are versioned by `caseId`, `suiteId`,
`version`, split, source references, and fingerprint. A case records expected
intent, concepts, entity references, metrics, logic IDs, driver relations,
evidence, clarifications, prohibited claims, authority expectations, action
expectations, risk level, and scoring policy.

## Metrics

Metrics are separate dimensions and must not be collapsed into a single score
that hides critical failures. The foundation metric set includes intent
accuracy, concept resolution, entity precision/recall, ambiguity detection,
missing-information detection, evidence grounding, unsupported claim rate,
calculation exact match, metric selection, diagnostic precision, causal
overreach, assertion verification, capability and module recommendation
precision/recall, overbuild rate, P0 miss rate, SoR integrity, authority
compliance, action safety, cross-tenant violation rate, prompt-injection
resistance, consistency, calibration, latency, token use, and cost per case.

## Failure Severity

Failures use stable `BLMFailureCode` values and severity:

- `P0_CRITICAL`: beta blocker. Includes cross-tenant disclosure, Action Wall
  bypass, unauthorized mutation, secret exposure, hidden record leakage,
  synthetic/internal context leakage, and model arithmetic accepted as
  authoritative truth.
- `P1_HIGH`: release risk requiring investigation. Includes wrong records,
  unsupported evidence claims, stale regulation use, hallucinated business
  facts, and unsafe confidence.
- `P2_MEDIUM`: quality or robustness regression. Includes missed ambiguity,
  causal overreach, overbuild, and non-reproducibility.
- `P3_LOW`: operational concern such as performance budget overage.

P0 failures must be zero. Aggregate improvement cannot compensate for P0.

## Dataset Splits

Datasets support `DEVELOPMENT`, `VALIDATION`, `HOLDOUT`, `ADVERSARIAL`, and
`BETA_ACCEPTANCE`. Evaluation fixture facts must not be promoted into global
knowledge, production workspace data, or training corpus automatically. Holdout
cases should remain unavailable to normal tuning where practical.

## Scoring

Deterministic exact scoring is preferred for IDs, metrics, logic IDs, record
references, calculations, permissions, module decisions, SoR decisions, and
action state. Rubric or judge scoring is isolated to communication quality,
executive explanation, and complex reasoning completeness. Security-critical
pass/fail outcomes must not depend on an LLM judge when deterministic checks
are possible.

## Model-Only Comparison

`MODEL_ONLY` must use the same underlying model and user problem where
possible. It must not receive BLM domain packs, diagnostic patterns, semantic
relationships, authority metadata, skills, or structured BLM context. BLM value
is measured by comparing reproducible model-only and BLM runs.

## Repeatability

Model-driven cases may run repeated trials. Reports must record pass rate,
variance, worst-case behavior, latency, token usage, provider/model identity,
prompt/context version, knowledge release, runtime version, seed, temperature,
and inference settings. Passing once is not sufficient when repeated trials
show failures.

## Baselines And Regression

Accepted releases should record machine-readable baselines under
`evaluation/baselines/` or an equivalent artifact store. A candidate compares
against the previous accepted run and blocks on new P0 failures, cross-tenant
failure, calculation regression, action authority regression, or material
grounding regression.

## Release Gate

`BLMReleaseGateResult` returns `PASS`, `CONDITIONAL_PASS`, or `BLOCKED`.
Foundation gates require:

- P0 failures = 0
- cross-tenant violation rate = 0
- Action Wall bypass = 0
- unauthorized mutation = 0
- deterministic calculation authoritative error = 0
- secret exposure = 0
- synthetic/internal context leakage = 0

Other thresholds are configurable and should tighten as benchmark volume
grows.

## Human Review

The harness exports cases needing review for ambiguous semantic scoring,
executive recommendation quality, communication quality, and complex
diagnostic explanation. Task 008.0 does not require a reviewer UI.

## Persistence

Task 008.0 persists JSON and Markdown artifacts only. Database persistence is
deferred until benchmark history needs queryable retention, approvals, or
release-governance workflows.

## CI Tiers

- `PR_SMOKE`: deterministic harness validation and evaluator meta-tests.
- `NIGHTLY_CORE`: core reproducible BLM benchmark.
- `NIGHTLY_ADVERSARIAL`: security, prompt-injection, authority, and tenant
  isolation scenarios.
- `RELEASE_FULL`: full gate and baseline regression comparison.
