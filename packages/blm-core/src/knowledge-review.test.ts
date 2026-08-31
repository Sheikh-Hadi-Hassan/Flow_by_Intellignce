import { describe, expect, it } from "vitest";

import { blmDomainPackIdsV1, blmSourceManifestV1 } from "@flow/blm-contracts";
import {
  ComponentRegistry,
  customerManagementComponentId,
} from "@flow/blm-contracts";
import { toSemanticId } from "@flow/blm-contracts";

import {
  blmKnowledgeAcquisitionMappingsV1,
  createKnowledgeRelease,
  createSourceSnapshot,
  KnowledgeAcquisitionPipeline,
  MantleProofSourceAdapter,
  runBlmKnowledgeAcquisitionProofV1,
  type ExternalSemanticMapping,
} from "./knowledge-acquisition.js";
import {
  KnowledgeReviewError,
  KnowledgeReviewService,
  InMemoryKnowledgeReviewRepository,
  analyzeKnowledgeImpact,
  blmKnowledgeReviewPermissions,
  canPublishKnowledge,
  createKnowledgeReleaseCandidate,
  createMappingChangedReviewFromReleases,
  createReviewItemForMapping,
  createReviewedBusinessExpertiseRegistry,
  generateReviewItemsForSourceUpdate,
  generateReviewItemsFromAcquisition,
  type KnowledgeReviewerContext,
} from "./knowledge-review.js";

const reviewedAt = "2026-08-11T10:00:00.000Z";

function reviewer(
  permissions: readonly string[] = [
    blmKnowledgeReviewPermissions.approve,
    blmKnowledgeReviewPermissions.publish,
    blmKnowledgeReviewPermissions.reject,
  ],
): KnowledgeReviewerContext {
  return {
    reviewerId: "platform-reviewer-1",
    reviewerRole: "platform semantic reviewer",
    authority: "HUMAN",
    permissionIds: permissions,
    reviewedAt,
  };
}

