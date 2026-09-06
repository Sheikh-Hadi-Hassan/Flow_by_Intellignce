# Northstar provenance plan

DEMO-01. Calibration sources for **distributions and vocabularies**. No
runtime seed may call an external website. Licence and transformation are
recorded here before any import in later milestones.

Retrieval date for this plan: 2026-09-03.

## Method

1. Record source, URL, licence, retrieval date.
2. Extract only the allowed fields.
3. Transform into Northstar generators (weights, enums, clause categories).
4. Generate fictional people, companies, and money with a seeded PRNG and
   the demo clock.
5. Never copy a real company's identity or filing numbers into the demo.

Synthetic identity method: deterministic name/address tables in-repo
(Faker MIT may be used **offline** at generate-time in DEMO-02+ if added
as a documented dependency; prefer no new dependency if tables suffice).

Confidence: **medium** for public statistical shapes; **low** for
cross-industry transfer (garment productivity → agency). Limitations are
mandatory on each row.

## Feature architecture

| Field | Value |
|---|---|
| Source name | Custom CRM capability page (service marketing) |
| URL | https://softteco.com/custom-crm-development |
| Licence | Public marketing page; not a dataset licence |
| Retrieved | 2026-09-03 |
| Relevant fields | Capability groups only |
| Transformation | Capability extract in `docs/product-research/CRM-CAPABILITY-REFERENCE.md` |
| Assumptions | Groups map to Flow building blocks |
| Synthetic method | None — no numbers taken |
| Confidence | High for capability names; n/a for metrics |
| Limitations | Sales language, pricing, 14.5%/12.2%/20%/60% claims **excluded** |

## Legal contracts

| Field | Value |
|---|---|
| Source name | CUAD |
| URL | https://www.atticusprojectai.org/cuad/ |
| Licence | CC BY 4.0 |
| Retrieved | Plan date 2026-09-03; dataset not imported |
| Relevant fields | 41 clause category names, risk taxonomy |
| Transformation | Closed enum for `contract_clauses.category` |
| Assumptions | Categories transfer to agency MSAs |
| Synthetic method | Fictional clause text written by Flow; never paste CUAD contracts |
| Confidence | High for category labels |
| Limitations | Not legal advice; US-heavy corpus |

## Contract reasoning

| Field | Value |
|---|---|
| Source name | ContractNLI |
| URL | https://github.com/stanfordnlp/contract-nli |
| Licence | CC BY 4.0 |
| Attribution | Preserve in this register and BB-06 docs |
| Relevant fields | Entailed / contradicted / not-mentioned patterns |
| Transformation | Ask Flow explanation templates + missing-clause questions |
| Synthetic method | Apply labels to fictional Northstar clauses |
| Confidence | Medium |
| Limitations | NLI models are not the calculator; not imported at runtime |

## Contract lifecycle

| Field | Value |
|---|---|
| Source name | Open Contracting Data Standard |
| URL | https://www.open-contracting.org/data-standard/ |
| Licence | CC BY 4.0 |
| Relevant fields | Parties, planning, award, contract, amendment, implementation |
| Transformation | State machine names on BB-06 |
| Confidence | High for lifecycle shape |
| Limitations | Public-procurement origin; map onto private agency contracts |

## Negotiation

| Field | Value |
|---|---|
| Source name | CaSiNo |
| URL | https://github.com/kushalchawla/CaSiNo |
| Licence | CC BY 4.0 |
| Relevant fields | Offer / counteroffer / priority / concession strategies |
| Transformation | `negotiation_event.kind` and Northwind dialogue pattern |
| Synthetic method | Agency-specific amounts; no dataset utterances copied wholesale |
| Confidence | Medium |
| Limitations | Crowdsourced bargaining, not legal negotiation |

## Leads and marketing

| Field | Value |
|---|---|
| Source name | UCI Bank Marketing |
| URL | https://archive.ics.uci.edu/dataset/222/bank+marketing |
| Licence | CC BY 4.0 |
| Relevant fields | Contact frequency, outcome mix, campaign cadence |
| Transformation | BB-04 conversion distributions |
| Assumptions | Bank telemarketing ≠ agency inbound; use shapes only |
| Confidence | Low–medium |
| Limitations | Do not import personal rows |

## Company demographics

| Field | Value |
|---|---|
| Source name | U.S. Census SUSB |
| URL | https://www.census.gov/programs-surveys/susb/data/datasets.html |
| Licence | Official public statistical data |
| Relevant fields | Firm size, employment, industry, geography **distributions** |
| Transformation | Client size_band / revenue_band weights |
| Synthetic method | Sample bands, then invent fictional firms |
| Confidence | High for US firm-size shape |
| Limitations | Not Northstar clients' real books |

## Legal-entity structure

