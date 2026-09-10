import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { createServerTraceContext } from "@flow/observability";

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const existing = request.header("x-correlation-id");
    const correlationId =
      existing && existing.length > 0 ? existing : randomUUID();

    request.headers["x-correlation-id"] = correlationId;
    response.setHeader("x-correlation-id", correlationId);
    const incomingTraceparent = request.header("traceparent");
    const incomingTracestate = request.header("tracestate");
    const trace = createServerTraceContext({
      ...(incomingTraceparent ? { traceparent: incomingTraceparent } : {}),
      ...(incomingTracestate ? { tracestate: incomingTracestate } : {}),
    });
    request.headers.traceparent = trace.traceparent;
    response.setHeader("traceparent", trace.traceparent);
    if (trace.tracestate) {
      request.headers.tracestate = trace.tracestate;
      response.setHeader("tracestate", trace.tracestate);
    }
    next();
  }
}
