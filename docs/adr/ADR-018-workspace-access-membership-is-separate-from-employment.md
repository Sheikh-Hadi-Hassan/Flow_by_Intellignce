# ADR-018: Workspace Access Membership Is Separate From Employment

Status: Accepted

## Context

A workspace member may be a founder, employee, accountant, contractor, client
guest, external auditor, consultant, or integration operator. Access to Flow
is not equivalent to employment.

## Decision

Keep `workspace_memberships` as access-control membership. Do not rename it to
Employee and do not attach HR employment data such as salary, attendance,
leave, contracts, or performance.

## Consequences

Organization unit membership may hold lightweight business context such as a
display title. Formal HR employment, positions, compensation, and workforce
processes are deferred to a future HR module.
