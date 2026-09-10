import { randomBytes } from "node:crypto";

export interface CorrelatedLogFields {
  readonly correlationId: string;
  readonly workspaceId?: string;
  readonly actorId?: string;
  readonly traceparent?: string;
}

export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: string;
  readonly traceparent: string;
  readonly tracestate?: string;
}

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

export function createServerTraceContext(input?: {
  readonly traceparent?: string;
  readonly tracestate?: string;
}): TraceContext {
  const parent = input?.traceparent?.trim().toLowerCase().match(TRACEPARENT);
  const [, parentTraceId = "", parentSpanId = "", parentFlags = "00"] =
    parent ?? [];
  const parentValid =
    parentTraceId.length > 0 &&
    !/^0+$/.test(parentTraceId) &&
    !/^0+$/.test(parentSpanId);
  const traceId = parentValid ? parentTraceId : randomHex(16);
  const traceFlags = parentValid ? parentFlags : "00";
  const spanId = randomHex(8);
  const tracestate = sanitizeTracestate(input?.tracestate);
  return {
    traceId,
    spanId,
    traceFlags,
    traceparent: `00-${traceId}-${spanId}-${traceFlags}`,
    ...(tracestate ? { tracestate } : {}),
  };
}

function randomHex(bytes: number): string {
  let value = randomBytes(bytes).toString("hex");
  while (/^0+$/.test(value)) value = randomBytes(bytes).toString("hex");
  return value;
}

function sanitizeTracestate(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 512 && /^[\x20-\x7e]+$/.test(trimmed)
    ? trimmed
    : undefined;
}
