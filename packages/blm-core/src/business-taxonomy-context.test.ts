import { describe, expect, it } from "vitest";

import {
  blmExpertisePacksV1,
  blmIndustryNodesV1,
  blmReferenceArchitectureNodesV1,
  blmRoleExpertiseV1,
  blmUniversalCapabilitiesV1,
  industryIdsV1,
  universalCapabilityIdsV1,
} from "@flow/blm-contracts";

import {
  BusinessClassificationEngine,
  createGlobalIndustryReleaseV1,
  createReferenceBusinessArchitectureGraphV1,
  createUniversalCapabilityRegistryV1,
} from "./business-taxonomy-context.js";

describe("business taxonomy and architecture foundation", () => {
  it("builds a versioned taxonomy registry with required dimensions and provenance", () => {
    const release = createGlobalIndustryReleaseV1();

    expect(release.status).toBe("ACTIVE");
    expect(release.industryNodes).toHaveLength(5);
    expect(release.niches).toHaveLength(5);
    expect(
      release.sourceReferences.map((source) => source.sourceKey),
    ).toContain("BLM-TAXONOMY-V1");
    expect(release.fingerprint).toHaveLength(64);
    expect(release.industryNodes.every((node) => node.scope === "GLOBAL")).toBe(
      true,
    );
  });

  it("keeps reference architecture typed and separate from workspace and solution graphs", () => {
    const graph = createReferenceBusinessArchitectureGraphV1();

    expect(graph.graphType).toBe("REFERENCE_BUSINESS_ARCHITECTURE");
    expect(graph.nodes.map((node) => node.nodeType)).toEqual([
      "epistemic",
      "identity",
      "motivation",
      "value",
      "capability",
      "operating_model",
      "process",
      "decision_control",
      "information",
      "people_work",
      "application",
      "integration",
      "ai_skill",
      "execution",
    ]);
    expect(graph.nodes).toHaveLength(blmReferenceArchitectureNodesV1.length);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it("registers universal capabilities as business abilities, not software modules", () => {
    const registry = createUniversalCapabilityRegistryV1();

    expect(registry.capabilities).toHaveLength(
      blmUniversalCapabilitiesV1.length,
    );
    expect(
      registry.capabilities.find(
        (capability) =>
          capability.capabilityId === universalCapabilityIdsV1.financialControl,
      )?.description,
    ).toContain("not a software module");
    expect(registry.fingerprint).toHaveLength(64);
  });

  it("classifies the required industry examples", () => {
    const engine = new BusinessClassificationEngine();
    const examples = [
      {
        text: "A small digital agency sells client retainers and project work for campaign delivery.",
        industryId: industryIdsV1.digitalAgency,
      },
      {
        text: "A SaaS company has subscription software, trials, MRR, activation, and churn.",
        industryId: industryIdsV1.saas,
      },
      {
        text: "A manufacturer runs production work orders, raw material inventory, BOMs, and capacity planning.",
        industryId: industryIdsV1.manufacturing,
      },
      {
        text: "A retailer operates stores, POS, online stock, fulfillment, and returns.",
        industryId: industryIdsV1.retail,
      },
      {
        text: "A construction firm manages job sites, subcontractors, crews, estimates, and change orders.",
        industryId: industryIdsV1.construction,
      },
    ];

    for (const example of examples) {
      const result = engine.classify({ businessDescription: example.text });
      expect(result.status).toBe("CLASSIFIED");
      expect(result.candidates[0]!.industryId).toBe(example.industryId);
      expect(result.genericPriorAcceptedAsWorkspaceFact).toBe(false);
      expect(result.workspaceFactsAcceptedAsTruth).toBe(false);
    }
  });

  it("distinguishes same industry at different scales without changing industry", () => {
    const engine = new BusinessClassificationEngine();
    const smb = engine.classify({
      businessDescription:
        "A small digital agency has a small team, client retainers, campaigns, and project margin tracking.",
    });
    const enterprise = engine.classify({
      businessDescription:
        "An enterprise digital agency has many account teams, client retainers, campaign delivery, and project margin tracking.",
    });

    expect(smb.candidates[0]!.industryId).toBe(industryIdsV1.digitalAgency);
    expect(enterprise.candidates[0]!.industryId).toBe(
      industryIdsV1.digitalAgency,
    );
    expect(smb.candidates[0]!.scale).toBe("SMB");
    expect(enterprise.candidates[0]!.scale).toBe("ENTERPRISE");
  });

  it("keeps maturity and secondary activity as evidence instead of forced truth", () => {
    const engine = new BusinessClassificationEngine();
    const result = engine.classify({
      businessDescription:
        "A retailer with POS and stock also runs a small subscription box and is still early maturity.",
      userAnswers: ["The core business is retail commerce, not SaaS."],
    });

    expect(result.status).toBe("CLASSIFIED");
    expect(result.candidates[0]!.industryId).toBe(industryIdsV1.retail);
    expect(result.evidence.map((item) => item.source)).toContain("USER_ANSWER");
    expect(result.candidates[0]!.assumptions[0]).toContain("candidate");
  });

  it("returns ambiguous classification when signals genuinely overlap", () => {
    const engine = new BusinessClassificationEngine();
    const result = engine.classify({
      businessDescription:
        "A SaaS company sells subscription software with MRR and activation, and also has stock, online store fulfillment, and returns.",
    });

    expect(result.status).toBe("AMBIGUOUS");
    expect(result.candidates.length).toBeGreaterThan(1);
    expect(result.discoveryQuestions.length).toBeGreaterThan(0);
  });

  it("does not force classification with insufficient information", () => {
    const engine = new BusinessClassificationEngine();
    const result = engine.classify({
      businessDescription: "We help customers grow and improve operations.",
    });

    expect(result.status).toBe("INSUFFICIENT_INFORMATION");
    expect(result.candidates).toEqual([]);
    expect(result.missingInformation).toContain("industry");
  });

  it("compiles bounded taxonomy context and isolates expertise packs", () => {
    const engine = new BusinessClassificationEngine();
    const classification = engine.classify({
      businessDescription:
        "A manufacturer runs production work orders, BOMs, inventory, and capacity planning.",
    });
    const context = engine.compileContext({
      classification,
      budget: { maxExpertisePacks: 1, maxCapabilities: 3 },
    });

    expect(context.classificationStatus).toBe("CLASSIFIED");
    expect(context.relevantIndustryIds).toEqual([industryIdsV1.manufacturing]);
    expect(context.relevantExpertisePackIds).toHaveLength(1);
    expect(
      blmExpertisePacksV1.find(
        (pack) => pack.packId === context.relevantExpertisePackIds[0],
      )?.industryScopes,
    ).toEqual([industryIdsV1.manufacturing]);
    expect(context.relevantCapabilityIds.length).toBeLessThanOrEqual(3);
    expect(context.fingerprint).toHaveLength(64);
  });

  it("separates role expertise dimensions and authorization roles", () => {
    expect(blmRoleExpertiseV1.map((role) => role.kind)).toEqual(
      expect.arrayContaining([
        "occupation",
        "job_function",
        "workspace_role",
        "authorization_role",
        "decision_authority",
      ]),
    );
    expect(
      blmRoleExpertiseV1.find((role) => role.kind === "authorization_role")
        ?.authorizationBoundary,
    ).toContain("does not grant workspace authorization");
  });

  it("does not put workspace ownership on global prior records", () => {
    expect(
      blmIndustryNodesV1.every((node) => node.workspaceId === undefined),
    ).toBe(true);
    expect(
      blmUniversalCapabilitiesV1.every(
        (capability) => capability.workspaceId === undefined,
      ),
    ).toBe(true);
  });
});
