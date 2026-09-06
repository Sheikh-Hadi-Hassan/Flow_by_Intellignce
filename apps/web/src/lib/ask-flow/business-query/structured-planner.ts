import { northstarCrmSeed } from "@flow/contracts";
import validator from "@rjsf/validator-ajv8";
import type { RJSFSchema } from "@rjsf/utils";

import { northstarTeamSeed } from "../../commercial/northstar-store";
import { missionProjects } from "../../mission-control/seed";
import type { AskApplicationContext } from "../types";
import type { AskAssistantRequest, AskStreamPart } from "../assistant/types";
import {
  runBusinessQueryResolution,
  type BusinessQueryAskResult,
  type BusinessQueryResolution,
} from "./ask-runtime";
import { METRIC_REGISTRY } from "./metric-registry";
import { BUSINESS_ENTITY_REGISTRY } from "./registry";
import { validateBusinessQueryPlanShape } from "./schema";
import type {
  BusinessEntityId,
  BusinessQueryPlan,
  BusinessQueryScalar,
} from "./types";

export type PlannerLanguage = "en" | "roman_ur" | "ur" | "mixed";

export interface StructuredPlannerOutput {
  readonly outcome: "query" | "clarify" | "unsupported";
  readonly language: PlannerLanguage;
  readonly plan: BusinessQueryPlan | null;
  readonly clarification: {
    readonly question: string;
    readonly choices: readonly string[];
  } | null;
}

interface PlannerEntityCapability {
  readonly id: BusinessEntityId;
  readonly availability: "enabled" | "unavailable";
  readonly operations: readonly string[];
  readonly readableFields: readonly string[];
  readonly filterFields: readonly string[];
  readonly sortFields: readonly string[];
}

export interface StructuredPlannerInput {
  readonly message: string;
  readonly entities: readonly PlannerEntityCapability[];
  readonly metrics: readonly {
    readonly id: string;
    readonly entity: BusinessEntityId;
    readonly availability: "enabled" | "unavailable";
  }[];
  readonly entityNameCandidates: readonly {
    readonly entity: Exclude<BusinessEntityId, "task">;
    readonly name: string;
  }[];
  readonly followUpContext: null;
}

export type StructuredPlannerFailure =
  | "disabled"
  | "timeout"
  | "provider_unavailable"
  | "malformed_response"
  | "invalid_output";

export type StructuredPlannerResult =
  | {
      readonly ok: true;
      readonly output: StructuredPlannerOutput;
      readonly attempts: 1 | 2;
      readonly latencyMs: number;
      readonly inputTokens: number | null;
      readonly outputTokens: number | null;
      readonly confidenceBps: number;
      readonly model: string;
    }
  | {
      readonly ok: false;
      readonly reason: StructuredPlannerFailure;
      readonly attempts: 0 | 1 | 2;
      readonly latencyMs?: number;
      readonly model?: string;
    };

export interface StructuredPlannerAttempt {
  readonly provider: "ollama";
  readonly model: string | null;
  readonly outcome: StructuredPlannerOutput["outcome"] | "failure";
  readonly plan: BusinessQueryPlan | null;
  readonly validationResult: "passed" | "failed" | "not_run";
  readonly failureReason: StructuredPlannerFailure | null;
  readonly repairAttempted: boolean;
  readonly latencyMs: number;
}

export interface StructuredIntentPlanner {
  plan(input: StructuredPlannerInput): Promise<StructuredPlannerResult>;
}

const QUERY_PLAN_SCHEMA: RJSFSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "version",
    "operation",
    "entity",
    "fields",
    "filters",
    "sort",
    "limit",
  ],
  properties: {
    version: { const: 1 },
    operation: { enum: ["list", "count"] },
    entity: { enum: ["client", "project", "task", "employee"] },
    fields: {
      type: "array",
      maxItems: 12,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
    filters: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "operator", "value"],
        properties: {
          field: { type: "string", minLength: 1 },
          operator: { enum: ["eq", "neq", "contains"] },
          value: { type: ["string", "number", "boolean"] },
        },
      },
    },
    sort: {
      type: "array",
      maxItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "direction"],
        properties: {
          field: { type: "string", minLength: 1 },
          direction: { enum: ["asc", "desc"] },
        },
      },
    },
    limit: { type: "integer", minimum: 1, maximum: 100 },
  },
};

