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

export const groqBlmReasoningPromptVersion =
  "flow.blm.reasoning-prompt.groq.responses.v1";

export const groqOpenAICompatibleBaseURL = "https://api.groq.com/openai/v1";

export interface GroqBlmReasoningAdapterConfig {
  readonly apiKey?: string;
  readonly model: string;
  readonly timeoutMs?: number;
  readonly maxOutputTokens?: number;
  readonly maxRetries?: number;
  readonly store?: boolean;
  readonly client?: GroqResponseClient;
  readonly now?: () => Date;
}

export interface GroqUsageMetadata {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface GroqProviderExecutionMetadata {
  readonly provider: "groq";
  readonly adapterId: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly baseURL: string;
  readonly requestId?: string;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly storageDisabled: boolean;
  readonly structuredOutput: boolean;
  readonly toolsDisabled: boolean;
  readonly refusal: boolean;
  readonly usage?: GroqUsageMetadata;
  readonly timestamp: string;
}

export interface GroqModelReasoningDraft extends ModelBusinessReasoningDraft {
  readonly providerMetadata?: GroqProviderExecutionMetadata;
}

export interface GroqResponseClient {
  responses: {
    create(input: GroqResponseCreateInput): Promise<GroqResponseLike>;
  };
}

export interface GroqResponseCreateInput {
  readonly model: string;
  readonly input: readonly GroqInputMessage[];
  readonly text: {
    readonly format: GroqTextJsonSchemaFormat;
  };
  readonly tools: readonly [];
  readonly store: boolean;
  readonly max_output_tokens?: number;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface GroqInputMessage {
  readonly role: "system" | "user";
  readonly content: readonly {
    readonly type: "input_text";
    readonly text: string;
  }[];
}

export interface GroqTextJsonSchemaFormat {
  readonly type: "json_schema";
  readonly name: string;
  readonly strict: true;
  readonly schema: JsonSchemaObject;
}

export interface GroqAllowedReferenceCatalog {
  readonly businessConceptIds: readonly string[];
  readonly recordIds: readonly string[];
  readonly policyIds: readonly string[];
  readonly skillIds: readonly string[];
  readonly formulaIds: readonly string[];
  readonly ruleIds: readonly string[];
  readonly metricIds: readonly string[];
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

export interface GroqResponseLike {
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

export class GroqBusinessReasoningAdapter implements BusinessReasoningModelAdapter {
  readonly adapterId = "groq-responses-business-reasoning-adapter";
  readonly modelProfile: ModelCapabilityProfile = {
    modelFamily: "CLOUD_LLM",
    supportsToolUse: false,
    supportsStructuredOutput: true,
    maxContextTokens: 131_072,
  };

  private readonly client: GroqResponseClient;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;
  private readonly maxRetries: number;
  private readonly store: boolean;
  private readonly now: () => Date;

  constructor(private readonly config: GroqBlmReasoningAdapterConfig) {
    if (!config.model.trim()) {
      throw new Error("Groq BLM adapter requires a configured model.");
    }
    if (!config.client && !config.apiKey) {
      throw new Error("Groq BLM adapter requires GROQ_API_KEY or a client.");
    }
    this.client =
      config.client ??
      groqClientAdapter(
        new OpenAI({
          apiKey: config.apiKey,
          baseURL: groqOpenAICompatibleBaseURL,
          timeout: config.timeoutMs ?? 30_000,
          maxRetries: 0,
        }),
      );
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxOutputTokens = config.maxOutputTokens ?? 1_800;
    this.maxRetries = config.maxRetries ?? 2;
    this.store = config.store ?? false;
    this.now = config.now ?? (() => new Date());
  }

  reason(): ModelBusinessReasoningDraft {
    return {
      status: "MODEL_FAILURE",
      summary: "Groq adapter requires the async reasoning path.",
      confidence: "LOW",
    };
  }