| Field | Value |
|---|---|
| Source name | GLEIF Open Data |
| URL | https://www.gleif.org/en/about/open-data |
| Licence | CC0 |
| Relevant fields | Legal name patterns, jurisdiction, address structure, parent links |
| Transformation | BB-01 field layout |
| Synthetic method | All Northstar IDs remain `DEMO-*`; **no real LEI** |
| Confidence | High for structure |
| Limitations | Do not copy a live LEI record |

## Roles and skills

| Field | Value |
|---|---|
| Source name | O*NET Database |
| URL | https://www.onetcenter.org/database.html |
| Licence | CC BY 4.0 |
| Relevant fields | Role titles, skills, tasks for design, PM, marketing, finance |
| Transformation | 24 employee role catalogue |
| Confidence | High for role language |
| Limitations | US SOC; map onto agency titles |

## Compensation

| Field | Value |
|---|---|
| Source name | BLS OEWS |
| URL | https://www.bls.gov/oes/tables.htm |
| Licence | Official public statistical data |
| Relevant fields | Wage bands by occupation |
| Transformation | Cost-rate and billable-rate **bands** in minor units |
| Assumptions | Agency billable = cost × configured multiplier (schema, not AI) |
| Confidence | Medium |
| Limitations | Not actual payroll; never show as “salary” without restriction |

## Time allocation

| Field | Value |
|---|---|
| Source name | BLS American Time Use Survey |
| URL | https://www.bls.gov/tus/data.htm |
| Licence | Official public-use microdata |
| Relevant fields | Workday length, remote vs onsite **shapes** |
| Transformation | Schedules, hybrid mix |
| Confidence | Medium |
| Limitations | Household survey, not timesheets |

## Attendance

| Field | Value |
|---|---|
| Source name | UCI Absenteeism at Work |
| URL | https://archive.ics.uci.edu/dataset/445/absenteeism+at+work |
| Licence | CC BY 4.0 |
| Relevant fields | Absence frequency, weekday/seasonal hours |
| Transformation | Leave and absence generators |
| **Excluded** | Medical diagnoses, age, weight, family, lifestyle |
| Confidence | Medium for timing shapes |
| Limitations | Brazilian courier firm; not HR truth |

## Productivity (distributions only)

| Field | Value |
|---|---|
| Source name | UCI Garment Employee Productivity |
| URL | https://archive.ics.uci.edu/dataset/597/productivity+prediction+of+garment+employees |
| Licence | CC BY 4.0 |
| Relevant fields | Overtime, team size, planned vs actual **spread** |
| Transformation | Noise around estimates vs actuals on tasks |
| Assumptions | Manufacturing ≠ agency; **not** performance targets |
| Confidence | Low |
| Limitations | Forbidden as Avery Brooks' target |

## Purchase-to-pay / expenses

| Field | Value |
|---|---|
| Source name | BPI Challenge 2019; BPI Challenge 2020 Request for Payment |
| URL | https://research.tue.nl/en/datasets/bpi-challenge-2019/ ; 2020 RFP sibling |
| Licence | **Unverified in DEMO-01** — must be recorded before any import |
| Relevant fields | PO / invoice match sequences; expense approval path |
| Transformation | BB-12/BB-15 event sequences |
| Confidence | Unknown until licence check |
| Limitations | Do not import in DEMO-01. DEMO-08/15 gate: licence row = verified |

## Financial structure

| Field | Value |
|---|---|
| Source name | SEC EDGAR APIs |
| URL | https://www.sec.gov/search-filings/edgar-application-programming-interfaces |
| Licence | Public filings |
| Relevant fields | Statement **structure** and exhibit headings |
| Transformation | BB-01 document types; BB-13 statement layout |
| Synthetic method | No issuer names or filing numbers in Northstar |
| Confidence | High for structure |
| Limitations | Public corporates ≠ LLC agency |

## Identities

| Field | Value |
|---|---|
| Source name | Faker |
| URL | https://fakerjs.dev/ |
| Licence | MIT |
| Relevant fields | Names, streets, phones, company-name **patterns** |
| Transformation | Optional generate-time only; freeze results in repo |
| Confidence | n/a |
| Limitations | Must not run against the network in seed |

## Seed safety (binding)

- Deterministic PRNG seed constant + demo clock
- Idempotent `demo_key` unique per workspace
- Transactional apply; validation-only flag prints the reconciliation
  report and writes nothing
- Allowed workspace slugs: `northstar-creative` and listed demo twins
- Production workspaces: reject
- Never `DELETE` rows where `is_demo` is false
- Rerun updates demo rows in place by `demo_key`
- Reconciliation must print Mission Control snapshot deltas

## Provenance table (runtime)

Later milestones persist a row in `flow_internal.business_sources` /
`source_license_profiles` for each **imported** artefact. DEMO-01 only
documents the plan. Empty import_sessions until DEMO-16.
