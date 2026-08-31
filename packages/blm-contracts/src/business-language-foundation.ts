import type { SemanticId } from "./business-semantic-model.js";

export const businessLanguageConceptTypes = [
  "ENTITY_TYPE",
  "ROLE",
  "RESPONSIBILITY",
  "ACTION",
  "STATE",
  "STATUS",
  "EVENT",
  "METRIC",
  "DIMENSION",
  "MEASURE",
  "UNIT",
  "TIME_CONCEPT",
  "DOCUMENT",
  "PROCESS",
  "WORKFLOW",
  "CAPABILITY",
  "POLICY_TERM",
  "RULE_TERM",
  "RISK_TERM",
  "CONTROL_TERM",
  "FINANCIAL_TERM",
  "COMMERCIAL_TERM",
  "OPERATING_TERM",
  "QUALIFIER",
  "RELATIONSHIP",
  "BUSINESS_OBJECTIVE",
  "BUSINESS_PROBLEM",
  "DECISION_TERM",
] as const;

export type BusinessLanguageConceptType =
  (typeof businessLanguageConceptTypes)[number];

export type BusinessLanguageLifecycleStatus =
  "DRAFT" | "ACTIVE" | "SUPERSEDED" | "RETIRED" | "REJECTED";

export type BusinessLanguageLayer =
  | "L0_UNIVERSAL"
  | "L1_DOMAIN"
  | "L2_INDUSTRY"
  | "L3_NICHE"
  | "L4_WORKSPACE"
  | "L5_INDIVIDUAL";

export type BusinessLanguageAliasType =
  | "EXACT_SYNONYM"
  | "COLLOQUIAL"
  | "FOUNDER_SPEAK"
  | "ABBREVIATION"
  | "ROMAN_URDU"
  | "EXPERT_TERM"
  | "PHRASE"
  | "ACTION_PHRASE"
  | "DEPRECATED_TERM";

export type BusinessLanguageAliasAmbiguityClass =
  "UNAMBIGUOUS" | "CONTEXTUAL" | "AMBIGUOUS" | "UNSAFE_REDEFINITION";

export type BusinessLanguageRelationType =
  | "IS_A"
  | "PART_OF"
  | "HAS_STATUS"
  | "MEASURED_BY"
  | "DRIVES"
  | "CONSTRAINS"
  | "DEPENDS_ON"
  | "CAUSES"
  | "INDICATES"
  | "OPPOSES"
  | "REQUIRES_INFORMATION"
  | "REQUIRES_AUTHORITY"
  | "DISTINCT_FROM"
  | "RELATED_TO";

export type ConceptResolutionStatus =
  | "RESOLVED"
  | "PARTIALLY_RESOLVED"
  | "AMBIGUOUS"
  | "UNKNOWN_TERM"
  | "NEEDS_INFORMATION"
  | "UNSUPPORTED";

export type BusinessUtteranceClass =
  | "QUESTION"
  | "REQUEST"
  | "COMMAND"
  | "STATEMENT"
  | "OBSERVATION"
  | "HYPOTHESIS"
  | "COMPLAINT"
  | "DECISION"
  | "APPROVAL"
  | "COMMITMENT";

export type BusinessIntentClass =
  | "READ"
  | "SEARCH"
  | "SUMMARIZE"
  | "ANALYZE"
  | "DIAGNOSE"
  | "CALCULATE"
  | "COMPARE"
  | "FORECAST"
  | "SCENARIO"
  | "RECOMMEND"
  | "PLAN"
  | "DRAFT"
  | "PROPOSE_ACTION"
  | "REQUEST_APPROVAL"
  | "UNKNOWN";

export interface BusinessLanguageProvenance {
  readonly sourceType:
    | "FLOW_CANONICAL_LANGUAGE"
    | "FLOW_DOMAIN_PACK"
    | "FLOW_INDUSTRY_PACK"
    | "WORKSPACE_ALIAS"
    | "HUMAN_APPROVED"
    | "MODEL_PROPOSED";
  readonly sourceId: string;
  readonly sourceReleaseId?: string;
  readonly evidence?: readonly string[];
  readonly createdAt: string;
}

export interface BusinessLanguageWorkspaceScope {
  readonly workspaceId: string;
  readonly organizationId?: string;
  readonly createdBy?: string;
}

