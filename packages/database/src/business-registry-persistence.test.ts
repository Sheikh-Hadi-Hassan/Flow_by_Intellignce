import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { InMemoryBuildingBlockStore } from "./building-block-persistence.js";
import {
  NORTHSTAR_ORG_ID,
  REGISTRY_BUSINESS_BLOCK_ID,
} from "@flow/contracts";

describe("Business Registry persistence", () => {
  it("seeds one organisation twice without duplicating locations", async () => {
    const store = new InMemoryBuildingBlockStore();
    const first = await store.seedBusinessRegistry({
      workspaceId: "ws-northstar",
      workspaceSlug: "northstar-creative",
      actorId: "maya",
    });
    const second = await store.seedBusinessRegistry({
      workspaceId: "ws-northstar",
      workspaceSlug: "northstar-creative",
      actorId: "maya",
    });
    expect(first.organizationId).toBe(NORTHSTAR_ORG_ID);
    expect(second.organizationId).toBe(first.organizationId);
    expect(first.locations).toHaveLength(2);
    expect(second.locations).toHaveLength(2);
    expect(
      (await store.listEvents("ws-northstar")).filter(
        (row) => row.name === "business_profile.created",
      ),
    ).toHaveLength(1);
  });

  it("rejects production slugs and isolates workspaces", async () => {
    const store = new InMemoryBuildingBlockStore();
    await expect(
      store.seedBusinessRegistry({
        workspaceId: "ws-prod",
        workspaceSlug: "acme-production",
        actorId: "maya",
      }),
    ).rejects.toThrow("production workspaces");
    await store.seedBusinessRegistry({
      workspaceId: "ws-a",
      workspaceSlug: "demo-alpha",
      actorId: "maya",
    });
    expect(await store.getBusinessRegistry("ws-b")).toBeUndefined();
  });

  it("keeps validation-only from writing", async () => {
    const store = new InMemoryBuildingBlockStore();
    const preview = await store.seedBusinessRegistry({
      workspaceId: "ws-northstar",
      workspaceSlug: "northstar-creative",
      actorId: "maya",
      validateOnly: true,
    });
    expect(preview.organizationId).toBe(NORTHSTAR_ORG_ID);
    expect(await store.getBusinessRegistry("ws-northstar")).toBeUndefined();
  });
});

describe("Business Registry migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../supabase/migrations/20260907000100_business_registry.sql",
    ),
    "utf8",
  );

  it("extends organizations and does not create a second legal-entity table", () => {
    expect(migration).toContain("alter table public.organizations");
    expect(migration).toContain("alter table public.organization_locations");
    expect(migration).toContain("organization_compliance_records");
    expect(migration).toContain("references public.organizations(id, workspace_id)");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("Canonical organization identity cannot be deleted");
    expect(migration).not.toContain("create table public.legal_entities");
    expect(migration).not.toContain("create table public.companies");
    expect(migration).toContain("registry.business");
    expect(migration).toContain(REGISTRY_BUSINESS_BLOCK_ID);
  });
});
