# ADR-025: AI-Generated Schema Changes Must Be Draft-First

Status: Accepted

## Context

Future AI onboarding may propose custom entities, fields, relationships,
module activations, and business configuration.

## Decision

AI-generated schema changes must be draft-first. They must pass deterministic
validation and require user approval before activation. AI does not silently
publish schema changes.

## Consequences

Future AI configuration can be useful without bypassing Action Wall,
validation, audit, or human approval.
