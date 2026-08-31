# ADR-044 — Questionnaires are portable JSON Schema

## Status

Accepted.

## Context

Service questionnaires must be versioned, validatable, and renderable. SurveyJS commercial products are out of scope.

## Decision

Store a JSON Schema document and a separate UI schema (presentation hints only). Validate with AJV on the server. Render with RJSF in the generic UI. Production responses attach to a published version id. RJSF internals are not stored.

## Consequences

- A later custom frontend can replace RJSF without migrating stored questionnaires.
- Only published versions accept production responses.
