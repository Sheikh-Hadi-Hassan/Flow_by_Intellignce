import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  blmExpandedDomainIdsV1,
  creativeAgencyIndustryExpertisePackV1,
  logicId,
  projectMarginAnalysisSkillV1,
  toSemanticId,
  type BusinessKnowledgeUnit,
  type BusinessLogicDefinition,
  type BusinessSource,
  type SemanticId,
  type SourceLicenseProfile,
  type SourceRelease,
} from "@flow/blm-contracts";
import {
  BusinessLanguageRegistry,
  DeterministicBusinessEngine,
  VirtualWorkspaceBusinessRuntime,
  WorkspaceRuntimeCache,
  WorkspaceRuntimeCompiler,
  businessLanguageAlias,
  businessLanguageCoreConceptIds,
  createUniversalBusinessLanguageSeed,
  benchmarkActor,
  calculationRequest,
  workspaceInput,
} from "@flow/blm-core";

import {
  InMemoryBusinessPersistenceRepository,
  PostgresBusinessSkillReleaseRepository,
  PostgresBusinessKnowledgeGovernanceRepository,
  PostgresBusinessLanguageRepository,
  PostgresBusinessLogicRegistry,
  PostgresCalculationAuditRepository,
  PostgresCanonicalBusinessRecordRepository,
  PostgresIndustryExpertiseReleaseRepository,
  PostgresWorkspaceExpertiseInstallationRepository,
  PostgresWorkspaceRuntimeRepository,
  PostgresWorkspaceSkillInstallationRepository,
  createBusinessPersistenceTestRepository,
  type CalculationAuditPersistence,
  type CanonicalBusinessRecordPersistence,
  type CanonicalBusinessRelationshipPersistence,
  type DataUseClassification,
  type ImportSessionPersistence,
  type SqlExecutor,
} from "./business-persistence.js";
import { workspaceSkillInstallation } from "@flow/blm-core";

const now = "2026-08-12T00:00:00.000Z";
const workspaceAlpha = "00000000-0000-4000-8000-000000000001";
const workspaceBeta = "00000000-0000-4000-8000-000000000002";

class FakeSqlExecutor implements SqlExecutor {
  readonly calls: {
    readonly sql: string;
    readonly params: readonly unknown[];
  }[] = [];

  constructor(private readonly rows: readonly unknown[] = []) {}

  async query<T>(
    sql: string,
    params: readonly unknown[],
  ): Promise<{ readonly rows: T[] }> {
    this.calls.push({ sql, params });
    return Promise.resolve({ rows: this.rows as T[] });
  }
}

function record(input: {
  readonly id: string;
  readonly workspaceId: string;
  readonly semanticId: SemanticId;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
  readonly entityType?: string;
  readonly externalId?: string;
  readonly dataUseClassification?: DataUseClassification;
}): CanonicalBusinessRecordPersistence {
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    entityType: input.entityType ?? "business_metric",
    semanticId: input.semanticId,
    schemaVersion: "1",
    sourceType: "synthetic_fixture",
    sourceId: "fixture",
    ...(input.externalId ? { externalId: input.externalId } : {}),
    payload: input.payload,
    provenance: { source: "synthetic" },
    corpusClassification: "SYNTHETIC_CORPUS",
    dataUseClassification: input.dataUseClassification ?? "WORKSPACE_ONLY",
    fieldProvenance: Object.fromEntries(
      Object.keys(input.payload).map((field) => [field, "synthetic"]),
    ),
    createdAt: now,
    updatedAt: now,
    version: 1,
    fingerprint: `${input.id}:fingerprint:v1`,
  };
}

function relationship(input: {
  readonly id: string;
  readonly workspaceId: string;
  readonly fromRecordId: string;
  readonly toRecordId: string;
}): CanonicalBusinessRelationshipPersistence {
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    relationshipType: "SUPPORTS_DIAGNOSIS",
    fromRecordId: input.fromRecordId,
    toRecordId: input.toRecordId,
    semanticRelationshipId: toSemanticId("flow.dependency.business.supports"),
    provenance: { source: "synthetic" },
    version: 1,
    fingerprint: `${input.id}:fingerprint:v1`,
  };
}

function audit(input: {
  readonly executionId: string;
  readonly workspaceId: string;
}): CalculationAuditPersistence {
  return {
    executionId: input.executionId,
    requestId: `${input.executionId}:request`,
    workspaceId: input.workspaceId,
    actorId: `${input.workspaceId}:actor`,
    logicId: logicId("finance", "gross-margin", 1),
    logicVersion: "1",
    logicFingerprint: "logic:fingerprint",
    runtimeFingerprint: "runtime:fingerprint",
    status: "COMPLETED",
    inputFingerprint: "input:fingerprint",
    resultFingerprint: "result:fingerprint",
    resultType: "MONEY",
    unit: "USD",
    currency: "USD",
    startedAt: now,
    completedAt: now,
    correlationId: `${input.executionId}:correlation`,
    warnings: [],
    recordReferences: ["record-1"],
  };
}

