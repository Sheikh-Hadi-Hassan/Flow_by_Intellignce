# ADR-033: Component Registry Bridges Semantics To Modules

## Status

Accepted

## Context

Business Semantic Model v0.1 introduced semantic Components and
BusinessCapabilities, but Flow still needs a trusted bridge from semantic
business meaning to executable platform functionality.

Existing ModuleDefinition records are trusted installable functionality. They
must not be replaced or merged with semantic Components because one semantic
Component may map to multiple module primitives and one module may expose
multiple semantic Components.

## Decision

Add Component Registry v0.1 to `packages/blm-contracts`.

The registry:

- registers trusted semantic components
- indexes capabilities to components
- distinguishes semantic-only from executable availability
- validates implementation bindings against trusted ModuleDefinition-shaped
  metadata
- exposes component dependencies and conflicts
- validates workspace component configuration per workspace
- returns structured machine-readable validation errors
- remains independent of Semantica

## Consequences

Future AI composition may propose component IDs, but only trusted registry
entries can participate in executable plans. Unknown component IDs, unknown
module bindings, invalid versions, missing dependencies, and direct conflicts
fail closed.

Workspace activation continues through the existing Module Registry and Action
Wall architecture. Component Registry does not create a parallel activation
system.

## Alternatives Considered

- Merge Component into ModuleDefinition: rejected because semantic meaning and
  trusted implementation are related but not identical.
- Create database persistence now: deferred because current Module Registry
  definitions are code-defined trusted metadata and no runtime publishing model
  exists yet.
- Let AI invent components: rejected because executable composition must be
  deterministic and trusted.
- Use Semantica as registry storage: rejected because Flow owns canonical
  composition contracts and tenant isolation.
