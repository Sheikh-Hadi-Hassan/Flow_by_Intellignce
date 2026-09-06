import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { AllExceptionsFilter } from "../src/common/all-exceptions.filter.js";

describe("building-block CRM Core journey", () => {
  let app: INestApplication;
  let workspaceId: string;
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

    const first = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-unknown-token")
      .send({
        firstName: "Maya",
        workspaceName: `BB ${Date.now()}`,
        email: "bb-maya@example.test",
      })
      .expect(201);
    workspaceId = first.body.workspace.id;

    const second = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-alice-token")
      .send({
        firstName: "Alice",
        workspaceName: `BB Alice ${Date.now()}`,
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
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks`)
      .expect(401);

    const denied = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks`)
      .set("Authorization", "Bearer valid-alice-token")
      .set("x-flow-workspace-id", workspaceId);
    expect(denied.status).toBe(403);
    expect(JSON.stringify(denied.body)).not.toMatch(/Meridian/i);
    expect(otherWorkspaceId).toBeTruthy();
  });

  it("recommends, configures, approves, seeds, and requires merge approval", async () => {
    const overview = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks`)
      .set(auth())
      .expect(200);
    expect(overview.body.recommendations[0].blockId).toBe("crm.core");
    expect(overview.body.recommendations[0].requiresHumanApproval).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/building-blocks/crm.core/configure`)
      .set(auth())
      .send({ configuration: { duplicateThreshold: 85 } })
      .expect(201);

    const invalid = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/building-blocks/crm.core/configure`)
      .set(auth())
      .send({ configuration: { duplicateThreshold: 1 } });
    expect(invalid.status).toBeGreaterThanOrEqual(400);

    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/building-blocks/crm.core/submit`)
      .set(auth())
      .send({ configuration: { duplicateThreshold: 85 } })
      .expect(201);

    const hidden = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks/crm/clients`)
      .set(auth())
      .expect(200);
    expect(hidden.body).toEqual([]);

    const activated = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/building-blocks/crm.core/approve`)
      .set(auth())
      .expect(201);
    expect(activated.body.status).toBe("active");
    expect(activated.body.approvedBy).toBeTruthy();

    const clients = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks/crm/clients`)
      .set(auth())
      .expect(200);
    expect(clients.body).toHaveLength(52);
    expect(clients.body.map((row: { name: string }) => row.name)).toContain(
      "Meridian Health",
    );

    const proposal = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/building-blocks/crm/proposals`)
      .set(auth())
      .send({
        toolName: "propose_duplicate_merge",
        payload: { duplicateId: clients.body[0].id },
      })
      .expect(201);
    expect(proposal.body.status).toBe("proposed");

    const merged = await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/building-blocks/crm/proposals/${proposal.body.id}/approve`,
      )
      .set(auth())
      .expect(201);
    expect(merged.body.status).toBe("approved");

    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/building-blocks/crm.core/suspend`)
      .set(auth())
      .expect(201);
    const after = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/building-blocks/crm/clients`)
      .set(auth())
      .expect(200);
    expect(after.body).toEqual([]);
  });

});
