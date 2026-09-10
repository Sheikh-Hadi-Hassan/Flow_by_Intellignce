import type {
  AuditEvent,
  AuditSink,
  IdempotencyReservation,
  ReliabilityIdempotencyRecord,
  ReliabilityOutboxEvent,
  ReliabilityOutboxSubmission,
  ReliabilityStore,
  ReliabilityWebhookEvent,
  ReliabilityWebhookSubmission,
} from "@flow/contracts";
import { createHash } from "node:crypto";
import type { SqlExecutor } from "./sql-executor.js";

function key(workspaceId: string, value: string): string {
  return `${workspaceId}:${value}`;
}

function requirePositiveLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Reliability claim limit must be between 1 and 100.");
  }
}

export class InMemoryReliabilityStore implements ReliabilityStore {
  private readonly idempotency = new Map<
    string,
    ReliabilityIdempotencyRecord
  >();
  private readonly outbox = new Map<string, ReliabilityOutboxEvent>();
  private readonly webhooks = new Map<string, ReliabilityWebhookEvent>();

  reserveIdempotency(
    record: ReliabilityIdempotencyRecord,
  ): Promise<IdempotencyReservation> {
    const id = key(record.workspaceId, record.idempotencyKey);
    const existing = this.idempotency.get(id);
    if (!existing || Date.parse(existing.expiresAt) <= Date.now()) {
      this.idempotency.set(id, { ...record, status: "STARTED" });
      return Promise.resolve({ outcome: "RESERVED" });
    }
    if (
      existing.requestClass !== record.requestClass ||
      existing.requestFingerprint !== record.requestFingerprint
    ) {
      return Promise.resolve({ outcome: "CONFLICT" });
    }
    if (existing.status === "COMPLETED") {
      return Promise.resolve({
        outcome: "REPLAY",
        ...(existing.resultReference
          ? { resultReference: existing.resultReference }
          : {}),
      });
    }
    if (existing.status === "STARTED") {
      return Promise.resolve({ outcome: "IN_PROGRESS" });
    }
    this.idempotency.set(id, { ...record, status: "STARTED" });
    return Promise.resolve({ outcome: "RESERVED" });
  }

  completeIdempotency(input: {
    readonly workspaceId: string;
    readonly idempotencyKey: string;
    readonly resultReference: string;
  }): Promise<void> {
    const id = key(input.workspaceId, input.idempotencyKey);
    const current = this.idempotency.get(id);
    if (!current)
      return Promise.reject(new Error("Idempotency record not found."));
    if (current.status !== "STARTED") {
      return Promise.reject(new Error("Idempotency record is not active."));
    }
    this.idempotency.set(id, {
      ...current,
      status: "COMPLETED",
      resultReference: input.resultReference,
    });
    return Promise.resolve();
  }

  failIdempotency(input: {
    readonly workspaceId: string;
    readonly idempotencyKey: string;
  }): Promise<void> {
    const id = key(input.workspaceId, input.idempotencyKey);
    const current = this.idempotency.get(id);
    if (!current)
      return Promise.reject(new Error("Idempotency record not found."));
    if (current.status !== "STARTED") {
      return Promise.reject(new Error("Idempotency record is not active."));
    }
    this.idempotency.set(id, { ...current, status: "FAILED" });
    return Promise.resolve();
  }

  enqueueOutbox(
    event: ReliabilityOutboxSubmission,
  ): Promise<"ENQUEUED" | "REPLAY" | "CONFLICT"> {
    const id = key(event.workspaceId, event.idempotencyKey);
    const existing = this.outbox.get(id);
    if (existing) {
      return Promise.resolve(
        existing.payloadFingerprint === event.payloadFingerprint &&
          existing.eventType === event.eventType
          ? "REPLAY"
          : "CONFLICT",
      );
    }
    this.outbox.set(id, {
      ...event,
      status: "PENDING",
      attemptCount: 0,
    });
    return Promise.resolve("ENQUEUED");
  }

