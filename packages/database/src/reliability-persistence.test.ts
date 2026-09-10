import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  CorrelationId,
  ReliabilityIdempotencyRecord,
  ReliabilityOutboxSubmission,
  ReliabilityWebhookSubmission,
} from "@flow/contracts";
import {
  InMemoryReliabilityStore,
  PostgresActionAuditSink,
  PostgresReliabilityStore,
} from "./reliability-persistence.js";
import type { SqlExecutor } from "./sql-executor.js";

const idempotency: ReliabilityIdempotencyRecord = {
  workspaceId: "ws-a",
  idempotencyKey: "request-1",
  requestClass: "proposal.create",
  requestFingerprint: "sha256:request",
  status: "STARTED",
  expiresAt: "2999-01-01T00:00:00.000Z",
};

const outbox: ReliabilityOutboxSubmission = {
  eventId: "event-1",
  workspaceId: "ws-a",
  idempotencyKey: "delivery-1",
  destination: "twenty",
  eventType: "crm.company.created",
  aggregateType: "company",
  aggregateId: "company-1",
  payload: { companyId: "company-1" },
  payloadFingerprint: "sha256:payload",
  evidence: [],
  correlationId: "correlation-1",
  availableAt: "2026-01-01T00:00:00.000Z",
};

const webhook: ReliabilityWebhookSubmission = {
  inboxId: "inbox-1",
  provider: "documenso",
  providerEventId: "provider-event-1",
  payloadFingerprint: "sha256:webhook",
  payload: { documentId: "document-1" },
  workspaceId: "ws-a",
  signatureVerified: true,
  correlationId: "correlation-2",
  receivedAt: "2026-01-01T00:00:00.000Z",
  availableAt: "2026-01-01T00:00:00.000Z",
};

