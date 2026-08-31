import OpenAI from "openai";

import type { ModelCapabilityProfile } from "@flow/blm-contracts";
import type {
  BusinessConfidence,
  BusinessReasoningModelAdapter,
  BusinessReasoningStatus,
  EvidenceReferenceKind,
  ModelBusinessReasoningDraft,
  ModelReasoningEnvelope,
} from "@flow/blm-core";

export const openAiBlmReasoningPromptVersion =
  "flow.blm.reasoning-prompt.openai.responses.v1";

export interface OpenAIBlmReasoningAdapterConfig {
  readonly apiKey?: string;
  readonly model: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly store?: boolean;
  readonly client?: OpenAIResponseClient;
  readonly now?: () => Date;
}

export interface OpenAIUsageMetadata {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface OpenAIProviderExecutionMetadata {
  readonly provider: "openai";
  readonly adapterId: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly requestId?: string;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly storageDisabled: boolean;
  readonly structuredOutput: boolean;
  readonly refusal: boolean;
  readonly usage?: OpenAIUsageMetadata;
  readonly timestamp: string;
}

export interface OpenAIModelReasoningDraft extends ModelBusinessReasoningDraft {
  readonly providerMetadata?: OpenAIProviderExecutionMetadata;
}

export interface OpenAIResponseClient {
  responses: {
    create(input: OpenAIResponseCreateInput): Promise<OpenAIResponseLike>;
  };
}

export interface OpenAIResponseCreateInput {
  readonly model: string;
  readonly input: readonly OpenAIInputMessage[];
  readonly text: {
    readonly format: OpenAITextJsonSchemaFormat;
  };
  readonly tools: readonly [];
  readonly store: boolean;
  readonly timeout?: number;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface OpenAIInputMessage {
  readonly role: "system" | "user";
  readonly content: readonly {
    readonly type: "input_text";
    readonly text: string;
  }[];
}

export interface OpenAITextJsonSchemaFormat {
  readonly type: "json_schema";
  readonly name: string;
  readonly strict: true;
  readonly schema: JsonSchemaObject;
}

export type JsonSchema =
  | JsonSchemaObject
  | {
      readonly type: "string" | "number" | "boolean" | "null";
      readonly enum?: readonly string[];
    };

export interface JsonSchemaObject {
  readonly type: "object" | "array" | "string" | "number" | "boolean";
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly items?: JsonSchema;
  readonly required?: readonly string[];
  readonly additionalProperties?: false;
  readonly enum?: readonly string[];
}

export interface OpenAIResponseLike {
  readonly id?: string;
  readonly output_text?: string;
  readonly output?: readonly unknown[];
  readonly usage?: {
    readonly input_tokens?: number;
    readonly output_tokens?: number;
    readonly total_tokens?: number;
  };
  readonly _request_id?: string;
}

export class OpenAIBusinessReasoningAdapter implements BusinessReasoningModelAdapter {
  readonly adapterId = "openai-responses-business-reasoning-adapter";
  readonly modelProfile: ModelCapabilityProfile = {
    modelFamily: "CLOUD_LLM",
    supportsToolUse: false,
    supportsStructuredOutput: true,
    maxContextTokens: 64_000,
  };

  private readonly client: OpenAIResponseClient;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly store: boolean;
  private readonly now: () => Date;

  constructor(private readonly config: OpenAIBlmReasoningAdapterConfig) {
    if (!config.model.trim()) {
      throw new Error("OpenAI BLM adapter requires a configured model.");
    }
    if (!config.client && !config.apiKey) {
      throw new Error(
        "OpenAI BLM adapter requires OPENAI_API_KEY or a client.",
      );
    }
    this.client =
      config.client ??
      openAIClientAdapter(
        new OpenAI({
          apiKey: config.apiKey,
          timeout: config.timeoutMs ?? 30_000,
          maxRetries: 0,
        }),
      );
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRetries = config.maxRetries ?? 2;
    this.store = config.store ?? false;
    this.now = config.now ?? (() => new Date());
  }

  reason(): ModelBusinessReasoningDraft {
    return {
      status: "MODEL_FAILURE",
      summary: "OpenAI adapter requires the async reasoning path.",
      confidence: "LOW",
    };
  }

