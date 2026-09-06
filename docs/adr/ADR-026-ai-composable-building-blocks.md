# ADR-026: AI-Composable Building Blocks Sit On The Trusted Module Registry

Status: Accepted

## Context

Flow must understand a business, recommend capabilities, and activate only
approved building blocks. ADR-020 already requires a trusted, code-defined
Module Registry. ADR-021 separates platform definitions from workspace
activation. ADR-024 and ADR-025 forbid executable metadata and silent
AI schema publication.

A parallel plugin runtime would violate those ADRs and create a second CRM.

## Decision

Building Blocks are the product-facing composition layer over the trusted
Module Registry.

- Manifests are typed, versioned, and code-defined.
- AI may recommend and prepare configuration.
- A founder or authorised administrator must approve activation.
- Installation is workspace-scoped.
- First-party records stay on typed domain tables. CRM Core reuses
  `crm_clients` and `crm_contacts`.
- Custom fields are configuration metadata, not new tables per workspace.
- Write tools create proposals. Merge and other protected writes require
  approval and an audit record.
- Disabling a block hides capability and does not delete business data.

## Consequences

Future blocks (Sales Pipeline, Marketing, Integration Hub) follow the CRM
Core template. Flow cannot generate arbitrary production React or runtime
SQL from the model.
