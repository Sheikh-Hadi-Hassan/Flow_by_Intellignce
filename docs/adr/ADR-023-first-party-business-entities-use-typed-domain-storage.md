# ADR-023: First-Party Business Entities Use Typed Domain Storage

Status: Accepted

## Context

Future modules such as CRM, projects, invoices, documents, and HR will need
strong queries, reporting, constraints, permissions, and audits.

## Decision

First-party business entities use typed models and proper database tables.
Entity Registry metadata describes those entities but does not replace their
authoritative storage.

## Consequences

Future modules can use precise schemas while still exposing capabilities,
fields, and relationships through a shared registry.
