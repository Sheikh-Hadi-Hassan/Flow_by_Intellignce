import {
  type AllowedUseDecision,
  type BusinessKnowledgeUnit,
  type BusinessSource,
  type KnowledgeFreshnessStatus,
  type KnowledgePermittedUse,
  type KnowledgeProvenanceChain,
  type KnowledgeScope,
  type KnowledgeUsePolicyReason,
  type KnowledgeUsePolicyResult,
  type SourceLicenseProfile,
  type SourceRelease,
  type TrainingCandidate,
} from "@flow/blm-contracts";

import { stableFingerprint } from "./knowledge-acquisition.js";

export interface KnowledgeUsePolicyInput {
  readonly knowledgeId: string;
  readonly use: KnowledgePermittedUse;
  readonly asOf: string;
  readonly jurisdiction?: string;
}

export interface KnowledgeTrainingEligibilityInput {
  readonly candidate: TrainingCandidate;
  readonly asOf: string;
}

export interface KnowledgeGovernanceSeed {
  readonly sources?: readonly BusinessSource[];
  readonly releases?: readonly SourceRelease[];
  readonly licenseProfiles?: readonly SourceLicenseProfile[];
  readonly knowledgeUnits?: readonly BusinessKnowledgeUnit[];
}

export class BusinessKnowledgeGovernanceRegistry {
  private readonly sources = new Map<string, BusinessSource>();
  private readonly releases = new Map<string, SourceRelease>();
  private readonly licenseProfiles = new Map<string, SourceLicenseProfile>();
  private readonly knowledgeUnits = new Map<string, BusinessKnowledgeUnit>();

  constructor(seed: KnowledgeGovernanceSeed = {}) {
    for (const license of seed.licenseProfiles ?? []) {
      this.registerLicenseProfile(license);
    }
    for (const source of seed.sources ?? []) this.registerSource(source);
    for (const release of seed.releases ?? [])
      this.registerSourceRelease(release);
    for (const knowledge of seed.knowledgeUnits ?? []) {
      this.createKnowledgeUnit(knowledge);
    }
  }

  registerSource(source: BusinessSource): BusinessSource {
    this.sources.set(source.sourceId, source);
    return source;
  }

  registerLicenseProfile(profile: SourceLicenseProfile): SourceLicenseProfile {
    this.licenseProfiles.set(profile.licenseProfileId, profile);
    return profile;
  }

  registerSourceRelease(release: SourceRelease): SourceRelease {
    if (!this.sources.has(release.sourceId)) {
      throw new Error(`Unknown source ${release.sourceId}.`);
    }
    if (!this.licenseProfiles.has(release.licenseProfileId)) {
      throw new Error(`Unknown license profile ${release.licenseProfileId}.`);
    }
    if (release.supersedesReleaseId === release.releaseId) {
      throw new Error("Source release cannot supersede itself.");
    }
    if (release.effectiveTo && release.effectiveTo < release.effectiveFrom) {
      throw new Error("Source release effective range is invalid.");
    }
    const existing = this.releases.get(release.releaseId);
    if (
      existing &&
      existing.contentFingerprint !== release.contentFingerprint
    ) {
      throw new Error("Historical source release cannot be overwritten.");
    }
    this.releases.set(release.releaseId, release);
    return release;
  }

  createKnowledgeUnit(knowledge: BusinessKnowledgeUnit): BusinessKnowledgeUnit {
    const source = this.sources.get(knowledge.sourceId);
    if (!source) throw new Error(`Unknown source ${knowledge.sourceId}.`);
    const release = this.releases.get(knowledge.sourceReleaseId);
    if (!release) {
      throw new Error(`Unknown source release ${knowledge.sourceReleaseId}.`);
    }
    if (release.sourceId !== knowledge.sourceId) {
      throw new Error("Knowledge source release does not belong to source.");
    }
    if (!this.licenseProfiles.has(knowledge.licenseProfileId)) {
      throw new Error(`Unknown license profile ${knowledge.licenseProfileId}.`);
    }
    if (knowledge.supersedesKnowledgeId === knowledge.knowledgeId) {
      throw new Error("Knowledge unit cannot supersede itself.");
    }
    if (
      knowledge.effectiveTo &&
      knowledge.effectiveTo < knowledge.effectiveFrom
    ) {
      throw new Error("Knowledge effective range is invalid.");
    }
    if (knowledge.confidence < 0 || knowledge.confidence > 1) {
      throw new Error("Knowledge confidence must be between 0 and 1.");
    }
    if (knowledge.scope === "WORKSPACE" && !knowledge.workspaceId) {
      throw new Error("Workspace-scoped knowledge requires workspaceId.");
    }
    if (
      knowledge.claimType === "WORKSPACE_FACT" &&
      knowledge.scope !== "WORKSPACE"
    ) {
      throw new Error("Workspace facts must remain workspace-scoped.");
    }
    if (
      (knowledge.status === "PUBLISHED" || knowledge.status === "REVIEWED") &&
      !knowledge.provenanceFingerprint
    ) {
      throw new Error("Reviewed or published knowledge requires provenance.");
    }
    const existing = this.knowledgeUnits.get(knowledge.knowledgeId);
    if (
      existing &&
      existing.provenanceFingerprint !== knowledge.provenanceFingerprint
    ) {
      throw new Error("Historical knowledge unit cannot be overwritten.");
    }
    this.knowledgeUnits.set(knowledge.knowledgeId, knowledge);
    return knowledge;
  }

