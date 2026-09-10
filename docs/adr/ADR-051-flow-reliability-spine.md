# ADR-051: Flow Reliability Spine

- Status: Accepted
- Date: 2026-09-08

## Context

Flow owns authorization, business truth, and audit evidence while external OSS
providers perform bounded CRM, design, and signing operations. Provider calls
and webhooks can time out, retry, arrive more than once, or arrive concurrently.

## Decision

Flow uses PostgreSQL-backed reliability primitives behind application services:

- workspace-scoped idempotency reservations reject key reuse with different
  request fingerprints and replay completed results;
- an internal outbox records provider-bound payloads, evidence, correlation IDs,
  and W3C trace context before a worker claims them with `FOR UPDATE SKIP LOCKED`;
  only the worker holding the persisted lease may settle the event;
- an internal webhook inbox deduplicates provider event IDs and payload hashes;
  unverified or unresolved-workspace events return and persist `REJECTED` and
  cannot enter the processing queue;
- Universal Execution Spine decisions and evidence use the existing append-only
  `flow_internal.business_audit_events` table;
- provider calls use bounded timeout and exponential retry policies with the
  same idempotency key on every attempt. Authentication, permission, validation,
  malformed-response, and unknown failures are not retried by default;
- API requests accept valid W3C `traceparent`/`tracestate`, create a server span,
  and propagate trace context through tool, provider mutation, audit, outbox, and
  webhook contracts.

The database tables remain in `flow_internal`, have RLS enabled, expose no
policies to `anon` or `authenticated`, and are accessed only by trusted server
repositories. Payloads must contain business data only, never credentials or
provider authorization headers.

## Transaction Boundary

An application service that mutates Flow truth and creates an outbox event must
perform both writes in one PostgreSQL transaction. This ADR does not add a
message broker or workflow runtime. `runPostgresTransaction` supplies this unit
of work boundary. Provider adapters and delivery workers are not yet present,
so each adapter must use it when its application service is implemented.

## Consequences

- Duplicate requests and provider events fail closed or replay safely.
- Concurrent workers cannot claim the same eligible row.
- External delivery is at-least-once; provider mutation idempotency is mandatory.
- Webhook receipt alone never changes authoritative Flow contract state.
- Operators can correlate HTTP, Action Wall, delivery, webhook, and audit records
  without storing secrets.
