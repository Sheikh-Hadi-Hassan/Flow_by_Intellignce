import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { AllExceptionsFilter } from "../src/common/all-exceptions.filter.js";

describe("Internal action execution proof", () => {
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

  it("executes only system.echo through the Universal Execution Spine", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .post("/internal/actions/execute")
      .set("x-correlation-id", "api-proof-correlation")
      .send({ message: "api-proof" })
      .expect(201);

    expect(response.body).toMatchObject({
      status: "EXECUTED",
      toolId: "system.echo",
      output: { message: "api-proof" },
      correlationId: "api-proof-correlation",
      auditEvent: {
        resultStatus: "EXECUTED",
      },
    });
  });
});
