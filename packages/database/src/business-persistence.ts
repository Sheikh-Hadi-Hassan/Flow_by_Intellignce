import {
  BusinessLanguageRegistry,
  InMemoryBusinessLogicRegistry,
  type BusinessCalculationInputResolver,
  type BusinessCalculationResult,
  type BusinessLanguageRepository,
  type BusinessLanguageSeed,
  type CompiledWorkspaceRuntimeManifest,
  type WorkspaceRuntimeSlice,
} from "@flow/blm-core";
import type {
  BusinessLanguageAlias,
  BusinessLanguageConcept,
  BusinessLanguageLifecycleStatus,
  BusinessLanguageRelation,
  BusinessLogicDefinition,
  BusinessKnowledgeUnit,
  BusinessSource,
  IndustryExpertisePack,
  SemanticId,
  SkillRelease,
  SourceLicenseProfile,
  SourceRelease,
  WorkspaceExpertiseInstallation,
  WorkspaceSkillInstallation,
} from "@flow/blm-contracts";

export type CorpusClassification =
  "SYNTHETIC_CORPUS" | "PUBLIC_REAL_CORPUS" | "WORKSPACE_PRIVATE_CORPUS";

export type DataUseClassification =
  | "WORKSPACE_ONLY"
  | "EVALUATION_ALLOWED"
  | "ANONYMIZED_LEARNING_ALLOWED"
  | "TRAINING_ALLOWED"
  | "TRAINING_PROHIBITED";

export interface CanonicalBusinessRecordPersistence {
  readonly id: string;
  readonly workspaceId: string;
  readonly entityType: string;
  readonly semanticId: SemanticId;
  readonly schemaVersion: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly externalId?: string;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly corpusClassification: CorpusClassification;
  readonly dataUseClassification: DataUseClassification;
  readonly fieldProvenance: Readonly<Record<string, string>>;
  readonly effectiveAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly fingerprint: string;
}

export interface CanonicalBusinessRelationshipPersistence {
  readonly id: string;
  readonly workspaceId: string;
  readonly relationshipType: string;
  readonly fromRecordId: string;
  readonly toRecordId: string;
  readonly semanticRelationshipId: SemanticId;
  readonly effectiveFrom?: string;
  readonly effectiveTo?: string;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly version: number;
  readonly fingerprint: string;
}

export interface ImportSessionPersistence {
  readonly importSessionId: string;
  readonly workspaceId: string;
  readonly sourceType: string;
  readonly sourceSystem: string;
  readonly sourceFingerprint: string;
  readonly mappingVersion: string;
  readonly status:
    | "CREATED"
    | "VALIDATING"
    | "MAPPING"
    | "IMPORTING"
    | "COMPLETED"
    | "PARTIAL"
    | "FAILED"
    | "CANCELLED";
  readonly recordsReceived: number;
  readonly recordsAccepted: number;
  readonly recordsRejected: number;
  readonly dataUseClassification: DataUseClassification;
  readonly privacyClassification: Readonly<Record<string, unknown>>;
  readonly provenanceReleaseId?: string;
}

export interface CalculationAuditPersistence {
  readonly executionId: string;
  readonly requestId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly logicId: SemanticId;
  readonly logicVersion?: string;
  readonly logicFingerprint?: string;
  readonly runtimeFingerprint: string;
  readonly status: BusinessCalculationResult["status"];
  readonly inputFingerprint?: string;
  readonly resultFingerprint?: string;
  readonly resultType?: string;
  readonly unit?: string;
  readonly currency?: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly correlationId: string;
  readonly errorCode?: string;
  readonly warnings: readonly string[];
  readonly recordReferences: readonly string[];
}

export interface IdempotencyPersistence {
  readonly workspaceId: string;
  readonly idempotencyKey: string;
  readonly requestClass: string;
  readonly requestFingerprint: string;
  readonly status: "STARTED" | "COMPLETED" | "FAILED";
  readonly resultReference?: string;
  readonly expiresAt: string;
}

export interface BusinessAuditEventPersistence {
  readonly eventId: string;
  readonly workspaceId?: string;
  readonly actorId?: string;
  readonly eventType: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly occurredAt: string;
  readonly correlationId?: string;
  readonly metadataFingerprint?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CanonicalBusinessRecordRepository {
  saveRecord(record: CanonicalBusinessRecordPersistence): Promise<void>;
  listRecords(input: {
    readonly workspaceId: string;
    readonly semanticIds?: readonly SemanticId[];
    readonly recordIds?: readonly string[];
    readonly limit: number;
  }): Promise<readonly CanonicalBusinessRecordPersistence[]>;
  updateRecord(input: {
    readonly workspaceId: string;
    readonly recordId: string;
    readonly expectedVersion: number;
    readonly payload: Readonly<Record<string, string | number | boolean>>;
    readonly fingerprint: string;
  }): Promise<CanonicalBusinessRecordPersistence>;
}

export interface CanonicalBusinessRelationshipRepository {
  saveRelationship(
    relationship: CanonicalBusinessRelationshipPersistence,
  ): Promise<void>;
  listRelationships(input: {
    readonly workspaceId: string;
    readonly recordId: string;
  }): Promise<readonly CanonicalBusinessRelationshipPersistence[]>;
}

export interface BusinessLogicReleaseRepository {
  saveLogicRelease(definition: BusinessLogicDefinition): Promise<void>;
  resolveLogic(input: {
    readonly logicId: SemanticId;
    readonly asOf: string;
  }): Promise<BusinessLogicDefinition | undefined>;
  listApprovedLogic(): Promise<readonly BusinessLogicDefinition[]>;
}

export interface BusinessSkillReleaseRepository {
  saveSkillRelease(release: SkillRelease): Promise<void>;
  listApprovedSkillReleases(): Promise<readonly SkillRelease[]>;
  resolveSkillRelease(input: {
    readonly skillId: SemanticId;
    readonly version: string;
  }): Promise<SkillRelease | undefined>;
}

export interface IndustryExpertiseReleaseRepository {
  saveIndustryExpertiseRelease(release: IndustryExpertisePack): Promise<void>;
  listApprovedIndustryExpertiseReleases(): Promise<
    readonly IndustryExpertisePack[]
  >;
}

export interface WorkspaceSkillInstallationRepository {
  saveWorkspaceSkillInstallation(
    installation: WorkspaceSkillInstallation,
  ): Promise<void>;
  listWorkspaceSkillInstallations(input: {
    readonly workspaceId: string;
  }): Promise<readonly WorkspaceSkillInstallation[]>;
}

export interface WorkspaceExpertiseInstallationRepository {
  saveWorkspaceExpertiseInstallation(
    installation: WorkspaceExpertiseInstallation,
  ): Promise<void>;
  listWorkspaceExpertiseInstallations(input: {
    readonly workspaceId: string;
  }): Promise<readonly WorkspaceExpertiseInstallation[]>;
}

export interface BusinessKnowledgeGovernanceRepository {
  saveSource(source: BusinessSource): Promise<void>;
  getSource(sourceId: string): Promise<BusinessSource | undefined>;
  saveLicenseProfile(profile: SourceLicenseProfile): Promise<void>;
  getLicenseProfile(
    licenseProfileId: string,
  ): Promise<SourceLicenseProfile | undefined>;
  saveSourceRelease(release: SourceRelease): Promise<void>;
  getSourceRelease(releaseId: string): Promise<SourceRelease | undefined>;
  saveKnowledgeUnit(unit: BusinessKnowledgeUnit): Promise<void>;
  getKnowledgeUnit(
    knowledgeId: string,
  ): Promise<BusinessKnowledgeUnit | undefined>;
  listCurrentKnowledge(input: {
    readonly asOf: string;
    readonly jurisdiction?: string;
    readonly workspaceId?: string;
    readonly limit: number;
  }): Promise<readonly BusinessKnowledgeUnit[]>;
  supersedeKnowledgeUnit(input: {
    readonly previousKnowledgeId: string;
    readonly replacementKnowledgeId: string;
    readonly supersededAt: string;
  }): Promise<void>;
}

export interface WorkspaceRuntimeRepository {
  saveManifest(manifest: CompiledWorkspaceRuntimeManifest): Promise<void>;
  getActiveRuntime(
    workspaceId: string,
  ): Promise<CompiledWorkspaceRuntimeManifest | undefined>;
  loadByFingerprint(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
  }): Promise<CompiledWorkspaceRuntimeManifest | undefined>;
  loadRuntimeSlice(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
    readonly sliceId: string;
  }): Promise<WorkspaceRuntimeSlice | undefined>;
  supersedeRuntime(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
    readonly supersededAt: string;
  }): Promise<void>;
}

