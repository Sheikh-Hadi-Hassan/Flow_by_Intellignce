import { Controller, Get, Headers } from "@nestjs/common";

export interface HealthResponse {
  readonly status: "ok";
  readonly service: "flow-api";
  readonly correlationId?: string;
}

@Controller("health")
export class HealthController {
  @Get()
  getHealth(
    @Headers("x-correlation-id") correlationId?: string,
  ): HealthResponse {
    return {
      status: "ok",
      service: "flow-api",
      ...(correlationId ? { correlationId } : {}),
    };
  }
}
