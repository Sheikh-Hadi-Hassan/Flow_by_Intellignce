# BLM Industrial Evaluation Harness 008.0

Phase 008.0 establishes the permanent evaluation foundation for comparing the same underlying model in two controlled modes:

- `MODEL_ALONE`: generic business assistant instructions, no BLM runtime context.
- `SAME_MODEL_PLUS_BLM`: Business Context Compiler, BLM runtime context, provider adapter, deterministic validation, and Action Wall boundaries.

The harness is provider-neutral. It records provider, model, configuration, timestamp, latency, token usage, retries, errors, run fingerprints, dataset fingerprints, and gate outcomes.

## Architecture

The evaluation package lives in `packages/blm-evaluation`.

- `industrial-evaluation.ts` defines the 008.0 domain model, seed dataset release, controlled variants, dimensional metrics, failure taxonomy, release gates, baseline comparison, and JSON/Markdown report writer.
- `index.ts` runs the existing deterministic BLM reasoning scenarios in baseline, BLM, or comparison mode.
- `benchmark-catalog.ts` and `b0-hardness.ts` extend the foundation for later industrial benchmark and certification phases.

The LLM is never authoritative for deterministic calculations, permissions, authorization, source-of-record facts, or execution. Those remain deterministic or human-authorized Flow capabilities.

## Evaluation Cases

`createEvaluationDatasetRelease()` materializes a versioned 008.0 dataset from existing BLM runtime scenarios and deterministic metadata expansion. The seed release contains at least 100 non-trivia business cases across:

- business roles including executive, functional, security, legal, and founder/operator roles
- English, Urdu, Roman Urdu, and mixed Urdu-English business language
- L1-L6 business complexity
- diagnostic, decision, calculation, missing-information, workflow, authority, and adversarial cases

To add a case, add a runtime scenario where behavior must execute through the complete BLM path, then let the industrial dataset release derive stable metadata. Add a direct `BLMEvaluationCase` only when the case is evaluation-only and should not enter runtime scenario tests.

## Graders

The grader hierarchy is:

1. deterministic exact
2. deterministic range
3. schema/property
4. code-executed calculation
5. provenance/evidence
6. rule-based behavioral
7. blinded human expert rubric
8. LLM judge

LLM judges are not allowed as the sole authority for arithmetic, accounting, permissions, authorization, legal factuality, source correctness, or deterministic business rules.

## Running

Build first when using package CLI scripts:

```bash
pnpm --filter @flow/blm-evaluation build
pnpm blm:eval:validate
pnpm blm:eval:run --mode=MODEL_ONLY
pnpm blm:eval:run --mode=BLM_FULL
pnpm blm:eval:compare --baseline=<baseline-json> --candidate=<candidate-json>
pnpm blm:eval:gate --run=<candidate-json>
```

Reports are written as machine-readable JSON and human-readable Markdown by `writeIndustrialEvaluationArtifacts()`.

## Interpreting Failures

Failures are classified separately from model quality. Use the failure taxonomy to distinguish missing knowledge, failed retrieval, insufficient evidence, deterministic engine gaps, validation failures, authorization gaps, security gaps, provider gaps, and unknown failures.

Curriculum feedback should map a failure to an existing curriculum packet, knowledge packet, metric, formula, rule, role capability, workflow, or a specific repair target. Do not add curriculum blindly to inflate scores.

## Certification Gates

Release gates block on severe failures including tenant leakage, unauthorized access, Action Wall bypass, fabricated source-of-record evidence, deterministic calculation mismatch, material provenance fabrication, dangerous legal/regulatory certainty, prompt-injection success, and cross-business identity confusion.

No database schema change is required for 008.0. Artifacts remain file-based until live benchmark history requires queryable persistence.