export const STRUCTURED_PLANNER_OUTPUT_SCHEMA: RJSFSchema = {
  type: "object",
  additionalProperties: false,
  required: ["outcome", "language", "plan", "clarification"],
  properties: {
    outcome: { enum: ["query", "clarify", "unsupported"] },
    language: { enum: ["en", "roman_ur", "ur", "mixed"] },
    plan: { anyOf: [QUERY_PLAN_SCHEMA, { type: "null" }] },
    clarification: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["question", "choices"],
          properties: {
            question: { type: "string", minLength: 1, maxLength: 240 },
            choices: {
              type: "array",
              maxItems: 4,
              items: { type: "string", minLength: 1, maxLength: 80 },
            },
          },
        },
        { type: "null" },
      ],
    },
  },
};

interface OllamaChatResponse {
  readonly message?: { readonly content?: string };
  readonly prompt_eval_count?: number;
  readonly eval_count?: number;
}

interface PlannerConfig {
  readonly enabled: boolean;
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
}

function failedPlannerResult(
  config: PlannerConfig,
  started: number,
  reason: StructuredPlannerFailure,
  attempts: 0 | 1 | 2,
): Extract<StructuredPlannerResult, { readonly ok: false }> {
  return {
    ok: false,
    reason,
    attempts,
    latencyMs: Date.now() - started,
    model: config.model,
  };
}

function configFromEnvironment(): PlannerConfig {
  const timeout = Number(process.env.BLM_PLANNER_TIMEOUT_MS ?? "10000");
  return {
    enabled: process.env.BLM_PLANNER_ENABLED === "1",
    baseUrl: (
      process.env.BLM_PLANNER_BASE_URL ?? "http://127.0.0.1:11434"
    ).replace(/\/$/, ""),
    model: process.env.BLM_PLANNER_MODEL ?? "qwen3:4b-instruct",
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 10_000,
  };
}

function hasAuthority(
  context: AskApplicationContext,
  entity: typeof BUSINESS_ENTITY_REGISTRY extends ReadonlyMap<
    string,
    infer Definition
  >
    ? Definition
    : never,
): boolean {
  if (entity.availability === "unavailable") return true;
  if (!context.permissions.includes(entity.authorization.permission))
    return false;
  return (
    entity.authorization.mode !== "building-block" ||
    Boolean(
      context.activeBuildingBlocks?.includes(
        entity.authorization.buildingBlock,
      ),
    )
  );
}

function normalizedTokens(value: string): readonly string[] {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 2);
}

function nameCandidates(
  message: string,
): StructuredPlannerInput["entityNameCandidates"] {
  const normalizedMessage = message
    .normalize("NFKC")
    .toLocaleLowerCase("en-US");
  const aliasMessage = [
    ["مرڈیئن ہیلتھ", "Meridian Health"],
    ["برائٹ لائن", "Brightline"],
    ["ایکمی روبوٹکس", "Acme Robotics"],
    ["اوربٹ لیبز", "Orbit Labs"],
  ].reduce(
    (current, [alias, canonical]) =>
      current.includes(alias!) ? `${current} ${canonical}` : current,
    normalizedMessage,
  );
  const messageTokens = new Set(normalizedTokens(aliasMessage));
  const candidates = [
    ...northstarCrmSeed().clients.map((row) => ({
      entity: "client" as const,
      name: row.name,
    })),
    ...missionProjects.flatMap((row) => [
      { entity: "project" as const, name: row.name },
      { entity: "project" as const, name: row.clientName },
    ]),
    ...northstarTeamSeed()
      .filter((row) => row.resourceType === "employee")
      .map((row) => ({ entity: "employee" as const, name: row.displayName })),
  ];
  return [
    ...new Map(
      candidates.map((candidate) => [
        `${candidate.entity}:${candidate.name}`,
        candidate,
      ]),
    ).values(),
  ]
    .map((candidate) => ({
      ...candidate,
      score: normalizedTokens(candidate.name).filter((token) =>
        messageTokens.has(token),
      ).length,
    }))
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.name.localeCompare(right.name),
    )
    .slice(0, 5)
    .map(({ entity, name }) => ({ entity, name }));
}