function governedSource(): BusinessSource {
  return {
    sourceId: "FLOW_SYNTHETIC_BUSINESS_LIBRARY",
    canonicalName: "Flow synthetic business library",
    sourceType: "FLOW_INTERNAL",
    publisher: "Flow",
    authorityClass: "FLOW_INTERNAL",
    description: "Synthetic Flow-internal governance fixture.",
    defaultJurisdiction: ["GLOBAL"],
    defaultLanguage: ["en"],
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

function governedLicense(
  input: {
    readonly licenseProfileId?: string;
    readonly training?: "ALLOWED" | "PROHIBITED" | "UNKNOWN_REQUIRES_REVIEW";
  } = {},
): SourceLicenseProfile {
  const training = input.training ?? "ALLOWED";
  return {
    licenseProfileId: input.licenseProfileId ?? "FLOW_SYNTHETIC_TRAINING_OK",
    referenceAllowed: "ALLOWED",
    mappingAllowed: "ALLOWED",
    ingestionAllowed: "ALLOWED",
    contextUseAllowed: "ALLOWED",
    evaluationUseAllowed: "ALLOWED",
    modelTrainingAllowed: training,
    commercialTrainingAllowed: training,
    redistributionAllowed: "ALLOWED",
    attributionRequired: false,
    licenseName: "Synthetic Flow test license",
    restrictions: [],
    notes: "Non-proprietary synthetic fixture.",
    legalReviewStatus: "APPROVED",
    createdAt: now,
    updatedAt: now,
  };
}

function governedRelease(input: {
  readonly source: BusinessSource;
  readonly license: SourceLicenseProfile;
  readonly releaseId?: string;
  readonly version?: string;
  readonly supersedesReleaseId?: string;
}): SourceRelease {
  const releaseId = input.releaseId ?? `${input.source.sourceId}:1.0`;
  const version = input.version ?? "1.0";
  return {
    releaseId,
    sourceId: input.source.sourceId,
    version,
    releaseName: `Synthetic release ${version}`,
    observedAt: now,
    effectiveFrom: "2026-08-12",
    status: "ACTIVE",
    createdAt: now,
    licenseProfileId: input.license.licenseProfileId,
    ...(input.supersedesReleaseId
      ? { supersedesReleaseId: input.supersedesReleaseId }
      : {}),
    contentFingerprint: `${releaseId}:content:fingerprint`,
    metadataFingerprint: `${releaseId}:metadata:fingerprint`,
    jurisdiction: ["GLOBAL"],
    languages: ["en"],
    sourceLocator: `flow://synthetic/${input.source.sourceId}/${version}`,
    reviewStatus: "APPROVED",
    reviewedAt: now,
    reviewedBy: "flow-test",
    updatedAt: now,
  };
}

function governedKnowledge(input: {
  readonly knowledgeId: string;
  readonly source: BusinessSource;
  readonly release: SourceRelease;
  readonly license: SourceLicenseProfile;
  readonly scope?: "GLOBAL" | "WORKSPACE";
  readonly workspaceId?: string;
  readonly claimType?: BusinessKnowledgeUnit["claimType"];
  readonly status?: BusinessKnowledgeUnit["status"];
  readonly supersedesKnowledgeId?: string;
}): BusinessKnowledgeUnit {
  const base: Omit<BusinessKnowledgeUnit, "provenanceFingerprint"> = {
    knowledgeId: input.knowledgeId,
    claimType: input.claimType ?? "DOMAIN_PATTERN",
    subjectId: "flow.concept.finance.cash-flow",
    predicate: "INDICATES_DIAGNOSTIC_AREA",
    object:
      "Profitable businesses with recurring cash shortages should inspect receivable timing, payable timing, working capital, inventory, and cash conversion.",
    canonicalConceptRefs: [
      toSemanticId("flow.concept.finance.cash-flow"),
      toSemanticId("flow.concept.finance.working-capital"),
    ],
    relationRefs: [toSemanticId("flow.dependency.business.supports")],
    sourceId: input.source.sourceId,
    sourceReleaseId: input.release.releaseId,
    sourceLocator: input.release.sourceLocator,
    sourceAuthority: input.source.authorityClass,
    sourceVersion: input.release.version,
    sourceObservedAt: input.release.observedAt,
    jurisdiction: ["GLOBAL"],
    effectiveFrom: "2026-08-12",
    licenseProfileId: input.license.licenseProfileId,
    permittedUses: [
      "REFERENCE",
      "CONTEXT",
      "RETRIEVAL",
      "EVALUATION",
      "TRAINING",
    ],
    confidence: 0.91,
    reviewStatus: "REVIEWED",
    reviewedBy: "flow-test",
    reviewedAt: now,
    reviewEvidence: ["synthetic governance fixture"],
    ...(input.supersedesKnowledgeId
      ? { supersedesKnowledgeId: input.supersedesKnowledgeId }
      : {}),
    status: input.status ?? "PUBLISHED",
    scope: input.scope ?? "GLOBAL",
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...base,
    provenanceFingerprint: `${input.knowledgeId}:provenance:fingerprint`,
  };
}

describe("business persistence repository", () => {
  it("creates, reads, and bounds canonical records by workspace and semantic identity", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    const inventorySemanticId = toSemanticId("flow.concept.inventory.stock");
    await repository.saveRecord(
      record({
        id: "alpha-inventory",
        workspaceId: workspaceAlpha,
        semanticId: inventorySemanticId,
        payload: { availableUnits: 20 },
      }),
    );
    await repository.saveRecord(
      record({
        id: "beta-inventory",
        workspaceId: workspaceBeta,
        semanticId: inventorySemanticId,
        payload: { availableUnits: 99 },
      }),
    );

    await expect(
      repository.listRecords({
        workspaceId: workspaceAlpha,
        semanticIds: [inventorySemanticId],
        limit: 10,
      }),
    ).resolves.toMatchObject([
      { id: "alpha-inventory", workspaceId: workspaceAlpha },
    ]);
    await expect(
      repository.listRecords({
        workspaceId: workspaceBeta,
        recordIds: ["alpha-inventory"],
        limit: 10,
      }),
    ).resolves.toEqual([]);
  });

  it("protects mutable records from stale writes with optimistic concurrency", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    await repository.saveRecord(
      record({
        id: "alpha-cash",
        workspaceId: workspaceAlpha,
        semanticId: toSemanticId("flow.concept.finance.cash"),
        payload: { cash: "5000.00" },
      }),
    );

    await expect(
      repository.updateRecord({
        workspaceId: workspaceAlpha,
        recordId: "alpha-cash",
        expectedVersion: 1,
        payload: { cash: "6000.00" },
        fingerprint: "alpha-cash:fingerprint:v2",
      }),
    ).resolves.toMatchObject({ version: 2, payload: { cash: "6000.00" } });
    await expect(
      repository.updateRecord({
        workspaceId: workspaceAlpha,
        recordId: "alpha-cash",
        expectedVersion: 1,
        payload: { cash: "7000.00" },
        fingerprint: "alpha-cash:fingerprint:v3",
      }),
    ).rejects.toThrow("Optimistic concurrency conflict");
  });

  it("rejects cross-workspace canonical relationships", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    await repository.saveRecord(
      record({
        id: "alpha-order",
        workspaceId: workspaceAlpha,
        semanticId: toSemanticId("flow.concept.order.sales-order"),
        payload: { orderUnits: 30 },
      }),
    );
    await repository.saveRecord(
      record({
        id: "beta-inventory",
        workspaceId: workspaceBeta,
        semanticId: toSemanticId("flow.concept.inventory.stock"),
        payload: { availableUnits: 30 },
      }),
    );

    await expect(
      repository.saveRelationship(
        relationship({
          id: "invalid-cross-workspace",
          workspaceId: workspaceAlpha,
          fromRecordId: "alpha-order",
          toRecordId: "beta-inventory",
        }),
      ),
    ).rejects.toThrow("Relationship cannot cross workspaces");
  });

  it("persists business logic releases with authoritative resolution only", async () => {
    const repository = createBusinessPersistenceTestRepository();
    const approved = await repository.resolveLogic({
      logicId: logicId("finance", "gross-margin", 1),
      asOf: "2026-08-12",
    });

    expect(approved?.status).toBe("APPROVED");
    await repository.saveLogicRelease({
      ...(approved as BusinessLogicDefinition),
      version: "draft",
      status: "DRAFT",
      approvalStatus: "DRAFT_ONLY",
      fingerprint: "draft:fingerprint",
    });
    await expect(
      repository.resolveLogic({
        logicId: logicId("finance", "gross-margin", 1),
        asOf: "2026-08-12",
      }),
    ).resolves.toMatchObject({ version: "1" });
    await expect(
      repository.saveLogicRelease({
        ...(approved as BusinessLogicDefinition),
        fingerprint: "mutated:fingerprint",
      }),
    ).rejects.toThrow("Published logic is immutable");
  });

  it("persists immutable runtime manifests and exact historical fingerprints", async () => {
    const compiler = new WorkspaceRuntimeCompiler();
    const v1 = compiler.compile(
      workspaceInput(workspaceAlpha, "Grocery", [
        blmExpandedDomainIdsV1.inventoryLogistics,
      ]),
    );
    const v2 = compiler.compile({
      ...workspaceInput(workspaceAlpha, "Grocery", [
        blmExpandedDomainIdsV1.inventoryLogistics,
        blmExpandedDomainIdsV1.financeAccounting,
      ]),
      runtimeVersion: "2",
    });
    const repository = new InMemoryBusinessPersistenceRepository();
    await repository.saveManifest(v1);
    await repository.saveManifest(v2);
    await repository.supersedeRuntime({
      workspaceId: workspaceAlpha,
      runtimeFingerprint: v1.runtimeFingerprint,
      supersededAt: now,
    });

    await expect(
      repository.getActiveRuntime(workspaceAlpha),
    ).resolves.toMatchObject({
      runtimeFingerprint: v2.runtimeFingerprint,
    });
    await expect(
      repository.loadByFingerprint({
        workspaceId: workspaceAlpha,
        runtimeFingerprint: v1.runtimeFingerprint,
      }),
    ).resolves.toMatchObject({ runtimeFingerprint: v1.runtimeFingerprint });
    await expect(
      repository.loadRuntimeSlice({
        workspaceId: workspaceAlpha,
        runtimeFingerprint: v2.runtimeFingerprint,
        sliceId: "finance",
      }),
    ).resolves.toMatchObject({ sliceId: "finance" });
  });

  it("keeps runtime cache a speed layer rather than correctness authority", () => {
    const compiler = new WorkspaceRuntimeCompiler();
    const v1 = compiler.compile(
      workspaceInput(workspaceAlpha, "Grocery", [
        blmExpandedDomainIdsV1.inventoryLogistics,
      ]),
    );
    const v2 = compiler.compile({
      ...workspaceInput(workspaceAlpha, "Grocery", [
        blmExpandedDomainIdsV1.inventoryLogistics,
        blmExpandedDomainIdsV1.financeAccounting,
      ]),
      runtimeVersion: "2",
    });
    const cache = new WorkspaceRuntimeCache(2);
    cache.set(v1);
    cache.set(v2);

    expect(
      cache.get({
        workspaceId: workspaceAlpha,
        runtimeFingerprint: v1.runtimeFingerprint,
      })?.runtimeFingerprint,
    ).toBe(v1.runtimeFingerprint);
    expect(v2.runtimeFingerprint).not.toBe(v1.runtimeFingerprint);
  });

  it("stores calculation audit fingerprints without private reasoning content", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    await repository.appendCalculationAudit(
      audit({ executionId: "exec-1", workspaceId: workspaceAlpha }),
    );
    await repository.appendCalculationAudit(
      audit({ executionId: "exec-2", workspaceId: workspaceBeta }),
    );

    await expect(
      repository.listCalculationAudits({ workspaceId: workspaceAlpha }),
    ).resolves.toEqual([
      expect.objectContaining({
        executionId: "exec-1",
        inputFingerprint: "input:fingerprint",
        resultFingerprint: "result:fingerprint",
      }),
    ]);
    expect(
      JSON.stringify(
        await repository.listCalculationAudits({ workspaceId: workspaceAlpha }),
      ),
    ).not.toMatch(/reasoning|prompt|chain/i);
  });

  it("tracks import sessions, statuses, governance flags, and duplicate import idempotency", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    const session: ImportSessionPersistence = {
      importSessionId: "import-1",
      workspaceId: workspaceAlpha,
      sourceType: "ERP",
      sourceSystem: "synthetic",
      sourceFingerprint: "source:fingerprint",
      mappingVersion: "mapping-v1",
      status: "CREATED",
      recordsReceived: 10,
      recordsAccepted: 0,
      recordsRejected: 0,
      dataUseClassification: "WORKSPACE_ONLY",
      privacyClassification: { containsPii: false },
    };
    await repository.saveImportSession(session);

    await expect(
      repository.updateImportSession({
        workspaceId: workspaceAlpha,
        importSessionId: "import-1",
        status: "COMPLETED",
        recordsAccepted: 10,
        recordsRejected: 0,
      }),
    ).resolves.toMatchObject({ status: "COMPLETED", recordsAccepted: 10 });
    await expect(
      repository.saveImportSession({
        ...session,
        importSessionId: "duplicate",
      }),
    ).rejects.toThrow("Duplicate import source fingerprint");
  });

  it("persists source, license, release, and governed knowledge with workspace boundaries", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    const source = governedSource();
    const license = governedLicense();
    const release = governedRelease({ source, license });
    const globalKnowledge = governedKnowledge({
      knowledgeId: "KB-CASH-FLOW-GLOBAL",
      source,
      release,
      license,
    });
    const workspaceFact = governedKnowledge({
      knowledgeId: "KB-CASH-FLOW-WORKSPACE",
      source,
      release,
      license,
      claimType: "WORKSPACE_FACT",
      scope: "WORKSPACE",
      workspaceId: workspaceAlpha,
    });

    await repository.saveSource(source);
    await repository.saveLicenseProfile(license);
    await repository.saveSourceRelease(release);
    await repository.saveKnowledgeUnit(globalKnowledge);
    await repository.saveKnowledgeUnit(workspaceFact);

    await expect(repository.getSource(source.sourceId)).resolves.toEqual(
      source,
    );
    await expect(
      repository.getLicenseProfile(license.licenseProfileId),
    ).resolves.toEqual(license);
    await expect(
      repository.getSourceRelease(release.releaseId),
    ).resolves.toEqual(release);
    await expect(
      repository.listCurrentKnowledge({
        asOf: "2026-08-13",
        workspaceId: workspaceAlpha,
        limit: 10,
      }),
    ).resolves.toEqual([globalKnowledge, workspaceFact]);
    await expect(
      repository.listCurrentKnowledge({
        asOf: "2026-08-13",
        workspaceId: workspaceBeta,
        limit: 10,
      }),
    ).resolves.toEqual([globalKnowledge]);
  });

  it("keeps historical knowledge and source releases immutable while recording supersession", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    const source = governedSource();
    const license = governedLicense();
    const releaseV1 = governedRelease({ source, license });
    const releaseV2 = governedRelease({
      source,
      license,
      releaseId: `${source.sourceId}:2.0`,
      version: "2.0",
      supersedesReleaseId: releaseV1.releaseId,
    });
    const knowledgeV1 = governedKnowledge({
      knowledgeId: "KB-CASH-FLOW-V1",
      source,
      release: releaseV1,
      license,
    });
    const knowledgeV2 = governedKnowledge({
      knowledgeId: "KB-CASH-FLOW-V2",
      source,
      release: releaseV2,
      license,
      supersedesKnowledgeId: knowledgeV1.knowledgeId,
    });

    await repository.saveSource(source);
    await repository.saveLicenseProfile(license);
    await repository.saveSourceRelease(releaseV1);
    await repository.saveSourceRelease(releaseV2);
    await repository.saveKnowledgeUnit(knowledgeV1);
    await repository.saveKnowledgeUnit(knowledgeV2);
    await repository.supersedeKnowledgeUnit({
      previousKnowledgeId: knowledgeV1.knowledgeId,
      replacementKnowledgeId: knowledgeV2.knowledgeId,
      supersededAt: "2026-08-13T00:00:00.000Z",
    });

    await expect(
      repository.saveSourceRelease({
        ...releaseV1,
        contentFingerprint: "mutated:fingerprint",
      }),
    ).rejects.toThrow("Historical source release is immutable");
    await expect(
      repository.saveKnowledgeUnit({
        ...knowledgeV1,
        provenanceFingerprint: "mutated:fingerprint",
      }),
    ).rejects.toThrow("Historical knowledge unit is immutable");
    await expect(
      repository.getKnowledgeUnit(knowledgeV1.knowledgeId),
    ).resolves.toMatchObject({
      status: "SUPERSEDED",
      supersededByKnowledgeId: knowledgeV2.knowledgeId,
    });
  });

  it("deduplicates request handling by workspace-scoped idempotency keys", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    const request = {
      workspaceId: workspaceAlpha,
      idempotencyKey: "request-key",
      requestClass: "IMPORT",
      requestFingerprint: "request:fingerprint",
      status: "STARTED" as const,
      expiresAt: "2026-08-13T00:00:00.000Z",
    };

    await expect(repository.reserve(request)).resolves.toBe("RESERVED");
    await expect(repository.reserve(request)).resolves.toBe("DUPLICATE");
    await expect(
      repository.reserve({ ...request, workspaceId: workspaceBeta }),
    ).resolves.toBe("RESERVED");
  });

  it("resolves calculation inputs only from explicitly referenced workspace records", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    await repository.saveRecord(
      record({
        id: "alpha-revenue",
        workspaceId: workspaceAlpha,
        semanticId: toSemanticId("flow.concept.finance.revenue"),
        payload: { revenue: "1000.00", costOfGoodsSold: "600.00" },
      }),
    );
    await repository.saveRecord(
      record({
        id: "beta-revenue",
        workspaceId: workspaceBeta,
        semanticId: toSemanticId("flow.concept.finance.revenue"),
        payload: { revenue: "9999.00" },
      }),
    );
    const inputs = repository.resolve({
      workspaceId: workspaceAlpha,
      actor: benchmarkActor(workspaceAlpha),
      recordReferences: ["alpha-revenue", "beta-revenue"],
      requiredInputs: ["revenue", "costOfGoodsSold"],
    });
    const manifest = new WorkspaceRuntimeCompiler().compile(
      workspaceInput(workspaceAlpha, "Services", [
        blmExpandedDomainIdsV1.financeAccounting,
      ]),
    );
    const result = new VirtualWorkspaceBusinessRuntime(
      manifest,
      new DeterministicBusinessEngine(),
    ).calculate(
      calculationRequest({
        requestId: "gross-margin",
        workspaceId: workspaceAlpha,
        actor: benchmarkActor(workspaceAlpha),
        logicId: logicId("finance", "gross-margin", 1),
        inputs,
        runtimeFingerprint: manifest.runtimeFingerprint,
        currency: "USD",
      }),
    );

    expect(inputs).toEqual({ revenue: "1000.00", costOfGoodsSold: "600.00" });
    expect(result.status).toBe("COMPLETED");
  });

  it("persists canonical business language concepts, aliases, and relations through postgres SQL", async () => {
    const seed = createUniversalBusinessLanguageSeed();
    const db = new FakeSqlExecutor();
    const repository = new PostgresBusinessLanguageRepository(db);

    await repository.persistConcept(seed.concepts[0] ?? missingFixture());
    await repository.persistAlias(seed.aliases[0] ?? missingAliasFixture());
    await repository.persistRelation(
      seed.relations[0] ?? missingRelationFixture(),
    );

    expect(db.calls[0]?.sql).toContain(
      "flow_internal.business_language_concepts",
    );
    expect(db.calls[1]?.sql).toContain(
      "flow_internal.business_language_aliases",
    );
    expect(db.calls[2]?.sql).toContain(
      "flow_internal.business_language_relations",
    );
    expect(JSON.stringify(db.calls[0]?.params)).toContain(
      seed.concepts[0]?.fingerprint,
    );
  });

  it("routes workspace aliases to the public tenant-scoped table", async () => {
    const db = new FakeSqlExecutor();
    const repository = new PostgresBusinessLanguageRepository(db);
    const workspaceAlias = businessLanguageAlias({
      aliasText: "blue team",
      targetConceptId: businessLanguageCoreConceptIds.customerSuccessTeam,
      aliasType: "FOUNDER_SPEAK",
      ambiguityClass: "UNAMBIGUOUS",
      workspaceScope: { workspaceId: workspaceAlpha },
      provenance: {
        sourceType: "WORKSPACE_ALIAS",
        sourceId: "workspace-language-test",
        createdAt: now,
      },
    });

    await repository.persistAlias(workspaceAlias);

    expect(db.calls[0]?.sql).toContain(
      "public.workspace_business_language_aliases",
    );
    expect(db.calls[0]?.params).toContain(workspaceAlpha);
  });

  it("loads a database-backed registry without changing resolver semantics", async () => {
    const seed = createUniversalBusinessLanguageSeed();
    const repository = {
      loadSeed: () => Promise.resolve(seed),
    };

    const registry = await BusinessLanguageRegistry.fromRepository(
      repository as PostgresBusinessLanguageRepository,
    );

    expect(registry.resolveConcept("AR").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.receivable,
    );
    expect(registry.resolveConcept("margin").resolutionStatus).toBe(
      "AMBIGUOUS",
    );
    expect(
      registry.resolveConcept("project margin").selectedConcept?.conceptId,
    ).toBe(businessLanguageCoreConceptIds.projectMargin);
  });
});

