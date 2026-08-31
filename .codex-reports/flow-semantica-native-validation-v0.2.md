# FLOW SEMANTICA NATIVE VALIDATION v0.2

## Environment

- Machine: macOS 26.1, arm64, 8 GB RAM.
- System Python: 3.9.6.
- Existing local tools checked: `uv`, `pyenv`, `brew`, `python3.11`, and
  `python3.12` were not available.
- Provisioned Python: project-local `python-build-standalone`
  `cpython-3.11.15+20260807-aarch64-apple-darwin-install_only_stripped`.
- Native env: `services/blm-semantic-kernel/.venv311`.

## Install And Doctor

- `semantica==0.6.0` installed successfully on Python 3.11.15.
- Captured native lock:
  `services/blm-semantic-kernel/requirements-native.lock.txt`.
- Key resolved packages: NumPy 2.4.6, SciPy 1.17.1, scikit-learn 1.9.0,
  Torch 2.13.0, transformers 5.15.0, sentence-transformers 5.7.0,
  FastEmbed 0.8.0, ONNX Runtime 1.28.0, FAISS CPU 1.15.0, spaCy 3.8.15,
  OpenCV Python 5.0.0.93.
- `semantica doctor`: 0 errors, 4 warnings. Warnings were unset
  `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, and default config.
- `semantica-server --help` failed because `uvicorn` is missing from the base
  install. REST server was not used or exposed.

## Native API Results

- Native graph: PASS. `ContextGraph` wrote nodes and edges, returned lookup,
  keyword query, traversal, and `state_at` data.
- Tenant isolation: PASS in Flow adapter, not native Semantica. Flow keeps
  workspace isolation before mirroring nodes into Semantica metadata.
- Native provenance: PASS. `ProvenanceManager` wrote and retrieved business fact
  provenance with source and confidence.
- Native conflict detection: PASS. `ConflictDetector.detect_value_conflicts`
  detected conflicting values for duplicate entity facts.
- Temporal semantics: PASS for point-in-time relationship filtering through
  `TemporalGraphQuery.query_at_time`.
- Decision trace: PASS. `ContextGraph.record_decision` produced native decision
  nodes linked to entity ids.
- Flow adapter: PASS. `SemanticaBusinessSemanticProvider` now lazily initializes
  native ContextGraph and ProvenanceManager when available, while retaining the
  deterministic Flow provider behavior.
- Graceful degradation: PASS. Provider health and deterministic fallback remain
  available without Semantica native imports.

## Performance And Resource Fit

- Top-level `import semantica`: 6.5 ms, about 19.8 MB RSS.
- Native API imports: 5,946.55 ms, about 477.73 MB RSS.
- Graph insert baseline: 0.52 ms.
- Graph traversal: 0.01 ms.
- Graph keyword query: 0.01 ms.
- Provenance write/query: 0.13 ms.
- Conflict check: 0.22 ms.
- Temporal query: 0.22 ms.
- Decision record: 0.11 ms.
- `.venv311` size: 1.9 GB.
- Project-local standalone Python size: 104 MB.
- Resource fit: MODERATE for an isolated internal service; too heavy for Flow
  core process embedding.

## Security Review

- Base package includes network-capable ingestion, MCP, FastAPI server,
  Hugging Face/model loading, and cloud LLM provider code paths.
- Doctor reports missing cloud keys as warnings, not blocking errors.
- No cloud LLM keys were configured, no models were downloaded, no server was
  started, and no MCP service was exposed.
- REST server entrypoint binds `0.0.0.0:8000` in package source, so a future
  server phase must wrap it behind Flow-local binding and auth controls.

## Verification

- `services/blm-semantic-kernel/.venv311/bin/python -m pytest services/blm-semantic-kernel`
  passed: 11 tests.

## Verdict

Use Semantica with adapter. Do not modify, fork, train, or make it a mandatory
Flow core dependency in this phase.