export interface ImportSessionRepository {
  saveImportSession(session: ImportSessionPersistence): Promise<void>;
  updateImportSession(input: {
    readonly workspaceId: string;
    readonly importSessionId: string;
    readonly status: ImportSessionPersistence["status"];
    readonly recordsAccepted: number;
    readonly recordsRejected: number;
  }): Promise<ImportSessionPersistence>;
}

export interface CalculationAuditRepository {
  appendCalculationAudit(audit: CalculationAuditPersistence): Promise<void>;
  listCalculationAudits(input: {
    readonly workspaceId: string;
  }): Promise<readonly CalculationAuditPersistence[]>;
}

export interface IdempotencyRepository {
  reserve(record: IdempotencyPersistence): Promise<"RESERVED" | "DUPLICATE">;
}

export interface BusinessAuditRepository {
  appendBusinessAudit(event: BusinessAuditEventPersistence): Promise<void>;
}

export interface SqlExecutor {
  query<T>(
    sql: string,
    params: readonly unknown[],
  ): Promise<{ readonly rows: T[] }>;
}

export class InMemoryBusinessPersistenceRepository
  implements
    CanonicalBusinessRecordRepository,
    CanonicalBusinessRelationshipRepository,
    BusinessLogicReleaseRepository,
    BusinessSkillReleaseRepository,
    IndustryExpertiseReleaseRepository,
    WorkspaceSkillInstallationRepository,
    WorkspaceExpertiseInstallationRepository,
    BusinessKnowledgeGovernanceRepository,
    WorkspaceRuntimeRepository,
    ImportSessionRepository,
    CalculationAuditRepository,
    IdempotencyRepository,
    BusinessAuditRepository,
    BusinessCalculationInputResolver
{
  private readonly records = new Map<
    string,
    CanonicalBusinessRecordPersistence
  >();
  private readonly relationships = new Map<
    string,
    CanonicalBusinessRelationshipPersistence
  >();
  private readonly logic = new Map<string, BusinessLogicDefinition>();
  private readonly skillReleases = new Map<string, SkillRelease>();
  private readonly expertiseReleases = new Map<string, IndustryExpertisePack>();
  private readonly skillInstallations = new Map<
    string,
    WorkspaceSkillInstallation
  >();
  private readonly expertiseInstallations = new Map<
    string,
    WorkspaceExpertiseInstallation
  >();
  private readonly governedSources = new Map<string, BusinessSource>();
  private readonly sourceReleases = new Map<string, SourceRelease>();
  private readonly licenseProfiles = new Map<string, SourceLicenseProfile>();
  private readonly knowledgeUnits = new Map<string, BusinessKnowledgeUnit>();
  private readonly manifests = new Map<
    string,
    CompiledWorkspaceRuntimeManifest
  >();
  private readonly sessions = new Map<string, ImportSessionPersistence>();
  private readonly audits: CalculationAuditPersistence[] = [];
  private readonly idempotency = new Map<string, IdempotencyPersistence>();
  private readonly businessAudits: BusinessAuditEventPersistence[] = [];

  saveRecord(record: CanonicalBusinessRecordPersistence): Promise<void> {
    this.records.set(recordKey(record.workspaceId, record.id), record);
    return Promise.resolve();
  }

  listRecords(input: {
    readonly workspaceId: string;
    readonly semanticIds?: readonly SemanticId[];
    readonly recordIds?: readonly string[];
    readonly limit: number;
  }): Promise<readonly CanonicalBusinessRecordPersistence[]> {
    return Promise.resolve(
      [...this.records.values()]
        .filter((record) => record.workspaceId === input.workspaceId)
        .filter(
          (record) =>
            !input.semanticIds || input.semanticIds.includes(record.semanticId),
        )
        .filter(
          (record) => !input.recordIds || input.recordIds.includes(record.id),
        )
        .slice(0, input.limit),
    );
  }

  updateRecord(input: {
    readonly workspaceId: string;
    readonly recordId: string;
    readonly expectedVersion: number;
    readonly payload: Readonly<Record<string, string | number | boolean>>;
    readonly fingerprint: string;
  }): Promise<CanonicalBusinessRecordPersistence> {
    const key = recordKey(input.workspaceId, input.recordId);
    const current = this.records.get(key);
    if (!current) return Promise.reject(new Error("Record not found."));
    if (current.version !== input.expectedVersion) {
      return Promise.reject(new Error("Optimistic concurrency conflict."));
    }
    const updated = {
      ...current,
      payload: input.payload,
      fingerprint: input.fingerprint,
      version: current.version + 1,
      updatedAt: "2026-08-12T00:00:00.000Z",
    };
    this.records.set(key, updated);
    return Promise.resolve(updated);
  }

  saveRelationship(
    relationship: CanonicalBusinessRelationshipPersistence,
  ): Promise<void> {
    const from = this.records.get(
      recordKey(relationship.workspaceId, relationship.fromRecordId),
    );
    const to = this.records.get(
      recordKey(relationship.workspaceId, relationship.toRecordId),
    );
    if (!from || !to) {
      return Promise.reject(new Error("Relationship cannot cross workspaces."));
    }
    this.relationships.set(
      recordKey(relationship.workspaceId, relationship.id),
      relationship,
    );
    return Promise.resolve();
  }

  listRelationships(input: {
    readonly workspaceId: string;
    readonly recordId: string;
  }): Promise<readonly CanonicalBusinessRelationshipPersistence[]> {
    return Promise.resolve(
      [...this.relationships.values()].filter(
        (relationship) =>
          relationship.workspaceId === input.workspaceId &&
          (relationship.fromRecordId === input.recordId ||
            relationship.toRecordId === input.recordId),
      ),
    );
  }

  saveLogicRelease(definition: BusinessLogicDefinition): Promise<void> {
    const key = `${definition.logicId}:${definition.version}`;
    const current = this.logic.get(key);
    if (
      current &&
      (current.status === "APPROVED" || current.status === "PUBLISHED") &&
      current.fingerprint !== definition.fingerprint
    ) {
      return Promise.reject(new Error("Published logic is immutable."));
    }
    this.logic.set(key, definition);
    return Promise.resolve();
  }

  resolveLogic(input: {
    readonly logicId: SemanticId;
    readonly asOf: string;
  }): Promise<BusinessLogicDefinition | undefined> {
    return Promise.resolve(
      [...this.logic.values()].find(
        (definition) =>
          definition.logicId === input.logicId &&
          (definition.status === "APPROVED" ||
            definition.status === "PUBLISHED") &&
          definition.effectiveFrom <= input.asOf &&
          (!definition.effectiveTo || definition.effectiveTo >= input.asOf),
      ),
    );
  }

  listApprovedLogic(): Promise<readonly BusinessLogicDefinition[]> {
    return Promise.resolve(
      [...this.logic.values()].filter(
        (definition) =>
          definition.status === "APPROVED" || definition.status === "PUBLISHED",
      ),
    );
  }

  saveSkillRelease(release: SkillRelease): Promise<void> {
    const key = `${release.skillId}:${release.version}`;
    const current = this.skillReleases.get(key);
    if (
      current &&
      (current.status === "APPROVED" || current.status === "PUBLISHED") &&
      current.fingerprint !== release.fingerprint
    ) {
      return Promise.reject(new Error("Published skill release is immutable."));
    }
    this.skillReleases.set(key, release);
    return Promise.resolve();
  }

  listApprovedSkillReleases(): Promise<readonly SkillRelease[]> {
    return Promise.resolve(
      [...this.skillReleases.values()].filter(
        (release) =>
          release.status === "APPROVED" || release.status === "PUBLISHED",
      ),
    );
  }

  resolveSkillRelease(input: {
    readonly skillId: SemanticId;
    readonly version: string;
  }): Promise<SkillRelease | undefined> {
    return Promise.resolve(
      this.skillReleases.get(`${input.skillId}:${input.version}`),
    );
  }

  saveIndustryExpertiseRelease(release: IndustryExpertisePack): Promise<void> {
    this.expertiseReleases.set(`${release.packId}:${release.version}`, release);
    return Promise.resolve();
  }

  listApprovedIndustryExpertiseReleases(): Promise<
    readonly IndustryExpertisePack[]
  > {
    return Promise.resolve(
      [...this.expertiseReleases.values()].filter(
        (release) =>
          release.status === "APPROVED" || release.status === "PUBLISHED",
      ),
    );
  }

  saveWorkspaceSkillInstallation(
    installation: WorkspaceSkillInstallation,
  ): Promise<void> {
    this.skillInstallations.set(
      `${installation.workspaceId}:${installation.skillId}:${installation.skillVersion}`,
      installation,
    );
    return Promise.resolve();
  }

  listWorkspaceSkillInstallations(input: {
    readonly workspaceId: string;
  }): Promise<readonly WorkspaceSkillInstallation[]> {
    return Promise.resolve(
      [...this.skillInstallations.values()].filter(
        (installation) => installation.workspaceId === input.workspaceId,
      ),
    );
  }

  saveWorkspaceExpertiseInstallation(
    installation: WorkspaceExpertiseInstallation,
  ): Promise<void> {
    this.expertiseInstallations.set(
      `${installation.workspaceId}:${installation.expertisePackId}:${installation.expertiseVersion}`,
      installation,
    );
    return Promise.resolve();
  }

  listWorkspaceExpertiseInstallations(input: {
    readonly workspaceId: string;
  }): Promise<readonly WorkspaceExpertiseInstallation[]> {
    return Promise.resolve(
      [...this.expertiseInstallations.values()].filter(
        (installation) => installation.workspaceId === input.workspaceId,
      ),
    );
  }

  saveSource(source: BusinessSource): Promise<void> {
    this.governedSources.set(source.sourceId, source);
    return Promise.resolve();
  }

  getSource(sourceId: string): Promise<BusinessSource | undefined> {
    return Promise.resolve(this.governedSources.get(sourceId));
  }

  saveLicenseProfile(profile: SourceLicenseProfile): Promise<void> {
    this.licenseProfiles.set(profile.licenseProfileId, profile);
    return Promise.resolve();
  }

  getLicenseProfile(
    licenseProfileId: string,
  ): Promise<SourceLicenseProfile | undefined> {
    return Promise.resolve(this.licenseProfiles.get(licenseProfileId));
  }

  saveSourceRelease(release: SourceRelease): Promise<void> {
    const current = this.sourceReleases.get(release.releaseId);
    if (current && current.contentFingerprint !== release.contentFingerprint) {
      return Promise.reject(
        new Error("Historical source release is immutable."),
      );
    }
    this.sourceReleases.set(release.releaseId, release);
    return Promise.resolve();
  }

  getSourceRelease(releaseId: string): Promise<SourceRelease | undefined> {
    return Promise.resolve(this.sourceReleases.get(releaseId));
  }

  saveKnowledgeUnit(unit: BusinessKnowledgeUnit): Promise<void> {
    const current = this.knowledgeUnits.get(unit.knowledgeId);
    if (
      current &&
      current.provenanceFingerprint !== unit.provenanceFingerprint
    ) {
      return Promise.reject(
        new Error("Historical knowledge unit is immutable."),
      );
    }
    this.knowledgeUnits.set(unit.knowledgeId, unit);
    return Promise.resolve();
  }

  getKnowledgeUnit(
    knowledgeId: string,
  ): Promise<BusinessKnowledgeUnit | undefined> {
    return Promise.resolve(this.knowledgeUnits.get(knowledgeId));
  }

  listCurrentKnowledge(input: {
    readonly asOf: string;
    readonly jurisdiction?: string;
    readonly workspaceId?: string;
    readonly limit: number;
  }): Promise<readonly BusinessKnowledgeUnit[]> {
    return Promise.resolve(
      [...this.knowledgeUnits.values()]
        .filter((unit) => unit.status === "PUBLISHED")
        .filter(
          (unit) =>
            unit.effectiveFrom <= input.asOf &&
            (!unit.effectiveTo || unit.effectiveTo >= input.asOf),
        )
        .filter(
          (unit) =>
            unit.jurisdiction.includes("GLOBAL") ||
            !input.jurisdiction ||
            unit.jurisdiction.includes(input.jurisdiction),
        )
        .filter(
          (unit) =>
            !input.workspaceId ||
            unit.scope === "GLOBAL" ||
            unit.workspaceId === input.workspaceId,
        )
        .slice(0, input.limit),
    );
  }

  supersedeKnowledgeUnit(input: {
    readonly previousKnowledgeId: string;
    readonly replacementKnowledgeId: string;
    readonly supersededAt: string;
  }): Promise<void> {
    const previous = this.knowledgeUnits.get(input.previousKnowledgeId);
    const replacement = this.knowledgeUnits.get(input.replacementKnowledgeId);
    if (!previous || !replacement) {
      return Promise.reject(
        new Error("Knowledge supersession target missing."),
      );
    }
    this.knowledgeUnits.set(input.previousKnowledgeId, {
      ...previous,
      status: "SUPERSEDED",
      supersededByKnowledgeId: input.replacementKnowledgeId,
      updatedAt: input.supersededAt,
    });
    return Promise.resolve();
  }

  saveManifest(manifest: CompiledWorkspaceRuntimeManifest): Promise<void> {
    this.manifests.set(
      runtimeKey(manifest.workspaceId, manifest.runtimeFingerprint),
      manifest,
    );
    return Promise.resolve();
  }

  getActiveRuntime(
    workspaceId: string,
  ): Promise<CompiledWorkspaceRuntimeManifest | undefined> {
    return Promise.resolve(
      [...this.manifests.values()]
        .filter((manifest) => manifest.workspaceId === workspaceId)
        .at(-1),
    );
  }

  loadByFingerprint(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
  }): Promise<CompiledWorkspaceRuntimeManifest | undefined> {
    return Promise.resolve(
      this.manifests.get(
        runtimeKey(input.workspaceId, input.runtimeFingerprint),
      ),
    );
  }

  async loadRuntimeSlice(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
    readonly sliceId: string;
  }): Promise<WorkspaceRuntimeSlice | undefined> {
    const manifest = await this.loadByFingerprint(input);
    return manifest?.runtimeSliceIndex.find(
      (slice) => slice.sliceId === input.sliceId,
    );
  }

  supersedeRuntime(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
    readonly supersededAt: string;
  }): Promise<void> {
    void input.supersededAt;
    return Promise.resolve();
  }

  saveImportSession(session: ImportSessionPersistence): Promise<void> {
    const duplicate = [...this.sessions.values()].find(
      (item) =>
        item.workspaceId === session.workspaceId &&
        item.sourceFingerprint === session.sourceFingerprint &&
        item.mappingVersion === session.mappingVersion,
    );
    if (duplicate && duplicate.importSessionId !== session.importSessionId) {
      return Promise.reject(new Error("Duplicate import source fingerprint."));
    }
    this.sessions.set(
      recordKey(session.workspaceId, session.importSessionId),
      session,
    );
    return Promise.resolve();
  }

  updateImportSession(input: {
    readonly workspaceId: string;
    readonly importSessionId: string;
    readonly status: ImportSessionPersistence["status"];
    readonly recordsAccepted: number;
    readonly recordsRejected: number;
  }): Promise<ImportSessionPersistence> {
    const key = recordKey(input.workspaceId, input.importSessionId);
    const current = this.sessions.get(key);
    if (!current) return Promise.reject(new Error("Import session not found."));
    const updated = { ...current, ...input };
    this.sessions.set(key, updated);
    return Promise.resolve(updated);
  }

  appendCalculationAudit(audit: CalculationAuditPersistence): Promise<void> {
    this.audits.push(audit);
    return Promise.resolve();
  }

  listCalculationAudits(input: {
    readonly workspaceId: string;
  }): Promise<readonly CalculationAuditPersistence[]> {
    return Promise.resolve(
      this.audits.filter((audit) => audit.workspaceId === input.workspaceId),
    );
  }

  reserve(record: IdempotencyPersistence): Promise<"RESERVED" | "DUPLICATE"> {
    const key = recordKey(record.workspaceId, record.idempotencyKey);
    if (this.idempotency.has(key)) return Promise.resolve("DUPLICATE");
    this.idempotency.set(key, record);
    return Promise.resolve("RESERVED");
  }

  appendBusinessAudit(event: BusinessAuditEventPersistence): Promise<void> {
    this.businessAudits.push(event);
    return Promise.resolve();
  }

  resolve(input: {
    readonly workspaceId: string;
    readonly actor: { readonly permissionIds: readonly string[] };
    readonly recordReferences: readonly string[];
    readonly requiredInputs: readonly string[];
  }): Readonly<Record<string, string | number | boolean>> {
    const selected = [...this.records.values()].filter(
      (record) =>
        record.workspaceId === input.workspaceId &&
        input.recordReferences.includes(record.id),
    );
    return Object.fromEntries(
      input.requiredInputs.flatMap((field) => {
        for (const record of selected) {
          const value = record.payload[field];
          if (value !== undefined) return [[field, value] as const];
        }
        return [];
      }),
    );
  }
}

