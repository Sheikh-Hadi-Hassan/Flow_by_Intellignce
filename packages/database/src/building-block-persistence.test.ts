import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { InMemoryBuildingBlockStore } from "./building-block-persistence.js";
import { NORTHSTAR_COMPOSER_PROFILE } from "@flow/contracts";

describe("building block persistence", () => {
  it("seeds 52 clients once and keeps them after suspend", async () => {
    const store = new InMemoryBuildingBlockStore();
    await store.compose(NORTHSTAR_COMPOSER_PROFILE);
    await store.configure(
      NORTHSTAR_COMPOSER_PROFILE.workspaceId,
      "crm.core",
      "maya",
      {},
    );
    await store.submit(
      NORTHSTAR_COMPOSER_PROFILE.workspaceId,
      "crm.core",
      "maya",
      {},
    );
    await store.approve(
      NORTHSTAR_COMPOSER_PROFILE.workspaceId,
      "crm.core",
      "maya",
    );
    expect(
      await store.listClients(NORTHSTAR_COMPOSER_PROFILE.workspaceId),
    ).toHaveLength(52);
    expect(
      await store.seedIfActive(NORTHSTAR_COMPOSER_PROFILE.workspaceId),
    ).toBe(52);
    await store.suspend(
      NORTHSTAR_COMPOSER_PROFILE.workspaceId,
      "crm.core",
      "maya",
    );
    expect(
      await store.listClients(NORTHSTAR_COMPOSER_PROFILE.workspaceId),
    ).toEqual([]);
  });
});

describe("building blocks CRM Core migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../supabase/migrations/20260906000100_building_blocks_crm_core.sql",
    ),
    "utf8",
  );

  it("keeps workspace isolation and does not drop crm_clients", () => {
    expect(migration).toContain("workspace_building_block_installations");
    expect(migration).toContain("crm_interactions");
    expect(migration).toContain("crm_duplicate_candidates");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("building_block.approve");
    expect(migration).not.toContain("drop table public.crm_clients");
    expect(migration).toContain("requires_human_approval = true");
  });
});
