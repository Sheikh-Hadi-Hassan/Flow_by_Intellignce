# 10 — Phase 2 Implementation Contract

## Phase name

**Phase 2: Service catalogue, discovery, deterministic scope, and versioned brief approval**

## User outcome

A founder can start from a clean authenticated workspace and complete:

Create service → publish questionnaire → create client/contact → create opportunity → complete discovery → save meeting notes → review extracted facts → answer missing questions → run deterministic business math → generate versioned brief → request founder review → approve immutable brief.

## In scope

- Catalog services, pricing models, cost components
- Versioned JSON Schema questionnaires (draft / published / archived)
- Clients and contacts (CRM entities; not workspace `organizations`)
- Opportunities and discovery sessions
- Raw meeting notes / sources and draft extracted facts
- Requirements, deliverables, budget/timeline constraints, risks
- Follow-up questions and answers
- Versioned briefs, sections, evidence references, Guard decisions
- Deterministic money/margin/completeness calculations
- XState-defined journey with Postgres as canonical status
- Generic admin UI using existing Flow tokens
- Isolated Northstar Creative demo scenario (Acme Robotics)

## Out of scope (not started)

Proposals, contracts, project conversion, invoicing, employee/client/vendor portals, voice, MCP server, LangGraph, deployment, GitHub push/PR.

## Authority

All mutations go through NestJS commercial services. RLS and permission keys both enforce workspace isolation. AI extraction produces draft facts only.

## Routes (generic UI)

```text
/:workspace/admin/services
/:workspace/admin/services/:id
/:workspace/admin/clients
/:workspace/admin/clients/:id
/:workspace/admin/opportunities
/:workspace/admin/opportunities/:id
/:workspace/admin/opportunities/:id/discovery
/:workspace/admin/opportunities/:id/missing
/:workspace/admin/opportunities/:id/brief
/:workspace/admin/opportunities/:id/approvals
```

## Done when

The golden path survives refresh, sign-out/sign-in, and direct URL navigation. Cross-tenant access returns no private information. Approved brief versions cannot be mutated.
