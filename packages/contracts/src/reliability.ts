import type { EvidenceReference } from "./evidence.js";

export type ReliabilityErrorCode =
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "PROVIDER_UNAVAILABLE"
  | "NETWORK"
  | "AUTHENTICATION"
  | "PERMISSION"
  | "VALIDATION"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

export class ReliabilityError extends Error {
  constructor(
    readonly code: ReliabilityErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ReliabilityError";
  }
}

export interface RetryPolicy {
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
}

export const DEFAULT_PROVIDER_RETRY_POLICY: RetryPolicy = {
  timeoutMs: 15_000,
  maxAttempts: 3,
  initialDelayMs: 250,
  maxDelayMs: 2_000,
  backoffMultiplier: 2,
};

export interface ReliabilityAttemptContext {
  readonly attempt: number;
  readonly signal: AbortSignal;
  readonly idempotencyKey: string;
}

export interface ReliableExecutionResult<T> {
  readonly value: T;
  readonly attempts: number;
  readonly latencyMs: number;
}

export interface ReliabilityExecutionOptions {
  readonly sleep?: (delayMs: number) => Promise<void>;
  readonly now?: () => number;
}

export async function executeReliableProviderCall<T>(input: {
  readonly idempotencyKey: string;
  readonly policy?: RetryPolicy;
  readonly operation: (context: ReliabilityAttemptContext) => Promise<T>;
  readonly options?: ReliabilityExecutionOptions;
}): Promise<ReliableExecutionResult<T>> {
  if (input.idempotencyKey.trim().length === 0) {
    throw new ReliabilityError(
      "VALIDATION",
      "Provider calls require an idempotency key.",
      false,
    );
  }
  const policy = validateRetryPolicy(
    input.policy ?? DEFAULT_PROVIDER_RETRY_POLICY,
  );
  const now = input.options?.now ?? Date.now;
  const sleep =
    input.options?.sleep ??
    ((delayMs: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  const startedAt = now();

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(
            new ReliabilityError(
              "TIMEOUT",
              "Provider call exceeded its timeout.",
              true,
            ),
          );
          controller.abort();
        }, policy.timeoutMs);
      });
      const value = await Promise.race([
        input.operation({
          attempt,
          signal: controller.signal,
          idempotencyKey: input.idempotencyKey,
        }),
        timeoutPromise,
      ]);
      return { value, attempts: attempt, latencyMs: now() - startedAt };
    } catch (error) {
      const classified = asReliabilityError(error);
      if (!classified.retryable || attempt === policy.maxAttempts) {
        throw classified;
      }
      const delay = Math.min(
        policy.maxDelayMs,
        policy.initialDelayMs * policy.backoffMultiplier ** (attempt - 1),
      );
      await sleep(delay);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  throw new ReliabilityError("UNKNOWN", "Provider call failed.", false);
}

function validateRetryPolicy(policy: RetryPolicy): RetryPolicy {
  if (
    !Number.isInteger(policy.timeoutMs) ||
    policy.timeoutMs < 1 ||
    policy.timeoutMs > 120_000 ||
    !Number.isInteger(policy.maxAttempts) ||
    policy.maxAttempts < 1 ||
    policy.maxAttempts > 5 ||
    policy.initialDelayMs < 0 ||
    policy.maxDelayMs < policy.initialDelayMs ||
    policy.backoffMultiplier < 1
  ) {
    throw new ReliabilityError("VALIDATION", "Invalid retry policy.", false);
  }
  return policy;
}

function asReliabilityError(error: unknown): ReliabilityError {
  return error instanceof ReliabilityError
    ? error
    : new ReliabilityError(
        "UNKNOWN",
        error instanceof Error ? error.message : "Provider call failed.",
        false,
      );
}

export type IdempotencyReservation =
  | { readonly outcome: "RESERVED" }
  | { readonly outcome: "REPLAY"; readonly resultReference?: string }
  | { readonly outcome: "IN_PROGRESS" }
  | { readonly outcome: "CONFLICT" };

export interface ReliabilityIdempotencyRecord {
  readonly workspaceId: string;
  readonly idempotencyKey: string;
  readonly requestClass: string;
  readonly requestFingerprint: string;
  readonly status: "STARTED" | "COMPLETED" | "FAILED";
  readonly resultReference?: string;
  readonly expiresAt: string;
  readonly traceparent?: string;
}

export interface ReliabilityOutboxEvent {
  readonly eventId: string;
  readonly workspaceId: string;
  readonly idempotencyKey: string;
  readonly destination: string;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly payloadFingerprint: string;
  readonly evidence: readonly EvidenceReference[];
  readonly correlationId: string;
  readonly traceparent?: string;
  readonly status: "PENDING" | "PROCESSING" | "DELIVERED" | "RETRY" | "DEAD";
  readonly attemptCount: number;
  readonly availableAt: string;
  readonly lockedBy?: string;
  readonly lockedUntil?: string;
}

export interface ReliabilityWebhookEvent {
  readonly inboxId: string;
  readonly provider: string;
  readonly providerEventId: string;
  readonly payloadFingerprint: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly workspaceId?: string;
  readonly signatureVerified: boolean;
  readonly status:
    "RECEIVED" | "PROCESSING" | "PROCESSED" | "REJECTED" | "DEAD";
  readonly attemptCount: number;
  readonly correlationId: string;
  readonly traceparent?: string;
  readonly receivedAt: string;
  readonly availableAt: string;
  readonly lockedBy?: string;
  readonly lockedUntil?: string;
}

export type ReliabilityOutboxSubmission = Omit<
  ReliabilityOutboxEvent,
  "status" | "attemptCount" | "lockedBy" | "lockedUntil"
>;

export type ReliabilityWebhookSubmission = Omit<
  ReliabilityWebhookEvent,
  "status" | "attemptCount" | "lockedBy" | "lockedUntil"
>;

export interface ReliabilityStore {
  reserveIdempotency(
    record: ReliabilityIdempotencyRecord,
  ): Promise<IdempotencyReservation>;
  completeIdempotency(input: {
    readonly workspaceId: string;
    readonly idempotencyKey: string;
    readonly resultReference: string;
  }): Promise<void>;
  failIdempotency(input: {
    readonly workspaceId: string;
    readonly idempotencyKey: string;
  }): Promise<void>;
  enqueueOutbox(
    event: ReliabilityOutboxSubmission,
  ): Promise<"ENQUEUED" | "REPLAY" | "CONFLICT">;
  claimOutbox(input: {
    readonly workerId: string;
    readonly now: string;
    readonly lockedUntil: string;
    readonly limit: number;
  }): Promise<readonly ReliabilityOutboxEvent[]>;
  settleOutbox(input: {
    readonly workspaceId: string;
    readonly eventId: string;
    readonly workerId: string;
    readonly status: "DELIVERED" | "RETRY" | "DEAD";
    readonly availableAt?: string;
    readonly errorCode?: string;
  }): Promise<void>;
  receiveWebhook(
    event: ReliabilityWebhookSubmission,
  ): Promise<"RECEIVED" | "REJECTED" | "REPLAY" | "CONFLICT">;
  claimWebhooks(input: {
    readonly workerId: string;
    readonly now: string;
    readonly lockedUntil: string;
    readonly limit: number;
  }): Promise<readonly ReliabilityWebhookEvent[]>;
  settleWebhook(input: {
    readonly inboxId: string;
    readonly workerId: string;
    readonly status: "PROCESSED" | "REJECTED" | "RECEIVED" | "DEAD";
    readonly availableAt?: string;
    readonly errorCode?: string;
  }): Promise<void>;
}
