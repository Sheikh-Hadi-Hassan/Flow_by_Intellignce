import { describe, expect, it } from "vitest";

import { universalCapabilityIdsV1 } from "@flow/blm-contracts";

import {
  BLMBusinessContextCompiler,
  BLMKnowledgeRetriever,
  blmRuntimeKnowledgeOperationalChecks,
  createBLMKnowledgeReleaseManifestV1,
  runBLMRuntimeEvaluationSuiteV1,
} from "./blm-runtime-knowledge.js";

describe("BLM runtime knowledge context compiler", () => {
  it("compiles bounded customer context without full source documents", () => {
    const context = new BLMBusinessContextCompiler().compile({
      request: digitalAgencyRequest("CUSTOMER"),
      budget: { maxContextBytes: 16000, maxPacks: 2, maxModuleRecords: 6 },
    });

    expect(context.workspaceContext.accessMode).toBe("CUSTOMER");
    expect(context.estimatedBytes).toBeLessThanOrEqual(16000);
    expect(context.contextFingerprint).toHaveLength(64);
    expect(context.relevantCapabilities.length).toBeGreaterThan(0);
    expect(context.relevantExpertisePacks.length).toBeLessThanOrEqual(2);
    expect(
      context.sourceRefs.every(
        (source) => !source.repositoryPath.endsWith(".docx"),
      ),
    ).toBe(true);
  });

  it("uses structured retrieval and precedence before model priors", () => {
    const retriever = new BLMKnowledgeRetriever();
    const result = retriever.retrieve({
      request: digitalAgencyRequest("CUSTOMER"),
    });

    expect(result.sourceRefs.length).toBeGreaterThan(0);
    expect(result.sourceRefs[0]?.precedence).not.toBe("MODEL_PRIOR");
    expect(result.sourceRefs.map((source) => source.sourceKey)).toContain(
      "BLM-TAXONOMY-V1",
    );
  });

  it("exposes knowledge gaps for live regulation and missing facts", () => {
    const context = new BLMBusinessContextCompiler().compile({
      request: {
        ...digitalAgencyRequest("CUSTOMER"),
        text: "What is the current regulated tax requirement today?",
        authorizedWorkspaceFacts: [],
      },
    });

    expect(
      context.currentEvidenceRequirements.map((gap) => gap.reason),
    ).toEqual(
      expect.arrayContaining([
        "FRESHNESS_ESCALATION_REQUIRED",
        "MISSING_WORKSPACE_FACT",
      ]),
    );
  });

  it("blocks synthetic and Flow-internal sources in customer context", () => {
    const context = new BLMBusinessContextCompiler().compile({
      request: digitalAgencyRequest("CUSTOMER"),
    });

    expect(
      context.sourceRefs.some(
        (source) => source.sourceKey === "FLOW-EVAL-AGENCY-DEMO-BLUEPRINT",
      ),
    ).toBe(false);
    expect(
      context.sourceRefs.some((source) =>
        source.sourceKey.startsWith("FLOW-INTERNAL"),
      ),
    ).toBe(false);
  });

  it("allows synthetic evaluation only in evaluation/demo mode", () => {
    const context = new BLMBusinessContextCompiler().compile({
      request: digitalAgencyRequest("EVALUATION_DEMO"),
    });

    expect(
      context.sourceRefs.some(
        (source) => source.sourceKey === "FLOW-EVAL-AGENCY-DEMO-BLUEPRINT",
      ),
    ).toBe(true);
  });

  it("allows investor/internal sources only in Flow internal mode", () => {
    const customer = new BLMBusinessContextCompiler().compile({
      request: digitalAgencyRequest("CUSTOMER"),
    });
    const internal = new BLMBusinessContextCompiler().compile({
      request: digitalAgencyRequest("FLOW_INTERNAL"),
    });

    expect(
      customer.sourceRefs.some((source) =>
        source.sourceKey.startsWith("FLOW-INTERNAL"),
      ),
    ).toBe(false);
    expect(
      internal.sourceRefs.some((source) =>
        source.sourceKey.startsWith("FLOW-INTERNAL"),
      ),
    ).toBe(true);
  });

  it("preserves module recommendation and external ERP SoR in runtime context", () => {
    const context = new BLMBusinessContextCompiler().compile({
      request: digitalAgencyRequest("CUSTOMER"),
    });

    expect(context.relevantModuleRecommendations.length).toBeGreaterThan(0);
    expect(context.buildingBlockPlan?.systemOfRecordPolicies).toContainEqual(
      expect.objectContaining({ policy: "EXTERNAL_AUTHORITATIVE" }),
    );
    expect(context.authorityBoundaries).toContain(
      "External systems remain authoritative where SoR policy says so.",
    );
  });

  it("creates reproducible knowledge release metadata", () => {
    const release = createBLMKnowledgeReleaseManifestV1();

    expect(release.reproducible).toBe(true);
    expect(release.sourceCorpus).toBe(
      "knowledge/blm/manifests/sources.manifest.json",
    );
    expect(Object.keys(release.fingerprints)).toEqual(
      expect.arrayContaining([
        "sourceCorpus",
        "taxonomy",
        "capabilities",
        "expertisePacks",
        "moduleRegistry",
        "reasoningCorpus",
      ]),
    );
  });

  it("passes the required runtime evaluation families", () => {
    const result = runBLMRuntimeEvaluationSuiteV1();

    expect(result.failed).toBe(0);
    expect(result.caseCount).toBeGreaterThanOrEqual(20);
    expect(result.moduleIntelligence.p0MissRate).toBe(0);
    expect(result.moduleIntelligence.overbuildRate).toBe(0);
    expect(result.moduleIntelligence.sorIntegrity).toBe(1);
    expect(result.criticalFailures).toEqual([]);
  });

  it("records operational database checks as non-mutating requirements", () => {
    expect(blmRuntimeKnowledgeOperationalChecks).toMatchObject({
      workspaceIsolationRequired: true,
      sourceLineageRequired: true,
      syntheticIsolationRequired: true,
      internalContextIsolationRequired: true,
      databaseMutationPerformed: false,
      productionVerificationPerformed: false,
    });
  });
});

function digitalAgencyRequest(
  accessMode: "CUSTOMER" | "EVALUATION_DEMO" | "FLOW_INTERNAL",
) {
  return {
    requestId: `runtime-test-${accessMode.toLowerCase()}`,
    workspaceId: "workspace-runtime-test",
    userId: "user-runtime-test",
    text: "35-person digital agency B2B project and retainer business using QuickBooks accounting and ClickUp delivery with cash collection pain and scope creep.",
    accessMode,
    authorizedWorkspaceFacts: [
      "35-person digital agency",
      "QuickBooks accounting remains finance system of record",
      "ClickUp delivery is used for projects",
    ],
    userAssertions: ["B2B project and retainer revenue model"],
    currentEvidenceRefs: ["evidence:quickbooks", "evidence:clickup"],
    requestedSemanticIds: [],
    requestedCapabilityIds: [
      universalCapabilityIdsV1.leadManagement,
      universalCapabilityIdsV1.quoteToCash,
      universalCapabilityIdsV1.projectDelivery,
      universalCapabilityIdsV1.financialControl,
    ],
  };
}
