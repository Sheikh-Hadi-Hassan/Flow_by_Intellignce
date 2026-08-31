# Component Registry v0.1

## Purpose

Component Registry v0.1 is the trusted deterministic bridge between global
business semantics and installable Flow functionality.

The boundary is:

BusinessCapability -> Business Component -> Trusted Component Registry ->
ModuleDefinition -> Workspace Module Activation -> Workspace Configuration.

This phase does not implement automatic composition, workspace blueprint
compilation, dynamic UI generation, or component activation.

## Component Vs ModuleDefinition

A semantic Component describes what business functionality means.

A `ModuleDefinition` describes trusted executable/installable Flow
functionality.

They are not identical:

- One Component may eventually require multiple module primitives.
- One ModuleDefinition may eventually expose multiple Components.
- A Component may be semantically known before Flow has an executable module.
- Module activation remains workspace-scoped through the existing Module
  Registry.

Component Registry therefore uses an explicit implementation binding instead of
merging Components into ModuleDefinition.

## Trust Boundary

AI and semantic reasoning may propose component IDs such as
`flow.component.sales.quotation-management`.

Only IDs registered in the trusted Component Registry may be used as executable
composition candidates. Unknown component IDs fail closed. Unknown
ModuleDefinition bindings fail closed. Invalid versions fail closed.

Tenant users cannot define global executable bindings. Registry definitions are
trusted platform metadata.

## Global Vs Tenant State

Global:

- component registrations
- component lifecycle and version metadata
- component-to-capability mappings
- component-to-module bindings
- dependencies and conflicts
- configuration contracts

Tenant-scoped:

- workspace module activation
- workspace component configuration
- workspace BusinessProfile
- workspace-specific policies and rules
- future composition state

Global `ComponentRegistration` records must not contain `workspaceId`.
Workspace component configuration requires `workspaceId`.

## Registry API

The registry supports deterministic lookup:

- `getComponent`
- `requireComponent`
- `isTrustedComponent`
- `findComponentsProvidingCapability`
- `getCapabilitiesProvidedByComponent`
- `getCapabilitiesRequiredByComponent`
- `getComponentDependencies`
- `getComponentConflicts`
- `getImplementationBinding`
- `getAvailabilityReport`
- `validateComponentSet`
- `setWorkspaceComponentConfiguration`

The API is storage-agnostic. v0.1 uses trusted code-defined definitions, matching
the current Module Registry pattern.

## Semantic Availability Vs Executable Availability

`SEMANTIC_ONLY` means Flow knows what the component means, but no trusted
ModuleDefinition implements it yet.

`EXECUTABLE` means the component has one or more trusted ModuleDefinition
bindings and can become an executable candidate after existing authorization,
module activation, and configuration checks.

The registry never silently upgrades semantic-only components into executable
components.

## Implementation Binding

`ComponentImplementationBinding` maps a semantic component to trusted module
metadata:

- module key
- module version
- required/optional binding flag
- purpose

The binding is structural so it can validate against the existing
`ModuleDefinition` shape without making Semantica or a persistence layer part of
the registry contract.

## Dependencies And Capability Requirements

Capability requirements are flexible:

`Quotation Management requires Customer Management capability.`

Component dependencies are hard implementation requirements:

`Quotation Management depends on Customer Management component.`

Prefer capability requirements where possible. Hard component dependencies
should only be used when a specific implementation dependency is necessary.

## Conflicts

v0.1 detects explicit direct conflicts and fails candidate-set validation. It
does not resolve alternatives.

Example:

`Quotation Approval conflicts with Simple Quotation.`

Future Composition Resolver work can choose alternatives, but this registry
only detects and reports conflicts deterministically.

## Versioning And Lifecycle

Component semantic identity is stable and unversioned:

`flow.component.sales.quotation-management`

Version is separate:

`version: 1.0.0`

Lifecycle states:

- `EXPERIMENTAL`
- `ACTIVE`
- `DEPRECATED`
- `RETIRED`

Only active executable components report executable availability.

## Configuration Contract

Components may expose deterministic configuration contracts with field types:

- `STRING`
- `BOOLEAN`
- `INTEGER`
- `DECIMAL`
- `ENUM`

Workspace component configuration is validated against the component contract
and stored per workspace in the registry abstraction. This does not replace the
existing workspace module activation system.

## Proof Components

The proof set contains:

- Customer Management
- Lead Management
- Quotation Management
- Quotation Approval
- Project Management
- Invoice Management
- Task Management

These are semantic-only because trusted CRM, sales, projects, finance, and task
ModuleDefinitions do not exist yet.

The proof also includes an executable `Organization Profile` component bound to
the existing trusted `core.organization` ModuleDefinition shape.

## Future Composition Resolver Integration

Future pipeline:

BusinessProfile -> Capability Requirement Set -> Component Registry ->
Composition Resolver -> Composition Plan -> Validator -> Workspace Blueprint
Compiler.

This task implements only the Component Registry and its immediate deterministic
ModuleDefinition boundary.
