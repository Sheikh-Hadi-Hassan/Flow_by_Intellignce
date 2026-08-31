import { type SemanticId } from "./business-semantic-model.js";

export type SourceAuthorityClass =
  | "OFFICIAL_CLASSIFICATION"
  | "STANDARDS_BODY"
  | "INDUSTRY_STANDARD"
  | "GOVERNMENT_REGULATOR"
  | "PEER_REVIEWED"
  | "PROFESSIONAL_REFERENCE"
  | "FLOW_INTERNAL"
  | "WORKSPACE_EVIDENCE"
  | "VENDOR_REFERENCE"
  | "OPEN_WEB"
  | "MODEL_PRIOR"
  | "OTHER";

export type GovernedSourceType =
  | "CLASSIFICATION"
  | "STANDARD"
  | "REGULATORY"
  | "PROFESSIONAL_REFERENCE"
  | "FLOW_INTERNAL"
  | "WORKSPACE_EVIDENCE"
  | "VENDOR_REFERENCE"
  | "OPEN_WEB"
  | "MODEL_PRIOR"
  | "OTHER";

export type GovernedSourceStatus =
  "DRAFT" | "ACTIVE" | "SUPERSEDED" | "RETIRED" | "REVOKED";

export type SourceReleaseStatus =
  "DRAFT" | "ACTIVE" | "SUPERSEDED" | "RETIRED" | "REVOKED";

export type SourceLegalReviewStatus =
  "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

export type AllowedUseDecision =
  "ALLOWED" | "PROHIBITED" | "UNKNOWN_REQUIRES_REVIEW";

export type KnowledgePermittedUse =
  | "REFERENCE"
  | "MAPPING"
  | "INGESTION"
  | "CONTEXT"
  | "RETRIEVAL"
  | "EVALUATION"
  | "TRAINING"
  | "COMMERCIAL_TRAINING"
  | "REDISTRIBUTION";

export type BusinessKnowledgeClaimType =
  | "CLASSIFICATION_FACT"
  | "STANDARD_FACT"
  | "STANDARD_MAPPING"
  | "DOMAIN_PATTERN"
  | "FLOW_DERIVED_PATTERN"
  | "REQUIREMENT_HYPOTHESIS"
  | "WORKSPACE_FACT"
  | "LIVE_EVIDENCE"
  | "POLICY"
  | "DETERMINISTIC_RESULT";

export type KnowledgeReviewStatus =
  "DRAFT" | "IN_REVIEW" | "REVIEWED" | "PUBLISHED" | "REJECTED";

export type BusinessKnowledgeStatus =
  "DRAFT" | "REVIEWED" | "PUBLISHED" | "SUPERSEDED" | "REJECTED" | "RETIRED";

export type KnowledgeScope = "GLOBAL" | "WORKSPACE";

export type KnowledgeFreshnessStatus =
  "CURRENT" | "AGING" | "STALE" | "SUPERSEDED" | "UNKNOWN";

