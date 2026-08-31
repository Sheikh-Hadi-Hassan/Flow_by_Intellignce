import { describe, expect, it } from "vitest";

import {
  toSemanticId,
  type BusinessKnowledgeUnit,
  type SourceLicenseProfile,
} from "@flow/blm-contracts";

import {
  BusinessKnowledgeGovernanceRegistry,
  createKnowledgeUnit,
  knowledgeProvenanceFingerprint,
  syntheticKnowledgeSource,
  syntheticLicenseProfile,
  syntheticSourceRelease,
} from "./business-knowledge-governance.js";

const now = "2026-08-13T00:00:00.000Z";

describe("BusinessKnowledgeGovernanceRegistry", () => {
  it("proves the Task 001 golden path for governed source knowledge and training denial", () => {
    const registry = new BusinessKnowledgeGovernanceRegistry();
    const trainingLicense = syntheticLicenseProfile({
      licenseProfileId: "license-training-ok",
      createdAt: now,
      training: "ALLOWED",
      commercialTraining: "ALLOWED",
    });
    const contextOnlyLicense = syntheticLicenseProfile({
      licenseProfileId: "license-context-only",
      createdAt: now,
      training: "PROHIBITED",
      commercialTraining: "PROHIBITED",
    });
    const sourceA = syntheticKnowledgeSource({
      sourceId: "FLOW_INTERNAL_TEST_SOURCE",
      name: "Flow internal synthetic source",
      createdAt: now,
    });
    const sourceB = syntheticKnowledgeSource({
      sourceId: "FLOW_CONTEXT_ONLY_TEST_SOURCE",
      name: "Flow context-only synthetic source",
      createdAt: now,
    });
    const releaseA1 = syntheticSourceRelease({
      releaseId: "FLOW_INTERNAL_TEST_SOURCE:1.0",
      sourceId: sourceA.sourceId,
      licenseProfileId: trainingLicense.licenseProfileId,
      version: "1.0",
      createdAt: now,
    });
    const releaseA2 = syntheticSourceRelease({
      releaseId: "FLOW_INTERNAL_TEST_SOURCE:2.0",
      sourceId: sourceA.sourceId,
      licenseProfileId: trainingLicense.licenseProfileId,
      version: "2.0",
      createdAt: "2026-08-14T00:00:00.000Z",
      supersedesReleaseId: releaseA1.releaseId,
    });
    const releaseB = syntheticSourceRelease({
      releaseId: "FLOW_CONTEXT_ONLY_TEST_SOURCE:1.0",
      sourceId: sourceB.sourceId,
      licenseProfileId: contextOnlyLicense.licenseProfileId,
      version: "1.0",
      createdAt: now,
    });

    registry.registerLicenseProfile(trainingLicense);
    registry.registerLicenseProfile(contextOnlyLicense);
    registry.registerSource(sourceA);
    registry.registerSource(sourceB);
    registry.registerSourceRelease(releaseA1);
    registry.registerSourceRelease(releaseB);
    registry.registerSourceRelease(releaseA2);

    const capacityPattern = knowledge({
      knowledgeId: "KB-FLOW-CAPACITY-PLANNING-001",
      source: sourceA,
      release: releaseA1,
      license: trainingLicense,
      object:
        "Project-based service businesses may require capacity planning when concurrent load and shared specialist resources create scheduling constraints.",
    });
    registry.createKnowledgeUnit(capacityPattern);

    expect(
      registry.evaluateUse({
        knowledgeId: capacityPattern.knowledgeId,
        use: "RETRIEVAL",
        asOf: "2026-08-13",
      }),
    ).toMatchObject({ allowed: true, reasons: [] });
    expect(
      registry.evaluateUse({
        knowledgeId: capacityPattern.knowledgeId,
        use: "TRAINING",
        asOf: "2026-08-13",
      }),
    ).toMatchObject({ allowed: true, reasons: [] });

    const contextOnlyKnowledge = knowledge({
      knowledgeId: "KB-FLOW-CONTEXT-ONLY-001",
      source: sourceB,
      release: releaseB,
      license: contextOnlyLicense,
      object:
        "Context-only synthetic source can support grounding but not training.",
    });
    registry.createKnowledgeUnit(contextOnlyKnowledge);

    const contextOnlyTrainingResult = registry.evaluateTrainingEligibility({
      candidate: {
        candidateId: "candidate-context-only",
        knowledgeId: contextOnlyKnowledge.knowledgeId,
        requestedUse: "TRAINING",
        exportPurpose: "test export",
        createdAt: now,
      },
      asOf: "2026-08-13",
    });
    expect(contextOnlyTrainingResult.allowed).toBe(false);
    expect(contextOnlyTrainingResult.reasons).toContain(
      "MODEL_TRAINING_NOT_ALLOWED",
    );

    const replacement = knowledge({
      knowledgeId: "KB-FLOW-CAPACITY-PLANNING-002",
      source: sourceA,
      release: releaseA2,
      license: trainingLicense,
      object:
        "Project-based service businesses may require capacity planning when delivery commitments exceed role-specific available capacity.",
    });
    const supersession = registry.supersedeKnowledge({
      previousKnowledgeId: capacityPattern.knowledgeId,
      replacement,
    });

    expect(supersession.previous.status).toBe("SUPERSEDED");
    expect(
      registry.getKnowledge(capacityPattern.knowledgeId)
        ?.supersededByKnowledgeId,
    ).toBe(replacement.knowledgeId);
    expect(registry.provenanceFor(replacement.knowledgeId)).toMatchObject({
      knowledge: { knowledgeId: replacement.knowledgeId },
      sourceRelease: { releaseId: releaseA2.releaseId },
      source: { sourceId: sourceA.sourceId },
      licenseProfile: { licenseProfileId: trainingLicense.licenseProfileId },
      supersededKnowledge: { knowledgeId: capacityPattern.knowledgeId },
    });
    expect(
      registry
        .listCurrentKnowledge({ asOf: "2026-08-14" })
        .map((item) => item.knowledgeId),
    ).toContain(replacement.knowledgeId);
    expect(
      registry
        .listCurrentKnowledge({ asOf: "2026-08-14" })
        .map((item) => item.knowledgeId),
    ).not.toContain(capacityPattern.knowledgeId);
  });

  it("fails closed for unknown license rights and pending legal review", () => {
    const license = syntheticLicenseProfile({
      licenseProfileId: "license-review-needed",
      createdAt: now,
      training: "UNKNOWN_REQUIRES_REVIEW",
      commercialTraining: "UNKNOWN_REQUIRES_REVIEW",
      legalReviewStatus: "PENDING",
    });
    const registry = seededRegistry({ license });
    const unit = knowledge({
      knowledgeId: "KB-UNKNOWN-LICENSE",
      source: registry.source,
      release: registry.release,
      license,
    });
    registry.registry.createKnowledgeUnit(unit);

    const trainingResult = registry.registry.evaluateUse({
      knowledgeId: unit.knowledgeId,
      use: "TRAINING",
      asOf: "2026-08-13",
    });
    expect(trainingResult.allowed).toBe(false);
    expect(trainingResult.requiresReview).toBe(true);
    expect(trainingResult.reasons).toContain("UNKNOWN_USE_REQUIRES_REVIEW");
    expect(trainingResult.reasons).toContain("LEGAL_REVIEW_PENDING");
  });

  it("blocks revoked source releases from current authority", () => {
    const seeded = seededRegistry();
    const revokedRelease = {
      ...seeded.release,
      releaseId: "release-revoked",
      status: "REVOKED" as const,
      contentFingerprint: "revoked-content",
    };
    seeded.registry.registerSourceRelease(revokedRelease);
    const unit = knowledge({
      knowledgeId: "KB-REVOKED",
      source: seeded.source,
      release: revokedRelease,
      license: seeded.license,
    });
    seeded.registry.createKnowledgeUnit(unit);

    const contextResult = seeded.registry.evaluateUse({
      knowledgeId: unit.knowledgeId,
      use: "CONTEXT",
      asOf: "2026-08-13",
    });
    expect(contextResult.allowed).toBe(false);
    expect(contextResult.reasons).toContain("SOURCE_RELEASE_NOT_ACTIVE");
  });

  it("preserves claim classification and rejects invalid self-supersession", () => {
    const seeded = seededRegistry();
    const unit = knowledge({
      knowledgeId: "KB-CLAIM-CLASS",
      source: seeded.source,
      release: seeded.release,
      license: seeded.license,
      claimType: "STANDARD_MAPPING",
      predicate: "MAPPED_TO_STANDARD",
    });
    seeded.registry.createKnowledgeUnit(unit);

    expect(seeded.registry.getKnowledge(unit.knowledgeId)?.claimType).toBe(
      "STANDARD_MAPPING",
    );
    expect(() =>
      seeded.registry.createKnowledgeUnit({
        ...unit,
        knowledgeId: "KB-SELF-SUPERSESSION",
        supersedesKnowledgeId: "KB-SELF-SUPERSESSION",
      }),
    ).toThrow("Knowledge unit cannot supersede itself");
  });

  it("keeps workspace facts scoped and out of global training by default", () => {
    const seeded = seededRegistry();
    const workspaceFact = knowledge({
      knowledgeId: "KB-WORKSPACE-FACT",
      source: seeded.source,
      release: seeded.release,
      license: seeded.license,
      claimType: "WORKSPACE_FACT",
      scope: "WORKSPACE",
      workspaceId: "workspace-alpha",
      subjectId: "workspace-alpha",
      predicate: "HAS_ACTIVE_EMPLOYEE_COUNT",
      object: "32",
    });
    seeded.registry.createKnowledgeUnit(workspaceFact);

    const workspaceTrainingResult = seeded.registry.evaluateUse({
      knowledgeId: workspaceFact.knowledgeId,
      use: "TRAINING",
      asOf: "2026-08-13",
    });
    expect(workspaceTrainingResult.allowed).toBe(false);
    expect(workspaceTrainingResult.reasons).toContain(
      "WORKSPACE_FACT_NOT_GLOBAL_TRAINING_ELIGIBLE",
    );
  });

  it("distinguishes superseded and current freshness", () => {
    const seeded = seededRegistry();
    const unit = knowledge({
      knowledgeId: "KB-FRESHNESS-001",
      source: seeded.source,
      release: seeded.release,
      license: seeded.license,
    });
    const replacement = knowledge({
      knowledgeId: "KB-FRESHNESS-002",
      source: seeded.source,
      release: seeded.release,
      license: seeded.license,
      object: "Replacement pattern.",
    });
    seeded.registry.createKnowledgeUnit(unit);
    seeded.registry.supersedeKnowledge({
      previousKnowledgeId: unit.knowledgeId,
      replacement,
    });

    expect(
      seeded.registry.freshnessFor({
        knowledgeId: unit.knowledgeId,
        asOf: "2026-08-13",
      }),
    ).toBe("SUPERSEDED");
    expect(
      seeded.registry.freshnessFor({
        knowledgeId: replacement.knowledgeId,
        asOf: "2026-08-13",
        agingAfterDays: 10,
      }),
    ).toBe("CURRENT");
  });

  it("creates deterministic provenance fingerprints for equivalent canonical content", () => {
    const seeded = seededRegistry();
    const base = knowledge({
      knowledgeId: "KB-FINGERPRINT",
      source: seeded.source,
      release: seeded.release,
      license: seeded.license,
    });
    const { provenanceFingerprint, ...withoutFingerprint } = base;
    expect(provenanceFingerprint).toBe(base.provenanceFingerprint);

    expect(knowledgeProvenanceFingerprint(withoutFingerprint)).toBe(
      base.provenanceFingerprint,
    );
    expect(
      knowledgeProvenanceFingerprint({
        ...withoutFingerprint,
        object: "Different canonical content.",
      }),
    ).not.toBe(base.provenanceFingerprint);
  });
});