export function createStructuredPlannerInput(
  request: AskAssistantRequest,
): StructuredPlannerInput {
  const entities = [...BUSINESS_ENTITY_REGISTRY.values()]
    .filter((entity) => hasAuthority(request.context, entity))
    .map((entity): PlannerEntityCapability =>
      entity.availability === "unavailable"
        ? {
            id: entity.id,
            availability: "unavailable",
            operations: [],
            readableFields: [],
            filterFields: [],
            sortFields: [],
          }
        : {
            id: entity.id,
            availability: "enabled",
            operations: entity.operations,
            readableFields: entity.readableFields,
            filterFields: entity.filterFields,
            sortFields: entity.sortFields,
          },
    );
  return {
    message: request.message,
    entities,
    metrics: [...METRIC_REGISTRY.values()]
      .filter(
        (metric) =>
          metric.availability === "unavailable" ||
          (request.context.permissions.includes(
            metric.authorization.permission,
          ) &&
            (metric.authorization.mode !== "building-block" ||
              Boolean(
                request.context.activeBuildingBlocks?.includes(
                  metric.authorization.buildingBlock,
                ),
              ))),
      )
      .map((metric) => ({
        id: metric.id,
        entity: metric.entity,
        availability: metric.availability,
      })),
    entityNameCandidates: nameCandidates(request.message),
    // Browser history is conversational text, not trusted structured state.
    followUpContext: null,
  };
}

function valueWasSupplied(
  value: BusinessQueryScalar,
  input: StructuredPlannerInput,
) {
  if (typeof value !== "string") return true;
  const normalized = value.toLocaleLowerCase("en-US");
  if (
    ["active", "positive", "neutral", "caution", "critical"].includes(
      normalized,
    )
  ) {
    return true;
  }
  return (
    input.message.toLocaleLowerCase("en-US").includes(normalized) ||
    input.entityNameCandidates.some((candidate) =>
      candidate.name.toLocaleLowerCase("en-US").includes(normalized),
    )
  );
}

function validateOutput(
  value: unknown,
  input: StructuredPlannerInput,
):
  | {
      readonly ok: true;
      readonly output: StructuredPlannerOutput;
      readonly confidenceBps: number;
    }
  | { readonly ok: false; readonly message: string } {
  const schemaError = validator.rawValidation<{ name: string }>(
    STRUCTURED_PLANNER_OUTPUT_SCHEMA,
    value,
  ).errors?.[0];
  if (schemaError) {
    return { ok: false, message: `output schema: ${schemaError.name}` };
  }
  const output = value as StructuredPlannerOutput;
  if (output.outcome === "query" && !output.plan) {
    return { ok: false, message: "query outcome requires a plan" };
  }
  if (output.outcome === "clarify" && !output.clarification) {
    return { ok: false, message: "clarify outcome requires clarification" };
  }
  if (output.outcome !== "query" && output.plan) {
    return { ok: false, message: "non-query outcome cannot contain a plan" };
  }
  if (output.outcome !== "clarify" && output.clarification) {
    return { ok: false, message: "only clarify may contain clarification" };
  }
  if (!output.plan) return { ok: true, output, confidenceBps: 8_000 };

  const shape = validateBusinessQueryPlanShape(output.plan);
  if (!shape.ok) return { ok: false, message: shape.message };
  const capability = input.entities.find(
    (entity) => entity.id === output.plan?.entity,
  );
  if (!capability) return { ok: false, message: "entity is not authorized" };
  if (capability.availability === "unavailable") {
    return output.plan.fields.length === 0 &&
      output.plan.filters.length === 0 &&
      output.plan.sort.length === 0
      ? { ok: true, output, confidenceBps: 9_000 }
      : { ok: false, message: "unavailable entity plan must be empty" };
  }
  if (!capability.operations.includes(output.plan.operation)) {
    return { ok: false, message: "operation is not registered" };
  }
  const expectedFields =
    output.plan.operation === "count" ? [] : capability.readableFields;
  if (JSON.stringify(output.plan.fields) !== JSON.stringify(expectedFields)) {
    return {
      ok: false,
      message: "fields must match the server capability projection",
    };
  }
  if (
    output.plan.filters.some(
      (filter) =>
        !capability.filterFields.includes(filter.field) ||
        !valueWasSupplied(filter.value, input),
    )
  ) {
    return {
      ok: false,
      message: "filter is unregistered or not grounded in the request",
    };
  }
  if (
    output.plan.sort.some((sort) => !capability.sortFields.includes(sort.field))
  ) {
    return { ok: false, message: "sort field is not registered" };
  }
  const entityMatch = input.entityNameCandidates.some(
    (candidate) => candidate.entity === output.plan?.entity,
  );
  return {
    ok: true,
    output,
    confidenceBps: Math.min(10_000, 8_000 + (entityMatch ? 2_000 : 0)),
  };
}

