# Flow BLM Knowledge Acquisition Pipeline v1

## Implemented

- `@flow/blm-core`
- source trust gate
- source snapshot model
- source adapter abstraction
- Mantle/gist/UBL proof adapters
- normalized business concept model
- explicit external semantic mapping model
- duplicate/conflict detection
- publication lifecycle
- provenance chain
- license gate
- knowledge release model
- deterministic fingerprints
- knowledge release diff
- structured import report
- proof Domain Pack enrichment

## Proof Import

Published 21 mapped proof items from approved sources:

- 10 Mantle UDM concepts
- 8 gist concepts
- 3 UBL document concepts

No upstream repository source was committed. Reference checkouts live under the
ignored `experiments/blm/reference-sources/` directory.

## Boundaries Preserved

- Flow canonical semantic IDs remain authoritative.
- Raw discovered knowledge does not enter the active registry.
- Review-required, rejected, reference-only, and unknown sources fail closed.
- Tenant knowledge remains outside global BLM acquisition.
- No LLM, RAG, embeddings, vector DB, model training, runtime internet, or
  Semantica implementation dependency was introduced.

## Knowledge Release

`flow.blm.knowledge-release.1` / `1.0.0` captures the approved proof snapshots,
mapping version `blm-knowledge-acquisition-v1`, published items, enriched proof
packs, and deterministic release fingerprint.
