# Northstar canonical data model

DEMO-01. Implements nothing. Defines identity so later blocks cannot fork
records.

## Agency

Northstar Creative is a **fictional** full-service creative and marketing
agency. It is not a real registrant. Every identifier is prefixed `DEMO`
or uses the `ns-` / `00000000-0000-4000-a000-` demo UUID series already
used in CRM Core.

### Designed legal profile (seed in DEMO-02, not inserted now)

| Field | Fictional value |
|---|---|
| Registered legal name | Northstar Creative Studio LLC |
| Trading name | Northstar Creative |
| Entity type | Limited liability company |
| Registration number | DEMO-LLC-2021-08417 |
| Jurisdiction | State of Illinois, USA |
| Formation date | 2018-04-16 |
| Status | Active |
| Principal office | 400 Northstar Yard, Suite 12, Chicago, IL 60642-DEMO |
| Branch | 18 Demo Canal Walk, Austin, TX 78701-DEMO |
| Fiscal year | 1 January – 31 December |
| Operating currency | USD |
| Tax jurisdictions | Illinois, Texas, federal USA |
| Federal tax ID (masked) | DEMO-36-0008417 |
| Illinois tax ID (masked) | DEMO-IL-0008417 |
| Ownership | Maya Chen 70%, Ellis Holdings DEMO 30% |
| Directors / signatories | Maya Chen (managing member), Jordan Ellis (operations) |
| Insurance | Professional liability DEMO-PL-4419 (renews 2027-03-01); general liability DEMO-GL-2088 (renews 2027-01-15) |
| Bank operating (masked) | DEMO Bank · ****0429 |
| Bank payroll (masked) | DEMO Bank · ****1183 |
| Accounting method | Accrual |
| Standard payment terms | Net 30 |
| Data-retention | Client files 7 years after last invoice; candidate data 24 months |
| Privacy policy | Published v3, effective 2026-01-06 |
| Compliance owners | Jordan Ellis (operations), Maya Chen (controller) |

Never use a real EIN, Illinois file number, or live bank routing number.

## Demo clock

| Setting | Value |
|---|---|
| Timezone | `America/Chicago` |
| Instant | `2026-09-03T08:12:00-05:00` |
| Local date | Thursday 3 September 2026 |
| Week of | Monday 31 August 2026 |
| History window | 2025-03-01 through clock (18+ months) |

All `at`, `due`, `close`, `issued`, and `renews` timestamps are offsets
from this clock. Seeds import `northstarDemoClock()` from one module.
`Date.now()` is forbidden in seed generators.

## Tenant model

```
workspace (northstar-creative)
  └── organization (Northstar Creative Studio LLC)     BB-01 owns
        ├── locations (Chicago, Austin)
        ├── units / departments
        ├── employees / contractors → resource_profiles
        └── operating records keyed by workspace_id
```

Workspace remains the RLS boundary (ADR-019 / identity migrations).
Organization is the **business** legal entity inside the workspace, not a
second tenant.

## Canonical record IDs

One ID per real-world thing. Blocks **reference**; they do not copy.

| Canonical kind | ID namespace (examples) | Owner block | Storage today |
|---|---|---|---|
| Workspace | `northstar-creative` slug + UUID | Platform | `workspaces` |
| Agency organisation | `ns-org-northstar` | BB-01 | `organizations` |
| Location | `ns-loc-chicago`, `ns-loc-austin` | BB-01 | `organization_locations` |
| Client | CRM Core UUIDs + `ns-client-*` aliases | BB-02 | `crm_clients` |
| Contact | CRM Core UUIDs | BB-02 | `crm_contacts` |
| Employee | `ns-res-maya`, … (24) | BB-09 | `resource_profiles` |
| Vendor / contractor org | `ns-vendor-*` | BB-14 | **missing** |
| Opportunity | `ns-opp-acme-brand`, … | BB-03 | `crm_opportunities` |
| Proposal | existing commercial IDs | BB-05 | `proposals` |
| Contract | existing commercial IDs | BB-06 | `contracts` |
| Project | `ns-project-acme`, … | BB-07 | `projects` |
| Task | `ns-task-*` | BB-08 | `project_tasks` |
| Invoice | `inv-2041`, … | BB-12 | **missing SQL** |
| Campaign | `ns-camp-*` | BB-04 | **missing** |
| Approval | existing guard / write-proposal IDs | BB-15 | mixed |

Mission Control snapshot IDs already in `apps/web/src/lib/mission-control/seed.ts`
**are** the current-period canonical IDs. Historical rows (70 opportunities,
35 projects, 150 invoices, 1_000 tasks) are additional IDs that must not
collide with those eight / five / three / four current snapshot rows.

## Relationship graph (no duplicated money)

```
organization 1──* location
organization 1──* department
employee     *──1 department
employee     *──1 manager (employee)
client       *──1 organization  (agency)
contact      *──1 client
client       *──1 relationship owner (employee)
opportunity  *──1 client
opportunity  *──* contact (roles: decision, billing, legal)
opportunity  *──1 owner (employee)
proposal     *──1 opportunity
negotiation  *──1 proposal
contract     *──1 opportunity
contract     *──1 client
change_order *──1 contract
project      *──1 contract
project      *──1 client
phase        *──1 project
milestone    *──1 project
deliverable  *──1 project
task         *──1 project (optional phase)
assignment   *──1 task, *──1 employee
time_entry   *──1 employee, *──1 project|task
invoice      *──1 client, 0..1 contract, 0..1 project
payment      *──1 invoice
expense      *──1 project, 0..1 vendor
campaign     *──* leads → convert to opportunity (same client if known)
```