export interface BusinessSource {
  readonly sourceId: string;
  readonly canonicalName: string;
  readonly sourceType: GovernedSourceType;
  readonly publisher: string;
  readonly authorityClass: SourceAuthorityClass;
  readonly description: string;
  readonly homepageLocator?: string;
  readonly defaultJurisdiction: readonly string[];
  readonly defaultLanguage: readonly string[];
  readonly status: GovernedSourceStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SourceLicenseProfile {
  readonly licenseProfileId: string;
  readonly referenceAllowed: AllowedUseDecision;
  readonly mappingAllowed: AllowedUseDecision;
  readonly ingestionAllowed: AllowedUseDecision;
  readonly contextUseAllowed: AllowedUseDecision;
  readonly evaluationUseAllowed: AllowedUseDecision;
  readonly modelTrainingAllowed: AllowedUseDecision;
  readonly commercialTrainingAllowed: AllowedUseDecision;
  readonly redistributionAllowed: AllowedUseDecision;
  readonly attributionRequired: boolean;
  readonly licenseName: string;
  readonly licenseReference?: string;
  readonly restrictions: readonly string[];
  readonly notes: string;
  readonly legalReviewStatus: SourceLegalReviewStatus;
  readonly legalReviewedAt?: string;
  readonly legalReviewedBy?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SourceRelease {
  readonly releaseId: string;
  readonly sourceId: string;
  readonly version: string;
  readonly releaseName: string;
  readonly publishedAt?: string;
  readonly observedAt: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly status: SourceReleaseStatus;
  readonly supersedesReleaseId?: string;
  readonly contentFingerprint: string;
  readonly metadataFingerprint: string;
  readonly licenseProfileId: string;
  readonly jurisdiction: readonly string[];
  readonly languages: readonly string[];
  readonly sourceLocator: string;
  readonly machineReadableLocator?: string;
  readonly reviewStatus: SourceLegalReviewStatus;
  readonly reviewedAt?: string;
  readonly reviewedBy?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BusinessKnowledgeUnit {
  readonly knowledgeId: string;
  readonly claimType: BusinessKnowledgeClaimType;
  readonly subjectId: string;
  readonly predicate: string;
  readonly object: string;
  readonly canonicalConceptRefs: readonly SemanticId[];
  readonly relationRefs: readonly SemanticId[];
  readonly sourceId: string;
  readonly sourceReleaseId: string;
  readonly sourceLocator: string;
  readonly sourceAuthority: SourceAuthorityClass;
  readonly sourceVersion: string;
  readonly sourcePublishedAt?: string;
  readonly sourceObservedAt: string;
  readonly jurisdiction: readonly string[];
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly licenseProfileId: string;
  readonly permittedUses: readonly KnowledgePermittedUse[];
  readonly confidence: number;
  readonly reviewStatus: KnowledgeReviewStatus;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
  readonly reviewEvidence: readonly string[];
  readonly provenanceFingerprint: string;
  readonly supersedesKnowledgeId?: string;
  readonly supersededByKnowledgeId?: string;
  readonly status: BusinessKnowledgeStatus;
  readonly scope: KnowledgeScope;
  readonly workspaceId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface KnowledgeProvenanceChain {
  readonly knowledge: BusinessKnowledgeUnit;
  readonly sourceRelease: SourceRelease;
  readonly source: BusinessSource;
  readonly licenseProfile: SourceLicenseProfile;
  readonly supersededKnowledge?: BusinessKnowledgeUnit;
  readonly supersedingKnowledge?: BusinessKnowledgeUnit;
}

export type KnowledgeUsePolicyReason =
  | "KNOWLEDGE_NOT_FOUND"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_RELEASE_NOT_FOUND"
  | "LICENSE_PROFILE_NOT_FOUND"
  | "SOURCE_NOT_ACTIVE"
  | "SOURCE_RELEASE_NOT_ACTIVE"
  | "SOURCE_RELEASE_NOT_EFFECTIVE"
  | "KNOWLEDGE_NOT_PUBLISHED"
  | "KNOWLEDGE_SUPERSEDED"
  | "KNOWLEDGE_REVIEW_INCOMPLETE"
  | "PERMITTED_USE_NOT_LISTED"
  | "REFERENCE_NOT_ALLOWED"
  | "MAPPING_NOT_ALLOWED"
  | "INGESTION_NOT_ALLOWED"
  | "CONTEXT_NOT_ALLOWED"
  | "EVALUATION_NOT_ALLOWED"
  | "MODEL_TRAINING_NOT_ALLOWED"
  | "COMMERCIAL_TRAINING_NOT_ALLOWED"
  | "REDISTRIBUTION_NOT_ALLOWED"
  | "LEGAL_REVIEW_PENDING"
  | "LEGAL_REVIEW_REJECTED"
  | "MISSING_PROVENANCE"
  | "WORKSPACE_FACT_NOT_GLOBAL_TRAINING_ELIGIBLE"
  | "WORKSPACE_SCOPE_REQUIRED"
  | "JURISDICTION_NOT_APPLICABLE"
  | "UNKNOWN_USE_REQUIRES_REVIEW";

export interface KnowledgeUsePolicyResult {
  readonly allowed: boolean;
  readonly requiresReview: boolean;
  readonly use: KnowledgePermittedUse;
  readonly reasons: readonly KnowledgeUsePolicyReason[];
}

export interface TrainingCandidate {
  readonly candidateId: string;
  readonly knowledgeId: string;
  readonly requestedUse: "TRAINING" | "COMMERCIAL_TRAINING";
  readonly requestedJurisdiction?: string;
  readonly exportPurpose: string;
  readonly createdAt: string;
}

export const sourceAuthorityPrecedence: readonly SourceAuthorityClass[] = [
  "GOVERNMENT_REGULATOR",
  "OFFICIAL_CLASSIFICATION",
  "STANDARDS_BODY",
  "INDUSTRY_STANDARD",
  "PEER_REVIEWED",
  "PROFESSIONAL_REFERENCE",
  "FLOW_INTERNAL",
  "WORKSPACE_EVIDENCE",
  "VENDOR_REFERENCE",
  "OPEN_WEB",
  "MODEL_PRIOR",
  "OTHER",
];