  claimOutbox(input: {
    readonly workerId: string;
    readonly now: string;
    readonly lockedUntil: string;
    readonly limit: number;
  }): Promise<readonly ReliabilityOutboxEvent[]> {
    requirePositiveLimit(input.limit);
    const claimed = [...this.outbox.entries()]
      .filter(([, event]) => ["PENDING", "RETRY"].includes(event.status))
      .filter(([, event]) => event.availableAt <= input.now)
      .filter(
        ([, event]) => !event.lockedUntil || event.lockedUntil <= input.now,
      )
      .sort(([, left], [, right]) =>
        left.availableAt.localeCompare(right.availableAt),
      )
      .slice(0, input.limit)
      .map(([id, event]) => {
        const updated: ReliabilityOutboxEvent = {
          ...event,
          status: "PROCESSING",
          attemptCount: event.attemptCount + 1,
          lockedBy: input.workerId,
          lockedUntil: input.lockedUntil,
        };
        this.outbox.set(id, updated);
        return updated;
      });
    return Promise.resolve(claimed);
  }

  settleOutbox(input: {
    readonly workspaceId: string;
    readonly eventId: string;
    readonly workerId: string;
    readonly status: "DELIVERED" | "RETRY" | "DEAD";
    readonly availableAt?: string;
    readonly errorCode?: string;
  }): Promise<void> {
    const entry = [...this.outbox.entries()].find(
      ([, event]) =>
        event.workspaceId === input.workspaceId &&
        event.eventId === input.eventId,
    );
    if (!entry || entry[1].status !== "PROCESSING") {
      return Promise.reject(new Error("Outbox event is not processing."));
    }
    if (entry[1].lockedBy !== input.workerId) {
      return Promise.reject(
        new Error("Outbox lease is owned by another worker."),
      );
    }
    const event = { ...entry[1] };
    delete event.lockedBy;
    delete event.lockedUntil;
    this.outbox.set(entry[0], {
      ...event,
      status: input.status,
      ...(input.availableAt ? { availableAt: input.availableAt } : {}),
    });
    return Promise.resolve();
  }

  receiveWebhook(
    event: ReliabilityWebhookSubmission,
  ): Promise<"RECEIVED" | "REJECTED" | "REPLAY" | "CONFLICT"> {
    const id = `${event.provider}:${event.providerEventId}`;
    const existing = this.webhooks.get(id);
    if (existing) {
      return Promise.resolve(
        existing.payloadFingerprint === event.payloadFingerprint
          ? "REPLAY"
          : "CONFLICT",
      );
    }
    const accepted = event.signatureVerified && Boolean(event.workspaceId);
    this.webhooks.set(id, {
      ...event,
      status: accepted ? "RECEIVED" : "REJECTED",
      attemptCount: 0,
    });
    return Promise.resolve(accepted ? "RECEIVED" : "REJECTED");
  }

  claimWebhooks(input: {
    readonly workerId: string;
    readonly now: string;
    readonly lockedUntil: string;
    readonly limit: number;
  }): Promise<readonly ReliabilityWebhookEvent[]> {
    requirePositiveLimit(input.limit);
    const claimed = [...this.webhooks.entries()]
      .filter(([, event]) => event.status === "RECEIVED")
      .filter(([, event]) => event.signatureVerified && event.workspaceId)
      .filter(([, event]) => event.availableAt <= input.now)
      .filter(
        ([, event]) => !event.lockedUntil || event.lockedUntil <= input.now,
      )
      .sort(([, left], [, right]) =>
        left.receivedAt.localeCompare(right.receivedAt),
      )
      .slice(0, input.limit)
      .map(([id, event]) => {
        const updated: ReliabilityWebhookEvent = {
          ...event,
          status: "PROCESSING",
          attemptCount: event.attemptCount + 1,
          lockedBy: input.workerId,
          lockedUntil: input.lockedUntil,
        };
        this.webhooks.set(id, updated);
        return updated;
      });
    return Promise.resolve(claimed);
  }

