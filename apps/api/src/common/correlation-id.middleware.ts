import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { Injectable, NestMiddleware } from "@nestjs/common";

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const existing = request.header("x-correlation-id");
    const correlationId =
      existing && existing.length > 0 ? existing : randomUUID();

    request.headers["x-correlation-id"] = correlationId;
    response.setHeader("x-correlation-id", correlationId);
    next();
  }
}
