import type {
  BusinessIntentClass,
  BusinessUtteranceInterpretation,
} from "./business-language-foundation.js";
import type { SemanticId } from "./business-semantic-model.js";

export type BusinessEntityType =
  | "ORGANIZATION"
  | "WORKSPACE"
  | "CLIENT"
  | "CUSTOMER"
  | "CONTACT"
  | "LEAD"
  | "OPPORTUNITY"
  | "PROPOSAL"
  | "CONTRACT"
  | "PROJECT"
  | "MILESTONE"
  | "TASK"
  | "EMPLOYEE"
  | "TEAM"
  | "DEPARTMENT"
  | "INVOICE"
  | "PAYMENT"
  | "EXPENSE"
  | "SUPPLIER"
  | "PRODUCT"
  | "SERVICE"
  | "DOCUMENT"
  | "TICKET";

export type BusinessResolutionStatus =
  | "RESOLVED"
  | "PARTIALLY_RESOLVED"
  | "AMBIGUOUS"
  | "NOT_FOUND"
  | "INACCESSIBLE"
  | "NEEDS_INFORMATION"
  | "UNSUPPORTED";

export type BusinessAuthoritySensitivity =
  | "NONE"
  | "LOW"
  | "MATERIAL"
  | "APPROVAL_RELEVANT"
  | "EXECUTION_RELEVANT"
  | "HIGH_RISK";

export type BusinessSideEffectClass =
  | "NONE"
  | "READ_ONLY"
  | "DRAFT_ONLY"
  | "PROPOSE_ACTION"
  | "REQUEST_APPROVAL"
  | "EXECUTION_REQUEST";

export type BusinessMissingInformationCode =
  | "MISSING_ENTITY_IDENTITY"
  | "AMBIGUOUS_ENTITY"
  | "MISSING_TARGET_OBJECT"
  | "MISSING_RECIPIENT"
  | "MISSING_CURRENCY"
  | "MISSING_TIMEZONE"
  | "MISSING_TIME_RANGE"
  | "MISSING_RECORD_CONTEXT"
  | "MISSING_APPROVAL_OBJECT"
  | "MISSING_METRIC_DEFINITION"
  | "INSUFFICIENT_CONTEXT";

export type BusinessAmbiguityCode =
  | "ENTITY_NAME_COLLISION"
  | "ENTITY_TYPE_AMBIGUITY"
  | "PRONOUN_AMBIGUITY"
  | "ACTION_TARGET_AMBIGUITY"
  | "TEMPORAL_AMBIGUITY"
  | "METRIC_AMBIGUITY"
  | "SCOPE_AMBIGUITY";

export type BusinessFactStatus =
  | "USER_ASSERTION"
  | "VERIFIED_RECORD_FACT"
  | "CALCULATED_FACT"
  | "HYPOTHESIS"
  | "ASSUMPTION"
  | "UNKNOWN";

export type BusinessFilterOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "BEFORE"
  | "AFTER"
  | "BETWEEN"
  | "IS_OVERDUE"
  | "CONTAINS";

export type BusinessTimeGranularity =
  | "DAY"
  | "WEEK"
  | "MONTH"
  | "QUARTER"
  | "YEAR"
  | "BUSINESS_CALENDAR_DEPENDENT"
  | "UNKNOWN";

export type EntityMatchReason =
  | "EXACT_ID"
  | "EXTERNAL_ID"
  | "EXACT_NAME"
  | "NORMALIZED_NAME"
  | "WORKSPACE_ENTITY_ALIAS"
  | "EMAIL_MATCH"
  | "REFERENCE_NUMBER"
  | "CURRENT_CONTEXT"
  | "RECENT_REFERENCE"
  | "ENTITY_TYPE_CONTEXT"
  | "AUTHORIZED_WORKSPACE_SCOPE";

export type ModelRecordProposalRejectionReason =
  | "MODEL_PROPOSED_UNKNOWN_ENTITY"
  | "MODEL_PROPOSED_WRONG_WORKSPACE"
  | "MODEL_PROPOSED_INACCESSIBLE_ENTITY"
  | "MODEL_PROPOSED_UNSUPPORTED_ENTITY_TYPE";

