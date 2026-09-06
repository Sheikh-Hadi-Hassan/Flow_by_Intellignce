import type { AskClarification } from "../types";
import type { ResponseWidget } from "../assistant/response-shape";
import type {
  AskAssistantRequest,
  AskStreamPart,
  AskToolName,
} from "../assistant/types";
import { executeBusinessMetric } from "./metric-registry";
import { BUSINESS_ENTITY_REGISTRY } from "./registry";
import type {
  BusinessEntityId,
  BusinessMetricId,
  BusinessQueryPlan,
  BusinessQueryResult,
} from "./types";
import { executeBusinessQuery } from "./executor";

export type BusinessQueryResolution =
  | { readonly kind: "none" }
  | {
      readonly kind: "deny";
      readonly code: "cross_workspace" | "out_of_domain";
      readonly message: string;
    }
  | { readonly kind: "unsupported"; readonly message: string }
  | { readonly kind: "clarify"; readonly clarification: AskClarification }
  | {
      readonly kind: "query";
      readonly plan: BusinessQueryPlan;
      readonly metricId?: BusinessMetricId;
    };

export interface BusinessQueryAskResult {
  readonly resolution: Exclude<
    BusinessQueryResolution,
    { readonly kind: "none" }
  >;
  readonly parts: readonly AskStreamPart[];
}

const ENTITY_TERMS: Readonly<Record<BusinessEntityId, readonly string[]>> = {
  client: ["client", "clients", "customer", "customers"],
  project: ["project", "projects"],
  employee: ["employee", "employees", "team member", "team members"],
  task: ["task", "tasks"],
};

const TOOL_BY_ENTITY: Readonly<
  Record<Exclude<BusinessEntityId, "task">, AskToolName>
> = {
  client: "list_clients",
  project: "list_projects",
  employee: "get_team_capacity",
};

function hasTerm(message: string, term: string): boolean {
  return new RegExp(`\\b${term.replace(" ", "\\s+")}\\b`, "i").test(message);
}

function resolveEntity(message: string): BusinessEntityId | null {
  for (const [entity, terms] of Object.entries(ENTITY_TERMS) as [
    BusinessEntityId,
    readonly string[],
  ][]) {
    if (terms.some((term) => hasTerm(message, term))) return entity;
  }
  if (/\bwho\s+works\s+here\b/i.test(message)) return "employee";
  return null;
}

function clarification(question: string): AskClarification {
  return { question, choices: [] };
}

function supportsGenericShape(
  message: string,
  entity: BusinessEntityId,
): boolean {
  const noun: Readonly<Record<BusinessEntityId, string>> = {
    client: "(?:clients?|customers?)",
    project: "projects?",
    employee: "(?:employees?|team\\s+members?)",
    task: "tasks?",
  };
  const target = noun[entity];
  return [
    new RegExp(
      `^(?:list|show|give)(?:\\s+me)?(?:\\s+(?:all|our|my|the))?\\s+(?:active\\s+)?${target}(?:\\s+(?:list|names))?$`,
      "i",
    ),
    new RegExp(`^who\\s+(?:are\\s+my\\s+${target}|works\\s+here)$`, "i"),
    new RegExp(
      `^(?:how\\s+many|count)(?:\\s+active)?\\s+${target}(?:\\s+do\\s+we\\s+have)?$`,
      "i",
    ),
    new RegExp(
      `^sort(?:\\s+(?:our|my|the))?\\s+${target}\\s+(?:alphabetically|by\\s+name)$`,
      "i",
    ),
    new RegExp(
      `^(?:list|show)(?:\\s+me)?\\s+${target}\\s+whose\\s+name\\s+contains\\s+.+$`,
      "i",
    ),
    ...(entity === "project"
      ? [
          /^(?:give|show)(?:\s+me)?\s+(?:a\s+)?(?:details|summary|information)\s+(?:for|of|on)\s+(?:the\s+)?.+?\s+project$/i,
        ]
      : []),
  ].some((pattern) => pattern.test(message));
}

