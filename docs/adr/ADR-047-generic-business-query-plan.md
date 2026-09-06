# ADR-047: Ask Flow Uses Validated Generic Business Query Plans

Status: Accepted

## Context

Ask Flow needs reusable deterministic reads without adding phrase-specific data
access or allowing model-generated SQL. Query structure, entity capabilities,
and authorization must remain server-controlled.

## Decision

- Version 1 plans support only `list` and `count` operations for registered
  entities.
- JSON Schema validates plan shape before semantic registry validation.
- A server-owned registry allow-lists entity operations, readable fields,
  filters, sorting, permissions, building blocks, adapters, and evidence policy.
- The executor independently enforces workspace, permission, and building-block
  boundaries before invoking an adapter exactly once.
- Adapters load allow-listed projections from existing Northstar sources. The
  executor owns de-duplication, filtering, sorting, limits, projection, and
  deterministic evidence; it does not generate SQL or perform writes.
- Client `workspaceId` is authorization context only and is never selectable,
  filterable, sortable, or returned in query rows.
- Client, project, and employee reads are registered. Task reads remain
  explicitly unavailable until a complete server-owned task source exists.
- Metric definitions are server-owned count plans; models cannot provide
  formulas.
- The existing `list_clients` tool remains the intent-facing capability and now
  delegates retrieval through the generic executor.
- `/api/ask` resolves bounded deterministic query language before invoking the
  legacy intent adapters. Recognized reads produce one validated plan, one
  adapter execution, one evidence emission, and one terminal metadata event.
- Destructive language and explicit foreign-workspace requests are denied
  before either generic or legacy execution. Registered legacy qualifiers such
  as client health, inactive clients, and team capacity remain on the existing
  tool route.

## Consequences

Invalid plans fail before data access, and browser input cannot extend the
registry. New entities require an explicit server registry entry and adapter.
Availability and authorization are discriminated registry states; a missing or
null building-block value cannot silently disable enforcement. Client uses the
implemented `crm.core` block plus `client.read`. Project and employee use an
explicit permission-only boundary because the existing server tools and
server-owned Northstar viewer already establish `project.manage` as their
authority. No BB-07, BB-08, or BB-09 runtime identifier is invented.

Task list/count and task metrics return typed `CAPABILITY_UNAVAILABLE` results,
load no adapter, and emit no records. Generated browser-session project tasks
are not promoted into server facts. This prevents missing data from degrading
into fabricated fixtures.

The current contract intentionally does not support joins, aggregates beyond
registered counts, compound commands, or mutations.

## Phase Gate

BLM-CORE-02A is closed by BLM-CORE-02B for MVP scope: client, project, and
employee are enabled under explicit authorization modes; task and its metrics
are explicitly unavailable. The deterministic runtime may proceed while task
support remains unavailable.

BLM-CORE-03A wires this plan into the live Ask Flow route. Task unavailability,
server-owned authorization, and legacy Action Wall behavior remain unchanged.
