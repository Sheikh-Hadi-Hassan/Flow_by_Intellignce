# DEMO-01 — CRM reference analysis

Milestone: DEMO-01 only. No DEMO-02 implementation in this run.

## Source

| Item | Value |
|---|---|
| Requested path | `docs/product-research/CRM-CAPABILITY-REFERENCE.md` |
| Workspace state on 2026-09-03 | File was absent |
| Public page analysed | `https://softteco.com/custom-crm-development` |
| Retrieval date | 2026-09-03 |
| Flow extract | `docs/product-research/CRM-CAPABILITY-REFERENCE.md` (capability-only) |
| Runtime dependency | None. Seeds must not fetch this URL |

The public page is a service-provider marketing site. Flow used it only to
extract **product capabilities**. Vendor identity is not part of Northstar
data.

## Capabilities extracted

Mapped onto Flow building blocks. One capability may span several blocks.

| Reference group | Flow product capability | Primary blocks |
|---|---|---|
| Consulting / business analysis | Discover actual pipeline, lifecycle, roles, KPIs, data model | BB-01, BB-15, BB-17 |
| Custom development | Process-shaped pipelines, tasks, forecast, role UI | BB-03, BB-08, BB-17 |
| Customisation | Schema-driven fields, stages, automations — not generated React/SQL | Platform + every block config |
| Integrations | Source of truth, sync, retries, monitoring, duplicates | BB-16 |
| Data migration | Profiling, mapping, test load, reconciliation, exceptions | BB-16 |
| Support and scaling | SLAs, audit, RBAC, release cadence | BB-18 |
| Sales / opportunity | Stages, ownership, required fields, forecast rules | BB-03, BB-05 |
| Customer relationship | Profiles, interactions, segments, duplicates | BB-02 |
| Marketing automation | Campaigns, scoring, attribution, routing | BB-04 |
| Analytics / reporting | Stable KPIs from pipeline definitions | BB-17 |
| Workflow automation | Approvals, notifications, validation | BB-15 |
| Security / compliance | RBAC, audit, export control, retention | BB-18, BB-01 |

## Marketing content intentionally excluded

Do not copy into Northstar records, Mission Control, Ask Flow answers, or
tests:

- Vendor name, awards, review scores, office addresses, contact email
- “Start your CRM project” and similar CTAs
- Cost ranges and hourly-rate bands
- Claimed “14.5% higher sales productivity”
- Claimed “12.2% lower marketing overhead”
- Claimed “20% more sales team capacity”
- Claimed “60% operational efficiency”
- Named case-study companies, stacks, and outcome claims
- Partnership claims for third-party CRM products

Those figures are **not** Northstar business data. They are not sourced for
this agency, not applicable as operating metrics, and not documented as
facts.

## What the reference is really saying (product translation)

1. **Do not ship a generic CRM template.** Stages, required fields, and
   forecast rules must match how the agency sells.
2. **One customer record.** Leads, opportunities, and clients share a
   canonical identity. Integrations declare a source of truth per field.
3. **Forecasting is a process.** Probability lives on the opportunity with
   required stage fields. Ambiguous numbers are a defect.
4. **Handoffs are first-class.** Sales → proposal → contract → project must
   keep the same client, opportunity, and money IDs.
5. **Duplicates and dirty history are expected.** Migration and CRM Core
   both need profiling, merge proposals, and a reconciliation report.
6. **Security is operational.** RBAC, audit, and export control are product
   surfaces, not a launch checklist.
7. **AI configures; it does not invent the system.** Custom objects in the
   reference become Flow configuration schemas on approved blocks.

## Existing Flow entities that can be reused

Do not create a second CRM, a second organisation, or a second opportunity.

| Existing artefact | Reuse as |
|---|---|
| `public.workspaces` | Tenant / security boundary |
| `public.organizations`, `organization_units`, `organization_locations` | BB-01 legal entity, units, offices |
| `public.crm_clients`, `crm_contacts`, `crm_interactions`, `crm_duplicate_candidates` | BB-02 |
| `public.crm_opportunities` plus discovery/brief tables | BB-03 (adapt, do not fork) |
| `public.proposals`, versions, sections, pricing, shares | BB-05 |
| `public.contracts`, clauses, parties, payment schedule | BB-06 |
| `public.projects`, phases, milestones, deliverables, tasks, assignments | BB-07, BB-08 |
| `public.resource_profiles`, skills, schedules, exceptions | BB-09, BB-11 |
| `flow_internal.business_audit_events` | Cross-block audit sink |
| `canonical_business_records` / relationships | Optional overlay; **not** a second identity for clients |
| Module Registry + BuildingBlockManifest (ADR-020/021/026) | Block contract |
| Action Wall + write proposals | Protected writes |
| Ask Flow tools | Read vs propose |
| `@flow/commercial` money helpers | Minor units, bps, labour cost |
| Mission Control snapshot (8 opps, 5 projects, 3 decisions) | Reconciliation target — not a parallel dataset |
| Northstar CRM Core seed (52 clients, Brightline duplicates) | Extend, do not replace |