export function resolveBusinessQuery(message: string): BusinessQueryResolution {
  const clean = message.replace(/[?!.,]+$/g, "").trim();
  const lower = clean.toLocaleLowerCase("en-US");

  if (
    /(?:\b(?:another|other|foreign|dusre|doosre|dosre)\s+workspace(?:['’]s|s)?\b|(?:دوسر(?:ے|ا)\s+ورک\s*اسپیس))/iu.test(
      clean,
    )
  ) {
    return {
      kind: "deny",
      code: "cross_workspace",
      message: "Another workspace is outside the authorized server scope.",
    };
  }

  if (
    /(?:\b(?:delete|remove|erase|destroy|hatao|mitao|khatam)\b|(?:حذف|مٹا|ختم))/iu.test(
      clean,
    )
  ) {
    return {
      kind: "deny",
      code: "out_of_domain",
      message:
        "Destructive business requests are not available through Ask Flow.",
    };
  }

  if (
    /\b(?:ignore|override|bypass)\s+(?:your\s+)?(?:rules|policy|security)\b/i.test(
      clean,
    )
  ) {
    return {
      kind: "deny",
      code: "out_of_domain",
      message: "Requests to override Ask Flow security rules are denied.",
    };
  }

  const entity = resolveEntity(clean);

  if (/\b(?:sale|sales)\b.*\b(?:status|update|summary)\b/i.test(clean)) {
    return {
      kind: "clarify",
      clarification: {
        question: "Which sales view do you mean?",
        choices: [
          { id: "sales-pipeline", label: "Pipeline" },
          { id: "sales-revenue", label: "Revenue" },
          { id: "sales-opportunities", label: "Opportunities" },
          { id: "sales-decisions", label: "Sales decisions" },
        ],
      },
    };
  }

  if (/\b(?:profitable|profitability|profit)\b/i.test(clean)) {
    return {
      kind: "unsupported",
      message:
        "I cannot calculate profitability because this workspace has no governed P&L source containing recognized revenue and complete cost data.",
    };
  }

  if (/\btransactions?\b/i.test(clean)) {
    return {
      kind: "clarify",
      clarification: {
        question: "Which transaction records should I look for?",
        choices: [
          { id: "transaction-payments", label: "Payments" },
          { id: "transaction-invoices", label: "Invoices" },
          { id: "transaction-expenses", label: "Expenses" },
          { id: "transaction-vendors", label: "Vendor transactions" },
        ],
      },
    };
  }

  if (/\bpayment\s+schedule\b/i.test(clean)) {
    return {
      kind: "unsupported",
      message:
        "I do not have an authorized payment-schedule source for this workspace.",
    };
  }

  if (
    !entity &&
    /\b(?:update|summary|details|information)\s+(?:on|for|of)\b/i.test(clean)
  ) {
    return {
      kind: "clarify",
      clarification: clarification(
        "Which registered client, project, or employee record should I read?",
      ),
    };
  }
  if (!entity) return { kind: "none" };

  if (entity === "project" && /\b(?:attention|risk|risky)\b/i.test(clean)) {
    return {
      kind: "clarify",
      clarification: clarification(
        "Should I show critical projects, caution projects, or both?",
      ),
    };
  }

  if (
    (entity === "client" &&
      /\b(?:inactive|dormant|segment|duplicate|health|invoice|contract|opportunit|payment|details|summary|information|update)\w*\b/i.test(
        clean,
      )) ||
    (entity === "project" && /\bhealth\b/i.test(clean)) ||
    (entity === "employee" &&
      /\b(?:capacity|utilization|performance)\b/i.test(clean))
  ) {
    return { kind: "none" };
  }

  const isCount = /\b(?:how\s+many|count)\b/i.test(clean);
  const isList =
    /\b(?:list|show|give|who|sort)\b/i.test(clean) ||
    /\b(?:details|summary|information|update)\b/i.test(clean);
  if (!isCount && !isList) return { kind: "none" };
  if (!supportsGenericShape(clean, entity)) {
    return {
      kind: "unsupported",
      message:
        "I cannot answer that from the business details currently available to Ask Flow.",
    };
  }

  const definition = BUSINESS_ENTITY_REGISTRY.get(entity);
  const fields =
    definition?.availability === "enabled" && !isCount
      ? definition.readableFields
      : [];
  const filters: Array<BusinessQueryPlan["filters"][number]> = [];
  const sort: Array<BusinessQueryPlan["sort"][number]> = [];

  const contains = /\bname\s+contains\s+(.+)$/i.exec(clean)?.[1]?.trim();
  if (contains) {
    filters.push({
      field: entity === "employee" ? "displayName" : "name",
      operator: "contains",
      value: contains,
    });
  }

  const projectSubject =
    /\b(?:details|summary|information)\s+(?:for|of|on)\s+(?:the\s+)?(.+?)\s+project\b/i
      .exec(clean)?.[1]
      ?.trim();
  if (entity === "project" && projectSubject) {
    filters.push({
      field: "clientName",
      operator: "contains",
      value: projectSubject,
    });
  }

  if (/\bactive\b/i.test(clean)) {
    filters.push(
      entity === "project"
        ? { field: "statusLabel", operator: "contains", value: "Active" }
        : entity === "employee"
          ? { field: "status", operator: "eq", value: "active" }
          : { field: "status", operator: "eq", value: "active" },
    );
  }

  if (/\b(?:alphabetically|by\s+name)\b/i.test(clean)) {
    sort.push({
      field: entity === "employee" ? "displayName" : "name",
      direction: "asc",
    });
  }

  const metricId = isCount
    ? entity === "project"
      ? /\bactive\b/i.test(lower)
        ? "active_project_count"
        : "project_count"
      : entity === "employee"
        ? /\bactive\b/i.test(lower)
          ? "active_employee_count"
          : "employee_count"
        : entity === "task"
          ? "task_count"
          : undefined
    : undefined;

  return {
    kind: "query",
    plan: {
      version: 1,
      operation: isCount ? "count" : "list",
      entity,
      fields,
      filters,
      sort,
      limit: 100,
    },
    ...(metricId ? { metricId } : {}),
  };
}

function scalar(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) return value.join(", ");
  return "";
}

function widgetsFor(
  plan: BusinessQueryPlan,
  result: Extract<BusinessQueryResult, { readonly ok: true }>,
): readonly ResponseWidget[] {
  if (plan.operation === "count") {
    return [
      {
        type: "metrics",
        metrics: [
          {
            label: `${plan.entity[0]!.toUpperCase()}${plan.entity.slice(1)} count`,
            value: String(result.count),
          },
        ],
      },
    ];
  }
  const labelField = plan.entity === "employee" ? "displayName" : "name";
  const entities = result.rows.map((row) => ({
    id: scalar(row.id),
    label: scalar(row[labelField]),
    meta:
      [
        row.industry,
        row.lifecycleStage,
        row.clientName,
        row.statusLabel,
        row.healthTone,
        row.roleKeys,
        row.status,
      ]
        .map(scalar)
        .filter(Boolean)
        .join(" · ") || undefined,
    ...(typeof row.href === "string" ? { href: row.href } : {}),
  }));
  return [
    {
      type: "metrics",
      metrics: [
        {
          label: `${plan.entity[0]!.toUpperCase()}${plan.entity.slice(1)}s`,
          value: String(result.count),
        },
      ],
    },
    ...(entities.length > 0
      ? [
          {
            type: "entities" as const,
            title: `${plan.entity[0]!.toUpperCase()}${plan.entity.slice(1)} list`,
            entities,
          },
        ]
      : []),
  ];
}

function successParts(
  plan: BusinessQueryPlan,
  result: Extract<BusinessQueryResult, { readonly ok: true }>,
): readonly AskStreamPart[] {
  const tool = plan.entity === "task" ? undefined : TOOL_BY_ENTITY[plan.entity];
  const noun = `${plan.entity}${result.count === 1 ? "" : "s"}`;
  const text =
    result.count === 0
      ? `No matching ${noun} were found.`
      : plan.operation === "count"
        ? `There are ${result.count} matching ${noun}.`
        : `Found ${result.count} matching ${noun}.`;
  return [
    { type: "status", phase: "submitted" },
    { type: "status", phase: "retrieving" },
    ...(tool
      ? ([
          { type: "tool_status", tool, state: "running" },
          { type: "tool_status", tool, state: "done" },
        ] as const)
      : []),
    { type: "status", phase: "generating" },
    { type: "status", phase: "streaming" },
    { type: "text", delta: text },
    ...(result.evidence.length > 0
      ? ([{ type: "evidence", evidence: result.evidence }] as const)
      : []),
    { type: "widgets", widgets: widgetsFor(plan, result) },
    { type: "status", phase: "complete" },
    {
      type: "metadata",
      provider: "local",
      model: "business-query-plan",
      requestId: null,
      latencyMs: 0,
      fallbackUsed: false,
      plannerProvider: "deterministic",
      plannerModel: null,
      plannerOutcome: "query",
      plannerPlan: plan,
      plannerValidationResult: "passed",
      repairAttempted: false,
      executionCount: result.adapterExecutions,
      evidenceEmissionCount: result.evidence.length > 0 ? 1 : 0,
    },
    { type: "done", ...(tool ? { tool } : {}) },
  ];
}

function terminalParts(
  code:
    | "capability_unavailable"
    | "permission_denied"
    | "cross_workspace"
    | "out_of_domain"
    | "tool_unavailable",
  message: string,
  provenance: {
    readonly outcome: "query" | "unsupported" | "denied";
    readonly plan?: BusinessQueryPlan;
    readonly executionCount?: number;
  },
): readonly AskStreamPart[] {
  return [
    { type: "status", phase: "submitted" },
    { type: "error", code, message },
    {
      type: "metadata",
      provider: "local",
      model: "business-query-plan",
      requestId: null,
      latencyMs: 0,
      fallbackUsed: false,
      plannerProvider: "deterministic",
      plannerModel: null,
      plannerOutcome: provenance.outcome,
      plannerPlan: provenance.plan ?? null,
      plannerValidationResult: "passed",
      repairAttempted: false,
      executionCount: provenance.executionCount ?? 0,
      evidenceEmissionCount: 0,
    },
    { type: "done" },
  ];
}

export function runBusinessQueryAsk(
  request: AskAssistantRequest,
): BusinessQueryAskResult | null {
  const resolution = resolveBusinessQuery(request.message);
  if (resolution.kind === "none") return null;
  return runBusinessQueryResolution(request, resolution);
}

export function runBusinessQueryResolution(
  request: AskAssistantRequest,
  resolution: Exclude<BusinessQueryResolution, { readonly kind: "none" }>,
): BusinessQueryAskResult {
  if (resolution.kind === "deny") {
    return {
      resolution,
      parts: terminalParts(resolution.code, resolution.message, {
        outcome: "denied",
      }),
    };
  }
  if (resolution.kind === "unsupported") {
    return {
      resolution,
      parts: terminalParts("tool_unavailable", resolution.message, {
        outcome: "unsupported",
      }),
    };
  }
  if (resolution.kind === "clarify") {
    return {
      resolution,
      parts: [
        { type: "status", phase: "clarification" },
        { type: "clarification", clarification: resolution.clarification },
        { type: "text", delta: resolution.clarification.question },
        {
          type: "metadata",
          provider: "local",
          model: "business-query-plan",
          requestId: null,
          latencyMs: 0,
          fallbackUsed: false,
          plannerProvider: "deterministic",
          plannerModel: null,
          plannerOutcome: "clarify",
          plannerPlan: null,
          plannerValidationResult: "passed",
          repairAttempted: false,
          executionCount: 0,
          evidenceEmissionCount: 0,
        },
        { type: "done" },
      ],
    };
  }

  const rejectExecution = (
    executed: Extract<BusinessQueryResult, { readonly ok: false }>,
  ): BusinessQueryAskResult => {
    const code =
      executed.error.code === "CAPABILITY_UNAVAILABLE"
        ? "capability_unavailable"
        : executed.error.code === "PERMISSION_DENIED" ||
            executed.error.code === "BUILDING_BLOCK_INACTIVE"
          ? "permission_denied"
          : executed.error.code === "CROSS_WORKSPACE"
            ? "cross_workspace"
            : "tool_unavailable";
    return {
      resolution,
      parts: terminalParts(code, executed.error.message, {
        outcome: "query",
        plan: resolution.plan,
        executionCount: executed.adapterExecutions,
      }),
    };
  };

  let queryResult: Extract<BusinessQueryResult, { readonly ok: true }>;
  if (resolution.metricId) {
    const executed = executeBusinessMetric(
      resolution.metricId,
      request.context,
    );
    if (!executed.ok) return rejectExecution(executed);
    queryResult = {
      ok: true,
      operation: "count",
      entity: resolution.plan.entity,
      rows: [],
      count: executed.value,
      recordIds: executed.recordIds,
      evidence: executed.evidence,
      adapterExecutions: executed.adapterExecutions,
    };
  } else {
    const executed = executeBusinessQuery(resolution.plan, request.context);
    if (!executed.ok) return rejectExecution(executed);
    queryResult = executed;
  }
  return {
    resolution,
    parts: successParts(resolution.plan, queryResult),
  };
}