function source(id: string) {
  const found = blmSourceManifestV1.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Missing source ${id}`);
  }
  return found;
}

describe("BLM Human Review and Knowledge Approval Workflow v1", () => {
  it("creates review items and enforces review lifecycle transitions", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
        sourceReferences: result.snapshots,
        reason: "CANONICALIZATION_REQUIRED",
        createdAt: reviewedAt,
      }),
    );

    expect(item.status).toBe("OPEN");
    service.applyDecision({
      reviewId: item.reviewId,
      decisionType: "APPROVE_MAPPING",
      reviewer: reviewer(),
      reason:
        "UBL Invoice maps to Flow Invoice as a governed document mapping.",
    });
    expect(service.getReviewItem(item.reviewId).status).toBe("APPROVED");
    expect(() =>
      service.applyDecision({
        reviewId: item.reviewId,
        decisionType: "DEFER_DECISION",
        reviewer: reviewer(),
        reason: "Invalid terminal transition.",
      }),
    ).toThrow(KnowledgeReviewError);
  });

  it("automatically creates review items for ambiguous mappings and conflicts", () => {
    const ambiguousMapping: ExternalSemanticMapping = {
      ...blmKnowledgeAcquisitionMappingsV1[0]!,
      mappingId: "ambiguous-party",
      canonicalSemanticId: toSemanticId("flow.concept.crm.customer"),
    };
    const result = runBlmKnowledgeAcquisitionProofV1();
    const ambiguousRun = new KnowledgeAcquisitionPipeline({
      sources: blmSourceManifestV1,
      adapters: [new MantleProofSourceAdapter()],
      mappings: [blmKnowledgeAcquisitionMappingsV1[0]!, ambiguousMapping],
    }).run({
      sourceIds: ["moqui.mantle-udm"],
      mappingVersion: "test",
      releaseId: "ambiguous",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });
    const reviews = generateReviewItemsFromAcquisition({
      result: ambiguousRun,
      createdAt: reviewedAt,
    });

    expect(result.report.conflicts).toHaveLength(0);
    expect(reviews.map((item) => item.reviewReason)).toEqual(
      expect.arrayContaining(["AMBIGUOUS_MAPPING", "CONFLICTING_DEFINITION"]),
    );
  });

  it("automatically creates review for review-required license blocks", () => {
    const acquisition = new KnowledgeAcquisitionPipeline({
      sources: blmSourceManifestV1,
      adapters: [],
      mappings: [],
    }).run({
      sourceIds: ["xbrl.global-ledger"],
      mappingVersion: "test",
      releaseId: "license-block",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });
    const reviews = generateReviewItemsFromAcquisition({
      result: acquisition,
      createdAt: reviewedAt,
    });

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      reviewReason: "LICENSE_REVIEW_REQUIRED",
      priority: "HIGH",
    });
  });

  it("enforces reviewer authorization and rejects AI approval authority", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
        sourceReferences: result.snapshots,
        reason: "CANONICALIZATION_REQUIRED",
        createdAt: reviewedAt,
      }),
    );

    expect(() =>
      service.applyDecision({
        reviewId: item.reviewId,
        decisionType: "APPROVE_MAPPING",
        reviewer: reviewer([]),
        reason: "No permission.",
      }),
    ).toThrow(/blm.knowledge.approve/);
    expect(() =>
      service.applyDecision({
        reviewId: item.reviewId,
        decisionType: "APPROVE_MAPPING",
        reviewer: {
          ...reviewer(),
          authority: "AI_AGENT",
        },
        reason: "AI cannot approve.",
      }),
    ).toThrow(/Only human reviewers/);
  });

  it("records immutable decision history and audit events", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
        sourceReferences: result.snapshots,
        reason: "CANONICALIZATION_REQUIRED",
        createdAt: reviewedAt,
      }),
    );
    const decision = service.applyDecision({
      reviewId: item.reviewId,
      decisionType: "APPROVE_MAPPING",
      reviewer: reviewer(),
      reason: "Approved with source evidence.",
      affectedKnowledgeReleaseId: result.release.releaseId,
    });

    expect(service.listDecisionHistory(item.reviewId)).toEqual([decision]);
    expect(service.listAuditEvents()).toHaveLength(1);
    expect(service.listAuditEvents()[0]).toMatchObject({
      resourceType: "blm.knowledge.review",
      action: "APPROVE_MAPPING",
      resultStatus: "EXECUTED",
    });
  });

  it("blocks publication for rejected review decisions", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
        sourceReferences: result.snapshots,
        reason: "CANONICALIZATION_REQUIRED",
        createdAt: reviewedAt,
      }),
    );
    service.applyDecision({
      reviewId: item.reviewId,
      decisionType: "REJECT_MAPPING",
      reviewer: reviewer(),
      reason: "Reject proof mapping.",
    });

    expect(
      canPublishKnowledge({
        reviewItem: service.getReviewItem(item.reviewId),
        decisionHistory: service.listDecisionHistory(item.reviewId),
        validationPassed: true,
      }).canPublish,
    ).toBe(false);
  });

  it("keeps semantic approval separate from license approval", () => {
    const blockedSnapshot = createSourceSnapshot(source("xbrl.global-ledger"));
    const blockedMapping: ExternalSemanticMapping = {
      ...blmKnowledgeAcquisitionMappingsV1[18]!,
      mappingId: "xbrl-blocked",
      sourceId: "xbrl.global-ledger",
      externalConceptId: "xbrl-gl:entryDetail",
      sourceVersion: blockedSnapshot.sourceVersion,
    };
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blockedMapping,
        sourceReferences: [blockedSnapshot],
        reason: "LICENSE_REVIEW_REQUIRED",
        createdAt: reviewedAt,
        priority: "HIGH",
      }),
    );
    service.applyDecision({
      reviewId: item.reviewId,
      decisionType: "APPROVE_MAPPING",
      reviewer: reviewer(),
      reason: "Semantically valid but license blocked.",
    });

    const decision = canPublishKnowledge({
      reviewItem: service.getReviewItem(item.reviewId),
      decisionHistory: service.listDecisionHistory(item.reviewId),
      validationPassed: true,
    });

    expect(decision.gates.mappingApproved).toBe(true);
    expect(decision.gates.licenseApproved).toBe(false);
    expect(decision.canPublish).toBe(false);
  });

  it("allows publication only when license, mapping, validation, review, provenance, and canonical ID gates pass", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
        sourceReferences: [createSourceSnapshot(source("oasis.ubl-2.4"))],
        reason: "CANONICALIZATION_REQUIRED",
        createdAt: reviewedAt,
      }),
    );
    service.applyDecision({
      reviewId: item.reviewId,
      decisionType: "APPROVE_MAPPING",
      reviewer: reviewer(),
      reason: "Approved UBL invoice mapping.",
    });

    const eligibility = canPublishKnowledge({
      reviewItem: service.getReviewItem(item.reviewId),
      decisionHistory: service.listDecisionHistory(item.reviewId),
      validationPassed: true,
    });

    expect(result.release.releaseId).toBe("flow.blm.knowledge-release.1");
    expect(eligibility).toMatchObject({
      canPublish: true,
      blockedReasons: [],
    });
  });

  it("preserves mapping revision history", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
        sourceReferences: result.snapshots,
        reason: "CANONICALIZATION_REQUIRED",
        createdAt: reviewedAt,
      }),
    );
    const revisedMapping: ExternalSemanticMapping = {
      ...blmKnowledgeAcquisitionMappingsV1[18]!,
      mappingId: "revised-ubl-invoice",
      relationship: "EXACT",
      mappingVersion: "reviewed-v1",
    };
    service.applyDecision({
      reviewId: item.reviewId,
      decisionType: "CHANGE_MAPPING",
      reviewer: reviewer(),
      reason: "Reviewer tightened mapping relationship.",
      revisedMapping,
    });

    expect(service.listMappingRevisions(item.reviewId)).toEqual([
      expect.objectContaining({
        previousMapping: blmKnowledgeAcquisitionMappingsV1[18],
        revisedMapping,
      }),
    ]);
  });

  it("review evidence includes source, license, mapping, provenance, and release context", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
        sourceReferences: [createSourceSnapshot(source("oasis.ubl-2.4"))],
        reason: "CANONICALIZATION_REQUIRED",
        createdAt: reviewedAt,
      }),
    );
    const evidence = service.getEvidenceBundle({
      reviewId: item.reviewId,
      affectedKnowledgeReleaseIds: [result.release.releaseId],
    });

    expect(evidence).toMatchObject({
      flowCanonicalConcept: toSemanticId("flow.concept.finance.invoice"),
      externalSourceConcept: "UBL-2.4:Invoice",
      licenseStatus: "VERIFIED",
      mappingType: "RELATED",
      affectedKnowledgeReleaseIds: ["flow.blm.knowledge-release.1"],
    });
  });

  it("keeps global review tenant-free and workspace review tenant-scoped", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const globalItem = createReviewItemForMapping({
      mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
      sourceReferences: result.snapshots,
      reason: "CANONICALIZATION_REQUIRED",
      createdAt: reviewedAt,
    });

    expect(globalItem.workspaceId).toBeUndefined();
    expect(() =>
      service.createReviewItem({
        ...globalItem,
        workspaceId: "workspace-alpha",
      }),
    ).toThrow(/Global BLM review/);
    expect(() =>
      service.createReviewItem({
        ...globalItem,
        reviewId: "workspace-review",
        scopeType: "WORKSPACE_KNOWLEDGE_REVIEW",
        workspaceId: "workspace-alpha",
      }),
    ).not.toThrow();
  });

  it("release candidates exclude unresolved knowledge and only affect new candidates", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
        sourceReferences: [createSourceSnapshot(source("oasis.ubl-2.4"))],
        reason: "CANONICALIZATION_REQUIRED",
        createdAt: reviewedAt,
      }),
    );
    const blockedCandidate = createKnowledgeReleaseCandidate({
      candidateId: "candidate-blocked",
      createdAt: reviewedAt,
      baseRelease: result.release,
      reviewItems: [item],
      decisionHistory: [],
      publishedItems: result.publishedItems,
    });

    expect(blockedCandidate).toMatchObject({
      readiness: "BLOCKED",
      excludedReviewIds: [item.reviewId],
    });
    expect(result.release.releaseId).toBe("flow.blm.knowledge-release.1");

    service.applyDecision({
      reviewId: item.reviewId,
      decisionType: "APPROVE_MAPPING",
      reviewer: reviewer(),
      reason: "Approved.",
    });
    const readyCandidate = createKnowledgeReleaseCandidate({
      candidateId: "candidate-ready",
      createdAt: reviewedAt,
      baseRelease: result.release,
      reviewItems: [service.getReviewItem(item.reviewId)],
      decisionHistory: service.listDecisionHistory(item.reviewId),
      publishedItems: result.publishedItems,
    });

    expect(readyCandidate.readiness).toBe("READY");
    expect(readyCandidate.release?.releaseId).toBe(
      "flow.blm.knowledge-release.1.candidate",
    );
  });

  it("source version updates and mapping changes create new review items without mutating old release", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const previous = result.snapshots[0]!;
    const next = {
      ...previous,
      commitSha: "1111111111111111111111111111111111111111",
      contentFingerprint: "changed-source-fingerprint",
    };
    const sourceReviews = generateReviewItemsForSourceUpdate({
      previous,
      next,
      affectedSemanticIds: [toSemanticId("flow.concept.universal.party")],
      createdAt: reviewedAt,
    });
    const changedRelease = createKnowledgeRelease({
      ...result.release,
      releaseId: "flow.blm.knowledge-release.2",
      version: "1.0.1",
      publishedItems: [
        {
          ...result.publishedItems[0]!,
          externalMappings: [
            {
              ...result.publishedItems[0]!.externalMappings[0]!,
              relationship: "CLOSE",
            },
          ],
          fingerprint: "changed-mapping-fingerprint",
        },
        ...result.publishedItems.slice(1),
      ],
    });
    const mappingReviews = createMappingChangedReviewFromReleases({
      previousRelease: result.release,
      nextRelease: changedRelease,
      sourceReferences: result.snapshots,
      createdAt: reviewedAt,
    });

    expect(sourceReviews[0]).toMatchObject({
      reviewReason: "SOURCE_VERSION_CHANGED",
    });
    expect(mappingReviews[0]).toMatchObject({
      reviewReason: "MAPPING_CHANGED",
    });
    expect(result.release.fingerprint).not.toBe(changedRelease.fingerprint);
    expect(result.release.releaseId).toBe("flow.blm.knowledge-release.1");
  });

  it("impact reports identify affected BLM artifacts", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const impact = analyzeKnowledgeImpact(
      toSemanticId("flow.concept.finance.invoice"),
      result.enrichedDomainPacks,
    );

    expect(impact.domainPackIds).toContain(
      blmDomainPackIdsV1.financeAccounting,
    );
    expect(impact.documentIds).toContain(
      toSemanticId("flow.contract.document.finance.invoice"),
    );
    expect(impact.ruleIds).toContain(
      toSemanticId("flow.decision.rule.finance.invoice-period-open"),
    );
  });

  it("can create a reviewed Business Expertise Registry only from publishable reviews", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const service = new KnowledgeReviewService(
      new InMemoryKnowledgeReviewRepository(),
    );
    const item = service.createReviewItem(
      createReviewItemForMapping({
        mapping: blmKnowledgeAcquisitionMappingsV1[18]!,
        sourceReferences: [createSourceSnapshot(source("oasis.ubl-2.4"))],
        reason: "CANONICALIZATION_REQUIRED",
        createdAt: reviewedAt,
      }),
    );
    service.applyDecision({
      reviewId: item.reviewId,
      decisionType: "APPROVE_MAPPING",
      reviewer: reviewer(),
      reason: "Approved.",
    });

    const registry = createReviewedBusinessExpertiseRegistry({
      reviewItems: [service.getReviewItem(item.reviewId)],
      decisionHistory: service.listDecisionHistory(item.reviewId),
      domainPacks: result.enrichedDomainPacks,
    });

    expect(registry.listDomainPacks()).toHaveLength(4);
  });

  it("exposes Action Wall permission metadata for privileged review mutations", () => {
    expect(blmKnowledgeReviewPermissions).toEqual({
      review: "blm.knowledge.review",
      approve: "blm.knowledge.approve",
      reject: "blm.knowledge.reject",
      publish: "blm.knowledge.publish",
    });
  });

  it("does not add LLM, AI approval, or Semantica implementation dependencies", async () => {
    const sourceText = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./knowledge-review.ts", import.meta.url), "utf8"),
    );

    expect(sourceText).not.toContain('from "semantica"');
    expect(sourceText).not.toContain("ContextGraph");
    expect(sourceText).not.toContain("OpenAI");
    expect(sourceText).not.toContain("Anthropic");
    expect(sourceText).not.toContain("fetch(");
  });

  it("preserves acquisition, Component Registry, and domain registry behavior", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const componentRegistry = new ComponentRegistry({
      trustedModules: [],
      knownCapabilityIds: [
        toSemanticId("flow.capability.crm.customer-management"),
      ],
      components: [
        {
          semanticId: customerManagementComponentId,
          version: "1.0.0",
          displayName: "Customer Management",
          description: "Semantic customer component.",
          lifecycleStatus: "ACTIVE",
          providesCapabilityIds: [
            toSemanticId("flow.capability.crm.customer-management"),
          ],
          requiresCapabilityIds: [],
          dependsOnComponentIds: [],
          optionalDependencyIds: [],
          conflictsWithComponentIds: [],
          implementation: { availability: "SEMANTIC_ONLY", moduleBindings: [] },
          usesEntityTypeKeys: [],
          exposesActions: [],
          producesEvents: [],
          consumesEvents: [],
          scope: "GLOBAL",
        },
      ],
    });

    expect(result.report.publishedItems).toBe(21);
    expect(
      componentRegistry.isTrustedComponent(customerManagementComponentId),
    ).toBe(true);
  });
});
