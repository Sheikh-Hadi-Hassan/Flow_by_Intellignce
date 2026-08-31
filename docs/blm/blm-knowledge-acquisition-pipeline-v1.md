# BLM Knowledge Acquisition Pipeline v1

## Purpose

The BLM Knowledge Acquisition Pipeline is the controlled path for acquiring,
normalizing, mapping, validating, provenance-tracking, and publishing business
knowledge into Flow-owned BLM knowledge.

External sources are inputs. Flow remains the canonical runtime model.

## Pipeline

External approved source -> source snapshot -> source adapter -> source-native
representation -> normalized business concept -> explicit Flow semantic
mapping -> validation -> conflict/duplicate detection -> review/approval ->
published BLM knowledge -> enriched Business Domain Packs.

This chapter implements the deterministic foundation in `@flow/blm-core`. It
does not build runtime ingestion, UI, LLM mapping, RAG, embeddings, model
training, or Composition Resolver.

## Source Adapter Model

`BusinessKnowledgeSourceAdapter` isolates source-specific extraction. The core
pipeline works only with `SourceNativeKnowledgeItem` and does not know Mantle
XML, gist TTL, or UBL document structure.

Implemented proof adapters:

- `MantleProofSourceAdapter`
- `GistProofSourceAdapter`
- `UblProofSourceAdapter`

The proof adapters cover 21 items total. They do not execute upstream code,
install Moqui, call the network at runtime, or commit upstream source.

## Source Trust Lifecycle

Source trust is derived from the existing BLM source manifest:

- `APPROVED`: may enter controlled ingestion and publication.
- `EVALUATE`: may be analyzed but not published.
- `REFERENCE_ONLY`: may inform architecture but not acquisition publication.
- `REVIEW_REQUIRED`: blocked from publication.
- `REJECTED`: blocked.

Unknown sources fail closed.

## Source Snapshot And Versioning

`SourceSnapshot` captures source ID, version, tag where applicable, commit SHA,
retrieval date, license reference, source location, ingestion policy, and a
deterministic content fingerprint.

The proof snapshots use the approved source manifest values and verified
reference checkouts:

- Mantle UDM `f53aba96a14fc97c6b42918300ee880fa0eb03a1`
- gist `c73068bfe779db2643b1e43c920cc8039b15a013`
- UBL 2.4 official specification reference

## Canonicalization

Canonicalization is explicit. The pipeline never merges concepts because names
look similar. `ExternalSemanticMapping` records external source ID, external
concept ID, Flow canonical semantic ID, mapping type, source version, mapping
version, provenance, aliases, and review status.

Unknown or ambiguous mapping returns review-required issues. Human-approved
mapping remains the authority.

## External Semantic Mappings

Mapping relationships are inspired by SKOS but do not require SKOS runtime
libraries:

- `EXACT`
- `CLOSE`
- `BROADER`
- `NARROWER`
- `RELATED`

Proof mappings include Mantle Party/Organization/Product/Order/Invoice/Payment,
gist Organization/Person/Agreement/Event/Magnitude/Unit/Category/Address, and
UBL Invoice/Order/Quotation.

## Provenance

Published items retain a chain:

Flow semantic concept -> external semantic mapping -> source concept -> source
snapshot -> upstream project/version/commit -> license reference.

Flow-authored concepts remain `FLOW_NATIVE` until enriched by mapped external
knowledge. Raw discovered knowledge without approved mapping does not enter the
active registry.

## License Governance

License status and semantic review status are separate. A source can be useful
but blocked. `REVIEW_REQUIRED`, restricted, reference-only, rejected, and
unknown sources cannot publish trusted BLM knowledge.

## Conflict And Duplicate Detection

The pipeline detects:

- duplicate external mappings
- incompatible exact mappings
- incompatible definitions for the same Flow semantic ID
- ambiguous mappings

Conflicts remain unresolved until explicit review. The pipeline does not
automatically adjudicate semantic disagreements.

## Publication Lifecycle

Supported stages:

- `DISCOVERED`
- `NORMALIZED`
- `MAPPED`
- `VALIDATED`
- `REVIEW_REQUIRED`
- `APPROVED`
- `PUBLISHED`
- `REJECTED`

Only approved mapped knowledge becomes `PUBLISHED`.

## Knowledge Release

`BLMKnowledgeRelease` records release ID, version, source snapshots, mapping
version, published items, enriched domain packs, and a release fingerprint.

Future recommendations can reference a BLM knowledge release for auditability.

## Fingerprints And Diff

The core uses deterministic SHA-256 fingerprints over stable sorted JSON-like
serialization for source snapshots, normalized items, mapping sets, published
items, and releases.

`diffKnowledgeReleases` reports:

- `ADDED`
- `REMOVED`
- `CHANGED`
- `MAPPING_CHANGED`

## Domain Pack Enrichment

The proof publication enriches only the four existing proof packs:

- universal-core
- crm-sales
- finance-accounting
- inventory-procurement

It adds aliases, external mappings, and provenance to existing Flow concepts.
It does not create new domain packs or ERP modules.

## Runtime Boundary

Runtime BLM consumes trusted normalized Flow knowledge. It does not need live
GitHub, standards websites, source repositories, or ontology services.

Acquisition is offline/build-time/admin-time.

## No-LLM Mapping Policy

No LLM is used for extraction, mapping, merging, conflict resolution, license
review, or canonical definition generation in v1.

Future AI-assisted curation may propose mappings, but deterministic human
approval remains authoritative.