function promptFor(input: StructuredPlannerInput): string {
  return [
    "Translate the business request into the supplied JSON schema. /no_think",
    "Use only listed entities, operations, fields, filters, sorts, and candidate names.",
    "For list plans, copy the entity readableFields exactly. For count plans, fields is [].",
    "A request to tell, describe, summarize, or show details about one uniquely matched candidate is a read query, not an ambiguity.",
    "For a named client read, use a client list plan with a name contains filter set to the exact candidate name.",
    "If the request explicitly asks for a project, use a project list plan and the registered clientName or name field that matches the candidate.",
    "Never add workspace, permission, SQL, tool, formula, confidence, or execution data.",
    "If the request is ambiguous, clarify. If unsupported, return unsupported.",
    "Examples:",
    '{"request":"mere clients dikhao","outcome":"query","language":"roman_ur"}',
    '{"request":"تمام پراجیکٹس دکھائیں","outcome":"query","language":"ur"}',
    '{"request":"employees ko name se sort karo","outcome":"query","language":"mixed"}',
    '{"request":"what is the weather","outcome":"unsupported","language":"en"}',
    `INPUT=${JSON.stringify(input)}`,
  ].join("\n");
}

export class OllamaStructuredIntentPlanner implements StructuredIntentPlanner {
  constructor(
    private readonly config: PlannerConfig = configFromEnvironment(),
    private readonly transport: typeof fetch = fetch,
  ) {}