  supersedeKnowledge(input: {
    readonly previousKnowledgeId: string;
    readonly replacement: BusinessKnowledgeUnit;
  }): {
    readonly previous: BusinessKnowledgeUnit;
    readonly replacement: BusinessKnowledgeUnit;
  } {
    const previous = this.getKnowledge(input.previousKnowledgeId);
    if (!previous) throw new Error("Previous knowledge not found.");
    if (input.replacement.knowledgeId === previous.knowledgeId) {
      throw new Error("Replacement knowledge must use a new knowledgeId.");
    }
    const replacement = this.createKnowledgeUnit({
      ...input.replacement,
      supersedesKnowledgeId: previous.knowledgeId,
    });
    const updatedPrevious: BusinessKnowledgeUnit = {
      ...previous,
      status: "SUPERSEDED",
      supersededByKnowledgeId: replacement.knowledgeId,
      updatedAt: replacement.createdAt,
    };
    this.knowledgeUnits.set(previous.knowledgeId, updatedPrevious);
    return { previous: updatedPrevious, replacement };
  }

  getSource(sourceId: string): BusinessSource | undefined {
    return this.sources.get(sourceId);
  }

  getSourceRelease(releaseId: string): SourceRelease | undefined {
    return this.releases.get(releaseId);
  }

  getLicenseProfile(
    licenseProfileId: string,
  ): SourceLicenseProfile | undefined {
    return this.licenseProfiles.get(licenseProfileId);
  }

  getKnowledge(knowledgeId: string): BusinessKnowledgeUnit | undefined {
    return this.knowledgeUnits.get(knowledgeId);
  }

  listCurrentKnowledge(input: {
    readonly asOf: string;
    readonly jurisdiction?: string;
    readonly scope?: KnowledgeScope;
    readonly workspaceId?: string;
  }): readonly BusinessKnowledgeUnit[] {
    return [...this.knowledgeUnits.values()].filter(
      (knowledge) =>
        knowledge.status === "PUBLISHED" &&
        (!input.scope || knowledge.scope === input.scope) &&
        (!input.workspaceId || knowledge.workspaceId === input.workspaceId) &&
        isEffective(
          knowledge.effectiveFrom,
          knowledge.effectiveTo,
          input.asOf,
        ) &&
        jurisdictionApplies(knowledge.jurisdiction, input.jurisdiction),
    );
  }

  provenanceFor(knowledgeId: string): KnowledgeProvenanceChain | undefined {
    const knowledge = this.knowledgeUnits.get(knowledgeId);
    if (!knowledge) return undefined;
    const source = this.sources.get(knowledge.sourceId);
    const sourceRelease = this.releases.get(knowledge.sourceReleaseId);
    const licenseProfile = this.licenseProfiles.get(knowledge.licenseProfileId);
    if (!source || !sourceRelease || !licenseProfile) return undefined;
    const chain: KnowledgeProvenanceChain = {
      knowledge,
      sourceRelease,
      source,
      licenseProfile,
    };
    const supersededKnowledge = knowledge.supersedesKnowledgeId
      ? this.knowledgeUnits.get(knowledge.supersedesKnowledgeId)
      : undefined;
    const supersedingKnowledge = knowledge.supersededByKnowledgeId
      ? this.knowledgeUnits.get(knowledge.supersededByKnowledgeId)
      : undefined;
    return {
      ...chain,
      ...(supersededKnowledge ? { supersededKnowledge } : {}),
      ...(supersedingKnowledge ? { supersedingKnowledge } : {}),
    };
  }

