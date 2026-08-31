import { describe, expect, it } from "vitest";

import {
  authoritativeBusinessLogicStatuses,
  businessDataHierarchyV1,
  businessLogicScopePrecedence,
  publicTrainingEligibility,
  workspacePrivateEligibility,
  type SourceGovernanceManifest,
} from "./index.js";

describe("SMB business data and logic foundation contracts", () => {
  it("keeps unknown public source training eligibility blocked", () => {
    const source: SourceGovernanceManifest = {
      sourceId: "public.unknown-license",
      sourceName: "Unknown license source",
      publisher: "Unknown",
      sourceUrl: "https://example.invalid/source",
      retrievedAt: "2026-08-11T00:00:00.000Z",
      license: "UNKNOWN",
      licenseUrl: "https://example.invalid/license",
      attributionRequirement: "",
      commercialUseAllowed: true,
      derivativeUseAllowed: true,
      trainingUseStatus: "UNKNOWN",
      evaluationUseStatus: "ALLOWED",
      contextUseStatus: "ALLOWED",
      redistributionStatus: "REQUIRES_REVIEW",
      privacyRisk: "LOW",
      PIIRisk: "LOW",
      sourceTrustLevel: "MEDIUM",
      snapshotFingerprint: "fingerprint",
    };

    expect(publicTrainingEligibility(source).allowedForTraining).toBe(false);
    expect(publicTrainingEligibility(source).allowedForContext).toBe(true);
  });

  it("defaults workspace-private data away from global training", () => {
    expect(workspacePrivateEligibility()).toMatchObject({
      allowedForContext: true,
      allowedForEvaluation: false,
      allowedForTraining: false,
      allowedForCommercialTraining: false,
      requiresConsent: true,
      requiresAnonymization: true,
    });
  });

  it("defines deterministic business logic governance hierarchy", () => {
    expect(businessLogicScopePrecedence).toEqual([
      "WORKSPACE",
      "BUSINESS_TYPE",
      "JURISDICTION",
      "INDUSTRY",
      "UNIVERSAL",
    ]);
    expect(authoritativeBusinessLogicStatuses).toEqual([
      "APPROVED",
      "PUBLISHED",
    ]);
  });

  it("defines SMB hierarchy without UI or provider assumptions", () => {
    expect(businessDataHierarchyV1.root).toBe("Universal Business Core");
    expect(
      businessDataHierarchyV1.industries.flatMap((item) => item.children),
    ).toEqual(
      expect.arrayContaining([
        "Grocery",
        "Marketing Agency",
        "Consulting",
        "SaaS",
        "Distribution",
        "Manufacturing",
      ]),
    );
  });
});