  async reasonAsync(
    envelope: ModelReasoningEnvelope,
  ): Promise<GroqModelReasoningDraft> {
    const startedAt = this.now().getTime();
    let retryCount = 0;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.client.responses.create(
          createGroqResponseRequest({
            envelope,
            model: this.config.model,
            store: this.store,
            timeoutMs: this.timeoutMs,
            maxOutputTokens: this.maxOutputTokens,
          }),
        );
        const draft = parseGroqResponseDraft(response);
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
        const mapped = mapGroqError(error);
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
        await delay(mapped.retryAfterMs ?? retryDelayMs(attempt));
      }
    }
    return {
      status: "MODEL_FAILURE",
      summary: "Groq provider retry loop exhausted.",
      confidence: "LOW",
    };
  }
}

export function createGroqResponseRequest(input: {
  readonly envelope: ModelReasoningEnvelope;
  readonly model: string;
  readonly store?: boolean;
  readonly timeoutMs?: number;
  readonly maxOutputTokens?: number;
}): GroqResponseCreateInput {
  return {
    model: input.model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: serializeGroqSystemPrompt(input.envelope),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: serializeGroqUserPayload(input.envelope),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "flow_blm_reasoning_draft",
        strict: true,
        schema: createGroqReasoningDraftSchema(input.envelope),
      },
    },
    tools: [],
    store: input.store ?? false,
    max_output_tokens: input.maxOutputTokens ?? 1_800,
    metadata: {
      prompt_version: groqBlmReasoningPromptVersion,
      context_fingerprint: input.envelope.contextFingerprint,
    },
  };
}

export function serializeGroqSystemPrompt(
  envelope: ModelReasoningEnvelope,
): string {
  return [
    "BLM ROLE",
    "You are a reasoning engine operating inside Flow BLM.",
    "You are not the source of business authority.",
    "Use supplied context for authoritative claims.",
    "Do not invent workspace facts, permissions, record IDs, policy IDs, or skill IDs.",
    "Do not execute actions.",
    "If formulas are listed and authoritative numeric calculation is needed, return requiredCalculations instead of calculating.",
    "Identify missing information rather than guessing.",
    "Keep answer, summary, findings, hypotheses, factors, and recommendations concise.",
    "",
    "REFERENCE RULES",
    "Use only exact IDs supplied in ALLOWED_REFERENCES for authoritative reference fields.",
    "Never invent an ID or convert a business label into an ID yourself.",
    "If a useful concept has no allowed ID, discuss it in ordinary explanatory text only.",
    "If required information or a required reference is unavailable, return missingInformation instead of inventing a reference.",
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
    "Use concise transport output: 1 short answer, 1 summary, 0-3 recommendations, missingInformation when needed, and requiredCalculations when deterministic formulas are needed.",
    `PROMPT VERSION: ${groqBlmReasoningPromptVersion}`,
    `CONTEXT FINGERPRINT: ${envelope.contextFingerprint}`,
  ].join("\n");
}

export function serializeGroqUserPayload(
  envelope: ModelReasoningEnvelope,
): string {
  const context = envelope.boundedContext;
  return JSON.stringify(
    {
      task: {
        type: envelope.taskInstruction.taskType,
        key: envelope.taskInstruction.taskKey,
        question: envelope.taskInstruction.requestedTask,
      },
      objective: envelope.objective,
      facts: context.authorizedRecords.map((record) => ({
        recordId: record.recordId,
        semanticId: record.semanticId,
        label: record.label,
        fields: record.fields,
        redactions: record.redactions,
      })),
      relevant_business_knowledge: {
        businessProfile: context.businessProfileSummary,
        domains: context.relevantDomains.map((domain) => domain.key),
        conceptIds: context.relevantConceptIds,
        relationships: context.relevantRelationships.map((relationship) => ({
          id: relationship.semanticId,
          from: relationship.sourceConceptId,
          relation: relationship.relationship,
          to: relationship.targetConceptId,
        })),
        metrics: context.relevantMetricIds,
        formulas: context.relevantFormulaIds,
        rules: context.relevantRuleIds,
        diagnostics: context.relevantDiagnosticPatterns.map((pattern) => ({
          id: pattern.semanticId,
          name: pattern.name,
          signal: pattern.problemSignal,
          concepts: pattern.investigationConceptIds,
          metrics: pattern.relatedMetricIds,
          prohibitedConclusion: pattern.prohibitedConclusion,
        })),
        decisions: context.relevantDecisionPatterns.map((pattern) => ({
          id: pattern.semanticId,
          name: pattern.name,
          context: pattern.decisionContext,
          inputs: pattern.inputConceptIds,
          factors: pattern.decisionFactors,
          boundary: pattern.outputBoundary,
          requiredAuthority: pattern.requiredAuthority,
        })),
        psychology: context.relevantPsychologyInsights.map((insight) => ({
          id: insight.semanticId,
          principle: insight.principle,
          interpretations: insight.possibleInterpretations,
          ethicalResponses: insight.recommendedEthicalResponses,
          prohibitedMisuse: insight.prohibitedMisuse,
        })),
      },
      policies: context.workspacePolicies.map((policy) => ({
        policyId: policy.policyId,
        semanticId: policy.semanticId,
        name: policy.name,
        value: policy.value,
      })),
      available_business_skills: context.availableBusinessSkills,
      ALLOWED_REFERENCES: createGroqAllowedReferenceCatalog(envelope),
      authority_constraints: context.authorityConstraints,
      context_fingerprint: context.fingerprint,
      knowledge_release: context.knowledgeReleaseId,
    },
    null,
    2,
  );
}