function missingFixture(): never {
  throw new Error("Missing concept fixture.");
}

function missingAliasFixture(): never {
  throw new Error("Missing alias fixture.");
}

function missingRelationFixture(): never {
  throw new Error("Missing relation fixture.");
}

describe("Postgres business persistence adapters", () => {
  it("pushes canonical record filtering into parameterized SQL", async () => {
    const db = new FakeSqlExecutor();
    const repository = new PostgresCanonicalBusinessRecordRepository(db);

    await repository.listRecords({
      workspaceId: workspaceAlpha,
      semanticIds: [toSemanticId("flow.concept.inventory.stock")],
      recordIds: ["00000000-0000-4000-8000-000000000003"],
      limit: 25,
    });

    expect(db.calls[0]?.sql).toContain("where workspace_id = $1");
    expect(db.calls[0]?.sql).toContain("semantic_id = any($2::text[])");
    expect(db.calls[0]?.sql).toContain("id = any($3::uuid[])");
    expect(db.calls[0]?.sql).toContain("limit $4");
    expect(db.calls[0]?.params).toEqual([
      workspaceAlpha,
      ["flow.concept.inventory.stock"],
      ["00000000-0000-4000-8000-000000000003"],
      25,
    ]);
    expect(db.calls[0]?.sql).not.toContain(workspaceAlpha);
  });

  it("uses internal schema for logic, runtime, and audit persistence", async () => {
    const db = new FakeSqlExecutor();
    const logic = new PostgresBusinessLogicRegistry(db);
    const runtime = new PostgresWorkspaceRuntimeRepository(db);
    const audits = new PostgresCalculationAuditRepository(db);

    await logic.resolveLogic({
      logicId: logicId("finance", "gross-margin", 1),
      asOf: "2026-08-12",
    });
    await runtime.loadRuntimeSlice({
      workspaceId: workspaceAlpha,
      runtimeFingerprint: "runtime:fingerprint",
      sliceId: "finance",
    });
    await audits.listCalculationAudits({ workspaceId: workspaceAlpha });

    expect(db.calls.map((call) => call.sql).join("\n")).toContain(
      "flow_internal.business_logic_releases",
    );
    expect(db.calls.map((call) => call.sql).join("\n")).toContain(
      "flow_internal.workspace_runtime_slices",
    );
    expect(db.calls.map((call) => call.sql).join("\n")).toContain(
      "flow_internal.calculation_execution_audits",
    );
    expect(
      db.calls.every(
        (call) =>
          call.params.includes(workspaceAlpha) || call.params.length > 0,
      ),
    ).toBe(true);
  });

  it("persists governed skill releases and workspace installations by workspace", async () => {
    const repository = new InMemoryBusinessPersistenceRepository();
    const alphaInstallation = workspaceSkillInstallation({
      workspaceId: workspaceAlpha,
      skillId: projectMarginAnalysisSkillV1.skillId,
      skillVersion: projectMarginAnalysisSkillV1.version,
      installedBy: workspaceAlpha,
    });
    const betaInstallation = workspaceSkillInstallation({
      workspaceId: workspaceBeta,
      skillId: projectMarginAnalysisSkillV1.skillId,
      skillVersion: projectMarginAnalysisSkillV1.version,
      installedBy: workspaceBeta,
    });

    await repository.saveSkillRelease(projectMarginAnalysisSkillV1);
    await repository.saveIndustryExpertiseRelease(
      creativeAgencyIndustryExpertisePackV1,
    );
    await repository.saveWorkspaceSkillInstallation(alphaInstallation);
    await repository.saveWorkspaceSkillInstallation(betaInstallation);
    await repository.saveWorkspaceExpertiseInstallation({
      workspaceId: workspaceAlpha,
      expertisePackId: creativeAgencyIndustryExpertisePackV1.packId,
      expertiseVersion: creativeAgencyIndustryExpertisePackV1.version,
      status: "INSTALLED",
      installedAt: now,
      installedBy: workspaceAlpha,
      configurationFingerprint: "expertise:fingerprint",
      effectiveFrom: "2026-08-12",
    });

    await expect(repository.listApprovedSkillReleases()).resolves.toEqual([
      projectMarginAnalysisSkillV1,
    ]);
    await expect(
      repository.listApprovedIndustryExpertiseReleases(),
    ).resolves.toEqual([creativeAgencyIndustryExpertisePackV1]);
    await expect(
      repository.listWorkspaceSkillInstallations({
        workspaceId: workspaceAlpha,
      }),
    ).resolves.toEqual([alphaInstallation]);
    await expect(
      repository.listWorkspaceExpertiseInstallations({
        workspaceId: workspaceAlpha,
      }),
    ).resolves.toHaveLength(1);
  });

  it("uses parameterized SQL adapters for skill releases and installations", async () => {
    const db = new FakeSqlExecutor([{ release: projectMarginAnalysisSkillV1 }]);
    const skills = new PostgresBusinessSkillReleaseRepository(db);
    const expertise = new PostgresIndustryExpertiseReleaseRepository(db);
    const skillInstallations = new PostgresWorkspaceSkillInstallationRepository(
      db,
    );
    const expertiseInstallations =
      new PostgresWorkspaceExpertiseInstallationRepository(db);

    await skills.saveSkillRelease(projectMarginAnalysisSkillV1);
    await skills.listApprovedSkillReleases();
    await expertise.saveIndustryExpertiseRelease(
      creativeAgencyIndustryExpertisePackV1,
    );
    await skillInstallations.saveWorkspaceSkillInstallation(
      workspaceSkillInstallation({
        workspaceId: workspaceAlpha,
        skillId: projectMarginAnalysisSkillV1.skillId,
        skillVersion: projectMarginAnalysisSkillV1.version,
        installedBy: workspaceAlpha,
      }),
    );
    await skillInstallations.listWorkspaceSkillInstallations({
      workspaceId: workspaceAlpha,
    });
    await expertiseInstallations.listWorkspaceExpertiseInstallations({
      workspaceId: workspaceAlpha,
    });

    const sql = db.calls.map((call) => call.sql).join("\n");
    expect(sql).toContain("flow_internal.business_skill_releases");
    expect(sql).toContain("flow_internal.industry_expertise_releases");
    expect(sql).toContain("public.workspace_skill_installations");
    expect(sql).toContain("public.workspace_expertise_installations");
    expect(db.calls.some((call) => call.params.includes(workspaceAlpha))).toBe(
      true,
    );
  });

  it("uses governed knowledge SQL boundaries for global and workspace-scoped units", async () => {
    const source = governedSource();
    const license = governedLicense();
    const release = governedRelease({ source, license });
    const globalKnowledge = governedKnowledge({
      knowledgeId: "KB-POSTGRES-GLOBAL",
      source,
      release,
      license,
    });
    const workspaceKnowledge = governedKnowledge({
      knowledgeId: "KB-POSTGRES-WORKSPACE",
      source,
      release,
      license,
      claimType: "WORKSPACE_FACT",
      scope: "WORKSPACE",
      workspaceId: workspaceAlpha,
    });
    const db = new FakeSqlExecutor([{ knowledge: globalKnowledge }]);
    const repository = new PostgresBusinessKnowledgeGovernanceRepository(db);

    await repository.saveSource(source);
    await repository.saveLicenseProfile(license);
    await repository.saveSourceRelease(release);
    await repository.saveKnowledgeUnit(globalKnowledge);
    await repository.saveKnowledgeUnit(workspaceKnowledge);
    await repository.getKnowledgeUnit(globalKnowledge.knowledgeId);
    await repository.listCurrentKnowledge({
      asOf: "2026-08-13",
      jurisdiction: "GLOBAL",
      workspaceId: workspaceAlpha,
      limit: 10,
    });
    await repository.supersedeKnowledgeUnit({
      previousKnowledgeId: globalKnowledge.knowledgeId,
      replacementKnowledgeId: "KB-POSTGRES-GLOBAL-V2",
      supersededAt: "2026-08-13T00:00:00.000Z",
    });

    const sql = db.calls.map((call) => call.sql).join("\n");
    expect(sql).toContain("flow_internal.business_sources");
    expect(sql).toContain("flow_internal.source_license_profiles");
    expect(sql).toContain("flow_internal.source_releases");
    expect(sql).toContain("flow_internal.business_knowledge_units");
    expect(sql).toContain("public.workspace_business_knowledge_units");
    expect(sql).toContain("workspace_id = $3::uuid");
    expect(sql).toContain("jsonb_set");
    expect(db.calls.some((call) => call.params.includes(workspaceAlpha))).toBe(
      true,
    );
    expect(sql).not.toContain(workspaceAlpha);
  });
});

