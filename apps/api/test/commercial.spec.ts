import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { AllExceptionsFilter } from "../src/common/all-exceptions.filter.js";

const DISCOVERY_NOTES = `Discovery with Acme Robotics procurement.
Audience: plant managers and operations directors evaluating a launch-ready industrial brand.
Budget: $85000. Timeline is 90 days through a product launch in Q4.
Legal review of claims is likely.`;

describe("commercial API journey", () => {
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
        workspaceName: `Phase2 ${Date.now()}`,
        email: "unknown@example.test",
      })
      .expect(201);
    workspaceId = first.body.workspace.id;

    const second = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-alice-token")
      .send({
        firstName: "Alice",
        workspaceName: `Phase2 Alice ${Date.now()}`,
        email: "alice@example.test",
      })
      .expect(201);
    otherWorkspaceId = second.body.workspace.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects anonymous commercial reads", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/commercial/services`)
      .expect(401);
  });

  it("denies cross-tenant commercial reads", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/commercial/clients`)
      .set("Authorization", "Bearer valid-alice-token")
      .set("x-flow-workspace-id", workspaceId);
    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toMatch(/Acme/i);
  });

  it("completes service to immutable brief approval", async () => {
    const auth = {
      Authorization: "Bearer valid-unknown-token",
      "x-flow-workspace-id": workspaceId,
    };

    const serviceRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/commercial/services`)
      .set(auth)
      .send({
        name: "Brand Strategy & Identity",
        pricingModel: "project",
        currency: "USD",
      })
      .expect(201);
    const serviceId = serviceRes.body.service.id as string;
    const questionnaireId = serviceRes.body.questionnaire.id as string;

    await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/questionnaires/${questionnaireId}/publish`,
      )
      .set({ ...auth, "Idempotency-Key": `pub-${questionnaireId}` })
      .expect(201);

    const replayPublish = await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/questionnaires/${questionnaireId}/publish`,
      )
      .set({ ...auth, "Idempotency-Key": `pub-${questionnaireId}` })
      .expect(201);
    expect(replayPublish.body.replayed).toBe(true);

    const clientRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/commercial/clients`)
      .set(auth)
      .send({
        name: "Acme Robotics",
        industry: "robotics",
        contactFirstName: "Priya",
        contactLastName: "Chen",
      })
      .expect(201);
    const clientId = clientRes.body.client.id as string;
    const contactId = clientRes.body.contact.id as string;

    const oppRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/commercial/opportunities`)
      .set(auth)
      .send({
        clientId,
        contactId,
        serviceId,
        name: "Acme Robotics brand system",
        budgetMinMinor: "7000000",
        budgetMaxMinor: "9000000",
      })
      .expect(201);
    const opportunityId = oppRes.body.id as string;

    await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/opportunities/${opportunityId}/answers`,
      )
      .set(auth)
      .send({
        answers: {
          brandMaturity: "emerging",
          primaryAudience: "Plant managers and operations directors",
          successMetric: "Shortlist conversion",
        },
      })
      .expect(201);

    const notesRes = await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/opportunities/${opportunityId}/notes`,
      )
      .set(auth)
      .send({ notes: DISCOVERY_NOTES })
      .expect(201);
    expect(notesRes.body.facts[0].status).toBe("draft");

    let rejectedOne = false;
    for (const fact of notesRes.body.facts) {
      const status = !rejectedOne && fact.category !== "budget" ? "rejected" : "verified";
      if (status === "rejected") rejectedOne = true;
      await request(app.getHttpServer())
        .post(
          `/api/v1/workspaces/${workspaceId}/commercial/facts/${fact.id}/verify`,
        )
        .set(auth)
        .send({ status })
        .expect(201);
    }

    const afterVerify = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/commercial/opportunities/${opportunityId}`)
      .set(auth)
      .expect(200);
    for (const risk of afterVerify.body.risks.filter(
      (row: { blocking: boolean; handled: boolean }) => row.blocking && !row.handled,
    )) {
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/commercial/risks/${risk.id}/handle`)
        .set(auth)
        .expect(201);
    }

    const followUpId = notesRes.body.followUps[0].id as string;
    await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/follow-ups/${followUpId}/answer`,
      )
      .set(auth)
      .send({ answer: "Maya Chen, founder" })
      .expect(201);

    const calcRes = await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/opportunities/${opportunityId}/calculate`,
      )
      .set(auth)
      .expect(201);
    expect(calcRes.body.opportunity.journeyStatus).toBe("ready_for_brief");
    expect(calcRes.body.opportunity.latestCalculation.recommendedPriceMinor).toMatch(
      /^\d+$/,
    );
    expect(calcRes.body.deliverables.length).toBeGreaterThan(0);
    expect(calcRes.body.requirements.length).toBeGreaterThan(0);
    expect(calcRes.body.risks.length).toBeGreaterThan(0);

    const briefRes = await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/opportunities/${opportunityId}/brief`,
      )
      .set(auth)
      .expect(201);
    expect(briefRes.body.status).toBe("draft");

    await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/briefs/${briefRes.body.id}/submit`,
      )
      .set(auth)
      .send({ expectedVersion: briefRes.body.versionNumber })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/briefs/${briefRes.body.id}/changes`,
      )
      .set(auth)
      .expect(201);

    const briefV2 = await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/opportunities/${opportunityId}/brief`,
      )
      .set(auth)
      .expect(201);
    expect(briefV2.body.versionNumber).toBe(2);

    await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/briefs/${briefV2.body.id}/submit`,
      )
      .set(auth)
      .send({ expectedVersion: briefV2.body.versionNumber })
      .expect(201);

    const approveRes = await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/briefs/${briefV2.body.id}/approve`,
      )
      .set({ ...auth, "Idempotency-Key": `apr-${briefV2.body.id}` })
      .send({ expectedVersion: briefV2.body.versionNumber })
      .expect(201);
    expect(approveRes.body.status).toBe("approved");

    await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/briefs/${briefV2.body.id}/approve`,
      )
      .set({ ...auth, "Idempotency-Key": `apr-${briefV2.body.id}` })
      .send({ expectedVersion: briefV2.body.versionNumber })
      .expect(201);

    const mutate = await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/commercial/briefs/${briefV2.body.id}/changes`,
      )
      .set(auth);
    expect(mutate.status).toBeGreaterThanOrEqual(400);

    const outsider = await request(app.getHttpServer())
      .get(
        `/api/v1/workspaces/${otherWorkspaceId}/commercial/opportunities/${opportunityId}`,
      )
      .set({
        Authorization: "Bearer valid-unknown-token",
        "x-flow-workspace-id": otherWorkspaceId,
      });
    expect(outsider.status).toBe(403);
  });
});