export class PostgresCanonicalBusinessRecordRepository implements CanonicalBusinessRecordRepository {
  constructor(private readonly db: SqlExecutor) {}

  async saveRecord(record: CanonicalBusinessRecordPersistence): Promise<void> {
    await this.db.query(
      `insert into public.canonical_business_records
        (id, workspace_id, entity_type, semantic_id, schema_version, source_type, source_id, external_id, payload, provenance, corpus_classification, data_use_classification, field_provenance, effective_at, version, fingerprint)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13::jsonb,$14,$15,$16)
       on conflict (workspace_id, source_type, source_id, external_id, schema_version) do nothing`,
      [
        record.id,
        record.workspaceId,
        record.entityType,
        record.semanticId,
        record.schemaVersion,
        record.sourceType,
        record.sourceId,
        record.externalId ?? null,
        JSON.stringify(record.payload),
        JSON.stringify(record.provenance),
        record.corpusClassification,
        record.dataUseClassification,
        JSON.stringify(record.fieldProvenance),
        record.effectiveAt ?? null,
        record.version,
        record.fingerprint,
      ],
    );
  }

  async listRecords(input: {
    readonly workspaceId: string;
    readonly semanticIds?: readonly SemanticId[];
    readonly recordIds?: readonly string[];
    readonly limit: number;
  }): Promise<readonly CanonicalBusinessRecordPersistence[]> {
    const result = await this.db.query<CanonicalBusinessRecordPersistence>(
      `select *
       from public.canonical_business_records
       where workspace_id = $1
         and ($2::text[] is null or semantic_id = any($2::text[]))
         and ($3::uuid[] is null or id = any($3::uuid[]))
       order by updated_at desc
       limit $4`,
      [
        input.workspaceId,
        input.semanticIds ? [...input.semanticIds] : null,
        input.recordIds ?? null,
        input.limit,
      ],
    );
    return result.rows;
  }

