# Business Semantic Model v0.1

## Purpose

Business Semantic Model v0.1 establishes the canonical Flow-owned semantic
contract needed for a future Business Composition Engine. It does not build AI
business discovery, automatic composition, workspace generation, or dynamic UI.

The future composition pipeline remains:

Business Intent -> Business Profile -> Required Business Capabilities ->
Candidate Components -> Dependency/Constraint Resolution -> Composition Plan ->
Deterministic Validation -> Workspace Blueprint -> Runtime Configuration.

This version only models the semantic input surface and deterministic validation
foundations required by that pipeline.

## Concept Mapping

| Concept                        | Decision | Current Flow primitive                                               |
| ------------------------------ | -------- | -------------------------------------------------------------------- |
| Workspace                      | REUSE    | Tenant/security boundary from identity and authorization foundation. |
| Organization                   | REUSE    | Business entity inside workspace.                                    |
| Module                         | REUSE    | Trusted platform module definition plus workspace activation.        |
| Entity                         | REUSE    | Universal Entity System definitions and typed domain storage.        |
| Record                         | REUSE    | Future typed records or validated extension containers.              |
| Role / Actor / Action / Policy | REUSE    | Identity, Action Wall, approval, and authorization contracts.        |
| Decision / Workflow / Event    | EXTEND   | Existing execution spine concepts; semantic references only in v0.1. |
| BusinessProfile                | NEW      | Tenant-scoped semantic description of a workspace business.          |
| BusinessCapability             | NEW      | Global, implementation-independent capability taxonomy.              |
| Component                      | NEW      | Business building block, not a UI component.                         |
| Screen / Widget                | DEFER    | Semantic references only; no dynamic UI generation.                  |
| Integration                    | DEFER    | Semantic references only; no connector runtime.                      |
| DataContract / AIContract      | NEW      | Reference contracts for future schema/tool compatibility validation. |
| Dependency / Constraint        | NEW      | Deterministic composition metadata; no resolver yet.                 |

## Semantic Identifier Convention

New Business Semantic Model identifiers use stable machine-readable strings:

`flow.<kind>.<domain>.<name>[@major.minor.patch]`

Examples:

- `flow.capability.sales.lead-management`
- `flow.capability.finance.invoicing`
- `flow.component.crm.lead-management@1.0.0`
- `flow.component.finance.invoice-management@1.0.0`

Rules:

- IDs are independent from database primary keys.
- IDs are lowercase, dot-separated, and human-readable.
- Version suffixes are used for versioned component/contract definitions.
- Existing module keys such as `core.organization` remain valid Module Registry
  keys; semantic IDs map to them instead of replacing them.

## Global Vs Tenant Knowledge

Global knowledge is platform-approved semantic definition:

- business capability definitions
- component definitions
- component dependency and conflict metadata
- DataContract and AIContract references
- semantic relationship vocabulary

Tenant-specific knowledge is workspace-owned state:

- BusinessProfile
- required capabilities for a workspace
- enabled components and component configuration
- business-specific approval thresholds, terminology, overrides, and future
  composition state
- operational records and actual business data

Global definitions must not carry `workspaceId`. Workspace definitions and
profiles must carry `workspaceId`. Semantica may mirror workspace metadata, but
Flow remains the tenant boundary.

## BusinessCapability

`BusinessCapability` is implementation-independent and supports hierarchy.

Example hierarchy:

- `flow.capability.sales.core`
- `flow.capability.sales.lead-management`
- `flow.capability.sales.quotation-management`
- `flow.capability.sales.quotation-approval`

Capabilities are the future composition language. Components provide and require
capabilities; BusinessProfile instances require capabilities; deterministic
validation checks whether enabled components satisfy those requirements.

## BusinessProfile

`BusinessProfile` is tenant-scoped and describes a workspace's business context:

- business type and model
- products and services
- customer types
- departments and team structure
- locations
- required capabilities
- sales and billing models
- approval requirements
- important processes
- compliance requirements
- integrations
- business scale

AI may eventually propose this profile, but v0.1 treats it as deterministic
data that must be validated before use.

## Component Boundary

A Flow `Component` is a business building block, not a UI component.

It may describe:

- provided capabilities
- required capabilities
- component dependencies
- component conflicts
- entity, action, workflow, decision, event, policy, screen, widget,
  integration, DataContract, AIContract, and constraint references

v0.1 only stores and validates the contract. It does not activate components,
resolve dependencies, generate screens, or execute actions.

## Relationship Model

The model supports controlled composition relationships including:

- BusinessProfile REQUIRES BusinessCapability
- Component PROVIDES BusinessCapability
- Component REQUIRES BusinessCapability
- Component DEPENDS_ON Component
- Component CONFLICTS_WITH Component
- Component USES Entity / Workflow / Decision
- Component PRODUCES or CONSUMES Event
- Component EXPOSES Action
- Component GOVERNED_BY Policy
- Component RENDERS Screen
- Component INTEGRATES_WITH Integration
- Entity HAS DataContract
- Component HAS AIContract

Relationship validation is deterministic. Unknown capability references,
duplicate capability references, self-dependencies, self-conflicts, and graph
cycles are rejected.

## BLM And Semantica Boundary

The canonical contract lives in `packages/blm-contracts`.

Semantica remains an optional implementation capability behind
`services/blm-semantic-kernel`. It is not the source of truth for composition
architecture, tenant isolation, authorization, or validation.

## Proof Scenario

The v0.1 tests model one small marketing agency:

- Lead Management provides Manage Leads.
- Customer Management provides Customer Management.
- Quotation Management provides Generate Quotations and requires Customer
  Management.
- Quotation Approval provides Approve Quotations and requires Quotation
  Management.
- Project Management provides Manage Projects.
- Invoice Management provides Issue Invoices and requires Customer Management.

The test proves that a BusinessProfile can require these capabilities and that
components can theoretically satisfy them. It does not perform automatic
composition.

## Deferred Composition Engine

Deferred intentionally:

- AI business discovery
- candidate component search
- dependency/constraint resolver
- composition plan persistence
- workspace blueprint compiler
- dynamic screen generation
- industry template generation
- external ontology sync
- vector search, RAG, and LLM-based resolution

Templates should eventually become saved/versioned known-good Composition Plans,
not the primary architecture.

## Component Registry Follow-Up

Component Registry v0.1 now provides the trusted bridge from semantic Components
to trusted ModuleDefinition metadata. It keeps Component and ModuleDefinition
separate, distinguishes semantic-only from executable availability, and exposes
deterministic lookup for future Composition Resolver work.
