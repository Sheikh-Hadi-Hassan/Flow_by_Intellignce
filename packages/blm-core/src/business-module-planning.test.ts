import { describe, expect, it } from "vitest";

import { blmModuleIdsV1, universalCapabilityIdsV1 } from "@flow/blm-contracts";

import {
  BusinessModuleRecommendationEngine,
  MinimumSufficientSolutionOptimizer,
  blmModulePlanningSafety,
  createBuildingBlockRegistryV1,
  createBusinessModuleRegistryV1,
  createDigitalAgency35PersonDemoInput,
} from "./business-module-planning.js";

describe("business module planning foundation", () => {
  it("creates reviewed module and building-block registries", () => {
    const modules = createBusinessModuleRegistryV1();
    const blocks = createBuildingBlockRegistryV1();

    expect(modules).toHaveLength(9);
    expect(blocks.length).toBeGreaterThan(12);
    expect(modules.every((module) => module.reviewStatus === "REVIEWED")).toBe(
      true,
    );
    expect(modules.every((module) => module.fingerprint.length === 64)).toBe(
      true,
    );
    expect([...new Set(blocks.map((block) => block.blockType))]).toEqual(
      expect.arrayContaining([
        "ENTITY",
        "DOCUMENT",
        "WORKFLOW",
        "STATE",
        "RULE",
        "ROLE",
        "PERMISSION",
        "METRIC",
        "LOGIC",
        "UI_BLOCK",
        "NOTIFICATION",
        "INTEGRATION",
        "SOR_POLICY",
      ]),
    );
  });

  it("recommends relevant modules for the required 35-person digital agency case", () => {
    const engine = new BusinessModuleRecommendationEngine();
    const result = engine.recommend(createDigitalAgency35PersonDemoInput());
    const moduleIds = result.recommendations.map(
      (recommendation) => recommendation.moduleId,
    );

    expect(moduleIds).toContain(blmModuleIdsV1.organizationFoundation);
    expect(moduleIds).toContain(blmModuleIdsV1.customerRevenue);
    expect(moduleIds).toContain(blmModuleIdsV1.quoteToCash);
    expect(moduleIds).toContain(blmModuleIdsV1.projectDelivery);
    expect(moduleIds).toContain(blmModuleIdsV1.cashCollection);
    expect(moduleIds).toContain(blmModuleIdsV1.financeOverlay);
    expect(moduleIds).not.toContain(blmModuleIdsV1.manufacturingOperations);
    expect(moduleIds).not.toContain(blmModuleIdsV1.inventoryControl);
    expect(moduleIds).not.toContain(blmModuleIdsV1.retailPosOverlay);
  });

  it("preserves QuickBooks as external authoritative system of record", () => {
    const engine = new BusinessModuleRecommendationEngine();
    const result = engine.recommend(createDigitalAgency35PersonDemoInput());
    const finance = result.recommendations.find(
      (recommendation) =>
        recommendation.moduleId === blmModuleIdsV1.financeOverlay,
    );

    expect(finance?.outcome).toBe("READ_ONLY_OVERLAY");
    expect(finance?.systemOfRecordPolicy).toBe("EXTERNAL_AUTHORITATIVE");
    expect(finance?.currentCoverage).toContain("QuickBooks accounting");
  });

  it("does not use industry lookup alone to recommend conditional modules", () => {
    const engine = new BusinessModuleRecommendationEngine();
    const result = engine.recommend({
      ...createDigitalAgency35PersonDemoInput(),
      capabilityGaps: [
        universalCapabilityIdsV1.productionPlanning,
        universalCapabilityIdsV1.inventoryAvailability,
      ],
      painSignals: ["scope creep"],
      operatingModelSignals: ["agency delivery", "retainer services"],
    });

    expect(result.excludedModuleIds).toContain(
      blmModuleIdsV1.manufacturingOperations,
    );
    expect(result.excludedModuleIds).toContain(blmModuleIdsV1.inventoryControl);
  });

  it("keeps recommendations dry-run and does not authorize side effects", () => {
    expect(blmModulePlanningSafety).toMatchObject({
      dryRunOnly: true,
      noAutomaticProductionInstall: true,
      noErpMutation: true,
      actionWallRequiredForSideEffects: true,
    });
  });

  it("creates a minimum sufficient building-block plan", () => {
    const engine = new BusinessModuleRecommendationEngine();
    const recommendations = engine.recommend(
      createDigitalAgency35PersonDemoInput(),
    );
    const optimizer = new MinimumSufficientSolutionOptimizer();
    const plan = optimizer.optimize({
      recommendations: recommendations.recommendations,
      requiredCapabilityIds: [
        universalCapabilityIdsV1.leadManagement,
        universalCapabilityIdsV1.quoteToCash,
        universalCapabilityIdsV1.projectDelivery,
        universalCapabilityIdsV1.financialControl,
      ],
      evidenceRefs: createDigitalAgency35PersonDemoInput().evidenceRefs,
    });

    expect(plan.dryRunOnly).toBe(true);
    expect(plan.modules.length).toBeLessThanOrEqual(6);
    expect(plan.approvedCapabilityIds).toEqual(
      expect.arrayContaining([
        universalCapabilityIdsV1.leadManagement,
        universalCapabilityIdsV1.quoteToCash,
        universalCapabilityIdsV1.projectDelivery,
        universalCapabilityIdsV1.financialControl,
      ]),
    );
    expect(plan.canonicalEntitiesAndRelationships.length).toBeGreaterThan(0);
    expect(plan.documents.length).toBeGreaterThan(0);
    expect(plan.workflowTemplatesAndParameters.length).toBeGreaterThan(0);
    expect(plan.systemOfRecordPolicies).toContainEqual(
      expect.objectContaining({
        moduleId: blmModuleIdsV1.financeOverlay,
        policy: "EXTERNAL_AUTHORITATIVE",
      }),
    );
    expect(plan.approvalRequirements).toContain(
      "Production module installation requires Action Wall approval.",
    );
    expect(plan.architectureFingerprint).toHaveLength(64);
  });

  it("rejects overbuild recommendations instead of recommending every module", () => {
    const engine = new BusinessModuleRecommendationEngine();
    const result = engine.recommend(createDigitalAgency35PersonDemoInput());

    expect(result.overbuildRejected).toBe(true);
    expect(result.recommendations.length).toBeLessThan(
      createBusinessModuleRegistryV1().length,
    );
  });
});
