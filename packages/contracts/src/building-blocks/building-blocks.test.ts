import { describe, expect, it } from "vitest";

import {
  BuildingBlockRegistry,
  CRM_CORE_BLOCK_ID,
  NORTHSTAR_COMPOSER_PROFILE,
  composeBuildingBlockRecommendations,
  crmCoreManifest,
  duplicateScore,
  northstarCrmSeed,
  parseCrmCoreConfiguration,
  rejectUnknownModelOutput,
} from "./index.js";
import { crmKnownModelVocabulary } from "./crm-core/config.js";

describe("building-block registry", () => {
  it("recommends, configures, and activates only after approval", () => {
    const registry = new BuildingBlockRegistry([crmCoreManifest]);
    const workspaceId = "workspace-alpha";
    registry.recommend(workspaceId, CRM_CORE_BLOCK_ID, "maya", {});
    registry.startConfigure(workspaceId, CRM_CORE_BLOCK_ID, "maya", {
      duplicateThreshold: 85,
    });
    registry.submitForApproval(workspaceId, CRM_CORE_BLOCK_ID, "maya", {
      duplicateThreshold: 85,
    });
    expect(registry.isActive(workspaceId, CRM_CORE_BLOCK_ID)).toBe(false);
    const active = registry.approve(workspaceId, CRM_CORE_BLOCK_ID, "maya");
    expect(active.status).toBe("active");
    expect(active.approvedBy).toBe("maya");
    expect(registry.listAudit(workspaceId).map((row) => row.action)).toContain(
      "building_block.active",
    );
  });

  it("keeps records when suspended and isolates workspaces", () => {
    const registry = new BuildingBlockRegistry([crmCoreManifest]);
    registry.recommend("alpha", CRM_CORE_BLOCK_ID, "maya", {});
    registry.startConfigure("alpha", CRM_CORE_BLOCK_ID, "maya", {});
    registry.submitForApproval("alpha", CRM_CORE_BLOCK_ID, "maya", {});
    registry.approve("alpha", CRM_CORE_BLOCK_ID, "maya");
    const suspended = registry.suspend("alpha", CRM_CORE_BLOCK_ID, "maya");
    expect(suspended.status).toBe("suspended");
    expect(suspended.configuration).toBeDefined();
    expect(registry.isActive("beta", CRM_CORE_BLOCK_ID)).toBe(false);
    expect(registry.listInstallations("beta")).toEqual([]);
  });

  it("rejects illegal lifecycle jumps", () => {
    const registry = new BuildingBlockRegistry([crmCoreManifest]);
    expect(() =>
      registry.approve("alpha", CRM_CORE_BLOCK_ID, "maya"),
    ).toThrow("Cannot move");
  });
});

describe("AI composer", () => {
  it("recommends CRM Core from Northstar discovery facts", () => {
    const rows = composeBuildingBlockRecommendations(
      NORTHSTAR_COMPOSER_PROFILE,
      [crmCoreManifest],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.blockId).toBe(CRM_CORE_BLOCK_ID);
    expect(rows[0]?.requiresHumanApproval).toBe(true);
    expect(rows[0]?.requirementEvidence.length).toBeGreaterThan(0);
  });

  it("rejects unknown blocks, stages, fields, and permissions from the model", () => {
    const known = {
      blockIds: new Set([CRM_CORE_BLOCK_ID]),
      ...crmKnownModelVocabulary(),
    };
    expect(() =>
      rejectUnknownModelOutput(
        [{ blockId: "crm.sales_pipeline", requiresHumanApproval: true, reason: "x", requirementEvidence: [], recommendedConfiguration: {}, dependencies: [], confidence: "high", risks: [], alternatives: [] }],
        known,
      ),
    ).toThrow("Unknown building block");
    expect(() =>
      composeBuildingBlockRecommendations(NORTHSTAR_COMPOSER_PROFILE, [crmCoreManifest], [
        {
          blockId: CRM_CORE_BLOCK_ID,
          reason: "ok",
          requirementEvidence: ["industry:agency"],
          recommendedConfiguration: { lifecycleStages: ["won"] },
          dependencies: [],
          confidence: "high",
          risks: [],
          alternatives: [],
          requiresHumanApproval: true,
        },
      ]),
    ).toThrow("Unknown lifecycle stage");
  });
});

describe("CRM Core configuration and seed", () => {
  it("validates configuration and keeps Mission Control named clients", () => {
    expect(() => parseCrmCoreConfiguration({ duplicateThreshold: 10 })).toThrow(
      "Duplicate threshold",
    );
    const seed = northstarCrmSeed();
    expect(seed.clients).toHaveLength(52);
    expect(seed.clients.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "Meridian Health",
        "Kestrel Foods",
        "Northwind Bank",
        "Acme Robotics",
      ]),
    );
    expect(new Set(seed.clients.map((row) => row.demoKey)).size).toBe(52);
    expect(seed.duplicates).toHaveLength(1);
    expect(duplicateScore("Brightline Media", "Brightline Media LLC")).toBeGreaterThan(
      80,
    );
  });

  it("is safe to rerun: demo keys are stable", () => {
    const first = northstarCrmSeed();
    const second = northstarCrmSeed();
    expect(first.clients.map((row) => row.id)).toEqual(
      second.clients.map((row) => row.id),
    );
  });
});
