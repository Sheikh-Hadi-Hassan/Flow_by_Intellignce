import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { AllExceptionsFilter } from "../src/common/all-exceptions.filter.js";

describe("Business Registry API", () => {
  let app: INestApplication;
  let workspaceId: string;
  let productionWorkspaceId: string;
  let otherWorkspaceId: string;

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

    const demo = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-unknown-token")
      .send({
        firstName: "Maya",
        workspaceName: `Demo Registry ${Date.now()}`,
        email: "bb-registry-maya@example.test",
      })
      .expect(201);
    workspaceId = demo.body.workspace.id;

    const production = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-bob-token")
      .send({
        firstName: "Bob",
        workspaceName: `Acme Production ${Date.now()}`,
        email: "bob@example.test",
      })
      .expect(201);
    productionWorkspaceId = production.body.workspace.id;

    const second = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-alice-token")
      .send({
        firstName: "Alice",
        workspaceName: `Demo Alice ${Date.now()}`,
        email: "alice@example.test",
      })
      .expect(201);
    otherWorkspaceId = second.body.workspace.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({
    Authorization: "Bearer valid-unknown-token",
    "x-flow-workspace-id": workspaceId,
  });

  it("denies anonymous and cross-tenant reads", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks/registry`)
      .expect(401);

    const denied = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks/registry`)
      .set("Authorization", "Bearer valid-alice-token")
      .set("x-flow-workspace-id", workspaceId);
    expect(denied.status).toBe(403);
    expect(JSON.stringify(denied.body)).not.toMatch(/Northstar Creative LLC/i);
    expect(otherWorkspaceId).toBeTruthy();
  });

  it("seeds one Northstar entity, two locations, and writes audit", async () => {
    const seeded = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/building-blocks/registry/seed`)
      .set(auth())
      .send({})
      .expect(201);
    expect(seeded.body.organizationId).toBe(
      "00000000-0000-4000-b001-000000000001",
    );
    expect(seeded.body.locations).toHaveLength(2);
    expect(seeded.body.registrationNumber).toMatch(/^DEMO-/);

    const again = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/building-blocks/registry/seed`)
      .set(auth())
      .send({})
      .expect(201);
    expect(again.body.organizationId).toBe(seeded.body.organizationId);
    expect(again.body.locations).toHaveLength(2);

    const view = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks/registry`)
      .set(auth())
      .expect(200);
    expect(view.body.profile.legalName).toBe("Northstar Creative LLC");
    expect(view.body.profile.tax[0].maskedValue).toMatch(/^DEMO-/);
    expect(view.body.canEditProfile).toBe(true);

    const events = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks/registry/events`)
      .set(auth())
      .expect(200);
    expect(events.body.map((row: { name: string }) => row.name)).toEqual(
      expect.arrayContaining([
        "business_profile.created",
        "location.created",
        "document.renewal_due",
      ]),
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspaceId}/building-blocks/registry`)
      .set(auth())
      .send({ tradingName: "Northstar Creative", reason: "Confirm trading name" })
      .expect(200);
  });

  it("rejects seed on a production workspace slug", async () => {
    const rejected = await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${productionWorkspaceId}/building-blocks/registry/seed`,
      )
      .set({
        Authorization: "Bearer valid-bob-token",
        "x-flow-workspace-id": productionWorkspaceId,
      })
      .send({});
    expect(rejected.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(rejected.body)).toMatch(/production/i);
  });
});
