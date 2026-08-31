# ADR-032: Business Semantic Model Before Composition Engine

## Status

Accepted

## Context

Flow is moving away from hard-coded industry templates as the primary
architecture. The future Business Composition Engine needs stable semantic
contracts for business profiles, capabilities, components, dependencies,
conflicts, and constraints before any resolver or blueprint compiler is built.

Existing foundations already define Workspace, Organization, Module Registry,
Universal Entity System, Action Wall, and BLM/Semantica boundaries. Replacing
those would duplicate working architecture and weaken tenant isolation.

## Decision

Add Business Semantic Model v0.1 as Flow-owned TypeScript contracts in
`packages/blm-contracts`.

The model introduces:

- semantic identifier convention
- BusinessCapability definitions with hierarchy
- tenant-scoped BusinessProfile
- business Component semantic contracts
- composition relationship vocabulary
- deterministic validation for IDs, scopes, dependencies, conflicts, capability
  references, and tenant/profile boundaries

Semantica remains behind the adapter boundary and is not the source of truth.

## Consequences

The future composition engine can build on deterministic, provider-neutral
contracts without introducing a resolver, ontology runtime, external schema
dependency, or workspace generation flow in this phase.

Global definitions remain platform-owned. Tenant-specific profile,
configuration, activation, override, and operational data remain workspace
scoped.

## Alternatives Considered

- Build the full Business Composition Engine now: rejected as premature.
- Use industry templates as the fundamental model: rejected because templates
  should become saved composition plans, not architecture.
- Make Semantica the canonical model: rejected because Flow must own tenant
  isolation, validation, and replaceability.
- Introduce RDF/LinkML/SHACL dependencies now: deferred until a concrete
  interchange or validation requirement exists.