describe("reliability persistence", () => {
  it("reserves, detects conflicts, and replays completed requests", async () => {
    const store = new InMemoryReliabilityStore();
    await expect(store.reserveIdempotency(idempotency)).resolves.toEqual({
      outcome: "RESERVED",
    });
    await expect(store.reserveIdempotency(idempotency)).resolves.toEqual({
      outcome: "IN_PROGRESS",
    });
    await expect(
      store.reserveIdempotency({
        ...idempotency,
        requestFingerprint: "sha256:different",
      }),
    ).resolves.toEqual({ outcome: "CONFLICT" });

    await store.completeIdempotency({
      workspaceId: "ws-a",
      idempotencyKey: "request-1",
      resultReference: "proposal-1",
    });
    await expect(store.reserveIdempotency(idempotency)).resolves.toEqual({
      outcome: "REPLAY",
      resultReference: "proposal-1",
    });
  });

  it("deduplicates and leases outbox events exactly once", async () => {
    const store = new InMemoryReliabilityStore();
    await expect(store.enqueueOutbox(outbox)).resolves.toBe("ENQUEUED");
    await expect(store.enqueueOutbox(outbox)).resolves.toBe("REPLAY");
    await expect(
      store.enqueueOutbox({ ...outbox, payloadFingerprint: "sha256:other" }),
    ).resolves.toBe("CONFLICT");

    const claimed = await store.claimOutbox({
      workerId: "worker-1",
      now: "2026-01-01T00:00:01.000Z",
      lockedUntil: "2026-01-01T00:01:01.000Z",
      limit: 10,
    });
    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({
      status: "PROCESSING",
      attemptCount: 1,
      lockedBy: "worker-1",
    });
    await expect(
      store.settleOutbox({
        workspaceId: "ws-a",
        eventId: "event-1",
        workerId: "worker-2",
        status: "DELIVERED",
      }),
    ).rejects.toThrow(/another worker/);
    await store.settleOutbox({
      workspaceId: "ws-a",
      eventId: "event-1",
      workerId: "worker-1",
      status: "DELIVERED",
    });
    await expect(
      store.claimOutbox({
        workerId: "worker-2",
        now: "2026-01-01T00:00:02.000Z",
        lockedUntil: "2026-01-01T00:01:02.000Z",
        limit: 10,
      }),
    ).resolves.toEqual([]);
  });

  it("deduplicates provider webhooks before processing", async () => {
    const store = new InMemoryReliabilityStore();
    await expect(store.receiveWebhook(webhook)).resolves.toBe("RECEIVED");
    await expect(store.receiveWebhook(webhook)).resolves.toBe("REPLAY");
    await expect(
      store.receiveWebhook({ ...webhook, payloadFingerprint: "sha256:other" }),
    ).resolves.toBe("CONFLICT");

    const claimed = await store.claimWebhooks({
      workerId: "worker-1",
      now: "2026-01-01T00:00:01.000Z",
      lockedUntil: "2026-01-01T00:01:01.000Z",
      limit: 1,
    });
    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({
      status: "PROCESSING",
      attemptCount: 1,
      lockedBy: "worker-1",
    });
    await expect(
      store.settleWebhook({
        inboxId: "inbox-1",
        workerId: "worker-2",
        status: "PROCESSED",
      }),
    ).rejects.toThrow(/another worker/);
    await store.settleWebhook({
      inboxId: "inbox-1",
      workerId: "worker-1",
      status: "PROCESSED",
    });
  });

  it("records but never processes unverified or unscoped webhooks", async () => {
    const store = new InMemoryReliabilityStore();
    const unscopedWebhook = { ...webhook };
    delete unscopedWebhook.workspaceId;
    await expect(
      store.receiveWebhook({
        ...webhook,
        inboxId: "inbox-unverified",
        providerEventId: "provider-event-unverified",
        signatureVerified: false,
      }),
    ).resolves.toBe("REJECTED");
    await expect(
      store.receiveWebhook({
        ...unscopedWebhook,
        inboxId: "inbox-unscoped",
        providerEventId: "provider-event-unscoped",
      }),
    ).resolves.toBe("REJECTED");

    await expect(
      store.claimWebhooks({
        workerId: "worker-1",
        now: "2026-01-01T00:00:01.000Z",
        lockedUntil: "2026-01-01T00:01:01.000Z",
        limit: 10,
      }),
    ).resolves.toEqual([]);
  });

  it("uses skip-locked claims in PostgreSQL", async () => {
    const calls: string[] = [];
    const db: SqlExecutor = {
      query: <T>(sql: string) => {
        calls.push(sql);
        return Promise.resolve({ rows: [] as T[] });
      },
    };
    const store = new PostgresReliabilityStore(db);
    await store.claimOutbox({
      workerId: "worker-1",
      now: "2026-01-01T00:00:01.000Z",
      lockedUntil: "2026-01-01T00:01:01.000Z",
      limit: 5,
    });
    await store.claimWebhooks({
      workerId: "worker-1",
      now: "2026-01-01T00:00:01.000Z",
      lockedUntil: "2026-01-01T00:01:01.000Z",
      limit: 5,
    });
    expect(calls).toHaveLength(2);
    expect(calls.every((sql) => /for update skip locked/i.test(sql))).toBe(
      true,
    );
  });

  it("rejects stale PostgreSQL state transitions", async () => {
    const db: SqlExecutor = {
      query: <T>() => Promise.resolve({ rows: [] as T[] }),
    };
    const store = new PostgresReliabilityStore(db);
    await expect(
      store.completeIdempotency({
        workspaceId: "ws-a",
        idempotencyKey: "missing",
        resultReference: "result-1",
      }),
    ).rejects.toThrow(/not active/);
    await expect(
      store.settleOutbox({
        workspaceId: "ws-a",
        eventId: "missing",
        workerId: "worker-1",
        status: "DELIVERED",
      }),
    ).rejects.toThrow(/lease is not active/);
  });

  it("persists action decisions, evidence, and trace linkage in append-only audit", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const db: SqlExecutor = {
      query: <T>(sql: string, params: readonly unknown[]) => {
        calls.push({ sql, params });
        return Promise.resolve({ rows: [] as T[] });
      },
    };
    await new PostgresActionAuditSink(db).record({
      id: "audit-1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      actorId: "user-1",
      workspaceId: "ws-a",
      resourceType: "company",
      resourceId: "company-1",
      action: "client.manage",
      toolId: "company.update",
      decision: {
        outcome: "ALLOW",
        reason: "Authorized.",
        requiredPermission: "client.manage",
      },
      resultStatus: "EXECUTED",
      reason: "Executed.",
      evidence: [
        {
          id: "evidence-1",
          kind: "system-record",
          source: "Flow",
          claimClassification: "FACT",
          trustLevel: "high",
        },
      ],
      correlationId: "correlation-1" as CorrelationId,
      traceparent: "00-11111111111111111111111111111111-2222222222222222-01",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain("business_audit_events");
    expect(String(calls[0]?.params[9])).toContain('"evidence"');
    expect(String(calls[0]?.params[9])).toContain('"traceparent"');
  });

  it("keeps reliability tables internal, tenant-scoped, and RLS protected", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/20260908000200_reliability_spine.sql",
      ),
      "utf8",
    );
    expect(migration).toContain(
      "create table if not exists flow_internal.outbox_events",
    );
    expect(migration).toContain(
      "create table if not exists flow_internal.webhook_inbox_events",
    );
    expect(migration).toContain(
      "workspace_id uuid not null references public.workspaces",
    );
    expect(migration).toContain(
      "alter table flow_internal.outbox_events enable row level security",
    );
    expect(migration).toContain(
      "revoke all on table flow_internal.webhook_inbox_events from public, anon, authenticated",
    );
    expect(migration).toContain("request_idempotency_records_status_check");
    expect(migration).toContain("outbox_events_traceparent_check");
    expect(migration).toContain("webhook_inbox_events_traceparent_check");
    expect(migration).not.toMatch(/security\s+definer/i);
    expect(migration).not.toMatch(/^\s*(drop|truncate|delete)\s/im);
  });
});
