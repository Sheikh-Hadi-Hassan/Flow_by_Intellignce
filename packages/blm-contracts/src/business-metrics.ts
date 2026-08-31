import type {
  BusinessEntityType,
  BusinessMissingInformation,
  BusinessRecordRef,
  BusinessTimeRange,
  BusinessUserAssertion,
} from "./business-intent-entity-resolution.js";
import type { BusinessLogicDefinition } from "./business-logic-registry.js";
import type { BusinessEvidenceItem } from "./business-query-planning.js";
import type { SemanticId } from "./business-semantic-model.js";

export type BusinessMetricType =
  | "AMOUNT"
  | "COUNT"
  | "RATE"
  | "RATIO"
  | "PERCENTAGE"
  | "DURATION"
  | "AVERAGE"
  | "BALANCE"
  | "VARIANCE"
  | "INDEX";

export type BusinessMetricGrain =
  | "WORKSPACE"
  | "CLIENT"
  | "PROJECT"
  | "EMPLOYEE"
  | "INVOICE"
  | "PERIOD"
  | "CLIENT_PERIOD"
  | "PROJECT_PERIOD"
  | "EMPLOYEE_PERIOD";

export type BusinessMetricUnitType =
  "CURRENCY" | "PERCENTAGE" | "RATIO" | "HOURS" | "DAYS" | "COUNT" | "INDEX";

export type BusinessMetricStatus =
  "ACTIVE" | "DRAFT" | "DEPRECATED" | "INACTIVE";

export type BusinessMetricAggregationRule =
  | "SUM"
  | "COUNT"
  | "AVERAGE"
  | "WEIGHTED_AVERAGE"
  | "LAST_VALUE"
  | "MIN"
  | "MAX"
  | "DO_NOT_AGGREGATE";

export type BusinessMetricMissingDataPolicy =
  | "REQUIRE_ALL_INPUTS"
  | "ALLOW_PARTIAL_WITH_WARNING"
  | "ZERO_IF_EXPLICIT_EMPTY_SET";

export type BusinessMetricZeroHandlingPolicy =
  "ZERO_IS_VALID" | "DENOMINATOR_ZERO_UNDEFINED" | "ZERO_REQUIRES_EVIDENCE";

export interface BusinessRoundingPolicy {
  readonly mode: "HALF_UP";
  readonly precision: number;
}

export interface BusinessLogicInputRequirement {
  readonly inputKey: string;
  readonly businessConceptId: SemanticId;
  readonly entityType: BusinessEntityType;
  readonly fieldConcept?: SemanticId;
  readonly metricId?: SemanticId;
  readonly required: boolean;
  readonly expectedUnit?: BusinessMetricUnitType;
  readonly expectedCurrency?: string;
  readonly grain: BusinessMetricGrain;
  readonly timeAlignment: "SAME_PERIOD" | "AS_OF" | "LIFETIME" | "NONE";
  readonly aggregationRule?: BusinessMetricAggregationRule;
  readonly missingDataPolicy: BusinessMetricMissingDataPolicy;
}

export interface GovernedBusinessMetricDefinition {
  readonly metricId: SemanticId;
  readonly semanticConceptId: SemanticId;
  readonly canonicalName: string;
  readonly displayName: string;
  readonly domain: string;
  readonly metricType: BusinessMetricType;
  readonly description: string;
  readonly grain: BusinessMetricGrain;
  readonly dimensions: readonly string[];
  readonly unitType: BusinessMetricUnitType;
  readonly currencySemantics?: "SINGLE_CURRENCY_REQUIRED" | "NOT_CURRENCY";
  readonly percentageSemantics?: "RATIO_TIMES_100" | "PERCENTAGE_POINTS";
  readonly timeSemantics: "POINT_IN_TIME" | "PERIOD" | "LIFETIME";
  readonly businessLogicId: SemanticId;
  readonly inputRequirements: readonly BusinessLogicInputRequirement[];
  readonly aggregationRule: BusinessMetricAggregationRule;
  readonly missingDataPolicy: BusinessMetricMissingDataPolicy;
  readonly zeroHandlingPolicy: BusinessMetricZeroHandlingPolicy;
  readonly roundingPolicy?: BusinessRoundingPolicy;
  readonly applicableEntityTypes: readonly BusinessEntityType[];
  readonly status: BusinessMetricStatus;
  readonly version: string;
  readonly provenance: readonly string[];
  readonly fingerprint: string;
}

