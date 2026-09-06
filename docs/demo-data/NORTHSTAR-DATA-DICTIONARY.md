# Northstar data dictionary

DEMO-01. Field catalogue for canonical records. Types are logical; SQL
landings are noted. Display never shows bps, minutes, or raw minor units.

Conventions:

- Money: integer minor units, ISO currency
- Ratios: integer basis points (10_000 = 100%)
- Time: timestamptz stored; demo clock for generation
- `is_demo`: true for seed rows
- `demo_key`: stable idempotency key per workspace
- Fictional identifiers: prefix `DEMO-` or `ns-`

## Platform

| Entity | Key fields | Notes |
|---|---|---|
| Workspace | id, slug, default_timezone, default_currency | Tenant |
| User / membership | user_id, workspace_id, roles | Not a client contact |
| Audit event | actor, action, record_id, before, after, at | Shared sink |

## BB-01 Business Registry

Logical extensions on `organizations` / related tables (DEMO-02).

| Field | Type | Display | Constraint |
|---|---|---|---|
| legal_name | string | Legal name | Required |
| trading_name | string | Trading as | Required |
| entity_type | enum | LLC / … | Closed set |
| registration_number | string | DEMO-LLC-… | Must start `DEMO` |
| jurisdiction | string | Illinois, USA | Fictional ok |
| formed_on | date | Formation | ≤ demo clock |
| status | enum | Active | |
| fiscal_year_start_month | int 1–12 | Fiscal year | |
| currency | ISO-4217 | USD | |
| tax_id_masked | string | DEMO-36-… | Never a real EIN |
| accounting_method | enum | Accrual | |
| payment_terms_days | int | Net 30 | |
| retention_years_clients | int | 7 | |
| privacy_policy_version | string | v3 | |
| location.kind | enum | principal / branch | ≥2 rows |
| insurance.policy_no | string | DEMO-PL-… | |
| insurance.renews_on | date | | |
| bank.last4 | string | ••••0429 | Masked |
| document.kind | enum | articles / policy / … | Versioned |
| document.fictional | const true | Labelled fictional | |

## BB-02 CRM Core (exists; extend)

| Field | Type | Notes |
|---|---|---|
| client.id | uuid | Canonical |
| client.name | string | |
| industry, sub_industry | string | Firmographic |
| country, region | string | |
| size_band, revenue_band | enum | Census-calibrated, not real filings |
| growth_stage | enum | |
| business_model | string | |
| lifecycle_stage | enum | lead / active / dormant / at_risk / former |
| acquisition_source | string | |
| relationship_started_on | date | |
| annual_value_minor | int | Derived from contracts/invoices when present |
| payment_behaviour | enum | Derived from invoice ageing |
| strategic_importance | enum | Config |
| profitability_band | enum | From BB-13 when active; else unknown |
| health_score | int | **Derived** from evidence, not random |
| owner_user_id | uuid | Employee |
| custom_fields | jsonb | Schema-validated |
| contact.role | enum | decision / billing / legal / day-to-day |
| interaction.kind | enum | email / meeting / note |
| duplicate.score | int | Deterministic string similarity |

Health evidence inputs (not a vibe score): days since interaction, overdue
invoices, stalled opportunity, open risk, CSAT sample if present.

Target counts: 52 clients, 120–160 contacts, ≥1 duplicate pair (Brightline).

## BB-03 Sales Pipeline

Reuse `crm_opportunities`. Snapshot eight stay as listed in the data model.

| Field | Type | Notes |
|---|---|---|
| client_id | uuid | Required |
| owner_id | uuid | Employee |
| service_id | uuid | Catalog |
| source | string | Campaign id when from BB-04 |
| stage | enum | Configured, not free text |
| value_minor | int | Unweighted |
| probability_bps | int | Stage default, overridable with audit |
| expected_close_on | date | |
| forecast_category | enum | commit / best_case / pipeline / omit |
| win_loss_reason | string | Required on closed |
| competitor | string | Optional |
| missing_information | text[] | Discovery |

Historical: ≥70 opportunities including won, lost, stalled, disqualified.
Current snapshot: **exactly 8 open**.

Weighted value = `value_minor × probability_bps / 10_000` (half-up).

## BB-04 Marketing

| Entity | Fields |
|---|---|
| campaign | name, channel, start, end, cost_minor, status |
| lead | campaign_id, contact or email, score, outcome, converted_opportunity_id |
| attribution | opportunity_id, campaign_id, weight_bps (sum 10_000) |

Leads convert to opportunities. They do not become a second client.

## BB-05 Proposals and negotiations