export function parseGroqResponseDraft(
  response: GroqResponseLike,
): ModelBusinessReasoningDraft {
  const outputText =
    response.output_text ?? extractTextFromOutput(response.output);
  if (!outputText) {
    return {
      status: "MODEL_FAILURE",
      summary: "Groq response did not include structured output text.",
      confidence: "LOW",
    };
  }
  try {
    return JSON.parse(outputText) as ModelBusinessReasoningDraft;
  } catch {
    return {
      status: "MODEL_FAILURE",
      summary: "Groq response structured output could not be parsed.",
      confidence: "LOW",
    };
  }
}

export const groqReasoningDraftSchema: JsonSchemaObject = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "answer",
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

export function createGroqAllowedReferenceCatalog(
  envelope: ModelReasoningEnvelope,
): GroqAllowedReferenceCatalog {
  const context = envelope.boundedContext;
  return {
    businessConceptIds: context.relevantConceptIds,
    recordIds: context.authorizedRecords.map((record) => record.recordId),
    policyIds: context.workspacePolicies.map((policy) => policy.policyId),
    skillIds: context.availableBusinessSkills.map((skill) => skill.semanticId),
    formulaIds: context.relevantFormulaIds,
    ruleIds: context.relevantRuleIds,
    metricIds: context.relevantMetricIds,
  };
}

export function createGroqReasoningDraftSchema(
  envelope: ModelReasoningEnvelope,
): JsonSchemaObject {
  const allowedReferences = createGroqAllowedReferenceCatalog(envelope);
  const properties: Record<string, JsonSchema> = {
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
    requiredCalculations: arraySchema(
      objectSchema({
        formulaId: stringSchemaForAllowedValues(allowedReferences.formulaIds),
        requiredInputs: arraySchema(
          stringSchemaForAllowedValues(allowedReferences.businessConceptIds),
        ),
        reason: stringSchema(),
        status: enumSchema(["REQUIRED", "BLOCKED_MISSING_INPUT"]),
      }),
    ),
    missingInformation: arraySchema(missingInformationSchema()),
    businessConceptReferences: arraySchema(
      stringSchemaForAllowedValues(allowedReferences.businessConceptIds),
    ),
    recordReferences: arraySchema(
      stringSchemaForAllowedValues(allowedReferences.recordIds),
    ),
    policyReferences: arraySchema(
      stringSchemaForAllowedValues(allowedReferences.policyIds),
    ),
    confidence: confidenceSchema(),
  };
  if (allowedReferences.skillIds.length > 0) {
    properties.proposedSkills = arraySchema(
      objectSchema({
        skillId: stringSchemaForAllowedValues(allowedReferences.skillIds),
        reason: stringSchema(),
        inputReferences: arraySchema(evidenceReferenceSchema()),
        authority: stringSchema(),
        requiredPermissions: arraySchema(stringSchema()),
        approvalRequirement: stringSchema(),
      }),
    );
  }
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}