  async updateRecord(input: {
    readonly workspaceId: string;
    readonly recordId: string;
    readonly expectedVersion: number;
    readonly payload: Readonly<Record<string, string | number | boolean>>;
    readonly fingerprint: string;
  }): Promise<CanonicalBusinessRecordPersistence> {
    const result = await this.db.query<CanonicalBusinessRecordPersistence>(
      `update public.canonical_business_records
       set payload = $1::jsonb,
           fingerprint = $2,
           version = version + 1,
           updated_at = now()
       where workspace_id = $3
         and id = $4
         and version = $5
       returning *`,
      [
        JSON.stringify(input.payload),
        input.fingerprint,
        input.workspaceId,
        input.recordId,
        input.expectedVersion,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Optimistic concurrency conflict.");
    return row;
  }
}

export class PostgresBusinessLogicRegistry {
  constructor(private readonly db: SqlExecutor) {}

  async saveLogicRelease(definition: BusinessLogicDefinition): Promise<void> {
    await this.db.query(
      `insert into flow_internal.business_logic_releases
        (logic_id, version, logic_type, status, scope, industry, jurisdiction, business_type, workspace_id, effective_from, effective_to, input_schema, output_schema, implementation_id, dependencies, provenance, approval_metadata, fingerprint, supersedes, superseded_by)
       values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18,$19,$20)
       on conflict (logic_id, version) do nothing`,
      [
        definition.logicId,
        definition.version,
        definition.logicType,
        definition.status,
        JSON.stringify(definition.scope),
        definition.scope.industry ?? null,
        definition.scope.jurisdiction ?? null,
        definition.scope.businessType ?? null,
        definition.scope.workspaceId ?? null,
        definition.effectiveFrom,
        definition.effectiveTo ?? null,
        JSON.stringify(definition.inputSchema),
        JSON.stringify(definition.outputSchema),
        definition.implementationType === "DETERMINISTIC_FUNCTION"
          ? definition.logicId
          : null,
        JSON.stringify([]),
        JSON.stringify(definition.provenance),
        JSON.stringify({ approvalStatus: definition.approvalStatus }),
        definition.fingerprint,
        definition.supersedes ?? null,
        definition.supersededBy ?? null,
      ],
    );
  }

  async listApprovedLogic(): Promise<readonly BusinessLogicDefinition[]> {
    const result = await this.db.query<BusinessLogicDefinition>(
      `select *
       from flow_internal.business_logic_releases
       where status in ('APPROVED', 'PUBLISHED')
       order by logic_id, version`,
      [],
    );
    return result.rows;
  }

  async resolveLogic(input: {
    readonly logicId: SemanticId;
    readonly asOf: string;
  }): Promise<BusinessLogicDefinition | undefined> {
    const result = await this.db.query<BusinessLogicDefinition>(
      `select *
       from flow_internal.business_logic_releases
       where logic_id = $1
         and status in ('APPROVED', 'PUBLISHED')
         and effective_from <= $2::date
         and (effective_to is null or effective_to >= $2::date)
       order by
         case
           when workspace_id is not null then 5
           when business_type is not null then 4
           when jurisdiction is not null then 3
           when industry is not null then 2
           else 1
         end desc,
         version desc
       limit 1`,
      [input.logicId, input.asOf],
    );
    return result.rows[0];
  }
}

export class PostgresBusinessSkillReleaseRepository implements BusinessSkillReleaseRepository {
  constructor(private readonly db: SqlExecutor) {}

  async saveSkillRelease(release: SkillRelease): Promise<void> {
    await this.db.query(
      `insert into flow_internal.business_skill_releases
        (skill_id, version, status, name, description, authority, execution_mode, risk, domain_ids, required_concept_ids, required_logic_ids, required_policy_ids, required_erp_capabilities, dependencies, evaluation_cases, action_wall_required, release, fingerprint)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17::jsonb,$18)
       on conflict (skill_id, version) do nothing`,
      [
        release.skillId,
        release.version,
        release.status,
        release.name,
        release.description,
        release.authority,
        release.executionMode,
        release.risk,
        JSON.stringify(release.domainIds),
        JSON.stringify(release.requiredConceptIds),
        JSON.stringify(release.requiredLogicIds),
        JSON.stringify(release.requiredPolicyIds),
        JSON.stringify(release.requiredERPCapabilities),
        JSON.stringify(release.dependencies),
        JSON.stringify(release.evaluationCases),
        release.actionWallRequired,
        JSON.stringify(release),
        release.fingerprint,
      ],
    );
  }

  async listApprovedSkillReleases(): Promise<readonly SkillRelease[]> {
    const result = await this.db.query<{ readonly release: SkillRelease }>(
      `select release
       from flow_internal.business_skill_releases
       where status in ('APPROVED', 'PUBLISHED')
       order by skill_id, version`,
      [],
    );
    return result.rows.map((row) => row.release);
  }

  async resolveSkillRelease(input: {
    readonly skillId: SemanticId;
    readonly version: string;
  }): Promise<SkillRelease | undefined> {
    const result = await this.db.query<{ readonly release: SkillRelease }>(
      `select release
       from flow_internal.business_skill_releases
       where skill_id = $1 and version = $2 and status in ('APPROVED', 'PUBLISHED')
       limit 1`,
      [input.skillId, input.version],
    );
    return result.rows[0]?.release;
  }
}

export class PostgresIndustryExpertiseReleaseRepository implements IndustryExpertiseReleaseRepository {
  constructor(private readonly db: SqlExecutor) {}

  async saveIndustryExpertiseRelease(
    release: IndustryExpertisePack,
  ): Promise<void> {
    await this.db.query(
      `insert into flow_internal.industry_expertise_releases
        (pack_id, version, status, industry, business_types, domain_ids, skill_ids, release, fingerprint)
       values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9)
       on conflict (pack_id, version) do nothing`,
      [
        release.packId,
        release.version,
        release.status,
        release.industryId,
        JSON.stringify(release.businessTypeIds),
        JSON.stringify(release.domainIds),
        JSON.stringify(release.skillIds),
        JSON.stringify(release),
        release.fingerprint,
      ],
    );
  }

  async listApprovedIndustryExpertiseReleases(): Promise<
    readonly IndustryExpertisePack[]
  > {
    const result = await this.db.query<{
      readonly release: IndustryExpertisePack;
    }>(
      `select release
       from flow_internal.industry_expertise_releases
       where status in ('APPROVED', 'PUBLISHED')
       order by pack_id, version`,
      [],
    );
    return result.rows.map((row) => row.release);
  }
}

export class PostgresWorkspaceSkillInstallationRepository implements WorkspaceSkillInstallationRepository {
  constructor(private readonly db: SqlExecutor) {}

  async saveWorkspaceSkillInstallation(
    installation: WorkspaceSkillInstallation,
  ): Promise<void> {
    await this.db.query(
      `insert into public.workspace_skill_installations
        (workspace_id, skill_id, skill_version, status, installed_at, installed_by, configuration, configuration_fingerprint, runtime_fingerprint, effective_from, effective_to)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)
       on conflict (workspace_id, skill_id, skill_version) do update
       set status = excluded.status,
           configuration = excluded.configuration,
           configuration_fingerprint = excluded.configuration_fingerprint,
           runtime_fingerprint = excluded.runtime_fingerprint,
           effective_from = excluded.effective_from,
           effective_to = excluded.effective_to`,
      [
        installation.workspaceId,
        installation.skillId,
        installation.skillVersion,
        installation.status,
        installation.installedAt,
        installation.installedBy,
        JSON.stringify({}),
        installation.configurationFingerprint,
        installation.runtimeFingerprint ?? null,
        installation.effectiveFrom,
        installation.effectiveTo ?? null,
      ],
    );
  }

  async listWorkspaceSkillInstallations(input: {
    readonly workspaceId: string;
  }): Promise<readonly WorkspaceSkillInstallation[]> {
    const result = await this.db.query<WorkspaceSkillInstallation>(
      `select workspace_id as "workspaceId",
              skill_id as "skillId",
              skill_version as "skillVersion",
              status,
              installed_at as "installedAt",
              installed_by as "installedBy",
              configuration,
              configuration_fingerprint as "configurationFingerprint",
              runtime_fingerprint as "runtimeFingerprint",
              effective_from as "effectiveFrom",
              effective_to as "effectiveTo"
       from public.workspace_skill_installations
       where workspace_id = $1
       order by skill_id, skill_version`,
      [input.workspaceId],
    );
    return result.rows;
  }
}

export class PostgresWorkspaceExpertiseInstallationRepository implements WorkspaceExpertiseInstallationRepository {
  constructor(private readonly db: SqlExecutor) {}

  async saveWorkspaceExpertiseInstallation(
    installation: WorkspaceExpertiseInstallation,
  ): Promise<void> {
    await this.db.query(
      `insert into public.workspace_expertise_installations
        (workspace_id, expertise_pack_id, expertise_version, status, installed_at, installed_by, configuration, configuration_fingerprint, effective_from, effective_to)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
       on conflict (workspace_id, expertise_pack_id, expertise_version) do update
       set status = excluded.status,
           configuration = excluded.configuration,
           configuration_fingerprint = excluded.configuration_fingerprint,
           effective_from = excluded.effective_from,
           effective_to = excluded.effective_to`,
      [
        installation.workspaceId,
        installation.expertisePackId,
        installation.expertiseVersion,
        installation.status,
        installation.installedAt,
        installation.installedBy,
        JSON.stringify({}),
        installation.configurationFingerprint,
        installation.effectiveFrom,
        installation.effectiveTo ?? null,
      ],
    );
  }

  async listWorkspaceExpertiseInstallations(input: {
    readonly workspaceId: string;
  }): Promise<readonly WorkspaceExpertiseInstallation[]> {
    const result = await this.db.query<WorkspaceExpertiseInstallation>(
      `select workspace_id as "workspaceId",
              expertise_pack_id as "expertisePackId",
              expertise_version as "expertiseVersion",
              status,
              installed_at as "installedAt",
              installed_by as "installedBy",
              configuration,
              configuration_fingerprint as "configurationFingerprint",
              effective_from as "effectiveFrom",
              effective_to as "effectiveTo"
       from public.workspace_expertise_installations
       where workspace_id = $1
       order by expertise_pack_id, expertise_version`,
      [input.workspaceId],
    );
    return result.rows;
  }
}

export class PostgresBusinessKnowledgeGovernanceRepository implements BusinessKnowledgeGovernanceRepository {
  constructor(private readonly db: SqlExecutor) {}

  async saveSource(source: BusinessSource): Promise<void> {
    await this.db.query(
      `insert into flow_internal.business_sources
        (source_id, canonical_name, source_type, publisher, authority_class, description, homepage_locator, default_jurisdiction, default_language, status, source)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11::jsonb)
       on conflict (source_id) do update
       set canonical_name = excluded.canonical_name,
           source_type = excluded.source_type,
           publisher = excluded.publisher,
           authority_class = excluded.authority_class,
           description = excluded.description,
           homepage_locator = excluded.homepage_locator,
           default_jurisdiction = excluded.default_jurisdiction,
           default_language = excluded.default_language,
           status = excluded.status,
           source = excluded.source,
           updated_at = now()`,
      [
        source.sourceId,
        source.canonicalName,
        source.sourceType,
        source.publisher,
        source.authorityClass,
        source.description,
        source.homepageLocator ?? null,
        JSON.stringify(source.defaultJurisdiction),
        JSON.stringify(source.defaultLanguage),
        source.status,
        JSON.stringify(source),
      ],
    );
  }

  async getSource(sourceId: string): Promise<BusinessSource | undefined> {
    const result = await this.db.query<{ readonly source: BusinessSource }>(
      `select source
       from flow_internal.business_sources
       where source_id = $1
       limit 1`,
      [sourceId],
    );
    return result.rows[0]?.source;
  }

  async saveLicenseProfile(profile: SourceLicenseProfile): Promise<void> {
    await this.db.query(
      `insert into flow_internal.source_license_profiles
        (license_profile_id, reference_allowed, mapping_allowed, ingestion_allowed, context_use_allowed, evaluation_use_allowed, model_training_allowed, commercial_training_allowed, redistribution_allowed, attribution_required, license_name, license_reference, restrictions, notes, legal_review_status, legal_reviewed_at, legal_reviewed_by, profile)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18::jsonb)
       on conflict (license_profile_id) do update
       set reference_allowed = excluded.reference_allowed,
           mapping_allowed = excluded.mapping_allowed,
           ingestion_allowed = excluded.ingestion_allowed,
           context_use_allowed = excluded.context_use_allowed,
           evaluation_use_allowed = excluded.evaluation_use_allowed,
           model_training_allowed = excluded.model_training_allowed,
           commercial_training_allowed = excluded.commercial_training_allowed,
           redistribution_allowed = excluded.redistribution_allowed,
           attribution_required = excluded.attribution_required,
           license_name = excluded.license_name,
           license_reference = excluded.license_reference,
           restrictions = excluded.restrictions,
           notes = excluded.notes,
           legal_review_status = excluded.legal_review_status,
           legal_reviewed_at = excluded.legal_reviewed_at,
           legal_reviewed_by = excluded.legal_reviewed_by,
           profile = excluded.profile,
           updated_at = now()`,
      [
        profile.licenseProfileId,
        profile.referenceAllowed,
        profile.mappingAllowed,
        profile.ingestionAllowed,
        profile.contextUseAllowed,
        profile.evaluationUseAllowed,
        profile.modelTrainingAllowed,
        profile.commercialTrainingAllowed,
        profile.redistributionAllowed,
        profile.attributionRequired,
        profile.licenseName,
        profile.licenseReference ?? null,
        JSON.stringify(profile.restrictions),
        profile.notes,
        profile.legalReviewStatus,
        profile.legalReviewedAt ?? null,
        profile.legalReviewedBy ?? null,
        JSON.stringify(profile),
      ],
    );
  }

  async getLicenseProfile(
    licenseProfileId: string,
  ): Promise<SourceLicenseProfile | undefined> {
    const result = await this.db.query<{
      readonly profile: SourceLicenseProfile;
    }>(
      `select profile
       from flow_internal.source_license_profiles
       where license_profile_id = $1
       limit 1`,
      [licenseProfileId],
    );
    return result.rows[0]?.profile;
  }

  async saveSourceRelease(release: SourceRelease): Promise<void> {
    await this.db.query(
      `insert into flow_internal.source_releases
        (release_id, source_id, version, release_name, published_at, observed_at, effective_from, effective_to, status, supersedes_release_id, content_fingerprint, metadata_fingerprint, license_profile_id, jurisdiction, languages, source_locator, machine_readable_locator, review_status, reviewed_at, reviewed_by, release)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,$18,$19,$20,$21::jsonb)
       on conflict (release_id) do nothing`,
      [
        release.releaseId,
        release.sourceId,
        release.version,
        release.releaseName,
        release.publishedAt ?? null,
        release.observedAt,
        release.effectiveFrom,
        release.effectiveTo ?? null,
        release.status,
        release.supersedesReleaseId ?? null,
        release.contentFingerprint,
        release.metadataFingerprint,
        release.licenseProfileId,
        JSON.stringify(release.jurisdiction),
        JSON.stringify(release.languages),
        release.sourceLocator,
        release.machineReadableLocator ?? null,
        release.reviewStatus,
        release.reviewedAt ?? null,
        release.reviewedBy ?? null,
        JSON.stringify(release),
      ],
    );
  }

  async getSourceRelease(
    releaseId: string,
  ): Promise<SourceRelease | undefined> {
    const result = await this.db.query<{ readonly release: SourceRelease }>(
      `select release
       from flow_internal.source_releases
       where release_id = $1
       limit 1`,
      [releaseId],
    );
    return result.rows[0]?.release;
  }

  async saveKnowledgeUnit(unit: BusinessKnowledgeUnit): Promise<void> {
    const tableName = knowledgeTable(unit.scope);
    await this.db.query(
      `insert into ${tableName}
        (knowledge_id, claim_type, subject_id, predicate, object_value, canonical_concept_refs, relation_refs, source_id, source_release_id, source_locator, source_authority, source_version, source_published_at, source_observed_at, jurisdiction, effective_from, effective_to, license_profile_id, permitted_uses, confidence, review_status, reviewed_by, reviewed_at, review_evidence, provenance_fingerprint, supersedes_knowledge_id, superseded_by_knowledge_id, status, scope, workspace_id, knowledge)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19::jsonb,$20,$21,$22,$23,$24::jsonb,$25,$26,$27,$28,$29,$30,$31::jsonb)
       on conflict (knowledge_id) do nothing`,
      [
        unit.knowledgeId,
        unit.claimType,
        unit.subjectId,
        unit.predicate,
        unit.object,
        JSON.stringify(unit.canonicalConceptRefs),
        JSON.stringify(unit.relationRefs),
        unit.sourceId,
        unit.sourceReleaseId,
        unit.sourceLocator,
        unit.sourceAuthority,
        unit.sourceVersion,
        unit.sourcePublishedAt ?? null,
        unit.sourceObservedAt,
        JSON.stringify(unit.jurisdiction),
        unit.effectiveFrom,
        unit.effectiveTo ?? null,
        unit.licenseProfileId,
        JSON.stringify(unit.permittedUses),
        unit.confidence,
        unit.reviewStatus,
        unit.reviewedBy ?? null,
        unit.reviewedAt ?? null,
        JSON.stringify(unit.reviewEvidence),
        unit.provenanceFingerprint,
        unit.supersedesKnowledgeId ?? null,
        unit.supersededByKnowledgeId ?? null,
        unit.status,
        unit.scope,
        unit.workspaceId ?? null,
        JSON.stringify(unit),
      ],
    );
  }

  async getKnowledgeUnit(
    knowledgeId: string,
  ): Promise<BusinessKnowledgeUnit | undefined> {
    const result = await this.db.query<{
      readonly knowledge: BusinessKnowledgeUnit;
    }>(
      `select knowledge
       from flow_internal.business_knowledge_units
       where knowledge_id = $1
       union all
       select knowledge
       from public.workspace_business_knowledge_units
       where knowledge_id = $1
       limit 1`,
      [knowledgeId],
    );
    return result.rows[0]?.knowledge;
  }

  async listCurrentKnowledge(input: {
    readonly asOf: string;
    readonly jurisdiction?: string;
    readonly workspaceId?: string;
    readonly limit: number;
  }): Promise<readonly BusinessKnowledgeUnit[]> {
    const result = await this.db.query<{
      readonly knowledge: BusinessKnowledgeUnit;
    }>(
      `select knowledge, updated_at
       from flow_internal.business_knowledge_units
       where status = 'PUBLISHED'
         and effective_from <= $1::date
         and (effective_to is null or effective_to >= $1::date)
         and (jurisdiction ? 'GLOBAL' or $2::text is null or jurisdiction ? $2::text)
       union all
       select knowledge, updated_at
       from public.workspace_business_knowledge_units
       where status = 'PUBLISHED'
         and workspace_id = $3::uuid
         and effective_from <= $1::date
         and (effective_to is null or effective_to >= $1::date)
         and (jurisdiction ? 'GLOBAL' or $2::text is null or jurisdiction ? $2::text)
       order by updated_at desc
       limit $4`,
      [
        input.asOf,
        input.jurisdiction ?? null,
        input.workspaceId ?? "00000000-0000-0000-0000-000000000000",
        input.limit,
      ],
    );
    return result.rows.map((row) => row.knowledge);
  }

  async supersedeKnowledgeUnit(input: {
    readonly previousKnowledgeId: string;
    readonly replacementKnowledgeId: string;
    readonly supersededAt: string;
  }): Promise<void> {
    for (const tableName of [
      "flow_internal.business_knowledge_units",
      "public.workspace_business_knowledge_units",
    ]) {
      await this.db.query(
        `update ${tableName}
         set status = 'SUPERSEDED',
             superseded_by_knowledge_id = $2,
             knowledge = jsonb_set(
               jsonb_set(knowledge, '{status}', '"SUPERSEDED"', false),
               '{supersededByKnowledgeId}',
               to_jsonb($2::text),
               true
             ),
             updated_at = $3::timestamptz
         where knowledge_id = $1`,
        [
          input.previousKnowledgeId,
          input.replacementKnowledgeId,
          input.supersededAt,
        ],
      );
    }
  }
}

export class PostgresBusinessLanguageRepository implements BusinessLanguageRepository {
  constructor(private readonly db: SqlExecutor) {}

  async saveSeed(seed: BusinessLanguageSeed): Promise<void> {
    for (const concept of seed.concepts) {
      await this.persistConcept(concept);
    }
    for (const alias of seed.aliases) {
      await this.persistAlias(alias);
    }
    for (const relation of seed.relations) {
      await this.persistRelation(relation);
    }
  }

  async loadSeed(): Promise<BusinessLanguageSeed> {
    const concepts = await this.listConcepts({ status: "ACTIVE" });
    const aliasResult = await this.db.query<{
      readonly alias: BusinessLanguageAlias;
    }>(
      `select alias
       from flow_internal.business_language_aliases
       where status = 'ACTIVE'
       union all
       select alias
       from public.workspace_business_language_aliases
       where status = 'ACTIVE'
       order by 1`,
      [],
    );
    const relationResult = await this.db.query<{
      readonly relation: BusinessLanguageRelation;
    }>(
      `select relation
       from flow_internal.business_language_relations
       where status = 'ACTIVE'
       order by relation_id`,
      [],
    );
    return {
      concepts,
      aliases: aliasResult.rows.map((row) => row.alias),
      relations: relationResult.rows.map((row) => row.relation),
    };
  }

  async loadRegistry(): Promise<BusinessLanguageRegistry> {
    return BusinessLanguageRegistry.fromRepository(this);
  }

  async getConceptById(
    conceptId: SemanticId,
  ): Promise<BusinessLanguageConcept | undefined> {
    const result = await this.db.query<{
      readonly concept: BusinessLanguageConcept;
    }>(
      `select concept
       from flow_internal.business_language_concepts
       where concept_id = $1
       limit 1`,
      [conceptId],
    );
    return result.rows[0]?.concept;
  }

  async getConceptByCanonicalName(
    canonicalName: string,
  ): Promise<BusinessLanguageConcept | undefined> {
    const result = await this.db.query<{
      readonly concept: BusinessLanguageConcept;
    }>(
      `select concept
       from flow_internal.business_language_concepts
       where lower(canonical_name) = lower($1)
       order by version desc
       limit 1`,
      [canonicalName],
    );
    return result.rows[0]?.concept;
  }

  async listConcepts(
    input: {
      readonly status?: BusinessLanguageLifecycleStatus;
    } = {},
  ): Promise<readonly BusinessLanguageConcept[]> {
    const result = await this.db.query<{
      readonly concept: BusinessLanguageConcept;
    }>(
      `select concept
       from flow_internal.business_language_concepts
       where ($1::text is null or lifecycle_status = $1)
       order by concept_id`,
      [input.status ?? null],
    );
    return result.rows.map((row) => row.concept);
  }

  async findAliases(input: {
    readonly normalizedAlias: string;
    readonly workspaceId?: string;
    readonly languageTag?: string;
  }): Promise<readonly BusinessLanguageAlias[]> {
    const result = await this.db.query<{
      readonly alias: BusinessLanguageAlias;
    }>(
      `select alias
       from public.workspace_business_language_aliases
       where normalized_alias = $1
         and ($2::uuid is not null and workspace_id = $2::uuid)
         and ($3::text is null or language_tag = $3)
         and status = 'ACTIVE'
       union all
       select alias
       from flow_internal.business_language_aliases
       where normalized_alias = $1
         and ($3::text is null or language_tag = $3)
         and status = 'ACTIVE'
       order by 1`,
      [
        input.normalizedAlias,
        input.workspaceId ?? null,
        input.languageTag ?? null,
      ],
    );
    return result.rows.map((row) => row.alias);
  }

  async getAliasesForConcept(
    conceptId: SemanticId,
  ): Promise<readonly BusinessLanguageAlias[]> {
    const result = await this.db.query<{
      readonly alias: BusinessLanguageAlias;
    }>(
      `select alias
       from flow_internal.business_language_aliases
       where target_concept_id = $1
       union all
       select alias
       from public.workspace_business_language_aliases
       where target_concept_id = $1
       order by 1`,
      [conceptId],
    );
    return result.rows.map((row) => row.alias);
  }

  async findWorkspaceAliases(input: {
    readonly workspaceId: string;
    readonly normalizedAlias?: string;
  }): Promise<readonly BusinessLanguageAlias[]> {
    const result = await this.db.query<{
      readonly alias: BusinessLanguageAlias;
    }>(
      `select alias
       from public.workspace_business_language_aliases
       where workspace_id = $1
         and ($2::text is null or normalized_alias = $2)
       order by normalized_alias, target_concept_id`,
      [input.workspaceId, input.normalizedAlias ?? null],
    );
    return result.rows.map((row) => row.alias);
  }

  async getRelationsFrom(
    conceptId: SemanticId,
  ): Promise<readonly BusinessLanguageRelation[]> {
    const result = await this.db.query<{
      readonly relation: BusinessLanguageRelation;
    }>(
      `select relation
       from flow_internal.business_language_relations
       where from_concept_id = $1
       order by relation_type, to_concept_id`,
      [conceptId],
    );
    return result.rows.map((row) => row.relation);
  }

  async getRelationsTo(
    conceptId: SemanticId,
  ): Promise<readonly BusinessLanguageRelation[]> {
    const result = await this.db.query<{
      readonly relation: BusinessLanguageRelation;
    }>(
      `select relation
       from flow_internal.business_language_relations
       where to_concept_id = $1
       order by relation_type, from_concept_id`,
      [conceptId],
    );
    return result.rows.map((row) => row.relation);
  }

  async persistConcept(concept: BusinessLanguageConcept): Promise<void> {
    await this.db.query(
      `insert into flow_internal.business_language_concepts
        (concept_id, canonical_name, canonical_label, language_neutral_key, concept_type, domain, subdomain, definition, semantic_description, lifecycle_status, version, supersedes_concept_id, superseded_by_concept_id, provenance, concept, fingerprint, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,$18)
       on conflict (concept_id) do update
       set canonical_name = excluded.canonical_name,
           canonical_label = excluded.canonical_label,
           language_neutral_key = excluded.language_neutral_key,
           concept_type = excluded.concept_type,
           domain = excluded.domain,
           subdomain = excluded.subdomain,
           definition = excluded.definition,
           semantic_description = excluded.semantic_description,
           lifecycle_status = excluded.lifecycle_status,
           version = excluded.version,
           supersedes_concept_id = excluded.supersedes_concept_id,
           superseded_by_concept_id = excluded.superseded_by_concept_id,
           provenance = excluded.provenance,
           concept = excluded.concept,
           fingerprint = excluded.fingerprint,
           updated_at = excluded.updated_at`,
      [
        concept.conceptId,
        concept.canonicalName,
        concept.canonicalLabel,
        concept.languageNeutralKey,
        concept.conceptType,
        concept.domain,
        concept.subdomain ?? null,
        concept.definition,
        concept.semanticDescription,
        concept.lifecycleStatus,
        concept.version,
        concept.supersedesConceptId ?? null,
        concept.supersededByConceptId ?? null,
        JSON.stringify(concept.provenance),
        JSON.stringify(concept),
        concept.fingerprint,
        concept.createdAt,
        concept.updatedAt,
      ],
    );
  }

  async persistAlias(alias: BusinessLanguageAlias): Promise<void> {
    const table = alias.workspaceScope
      ? "public.workspace_business_language_aliases"
      : "flow_internal.business_language_aliases";
    const workspaceColumns = alias.workspaceScope
      ? "(alias_id, workspace_id, alias_text, normalized_alias, language_tag, script, locale, target_concept_id, alias_type, ambiguity_class, priority, status, valid_from, valid_to, provenance, alias, version, fingerprint)"
      : "(alias_id, alias_text, normalized_alias, language_tag, script, locale, target_concept_id, alias_type, ambiguity_class, priority, status, valid_from, valid_to, provenance, alias, version, fingerprint)";
    const workspaceValues = alias.workspaceScope
      ? "($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18)"
      : "($1,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18)";
    await this.db.query(
      `insert into ${table} ${workspaceColumns}
       values ${workspaceValues}
       on conflict (alias_id) do update
       set alias_text = excluded.alias_text,
           normalized_alias = excluded.normalized_alias,
           language_tag = excluded.language_tag,
           script = excluded.script,
           locale = excluded.locale,
           target_concept_id = excluded.target_concept_id,
           alias_type = excluded.alias_type,
           ambiguity_class = excluded.ambiguity_class,
           priority = excluded.priority,
           status = excluded.status,
           valid_from = excluded.valid_from,
           valid_to = excluded.valid_to,
           provenance = excluded.provenance,
           alias = excluded.alias,
           version = excluded.version,
           fingerprint = excluded.fingerprint`,
      [
        alias.aliasId,
        alias.workspaceScope?.workspaceId ?? null,
        alias.aliasText,
        alias.normalizedAlias,
        alias.languageTag,
        alias.script ?? null,
        alias.locale ?? null,
        alias.targetConceptId,
        alias.aliasType,
        alias.ambiguityClass,
        alias.priority,
        alias.status,
        alias.validFrom ?? null,
        alias.validTo ?? null,
        JSON.stringify(alias.provenance),
        JSON.stringify(alias),
        alias.version,
        alias.fingerprint,
      ],
    );
  }

  async persistRelation(relation: BusinessLanguageRelation): Promise<void> {
    await this.db.query(
      `insert into flow_internal.business_language_relations
        (relation_id, from_concept_id, to_concept_id, relation_type, status, provenance, relation, version, fingerprint, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11)
       on conflict (relation_id) do update
       set from_concept_id = excluded.from_concept_id,
           to_concept_id = excluded.to_concept_id,
           relation_type = excluded.relation_type,
           status = excluded.status,
           provenance = excluded.provenance,
           relation = excluded.relation,
           version = excluded.version,
           fingerprint = excluded.fingerprint,
           updated_at = excluded.updated_at`,
      [
        relation.relationId,
        relation.fromConceptId,
        relation.toConceptId,
        relation.relationType,
        relation.status,
        JSON.stringify(relation.provenance),
        JSON.stringify(relation),
        relation.version,
        relation.fingerprint,
        relation.createdAt,
        relation.updatedAt,
      ],
    );
  }
}

export class PostgresWorkspaceRuntimeRepository implements WorkspaceRuntimeRepository {
  constructor(private readonly db: SqlExecutor) {}

  async saveManifest(
    manifest: CompiledWorkspaceRuntimeManifest,
  ): Promise<void> {
    await this.db.query(
      `insert into flow_internal.workspace_runtime_manifests
        (runtime_id, workspace_id, runtime_version, configuration_fingerprint, runtime_fingerprint, knowledge_release_id, business_type, industry, jurisdiction, currency, enabled_domain_ids, enabled_module_ids, available_logic_ids, available_skill_ids, logic_versions, logic_fingerprints, skill_versions, skill_fingerprints, runtime_slice_index, capability_metadata, available_erp_capability_ids, installed_expertise_pack_ids, compiled_at, active, manifest)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,$22::jsonb,$23,true,$24::jsonb)
       on conflict (workspace_id, runtime_fingerprint) do nothing`,
      [
        manifest.runtimeId,
        manifest.workspaceId,
        manifest.runtimeVersion,
        manifest.configurationFingerprint,
        manifest.runtimeFingerprint,
        manifest.knowledgeReleaseId,
        manifest.businessType,
        manifest.industry,
        manifest.jurisdiction,
        manifest.currency,
        JSON.stringify(manifest.enabledDomainIds),
        JSON.stringify(manifest.enabledModuleIds),
        JSON.stringify(manifest.availableLogicIds),
        JSON.stringify(manifest.availableSkillIds),
        JSON.stringify(manifest.logicVersions),
        JSON.stringify(manifest.logicFingerprints),
        JSON.stringify(manifest.skillVersions),
        JSON.stringify(manifest.skillFingerprints),
        JSON.stringify(manifest.runtimeSliceIndex),
        JSON.stringify({
          dataProviderCapabilities: manifest.dataProviderCapabilities,
          externalSystemCapabilities: manifest.externalSystemCapabilities,
          localExecutionCapabilities: manifest.localExecutionCapabilities,
          authorizationPolicyReferences: manifest.authorizationPolicyReferences,
        }),
        JSON.stringify(manifest.availableERPCapabilityIds),
        JSON.stringify(manifest.installedExpertisePackIds),
        manifest.compiledAt,
        JSON.stringify(manifest),
      ],
    );
    for (const slice of manifest.runtimeSliceIndex) {
      await this.db.query(
        `insert into flow_internal.workspace_runtime_slices
          (workspace_id, runtime_fingerprint, slice_id, domain_id, logic_ids, skill_ids, dependency_slice_ids, capability_references, fingerprint, slice)
         values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10::jsonb)
         on conflict (workspace_id, runtime_fingerprint, slice_id) do nothing`,
        [
          manifest.workspaceId,
          manifest.runtimeFingerprint,
          slice.sliceId,
          slice.domainId,
          JSON.stringify(slice.logicIds),
          JSON.stringify(slice.skillIds),
          JSON.stringify(slice.dependencySliceIds),
          JSON.stringify(slice.capabilityReferences),
          slice.fingerprint,
          JSON.stringify(slice),
        ],
      );
    }
  }

  async getActiveRuntime(
    workspaceId: string,
  ): Promise<CompiledWorkspaceRuntimeManifest | undefined> {
    const result = await this.db.query<{
      readonly manifest: CompiledWorkspaceRuntimeManifest;
    }>(
      `select manifest
       from flow_internal.workspace_runtime_manifests
       where workspace_id = $1 and active is true
       order by compiled_at desc
       limit 1`,
      [workspaceId],
    );
    return result.rows[0]?.manifest;
  }

  async loadByFingerprint(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
  }): Promise<CompiledWorkspaceRuntimeManifest | undefined> {
    const result = await this.db.query<{
      readonly manifest: CompiledWorkspaceRuntimeManifest;
    }>(
      `select manifest
       from flow_internal.workspace_runtime_manifests
       where workspace_id = $1 and runtime_fingerprint = $2
       limit 1`,
      [input.workspaceId, input.runtimeFingerprint],
    );
    return result.rows[0]?.manifest;
  }

  async loadRuntimeSlice(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
    readonly sliceId: string;
  }): Promise<WorkspaceRuntimeSlice | undefined> {
    const result = await this.db.query<{
      readonly slice: WorkspaceRuntimeSlice;
    }>(
      `select slice
       from flow_internal.workspace_runtime_slices
       where workspace_id = $1 and runtime_fingerprint = $2 and slice_id = $3
       limit 1`,
      [input.workspaceId, input.runtimeFingerprint, input.sliceId],
    );
    return result.rows[0]?.slice;
  }

