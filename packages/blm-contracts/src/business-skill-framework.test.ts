import { describe, expect, it } from "vitest";

import {
  businessPsychologySafetyBoundariesV1,
  businessSkillReleasesV1,
  creativeAgencyIndustryExpertisePackV1,
  erpBusinessCapabilitiesV1,
  groceryRetailIndustryExpertisePackV1,
  industryExpertisePacksV1,
  inventoryAvailabilityAnalysisSkillV1,
  lawFirmIndustryExpertisePackV1,
  projectMarginAnalysisSkillV1,
  universalBusinessExpertisePackV1,
  universalBusinessSkillPackV1,
} from "./business-skill-framework.js";
import { blmExpandedDomainIdsV1, logicId } from "./index.js";

describe("BLM extensibility skill contracts", () => {
  it("composes universal expertise over existing domain packs", () => {
    expect(universalBusinessExpertisePackV1.composedDomainIds).toContain(
      blmExpandedDomainIdsV1.financeAccounting,
    );
    expect(universalBusinessExpertisePackV1.composedDomainIds).toContain(
      blmExpandedDomainIdsV1.marketingGrowth,
    );
    expect(universalBusinessExpertisePackV1.composedDomainIds).toContain(
      blmExpandedDomainIdsV1.hrOrganizationalPsychology,
    );
    expect(universalBusinessExpertisePackV1.skillPackIds).toContain(
      universalBusinessSkillPackV1.packId,
    );
  });

  it("keeps industry expertise in governed packs instead of BLM Core forks", () => {
    expect(industryExpertisePacksV1.map((pack) => pack.packId)).toEqual([
      lawFirmIndustryExpertisePackV1.packId,
      creativeAgencyIndustryExpertisePackV1.packId,
      groceryRetailIndustryExpertisePackV1.packId,
    ]);
    expect(lawFirmIndustryExpertisePackV1.conceptIds).toContain(
      "flow.concept.legal-operations.matter",
    );
    expect(creativeAgencyIndustryExpertisePackV1.conceptIds).toContain(
      "flow.concept.agency.scope-creep",
    );
    expect(groceryRetailIndustryExpertisePackV1.conceptIds).toContain(
      "flow.concept.retail.sku",
    );
  });

  it("declares skills as governed manifests rather than executable code", () => {
    for (const skill of businessSkillReleasesV1) {
      expect(skill.arbitraryCodeAllowed).toBe(false);
      expect(skill.approvalStatus).toBe("APPROVED_BY_GOVERNANCE");
      expect(skill.fingerprint).toContain(`${skill.skillId}:${skill.version}`);
    }
    expect(projectMarginAnalysisSkillV1.requiredLogicIds).toContain(
      logicId("projects", "project-margin", 1),
    );
    expect(projectMarginAnalysisSkillV1.authority).toBe(
      "DETERMINISTIC_REQUIRED",
    );
  });

  it("models ERP capabilities as provider-neutral canonical capabilities", () => {
    expect(erpBusinessCapabilitiesV1.map((item) => item.capabilityId)).toEqual(
      expect.arrayContaining([
        "CUSTOMER_READ",
        "INVOICE_READ",
        "INVENTORY_READ",
        "PROJECT_READ",
        "TIMESHEET_READ",
      ]),
    );
    expect(
      inventoryAvailabilityAnalysisSkillV1.requiredERPCapabilities,
    ).toContainEqual(
      expect.objectContaining({ capabilityId: "INVENTORY_READ" }),
    );
  });

  it("keeps business psychology bounded to observed behavior and safe recommendations", () => {
    expect(businessPsychologySafetyBoundariesV1).toMatchObject({
      observedBehaviorOnly: true,
      prohibitedSensitiveInference: true,
      prohibitedManipulativePersuasion: true,
      requiresAlternativeExplanations: true,
      requiresUncertainty: true,
    });
  });
});