| Entity | Fields |
|---|---|
| proposal | opportunity_id, status, currency |
| version | number, offered_minor, margin_bps |
| negotiation_event | version_id, actor, kind (offer / counter / concession / legal / approval), amount_minor, days, evidence_id, at |
| concession | kind (discount / scope / timeline / payment), requested, approved, margin_impact_minor |

Northwind negotiation is a required scenario (Ask Flow).

## BB-06 Contracts

CUAD supplies **clause category names** only. No real contract text.

Every contract body starts with:

`Fictional demo contract — not legal advice.`

| Field | Notes |
|---|---|
| parties | Agency org + client |
| signatories | Employees / client contacts |
| value_minor, currency, deposit_minor | |
| billing_schedule | Milestone / monthly / T&M |
| payment_terms_days, late_fee_bps | |
| effective_on, expires_on, renewal | |
| clause.category | CUAD-inspired closed set |
| redline | versioned |
| change_order | links project + invoice |
| risk_class | derived from clauses + status |

## BB-07 / BB-08 Delivery

| Entity | Notes |
|---|---|
| project | client_id, contract_id, pm_id, baseline_budget_minor, status |
| phase, milestone, deliverable | Owned by BB-07 |
| task | owner, assignee, estimate_minutes, actual_minutes, status history |
| dependency | task → task |
| risk / issue / change_request | Evidence + owner + deadline |

Targets: ≥35 historical projects, **exactly 5** active in the snapshot,
≥1_000 tasks connected to those projects.

## BB-09 / BB-10 / BB-11 People

24 employees across the listed functions. 8–12 vendors/contractors in BB-14.

| Field | Notes |
|---|---|
| role, department, seniority | O*NET-calibrated labels, fictional people |
| employment_type, work_mode | |
| location_id, timezone | |
| cost_rate_minor, billable_rate_minor | BLS-calibrated bands, not real pay |
| manager_id | |
| schedule, leave, attendance | DEMO-07 |
| time_entry | project/task, billable flag, minutes |

Performance observation:

| Field | Required |
|---|---|
| dimension | Closed set (on-time, quality, utilisation, …) |
| period | Start/end vs demo clock |
| role_target_bps or target_count | |
| actual | |
| calculation | Named rule id |
| source_record_ids | |
| sample_size | |
| confidence | |
| exceptions / missing | |

No overall unexplained score. Attendance is never the only dimension.

Protected demographics: separate HR dataset, aggregates only, n ≥ 5.

## BB-12 / BB-13 Finance

No `invoices` table today. DEMO-08 adds it. Snapshot invoices keep IDs
`inv-2041`, `inv-2038`, …

| Entity | States / notes |
|---|---|
| Invoice | draft / issued / paid / partial / overdue |
| Payment | invoice_id, amount_minor, received_on |
| Credit note | invoice_id |
| Expense | project_id, vendor_id, amount_minor |
| Recognition event | project_id, amount_minor, rule |

Receivables snapshot: 11_580_000. Overdue two invoices: 2_775_000.

## BB-14 Vendors

Separate from clients. A contractor person still has a `resource_profile`
when they appear on a roster; the vendor **organisation** is BB-14.

## BB-15 / BB-16 / BB-17 / BB-18

| Entity | Owner |
|---|---|
| approval_request | BB-15 — policy_id, record_id, status |
| integration_connection | BB-16 — system, status, last_sync |
| sync_exception | BB-16 — record_id, field, message |
| migration_report | BB-16 — counts, exceptions |
| metric_definition | BB-17 — formula_id, block_id |
| role_grant / retention_rule | BB-18 |

## Target counts (workspace-scoped, demo)

| Record | Minimum | Snapshot lock |
|---|---|---|
| Agency org | 1 | Northstar Creative Studio LLC |
| Locations | 2 | Chicago + Austin |
| Clients | 52 | Includes Meridian, Kestrel, Northwind, Acme, Brightline pair |
| Contacts | 120–160 | |
| Employees | 24 | Includes Maya, Jordan, Avery, Sam, Taylor |
| Vendors/contractors | 8–12 | |
| Opportunities (history) | ≥70 | **8 open** now |
| Projects (history) | ≥35 | **5 active** now |
| Tasks | ≥1_000 | |
| Invoices | ≥150 | Overdue pair locked |
| Operating history | ≥18 months | Clock 2026-09-03 |

## Display rules

| Internal | User sees |
|---|---|
| 40_487_500 minor | $404.9K or $404,875 |
| 6500 bps | 65% |
| 210 minutes | 3.5 hours |
| `at_risk` | At risk |
| `DEMO-36-0008417` | Masked tax ID (demo) |
