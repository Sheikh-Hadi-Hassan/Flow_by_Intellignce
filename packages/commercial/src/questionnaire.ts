import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";

type AjvValidate = ((data: unknown) => boolean) & {
  errors?: { instancePath: string; message?: string }[] | null;
};

type AjvInstance = {
  compile: (schema: object) => AjvValidate;
  getSchema?: (key: string) => AjvValidate | undefined;
};

const Ajv =
  (AjvImport as unknown as { default?: new (options: object) => AjvInstance })
    .default ?? (AjvImport as unknown as new (options: object) => AjvInstance);
const addFormats =
  (
    addFormatsImport as unknown as {
      default?: (ajv: AjvInstance) => void;
    }
  ).default ?? (addFormatsImport as unknown as (ajv: AjvInstance) => void);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export interface QuestionnaireDocument {
  readonly version: number;
  readonly jsonSchema: Record<string, unknown>;
  readonly uiSchema: Record<string, unknown>;
  readonly questionMeta: Readonly<
    Record<
      string,
      {
        readonly businessCategory: string;
        readonly evidenceRequired: boolean;
        readonly targetMapping: string;
        readonly labels: Readonly<Record<string, string>>;
      }
    >
  >;
}

export const brandStrategyQuestionnaireV1: QuestionnaireDocument = {
  version: 1,
  jsonSchema: {
    $id: "flow://questionnaires/brand-strategy/v1",
    type: "object",
    additionalProperties: false,
    required: ["brandMaturity", "primaryAudience", "successMetric"],
    properties: {
      brandMaturity: {
        type: "string",
        title: "Brand maturity",
        enum: ["emerging", "established", "refresh"],
      },
      primaryAudience: {
        type: "string",
        minLength: 3,
        title: "Primary audience",
      },
      successMetric: {
        type: "string",
        minLength: 3,
        title: "Success metric",
      },
      competitorSet: {
        type: "string",
        title: "Known competitors",
      },
      legalReviewRequired: {
        type: "boolean",
        title: "Legal review required",
      },
      legalReviewOwner: {
        type: "string",
        minLength: 2,
        title: "Legal review owner",
      },
    },
    allOf: [
      {
        if: {
          properties: { legalReviewRequired: { const: true } },
          required: ["legalReviewRequired"],
        },
        then: {
          required: ["legalReviewOwner"],
        },
      },
    ],
  },
  uiSchema: {
    competitorSet: { "ui:widget": "textarea" },
    primaryAudience: { "ui:widget": "textarea" },
  },
  questionMeta: {
    brandMaturity: {
      businessCategory: "brand",
      evidenceRequired: false,
      targetMapping: "requirement.brand_maturity",
      labels: { en: "Brand maturity" },
    },
    primaryAudience: {
      businessCategory: "audience",
      evidenceRequired: true,
      targetMapping: "requirement.audience",
      labels: { en: "Primary audience" },
    },
    successMetric: {
      businessCategory: "outcome",
      evidenceRequired: false,
      targetMapping: "requirement.success_metric",
      labels: { en: "Success metric" },
    },
    competitorSet: {
      businessCategory: "market",
      evidenceRequired: false,
      targetMapping: "requirement.competitors",
      labels: { en: "Known competitors" },
    },
    legalReviewRequired: {
      businessCategory: "risk",
      evidenceRequired: false,
      targetMapping: "risk.legal_review",
      labels: { en: "Legal review required" },
    },
    legalReviewOwner: {
      businessCategory: "risk",
      evidenceRequired: false,
      targetMapping: "risk.legal_review_owner",
      labels: { en: "Legal review owner" },
    },
  },
};

export function validateQuestionnaireResponse(
  document: QuestionnaireDocument,
  answers: Record<string, unknown>,
  options: { readonly enforceRequired?: boolean } = {},
): { readonly valid: boolean; readonly errors: readonly string[] } {
  const schema =
    options.enforceRequired === false
      ? (() => {
          const { $id: _schemaId, ...withoutId } = document.jsonSchema;
          void _schemaId;
          return {
            ...withoutId,
            required: [],
          };
        })()
      : document.jsonSchema;
  const schemaId =
    options.enforceRequired === false
      ? undefined
      : typeof document.jsonSchema.$id === "string"
        ? document.jsonSchema.$id
        : undefined;
  const existing =
    schemaId && ajv.getSchema ? ajv.getSchema(schemaId) : undefined;
  const validate = existing ?? ajv.compile(schema);
  const valid = Boolean(validate(answers));
  const errors = (validate.errors ?? []).map(
    (error: { instancePath: string; message?: string }) =>
      `${error.instancePath || "/"} ${error.message ?? "invalid"}`,
  );
  return { valid, errors };
}

export function requiredQuestionKeys(
  document: QuestionnaireDocument,
): readonly string[] {
  const required = document.jsonSchema.required;
  return Array.isArray(required)
    ? required.filter((key): key is string => typeof key === "string")
    : [];
}
