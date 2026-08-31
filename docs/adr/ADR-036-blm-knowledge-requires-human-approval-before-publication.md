# ADR-036: BLM Knowledge Requires Governed Human Approval Before Publication

## Status

Accepted

## Context

BLM Knowledge Acquisition Pipeline v1 can acquire, normalize, map, validate,
fingerprint, and release approved proof knowledge. That still leaves a critical
governance gap: ambiguous, conflicting, externally-derived, or legally blocked
knowledge must not silently become trusted BLM knowledge.

## Decision

Add a deterministic human review and approval workflow in `@flow/blm-core`.

The workflow introduces review items, review reasons, review lifecycle states,
decision types, authorization metadata, review queues, evidence bundles,
mapping revisions, decision history, audit-compatible records, publication
eligibility gates, release candidates, source-update reviews, and impact
reports.

AI and source adapters may propose knowledge but cannot grant semantic, legal,
or publication authority.

## Consequences

Published BLM knowledge must pass explicit gates for source approval, license,
mapping approval, conflict resolution, provenance, validation, completed review,
and canonical semantic ID validity.

Global BLM review remains platform-scoped. Workspace-specific review remains
tenant-scoped and separate.

Old knowledge releases stay reproducible; source or mapping changes create new
review items and new release candidates.

## Alternatives Considered

- Let acquisition publish any mapped item automatically: rejected because
  semantic and legal risk require governed approval.
- Use LLMs to approve mappings: rejected because v1 authority must be human and
  auditable.
- Build a full ontology editor or admin UI now: deferred because this chapter
  only needs review, approval, rejection, remapping, conflict resolution, and
  publication authorization.