  settleWebhook(input: {
    readonly inboxId: string;
    readonly workerId: string;
    readonly status: "PROCESSED" | "REJECTED" | "RECEIVED" | "DEAD";
    readonly availableAt?: string;
    readonly errorCode?: string;
  }): Promise<void> {
    const entry = [...this.webhooks.entries()].find(
      ([, event]) => event.inboxId === input.inboxId,
    );
    if (!entry || entry[1].status !== "PROCESSING") {
      return Promise.reject(new Error("Webhook event is not processing."));
    }
    if (entry[1].lockedBy !== input.workerId) {
      return Promise.reject(
        new Error("Webhook lease is owned by another worker."),
      );
    }
    const event = { ...entry[1] };
    delete event.lockedBy;
    delete event.lockedUntil;
    this.webhooks.set(entry[0], {
      ...event,
      status: input.status,
      ...(input.availableAt ? { availableAt: input.availableAt } : {}),
    });
    return Promise.resolve();
  }
}

export class PostgresReliabilityStore implements ReliabilityStore {
  constructor(private readonly db: SqlExecutor) {}

  async reserveIdempotency(
    record: ReliabilityIdempotencyRecord,
  ): Promise<IdempotencyReservation> {
    const inserted = await this.db.query<{ idempotency_key: string }>(
      `insert into flow_internal.request_idempotency_records
        (workspace_id, idempotency_key, request_class, request_fingerprint, status,
         expires_at, traceparent)
       values ($1,$2,$3,$4,'STARTED',$5,$6)
       on conflict (workspace_id, idempotency_key) do nothing
       returning idempotency_key`,
      [
        record.workspaceId,
        record.idempotencyKey,
        record.requestClass,
        record.requestFingerprint,
        record.expiresAt,
        record.traceparent ?? null,
      ],
    );
    if (inserted.rows[0]) return { outcome: "RESERVED" };
    const existing = await this.db.query<{
      request_class: string;
      request_fingerprint: string;
      status: ReliabilityIdempotencyRecord["status"];
      result_reference: string | null;
    }>(
      `select request_class, request_fingerprint, status, result_reference
         from flow_internal.request_idempotency_records
        where workspace_id = $1 and idempotency_key = $2 and expires_at > now()`,
      [record.workspaceId, record.idempotencyKey],
    );
    const row = existing.rows[0];
    if (!row) {
      await this.db.query(
        `delete from flow_internal.request_idempotency_records
          where workspace_id = $1 and idempotency_key = $2 and expires_at <= now()`,
        [record.workspaceId, record.idempotencyKey],
      );
      return this.reserveIdempotency(record);
    }
    if (
      row.request_class !== record.requestClass ||
      row.request_fingerprint !== record.requestFingerprint
    ) {
      return { outcome: "CONFLICT" };
    }
    if (row.status === "COMPLETED") {
      return {
        outcome: "REPLAY",
        ...(row.result_reference
          ? { resultReference: row.result_reference }
          : {}),
      };
    }
    return row.status === "STARTED"
      ? { outcome: "IN_PROGRESS" }
      : this.retryFailedReservation(record);
  }

  private async retryFailedReservation(
    record: ReliabilityIdempotencyRecord,
  ): Promise<IdempotencyReservation> {
    const updated = await this.db.query<{ id: string }>(
      `update flow_internal.request_idempotency_records
          set status = 'STARTED', result_reference = null, expires_at = $3,
              traceparent = $4, updated_at = now()
        where workspace_id = $1 and idempotency_key = $2 and status = 'FAILED'
        returning id`,
      [
        record.workspaceId,
        record.idempotencyKey,
        record.expiresAt,
        record.traceparent ?? null,
      ],
    );
    return updated.rows[0]
      ? { outcome: "RESERVED" }
      : this.reserveIdempotency(record);
  }