  async reasonAsync(
    envelope: ModelReasoningEnvelope,
  ): Promise<OpenAIModelReasoningDraft> {
    const startedAt = this.now().getTime();
    let retryCount = 0;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.client.responses.create(
          createOpenAIResponseRequest({
            envelope,
            model: this.config.model,
            store: this.store,
            timeoutMs: this.timeoutMs,
          }),
        );
        const draft = parseOpenAIResponseDraft(response);
        return {
          ...draft,
          providerMetadata: providerMetadata({
            adapterId: this.adapterId,
            model: this.config.model,
            response,
            durationMs: this.now().getTime() - startedAt,
            retryCount,
            storageDisabled: this.store === false,
            refusal: draft.status === "MODEL_FAILURE",
            timestamp: this.now().toISOString(),
          }),
        };
      } catch (error) {
        const mapped = mapOpenAIError(error);
        if (!mapped.retryable || attempt === this.maxRetries) {
          return {
            status: "MODEL_FAILURE",
            summary: mapped.message,
            uncertainties: [
              {
                category: "MODEL_UNCERTAINTY",
                detail: mapped.message,
              },
            ],
            confidence: "LOW",
            providerMetadata: providerMetadata({
              adapterId: this.adapterId,
              model: this.config.model,
              durationMs: this.now().getTime() - startedAt,
              retryCount,
              storageDisabled: this.store === false,
              refusal: mapped.kind === "REFUSAL",
              timestamp: this.now().toISOString(),
            }),
          };
        }
        retryCount += 1;
        await delay(retryDelayMs(attempt));
      }
    }
    return {
      status: "MODEL_FAILURE",
      summary: "OpenAI provider retry loop exhausted.",
      confidence: "LOW",
    };
  }
}

export function createOpenAIResponseRequest(input: {
  readonly envelope: ModelReasoningEnvelope;
  readonly model: string;
  readonly store?: boolean;
  readonly timeoutMs?: number;
}): OpenAIResponseCreateInput {
  return {
    model: input.model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: serializeOpenAISystemPrompt(input.envelope),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: serializeOpenAIUserPayload(input.envelope),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "flow_blm_reasoning_draft",
        strict: true,
        schema: openAiReasoningDraftSchema,
      },
    },
    tools: [],
    store: input.store ?? false,
    ...(input.timeoutMs ? { timeout: input.timeoutMs } : {}),
    metadata: {
      prompt_version: openAiBlmReasoningPromptVersion,
      context_fingerprint: input.envelope.contextFingerprint,
    },
  };
}

export function serializeOpenAISystemPrompt(
  envelope: ModelReasoningEnvelope,
): string {
  return [
    "BLM ROLE",
    "You are a reasoning engine operating inside Flow BLM.",
    "You are not the source of business authority.",
    "Use only supplied business and workspace context for authoritative claims.",
    "Do not invent workspace facts, permissions, record IDs, policy IDs, or skill IDs.",
    "Do not execute actions or perform deterministic-required calculations.",
    "Identify missing information rather than guessing.",
    "",
    "AUTHORITY CONSTRAINTS",
    ...envelope.authorityRules,
    "",
    "EVIDENCE REQUIREMENTS",
    ...envelope.evidenceRequirements,
    "",
    "PROHIBITED ACTIONS",
    ...envelope.prohibitedActions,
    "",
    "OUTPUT CONTRACT",
    envelope.outputSchema,
    `PROMPT VERSION: ${openAiBlmReasoningPromptVersion}`,
    `CONTEXT FINGERPRINT: ${envelope.contextFingerprint}`,
  ].join("\n");
}

export function serializeOpenAIUserPayload(
  envelope: ModelReasoningEnvelope,
): string {
  const context = envelope.boundedContext;
  return JSON.stringify(
    {
      task: envelope.taskInstruction,
      objective: envelope.objective,
      business_context: {
        business_profile: context.businessProfileSummary,
        domains: context.relevantDomains.map((domain) => ({
          domainId: domain.domainId,
          key: domain.key,
          coverageStatus: domain.coverageStatus,
        })),
        concepts: context.relevantConceptIds,
        relationships: context.relevantRelationships.map((relationship) => ({
          semanticId: relationship.semanticId,
          sourceConceptId: relationship.sourceConceptId,
          relationship: relationship.relationship,
          targetConceptId: relationship.targetConceptId,
          description: relationship.description,
        })),
        processes: context.relevantProcessPatternIds,
        metrics: context.relevantMetricIds,
        formulas: context.relevantFormulaIds,
        rules: context.relevantRuleIds,
        diagnostics: context.relevantDiagnosticPatterns,
        decisions: context.relevantDecisionPatterns,
        psychology: context.relevantPsychologyInsights,
      },
      workspace_facts: {
        records: context.authorizedRecords,
        policies: context.workspacePolicies,
      },
      available_business_skills: context.availableBusinessSkills,
      authority_constraints: context.authorityConstraints,
      provenance: context.provenance,
      context_fingerprint: context.fingerprint,
      knowledge_release: context.knowledgeReleaseId,
    },
    null,
    2,
  );
}

