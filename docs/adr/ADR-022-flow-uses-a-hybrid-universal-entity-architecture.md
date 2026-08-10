# ADR-022: Flow Uses A Hybrid Universal Entity Architecture

Status: Accepted

## Context

Flow needs configurable business metadata, but a universal EAV database would
weaken integrity, reporting, indexing, permissions, and deterministic
validation.

## Decision

Use a hybrid entity architecture. First-party important domain records use
typed domain storage. The Entity Registry describes metadata, fields,
relationships, actions, and extension points.

## Consequences

Flow remains flexible without turning every business record into
entity-field-value rows.