describe("business persistence migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../supabase/migrations/20260812000100_business_persistence_foundation.sql",
    ),
    "utf8",
  );

  it("creates public app-facing tables and internal runtime/audit tables without replacing identity", () => {
    for (const tableName of [
      "workspace_configurations",
      "canonical_business_records",
      "canonical_business_relationships",
      "import_sessions",
    ]) {
      expect(migration).toContain(
        `create table if not exists public.${tableName}`,
      );
    }
    for (const tableName of [
      "business_logic_releases",
      "workspace_runtime_manifests",
      "workspace_runtime_slices",
      "calculation_execution_audits",
      "request_idempotency_records",
      "business_audit_events",
    ]) {
      expect(migration).toContain(
        `create table if not exists flow_internal.${tableName}`,
      );
    }
    expect(migration).not.toContain("create table public.users");
    expect(migration).not.toContain(
      "create table public.workspace_memberships",
    );
    expect(migration).not.toContain("auth.users");
  });

  it("enables RLS and keeps internal schema out of ordinary app roles", () => {
    for (const tableName of [
      "workspace_configurations",
      "canonical_business_records",
      "canonical_business_relationships",
      "import_sessions",
    ]) {
      expect(migration).toContain(
        `alter table public.${tableName} enable row level security;`,
      );
    }
    for (const tableName of [
      "business_logic_releases",
      "workspace_runtime_manifests",
      "workspace_runtime_slices",
      "calculation_execution_audits",
      "request_idempotency_records",
      "business_audit_events",
    ]) {
      expect(migration).toContain(
        `alter table flow_internal.${tableName} enable row level security;`,
      );
    }
    expect(migration).toContain(
      "revoke all on schema flow_internal from anon;",
    );
    expect(migration).toContain(
      "revoke all on schema flow_internal from authenticated;",
    );
    expect(migration).not.toMatch(/security\s+definer/i);
    expect(migration).not.toMatch(/create\s+view/i);
  });

  it("proves app-facing RLS policies are workspace-scoped and permission-gated", () => {
    expect(migration).toContain(
      "flow_private.has_active_membership(workspace_id)",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'business_record.write')",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'import.manage')",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'workspace.manage')",
    );
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("using (true)");
  });

  it("enforces cross-workspace relationship integrity with composite foreign keys", () => {
    expect(migration).toContain("unique (id, workspace_id)");
    expect(migration).toContain("foreign key (from_record_id, workspace_id)");
    expect(migration).toContain("foreign key (to_record_id, workspace_id)");
    expect(migration).toContain(
      "references public.canonical_business_records(id, workspace_id)",
    );
  });

  it("uses exact database numeric strategy and governance classifications", () => {
    expect(migration).not.toMatch(/\bdouble precision\b|\breal\b|\bfloat\b/i);
    expect(migration).toContain(
      "data_use_classification text not null default 'WORKSPACE_ONLY'",
    );
    for (const classification of [
      "WORKSPACE_ONLY",
      "EVALUATION_ALLOWED",
      "ANONYMIZED_LEARNING_ALLOWED",
      "TRAINING_ALLOWED",
      "TRAINING_PROHIBITED",
    ]) {
      expect(migration).toContain(classification);
    }
  });

  it("adds material indexes for tenant, semantic, runtime, logic, audit, and idempotency lookups", () => {
    for (const indexName of [
      "workspace_configurations_workspace_fingerprint_idx",
      "canonical_business_records_workspace_semantic_idx",
      "canonical_business_records_workspace_external_idx",
      "canonical_business_relationships_workspace_type_idx",
      "business_logic_releases_lookup_idx",
      "workspace_runtime_manifests_active_idx",
      "workspace_runtime_slices_lookup_idx",
      "calculation_execution_audits_workspace_logic_idx",
      "request_idempotency_records_expiry_idx",
    ]) {
      expect(migration).toContain(`create index if not exists ${indexName}`);
    }
  });

  it("guards approved logic immutability and audit append-only behavior", () => {
    expect(migration).toContain("business_logic_releases_immutable_guard");
    expect(migration).toContain("old.status in ('APPROVED', 'PUBLISHED')");
    expect(migration).toContain(
      "calculation_execution_audits_append_only_guard",
    );
    expect(migration).toContain("business_audit_events_append_only_guard");
  });
});

