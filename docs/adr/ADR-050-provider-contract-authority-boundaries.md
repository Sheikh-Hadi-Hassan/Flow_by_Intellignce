# ADR-050: Provider Contracts Cannot Bypass Flow Application Services

## Status

Accepted.

## Decision

Twenty, Penpot, and Documenso CE implement the provider-neutral
`FlowCrmProvider`, `FlowStudioProvider`, and `FlowSigningProvider` contracts in
`@flow/contracts`. Their authority is limited respectively to CRM records,
visual layout/design assets, and signature execution/evidence.

Provider reads require a context derived from the server-resolved Flow actor and
an existing Flow permission. Provider mutations require a branded context
created during an authorized, evidence-validated, approval-evaluated Universal
Execution Spine tool execution and a non-empty idempotency key. The legacy tool
registry path cannot create provider mutation authority.

Signing webhook inspection returns `authoritative: false`. Flow application
services must verify workspace, signer, document checksum, replay key, and valid
contract transition before changing authoritative contract state.

The OSS governance check rejects provider-contract usage outside server
application services, provider adapters, and tests. UI, routes, controllers,
LLMs, and upstream providers therefore cannot invoke these contracts directly.

## Consequences

- UI and Ask Flow call the same Flow application service.
- Provider adapters receive only scoped execution data, not roles, permission
  lists, workspace secrets, or API credentials.
- Provider failures cannot grant authority or change Flow-owned truth.
- Provider-specific SDKs and network transports remain future adapter work.
- No database schema or customer-facing route changes are introduced.
