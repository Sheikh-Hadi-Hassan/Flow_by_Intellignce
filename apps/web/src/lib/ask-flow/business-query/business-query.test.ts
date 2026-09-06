import { northstarCrmSeed } from "@flow/contracts";
import { describe, expect, it, vi } from "vitest";

import type { AskApplicationContext } from "../types";
import { routeAskIntent } from "../assistant/planner";
import { resolveServerAskRequest } from "../assistant/server-context";
import { ASK_TOOL_DEFINITIONS, runAskTool } from "../assistant/tools";
import { executeBusinessQuery } from "./executor";
import { executeBusinessMetric, METRIC_REGISTRY } from "./metric-registry";
import { createBusinessEntityRegistry } from "./registry";
import type { BusinessEntityDefinition, BusinessQueryPlan } from "./types";

const context: AskApplicationContext = {
  workspaceId: "northstar-creative",
  userId: "ns-res-maya",
  role: "Founder",
  permissions: ["client.read"],
  route: "/northstar-creative/admin",
  visibleRecordIds: [],
  locale: "en-US",
  currency: "USD",
  timezone: "America/Chicago",
  conversationId: "business-query-test",
  activeBuildingBlocks: ["crm.core"],
};

const listPlan: BusinessQueryPlan = {
  version: 1,
  operation: "list",
  entity: "client",
  fields: ["id", "name", "industry", "status"],
  filters: [],
  sort: [],
  limit: 100,
};

const countPlan: BusinessQueryPlan = {
  version: 1,
  operation: "count",
  entity: "client",
  fields: [],
  filters: [],
  sort: [],
  limit: 50,
};

const operationalContext: AskApplicationContext = {
  ...context,
  permissions: ["client.read", "project.manage"],
};

function planFor(
  entity: "project" | "employee",
  operation: "list" | "count" = "list",
): BusinessQueryPlan {
  return {
    version: 1,
    operation,
    entity,
    fields:
      entity === "project"
        ? ["id", "name", "statusLabel", "progressBps"]
        : ["id", "displayName", "status"],
    filters: [],
    sort: [],
    limit: 100,
  };
}

function expectRejected(plan: unknown, code: string) {
  expect(executeBusinessQuery(plan, context)).toMatchObject({
    ok: false,
    error: { code },
    adapterExecutions: 0,
  });
}

function enabledEntity(id: "client" | "project" | "employee") {
  const definition = createBusinessEntityRegistry().get(id);
  if (!definition || definition.availability !== "enabled") {
    throw new Error(`Expected ${id} to be enabled`);
  }
  return definition;
}