export function parseOpenAIResponseDraft(
  response: OpenAIResponseLike,
): ModelBusinessReasoningDraft {
  const outputText =
    response.output_text ?? extractTextFromOutput(response.output);
  if (!outputText) {
    return {
      status: "MODEL_FAILURE",
      summary: "OpenAI response did not include structured output text.",
      confidence: "LOW",
    };
  }
  try {
    const parsed = JSON.parse(outputText) as ModelBusinessReasoningDraft;
    return parsed;
  } catch {
    return {
      status: "MODEL_FAILURE",
      summary: "OpenAI response structured output could not be parsed.",
      confidence: "LOW",
    };
  }
}

export const openAiReasoningDraftSchema: JsonSchemaObject = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "summary",
    "findings",
    "diagnosticHypotheses",
    "decisionFactors",
    "recommendations",
    "proposedSkills",
    "requiredCalculations",
    "requiredApprovals",
    "missingInformation",
    "uncertainties",
    "evidenceReferences",
    "businessConceptReferences",
    "recordReferences",
    "policyReferences",
    "confidence",
  ],
  properties: {
    status: enumSchema([
      "COMPLETED",
      "NEEDS_INFORMATION",
      "NEEDS_CALCULATION",
      "NEEDS_APPROVAL",
      "UNSUPPORTED",
      "BLOCKED_BY_POLICY",
      "INSUFFICIENT_AUTHORITY",
      "INVALID_CONTEXT",
      "MODEL_FAILURE",
    ] satisfies readonly BusinessReasoningStatus[]),
    answer: stringSchema(),
    summary: stringSchema(),
    findings: arraySchema(
      objectSchema({
        findingId: stringSchema(),
        statement: stringSchema(),
        businessMeaning: stringSchema(),
        evidenceReferences: arraySchema(evidenceReferenceSchema()),
        confidence: confidenceSchema(),
      }),
    ),
    diagnosticHypotheses: arraySchema(
      objectSchema({
        hypothesisId: stringSchema(),
        statement: stringSchema(),
        investigationDimensions: arraySchema(stringSchema()),
        supportingEvidence: arraySchema(evidenceReferenceSchema()),
        contradictingEvidence: arraySchema(evidenceReferenceSchema()),
        missingEvidence: arraySchema(missingInformationSchema()),
        uncertainty: confidenceSchema(),
      }),
    ),
    decisionFactors: arraySchema(
      objectSchema({
        factorId: stringSchema(),
        factor: stringSchema(),
        evidenceReferences: arraySchema(evidenceReferenceSchema()),
        tradeOff: stringSchema(),
        confidence: confidenceSchema(),
      }),
    ),
    recommendations: arraySchema(
      objectSchema({
        recommendationId: stringSchema(),
        statement: stringSchema(),
        authority: enumSchema([
          "DRAFT_ONLY",
          "ADVISORY_ONLY",
          "REQUIRES_APPROVAL",
        ]),
        evidenceReferences: arraySchema(evidenceReferenceSchema()),
      }),
    ),
    proposedSkills: arraySchema(
      objectSchema({
        skillId: stringSchema(),
        reason: stringSchema(),
        inputReferences: arraySchema(evidenceReferenceSchema()),
        authority: stringSchema(),
        requiredPermissions: arraySchema(stringSchema()),
        approvalRequirement: stringSchema(),
      }),
    ),
    requiredCalculations: arraySchema(
      objectSchema({
        formulaId: stringSchema(),
        requiredInputs: arraySchema(stringSchema()),
        reason: stringSchema(),
        status: enumSchema(["REQUIRED", "BLOCKED_MISSING_INPUT"]),
      }),
    ),
    requiredApprovals: arraySchema(
      objectSchema({
        approvalId: stringSchema(),
        reason: stringSchema(),
        policyReferences: arraySchema(evidenceReferenceSchema()),
      }),
    ),
    missingInformation: arraySchema(missingInformationSchema()),
    uncertainties: arraySchema(
      objectSchema({
        category: enumSchema([
          "MISSING_DATA",
          "CONFLICTING_DATA",
          "AMBIGUOUS_BUSINESS_RULE",
          "INSUFFICIENT_EVIDENCE",
          "MODEL_UNCERTAINTY",
          "OUTSIDE_DOMAIN_COVERAGE",
        ]),
        detail: stringSchema(),
      }),
    ),
    evidenceReferences: arraySchema(evidenceReferenceSchema()),
    businessConceptReferences: arraySchema(stringSchema()),
    recordReferences: arraySchema(stringSchema()),
    policyReferences: arraySchema(stringSchema()),
    confidence: confidenceSchema(),
  },
};

function evidenceReferenceSchema(): JsonSchemaObject {
  return objectSchema({
    kind: enumSchema([
      "WORKSPACE_RECORD",
      "WORKSPACE_POLICY",
      "BUSINESS_PROFILE",
      "BLM_KNOWLEDGE",
      "BUSINESS_RULE",
      "METRIC",
      "FORMULA",
      "DIAGNOSTIC_PATTERN",
      "USER_INPUT",
    ] satisfies readonly EvidenceReferenceKind[]),
    referenceId: stringSchema(),
    semanticId: stringSchema(),
    description: stringSchema(),
  });
}

