# Phase 6 Financial OSS Adoption Matrix v1

Pattern-only adoption. No GPL/AGPL code copied. No full accounting system transplant.

| Project | License | Useful pattern | Adopt / Adapt / Reject | Exact use | Risk |
| ------- | ------- | -------------- | ---------------------- | --------- | ---- |
| [Invoice Ninja](https://github.com/invoiceninja/invoiceninja) | Elastic-2.0 | Invoice numbering, line items, payment allocation | **Reject** (code) / **Adapt** (pattern) | Sequential `INV-{seq}` per workspace; line-item source refs | License incompatible for copy |
| [Crater](https://github.com/crater-invoice/crater) | AGPL-3.0 | Invoice PDF, aging report UI | **Reject** | — | AGPL |
| [Akaunting](https://github.com/akaunting/akaunting) | BUSL-1.1 | Double-entry ledger | **Reject** | — | License + scope creep |
| [Kill Bill](https://github.com/killbill/killbill) | Apache-2.0 | Subscription billing, payment plugins | **Reject** | — | Over-engineered for Phase 6 |
| [medusajs/medusa](https://github.com/medusajs/medusa) | MIT | Money as integer minor units | **Adapt** (pattern) | Confirms bigint minor-unit approach already in Flow | None |
| [dinero.js](https://github.com/dinerojs/dinero.js) | MIT | Safe money arithmetic | **Reject** (defer) | Flow already has `money.ts` with bigint | Duplicate abstraction |
| [Stripe API objects](https://stripe.com/docs/api) | Proprietary docs | Invoice/payment state names | **Adapt** (pattern) | Status enum naming (`partially_paid`, `void`) | No Stripe SDK in Phase 6 |
| [ERPNext](https://github.com/frappe/erpnext) | GPL-3.0 | Timesheet → Sales Invoice | **Reject** | — | GPL + full ERP |
| [SolidInvoice](https://github.com/SolidInvoice/SolidInvoice) | MIT | Simple invoice CRUD | **Adapt** (pattern) | Draft → sent → paid lifecycle inspiration | Verify maintenance; pattern only |
| Flow `money.ts` | Internal | `divHalfUp`, `labourCostMinor`, `applyBps` | **Adopt** | All finance calculations | None |
| Flow `proposal-pricing.ts` | Internal | Payment schedule split | **Adopt** | Milestone schedule → invoice schedule derivation | None |
| Flow resource Guard | Internal | Guard decision before publish | **Adopt** | Invoice issue Guard record | None |

## Summary

- **No new npm finance dependencies.**
- Invoice lifecycle and numbering adapted from industry patterns, implemented in `@flow/commercial` + Postgres.
- Tax is user-configured basis points — not legal advice.
- Payment provider abstraction: optional thin interface only; no live credentials.
