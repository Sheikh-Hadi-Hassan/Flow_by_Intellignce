# Flow BLM Semantica POC v0.1

## Semantica Version

- Requested: `semantica==0.6.0`
- License from wheel metadata: MIT
- Wheel downloaded for inspection:
  `experiments/blm/semantica-wheel/semantica-0.6.0-py3-none-any.whl`

## Installation Result

FAIL in the current environment.

Available Python is 3.9.6. `semantica==0.6.0` declares `Requires-Python:
>=3.8`, but its dependency set includes `scikit-learn>=1.7.2`, which was not
available for Python 3.9 in this environment. No global Python environment was
modified.

## Health Check

Semantica import health check returns unavailable:

`ModuleNotFoundError: No module named 'semantica'`

## Modules Actually Tested

Semantica itself could not be imported. The wheel was inspected and includes
modules for context graph, provenance, decisions, conflicts, explorer/server,
graph stores, exports, embeddings, MCP/openclaw integrations, and optional LLM
provider extras.

Flow's deterministic fallback provider was tested for:

- entity creation
- relationship creation
- graph lookup
- tenant isolation
- provenance
- conflict detection
- temporal fact handling

## Architecture

BLM is a business semantic/control layer between user language and Flow's
deterministic execution foundation. It does not execute actions or grant
permissions.

## Adapter Design

`SemanticaBusinessSemanticProvider` is isolated inside
`services/blm-semantic-kernel`. TypeScript Flow packages use
`packages/blm-contracts` and do not import Semantica directly.

## Tenant Model

Every semantic entity, relationship, fact, and query carries `workspace_id`.
Relationships require both endpoints to exist in the same workspace.

## Ontology Design

v0.1 defines a small controlled business vocabulary for Workspace,
Organization, Person, Module, Capability, EntityType, Action, Tool, Evidence,
Decision, BusinessRule, and related relationships.

## Provenance Test

The POC records fact source, confidence, and Flow evidence reference id. Tests
verify provenance can be retrieved for a decision-supporting fact.

## Conflict Test

Synthetic facts:

- Morganics monthly fee = 300,000 PKR
- Morganics monthly fee = 350,000 PKR

Result: conflict detected. The values are not silently merged.

## Temporal Test

Old and new fee facts with effective dates are not treated as same-time
conflicts.

## Latency Measurements

Measured deterministic fallback provider:

- resolve entity: about 0.002 ms
- graph lookup: about 0.001 ms
- conflict lookup: about 0.006 ms
- decision trace/provenance lookup: about 0.001 ms

These are not Semantica benchmarks.

## Resource Measurements

- Machine RAM detected: 8 GB
- Python max RSS during measurement: recorded in
  `experiments/blm/semantica-poc-measurements-v0.1.json`

## Security Findings

No unresolved Flow security findings.

Important Semantica review notes:

- Package includes REST/server and Explorer UI modules.
- Package includes MCP/OpenClaw integration modules.
- Package declares optional LLM extras for OpenAI, Anthropic, Gemini, Groq,
  LiteLLM, Ollama, and others.
- POC configured no cloud credentials and did not install LLM extras.
- Semantica must remain behind tenant-aware adapter boundaries.

## Local Model Candidate Matrix

Primary: Qwen3-4B / appropriate quantized MLX variant.

Secondary: Phi-4-mini-instruct, IBM Granite 4.0 Tiny / H Tiny.

Detected RAM is 8 GB, so training is not recommended now. Benchmark small
quantized inference first.

## Training Recommendation

Train now: NO.

Proceed through evaluation dataset and offline benchmarks before LoRA/QLoRA.

## Fork Recommendation

Do not fork. Use upstream with Flow adapter. Reevaluate after testing on
Python 3.11+ with Semantica installed successfully.

## Limitations

- Semantica install failed on Python 3.9.
- Semantica ContextGraph APIs were not executed.
- No cloud LLM providers were configured.
- No local models were downloaded.
- No model training was performed.

## Verification

- Python compileall: PASS
- Python pytest: PASS
- `@flow/blm-contracts` typecheck: PASS
- `@flow/blm-contracts` tests: PASS
- `pnpm format:check`: PASS
- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm test`: PASS
- `pnpm build`: PASS