export interface BusinessLanguageConcept {
  readonly conceptId: SemanticId;
  readonly canonicalName: string;
  readonly canonicalLabel: string;
  readonly conceptType: BusinessLanguageConceptType;
  readonly domain: string;
  readonly subdomain?: string;
  readonly definition: string;
  readonly semanticDescription: string;
  readonly lifecycleStatus: BusinessLanguageLifecycleStatus;
  readonly parentConceptIds: readonly SemanticId[];
  readonly broaderConceptIds: readonly SemanticId[];
  readonly narrowerConceptIds: readonly SemanticId[];
  readonly relatedConceptIds: readonly SemanticId[];
  readonly oppositeConceptIds: readonly SemanticId[];
  readonly entityTypeRefs: readonly SemanticId[];
  readonly actionRefs: readonly SemanticId[];
  readonly metricRefs: readonly SemanticId[];
  readonly roleRefs: readonly SemanticId[];
  readonly processRefs: readonly SemanticId[];
  readonly documentRefs: readonly SemanticId[];
  readonly applicableIndustries: readonly string[];
  readonly languageNeutralKey: string;
  readonly layer: BusinessLanguageLayer;
  readonly provenance: BusinessLanguageProvenance;
  readonly version: string;
  readonly supersedesConceptId?: SemanticId;
  readonly supersededByConceptId?: SemanticId;
  readonly fingerprint: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BusinessLanguageAlias {
  readonly aliasId: string;
  readonly aliasText: string;
  readonly normalizedAlias: string;
  readonly languageTag: string;
  readonly script?: string;
  readonly locale?: string;
  readonly targetConceptId: SemanticId;
  readonly aliasType: BusinessLanguageAliasType;
  readonly domainContext: readonly string[];
  readonly roleContext: readonly string[];
  readonly industryContext: readonly string[];
  readonly workspaceScope?: BusinessLanguageWorkspaceScope;
  readonly ambiguityClass: BusinessLanguageAliasAmbiguityClass;
  readonly priority: number;
  readonly status: BusinessLanguageLifecycleStatus;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly provenance: BusinessLanguageProvenance;
  readonly version: string;
  readonly fingerprint: string;
}

export interface BusinessLanguageRelation {
  readonly relationId: string;
  readonly fromConceptId: SemanticId;
  readonly toConceptId: SemanticId;
  readonly relationType: BusinessLanguageRelationType;
  readonly status: BusinessLanguageLifecycleStatus;
  readonly provenance: BusinessLanguageProvenance;
  readonly version: string;
  readonly fingerprint: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BusinessLanguageContext {
  readonly workspaceId?: string;
  readonly organizationId?: string;
  readonly languageTag?: string;
  readonly locale?: string;
  readonly domainContext?: readonly string[];
  readonly roleContext?: readonly string[];
  readonly industryContext?: readonly string[];
  readonly objectContextConceptIds?: readonly SemanticId[];
  readonly currentObject?: {
    readonly objectTypeConceptId: SemanticId;
    readonly objectId?: string;
    readonly label?: string;
  };
}

export interface ConceptResolutionCandidate {
  readonly concept: BusinessLanguageConcept;
  readonly alias?: BusinessLanguageAlias;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly contextMatched: boolean;
  readonly evidence: readonly string[];
}

export interface ConceptResolution {
  readonly input: string;
  readonly normalizedInput: string;
  readonly candidates: readonly ConceptResolutionCandidate[];
  readonly selectedConcept?: BusinessLanguageConcept;
  readonly confidence: number;
  readonly resolutionStatus: ConceptResolutionStatus;
  readonly ambiguityReason?: string;
  readonly resolutionEvidence: readonly string[];
  readonly modelAssistUsed: boolean;
}

export interface BusinessUtteranceInterpretation {
  readonly rawUtterance: string;
  readonly normalizedText: string;
  readonly utteranceClass: BusinessUtteranceClass;
  readonly intent: BusinessIntentClass;
  readonly conceptCandidates: readonly ConceptResolutionCandidate[];
  readonly resolvedConcepts: readonly BusinessLanguageConcept[];
  readonly ambiguousTerms: readonly ConceptResolution[];
  readonly missingInformation: readonly string[];
  readonly riskFlags: readonly string[];
  readonly resolutionStatus: ConceptResolutionStatus;
  readonly modelAssistUsed: boolean;
  readonly deterministicSignals: readonly string[];
  readonly rejectedModelConceptIds: readonly string[];
  readonly fingerprint: string;
}

export interface ModelAssistedBusinessLanguageProposal {
  readonly proposedConceptIds: readonly string[];
  readonly proposedAliases?: readonly {
    readonly aliasText: string;
    readonly targetConceptId: string;
    readonly rationale: string;
  }[];
}

export interface ModelAssistedBusinessLanguageValidation {
  readonly acceptedConceptIds: readonly SemanticId[];
  readonly rejectedConceptIds: readonly {
    readonly conceptId: string;
    readonly reason: "UNKNOWN_CONCEPT_ID" | "INVALID_SEMANTIC_ID";
  }[];
  readonly acceptedAliases: readonly {
    readonly aliasText: string;
    readonly targetConceptId: SemanticId;
  }[];
  readonly rejectedAliases: readonly {
    readonly aliasText: string;
    readonly targetConceptId: string;
    readonly reason: "UNKNOWN_CONCEPT_ID" | "INVALID_SEMANTIC_ID";
  }[];
}