function seededRegistry(input?: { readonly license?: SourceLicenseProfile }) {
  const license =
    input?.license ??
    syntheticLicenseProfile({
      licenseProfileId: "license-default",
      createdAt: now,
      training: "ALLOWED",
      commercialTraining: "ALLOWED",
    });
  const source = syntheticKnowledgeSource({
    sourceId: "FLOW_SEEDED_SOURCE",
    name: "Flow seeded source",
    createdAt: now,
  });
  const release = syntheticSourceRelease({
    releaseId: "FLOW_SEEDED_SOURCE:1.0",
    sourceId: source.sourceId,
    licenseProfileId: license.licenseProfileId,
    version: "1.0",
    createdAt: now,
  });
  const registry = new BusinessKnowledgeGovernanceRegistry({
    licenseProfiles: [license],
    sources: [source],
    releases: [release],
  });
  return { registry, source, release, license };
}

function knowledge(input: {
  readonly knowledgeId: string;
  readonly source: {
    readonly sourceId: string;
    readonly authorityClass: BusinessKnowledgeUnit["sourceAuthority"];
  };
  readonly release: {
    readonly releaseId: string;
    readonly version: string;
    readonly observedAt: string;
    readonly publishedAt?: string;
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly sourceLocator: string;
  };
  readonly license: SourceLicenseProfile;
  readonly claimType?: BusinessKnowledgeUnit["claimType"];
  readonly scope?: BusinessKnowledgeUnit["scope"];
  readonly workspaceId?: string;
  readonly subjectId?: string;
  readonly predicate?: string;
  readonly object?: string;
}): BusinessKnowledgeUnit {
  return createKnowledgeUnit({
    knowledgeId: input.knowledgeId,
    claimType: input.claimType ?? "DOMAIN_PATTERN",
    subjectId: input.subjectId ?? "PROJECT_BASED_SERVICE_BUSINESS",
    predicate: input.predicate ?? "MAY_REQUIRE",
    object: input.object ?? "Capacity planning under concurrent project load.",
    canonicalConceptRefs: [toSemanticId("flow.concept.project.capacity")],
    relationRefs: [toSemanticId("flow.dependency.business.requires")],
    sourceId: input.source.sourceId,
    sourceReleaseId: input.release.releaseId,
    sourceLocator: input.release.sourceLocator,
    sourceAuthority: input.source.authorityClass,
    sourceVersion: input.release.version,
    ...(input.release.publishedAt
      ? { sourcePublishedAt: input.release.publishedAt }
      : {}),
    sourceObservedAt: input.release.observedAt,
    jurisdiction: ["GLOBAL"],
    effectiveFrom: input.release.effectiveFrom,
    ...(input.release.effectiveTo
      ? { effectiveTo: input.release.effectiveTo }
      : {}),
    licenseProfileId: input.license.licenseProfileId,
    permittedUses: [
      "REFERENCE",
      "MAPPING",
      "CONTEXT",
      "RETRIEVAL",
      "EVALUATION",
      "TRAINING",
      "COMMERCIAL_TRAINING",
      "REDISTRIBUTION",
    ],
    confidence: 0.9,
    reviewStatus: "REVIEWED",
    reviewedBy: "flow-test",
    reviewedAt: now,
    reviewEvidence: [input.release.releaseId],
    status: "PUBLISHED",
    scope: input.scope ?? "GLOBAL",
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    createdAt: now,
    updatedAt: now,
  });
}