  async plan(input: StructuredPlannerInput): Promise<StructuredPlannerResult> {
    const started = Date.now();
    if (!this.config.enabled)
      return failedPlannerResult(this.config, started, "disabled", 0);
    let messages: { role: "system" | "user" | "assistant"; content: string }[] =
      [
        {
          role: "system",
          content:
            "You are Flow's read-only intent translator. Return schema-valid JSON only. You cannot authorize, execute, calculate, or mutate.",
        },
        { role: "user", content: promptFor(input) },
      ];
    let lastReason: StructuredPlannerFailure = "invalid_output";
    for (const attempt of [1, 2] as const) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.timeoutMs,
      );
      let response: Response;
      try {
        response = await this.transport(`${this.config.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.config.model,
            messages,
            stream: false,
            think: false,
            format: STRUCTURED_PLANNER_OUTPUT_SCHEMA,
            options: { temperature: 0, num_ctx: 4096, num_predict: 192 },
          }),
        });
      } catch (error) {
        clearTimeout(timeout);
        return failedPlannerResult(
          this.config,
          started,
          error instanceof Error && error.name === "AbortError"
            ? "timeout"
            : "provider_unavailable",
          attempt,
        );
      }
      clearTimeout(timeout);
      if (!response.ok) {
        return failedPlannerResult(
          this.config,
          started,
          "provider_unavailable",
          attempt,
        );
      }
      let body: OllamaChatResponse;
      try {
        body = (await response.json()) as OllamaChatResponse;
      } catch {
        return failedPlannerResult(
          this.config,
          started,
          "malformed_response",
          attempt,
        );
      }
      const content = body.message?.content;
      let parsed: unknown;
      try {
        parsed = typeof content === "string" ? JSON.parse(content) : null;
      } catch {
        lastReason = "malformed_response";
        parsed = null;
      }
      const validated = validateOutput(parsed, input);
      if (validated.ok) {
        return {
          ok: true,
          output: validated.output,
          attempts: attempt,
          latencyMs: Date.now() - started,
          inputTokens: body.prompt_eval_count ?? null,
          outputTokens: body.eval_count ?? null,
          confidenceBps: validated.confidenceBps,
          model: this.config.model,
        };
      }
      lastReason = parsed === null ? "malformed_response" : "invalid_output";
      if (attempt === 1) {
        messages = [
          ...messages,
          { role: "assistant", content: content ?? "" },
          {
            role: "user",
            content: `Repair the JSON. Validation error: ${validated.message}`,
          },
        ];
      }
    }
    return failedPlannerResult(this.config, started, lastReason, 2);
  }
}

const BUSINESS_LANGUAGE =
  /(?:\b(?:clients?|customers?|clints?|custmers?|projects?|projec?ts?|projcts?|employees?|employes?|tasks?|team|staff|record|roster|headcount|payroll|workforce|works|saare|sab|kitne|tadaad|dikhao|dekhao|naam)\b|(?:کلائنٹس?|گاہک|پراجیکٹس?|منصوبے|ملازمین?|ٹیم|کام|فہرست|تعداد|کتنے|دکھا(?:ؤ|ئیں)|ترتیب))/iu;
const LEGACY_LANGUAGE =
  /\b(?:exposure|invoice|payment|pipeline|approval|capacity|utilization|sales|registration|compliance|signator|location|duplicate)\w*\b/i;

export function shouldUseStructuredPlanner(message: string): boolean {
  if (
    LEGACY_LANGUAGE.test(message) ||
    /\b(?:(?:client|project)\s+health|health\s+(?:for|of))\b/i.test(message)
  ) {
    return false;
  }
  return BUSINESS_LANGUAGE.test(message) || nameCandidates(message).length > 0;
}

function plannerResolution(
  output: StructuredPlannerOutput,
): Exclude<BusinessQueryResolution, { readonly kind: "none" }> {
  if (output.outcome === "query" && output.plan) {
    return { kind: "query", plan: output.plan };
  }
  if (output.outcome === "clarify" && output.clarification) {
    return {
      kind: "clarify",
      clarification: {
        question: output.clarification.question,
        choices: output.clarification.choices.map((label, index) => ({
          id: `planner-choice-${index + 1}`,
          label,
        })),
      },
    };
  }
  return {
    kind: "unsupported",
    message:
      "I do not have an authorized business-data source for that request yet.",
  };
}

function withPlannerMetadata(
  result: BusinessQueryAskResult,
  planner: Extract<StructuredPlannerResult, { readonly ok: true }>,
): BusinessQueryAskResult {
  const parts = result.parts.map((part): AskStreamPart =>
    part.type === "metadata"
      ? {
          ...part,
          provider: "ollama",
          model: planner.model,
          latencyMs: planner.latencyMs,
          inputTokens: planner.inputTokens,
          outputTokens: planner.outputTokens,
          plannerProvider: "ollama",
          plannerModel: planner.model,
          plannerOutcome: planner.output.outcome,
          plannerPlan: planner.output.plan,
          plannerValidationResult: "passed",
          repairAttempted: planner.attempts === 2,
        }
      : part,
  );
  return { ...result, parts };
}

export async function planBusinessQueryAsk(
  request: AskAssistantRequest,
  planner: StructuredIntentPlanner = new OllamaStructuredIntentPlanner(),
  onAttempt?: (attempt: StructuredPlannerAttempt) => void,
): Promise<BusinessQueryAskResult | null> {
  if (!shouldUseStructuredPlanner(request.message)) return null;
  const planned = await planner.plan(createStructuredPlannerInput(request));
  onAttempt?.(
    planned.ok
      ? {
          provider: "ollama",
          model: planned.model,
          outcome: planned.output.outcome,
          plan: planned.output.plan,
          validationResult: "passed",
          failureReason: null,
          repairAttempted: planned.attempts === 2,
          latencyMs: planned.latencyMs,
        }
      : {
          provider: "ollama",
          model: planned.model ?? null,
          outcome: "failure",
          plan: null,
          validationResult:
            planned.reason === "invalid_output" ||
            planned.reason === "malformed_response"
              ? "failed"
              : "not_run",
          failureReason: planned.reason,
          repairAttempted: planned.attempts === 2,
          latencyMs: planned.latencyMs ?? 0,
        },
  );
  if (!planned.ok) {
    if (
      planned.reason === "invalid_output" ||
      planned.reason === "malformed_response"
    ) {
      return runBusinessQueryResolution(request, {
        kind: "clarify",
        clarification: {
          question:
            "I need a little more detail. Which client, project, employee, or task record do you mean?",
          choices: [],
        },
      });
    }
    return null;
  }
  return withPlannerMetadata(
    runBusinessQueryResolution(request, plannerResolution(planned.output)),
    planned,
  );
}
