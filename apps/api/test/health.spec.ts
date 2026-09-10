import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { AllExceptionsFilter } from "../src/common/all-exceptions.filter.js";

describe("Health endpoint", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns health status and preserves correlation ID", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .get("/health")
      .set("x-correlation-id", "test-correlation")
      .expect(200);

    expect(response.body).toEqual({
      status: "ok",
      service: "flow-api",
      correlationId: "test-correlation",
    });
    expect(response.headers["x-correlation-id"]).toBe("test-correlation");
    expect(response.headers.traceparent).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/,
    );
  });

  it("preserves a valid incoming W3C trace and replaces invalid context", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const incoming = "00-11111111111111111111111111111111-2222222222222222-01";
    const traced = await request(server)
      .get("/health")
      .set("traceparent", incoming)
      .set("tracestate", "flow=test")
      .expect(200);

    expect(traced.headers.traceparent).toMatch(
      /^00-11111111111111111111111111111111-[0-9a-f]{16}-01$/,
    );
    expect(traced.headers.traceparent).not.toBe(incoming);
    expect(traced.headers.tracestate).toBe("flow=test");

    const invalid = await request(server)
      .get("/health")
      .set("traceparent", "not-a-trace")
      .expect(200);
    expect(invalid.headers.traceparent).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/,
    );
  });
});
