# Flow BLM Real Model Integration and Reasoning Evaluation v1

## Implemented

- OpenAI Responses API provider adapter package
- strict structured output schema
- versioned OpenAI prompt serialization
- provider privacy defaults with storage disabled
- no tool calling
- bounded provider retry/error handling
- safe provider metadata boundary
- async reasoning adapter path in BLM core
- BLM reasoning evaluation harness
- 25 synthetic evaluation scenarios
- baseline, BLM-augmented, and comparison modes
- deterministic rubric scoring
- BLM lift metrics
- failure attribution
- generated report command

## Real Model Status

Real model evaluation was not run because live credentials/config were not
available in the current environment.

Deterministic synthetic evaluation command passed:

`pnpm blm:eval:model -- --mode=comparison --scenario=invoice-overdue`

Observed deterministic invoice scenario lift:

- baseline business correctness: 0
- BLM business correctness: 1
- baseline grounding: 0
- BLM grounding: 1
- baseline missing-info accuracy: 0
- BLM missing-info accuracy: 1

## Boundaries Preserved

- no OpenAI dependency in `@flow/blm-core`
- no OpenAI dependency in `@flow/blm-contracts`
- no RAG
- no embeddings
- no provider search
- no tool calling
- no skill planning
- no skill execution
- no Action Wall mutation
- no deterministic engine
- no voice
- no persistent conversation memory
