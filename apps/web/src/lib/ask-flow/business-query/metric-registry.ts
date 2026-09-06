import type { AskApplicationContext } from "../types";
import { executeBusinessQuery } from "./executor";
import { BUSINESS_ENTITY_REGISTRY } from "./registry";
import type {
  BusinessEntityDefinition,
  BusinessMetricResult,
  BusinessQueryResult,
  MetricDefinition,
} from "./types";

const definitions: readonly MetricDefinition[] = [
  {
    id: "project_count",
    availability: "enabled",
    entity: "project",
    description: "Total number of projects in the authorized workspace.",
    calculation: { operation: "count", filters: [] },
    requiredFields: ["id"],
    allowedFilters: [],
    allowedGrouping: [],
    authorization: {
      mode: "permission-only",
      permission: "project.manage",
      proof: "ASK_TOOL_DEFINITIONS.list_projects and missionViewer.permissions",
    },
    evidencePolicy: "record-per-row",
  },
  {
    id: "active_project_count",
    availability: "enabled",
    entity: "project",
    description: "Projects whose canonical status contains Active.",
    calculation: {
      operation: "count",
      filters: [
        { field: "statusLabel", operator: "contains", value: "Active" },
      ],
    },
    requiredFields: ["id", "statusLabel"],
    allowedFilters: [],
    allowedGrouping: [],
    authorization: {
      mode: "permission-only",
      permission: "project.manage",
      proof: "ASK_TOOL_DEFINITIONS.list_projects and missionViewer.permissions",
    },
    evidencePolicy: "record-per-row",
  },
  {
    id: "employee_count",
    availability: "enabled",
    entity: "employee",
    description:
      "Total employee resource profiles in the authorized workspace.",
    calculation: { operation: "count", filters: [] },
    requiredFields: ["id", "resourceType"],
    allowedFilters: [],
    allowedGrouping: [],
    authorization: {
      mode: "permission-only",
      permission: "project.manage",
      proof:
        "ASK_TOOL_DEFINITIONS.get_team_capacity and missionViewer.permissions",
    },
    evidencePolicy: "record-per-row",
  },
  {
    id: "active_employee_count",
    availability: "enabled",
    entity: "employee",
    description: "Employee resource profiles with canonical active status.",
    calculation: {
      operation: "count",
      filters: [{ field: "status", operator: "eq", value: "active" }],
    },
    requiredFields: ["id", "resourceType", "status"],
    allowedFilters: [],
    allowedGrouping: [],
    authorization: {
      mode: "permission-only",
      permission: "project.manage",
      proof:
        "ASK_TOOL_DEFINITIONS.get_team_capacity and missionViewer.permissions",
    },
    evidencePolicy: "record-per-row",
  },
  ...(["task_count", "pending_task_count", "overdue_task_count"] as const).map(
    (id): MetricDefinition => ({
      id,
      availability: "unavailable",
      entity: "task",
      description:
        "Task metric unavailable until authoritative task records exist.",
      reasonCode: "AUTHORITATIVE_SOURCE_MISSING",
      reason:
        "Task records are not available from an authoritative source yet.",
    }),
  ),
];

export const METRIC_REGISTRY: ReadonlyMap<string, MetricDefinition> = new Map(
  definitions.map((definition) => [definition.id, Object.freeze(definition)]),
);

function rejectUnknownMetric(): BusinessMetricResult {
  return {
    ok: false,
    error: { code: "UNKNOWN_METRIC", message: "Unknown business metric." },
    adapterExecutions: 0,
  };
}

export function executeBusinessMetric(
  metricId: unknown,
  context: AskApplicationContext,
  entityRegistry: ReadonlyMap<
    string,
    BusinessEntityDefinition
  > = BUSINESS_ENTITY_REGISTRY,
  metricRegistry: ReadonlyMap<string, MetricDefinition> = METRIC_REGISTRY,
): BusinessMetricResult {
  if (typeof metricId !== "string") return rejectUnknownMetric();
  const metric = metricRegistry.get(metricId);
  if (!metric) return rejectUnknownMetric();
  if (metric.availability === "unavailable") {
    return {
      ok: false,
      error: { code: "CAPABILITY_UNAVAILABLE", message: metric.reason },
      adapterExecutions: 0,
    };
  }
  if (!context.permissions.includes(metric.authorization.permission)) {
    return {
      ok: false,
      error: {
        code: "PERMISSION_DENIED",
        message: "Required metric permission is absent.",
      },
      adapterExecutions: 0,
    };
  }
  if (
    metric.authorization.mode === "building-block" &&
    !context.activeBuildingBlocks?.includes(metric.authorization.buildingBlock)
  ) {
    return {
      ok: false,
      error: {
        code: "BUILDING_BLOCK_INACTIVE",
        message: "Required metric building block is inactive.",
      },
      adapterExecutions: 0,
    };
  }

  const result: BusinessQueryResult = executeBusinessQuery(
    {
      version: 1,
      operation: metric.calculation.operation,
      entity: metric.entity,
      fields: [],
      filters: metric.calculation.filters,
      sort: [],
      limit: 100,
    },
    context,
    entityRegistry,
  );
  if (!result.ok) return result;
  return {
    ok: true,
    metricId: metric.id,
    value: result.count,
    recordIds: result.recordIds,
    evidence: result.evidence,
    adapterExecutions: result.adapterExecutions,
  };
}