export interface BusinessRecordRef {
  readonly workspaceId: string;
  readonly entityType: BusinessEntityType;
  readonly recordId: string;
  readonly canonicalTypeRef?: SemanticId;
  readonly displayLabel?: string;
  readonly domain?: string;
}

export interface BusinessContextFrame {
  readonly workspaceId: string;
  readonly userId?: string;
  readonly roleRefs: readonly string[];
  readonly permissionIds?: readonly string[];
  readonly currentModule?: string;
  readonly currentRecordRefs?: readonly BusinessRecordRef[];
  readonly activeClientRef?: BusinessRecordRef;
  readonly activeProjectRef?: BusinessRecordRef;
  readonly activeDocumentRef?: BusinessRecordRef;
  readonly recentResolvedRefs: readonly RecentBusinessReference[];
  readonly recentIntentRefs: readonly string[];
  readonly locale?: string;
  readonly timezone?: string;
  readonly baseCurrency?: string;
  readonly availableDomains: readonly string[];
  readonly correlationId?: string;
}

export interface RecentBusinessReference {
  readonly recordRef: BusinessRecordRef;
  readonly introducedByTurn?: string;
  readonly semanticRole: string;
  readonly recency: number;
}

export interface BusinessMissingInformation {
  readonly code: BusinessMissingInformationCode;
  readonly detail: string;
  readonly relatedMentionId?: string;
}

export interface BusinessAmbiguity {
  readonly code: BusinessAmbiguityCode;
  readonly detail: string;
  readonly candidateCount?: number;
  readonly relatedMentionId?: string;
}

export interface BusinessIntent {
  readonly intentId: string;
  readonly intentClass: BusinessIntentClass;
  readonly requestedOutcome: string;
  readonly domainCandidates: readonly string[];
  readonly conceptRefs: readonly SemanticId[];
  readonly actionCandidateRefs: readonly SemanticId[];
  readonly targetEntityTypes: readonly BusinessEntityType[];
  readonly requestedMetrics: readonly SemanticId[];
  readonly requestedDocuments: readonly SemanticId[];
  readonly requestedTimeRange?: BusinessTimeRange;
  readonly filters: readonly BusinessQueryFilter[];
  readonly sort?: string;
  readonly aggregation?: string;
  readonly requestedMutation?: string;
  readonly requestedCommunication?: string;
  readonly assumptions: readonly string[];
  readonly ambiguity: readonly BusinessAmbiguity[];
  readonly missingInformation: readonly BusinessMissingInformation[];
  readonly authoritySensitivity: BusinessAuthoritySensitivity;
  readonly sideEffectClass: BusinessSideEffectClass;
  readonly confidence: number;
  readonly resolutionStatus: BusinessResolutionStatus;
  readonly provenance: readonly string[];
  readonly interpreterVersion: string;
  readonly fingerprint: string;
}

export interface EntityMention {
  readonly mentionId: string;
  readonly rawText: string;
  readonly normalizedText: string;
  readonly expectedEntityTypes: readonly BusinessEntityType[];
  readonly canonicalConceptRefs: readonly SemanticId[];
  readonly startOffset?: number;
  readonly endOffset?: number;
  readonly candidateRefs: readonly BusinessRecordRef[];
  readonly resolvedRef?: BusinessRecordRef;
  readonly resolutionStatus: BusinessResolutionStatus;
  readonly ambiguityReason?: string;
  readonly missingInformation: readonly BusinessMissingInformation[];
  readonly resolutionEvidence: readonly string[];
  readonly provenance: readonly string[];
  readonly fingerprint: string;
}

export interface EntityCandidate {
  readonly recordRef: BusinessRecordRef;
  readonly entityType: BusinessEntityType;
  readonly displayLabel: string;
  readonly matchReasons: readonly EntityMatchReason[];
  readonly deterministicScore?: number;
  readonly contextScore?: number;
}