describe("business skill framework persistence migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../supabase/migrations/20260812000200_business_skill_framework_foundation.sql",
    ),
    "utf8",
  );

  it("creates governed skill and expertise persistence without touching managed schemas", () => {
    for (const tableName of [
      "business_skill_releases",
      "business_skill_dependencies",
      "industry_expertise_releases",
    ]) {
      expect(migration).toContain(
        `create table if not exists flow_internal.${tableName}`,
      );
    }
    for (const tableName of [
      "workspace_skill_installations",
      "workspace_expertise_installations",
    ]) {
      expect(migration).toContain(
        `create table if not exists public.${tableName}`,
      );
    }
    expect(migration).not.toMatch(/\bdrop\b|\btruncate\b|\bdelete\s+from\b/i);
    expect(migration).not.toContain("auth.users");
    expect(migration).not.toContain("storage.");
    expect(migration).not.toContain("realtime.");
    expect(migration).not.toContain("vault.");
  });

  it("extends runtime manifests and slices for historical skill reproducibility", () => {
    for (const column of [
      "available_skill_ids",
      "skill_versions",
      "skill_fingerprints",
      "available_erp_capability_ids",
      "installed_expertise_pack_ids",
      "skill_ids",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain(
      "workspace_runtime_manifests_available_skill_ids_idx",
    );
    expect(migration).toContain("workspace_runtime_slices_skill_ids_idx");
  });

  it("enables RLS, revokes internal schema, and gates public installations by workspace permission", () => {
    expect(migration).toContain(
      "revoke all on schema flow_internal from authenticated;",
    );
    for (const tableName of [
      "business_skill_releases",
      "business_skill_dependencies",
      "industry_expertise_releases",
    ]) {
      expect(migration).toContain(
        `alter table flow_internal.${tableName} enable row level security;`,
      );
    }
    expect(migration).toContain(
      "alter table public.workspace_skill_installations enable row level security;",
    );
    expect(migration).toContain(
      "alter table public.workspace_expertise_installations enable row level security;",
    );
    expect(migration).toContain(
      "flow_private.has_active_membership(workspace_id)",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'skill.install')",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'expertise.install')",
    );
    expect(migration).not.toContain("using (true)");
  });

  it("guards approved releases from mutation and records capability permissions", () => {
    expect(migration).toContain("business_skill_releases_immutable_guard");
    expect(migration).toContain("industry_expertise_releases_immutable_guard");
    expect(migration).toContain("old.status in ('APPROVED', 'PUBLISHED')");
    expect(migration).toContain("'skill.install'");
    expect(migration).toContain("'expertise.install'");
    expect(migration).toContain("'skill.read'");
  });
});

