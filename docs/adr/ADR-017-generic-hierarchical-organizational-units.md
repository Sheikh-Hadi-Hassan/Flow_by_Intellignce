# ADR-017: Generic Hierarchical Organizational Units

Status: Accepted

## Context

Flow will need departments, divisions, teams, branches, and similar structures
across many business types. Creating separate systems for each now would
overfit early assumptions.

## Decision

Use a generic `organization_units` model with adjacency hierarchy through
`parent_unit_id`. Unit types are constrained to a small extensible set:
division, department, team, branch, and other.

## Consequences

The model supports simple hierarchy without graph databases, nested sets, or
recursive caches. Database constraints and a cycle trigger protect basic
relationship integrity.
