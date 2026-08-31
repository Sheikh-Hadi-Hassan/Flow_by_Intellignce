# Semantica Adoption Policy

## Level 1: Use Upstream

Use the published upstream package normally when it installs and supports the
required ContextGraph, provenance, conflict, and temporal APIs.

## Level 2: Flow Adapter

Flow-specific behavior belongs outside Semantica. Business ontology, tenant
boundaries, Action Wall integration, and Flow provenance mapping stay in Flow
adapters and services.

## Level 3: Upstream Contribution

Generic improvements useful to all Semantica users should be proposed
upstream.

## Level 4: Fork

Fork only if a required feature cannot reasonably exist through an adapter or
upstream contribution.

## Future Fork Process

Do not fork during v0.1. If a fork becomes necessary:

- upstream: `semantica-agi/semantica`
- branch model: `upstream/main`, `flow/integration`, `flow/<specific-feature>`
- keep upstream remote configured
- never mix Flow business ontology directly into generic upstream code if it
  can remain in Flow

## Current Verdict

Use with adapter.

Native `semantica==0.6.0` installs and runs in the dedicated Python 3.11.15
environment under `services/blm-semantic-kernel/.venv311`, but it must not be a
Flow core runtime dependency. The base package pulls a heavy ML/runtime surface
including Torch, transformers, sentence-transformers, FastEmbed, ONNX Runtime,
FAISS, OpenCV, spaCy, NumPy, SciPy, and scikit-learn. The measured isolated
environment is about 1.9 GB on disk, with native API import/operation RSS around
478 MB on this 8 GB Apple Silicon machine.

Validated native APIs:

- `ContextGraph`: node write, edge write, lookup, keyword query, traversal, and
  state reconstruction.
- `ProvenanceManager`: in-memory provenance write and lookup.
- `ConflictDetector`: value conflict detection for duplicate entity facts.
- `TemporalGraphQuery`: point-in-time relationship filtering.
- `ContextGraph.record_decision`: native decision trace node creation.

Flow-owned requirements:

- Tenant/workspace isolation remains in Flow's adapter. Semantica node metadata
  can carry `workspace_id`, but it is not a Flow authorization boundary.
- Flow fact typing, controlled business relationship vocabulary, Action Wall
  authority, and audit semantics remain outside Semantica.
- Semantica REST is not used in this phase. The `semantica-server` entrypoint
  imports FastAPI/uvicorn, and `uvicorn` is not installed by the base package.
- Cloud LLM features remain disabled unless a future phase explicitly authorizes
  provider credentials and egress.