  async completeIdempotency(input: {
    readonly workspaceId: string;
    readonly idempotencyKey: string;
    readonly resultReference: string;
  }): Promise<void> {
    const updated = await this.db.query<{ id: string }>(
      `update flow_internal.request_idempotency_records
          set status = 'COMPLETED', result_reference = $3, updated_at = now()
        where workspace_id = $1 and idempotency_key = $2 and status = 'STARTED'
        returning id`,
      [input.workspaceId, input.idempotencyKey, input.resultReference],
    );
    if (!updated.rows[0]) throw new Error("Idempotency record is not active.");
  }

  async failIdempotency(input: {
    readonly workspaceId: string;
    readonly idempotencyKey: string;
  }): Promise<void> {
    const updated = await this.db.query<{ id: string }>(
      `update flow_internal.request_idempotency_records
          set status = 'FAILED', updated_at = now()
        where workspace_id = $1 and idempotency_key = $2 and status = 'STARTED'
        returning id`,
      [input.workspaceId, input.idempotencyKey],
    );
    if (!updated.rows[0]) throw new Error("Idempotency record is not active.");
  }

  async enqueueOutbox(
    event: ReliabilityOutboxSubmission,
  ): Promise<"ENQUEUED" | "REPLAY" | "CONFLICT"> {
    const result = await this.db.query<{ inserted: boolean }>(
      `insert into flow_internal.outbox_events
        (event_id, workspace_id, idempotency_key, destination, event_type,
         aggregate_type, aggregate_id, payload, payload_fingerprint, evidence,
         correlation_id, traceparent, status, attempt_count, available_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (workspace_id, idempotency_key) do nothing
       returning true as inserted`,
      [
        event.eventId,
        event.workspaceId,
        event.idempotencyKey,
        event.destination,
        event.eventType,
        event.aggregateType,
        event.aggregateId,
        JSON.stringify(event.payload),
        event.payloadFingerprint,
        JSON.stringify(event.evidence),
        event.correlationId,
        event.traceparent ?? null,
        "PENDING",
        0,
        event.availableAt,
      ],
    );
    if (result.rows[0]) return "ENQUEUED";
    const existing = await this.db.query<{
      event_type: string;
      payload_fingerprint: string;
    }>(
      `select event_type, payload_fingerprint from flow_internal.outbox_events
        where workspace_id = $1 and idempotency_key = $2`,
      [event.workspaceId, event.idempotencyKey],
    );
    return existing.rows[0]?.event_type === event.eventType &&
      existing.rows[0]?.payload_fingerprint === event.payloadFingerprint
      ? "REPLAY"
      : "CONFLICT";
  }

  async claimOutbox(input: {
    readonly workerId: string;
    readonly now: string;
    readonly lockedUntil: string;
    readonly limit: number;
  }): Promise<readonly ReliabilityOutboxEvent[]> {
    requirePositiveLimit(input.limit);
    const result = await this.db.query<Record<string, unknown>>(
      `with candidates as (
         select id from flow_internal.outbox_events
          where status in ('PENDING','RETRY') and available_at <= $1
            and (locked_until is null or locked_until <= $1)
          order by available_at, created_at
          for update skip locked limit $2
       )
       update flow_internal.outbox_events o
          set status = 'PROCESSING', locked_by = $3, locked_until = $4,
              attempt_count = attempt_count + 1, updated_at = now()
         from candidates where o.id = candidates.id returning o.*`,
      [input.now, input.limit, input.workerId, input.lockedUntil],
    );
    return result.rows.map(mapOutbox);
  }

