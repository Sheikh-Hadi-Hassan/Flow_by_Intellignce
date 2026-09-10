# ADR-052: Twenty CRM Provider and Pinned Local Runtime

## Status

Accepted.

## Decision

Flow integrates Twenty CRM `twenty/v2.38.1` at commit
`2f318d55124a6557fb75eb5bf200ec4e20158389` through
`@flow/provider-twenty`. The adapter uses Twenty's workspace-generated REST API
for Companies, People, and Opportunities only. It does not use the metadata API
or enterprise-marked source.

Each provider instance binds one Twenty API credential to one Flow workspace.
Reads require a server-minted Flow application-service context. Mutations
require a Universal Execution Spine context but currently fail closed before
transport execution. They remain disabled until the Flow reliability migration
is live-verified and outbox-backed delivery is proven against the authorized
development project.

The local `crm` profile pins Twenty, PostgreSQL, and Redis by OCI digest, binds
the HTTP port to localhost, persists CRM data in named volumes, and limits
memory. `./flow doctor` refuses startup when Docker is unavailable or free disk
is below 8 GiB. Runtime secrets are generated into an ignored mode-0600 file by
`./flow bootstrap` and are never committed.

## Authority

Twenty owns company, contact, and opportunity records. Flow continues to own
identity, workspace authorization, lifecycle state, commercial calculations,
contracts, projects, tasks, employees, invoices, Action Wall, and audit. UI,
Ask Flow, and LLM code cannot call the adapter directly.

## Consequences

- A Flow application service must select the provider instance for the current
  workspace before calling it.
- Twenty API keys must be role-scoped in Twenty and stored only in server
  environment or secret management.
- Live adapter verification requires an initialized Twenty workspace and API
  key; deterministic CI uses an injected fake transport.
- Companies, People, and Opportunities are read-only in the current integration.
- Commercial release still requires the AGPL and trademark review recorded in
  ADR-049.
