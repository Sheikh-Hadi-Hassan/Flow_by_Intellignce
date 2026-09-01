# 23 — Phase 6 Financial Operations Implementation Contract

## Phase name

**Phase 6: Governed Financial Operations**

## Problem statement

Phases 1–5.5 deliver commercial discovery through governed staffing and Mission Control, but founders cannot see billable work, issue invoices, record payments, or understand project profitability from stored data. Employees lack a governed path to submit time and expenses. Monetary truth must remain deterministic and auditable — never LLM-calculated.

## User roles

| Role | Capabilities |
| ---- | ------------ |
| Founder / finance | Full finance read, invoice lifecycle, payment record, reporting, profitability |
| Project manager | Time/expense approval, invoice read, limited reporting |
| Employee | Own time/expense draft and submit; no revenue/margin/rates unless granted |
| Client | Out of scope (Phase 7 portal) |

## Financial data model

All amounts: `bigint` minor units + ISO 4217 currency. Percentages: integer basis points. Durations: integer minutes.

Core entities: `workspace_billing_settings`, `time_entries`, `expenses`, `invoice_schedules`, `invoices`, `invoice_line_items`, `invoice_versions`, `payments`, `payment_allocations`, `finance_guard_decisions`, `finance_activity_events`.

Links: project → opportunity → client → contract payment schedule items.

## Lifecycle state machines

### Time entry

`draft → submitted → approved | rejected → draft`  
`approved → invoiced` (locked)

### Expense

`draft → submitted → approved | rejected → draft`  
`approved → reimbursed` and/or `invoiced` (locked when on issued invoice)

### Invoice

`draft → founder_review ⇄ changes_requested → approved → issued → partially_paid → paid`  
`issued/partially_paid → overdue` (date-driven)  
`draft/approved/issued → void`

Issued invoices immutable; corrections via void + replacement draft.

## Calculations (deterministic, `@flow/commercial`)

- Time entry value: `labourCostMinor(minutes, ratePerHourMinor)`
- Line subtotal: `quantity × unitAmountMinor` (integer)
- Invoice subtotal: sum of line amounts
- Tax: `applyBps(subtotal, taxBps)` or tax-exclusive addition per workspace config
- Total: subtotal − discount + tax
- Payment allocation: capped at balance due; overpayment rejected
- Balance due: total − allocated payments
- Gross profit: revenue − labour cost − approved expenses
- Gross margin: `actualMarginBps(revenue, cost)`
- Aging buckets: 0–30, 31–60, 61–90, 90+ days past due

Rounding: half-up via `divHalfUp` (existing `money.ts`).

## Permissions

| Key | Purpose |
| --- | ------- |
| `finance.time.own` | Create/submit own time entries |
| `finance.time.read` | List team time entries |
| `finance.time.approve` | Approve/reject submitted time |
| `finance.expense.own` | Create/submit own expenses |
| `finance.expense.read` | List expenses |
| `finance.expense.approve` | Approve/reject expenses |
| `finance.invoice.read` | View invoices |
| `finance.invoice.manage` | Draft, generate, edit pre-issue |
| `finance.invoice.approve` | Founder review, approve, issue |
| `finance.payment.record` | Record payments and allocations |
| `finance.report.read` | Workspace financial summary |
| `finance.profitability.read` | Project margin and labour cost |

Founder role receives all keys. Employee role receives `finance.time.own`, `finance.expense.own` only.

## Guard decisions

Invoice issue requires `finance.invoice.approve` + Guard decision record (pattern from resource plan publish). No autonomous issue from Ask Flow.

## Audit requirements

Every approval, rejection, issue, void, payment, and reversal writes `finance_activity_events` and uses existing `commercial.audit.read` for cross-module audit.

## In scope

Time tracking, expenses, billing settings, invoice schedules, invoice lifecycle, manual payments, financial reporting, Mission Control signals, Ask Flow finance intents, Northstar demo, employee My Work time/expense.

## Out of scope

Card processing, Stripe, bank feeds, GL, payroll, tax filing, vendor portal, POs, AI monetary calculations, Phase 7+.

## API contract

Namespace: `/api/v1/workspaces/:workspaceId/finance/*`

JWT + workspace membership + permission asserts. Idempotency keys on invoice issue and payment record. Server recomputes all totals.

## UI routes

- `/:workspace/admin/finance` — founder hub
- `/:workspace/admin/finance/time`, `expenses`, `invoices`, `invoices/[id]`, `payments`, `reports`
- `/:workspace/work/time`, `work/expenses` — employee submit

## Northstar journey

Acme active project → approved time + expense → milestone invoice draft → founder review → Guard → issue → partial payment → final payment → paid → profitability update.

## Acceptance criteria

1. Migration `20260904000100` applied with RLS on all finance tables
2. Integer money only; no float authoritative paths
3. Issued invoice immutable at DB + service layer
4. Payment allocation prevents overpayment
5. Employee cannot read workspace revenue/margin without permission
6. Cross-tenant denial tested
7. Authenticated E2E journey passes
8. Northstar isolated demo journey passes
9. Phase 2–5.5 regressions pass
10. 18 screenshots captured

## Definition of done

All acceptance criteria met; verification report PASS; pushed to `origin/feat/phase-6-financial-operations`.

## Rollback risks

Additive migration only. Rollback = do not apply migration; feature flag via route absence. Issued invoices require void workflow — no silent delete.