describe("business knowledge governance migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../supabase/migrations/20260813000100_business_knowledge_governance_foundation.sql",
    ),
    "utf8",
  );

  it("creates source, license, release, and knowledge governance tables only in Flow-owned schemas", () => {
    for (const tableName of [
      "business_sources",
      "source_license_profiles",
      "source_releases",
      "business_knowledge_units",
    ]) {
      expect(migration).toContain(
        `create table if not exists flow_internal.${tableName}`,
      );
    }
    expect(migration).toContain(
      "create table if not exists public.workspace_business_knowledge_units",
    );
    expect(migration).not.toMatch(/\bdrop\b|\btruncate\b|\bdelete\s+from\b/i);
    expect(migration).not.toContain("auth.");
    expect(migration).not.toContain("storage.");
    expect(migration).not.toContain("realtime.");
    expect(migration).not.toContain("vault.");
  });

  it("models separated source usage rights and fails closed through explicit review states", () => {
    for (const column of [
      "reference_allowed",
      "mapping_allowed",
      "ingestion_allowed",
      "context_use_allowed",
      "evaluation_use_allowed",
      "model_training_allowed",
      "commercial_training_allowed",
      "redistribution_allowed",
    ]) {
      expect(migration).toContain(column);
    }
    for (const decision of [
      "ALLOWED",
      "PROHIBITED",
      "UNKNOWN_REQUIRES_REVIEW",
    ]) {
      expect(migration).toContain(decision);
    }
    expect(migration).toContain("legal_review_status");
    expect(migration).toContain("training_export.evaluate");
  });

  it("captures claim class, provenance, freshness, and supersession constraints", () => {
    for (const claimType of [
      "CLASSIFICATION_FACT",
      "STANDARD_FACT",
      "STANDARD_MAPPING",
      "DOMAIN_PATTERN",
      "FLOW_DERIVED_PATTERN",
      "REQUIREMENT_HYPOTHESIS",
      "WORKSPACE_FACT",
      "LIVE_EVIDENCE",
      "POLICY",
      "DETERMINISTIC_RESULT",
    ]) {
      expect(migration).toContain(claimType);
    }
    expect(migration).toContain("provenance_fingerprint text not null");
    expect(migration).toContain(
      "business_knowledge_units_no_self_supersession",
    );
    expect(migration).toContain(
      "workspace_business_knowledge_units_no_self_supersession",
    );
    expect(migration).toContain(
      "effective_to is null or effective_to >= effective_from",
    );
    expect(migration).toContain("business_knowledge_units_no_workspace_fact");
  });

  it("keeps internal governance tables inaccessible and gates workspace facts by membership and permission", () => {
    for (const tableName of [
      "business_sources",
      "source_license_profiles",
      "source_releases",
      "business_knowledge_units",
    ]) {
      expect(migration).toContain(
        `alter table flow_internal.${tableName} enable row level security;`,
      );
    }
    expect(migration).toContain(
      "alter table public.workspace_business_knowledge_units enable row level security;",
    );
    expect(migration).toContain(
      "revoke all on schema flow_internal from authenticated;",
    );
    expect(migration).toContain(
      "flow_private.has_active_membership(workspace_id)",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'knowledge.read')",
    );
    expect(migration).toContain(
      "flow_private.has_workspace_permission(workspace_id, 'knowledge.manage')",
    );
    expect(migration).not.toContain("using (true)");
  });

  it("adds indexes for source lookup, training governance, provenance filtering, and workspace scope", () => {
    for (const indexName of [
      "business_sources_status_authority_idx",
      "source_license_profiles_training_idx",
      "source_releases_source_status_effective_idx",
      "business_knowledge_units_claim_status_idx",
      "business_knowledge_units_source_release_idx",
      "business_knowledge_units_permitted_uses_idx",
      "workspace_business_knowledge_units_workspace_status_idx",
      "workspace_business_knowledge_units_source_release_idx",
      "workspace_business_knowledge_units_permitted_uses_idx",
    ]) {
      expect(migration).toContain(`create index if not exists ${indexName}`);
    }
  });
});