## Building-block ownership

A block **owns** write authority and schema for its tables. Other blocks
may read by ID and consume events.

| Block | Owns | Must not copy |
|---|---|---|
| BB-01 Business Registry | Agency org, locations, licences, insurance, bank (masked), documents | Client orgs |
| BB-02 CRM Core | Clients, contacts, interactions, segments, duplicates | Opportunities, invoices |
| BB-03 Sales Pipeline | Opportunities, stages, activities, forecast category | Client master |
| BB-04 Marketing | Campaigns, leads, scores, attribution | Opportunity after conversion |
| BB-05 Proposals | Proposals, versions, negotiations, discounts | Contract body |
| BB-06 Contracts | Contracts, clauses, redlines, change orders | Invoice rows |
| BB-07 Projects | Projects, phases, milestones, deliverables, risks | Task engine details may sit in BB-08 |
| BB-08 Tasks | Tasks, dependencies, estimates, comments, rework | Project header |
| BB-09 People | Employees, schedules, attendance, leave, timesheets | Protected HR demographics |
| BB-10 Performance | Dimensioned observations and evidence links | Attendance as a score |
| BB-11 Capacity | Availability, allocations, over/under | Employee master |
| BB-12 Invoicing | Invoices, payments, credit notes | Contract value (referenced) |
| BB-13 Profitability | Calculated facts from other owners | Source money rows |
| BB-14 Vendors | Vendor orgs, contractor engagements | Employees |
| BB-15 Workflow | Approval policies, queues, notifications | Domain payloads |
| BB-16 Integration | Connections, sync runs, exceptions, migration reports | Canonical records (maps onto them) |
| BB-17 Analytics | Metric definitions, saved views | Underlying facts |
| BB-18 Security | Roles, grants, retention, export policy | Business documents (BB-01) |

CRM Core (`crm.core`) already exists. Later blocks follow the same
`BuildingBlockManifest` contract.

## Configuration vs schema

AI may recommend:

- Pipeline stages, required fields, custom field **definitions**
- Segment rules, approval thresholds, payment terms, phases
- Performance dimensions, capacity rules, invoice schedules

AI may not:

- Emit production React
- `CREATE TABLE` at runtime
- Invent permissions
- Change the formulas in `@flow/commercial`

Custom fields are JSON on the owned row (`crm_clients.custom_fields` pattern),
validated by the block configuration schema.

## Current Mission Control snapshot (must stay reconcilable)

Open opportunities (unweighted 68_900_000, weighted 40_487_500):

| ID | Client | Value minor | Probability bps | Weighted minor |
|---|---|---|---|---|
| `ns-opp-acme-brand` | Acme Robotics | 8_500_000 | 9500 | 8_075_000 |
| `ns-opp-meridian` | Meridian Health | 12_400_000 | 6500 | 8_060_000 |
| `ns-opp-northwind` | Northwind Bank | 18_000_000 | 4500 | 8_100_000 |
| `ns-opp-vantage` | Vantage Logistics | 9_650_000 | 5500 | 5_307_500 |
| `ns-opp-halcyon` | Halcyon Energy | 6_750_000 | 9000 | 6_075_000 |
| `ns-opp-lumen` | Lumen Studios | 5_800_000 | 2500 | 1_450_000 |
| `ns-opp-kestrel` | Kestrel Foods | 4_200_000 | 3000 | 1_260_000 |
| `ns-opp-orbit` | Orbit Labs | 3_600_000 | 6000 | 2_160_000 |

Active projects (contract values sum 34_750_000):

| ID | Client | Contract minor |
|---|---|---|
| `ns-project-acme` | Acme Robotics | 8_500_000 |
| `ns-project-meridian` | Meridian Health | 6_400_000 |
| `ns-project-vantage` | Vantage Logistics | 5_200_000 |
| `ns-project-northwind` | Northwind Bank | 11_800_000 |
| `ns-project-kestrel` | Kestrel Foods | 2_850_000 |

Known overdue invoices (sum 2_775_000): `inv-2041` 1_850_000 + `inv-2038`
925_000.

If a later seed cannot hit these totals, **every** consumer and test
updates together. Do not patch Mission Control labels.

## Partial-data state

In addition to empty / loading / populated / error / restricted / dense:

**partial-data** — the block is active but some referenced canonical records
are missing or unscored (migration exception, incomplete discovery). UI
must name the missing IDs, not invent values.

## Events

Blocks communicate with typed events and canonical IDs. Example:

- BB-02 `client.created` → BB-03 may attach an opportunity
- BB-06 `contract.executed` → BB-07 may open a project
- BB-08 `task.completed` → BB-10 may record an on-time observation
- BB-12 `invoice.overdue` → BB-02 health evidence, BB-13 cash forecast

No UI-to-UI imports between blocks.
