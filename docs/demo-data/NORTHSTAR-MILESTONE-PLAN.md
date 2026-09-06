# Northstar milestone plan

Depth-first. One milestone per run. Stop before the next.

## Sequence

| ID | Name | Blocks first-class | Depends on |
|---|---|---|---|
| DEMO-01 | Source analysis, canonical model, demo clock | None (docs) | — |
| DEMO-02 | Business Registry and firmographics | BB-01 | DEMO-01 |
| DEMO-03 | CRM clients, contacts, interactions | BB-02 | DEMO-02 |
| DEMO-04 | Sales, marketing, opportunities, negotiations | BB-03, BB-04 | DEMO-03 |
| DEMO-05 | Proposals, contracts, clauses, approvals | BB-05, BB-06 | DEMO-04 |
| DEMO-06 | Projects, milestones, tasks, delivery risks | BB-07, BB-08 | DEMO-05 |
| DEMO-07 | Employees, attendance, performance, capacity | BB-09, BB-10, BB-11 | DEMO-06 |
| DEMO-08 | Invoices, payments, vendors, profitability | BB-12, BB-13, BB-14 | DEMO-07 |
| DEMO-09 | Events, Ask Flow, reconciliation | BB-15–18 (wire) | DEMO-08 |
| DEMO-10 | Full UI, a11y, browser verification | All activated in demo | DEMO-09 |

Each milestone repeats:

1. Inspect existing implementation
2. Reuse existing data and functions
3. Define or extend the block contract
4. Dataset
5. Functions
6. UI populate (do not invent a new visual language)
7. Ask Flow tools if the block owns questions
8. Permissions and audit
9. Seed (demo clock, idempotent)
10. Browser verify
11. Evidence manifest
12. **Stop**

AI configuration still requires founder approval. No arbitrary React, SQL,
permissions, or financial arithmetic.

## DEMO-01 (this run)

Delivered:

- `docs/demo-data/CRM-REFERENCE-ANALYSIS.md`
- `docs/demo-data/NORTHSTAR-DATA-MODEL.md`
- `docs/demo-data/NORTHSTAR-DATA-DICTIONARY.md`
- `docs/demo-data/NORTHSTAR-SCENARIO-CATALOGUE.md`
- `docs/demo-data/NORTHSTAR-PROVENANCE-PLAN.md`
- `docs/demo-data/NORTHSTAR-MILESTONE-PLAN.md`
- Sanitized `docs/product-research/CRM-CAPABILITY-REFERENCE.md`

Not in this run: migrations, seeds, UI, Ask Flow changes.

## DEMO-02 — Business Registry and firmographics

**Goal.** One fictional registered company, two locations, documents,
ownership, insurance, masked bank/tax IDs, agency firmographics. Reuse
`organizations` / `organization_locations`. Do not create a parallel
company table. Do not start BB-03+.

### Inspect first

- `supabase/migrations/20260810000300_workspace_organization_foundation.sql`
- ADR-019 (single primary organisation)
- `packages/contracts` organization entity
- Workspace onboarding / twin (do not fight them)

### Contract

New `BuildingBlockManifest` id `registry.business` (BB-01):

- Owns agency legal profile, locations, licences, insurance, bank masks,
  registration documents
- References workspace members as signatories
- Config schema: fiscal year, currency, retention years, displayed fields
- Permissions: `organization.read`, `organization.update_profile`, plus
  `registry.document.manage` if needed
- AI tools: `get_business_registry`, `list_renewals`, `explain_compliance_owner`
  (read); `propose_registry_update` (propose)
- Events: `organization.updated`, `location.added`, `document.versioned`,
  `insurance.renewal_approaching`
- UI states: empty, loading, populated, partial-data, error, restricted, dense

### Dataset

Seed only `northstar-creative`:

- Legal profile exactly as `NORTHSTAR-DATA-MODEL.md`
- Chicago principal + Austin branch
- Document versions with renewal dates
- Audit rows for “system seed”
- Agency demographics (size band, revenue band, employee count 24 as a
  **planned** headcount even if BB-09 is not seeded yet — store on org,
  do not invent 24 `resource_profiles` here beyond existing Mission
  Control people if already present)