function missingInformationSchema(): JsonSchemaObject {
  return objectSchema({
    field: stringSchema(),
    reason: stringSchema(),
    requiredPermission: stringSchema(),
  });
}

function confidenceSchema(): JsonSchema {
  return enumSchema([
    "LOW",
    "MEDIUM",
    "HIGH",
  ] satisfies readonly BusinessConfidence[]);
}

function objectSchema(
  properties: Readonly<Record<string, JsonSchema>>,
): JsonSchemaObject {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

function arraySchema(items: JsonSchema): JsonSchemaObject {
  return {
    type: "array",
    items,
  };
}

function stringSchema(): JsonSchema {
  return { type: "string" };
}

function enumSchema(values: readonly string[]): JsonSchema {
  return { type: "string", enum: values };
}

function providerMetadata(input: {
  readonly adapterId: string;
  readonly model: string;
  readonly response?: OpenAIResponseLike;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly storageDisabled: boolean;
  readonly refusal: boolean;
  readonly timestamp: string;
}): OpenAIProviderExecutionMetadata {
  return {
    provider: "openai",
    adapterId: input.adapterId,
    model: input.model,
    promptVersion: openAiBlmReasoningPromptVersion,
    ...(input.response?._request_id || input.response?.id
      ? { requestId: input.response._request_id ?? input.response.id }
      : {}),
    durationMs: input.durationMs,
    retryCount: input.retryCount,
    storageDisabled: input.storageDisabled,
    structuredOutput: true,
    refusal: input.refusal,
    ...(input.response?.usage
      ? {
          usage: compactUsage(input.response.usage),
        }
      : {}),
    timestamp: input.timestamp,
  };
}

function openAIClientAdapter(client: OpenAI): OpenAIResponseClient {
  return {
    responses: {
      async create(
        input: OpenAIResponseCreateInput,
      ): Promise<OpenAIResponseLike> {
        return client.responses.create(
          input as never,
        ) as Promise<OpenAIResponseLike>;
      },
    },
  };
}

function compactUsage(input: {
  readonly input_tokens?: number;
  readonly output_tokens?: number;
  readonly total_tokens?: number;
}): OpenAIUsageMetadata {
  return {
    ...(input.input_tokens !== undefined
      ? { inputTokens: input.input_tokens }
      : {}),
    ...(input.output_tokens !== undefined
      ? { outputTokens: input.output_tokens }
      : {}),
    ...(input.total_tokens !== undefined
      ? { totalTokens: input.total_tokens }
      : {}),
  };
}

function extractTextFromOutput(
  output: readonly unknown[] | undefined,
): string | undefined {
  if (!output) return undefined;
  for (const item of output) {
    if (typeof item !== "object" || item === null) continue;
    const content = "content" in item ? item.content : undefined;
    if (!Array.isArray(content)) continue;
    for (const contentItem of content) {
      const text = textFromContentItem(contentItem);
      if (text) return text;
    }
  }
  return undefined;
}

function textFromContentItem(contentItem: unknown): string | undefined {
  if (typeof contentItem !== "object" || contentItem === null) return undefined;
  const candidate = contentItem as { readonly text?: unknown };
  return typeof candidate.text === "string" ? candidate.text : undefined;
}

function mapOpenAIError(error: unknown): {
  readonly kind:
    | "TIMEOUT"
    | "RATE_LIMIT"
    | "AUTHENTICATION"
    | "PROVIDER_UNAVAILABLE"
    | "MALFORMED_OUTPUT"
    | "REFUSAL";
  readonly retryable: boolean;
  readonly message: string;
} {
  if (typeof error === "object" && error !== null) {
    const status =
      "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;
    const code =
      "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;
    if (status === 401 || status === 403) {
      return {
        kind: "AUTHENTICATION",
        retryable: false,
        message: "OpenAI authentication failed.",
      };
    }
    if (status === 429 || code === "rate_limit_exceeded") {
      return {
        kind: "RATE_LIMIT",
        retryable: true,
        message: "OpenAI rate limit reached.",
      };
    }
    if (status === 408 || code === "timeout") {
      return {
        kind: "TIMEOUT",
        retryable: true,
        message: "OpenAI request timed out.",
      };
    }
    if (status && status >= 500) {
      return {
        kind: "PROVIDER_UNAVAILABLE",
        retryable: true,
        message: "OpenAI provider unavailable.",
      };
    }
  }
  return {
    kind: "PROVIDER_UNAVAILABLE",
    retryable: false,
    message: "OpenAI provider request failed.",
  };
}

function retryDelayMs(attempt: number): number {
  return Math.min(1_000, 100 * 2 ** attempt);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
