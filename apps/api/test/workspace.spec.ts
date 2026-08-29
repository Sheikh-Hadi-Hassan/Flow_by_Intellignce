import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { AllExceptionsFilter } from "../src/common/all-exceptions.filter.js";

describe("workspace API", () => {
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

  it("rejects anonymous workspace provisioning", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .send({
        firstName: "Maya",
        workspaceName: "Acme Studio",
      });
    expect(response.status).toBe(401);
  });

  it("provisions a workspace for an authenticated founder", async () => {
    const uniqueName = `Jordan Creative ${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-unknown-token")
      .send({
        firstName: "Jordan",
        workspaceName: uniqueName,
        email: "unknown@example.test",
      })
      .expect(201);

    expect(response.body.slug).toBe(
      uniqueName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48),
    );
    expect(response.body.created).toBe(true);
  });

  it("denies cross-workspace twin access", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/workspaces/workspace-alpha/twin")
      .set("Authorization", "Bearer valid-bob-token")
      .set("x-flow-workspace-id", "workspace-alpha")
      .expect(403);
  });
});