export function createGroqAdapterFromEnv():
  GroqBusinessReasoningAdapter | undefined {
  if (process.env.BLM_REAL_MODEL_TESTS !== "1") return undefined;
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.BLM_GROQ_MODEL;
  if (!apiKey || !model) return undefined;
  return new GroqBusinessReasoningAdapter({
    apiKey,
    model,
    timeoutMs: numberFromEnv("BLM_GROQ_TIMEOUT_MS") ?? 30_000,
    maxOutputTokens: numberFromEnv("BLM_GROQ_MAX_OUTPUT_TOKENS") ?? 1_800,
    maxRetries: numberFromEnv("BLM_GROQ_MAX_RETRIES") ?? 2,
    store: false,
  });
}

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

function stringSchemaForAllowedValues(values: readonly string[]): JsonSchema {
  if (values.length === 0) return stringSchema();
  return { type: "string", enum: values };
}

function enumSchema(values: readonly string[]): JsonSchema {
  return { type: "string", enum: values };
}

function providerMetadata(input: {
  readonly adapterId: string;
  readonly model: string;
  readonly response?: GroqResponseLike;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly storageDisabled: boolean;
  readonly refusal: boolean;
  readonly timestamp: string;
}): GroqProviderExecutionMetadata {
  return {
    provider: "groq",
    adapterId: input.adapterId,
    model: input.model,
    promptVersion: groqBlmReasoningPromptVersion,
    baseURL: groqOpenAICompatibleBaseURL,
    ...(input.response?._request_id || input.response?.id
      ? { requestId: input.response._request_id ?? input.response.id }
      : {}),
    durationMs: input.durationMs,
    retryCount: input.retryCount,
    storageDisabled: input.storageDisabled,
    structuredOutput: true,
    toolsDisabled: true,
    refusal: input.refusal,
    ...(input.response?.usage
      ? {
          usage: compactUsage(input.response.usage),
        }
      : {}),
    timestamp: input.timestamp,
  };
}

function groqClientAdapter(client: OpenAI): GroqResponseClient {
  return {
    responses: {
      async create(input: GroqResponseCreateInput): Promise<GroqResponseLike> {
        return client.responses.create(
          input as never,
        ) as Promise<GroqResponseLike>;
      },
    },
  };
}

function compactUsage(input: {
  readonly input_tokens?: number;
  readonly output_tokens?: number;
  readonly total_tokens?: number;
}): GroqUsageMetadata {
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

function mapGroqError(error: unknown): {
  readonly kind:
    | "TIMEOUT"
    | "RATE_LIMIT"
    | "AUTHENTICATION"
    | "PROVIDER_UNAVAILABLE"
    | "MALFORMED_OUTPUT"
    | "REFUSAL";
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
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
        message: "Groq authentication failed.",
      };
    }
    if (status === 429 || code === "rate_limit_exceeded") {
      const retryAfterMs = retryAfterMsFromError(error);
      return {
        kind: "RATE_LIMIT",
        retryable: true,
        ...(retryAfterMs ? { retryAfterMs } : {}),
        message: "Groq rate limit reached.",
      };
    }
    if (status === 408 || code === "timeout" || code === "ETIMEDOUT") {
      return {
        kind: "TIMEOUT",
        retryable: true,
        message: "Groq request timed out.",
      };
    }
    if (status && status >= 500) {
      return {
        kind: "PROVIDER_UNAVAILABLE",
        retryable: true,
        message: "Groq provider unavailable.",
      };
    }
  }
  return {
    kind: "PROVIDER_UNAVAILABLE",
    retryable: false,
    message: "Groq provider request failed.",
  };
}

function retryAfterMsFromError(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const headers =
    "headers" in error && typeof error.headers === "object"
      ? (error.headers as { readonly get?: (name: string) => string | null })
      : undefined;
  const retryAfter = headers?.get?.("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(60_000, Math.ceil(seconds * 1000));
    }
  }
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  const match = /try again in ([0-9.]+)s/i.exec(message);
  if (!match?.[1]) return undefined;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.min(60_000, Math.ceil(seconds * 1000) + 250);
}

function retryDelayMs(attempt: number): number {
  return Math.min(1_000, 100 * 2 ** attempt);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function numberFromEnv(name: string): number | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