describe("business query executor", () => {
  it("lists all 52 unique clients with deterministic evidence", () => {
    const first = executeBusinessQuery(listPlan, context);
    const second = executeBusinessQuery(listPlan, context);
    expect(first).toMatchObject({
      ok: true,
      operation: "list",
      entity: "client",
      count: 52,
      adapterExecutions: 1,
    });
    if (!first.ok || !second.ok) throw new Error("Expected successful query");
    expect(first.rows).toHaveLength(52);
    expect(new Set(first.recordIds).size).toBe(52);
    expect(first.evidence).toEqual(second.evidence);
    expect(first.evidence.map((row) => row.id)).toEqual(first.recordIds);
  });

  it("counts all clients without applying the list limit", () => {
    expect(executeBusinessQuery(countPlan, context)).toMatchObject({
      ok: true,
      operation: "count",
      rows: [],
      count: 52,
      adapterExecutions: 1,
    });
  });

  it("filters deterministically using an allow-listed real field", () => {
    const result = executeBusinessQuery(
      {
        ...listPlan,
        fields: ["id", "name", "industry"],
        filters: [{ field: "industry", operator: "eq", value: "healthcare" }],
        sort: [{ field: "name", direction: "asc" }],
      },
      context,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected successful query");
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((row) => row.industry === "healthcare")).toBe(
      true,
    );
    expect(result.rows.map((row) => row.name)).toEqual(
      [...result.rows.map((row) => row.name)].sort((a, b) =>
        String(a).localeCompare(String(b), "en-US"),
      ),
    );
  });

  it("rejects unknown entities", () => {
    expectRejected({ ...listPlan, entity: "invoice" }, "UNKNOWN_ENTITY");
  });

  it("rejects unknown readable and filter fields", () => {
    expectRejected({ ...listPlan, fields: ["secret"] }, "UNKNOWN_FIELD");
    expectRejected(
      {
        ...listPlan,
        filters: [{ field: "secret", operator: "eq", value: "x" }],
      },
      "UNKNOWN_FIELD",
    );
  });

  it("keeps workspaceId internal for selection, filtering, and sorting", () => {
    expectRejected({ ...listPlan, fields: ["workspaceId"] }, "UNKNOWN_FIELD");
    expectRejected(
      {
        ...listPlan,
        filters: [
          { field: "workspaceId", operator: "eq", value: "northstar-creative" },
        ],
      },
      "UNKNOWN_FIELD",
    );
    expectRejected(
      { ...listPlan, sort: [{ field: "workspaceId", direction: "asc" }] },
      "UNSUPPORTED_SORT_FIELD",
    );
  });

  it("rejects unsupported operations and operators", () => {
    expectRejected(
      { ...listPlan, operation: "delete" },
      "UNSUPPORTED_OPERATION",
    );
    expectRejected(
      {
        ...listPlan,
        filters: [{ field: "name", operator: "regex", value: ".*" }],
      },
      "UNKNOWN_OPERATOR",
    );
  });

  it("rejects unsupported sort fields", () => {
    expectRejected(
      { ...listPlan, sort: [{ field: "href", direction: "asc" }] },
      "UNSUPPORTED_SORT_FIELD",
    );
  });

  it("rejects invalid values, limits, additional properties, and malformed plans", () => {
    expectRejected(
      {
        ...listPlan,
        filters: [{ field: "status", operator: "eq", value: 1 }],
      },
      "INVALID_VALUE",
    );
    expectRejected({ ...listPlan, limit: 101 }, "INVALID_LIMIT");
    expectRejected({ ...listPlan, sql: "select *" }, "ADDITIONAL_PROPERTY");
    expectRejected({ version: 1 }, "MALFORMED_PLAN");
  });

  it("rejects absent permission and inactive building block", () => {
    expect(
      executeBusinessQuery(listPlan, { ...context, permissions: [] }),
    ).toMatchObject({
      ok: false,
      error: { code: "PERMISSION_DENIED" },
    });
    expect(
      executeBusinessQuery(listPlan, { ...context, activeBuildingBlocks: [] }),
    ).toMatchObject({
      ok: false,
      error: { code: "BUILDING_BLOCK_INACTIVE" },
    });
  });

  it("rejects a foreign workspace", () => {
    expect(
      executeBusinessQuery(listPlan, {
        ...context,
        workspaceId: "foreign-workspace",
      }),
    ).toMatchObject({ ok: false, error: { code: "CROSS_WORKSPACE" } });
  });

  it("does not call the adapter for an invalid plan and calls it once for a valid plan", () => {
    const base = enabledEntity("client");
    const load = vi.fn(base.adapter.load.bind(base.adapter));
    const registry = new Map<string, BusinessEntityDefinition>([
      ["client", { ...base, adapter: { load } }],
    ]);

    executeBusinessQuery(
      { ...listPlan, fields: ["secret"] },
      context,
      registry,
    );
    expect(load).not.toHaveBeenCalled();
    executeBusinessQuery(listPlan, context, registry);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing list_clients result contract", () => {
    const result = runAskTool({ name: "list_clients", args: {} }, context);
    expect(result).toMatchObject({
      ok: true,
      name: "list_clients",
      values: {
        count: northstarCrmSeed().clients.length,
        queryPlan: { version: 1, operation: "list", entity: "client" },
        queryExecution: { executorCount: 1, adapterCount: 1 },
      },
      actions: [],
    });
    expect(result.recordIds).toHaveLength(52);
    expect(new Set(result.recordIds).size).toBe(52);
  });
});

