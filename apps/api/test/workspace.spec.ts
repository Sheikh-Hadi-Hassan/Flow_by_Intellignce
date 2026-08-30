import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
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
      uniqueName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48),
    );
    expect(response.body.created).toBe(true);

    const second = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-unknown-token")
      .send({
        firstName: "Jordan",
        workspaceName: uniqueName,
        email: "unknown@example.test",
      })
      .expect(201);

    expect(second.body.created).toBe(false);
    expect(second.body.slug).toBe(response.body.slug);
  });

  it("loads workspace by slug without workspace header", async () => {
    const uniqueName = `Slug Lookup ${Date.now()}`;
    const provision = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-unknown-token")
      .send({
        firstName: "Taylor",
        workspaceName: uniqueName,
        email: "unknown@example.test",
      })
      .expect(201);

    const slug = provision.body.slug as string;
    const loaded = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/by-slug/${slug}`)
      .set("Authorization", "Bearer valid-unknown-token")
      .expect(200);

    expect(loaded.body.workspace.slug).toBe(slug);
    expect(loaded.body.onboarding).toBeTruthy();
  });

  it("resumes onboarding after partial save", async () => {
    const uniqueName = `Resume Flow ${Date.now()}`;
    const provision = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-unknown-token")
      .send({
        firstName: "Riley",
        workspaceName: uniqueName,
        email: "unknown@example.test",
      })
      .expect(201);

    const workspaceId = provision.body.workspace.id as string;
    const slug = provision.body.slug as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspaceId}/onboarding`)
      .set("Authorization", "Bearer valid-unknown-token")
      .set("x-flow-workspace-id", workspaceId)
      .send({
        currentStep: "operations",
        business: {
          businessName: uniqueName,
          country: "US",
          currency: "USD",
        },
      })
      .expect(200);

    const resumed = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/by-slug/${slug}`)
      .set("Authorization", "Bearer valid-unknown-token")
      .expect(200);

    expect(resumed.body.onboarding.currentStep).toBe("operations");
    expect(resumed.body.onboarding.business.businessName).toBe(uniqueName);
  });

  it("denies cross-tenant workspace access by slug and API", async () => {
    const uniqueName = `Tenant A ${Date.now()}`;
    const provision = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-unknown-token")
      .send({
        firstName: "Alex",
        workspaceName: uniqueName,
        email: "unknown@example.test",
      })
      .expect(201);

    const slug = provision.body.slug as string;
    const workspaceId = provision.body.workspace.id as string;

    const deniedBySlug = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/by-slug/${slug}`)
      .set("Authorization", "Bearer valid-bob-token");

    expect(deniedBySlug.status).toBe(403);
    expect(JSON.stringify(deniedBySlug.body)).not.toContain(uniqueName);

    const deniedTwin = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/twin`)
      .set("Authorization", "Bearer valid-bob-token")
      .set("x-flow-workspace-id", workspaceId);

    expect(deniedTwin.status).toBe(403);
    expect(JSON.stringify(deniedTwin.body)).not.toContain(uniqueName);
  });

  it("denies cross-tenant onboarding mutation", async () => {
    const uniqueName = `Tenant B ${Date.now()}`;
    const provision = await request(app.getHttpServer())
      .post("/api/v1/workspaces/provision")
      .set("Authorization", "Bearer valid-alice-token")
      .send({
        firstName: "Casey",
        workspaceName: uniqueName,
        email: "alice@example.test",
      })
      .expect(201);

    const workspaceId = provision.body.workspace.id as string;

    const denied = await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspaceId}/onboarding`)
      .set("Authorization", "Bearer valid-bob-token")
      .set("x-flow-workspace-id", workspaceId)
      .send({
        currentStep: "business",
        business: { businessName: "Intrusion Attempt" },
      });

    expect(denied.status).toBe(403);
    expect(JSON.stringify(denied.body)).not.toContain("Intrusion Attempt");
  });
});
