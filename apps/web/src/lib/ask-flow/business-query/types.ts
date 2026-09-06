import type { EvidenceRef } from "../../mission-control/types";
import type { AskApplicationContext } from "../types";

export type BusinessQueryOperation = "list" | "count";
export type BusinessQueryFilterOperator = "eq" | "neq" | "contains";
export type BusinessEntityId = "client" | "project" | "task" | "employee";
export type BusinessQueryScalar = string | number | boolean;
export type BusinessQueryRow = Readonly<Record<string, unknown>>;

export interface BusinessQueryPlan {
  readonly version: 1;
  readonly operation: BusinessQueryOperation;
  readonly entity: BusinessEntityId;
  readonly fields: readonly string[];
  readonly filters: readonly {
    readonly field: string;
    readonly operator: BusinessQueryFilterOperator;
    readonly value: BusinessQueryScalar;
  }[];
  readonly sort: readonly {
    readonly field: string;
    readonly direction: "asc" | "desc";
  }[];
  readonly limit: number;
}

export type BusinessQueryErrorCode =
  | "MALFORMED_PLAN"
  | "ADDITIONAL_PROPERTY"
  | "UNKNOWN_METRIC"
  | "UNKNOWN_ENTITY"
  | "CAPABILITY_UNAVAILABLE"
  | "UNSUPPORTED_OPERATION"
  | "UNKNOWN_FIELD"
  | "UNKNOWN_OPERATOR"
  | "INVALID_VALUE"
  | "UNSUPPORTED_SORT_FIELD"
  | "INVALID_LIMIT"
  | "PERMISSION_DENIED"
  | "BUILDING_BLOCK_INACTIVE"
  | "CROSS_WORKSPACE";

export type BusinessQueryResult =
  | {
      readonly ok: true;
      readonly operation: BusinessQueryOperation;
      readonly entity: BusinessEntityId;
      readonly rows: readonly BusinessQueryRow[];
      readonly count: number;
      readonly recordIds: readonly string[];
      readonly evidence: readonly EvidenceRef[];
      readonly adapterExecutions: 1;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: BusinessQueryErrorCode;
        readonly message: string;
      };
      readonly adapterExecutions: 0;
    };

export interface BusinessQueryAdapter {
  load(context: AskApplicationContext): readonly BusinessQueryRow[];
}

export type CapabilityAuthorization =
  | {
      readonly mode: "building-block";
      readonly permission: string;
      readonly buildingBlock: string;
      readonly proof: string;
    }
  | {
      readonly mode: "permission-only";
      readonly permission: string;
      readonly proof: string;
    };

interface EnabledBusinessEntityDefinition {
  readonly id: BusinessEntityId;
  readonly availability: "enabled";
  readonly authorization: CapabilityAuthorization;
  readonly operations: readonly BusinessQueryOperation[];
  readonly readableFields: readonly string[];
  readonly filterFields: readonly string[];
  readonly sortFields: readonly string[];
  readonly fieldTypes: Readonly<
    Record<string, "string" | "number" | "boolean">
  >;
  readonly operators: readonly BusinessQueryFilterOperator[];
  readonly evidencePolicy: "record-per-row";
  readonly evidenceLabel: string;
  readonly evidenceSource: string;
  readonly adapter: BusinessQueryAdapter;
}

interface UnavailableBusinessEntityDefinition {
  readonly id: BusinessEntityId;
  readonly availability: "unavailable";
  readonly reasonCode:
    "AUTHORITATIVE_SOURCE_MISSING" | "RUNTIME_MANIFEST_MISSING";
  readonly reason: string;
}

export type BusinessEntityDefinition =
  EnabledBusinessEntityDefinition | UnavailableBusinessEntityDefinition;

export type BusinessMetricId =
  | "project_count"
  | "active_project_count"
  | "task_count"
  | "pending_task_count"
  | "overdue_task_count"
  | "employee_count"
  | "active_employee_count";

interface EnabledMetricDefinition {
  readonly id: BusinessMetricId;
  readonly availability: "enabled";
  readonly entity: BusinessEntityId;
  readonly description: string;
  readonly calculation: {
    readonly operation: "count";
    readonly filters: BusinessQueryPlan["filters"];
  };
  readonly requiredFields: readonly string[];
  readonly allowedFilters: readonly string[];
  readonly allowedGrouping: readonly string[];
  readonly authorization: CapabilityAuthorization;
  readonly evidencePolicy: "record-per-row";
}

interface UnavailableMetricDefinition {
  readonly id: BusinessMetricId;
  readonly availability: "unavailable";
  readonly entity: BusinessEntityId;
  readonly description: string;
  readonly reasonCode:
    "AUTHORITATIVE_SOURCE_MISSING" | "RUNTIME_MANIFEST_MISSING";
  readonly reason: string;
}

export type MetricDefinition =
  EnabledMetricDefinition | UnavailableMetricDefinition;

export type BusinessMetricResult =
  | {
      readonly ok: true;
      readonly metricId: BusinessMetricId;
      readonly value: number;
      readonly recordIds: readonly string[];
      readonly evidence: readonly EvidenceRef[];
      readonly adapterExecutions: 1;
    }
  | Extract<BusinessQueryResult, { ok: false }>;