describe("operational business query entities", () => {
  it("makes every capability availability and authorization mode explicit", () => {
    const registry = createBusinessEntityRegistry();
    expect(registry.get("client")).toMatchObject({
      availability: "enabled",
      authorization: {
        mode: "building-block",
        permission: "client.read",
        buildingBlock: "crm.core",
      },
    });
    for (const entity of ["project", "employee"] as const) {
      const definition = registry.get(entity);
      expect(definition).toMatchObject({
        availability: "enabled",
        authorization: {
          mode: "permission-only",
          permission: "project.manage",
        },
      });
      if (definition?.availability === "enabled") {
        expect(definition.authorization.proof).not.toBe("");
      }
    }
    expect(registry.get("task")).toEqual({
      id: "task",
      availability: "unavailable",
      reasonCode: "AUTHORITATIVE_SOURCE_MISSING",
      reason:
        "Task records are not available from an authoritative source yet.",
    });
    const blockIds = [...registry.values()].flatMap((definition) =>
      definition.availability === "enabled" &&
      definition.authorization.mode === "building-block"
        ? [definition.authorization.buildingBlock]
        : [],
    );
    expect(blockIds).toEqual(["crm.core"]);
  });

  it.each([
    ["project", 5],
    ["employee", 7],
  ] as const)("lists and counts canonical %s records", (entity, count) => {
    const listed = executeBusinessQuery(planFor(entity), operationalContext);
    const counted = executeBusinessQuery(
      planFor(entity, "count"),
      operationalContext,
    );
    expect(listed).toMatchObject({
      ok: true,
      entity,
      count,
      adapterExecutions: 1,
    });
    expect(counted).toMatchObject({
      ok: true,
      entity,
      rows: [],
      count,
      adapterExecutions: 1,
    });
  });

  it("filters and sorts project fields including numeric progress", () => {
    const result = executeBusinessQuery(
      {
        ...planFor("project"),
        filters: [
          { field: "statusLabel", operator: "contains", value: "Active" },
        ],
        sort: [{ field: "progressBps", direction: "desc" }],
      },
      operationalContext,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected project query to succeed");
    expect(result.rows).toHaveLength(4);
    expect(result.rows.map((row) => row.progressBps)).toEqual([
      7800, 6200, 4100, 3400,
    ]);
  });

  it("filters and sorts employee fields without returning contractors", () => {
    const result = executeBusinessQuery(
      {
        ...planFor("employee"),
        filters: [{ field: "status", operator: "eq", value: "active" }],
        sort: [{ field: "displayName", direction: "asc" }],
      },
      operationalContext,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected employee query to succeed");
    expect(result.rows).toHaveLength(7);
    expect(result.rows.every((row) => row.status === "active")).toBe(true);
    expect(
      result.rows.some((row) => String(row.id).includes("contractor")),
    ).toBe(false);
  });

  it.each(["list", "count"] as const)(
    "fails closed for task %s without loading an adapter",
    (operation) => {
      expect(
        executeBusinessQuery(
          { ...planFor("project", operation), entity: "task" },
          operationalContext,
        ),
      ).toMatchObject({
        ok: false,
        error: {
          code: "CAPABILITY_UNAVAILABLE",
          message:
            "Task records are not available from an authoritative source yet.",
        },
        adapterExecutions: 0,
      });
    },
  );

  it("does not let browser authority claims enable task", () => {
    const resolved = resolveServerAskRequest({
      message: "list tasks",
      context: {
        workspaceId: "northstar-creative",
        role: "founder",
        permissions: ["*", "task.read"],
        activeBuildingBlocks: ["BB-08", "task.core"],
      },
      history: [],
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error(resolved.message);
    expect(resolved.request.context.permissions).not.toContain("task.read");
    expect(resolved.request.context.activeBuildingBlocks).not.toContain(
      "BB-08",
    );
    expect(routeAskIntent(resolved.request).kind).not.toBe("tool");
    expect(
      executeBusinessQuery(
        { ...planFor("project"), entity: "task" },
        resolved.request.context,
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "CAPABILITY_UNAVAILABLE" },
      adapterExecutions: 0,
    });
    expect(
      ASK_TOOL_DEFINITIONS.some((definition) =>
        definition.name.includes("task"),
      ),
    ).toBe(false);
  });

  it("returns honest empty results from empty registered sources", () => {
    const registry = createBusinessEntityRegistry({
      projects: [],
      employees: [],
    });
    for (const entity of ["project", "employee"] as const) {
      expect(
        executeBusinessQuery(planFor(entity), operationalContext, registry),
      ).toMatchObject({
        ok: true,
        rows: [],
        count: 0,
        recordIds: [],
        evidence: [],
      });
    }
  });

  it("enforces permissions and workspace scope before loading an adapter", () => {
    const base = enabledEntity("project");
    const load = vi.fn(base.adapter.load.bind(base.adapter));
    const registry = new Map<string, BusinessEntityDefinition>([
      ["project", { ...base, adapter: { load } }],
    ]);
    expect(
      executeBusinessQuery(planFor("project"), context, registry),
    ).toMatchObject({ ok: false, error: { code: "PERMISSION_DENIED" } });
    expect(
      executeBusinessQuery(
        planFor("project"),
        { ...operationalContext, workspaceId: "foreign-workspace" },
        registry,
      ),
    ).toMatchObject({ ok: false, error: { code: "CROSS_WORKSPACE" } });
    expect(load).not.toHaveBeenCalled();
  });

  it("produces stable record-level evidence", () => {
    const first = executeBusinessQuery(planFor("project"), operationalContext);
    const second = executeBusinessQuery(planFor("project"), operationalContext);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("Expected successful queries");
    expect(first.evidence).toEqual(second.evidence);
    expect(first.evidence.map((entry) => entry.id)).toEqual(first.recordIds);
  });
});

describe("business metric registry", () => {
  it.each([
    ["project_count", 5],
    ["active_project_count", 4],
    ["employee_count", 7],
    ["active_employee_count", 7],
  ] as const)("calculates %s deterministically", (metricId, expected) => {
    expect(executeBusinessMetric(metricId, operationalContext)).toMatchObject({
      ok: true,
      metricId,
      value: expected,
      adapterExecutions: 1,
    });
  });

  it("keeps formulas and authority in server-owned definitions", () => {
    const metric = METRIC_REGISTRY.get("active_project_count");
    expect(metric?.availability).toBe("enabled");
    if (!metric || metric.availability !== "enabled") {
      throw new Error("Expected active_project_count to be enabled");
    }
    expect(metric?.calculation.operation).toBe("count");
    expect(metric.authorization).toMatchObject({
      mode: "permission-only",
      permission: "project.manage",
    });
    expect(metric?.evidencePolicy).toBe("record-per-row");
  });

  it.each(["task_count", "pending_task_count", "overdue_task_count"] as const)(
    "returns deterministic unavailability for %s",
    (metricId) => {
      expect(executeBusinessMetric(metricId, operationalContext)).toMatchObject(
        {
          ok: false,
          error: {
            code: "CAPABILITY_UNAVAILABLE",
            message:
              "Task records are not available from an authoritative source yet.",
          },
          adapterExecutions: 0,
        },
      );
    },
  );

  it("rejects unknown metrics and permission failures", () => {
    expect(
      executeBusinessMetric("invented_count", operationalContext),
    ).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_METRIC" },
      adapterExecutions: 0,
    });
    expect(executeBusinessMetric("project_count", context)).toMatchObject({
      ok: false,
      error: { code: "PERMISSION_DENIED" },
      adapterExecutions: 0,
    });
  });
});
