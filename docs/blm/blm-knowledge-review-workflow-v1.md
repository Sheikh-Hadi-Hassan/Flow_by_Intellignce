# BLM Knowledge Review Workflow v1

## Purpose

The BLM Knowledge Review Workflow is the governed human decision layer between
acquired/normalized/mapped business knowledge and trusted published BLM
knowledge.

AI, source adapters, and external standards may propose or supply candidate
knowledge. They cannot grant semantic, legal, or publication authority.

## Review Lifecycle

Review item states:

- `OPEN`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`
- `REMAP_REQUIRED`
- `DEFERRED`
- `SUPERSEDED`

Terminal states cannot silently return to `OPEN`. A new upstream source version
or mapping change creates a new review item.

## Review Reasons

Supported reasons:

- `AMBIGUOUS_MAPPING`
- `CONFLICTING_DEFINITION`
- `DUPLICATE_CONCEPT`
- `LICENSE_REVIEW_REQUIRED`
- `SOURCE_VERSION_CHANGED`
- `MAPPING_CHANGED`
- `CANONICALIZATION_REQUIRED`
- `PROVENANCE_INCOMPLETE`
- `DOMAIN_ASSIGNMENT_REQUIRED`
- `SEMANTIC_SCOPE_CONFLICT`
- `DEPRECATION_REVIEW`
- `EXTERNAL_STANDARD_CHANGE`

Acquisition issues and conflicts automatically generate review items.

## Decision Types

Supported machine-readable decisions:

- `APPROVE_MAPPING`
- `REJECT_MAPPING`
- `CHANGE_MAPPING`
- `APPROVE_FLOW_CANONICAL_OVERRIDE`
- `PREFER_SOURCE_A`
- `PREFER_SOURCE_B`
- `MARK_CONTEXT_DEPENDENT`
- `REJECT_SOURCE_KNOWLEDGE`
- `APPROVE_PUBLICATION`
- `DEFER_DECISION`

Decisions are durable records and append audit/provenance. They do not erase
source provenance.

## Authorization

Knowledge approval is privileged. The review workflow exposes Action Wall
permission metadata:

- `blm.knowledge.review`
- `blm.knowledge.approve`
- `blm.knowledge.reject`
- `blm.knowledge.publish`

Only human reviewers can make authoritative decisions in v1. AI agents have
zero approval authority.

## Global Vs Workspace Review

Global BLM knowledge review is a platform-level operation and must not carry a
workspace ID.

Workspace knowledge review is reserved for future tenant-specific overlays and
requires a workspace ID. The two paths are modeled separately.

## License Vs Semantic Approval

Semantic approval is separate from license approval. A semantically valid
mapping from a review-required or blocked source remains unpublishable until
the license gate is satisfied.

Publication gates:

- source approved
- license approved
- mapping approved
- conflicts resolved
- provenance complete
- validation passed
- review completed
- canonical ID valid

## Evidence Bundle

`ReviewEvidenceBundle` exposes Flow canonical concept, external source concept,
source version/commit, mapping type, aliases, domain, license, provenance,
conflicts, prior/proposed mapping, and affected releases.

## Mapping Revision

`CHANGE_MAPPING` creates a revision record that preserves the previous mapping,
revised mapping, decision ID, and revision timestamp. Mapping history is
append-only.

## Audit And Decision History

Every review decision produces a `KnowledgeDecisionRecord` and an
`AuditEvent`-compatible audit record. The record captures who, what, when,
decision, reason, previous/new state, affected mapping/release, and evidence
fingerprint.

## Release Candidate

`KnowledgeReleaseCandidate` includes only publishable reviewed knowledge. Any
unresolved or blocked review keeps the candidate `BLOCKED`. Old releases remain
reproducible.

## Source Version Updates

If a source snapshot fingerprint changes, the workflow creates
`SOURCE_VERSION_CHANGED` review items. If a release diff reports
`MAPPING_CHANGED`, it creates mapping review items. Existing releases are not
mutated.

## Impact Analysis

`KnowledgeImpactReport` identifies affected Domain Packs, skills, documents,
metrics, rules, process patterns, and evaluation cases for a semantic concept.
The workflow reports impact; it does not rewrite downstream artifacts.

## Future AI Boundary

Future AI-assisted curation may propose review suggestions, but authoritative
review decisions remain human-governed through the Action Wall/security model.
No LLM, RAG, embeddings, vector DB, or model training is part of v1.