  async settleOutbox(input: {
    readonly workspaceId: string;
    readonly eventId: string;
    readonly workerId: string;
    readonly status: "DELIVERED" | "RETRY" | "DEAD";
    readonly availableAt?: string;
    readonly errorCode?: string;
  }): Promise<void> {
    const updated = await this.db.query<{ id: string }>(
      `update flow_internal.outbox_events
          set status = $3, available_at = coalesce($4, available_at),
              last_error_code = $5, locked_by = null, locked_until = null,
              delivered_at = case when $3 = 'DELIVERED' then now() else delivered_at end,
              updated_at = now()
        where workspace_id = $1 and event_id = $2 and status = 'PROCESSING'
          and locked_by = $6
        returning id`,
      [
        input.workspaceId,
        input.eventId,
        input.status,
        input.availableAt ?? null,
        input.errorCode ?? null,
        input.workerId,
      ],
    );
    if (!updated.rows[0]) throw new Error("Outbox lease is not active.");
  }

  async receiveWebhook(
    event: ReliabilityWebhookSubmission,
  ): Promise<"RECEIVED" | "REJECTED" | "REPLAY" | "CONFLICT"> {
    const accepted = event.signatureVerified && Boolean(event.workspaceId);
    const inserted = await this.db.query<{ inserted: boolean }>(
      `insert into flow_internal.webhook_inbox_events
        (inbox_id, provider, provider_event_id, workspace_id, payload,
         payload_fingerprint, signature_verified, status, attempt_count,
         correlation_id, traceparent, received_at, available_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (provider, provider_event_id) do nothing
       returning true as inserted`,
      [
        event.inboxId,
        event.provider,
        event.providerEventId,
        event.workspaceId ?? null,
        JSON.stringify(event.payload),
        event.payloadFingerprint,
        event.signatureVerified,
        accepted ? "RECEIVED" : "REJECTED",
        0,
        event.correlationId,
        event.traceparent ?? null,
        event.receivedAt,
        event.availableAt,
      ],
    );
    if (inserted.rows[0]) return accepted ? "RECEIVED" : "REJECTED";
    const existing = await this.db.query<{ payload_fingerprint: string }>(
      `select payload_fingerprint from flow_internal.webhook_inbox_events
        where provider = $1 and provider_event_id = $2`,
      [event.provider, event.providerEventId],
    );
    return existing.rows[0]?.payload_fingerprint === event.payloadFingerprint
      ? "REPLAY"
      : "CONFLICT";
  }

  async claimWebhooks(input: {
    readonly workerId: string;
    readonly now: string;
    readonly lockedUntil: string;
    readonly limit: number;
  }): Promise<readonly ReliabilityWebhookEvent[]> {
    requirePositiveLimit(input.limit);
    const result = await this.db.query<Record<string, unknown>>(
      `with candidates as (
         select id from flow_internal.webhook_inbox_events
          where status = 'RECEIVED' and available_at <= $1
            and signature_verified = true and workspace_id is not null
            and (locked_until is null or locked_until <= $1)
          order by received_at
          for update skip locked limit $2
       )
       update flow_internal.webhook_inbox_events i
          set status = 'PROCESSING', locked_by = $3, locked_until = $4,
              attempt_count = attempt_count + 1, updated_at = now()
         from candidates where i.id = candidates.id returning i.*`,
      [input.now, input.limit, input.workerId, input.lockedUntil],
    );
    return result.rows.map(mapWebhook);
  }

  async settleWebhook(input: {
    readonly inboxId: string;
    readonly workerId: string;
    readonly status: "PROCESSED" | "REJECTED" | "RECEIVED" | "DEAD";
    readonly availableAt?: string;
    readonly errorCode?: string;
  }): Promise<void> {
    const updated = await this.db.query<{ id: string }>(
      `update flow_internal.webhook_inbox_events
          set status = $2, available_at = coalesce($3, available_at),
              last_error_code = $4, locked_by = null, locked_until = null,
              processed_at = case when $2 = 'PROCESSED' then now() else processed_at end,
              updated_at = now()
        where inbox_id = $1 and status = 'PROCESSING' and locked_by = $5
        returning id`,
      [
        input.inboxId,
        input.status,
        input.availableAt ?? null,
        input.errorCode ?? null,
        input.workerId,
      ],
    );
    if (!updated.rows[0]) throw new Error("Webhook lease is not active.");
  }
}

