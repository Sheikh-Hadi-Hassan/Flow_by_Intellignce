import { NORTHSTAR_SLUG } from "../../prototype/defaults";
import type { AskApplicationContext } from "../types";
import { BUSINESS_ENTITY_REGISTRY } from "./registry";
import { validateBusinessQueryPlanShape } from "./schema";
import type {
  BusinessEntityDefinition,
  BusinessQueryErrorCode,
  BusinessQueryPlan,
  BusinessQueryRow,
  BusinessQueryScalar,
  BusinessQueryResult,
} from "./types";

const AS_OF = "Today, 08:12";

function reject(
  code: BusinessQueryErrorCode,
  message: string,
): BusinessQueryResult {
  return { ok: false, error: { code, message }, adapterExecutions: 0 };
}

function scalar(row: BusinessQueryRow, field: string): BusinessQueryScalar {
  return row[field] as BusinessQueryScalar;
}

function compare(left: BusinessQueryScalar, right: BusinessQueryScalar) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), "en-US");
}

function matches(
  actual: BusinessQueryScalar,
  operator: BusinessQueryPlan["filters"][number]["operator"],
  expected: BusinessQueryScalar,
) {
  if (typeof actual === "string" && typeof expected === "string") {
    const left = actual.toLocaleLowerCase("en-US");
    const right = expected.toLocaleLowerCase("en-US");
    if (operator === "contains") return left.includes(right);
    return operator === "eq" ? left === right : left !== right;
  }
  return operator === "eq" ? actual === expected : actual !== expected;
}

export function executeBusinessQuery(
  rawPlan: unknown,
  context: AskApplicationContext,
  registry: ReadonlyMap<
    string,
    BusinessEntityDefinition
  > = BUSINESS_ENTITY_REGISTRY,
): BusinessQueryResult {
  const shape = validateBusinessQueryPlanShape(rawPlan);
  if (!shape.ok) return reject(shape.code, shape.message);
  const plan = rawPlan as BusinessQueryPlan;
  const entity = registry.get(plan.entity);
  if (!entity) return reject("UNKNOWN_ENTITY", "Unknown business entity.");
  if (entity.availability === "unavailable") {
    return reject("CAPABILITY_UNAVAILABLE", entity.reason);
  }
  if (!entity.operations.includes(plan.operation)) {
    return reject("UNSUPPORTED_OPERATION", "Unsupported entity operation.");
  }
  if (plan.fields.some((field) => !entity.readableFields.includes(field))) {
    return reject("UNKNOWN_FIELD", "Plan contains an unknown readable field.");
  }
  if (
    plan.filters.some((filter) => !entity.filterFields.includes(filter.field))
  ) {
    return reject("UNKNOWN_FIELD", "Plan contains an unknown filter field.");
  }
  if (
    plan.filters.some((filter) => !entity.operators.includes(filter.operator))
  ) {
    return reject(
      "UNKNOWN_OPERATOR",
      "Plan contains an unknown filter operator.",
    );
  }
  if (
    plan.filters.some(
      (filter) =>
        typeof filter.value !== entity.fieldTypes[filter.field] ||
        (filter.operator === "contains" &&
          entity.fieldTypes[filter.field] !== "string"),
    )
  ) {
    return reject("INVALID_VALUE", "Filter value does not match its field.");
  }
  if (plan.sort.some((sort) => !entity.sortFields.includes(sort.field))) {
    return reject(
      "UNSUPPORTED_SORT_FIELD",
      "Plan contains an unsupported sort field.",
    );
  }
  if (context.workspaceId !== NORTHSTAR_SLUG) {
    return reject(
      "CROSS_WORKSPACE",
      "Workspace is outside the authorized scope.",
    );
  }
  if (!context.permissions.includes(entity.authorization.permission)) {
    return reject("PERMISSION_DENIED", "Required entity permission is absent.");
  }
  if (
    entity.authorization.mode === "building-block" &&
    !context.activeBuildingBlocks?.includes(entity.authorization.buildingBlock)
  ) {
    return reject(
      "BUILDING_BLOCK_INACTIVE",
      "Required entity building block is inactive.",
    );
  }

  let matched = [
    ...new Map(
      entity.adapter.load(context).map((row) => [String(row.id), row] as const),
    ).values(),
  ].filter((row) =>
    plan.filters.every((filter) =>
      matches(scalar(row, filter.field), filter.operator, filter.value),
    ),
  );

  for (const sort of [...plan.sort].reverse()) {
    matched = [...matched].sort((left, right) => {
      const result = compare(
        scalar(left, sort.field),
        scalar(right, sort.field),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }

  const selected =
    plan.operation === "list" ? matched.slice(0, plan.limit) : matched;
  const recordIds = selected.map((row) => String(row.id));
  return {
    ok: true,
    operation: plan.operation,
    entity: entity.id,
    rows:
      plan.operation === "list"
        ? selected.map((row) =>
            Object.fromEntries(plan.fields.map((field) => [field, row[field]])),
          )
        : [],
    count: matched.length,
    recordIds,
    evidence: selected.map((row, index) => ({
      id: recordIds[index]!,
      kind: "system-record",
      label: entity.evidenceLabel,
      source: `${entity.evidenceSource} · ${recordIds[index]}`,
      capturedAtLabel: AS_OF,
      claim: "FACT",
      trust: "high",
      ...(typeof row.href === "string" ? { href: row.href } : {}),
    })),
    adapterExecutions: 1,
  };
}