## Missing domain entities (no table today)

These are required for later milestones. DEMO-01 does not create them.

| Entity | Needed by | Notes |
|---|---|---|
| Legal registration, licences, insurance, bank accounts, tax IDs | BB-01 | Extend `organizations`; do not invent a second company row |
| Client firmographics / health evidence | BB-02 | Configuration + evidence rows, not a new client table |
| Campaign, lead, attribution, score | BB-04 | New owned tables; lead converts **to** `crm_opportunities` |
| Negotiation event, concession, margin impact | BB-05 | Versioned events on proposal/opportunity |
| Contract risk, redline, change order | BB-06 | Extend contracts |
| Time entry, timesheet, attendance, leave | BB-09 | New; reference `resource_profiles` |
| Performance observation (dimensioned) | BB-10 | New; never a single unexplained score |
| Invoice, payment, credit note, expense | BB-12 | **Missing SQL.** Today only Mission Control `InvoiceSignal` |
| Overhead allocation, recognition event | BB-13 | Calculated from invoices + time + expenses |
| Vendor / contractor organisation | BB-14 | Distinct from `crm_clients` |
| Integration connection, sync run, exception | BB-16 | New |
| Saved report / metric definition | BB-17 | Reads other blocks; owns definitions only |
| HR-restricted demographic cohort | BB-09/18 | Separate dataset, never on the employee card |

## Canonical relationship rule

Every operating record points at **one** of:

`workspace_id` → `organization_id` (agency) → canonical IDs for
client, contact, employee, opportunity, proposal, contract, project,
task, invoice, vendor.

Mission Control, Ask Flow, and building-block UIs **select** those IDs.
They do not keep a private copy of money or names.

## Safe demographic-data rules

- Employee performance uses operational dimensions only (delivery, quality,
  utilisation, margin contribution, attendance reliability as **one of
  several** dimensions).
- Protected attributes, if ever seeded for an HR-compliance demo, live in
  `hr.restricted_demographics` (DEMO-07).
- Normal managers cannot read row-level protected attributes.
- UI shows aggregates only, cohort size ≥ 5, labelled fictional.
- Attendance is never the sole performance measure.

## Demo clock

See `NORTHSTAR-DATA-MODEL.md`. One clock: **2026-09-03T08:12:00-05:00**
(`America/Chicago`). Seeds must not call `Date.now()`.

## Financial formulas (authoritative)

Money is integer **minor units**. Ratios are **basis points**.

```
weighted_pipeline = Σ (opportunity.value_minor × probability_bps ÷ 10_000)
  using banker's-style half-up integer division already in @flow/commercial
```

Verified current snapshot (must be produced by records, not hardcoded UI):

| Metric | Minor units | Display |
|---|---|---|
| 8 open opportunities unweighted | 68_900_000 | $689K |
| Weighted pipeline | 40_487_500 | $404.9K |
| Forecast revenue | 31_240_000 | $312.4K |
| 5 active project contract values | 34_750_000 | $347.5K |
| Receivables | 11_580_000 | $115.8K |
| Overdue (2 invoices) | 2_775_000 | $27,750 |
| At-risk work | 11_600_000 | $116K |
| Combined decision exposure | 35_600_000 | $356K |

Project gross profit (DEMO-08):

```
recognised_revenue
− direct employee labour
− contractor cost
− direct project expenses
− pass-through cost
```

Contribution profit = gross profit − allocated operating overhead.

AI **explains** these. `@flow/commercial` **computes** them.

## Seed safety (summary)

Deterministic, idempotent, workspace-scoped, demo-workspace only, no
delete of user-created rows, validation-only mode, reconciliation report.
Full plan: `NORTHSTAR-PROVENANCE-PLAN.md` and `NORTHSTAR-MILESTONE-PLAN.md`.

## DEMO-01 verdict

**PASS for DEMO-01** — the reference is fully analysed as capabilities,
marketing is excluded, existing tables are the canonical records, and the
architecture below can host BB-01…BB-18 without a second client, employee,
or opportunity identity.

Not overall product PASS. No DEMO-02 code, no browser journey, no live
seed in this run.
