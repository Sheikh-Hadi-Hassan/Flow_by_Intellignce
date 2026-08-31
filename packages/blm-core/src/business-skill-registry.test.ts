import { describe, expect, it } from "vitest";

import {
  creativeAgencyIndustryExpertisePackV1,
  erpBusinessCapabilitiesV1,
  groceryRetailIndustryExpertisePackV1,
  lawFirmIndustryExpertisePackV1,
  logicId,
  projectMarginAnalysisSkillV1,
  toSemanticId,
  type SkillRelease,
} from "@flow/blm-contracts";

import {
  BusinessSkillRegistry,
  FakeExternalERPAdapterCapabilityRegistry,
  workspaceSkillInstallation,
} from "./business-skill-registry.js";

describe("BusinessSkillRegistry", () => {
  it("resolves only installed authoritative skill releases", () => {
    const registry = new BusinessSkillRegistry([
      { ...projectMarginAnalysisSkillV1, status: "DRAFT" },
    ]);
    const installation = workspaceSkillInstallation({
      workspaceId: "workspace-skill",
      skillId: projectMarginAnalysisSkillV1.skillId,
      skillVersion: projectMarginAnalysisSkillV1.version,
      installedBy: "owner",
    });

    expect(
      registry.resolve({
        skillId: projectMarginAnalysisSkillV1.skillId,
        context: {
          workspaceId: "workspace-skill",
          industry: "Creative Agency",
          businessType: "Services",
          asOf: "2026-08-12",
          installedSkills: [installation],
          availableLogicIds: [logicId("projects", "project-margin", 1)],
          availableERPCapabilities: ["PROJECT_READ"],
          actorPermissionIds: ["business.calculation.execute"],
        },
      }).status,
    ).toBe("MISSING");
  });

  it("validates logic, permission, and ERP capability compatibility", () => {
    const registry = new BusinessSkillRegistry();
    expect(
      registry.compatibility(projectMarginAnalysisSkillV1, {
        businessType: "Services",
        industry: "Creative Agency",
        availableLogicIds: [logicId("projects", "project-margin", 1)],
        availableERPCapabilities: ["PROJECT_READ"],
        actorPermissionIds: ["business.calculation.execute"],
      }).status,
    ).toBe("COMPATIBLE");

    expect(
      registry.compatibility(projectMarginAnalysisSkillV1, {
        businessType: "Services",
        industry: "Creative Agency",
        availableLogicIds: [logicId("projects", "project-margin", 1)],
        availableERPCapabilities: [],
        actorPermissionIds: ["business.calculation.execute"],
      }).status,
    ).toBe("MISSING_CAPABILITY");

    expect(
      registry.compatibility(projectMarginAnalysisSkillV1, {
        businessType: "Services",
        industry: "Creative Agency",
        availableLogicIds: [logicId("projects", "project-margin", 1)],
        availableERPCapabilities: ["PROJECT_READ"],
        actorPermissionIds: [],
      }).status,
    ).toBe("NOT_AUTHORIZED");
  });

  it("checks dependency graphs for cycles and missing ERP capabilities", () => {
    const first = cyclicSkill(
      "a",
      toSemanticId("flow.capability.skill.cycle-b"),
    );
    const second = cyclicSkill(
      "b",
      toSemanticId("flow.capability.skill.cycle-a"),
    );
    const registry = new BusinessSkillRegistry([first, second]);

    expect(
      registry.dependencyGraph({
        rootSkillIds: [first.skillId],
        availableERPCapabilities: ["PROJECT_READ"],
        maxNodes: 5,
      }).status,
    ).toBe("DEPENDENCY_CYCLE");

    expect(
      new BusinessSkillRegistry().dependencyGraph({
        rootSkillIds: [projectMarginAnalysisSkillV1.skillId],
        availableERPCapabilities: [],
        maxNodes: 5,
      }).status,
    ).toBe("MISSING_ERP_CAPABILITY");
  });

  it("keeps AI proposals and amendments in draft-only states", () => {
    const registry = new BusinessSkillRegistry();
    const draft = registry.proposeDraft({
      name: "Proposed billing exception review",
      purpose: "Review billing exceptions without executing actions.",
      industry: "Services",
      businessType: "Services",
      requiredInputs: ["invoiceId"],
      expectedOutputs: ["draftRecommendation"],
      requiredConcepts: [toSemanticId("flow.concept.finance.invoice")],
      requiredLogic: [],
      requiredPolicies: ["billing.policy.read"],
      requiredERPCapabilities: ["INVOICE_READ"],
      evaluationCases: [],
    });
    const amendment = registry.amendPublished({
      baseSkillId: projectMarginAnalysisSkillV1.skillId,
      baseVersion: projectMarginAnalysisSkillV1.version,
      changeReason: "Add another deterministic evaluation case.",
      changedDependencies: [],
      changedLogicReferences: [],
      newEvaluationCases: [],
    });

    expect(draft.authority).toBe("DRAFT_ONLY");
    expect(amendment.status).toBe("DRAFT");
    expect(amendment.draftVersion).toBe("2");
  });

  it("supports the same skill against Flow-native and fake ERP capability sets", () => {
    const fakeErp = new FakeExternalERPAdapterCapabilityRegistry({
      adapterId: "fake-project-erp",
      provider: "CUSTOM",
      capabilityIds: ["PROJECT_READ"],
      canonicalMappingVersion: "1",
    });
    const registry = new BusinessSkillRegistry();

    for (const capabilityIds of [
      erpBusinessCapabilitiesV1
        .filter((capability) => capability.capabilityId === "PROJECT_READ")
        .map((capability) => capability.capabilityId),
      fakeErp.list(),
    ]) {
      expect(
        registry.compatibility(projectMarginAnalysisSkillV1, {
          businessType: "Services",
          industry: "Creative Agency",
          availableLogicIds: [logicId("projects", "project-margin", 1)],
          availableERPCapabilities: capabilityIds,
          actorPermissionIds: ["business.calculation.execute"],
        }).status,
      ).toBe("COMPATIBLE");
    }
  });

  it("reports deterministic missing information before calculation handoff", () => {
    const registry = new BusinessSkillRegistry();
    expect(
      registry.missingInformation({
        skill: projectMarginAnalysisSkillV1,
        fields: { projectRevenue: "1000.00" },
      }),
    ).toEqual(["projectCost"]);
  });

  it("registers proof industry expertise packs without core-specific branching", () => {
    expect(lawFirmIndustryExpertisePackV1.skillIds).toContain(
      projectMarginAnalysisSkillV1.skillId,
    );
    expect(creativeAgencyIndustryExpertisePackV1.skillIds).toContain(
      projectMarginAnalysisSkillV1.skillId,
    );
    expect(
      groceryRetailIndustryExpertisePackV1.skillIds.length,
    ).toBeGreaterThan(0);
  });
});

function cyclicSkill(
  suffix: string,
  dependency: SkillRelease["skillId"],
): SkillRelease {
  return {
    ...projectMarginAnalysisSkillV1,
    skillId: toSemanticId(`flow.capability.skill.cycle-${suffix}`),
    name: `Cycle ${suffix}`,
    dependencies: [
      {
        skillId: dependency,
        versionRange: "1",
        required: true,
      },
    ],
    fingerprint: `cycle-${suffix}`,
  };
}