export type MetricResolutionStatus =
  | "SELECTED"
  | "AMBIGUOUS_METRIC"
  | "UNKNOWN_METRIC"
  | "INACTIVE_METRIC"
  | "UNKNOWN_LOGIC"
  | "INVALID_LOGIC";

export interface MetricSelectionResult {
  readonly requestedConcepts: readonly SemanticId[];
  readonly candidates: readonly GovernedBusinessMetricDefinition[];
  readonly selectedMetricId?: SemanticId;
  readonly selectedMetric?: GovernedBusinessMetricDefinition;
  readonly logicDefinition?: BusinessLogicDefinition;
  readonly resolutionStatus: MetricResolutionStatus;
  readonly ambiguity: readonly string[];
  readonly missingInformation: readonly BusinessMissingInformation[];
  readonly selectionEvidence: readonly string[];
  readonly fingerprint: string;
}

export interface BusinessCalculationInput {
  readonly inputKey: string;
  readonly value?: string | number | boolean;
  readonly unit?: BusinessMetricUnitType;
  readonly currency?: string;
  readonly entityRef: BusinessRecordRef;
  readonly evidenceId: string;
  readonly evidence: BusinessEvidenceItem;
}

export interface BusinessCalculationInputBundle {
  readonly calculationRequestId: string;
  readonly workspaceId: string;
  readonly metricId: SemanticId;
  readonly logicId: SemanticId;
  readonly entityRefs: readonly BusinessRecordRef[];
  readonly timeRange?: BusinessTimeRange;
  readonly inputs: readonly BusinessCalculationInput[];
  readonly evidenceRefs: readonly string[];
  readonly currency?: string;
  readonly units: Readonly<Record<string, BusinessMetricUnitType>>;
  readonly completeness: "COMPLETE" | "INCOMPLETE" | "INVALID";
  readonly missingInputs: readonly BusinessLogicInputRequirement[];
  readonly fingerprint: string;
}

export type BusinessCalculationResultStatus =
  | "CALCULATED"
  | "NEEDS_INFORMATION"
  | "INVALID_INPUT"
  | "UNDEFINED"
  | "NOT_APPLICABLE"
  | "INSUFFICIENT_EVIDENCE";

export interface BusinessCalculationResult {
  readonly calculationId: string;
  readonly workspaceId: string;
  readonly metricId: SemanticId;
  readonly metricVersion: string;
  readonly logicId: SemanticId;
  readonly logicVersion: string;
  readonly entityRefs: readonly BusinessRecordRef[];
  readonly timeRange?: BusinessTimeRange;
  readonly value?: string | number | boolean;
  readonly unit: BusinessMetricUnitType;
  readonly currency?: string;
  readonly status: BusinessCalculationResultStatus;
  readonly inputFingerprint: string;
  readonly resultFingerprint: string;
  readonly evidence: readonly BusinessEvidenceItem[];
  readonly missingInputs: readonly BusinessLogicInputRequirement[];
  readonly warnings: readonly string[];
  readonly calculatedAt: string;
  readonly provenance: readonly string[];
  readonly explanationFacts: Readonly<
    Record<string, string | number | boolean>
  >;
}

export type BusinessAssertionVerificationStatus =
  | "SUPPORTED"
  | "NOT_SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "CANNOT_VERIFY"
  | "NOT_APPLICABLE";

export interface BusinessAssertionVerification {
  readonly assertionId: string;
  readonly assertionType:
    "PROFITABILITY" | "MARGIN" | "NUMERIC_CLAIM" | "UNKNOWN";
  readonly sourceAssertion: BusinessUserAssertion;
  readonly metricIds: readonly SemanticId[];
  readonly calculationIds: readonly string[];
  readonly status: BusinessAssertionVerificationStatus;
  readonly supportingEvidence: readonly BusinessEvidenceItem[];
  readonly contradictingEvidence: readonly BusinessEvidenceItem[];
  readonly missingInformation: readonly BusinessMissingInformation[];
  readonly explanationFacts: readonly string[];
  readonly fingerprint: string;
}