export interface EntityResolution {
  readonly mention: EntityMention;
  readonly candidates: readonly EntityCandidate[];
  readonly selectedEntity?: EntityCandidate;
  readonly resolutionStatus: BusinessResolutionStatus;
  readonly confidence: number;
  readonly filtersApplied: readonly string[];
  readonly contextEvidence: readonly string[];
  readonly permissionBoundary: string;
  readonly ambiguityReason?: string;
  readonly missingInformation: readonly BusinessMissingInformation[];
  readonly fingerprint: string;
}

export interface BusinessTimeRange {
  readonly expression: string;
  readonly start?: string;
  readonly end?: string;
  readonly timezone: string;
  readonly granularity: BusinessTimeGranularity;
  readonly relativeTo: string;
  readonly resolutionStatus: BusinessResolutionStatus;
  readonly missingInformation: readonly BusinessMissingInformation[];
  readonly ambiguity: readonly BusinessAmbiguity[];
  readonly fingerprint: string;
}

export interface BusinessQuantity {
  readonly expression: string;
  readonly value: number;
  readonly unit?: string;
  readonly currency?: string;
  readonly missingInformation: readonly BusinessMissingInformation[];
  readonly fingerprint: string;
}

export interface BusinessQueryFilter {
  readonly fieldConceptRef?: SemanticId;
  readonly operator: BusinessFilterOperator;
  readonly value?: string | number | boolean;
  readonly unit?: string;
  readonly currency?: string;
  readonly temporalBoundary?: BusinessTimeRange;
}

export interface BusinessQueryIntent {
  readonly targetEntityType?: BusinessEntityType;
  readonly targetRefs: readonly BusinessRecordRef[];
  readonly requestedConcepts: readonly SemanticId[];
  readonly requestedMetrics: readonly SemanticId[];
  readonly filters: readonly BusinessQueryFilter[];
  readonly timeRange?: BusinessTimeRange;
  readonly grouping?: string;
  readonly sorting?: string;
}

export interface BusinessActionProposalIntent {
  readonly action: string;
  readonly targetRefs: readonly BusinessRecordRef[];
  readonly recipientRefs: readonly BusinessRecordRef[];
  readonly missingInformation: readonly BusinessMissingInformation[];
  readonly authoritySensitivity: BusinessAuthoritySensitivity;
  readonly executionPerformed: false;
}

export interface BusinessUserAssertion {
  readonly rawText: string;
  readonly normalizedText: string;
  readonly conceptRefs: readonly SemanticId[];
  readonly status: BusinessFactStatus;
  readonly provenance: readonly string[];
}

export interface ModelRecordReferenceProposal {
  readonly recordRef: BusinessRecordRef;
  readonly rationale: string;
}

export interface ModelRecordReferenceValidation {
  readonly acceptedRefs: readonly BusinessRecordRef[];
  readonly rejectedRefs: readonly {
    readonly recordRef: BusinessRecordRef;
    readonly reason: ModelRecordProposalRejectionReason;
  }[];
}

export interface GroundedBusinessRequest {
  readonly requestId?: string;
  readonly workspaceId: string;
  readonly userId?: string;
  readonly sourceInterpretationRef?: string;
  readonly sourceInterpretation: BusinessUtteranceInterpretation;
  readonly intent: BusinessIntent;
  readonly entityMentions: readonly EntityMention[];
  readonly resolvedEntities: readonly EntityResolution[];
  readonly concepts: readonly SemanticId[];
  readonly queryIntent?: BusinessQueryIntent;
  readonly actionProposalIntent?: BusinessActionProposalIntent;
  readonly timeRange?: BusinessTimeRange;
  readonly quantities: readonly BusinessQuantity[];
  readonly filters: readonly BusinessQueryFilter[];
  readonly userAssertions: readonly BusinessUserAssertion[];
  readonly ambiguity: readonly BusinessAmbiguity[];
  readonly missingInformation: readonly BusinessMissingInformation[];
  readonly authoritySensitivity: BusinessAuthoritySensitivity;
  readonly resolutionStatus: BusinessResolutionStatus;
  readonly provenance: readonly string[];
  readonly modelAssistUsed: boolean;
  readonly modelRecordValidation?: ModelRecordReferenceValidation;
  readonly executionPerformed: false;
  readonly fingerprint: string;
}
