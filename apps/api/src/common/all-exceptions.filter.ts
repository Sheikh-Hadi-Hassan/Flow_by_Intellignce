import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

interface ErrorResponse {
  readonly statusCode: number;
  readonly message: string;
  readonly correlationId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{
      readonly headers: Record<string, string | string[] | undefined>;
    }>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : "Unexpected error";
    const correlationHeader = request.headers["x-correlation-id"];
    const correlationId = Array.isArray(correlationHeader)
      ? correlationHeader[0]
      : correlationHeader;

    const payload: ErrorResponse = {
      statusCode: status,
      message,
      ...(correlationId ? { correlationId } : {}),
    };

    response.status(status).json(payload);
  }
}
