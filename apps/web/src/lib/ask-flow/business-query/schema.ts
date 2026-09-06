import validator from "@rjsf/validator-ajv8";
import type { RJSFSchema } from "@rjsf/utils";

import type { BusinessQueryErrorCode } from "./types";

interface SchemaValidationError {
  readonly instancePath?: string;
  readonly keyword: string;
}

export const BUSINESS_QUERY_PLAN_SCHEMA: RJSFSchema = {
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
    operation: { type: "string" },
    entity: { type: "string", minLength: 1 },
    fields: { type: "array", items: { type: "string", minLength: 1 } },
    filters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "operator", "value"],
        properties: {
          field: { type: "string", minLength: 1 },
          operator: { type: "string", minLength: 1 },
          value: { type: ["string", "number", "boolean"] },
        },
      },
    },
    sort: {
      type: "array",
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

export function validateBusinessQueryPlanShape(plan: unknown):
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: BusinessQueryErrorCode;
      readonly message: string;
    } {
  const first = validator.rawValidation<SchemaValidationError>(
    BUSINESS_QUERY_PLAN_SCHEMA,
    plan,
  ).errors?.[0];
  if (!first) return { ok: true };

  const path = first.instancePath ?? "";
  const code =
    first.keyword === "additionalProperties"
      ? "ADDITIONAL_PROPERTY"
      : path === "/limit"
        ? "INVALID_LIMIT"
        : path.endsWith("/value")
          ? "INVALID_VALUE"
          : "MALFORMED_PLAN";
  return {
    ok: false,
    code,
    message: `Business query plan failed schema validation (${first.keyword} at ${path || "/"}).`,
  };
}