### Functions

- Read registry
- Propose update (Action Wall)
- List renewals within N days of demo clock
- Reject real-looking tax IDs that do not start with `DEMO`

### UI

Authenticated editorial registry: identity, offices, officers, insurance,
banking (masked), documents, renewals. Not a card grid. Light/dark,
1440 and 375.

### Ask Flow

Answer “who is the registered entity?”, “when does insurance renew?”,
“what are payment terms?”. Cite document IDs.

### Acceptance criteria (DEMO-02)

DEMO-02 is **PASS** only if all of the following are evidenced:

1. **Functionality.** Unit tests: DEMO prefix on registration and tax IDs;
   two locations; idempotent rerun; production slug rejected. API: workspace
   isolation; anonymous 401; cross-tenant 403.
2. **Canonical IDs.** Exactly one `organizations` row for Northstar in the
   demo workspace. No second legal-entity table. CRM clients remain clients.
3. **Fictional safety.** Scan fails if a 9-digit EIN-shaped value without
   `DEMO` is stored.
4. **Demo clock.** Formation, renewals, and document dates are offsets from
   `2026-09-03T08:12:00-05:00`. No `Date.now()` in the seed.
5. **Audit.** Activation of BB-01 and document versions write audit events.
6. **UI.** Registry screen in the Flow shell; six+partial states; axe no
   serious/critical; independent UI critic on the populated registry.
7. **Ask Flow.** One sourced answer about the legal name with evidence.
8. **Stop.** No opportunities, invoices, or new CRM tables in the DEMO-02
   diff except org/registry.

**Overall PASS** still requires the mandatory Flow verdict categories.
Unknown visual or RLS evidence is PARTIAL.

### Explicitly out of scope for DEMO-02

- 52-client expansion (DEMO-03)
- Sales pipeline (DEMO-04)
- Invoices (DEMO-08)
- Replacing Mission Control hardcoded metrics (DEMO-09)

## DEMO-03 notes (do not implement now)

Extend BB-02: 120–160 contacts, firmographics, health from evidence,
keep 52 clients and Brightline duplicates, preserve MC named clients.

## DEMO-04 notes

≥70 opportunities; **exactly 8** remain open with the locked values;
marketing leads convert into those IDs; Northwind negotiation events.

## DEMO-05 notes

CUAD categories; fictional contracts; change orders; approval history.

## DEMO-06 notes

≥35 projects; **exactly 5** active with locked contract values; ≥1_000 tasks.

## DEMO-07 notes

24 employees; attendance from UCI **without** medical/age/weight fields;
performance dimensions; capacity 63 hours and 2 over-allocated people.

## DEMO-08 notes

Invoice SQL; ≥150 invoices; receivables 11_580_000; overdue 2_775_000;
profit formulas in `@flow/commercial`.

## DEMO-09 notes

Replace Mission Control hardcoded metric minors with selectors over
canonical records. Reconciliation report must equal the locked snapshot
or document a coordinated update.

## DEMO-10 notes

Every active block: overview, list, detail, create/edit, filters, related,
activity, evidence, Ask Flow, states, desktop/mobile, light/dark.

## Reconciliation rules (all later milestones)

```
weighted_pipeline = Σ open_opp.value_minor × probability_bps / 10000
unweighted_pipeline = Σ open_opp.value_minor
active_delivery = Σ active_project.contract_value_minor
overdue = Σ invoice.amount_minor where state = overdue
receivables = Σ invoice.amount_minor where state in (issued, partial, overdue, due)
decision_exposure = Σ largest money impact per open founder decision
```

Integer half-up division. Tests compare minor units, not formatted strings
alone.

## Seed safety checklist (every seed PR)

- [ ] Demo workspace only
- [ ] Validation-only mode
- [ ] Idempotent demo_key
- [ ] No delete of `is_demo = false`
- [ ] Reconciliation printed
- [ ] Licence rows for any newly imported calibration artefact
