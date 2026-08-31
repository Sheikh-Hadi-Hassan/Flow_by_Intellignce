import type {
  BusinessContextFrame,
  BusinessEntityType,
  BusinessMissingInformation,
  BusinessQueryFilter,
  BusinessQuantity,
  BusinessRecordRef,
  BusinessTimeRange,
  BusinessUserAssertion,
} from "./business-intent-entity-resolution.js";
import type { SemanticId } from "./business-semantic-model.js";

export type BusinessDataQueryPlanStatus =
  | "READY"
  | "PARTIALLY_READY"
  | "NEEDS_INFORMATION"
  | "UNAUTHORIZED"
  | "UNSUPPORTED"
  | "INVALID";

export type BusinessDataQueryOperation =
  | "GET_BY_REF"
  | "FIND"
  | "LIST"
  | "FILTER"
  | "RELATED_RECORDS"
  | "EXISTS"
  | "COUNT"
  | "SORT"
  | "LIMIT"
  | "GROUP"
  | "SUM"
  | "MIN"
  | "MAX"
  | "AVG";

export type BusinessDataProviderKind =
  | "FLOW_NATIVE"
  | "CRM_ADAPTER"
  | "ACCOUNTING_ADAPTER"
  | "PROJECT_ADAPTER"
  | "HR_ADAPTER"
  | "ERP_ADAPTER"
  | "DOCUMENT_PROVIDER"
  | "CUSTOM_API"
  | "TEST_PROVIDER";

export type SystemOfRecordClass =
  | "FLOW_AUTHORITATIVE"
  | "EXTERNAL_AUTHORITATIVE"
  | "SHARED_WITH_RECONCILIATION"
  | "DERIVED_ONLY"
  | "EPHEMERAL_LIVE";

export type BusinessDataExecutionPolicy = "READ_ONLY" | "NO_EXECUTION";

export type BusinessDataResultStatus =
  | "SUCCESS"
  | "PARTIAL"
  | "NEEDS_INFORMATION"
  | "UNAUTHORIZED"
  | "UNSUPPORTED"
  | "PROVIDER_ERROR";

export type BusinessDataQualityStatus =
  | "OK"
  | "MISSING"
  | "STALE"
  | "CONFLICTING"
  | "INCOMPLETE"
  | "INVALID"
  | "UNKNOWN";

export type BusinessProviderErrorCode =
  | "PROVIDER_NOT_AVAILABLE"
  | "ENTITY_TYPE_UNSUPPORTED"
  | "CAPABILITY_UNSUPPORTED"
  | "RECORD_NOT_FOUND"
  | "RECORD_INACCESSIBLE"
  | "MISSING_REQUIRED_FIELD"
  | "STALE_DATA"
  | "PROVIDER_ERROR"
  | "TIMEOUT"
  | "CONFLICTING_SYSTEMS_OF_RECORD";

export type BusinessEvidenceAuthorityClass =
  | "AUTHORITATIVE_RECORD"
  | "EXTERNAL_RECORD"
  | "DERIVED_RECORD"
  | "USER_ASSERTION"
  | "UNVERIFIED";

export interface BusinessDataProviderCapability {
  readonly capabilityId: string;
  readonly entityType: BusinessEntityType;
  readonly operations: readonly BusinessDataQueryOperation[];
  readonly providerKind: BusinessDataProviderKind;
  readonly systemOfRecordClass: SystemOfRecordClass;
  readonly requiredPermissions: readonly string[];
}

export interface BusinessDataAuthorizationRequirement {
  readonly entityType: BusinessEntityType;
  readonly operation: BusinessDataQueryOperation;
  readonly requiredPermissions: readonly string[];
  readonly workspaceId: string;
}

export interface BusinessDataQueryStep {
  readonly stepId: string;
  readonly operation: BusinessDataQueryOperation;
  readonly targetEntityType: BusinessEntityType;
  readonly providerCapability: string;
  readonly inputRefs: readonly BusinessRecordRef[];
  readonly filters: readonly BusinessQueryFilter[];
  readonly projection: readonly string[];
  readonly ordering: readonly string[];
  readonly grouping: readonly string[];
  readonly limit: number;
  readonly timeRange?: BusinessTimeRange;
  readonly requiredPermissions: readonly string[];
  readonly dependencies: readonly string[];
  readonly expectedOutput:
    "RECORDS" | "COUNT" | "EXISTS" | "AGGREGATE" | "EVIDENCE";
  readonly evidencePolicy: "REQUIRED" | "OPTIONAL" | "NONE";
  readonly relationshipTraversal?: {
    readonly from: BusinessEntityType;
    readonly to: BusinessEntityType;
    readonly relationship: string;
    readonly bounded: true;
  };
  readonly parallelizable: boolean;
}