  evaluateUse(input: KnowledgeUsePolicyInput): KnowledgeUsePolicyResult {
    const chain = this.provenanceFor(input.knowledgeId);
    if (!chain) {
      return denied(input.use, ["KNOWLEDGE_NOT_FOUND"]);
    }
    const reasons = governanceReasons(chain, input);
    reasons.push(...licenseReasons(chain.licenseProfile, input.use));
    if (!chain.knowledge.permittedUses.includes(input.use)) {
      reasons.push("PERMITTED_USE_NOT_LISTED");
    }
    if (input.use === "TRAINING" || input.use === "COMMERCIAL_TRAINING") {
      reasons.push(...trainingSpecificReasons(chain));
    }
    return result(input.use, reasons);
  }

  evaluateTrainingEligibility(
    input: KnowledgeTrainingEligibilityInput,
  ): KnowledgeUsePolicyResult {
    return this.evaluateUse({
      knowledgeId: input.candidate.knowledgeId,
      use: input.candidate.requestedUse,
      asOf: input.asOf,
      ...(input.candidate.requestedJurisdiction
        ? { jurisdiction: input.candidate.requestedJurisdiction }
        : {}),
    });
  }

  freshnessFor(input: {
    readonly knowledgeId: string;
    readonly asOf: string;
    readonly agingAfterDays?: number;
    readonly staleAfterDays?: number;
  }): KnowledgeFreshnessStatus {
    const knowledge = this.knowledgeUnits.get(input.knowledgeId);
    if (!knowledge) return "UNKNOWN";
    if (
      knowledge.status === "SUPERSEDED" ||
      knowledge.supersededByKnowledgeId
    ) {
      return "SUPERSEDED";
    }
    if (
      !isEffective(knowledge.effectiveFrom, knowledge.effectiveTo, input.asOf)
    ) {
      return "STALE";
    }
    const observed = Date.parse(knowledge.sourceObservedAt);
    const asOf = Date.parse(input.asOf);
    if (!Number.isFinite(observed) || !Number.isFinite(asOf)) return "UNKNOWN";
    const ageDays = Math.floor((asOf - observed) / 86_400_000);
    if (input.staleAfterDays !== undefined && ageDays > input.staleAfterDays) {
      return "STALE";
    }
    if (input.agingAfterDays !== undefined && ageDays > input.agingAfterDays) {
      return "AGING";
    }
    return "CURRENT";
  }
}

export function sourceContentFingerprint(input: {
  readonly sourceId: string;
  readonly version: string;
  readonly content: unknown;
}): string {
  return stableFingerprint(input);
}

export function sourceMetadataFingerprint(input: SourceRelease): string {
  return stableFingerprint({
    releaseId: input.releaseId,
    sourceId: input.sourceId,
    version: input.version,
    releaseName: input.releaseName,
    publishedAt: input.publishedAt,
    observedAt: input.observedAt,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    status: input.status,
    supersedesReleaseId: input.supersedesReleaseId,
    licenseProfileId: input.licenseProfileId,
    jurisdiction: input.jurisdiction,
    languages: input.languages,
    sourceLocator: input.sourceLocator,
    machineReadableLocator: input.machineReadableLocator,
    reviewStatus: input.reviewStatus,
  });
}

export function knowledgeProvenanceFingerprint(
  input: Omit<BusinessKnowledgeUnit, "provenanceFingerprint">,
): string {
  return stableFingerprint({
    knowledgeId: input.knowledgeId,
    claimType: input.claimType,
    subjectId: input.subjectId,
    predicate: input.predicate,
    object: input.object,
    canonicalConceptRefs: input.canonicalConceptRefs,
    relationRefs: input.relationRefs,
    sourceId: input.sourceId,
    sourceReleaseId: input.sourceReleaseId,
    sourceLocator: input.sourceLocator,
    sourceAuthority: input.sourceAuthority,
    sourceVersion: input.sourceVersion,
    jurisdiction: input.jurisdiction,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    licenseProfileId: input.licenseProfileId,
    permittedUses: input.permittedUses,
    scope: input.scope,
    workspaceId: input.workspaceId,
    supersedesKnowledgeId: input.supersedesKnowledgeId,
  });
}

export function createKnowledgeUnit(
  input: Omit<BusinessKnowledgeUnit, "provenanceFingerprint">,
): BusinessKnowledgeUnit {
  return {
    ...input,
    provenanceFingerprint: knowledgeProvenanceFingerprint(input),
  };
}