export class PostgresActionAuditSink implements AuditSink {
  constructor(private readonly db: SqlExecutor) {}

  async record(event: AuditEvent): Promise<void> {
    const metadata = {
      decision: event.decision,
      resultStatus: event.resultStatus,
      reason: event.reason,
      evidence: event.evidence,
      ...(event.approval ? { approval: event.approval } : {}),
      ...(event.approvalGrant ? { approvalGrant: event.approvalGrant } : {}),
      ...(event.before !== undefined ? { before: event.before } : {}),
      ...(event.after !== undefined ? { after: event.after } : {}),
      ...(event.error ? { error: event.error } : {}),
      ...(event.traceparent ? { traceparent: event.traceparent } : {}),
    };
    const serialized = JSON.stringify(metadata);
    const fingerprint = createHash("sha256").update(serialized).digest("hex");
    await this.db.query(
      `insert into flow_internal.business_audit_events
        (event_id, workspace_id, actor_id, event_type, target_type, target_id,
         occurred_at, correlation_id, metadata_fingerprint, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
       on conflict (event_id) do nothing`,
      [
        event.id,
        event.workspaceId,
        event.actorId,
        event.action,
        event.resourceType,
        event.resourceId ?? "unscoped",
        event.occurredAt,
        event.correlationId,
        fingerprint,
        serialized,
      ],
    );
  }
}

function mapOutbox(row: Record<string, unknown>): ReliabilityOutboxEvent {
  const traceparent = optionalPostgresString(row.traceparent);
  const lockedBy = optionalPostgresString(row.locked_by);
  const lockedUntil = optionalPostgresString(row.locked_until);
  return {
    eventId: String(row.event_id),
    workspaceId: String(row.workspace_id),
    idempotencyKey: String(row.idempotency_key),
    destination: String(row.destination),
    eventType: String(row.event_type),
    aggregateType: String(row.aggregate_type),
    aggregateId: String(row.aggregate_id),
    payload: (row.payload as Readonly<Record<string, unknown>>) ?? {},
    payloadFingerprint: String(row.payload_fingerprint),
    evidence: (row.evidence as ReliabilityOutboxEvent["evidence"]) ?? [],
    correlationId: String(row.correlation_id),
    ...(traceparent ? { traceparent } : {}),
    status: row.status as ReliabilityOutboxEvent["status"],
    attemptCount: Number(row.attempt_count),
    availableAt: String(row.available_at),
    ...(lockedBy ? { lockedBy } : {}),
    ...(lockedUntil ? { lockedUntil } : {}),
  };
}

function mapWebhook(row: Record<string, unknown>): ReliabilityWebhookEvent {
  const workspaceId = optionalPostgresString(row.workspace_id);
  const traceparent = optionalPostgresString(row.traceparent);
  const lockedBy = optionalPostgresString(row.locked_by);
  const lockedUntil = optionalPostgresString(row.locked_until);
  return {
    inboxId: String(row.inbox_id),
    provider: String(row.provider),
    providerEventId: String(row.provider_event_id),
    payloadFingerprint: String(row.payload_fingerprint),
    payload: (row.payload as Readonly<Record<string, unknown>>) ?? {},
    ...(workspaceId ? { workspaceId } : {}),
    signatureVerified: Boolean(row.signature_verified),
    status: row.status as ReliabilityWebhookEvent["status"],
    attemptCount: Number(row.attempt_count),
    correlationId: String(row.correlation_id),
    ...(traceparent ? { traceparent } : {}),
    receivedAt: String(row.received_at),
    availableAt: String(row.available_at),
    ...(lockedBy ? { lockedBy } : {}),
    ...(lockedUntil ? { lockedUntil } : {}),
  };
}

function optionalPostgresString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
}