export interface RequiredBusinessCalculation {
  readonly logicId: SemanticId;
  readonly metricId?: SemanticId;
  readonly inputEvidenceRequirements: readonly {
    readonly field: string;
    readonly entityType: BusinessEntityType;
    readonly sourceStepId: string;
  }[];
  readonly parameterBindings: Readonly<Record<string, string>>;
  readonly reason: string;
}

export interface AssertionVerificationNeed {
  readonly assertionFingerprint: string;
  readonly assertion: BusinessUserAssertion;
  readonly requiredEvidence: readonly string[];
  readonly requiredCalculation?: RequiredBusinessCalculation;
}

export interface BusinessDataQueryPlan {
  readonly planId: string;
  readonly workspaceId: string;
  readonly actorContext: BusinessContextFrame;
  readonly sourceIntentFingerprint: string;
  readonly purpose: string;
  readonly targetEntityTypes: readonly BusinessEntityType[];
  readonly steps: readonly BusinessDataQueryStep[];
  readonly requestedEvidence: readonly string[];
  readonly requiredMetrics: readonly SemanticId[];
  readonly requiredCalculations: readonly RequiredBusinessCalculation[];
  readonly assertionVerificationNeeds: readonly AssertionVerificationNeed[];
  readonly timeContext?: BusinessTimeRange;
  readonly quantityContext: readonly BusinessQuantity[];
  readonly assumptions: readonly string[];
  readonly unresolvedInputs: readonly BusinessMissingInformation[];
  readonly authorizationRequirements: readonly BusinessDataAuthorizationRequirement[];
  readonly resultShape:
    "RECORD_SET" | "COUNT" | "EXISTS" | "CALCULATION_INPUTS" | "EVIDENCE_ONLY";
  readonly executionPolicy: BusinessDataExecutionPolicy;
  readonly status: BusinessDataQueryPlanStatus;
  readonly fingerprint: string;
  readonly createdAt: string;
}

export interface BusinessDataReadRequest {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly actorContext: BusinessContextFrame;
  readonly entityType: BusinessEntityType;
  readonly operation: BusinessDataQueryOperation;
  readonly recordRefs: readonly BusinessRecordRef[];
  readonly filters: readonly BusinessQueryFilter[];
  readonly projection: readonly string[];
  readonly sort: readonly string[];
  readonly limit: number;
  readonly timeRange?: BusinessTimeRange;
  readonly relationshipTraversal?: BusinessDataQueryStep["relationshipTraversal"];
  readonly evidenceRequirements: readonly string[];
  readonly planId: string;
  readonly queryStepId: string;
}

export interface BusinessEvidenceItem {
  readonly evidenceId: string;
  readonly workspaceId: string;
  readonly entityType: BusinessEntityType;
  readonly recordRef: BusinessRecordRef;
  readonly field: string;
  readonly value: string | number | boolean;
  readonly sourceProvider: string;
  readonly sourceSystem: string;
  readonly systemOfRecordClass: SystemOfRecordClass;
  readonly observedAt: string;
  readonly effectiveAt?: string;
  readonly provenance: readonly string[];
  readonly authorityClass: BusinessEvidenceAuthorityClass;
  readonly confidence?: number;
  readonly queryPlanId: string;
  readonly queryStepId: string;
  readonly dataQuality: BusinessDataQualityStatus;
  readonly fingerprint: string;
}

export interface BusinessDataRecord {
  readonly recordRef: BusinessRecordRef;
  readonly fields: Readonly<Record<string, string | number | boolean>>;
  readonly evidenceIds: readonly string[];
  readonly sourceProvider: string;
  readonly systemOfRecordClass: SystemOfRecordClass;
}

export interface BusinessDataProviderError {
  readonly code: BusinessProviderErrorCode;
  readonly detail: string;
  readonly queryStepId?: string;
  readonly providerId?: string;
}

export interface BusinessDataResult {
  readonly queryPlanId: string;
  readonly status: BusinessDataResultStatus;
  readonly records: readonly BusinessDataRecord[];
  readonly evidence: readonly BusinessEvidenceItem[];
  readonly counts: Readonly<Record<string, number>>;
  readonly missingData: readonly BusinessMissingInformation[];
  readonly warnings: readonly string[];
  readonly errors: readonly BusinessDataProviderError[];
  readonly authorizationSummary: {
    readonly workspaceId: string;
    readonly actorPermissionScope: readonly string[];
    readonly returnedRecordCount: number;
  };
  readonly sourceSummary: readonly {
    readonly providerId: string;
    readonly sourceSystem: string;
    readonly systemOfRecordClass: SystemOfRecordClass;
  }[];
  readonly fingerprint: string;
}