function governanceReasons(
  chain: KnowledgeProvenanceChain,
  input: KnowledgeUsePolicyInput,
): KnowledgeUsePolicyReason[] {
  const reasons: KnowledgeUsePolicyReason[] = [];
  if (chain.source.status !== "ACTIVE") reasons.push("SOURCE_NOT_ACTIVE");
  if (chain.sourceRelease.status !== "ACTIVE") {
    reasons.push("SOURCE_RELEASE_NOT_ACTIVE");
  }
  if (
    !isEffective(
      chain.sourceRelease.effectiveFrom,
      chain.sourceRelease.effectiveTo,
      input.asOf,
    )
  ) {
    reasons.push("SOURCE_RELEASE_NOT_EFFECTIVE");
  }
  if (chain.knowledge.status !== "PUBLISHED")
    reasons.push("KNOWLEDGE_NOT_PUBLISHED");
  if (
    chain.knowledge.supersededByKnowledgeId ||
    chain.knowledge.status === "SUPERSEDED"
  ) {
    reasons.push("KNOWLEDGE_SUPERSEDED");
  }
  if (
    chain.knowledge.reviewStatus !== "REVIEWED" &&
    chain.knowledge.reviewStatus !== "PUBLISHED"
  ) {
    reasons.push("KNOWLEDGE_REVIEW_INCOMPLETE");
  }
  if (
    chain.licenseProfile.legalReviewStatus === "PENDING" ||
    chain.sourceRelease.reviewStatus === "PENDING"
  ) {
    reasons.push("LEGAL_REVIEW_PENDING");
  }
  if (
    chain.licenseProfile.legalReviewStatus === "REJECTED" ||
    chain.sourceRelease.reviewStatus === "REJECTED"
  ) {
    reasons.push("LEGAL_REVIEW_REJECTED");
  }
  if (!chain.knowledge.provenanceFingerprint)
    reasons.push("MISSING_PROVENANCE");
  if (!jurisdictionApplies(chain.knowledge.jurisdiction, input.jurisdiction)) {
    reasons.push("JURISDICTION_NOT_APPLICABLE");
  }
  if (chain.knowledge.scope === "WORKSPACE" && !chain.knowledge.workspaceId) {
    reasons.push("WORKSPACE_SCOPE_REQUIRED");
  }
  return reasons;
}

function trainingSpecificReasons(
  chain: KnowledgeProvenanceChain,
): readonly KnowledgeUsePolicyReason[] {
  if (chain.knowledge.claimType === "WORKSPACE_FACT") {
    return ["WORKSPACE_FACT_NOT_GLOBAL_TRAINING_ELIGIBLE"];
  }
  if (chain.knowledge.scope === "WORKSPACE") {
    return ["WORKSPACE_FACT_NOT_GLOBAL_TRAINING_ELIGIBLE"];
  }
  return [];
}

function licenseReasons(
  profile: SourceLicenseProfile,
  use: KnowledgePermittedUse,
): KnowledgeUsePolicyReason[] {
  const decision = decisionForUse(profile, use);
  if (decision === "ALLOWED") return [];
  if (decision === "UNKNOWN_REQUIRES_REVIEW") {
    return ["UNKNOWN_USE_REQUIRES_REVIEW"];
  }
  switch (use) {
    case "REFERENCE":
      return ["REFERENCE_NOT_ALLOWED"];
    case "MAPPING":
      return ["MAPPING_NOT_ALLOWED"];
    case "INGESTION":
      return ["INGESTION_NOT_ALLOWED"];
    case "CONTEXT":
    case "RETRIEVAL":
      return ["CONTEXT_NOT_ALLOWED"];
    case "EVALUATION":
      return ["EVALUATION_NOT_ALLOWED"];
    case "TRAINING":
      return ["MODEL_TRAINING_NOT_ALLOWED"];
    case "COMMERCIAL_TRAINING":
      return ["COMMERCIAL_TRAINING_NOT_ALLOWED"];
    case "REDISTRIBUTION":
      return ["REDISTRIBUTION_NOT_ALLOWED"];
  }
  return ["PERMITTED_USE_NOT_LISTED"];
}

