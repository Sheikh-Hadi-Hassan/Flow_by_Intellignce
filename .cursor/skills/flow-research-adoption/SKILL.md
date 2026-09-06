---
name: flow-research-adoption
description: Evaluate external OSS repositories for Adopt/Adapt/Reject decisions with license and compatibility analysis. Use when researching libraries, invoicing patterns, or dependency adoption for Flow phases.
disable-model-invocation: true
---

# Flow Research Adoption

## Per-repository record

For every external repository evaluated, document:

| Field | Required |
|-------|----------|
| Source URL | Yes |
| License | Yes (MIT/Apache/BSD preferred) |
| Maintenance status | Yes |
| Framework compatibility | Yes |
| Bundle/runtime cost | Yes |
| Exact pattern proposed | Yes |
| Verdict | Adopt / Adapt / Reject |
| Risk | Yes |

## Reject architecture that

- Bypasses NestJS authorization
- Assumes open PostgREST access
- Uses floating-point money
- Weakens RLS
- Requires paid dependencies
- Forces incompatible primary-key strategies
- Introduces full GL beyond phase requirements

## Prefer pattern adoption for

- Invoice numbering, line items, payment allocation
- Ledger-style audit history, tax representation
- Invoice lifecycle, time-entry approval, expense receipts

## Output

Save to `docs/research/<topic>-adoption-matrix-v1.md`.

Do not copy code from unclear or incompatible licenses.
Transplanting entire accounting systems is out of scope.
