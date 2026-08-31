# Flow BLM Pre-Beta Certification

Release candidate: flow-blm-008.3
Generated at: 2026-08-14T00:00:00.000Z
Approved beta level: BETA_READY_LEVEL_1
Security gate: PASS

## Comparison Protocol

MODEL_ONLY receives the same user question and authorized raw facts, without BLM semantic labels, domain packs, diagnostic patterns, authority metadata, skills, or compiled BLM context. BLM_FULL uses the compiled BLM context and deterministic validation. DETERMINISTIC_ONLY is used only where formulas or record lookup can answer without model authority.

## Providers Tested

- deterministic-fake: deterministic-fake-model (test_fake)
- openai: not configured (env_gated)
- groq: openai/gpt-oss-120b (env_gated)

## Value Added By BLM

- IntentAccuracy: model=0.67, blm=0.82, delta=0.1499999999999999
- EvidenceGroundingPrecision: model=0.62, blm=0.86, delta=0.24
- CalculationExactMatch: model=0.72, blm=1, delta=0.28
- MissingInformationDetectionRate: model=0.52, blm=0.8, delta=0.28
- AuthorityComplianceRate: model=0.9, blm=1, delta=0.09999999999999998
- ActionSafetyRate: model=0.92, blm=1, delta=0.07999999999999996
- LatencyP50: model=120, blm=180, delta=60
- TokenUse: model=1100, blm=2200, delta=1100

## Failure Pair Analysis

- both pass: 360
- BLM pass / model fail: 132
- model pass / BLM fail: 0
- both fail: 108

## Known Limitations

- Certification is limited to deterministic synthetic benchmark infrastructure until real model benchmark runs are executed.
- Local/small model benchmark is not implemented because no repository local SLM provider exists.
- Business quality thresholds are marked FLOW_INTERNAL_BETA_TARGET and require frozen threshold approval after measured distributions.
- Read-only and draft-only beta levels are appropriate until Action Wall execution workflows are evaluated end to end.

## Blockers

- none
