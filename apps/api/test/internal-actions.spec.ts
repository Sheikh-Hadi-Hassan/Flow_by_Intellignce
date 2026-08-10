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
      .set("authorization", "Bearer valid-alice-token")
      .set("x-flow-workspace-id", "workspace-alpha")
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

  it("denies unauthenticated requests before actor context construction", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post("/internal/actions/execute")
      .set("x-flow-workspace-id", "workspace-alpha")
      .send({ message: "api-proof" })
      .expect(401);
  });

  it("denies invalid JWT/auth tokens", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post("/internal/actions/execute")
      .set("authorization", "Bearer invalid-token")
      .set("x-flow-workspace-id", "workspace-alpha")
      .send({ message: "api-proof" })
      .expect(401);
  });

  it("handles valid identity with unknown Flow user safely", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post("/internal/actions/execute")
      .set("authorization", "Bearer valid-unknown-token")
      .set("x-flow-workspace-id", "workspace-alpha")
      .send({ message: "api-proof" })
      .expect(403);
  });

  it("denies valid users without membership in the selected workspace", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post("/internal/actions/execute")
      .set("authorization", "Bearer valid-bob-token")
      .set("x-flow-workspace-id", "workspace-alpha")
      .send({ message: "api-proof" })
      .expect(403);
  });

  it("denies suspended workspace memberships through Action Wall", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .post("/internal/actions/execute")
      .set("authorization", "Bearer valid-bob-token")
      .set("x-flow-workspace-id", "workspace-beta")
      .send({ message: "api-proof" })
      .expect(201);

    expect(response.body).toMatchObject({
      status: "DENIED",
      authorization: {
        reason: "Workspace membership is not active.",
      },
    });
  });

  it("denies active membership that lacks the action permission", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .post("/internal/actions/execute")
      .set("authorization", "Bearer valid-alice-token")
      .set("x-flow-workspace-id", "workspace-beta")
      .send({ message: "api-proof" })
      .expect(201);

    expect(response.body).toMatchObject({
      status: "DENIED",
      authorization: {
        reason: "Persisted workspace membership lacks the required permission.",
      },
    });
  });

  it("does not grant AI request source additional permission", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .post("/internal/actions/execute")
      .set("authorization", "Bearer valid-alice-token")
      .set("x-flow-workspace-id", "workspace-beta")
      .set("x-flow-request-source", "AI")
      .send({ message: "api-proof" })
      .expect(201);

    expect(response.body).toMatchObject({ status: "DENIED" });
  });

  it("ignores client-supplied actor and role claims", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .post("/internal/actions/execute")
      .set("authorization", "Bearer valid-alice-token")
      .set("x-flow-workspace-id", "workspace-beta")
      .set("x-flow-actor-id", "flow-user-bob")
      .set("x-flow-permissions", "system.echo")
      .send({ message: "api-proof" })
      .expect(201);

    expect(response.body).toMatchObject({
      status: "DENIED",
      actorId: "flow-user-alice",
      workspaceId: "workspace-beta",
    });
  });
});