  async supersedeRuntime(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
    readonly supersededAt: string;
  }): Promise<void> {
    await this.db.query(
      `update flow_internal.workspace_runtime_manifests
       set active = false, superseded_at = $3
       where workspace_id = $1 and runtime_fingerprint = $2`,
      [input.workspaceId, input.runtimeFingerprint, input.supersededAt],
    );
  }
}

export class PostgresCalculationAuditRepository implements CalculationAuditRepository {
  constructor(private readonly db: SqlExecutor) {}

  async appendCalculationAudit(
    audit: CalculationAuditPersistence,
  ): Promise<void> {
    await this.db.query(
      `insert into flow_internal.calculation_execution_audits
        (execution_id, request_id, workspace_id, actor_id, logic_id, logic_version, logic_fingerprint, runtime_fingerprint, status, input_fingerprint, result_fingerprint, result_type, unit, currency, started_at, completed_at, correlation_id, error_code, warnings, record_references)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20::jsonb)`,
      [
        audit.executionId,
        audit.requestId,
        audit.workspaceId,
        audit.actorId,
        audit.logicId,
        audit.logicVersion ?? null,
        audit.logicFingerprint ?? null,
        audit.runtimeFingerprint,
        audit.status,
        audit.inputFingerprint ?? null,
        audit.resultFingerprint ?? null,
        audit.resultType ?? null,
        audit.unit ?? null,
        audit.currency ?? null,
        audit.startedAt,
        audit.completedAt ?? null,
        audit.correlationId,
        audit.errorCode ?? null,
        JSON.stringify(audit.warnings),
        JSON.stringify(audit.recordReferences),
      ],
    );
  }

  async listCalculationAudits(input: {
    readonly workspaceId: string;
  }): Promise<readonly CalculationAuditPersistence[]> {
    const result = await this.db.query<CalculationAuditPersistence>(
      `select *
       from flow_internal.calculation_execution_audits
       where workspace_id = $1
       order by started_at desc
       limit 100`,
      [input.workspaceId],
    );
    return result.rows;
  }
}

export function createBusinessPersistenceTestRepository(): InMemoryBusinessPersistenceRepository {
  const repository = new InMemoryBusinessPersistenceRepository();
  for (const definition of new InMemoryBusinessLogicRegistry().list()) {
    void repository.saveLogicRelease(definition);
  }
  return repository;
}

function recordKey(workspaceId: string, id: string): string {
  return `${workspaceId}:${id}`;
}

function runtimeKey(workspaceId: string, runtimeFingerprint: string): string {
  return `${workspaceId}:${runtimeFingerprint}`;
}

function knowledgeTable(scope: BusinessKnowledgeUnit["scope"]): string {
  return scope === "WORKSPACE"
    ? "public.workspace_business_knowledge_units"
    : "flow_internal.business_knowledge_units";
}