describe("business knowledge governance index fix migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../supabase/migrations/20260813000200_business_knowledge_governance_index_fix.sql",
    ),
    "utf8",
  );

  it("adds covering indexes for Task 001.1 knowledge-governance foreign keys", () => {
    for (const indexName of [
      "source_releases_license_profile_fk_idx",
      "source_releases_supersedes_fk_idx",
      "business_knowledge_units_license_profile_fk_idx",
      "business_knowledge_units_source_release_fk_idx",
      "business_knowledge_units_supersedes_fk_idx",
      "workspace_business_knowledge_units_license_profile_fk_idx",
      "workspace_business_knowledge_units_source_fk_idx",
      "workspace_business_knowledge_units_source_release_fk_idx",
    ]) {
      expect(migration).toContain(`create index if not exists ${indexName}`);
    }
    expect(migration).not.toMatch(/\bdrop\b|\btruncate\b|\bdelete\s+from\b/i);
    expect(migration).not.toContain("auth.");
    expect(migration).not.toContain("storage.");
    expect(migration).not.toContain("realtime.");
    expect(migration).not.toContain("vault.");
  });
});

describe("business persistence live integration gate", () => {
  it("keeps Supabase integration tests opt-in and credential-gated", () => {
    const enabled = process.env.FLOW_DB_INTEGRATION_TESTS === "1";

    if (!enabled) {
      expect(enabled).toBe(false);
      return;
    }

    expect(
      process.env.DATABASE_URL || process.env.DATABASE_POOLER_URL,
    ).toBeTruthy();
    expect(process.env.SUPABASE_URL).toBeTruthy();
    expect(process.env.SUPABASE_SECRET_KEY).toBeTruthy();
  });
});