function decisionForUse(
  profile: SourceLicenseProfile,
  use: KnowledgePermittedUse,
): AllowedUseDecision {
  switch (use) {
    case "REFERENCE":
      return profile.referenceAllowed;
    case "MAPPING":
      return profile.mappingAllowed;
    case "INGESTION":
      return profile.ingestionAllowed;
    case "CONTEXT":
    case "RETRIEVAL":
      return profile.contextUseAllowed;
    case "EVALUATION":
      return profile.evaluationUseAllowed;
    case "TRAINING":
      return profile.modelTrainingAllowed;
    case "COMMERCIAL_TRAINING":
      return profile.commercialTrainingAllowed;
    case "REDISTRIBUTION":
      return profile.redistributionAllowed;
  }
}

function result(
  use: KnowledgePermittedUse,
  reasons: readonly KnowledgeUsePolicyReason[],
): KnowledgeUsePolicyResult {
  const requiresReview = reasons.some(
    (reason) =>
      reason.includes("REVIEW") || reason === "UNKNOWN_USE_REQUIRES_REVIEW",
  );
  return {
    allowed: reasons.length === 0,
    requiresReview,
    use,
    reasons,
  };
}

function denied(
  use: KnowledgePermittedUse,
  reasons: readonly KnowledgeUsePolicyReason[],
): KnowledgeUsePolicyResult {
  return {
    allowed: false,
    requiresReview: false,
    use,
    reasons,
  };
}

function isEffective(
  effectiveFrom: string,
  effectiveTo: string | undefined,
  asOf: string,
): boolean {
  return effectiveFrom <= asOf && (!effectiveTo || effectiveTo >= asOf);
}

function jurisdictionApplies(
  jurisdictions: readonly string[],
  requestedJurisdiction: string | undefined,
): boolean {
  if (jurisdictions.includes("GLOBAL")) return true;
  if (!requestedJurisdiction) return true;
  return jurisdictions.includes(requestedJurisdiction);
}

export function syntheticKnowledgeSource(input: {
  readonly sourceId: string;
  readonly name: string;
  readonly createdAt: string;
}): BusinessSource {
  return {
    sourceId: input.sourceId,
    canonicalName: input.name,
    sourceType: "FLOW_INTERNAL",
    publisher: "Flow",
    authorityClass: "FLOW_INTERNAL",
    description: "Synthetic Flow-internal governance fixture.",
    defaultJurisdiction: ["GLOBAL"],
    defaultLanguage: ["en"],
    status: "ACTIVE",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export function syntheticLicenseProfile(input: {
  readonly licenseProfileId: string;
  readonly createdAt: string;
  readonly training: AllowedUseDecision;
  readonly commercialTraining: AllowedUseDecision;
  readonly legalReviewStatus?: SourceLicenseProfile["legalReviewStatus"];
}): SourceLicenseProfile {
  return {
    licenseProfileId: input.licenseProfileId,
    referenceAllowed: "ALLOWED",
    mappingAllowed: "ALLOWED",
    ingestionAllowed: "ALLOWED",
    contextUseAllowed: "ALLOWED",
    evaluationUseAllowed: "ALLOWED",
    modelTrainingAllowed: input.training,
    commercialTrainingAllowed: input.commercialTraining,
    redistributionAllowed: "ALLOWED",
    attributionRequired: false,
    licenseName: "Synthetic Flow test license",
    restrictions: [],
    notes: "Non-proprietary synthetic fixture.",
    legalReviewStatus: input.legalReviewStatus ?? "APPROVED",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export function syntheticSourceRelease(input: {
  readonly releaseId: string;
  readonly sourceId: string;
  readonly licenseProfileId: string;
  readonly version: string;
  readonly createdAt: string;
  readonly supersedesReleaseId?: string;
}): SourceRelease {
  const base = {
    releaseId: input.releaseId,
    sourceId: input.sourceId,
    version: input.version,
    releaseName: `Synthetic release ${input.version}`,
    observedAt: input.createdAt,
    effectiveFrom: input.createdAt.slice(0, 10),
    status: "ACTIVE" as const,
    ...(input.supersedesReleaseId
      ? { supersedesReleaseId: input.supersedesReleaseId }
      : {}),
    contentFingerprint: sourceContentFingerprint({
      sourceId: input.sourceId,
      version: input.version,
      content: `synthetic:${input.sourceId}:${input.version}`,
    }),
    metadataFingerprint: "",
    licenseProfileId: input.licenseProfileId,
    jurisdiction: ["GLOBAL"],
    languages: ["en"],
    sourceLocator: `flow://synthetic/${input.sourceId}/${input.version}`,
    reviewStatus: "APPROVED" as const,
    reviewedAt: input.createdAt,
    reviewedBy: "flow-test",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
  return { ...base, metadataFingerprint: sourceMetadataFingerprint(base) };
}
