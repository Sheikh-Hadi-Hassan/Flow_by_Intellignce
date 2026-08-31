import { describe, expect, it } from "vitest";

import { toSemanticId } from "@flow/blm-contracts";
import {
  BusinessReasoningRuntime,
  DeterministicModelRouter,
  type BusinessReasoningRequest,
  type ModelBusinessReasoningDraft,
  type ModelReasoningEnvelope,
} from "@flow/blm-core";

import {
  GroqBusinessReasoningAdapter,
  createGroqAdapterFromEnv,
  createGroqAllowedReferenceCatalog,
  createGroqReasoningDraftSchema,
  createGroqResponseRequest,
  groqBlmReasoningPromptVersion,
  groqOpenAICompatibleBaseURL,
  groqReasoningDraftSchema,
  parseGroqResponseDraft,
  serializeGroqSystemPrompt,
  serializeGroqUserPayload,
  type GroqResponseClient,
} from "./index.js";

const envelope = {
  objective:
    "A company is profitable but regularly runs out of cash. Diagnose likely areas to investigate.",
  taskInstruction: {
    taskType: "DIAGNOSTIC",
    requestedTask:
      "A company is profitable but regularly runs out of cash. Diagnose likely areas to investigate.",
  },
  boundedContext: {
    bundleId: "context:test",
    knowledgeReleaseId: "flow.blm.knowledge-release.test",
    task: {
      taskType: "DIAGNOSTIC",
      requestedTask:
        "A company is profitable but regularly runs out of cash. Diagnose likely areas to investigate.",
    },
    actor: {
      actorId: "actor-1",
      userId: "user-1",
      membershipId: "membership-1",
      roleIds: ["finance"],
      permissionIds: ["finance.analysis.read"],
      requestSource: "UI",
    },
    workspace: { workspaceId: "workspace-1" as never, slug: "workspace" },
    businessProfileSummary: {
      businessType: "Synthetic B2B distributor",
      billingModel: "Invoice billing",
      salesModel: "Relationship-led sales",
      requiredCapabilityIds: [],
      approvalRequirements: [],
    },
    relevantDomains: [],
    relevantConceptIds: [
      toSemanticId("flow.concept.finance.cash-flow"),
      toSemanticId("flow.concept.finance.receivable"),
      toSemanticId("flow.concept.finance.working-capital"),
    ],
    relevantRelationships: [],
    relevantProcessPatternIds: [],
    relevantMetricIds: [toSemanticId("flow.decision.metric.finance.dso")],
    relevantFormulaIds: [
      toSemanticId("flow.decision.formula.finance.working-capital"),
    ],
    relevantRuleIds: [],
    relevantLogicIds: [],
    relevantPsychologyInsights: [],
    relevantDiagnosticPatterns: [],
    relevantDecisionPatterns: [],
    availableBusinessSkills: [
      {
        semanticId: toSemanticId("flow.action.finance.calculate-gross-margin"),
        executionAuthority: "DRAFT_ONLY",
        requiredPermissions: ["finance.analysis.read"],
        requiredLogicIds: [],
        requiredERPCapabilities: [],
        approvalPolicy: "REQUIRES_APPROVAL",
        bindingAvailability: "KNOWN",
        inclusionReason: "SKILL_REQUIREMENT",
      },
    ],
    workspacePolicies: [
      {
        policyId: "policy-cash-management",
        workspaceId: "workspace-1",
        semanticId: toSemanticId("flow.concept.finance.cash-flow"),
        name: "Cash management policy",
        value: "Cash-management actions require human approval.",
        version: "1",
        provenance: { sourceIds: [], use: "FLOW_NATIVE", notes: "test" },
      },
    ],
    authorizedRecords: [
      {
        recordId: "synthetic-cash-snapshot-1",
        semanticId: toSemanticId("flow.concept.finance.cash-flow"),
        label: "Synthetic cash snapshot",
        version: "1",
        fields: { cashTrend: "shortage" },
        redactions: [],
        provenance: { sourceIds: [], use: "FLOW_NATIVE", notes: "test" },
      },
    ],
    authorityConstraints: [
      "Knowledge is not execution authority.",
      "Mutations require Action Wall authorization.",
    ],
    contextLimits: {
      maxDomains: 2,
      maxConcepts: 8,
      maxRelationships: 4,
      maxRecords: 0,
      maxSkills: 0,
      maxRules: 2,
      maxFormulas: 2,
      maxMetrics: 2,
      maxEvidence: 2,
      maxEstimatedCharacters: 2000,
      maxRelationshipDepth: 1,
    },
    inclusionReasons: [],
    provenance: [{ sourceIds: [], use: "FLOW_NATIVE", notes: "test" }],
    fingerprint: "fingerprint-test",
    compilerExplanation: "test",
  },
  authorityRules: ["Do not execute actions."],
  outputSchema: "BusinessReasoningResult structured rationale draft",
  evidenceRequirements: ["Cite supplied evidence where available."],
  prohibitedActions: ["Do not retrieve additional workspace data."],
  contextFingerprint: "fingerprint-test",
} satisfies ModelReasoningEnvelope;

function draftJson() {
  return JSON.stringify({
    status: "COMPLETED",
    summary:
      "Investigate cash flow, receivables timing, working capital, payables, and inventory.",
    findings: [],
    diagnosticHypotheses: [],
    decisionFactors: [],
    recommendations: [
      {
        recommendationId: "recommendation-1",
        statement:
          "Review AR aging, payment terms, payables timing, and inventory cash tied up before taking action.",
        authority: "ADVISORY_ONLY",
        evidenceReferences: [],
      },
    ],
    proposedSkills: [],
    requiredCalculations: [],
    requiredApprovals: [],
    missingInformation: [],
    uncertainties: [],
    evidenceReferences: [],
    businessConceptReferences: [
      "flow.concept.finance.cash-flow",
      "flow.concept.finance.receivable",
      "flow.concept.finance.working-capital",
      "flow.concept.finance.payable",
      "flow.concept.inventory.stock-on-hand",
    ],
    recordReferences: [],
    policyReferences: [],
    confidence: "MEDIUM",
  });
}

describe("Groq BLM reasoning adapter", () => {
  it("builds an OpenAI-compatible Responses request with strict structured output, no tools, and storage disabled", () => {
    const request = createGroqResponseRequest({
      envelope,
      model: "openai/gpt-oss-120b",
      store: false,
      timeoutMs: 12_000,
    });

    expect(request.model).toBe("openai/gpt-oss-120b");
    expect(request.store).toBe(false);
    expect(request.tools).toEqual([]);
    expect(request.text.format).toMatchObject({
      type: "json_schema",
      strict: true,
      name: "flow_blm_reasoning_draft",
    });
    expect(request.text.format.schema.additionalProperties).toBe(false);
    expect(
      arrayItemEnum(request.text.format.schema, "businessConceptReferences"),
    ).toEqual(envelope.boundedContext.relevantConceptIds);
    expect(
      arrayItemEnum(request.text.format.schema, "recordReferences"),
    ).toEqual(["synthetic-cash-snapshot-1"]);
    expect(request.metadata.prompt_version).toBe(groqBlmReasoningPromptVersion);
  });

  it("serializes BLM authority sections without enabling retrieval or arbitrary tool calling", () => {
    const system = serializeGroqSystemPrompt(envelope);
    const user = serializeGroqUserPayload(envelope);

    expect(system).toContain("BLM ROLE");
    expect(system).toContain("AUTHORITY CONSTRAINTS");
    expect(system).toContain("EVIDENCE REQUIREMENTS");
    expect(system).toContain("PROHIBITED ACTIONS");
    expect(system).toContain("REFERENCE RULES");
    expect(system).toContain("ALLOWED_REFERENCES");
    expect(system).toContain(groqBlmReasoningPromptVersion);
    expect(user).toContain("facts");
    expect(user).toContain("available_business_skills");
    expect(user).toContain("ALLOWED_REFERENCES");
    expect(user).toContain("flow.concept.finance.cash-flow");
    expect(system + user).not.toMatch(/browser_search|code_execution|mcp/i);
  });

  it("builds an allowed reference catalog only from compiled context", () => {
    const catalog = createGroqAllowedReferenceCatalog(envelope);

    expect(catalog.businessConceptIds).toEqual(
      envelope.boundedContext.relevantConceptIds,
    );
    expect(catalog.recordIds).toEqual(["synthetic-cash-snapshot-1"]);
    expect(catalog.policyIds).toEqual(["policy-cash-management"]);
    expect(catalog.skillIds).toEqual([
      toSemanticId("flow.action.finance.calculate-gross-margin"),
    ]);
    expect(catalog.formulaIds).toEqual([
      toSemanticId("flow.decision.formula.finance.working-capital"),
    ]);
    expect(catalog.businessConceptIds).not.toContain(
      toSemanticId("flow.concept.finance.payable"),
    );
  });

  it("constrains authoritative reference fields to context-authorized IDs where enums are practical", () => {
    const schema = createGroqReasoningDraftSchema(envelope);

    expect(arrayItemEnum(schema, "businessConceptReferences")).toEqual(
      envelope.boundedContext.relevantConceptIds,
    );
    expect(arrayItemEnum(schema, "recordReferences")).toEqual([
      "synthetic-cash-snapshot-1",
    ]);
    expect(arrayItemEnum(schema, "policyReferences")).toEqual([
      "policy-cash-management",
    ]);
    expect(
      nestedArrayObjectPropertyEnum(schema, "proposedSkills", "skillId"),
    ).toEqual([toSemanticId("flow.action.finance.calculate-gross-margin")]);
    expect(
      nestedArrayObjectPropertyEnum(
        schema,
        "requiredCalculations",
        "formulaId",
      ),
    ).toEqual([toSemanticId("flow.decision.formula.finance.working-capital")]);
  });

  it("parses provider structured output into the neutral draft", () => {
    const parsed = parseGroqResponseDraft({
      output_text: draftJson(),
      _request_id: "req_123",
    });

    expect(parsed.status).toBe("COMPLETED");
    expect(parsed.businessConceptReferences).toContain(
      toSemanticId("flow.concept.finance.cash-flow"),
    );
    expect(parsed.recordReferences).toEqual([]);
  });

  it("fails malformed or empty provider output safely", () => {
    expect(parseGroqResponseDraft({ output_text: "not-json" })).toMatchObject({
      status: "MODEL_FAILURE",
      confidence: "LOW",
    });
    expect(parseGroqResponseDraft({ output: [] })).toMatchObject({
      status: "MODEL_FAILURE",
      confidence: "LOW",
    });
  });

  it("maps rate limits with bounded retries and safe metadata", async () => {
    let attempts = 0;
    const client: GroqResponseClient = {
      responses: {
        create() {
          attempts += 1;
          return Promise.reject(groqError(429, "rate_limit_exceeded"));
        },
      },
    };
    const adapter = new GroqBusinessReasoningAdapter({
      client,
      model: "openai/gpt-oss-120b",
      maxRetries: 1,
      store: false,
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });

    const result = await adapter.reasonAsync(envelope);

    expect(attempts).toBe(2);
    expect(result.status).toBe("MODEL_FAILURE");
    expect(result.providerMetadata?.provider).toBe("groq");
    expect(result.providerMetadata?.retryCount).toBe(1);
    expect(result.providerMetadata?.storageDisabled).toBe(true);
    expect(JSON.stringify(result)).not.toContain("GROQ_API_KEY");
  });

  it("maps authentication failure without retrying", async () => {
    let attempts = 0;
    const client: GroqResponseClient = {
      responses: {
        create() {
          attempts += 1;
          return Promise.reject(groqError(401));
        },
      },
    };
    const adapter = new GroqBusinessReasoningAdapter({
      client,
      model: "openai/gpt-oss-120b",
      maxRetries: 3,
    });

    const result = await adapter.reasonAsync(envelope);

    expect(attempts).toBe(1);
    expect(result.status).toBe("MODEL_FAILURE");
    expect(result.summary).toMatch(/authentication/i);
  });

  it("supports timeout and unavailable failures without leaking provider types to BLM core", async () => {
    const client: GroqResponseClient = {
      responses: {
        create() {
          return Promise.reject(groqError(503));
        },
      },
    };
    const adapter = new GroqBusinessReasoningAdapter({
      client,
      model: "openai/gpt-oss-120b",
      maxRetries: 0,
    });

    const result = await adapter.reasonAsync(envelope);

    expect(result.status).toBe("MODEL_FAILURE");
    expect(result.summary).toMatch(/unavailable/i);
  });

  it("captures provider metadata, usage, and base URL without secrets", async () => {
    const client: GroqResponseClient = {
      responses: {
        create(input) {
          expect(input.tools).toEqual([]);
          expect(input.store).toBe(false);
          return Promise.resolve({
            output_text: draftJson(),
            _request_id: "req_groq",
            usage: {
              input_tokens: 100,
              output_tokens: 40,
              total_tokens: 140,
            },
          });
        },
      },
    };
    const adapter = new GroqBusinessReasoningAdapter({
      client,
      model: "openai/gpt-oss-120b",
      store: false,
      maxRetries: 0,
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });

    const result = await adapter.reasonAsync(envelope);

    expect(result.status).toBe("COMPLETED");
    expect(result.providerMetadata).toMatchObject({
      provider: "groq",
      baseURL: groqOpenAICompatibleBaseURL,
      structuredOutput: true,
      toolsDisabled: true,
      storageDisabled: true,
      usage: { inputTokens: 100, outputTokens: 40, totalTokens: 140 },
    });
    expect(JSON.stringify(result)).not.toMatch(/gsk_|apiKey/i);
  });

  it("accepts exact authorized semantic references through the unchanged BLM validator", async () => {
    const result = await runtimeResult({
      status: "COMPLETED",
      answer:
        "Working capital and receivables should be investigated before taking action.",
      summary: "Investigate cash-flow timing.",
      businessConceptReferences: [
        toSemanticId("flow.concept.finance.cash-flow"),
        toSemanticId("flow.concept.finance.receivable"),
      ],
      recordReferences: ["synthetic-cash-snapshot-1"],
      policyReferences: ["policy-cash-management"],
      confidence: "MEDIUM",
    });

    expect(result.warnings.map((warning) => warning.code)).not.toContain(
      "INVALID_REFERENCE_REJECTED",
    );
    expect(result.warnings.map((warning) => warning.code)).not.toContain(
      "UNVERIFIED_MODEL_ASSERTION",
    );
    expect(result.businessConceptReferences).toContain(
      toSemanticId("flow.concept.finance.cash-flow"),
    );
  });

  it("rejects a noncanonical label used as an authoritative semantic ID", async () => {
    const result = await runtimeResult({
      status: "COMPLETED",
      summary: "Cash flow should be investigated.",
      businessConceptReferences: ["cash-flow" as never],
      confidence: "MEDIUM",
    });

    expect(result.businessConceptReferences).toEqual([]);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "UNVERIFIED_MODEL_ASSERTION",
        message:
          "Unknown or out-of-context semantic reference rejected: cash-flow",
      }),
    );
  });

  it("rejects a global BLM concept absent from compiled context", async () => {
    const result = await runtimeResult({
      status: "COMPLETED",
      summary: "Payables may matter, but the ID is not authorized here.",
      businessConceptReferences: [toSemanticId("flow.concept.finance.payable")],
      confidence: "MEDIUM",
    });

    expect(result.businessConceptReferences).toEqual([]);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "UNVERIFIED_MODEL_ASSERTION",
        message:
          "Unknown or out-of-context semantic reference rejected: flow.concept.finance.payable",
      }),
    );
  });

  it("rejects hallucinated record IDs and unknown skill IDs", async () => {
    const result = await runtimeResult({
      status: "COMPLETED",
      summary: "Do not accept hallucinated workspace references.",
      recordReferences: ["invoice-not-in-context"],
      proposedSkills: [
        {
          skillId: toSemanticId("flow.action.finance.collect-payment"),
          reason: "Unsupported action.",
          inputReferences: [],
          authority: "EXECUTE",
          requiredPermissions: ["finance.payment.write"],
          approvalRequirement: "NONE",
        },
      ],
      confidence: "MEDIUM",
    });

    expect(result.recordReferences).toEqual([]);
    expect(result.proposedSkills[0]).toMatchObject({
      skillId: toSemanticId("flow.action.finance.collect-payment"),
      status: "REJECTED",
    });
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "INVALID_REFERENCE_REJECTED",
        "SKILL_PROPOSAL_REJECTED",
      ]),
    );
  });

  it("allows natural-language concepts without converting them into authoritative references", async () => {
    const result = await runtimeResult({
      status: "COMPLETED",
      answer:
        "Payables and inventory can still be discussed as possible business areas, but no unlisted ID is asserted.",
      summary: "Discussed possible cash-flow drivers without extra IDs.",
      businessConceptReferences: [
        toSemanticId("flow.concept.finance.cash-flow"),
      ],
      confidence: "MEDIUM",
    });

    expect(result.answer).toContain("Payables and inventory");
    expect(result.businessConceptReferences).toEqual([
      toSemanticId("flow.concept.finance.cash-flow"),
    ]);
    expect(result.warnings.map((warning) => warning.code)).not.toContain(
      "UNVERIFIED_MODEL_ASSERTION",
    );
  });

  it("supports missing information instead of invented references", async () => {
    const result = await runtimeResult({
      status: "NEEDS_INFORMATION",
      summary: "More cash timing evidence is required.",
      businessConceptReferences: [
        toSemanticId("flow.concept.finance.cash-flow"),
      ],
      missingInformation: [
        {
          field: "AR aging and AP aging detail",
          reason:
            "Cash shortages cannot be diagnosed authoritatively without timing detail.",
          requiredPermission: "finance.analysis.read",
        },
      ],
      confidence: "MEDIUM",
    });

    expect(result.status).toBe("NEEDS_INFORMATION");
    expect(result.contextExpansionRequests).toContainEqual(
      expect.objectContaining({
        need: "AR aging and AP aging detail",
      }),
    );
    expect(result.warnings.map((warning) => warning.code)).not.toContain(
      "INVALID_REFERENCE_REJECTED",
    );
  });

  it("defines schema restrictions aligned with strict structured output", () => {
    expect(groqReasoningDraftSchema.additionalProperties).toBe(false);
    expect(groqReasoningDraftSchema.required).toContain("status");
    expect(groqReasoningDraftSchema.required).toContain("answer");
    expect(groqReasoningDraftSchema.required).toContain("confidence");
  });

  it("creates env adapter only for gated real-model configuration", () => {
    const previous = {
      BLM_REAL_MODEL_TESTS: process.env.BLM_REAL_MODEL_TESTS,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      BLM_GROQ_MODEL: process.env.BLM_GROQ_MODEL,
    };
    delete process.env.BLM_REAL_MODEL_TESTS;
    delete process.env.GROQ_API_KEY;
    delete process.env.BLM_GROQ_MODEL;
    expect(createGroqAdapterFromEnv()).toBeUndefined();
    process.env.BLM_REAL_MODEL_TESTS = "1";
    process.env.GROQ_API_KEY = "redacted-test-key";
    process.env.BLM_GROQ_MODEL = "openai/gpt-oss-120b";
    expect(createGroqAdapterFromEnv()).toBeInstanceOf(
      GroqBusinessReasoningAdapter,
    );
    restoreEnv(previous);
  });
});

async function runtimeResult(
  draft: ModelBusinessReasoningDraft,
): Promise<Awaited<ReturnType<BusinessReasoningRuntime["reasonAsync"]>>> {
  const client: GroqResponseClient = {
    responses: {
      create() {
        return Promise.resolve({
          output_text: JSON.stringify(emptyDraft(draft)),
        });
      },
    },
  };
  const adapter = new GroqBusinessReasoningAdapter({
    client,
    model: "openai/gpt-oss-120b",
    maxRetries: 0,
  });
  const runtime = new BusinessReasoningRuntime({
    router: new DeterministicModelRouter(),
    modelAdapter: adapter,
  });
  return runtime.reasonAsync(reasoningRequest());
}

function reasoningRequest(): BusinessReasoningRequest {
  return {
    compiledContext: envelope.boundedContext,
    objective: envelope.objective,
    expectedOutputType: "DIAGNOSTIC",
    riskProfile: "MEDIUM",
    taskType: "DIAGNOSTIC",
    responseMode: "STRUCTURED",
  };
}

function emptyDraft(
  draft: ModelBusinessReasoningDraft,
): Required<
  Pick<
    ModelBusinessReasoningDraft,
    | "status"
    | "summary"
    | "findings"
    | "diagnosticHypotheses"
    | "decisionFactors"
    | "recommendations"
    | "proposedSkills"
    | "requiredCalculations"
    | "requiredApprovals"
    | "missingInformation"
    | "uncertainties"
    | "evidenceReferences"
    | "businessConceptReferences"
    | "recordReferences"
    | "policyReferences"
    | "confidence"
  >
> &
  Pick<ModelBusinessReasoningDraft, "answer"> {
  return {
    status: "COMPLETED",
    answer: "",
    summary: "",
    findings: [],
    diagnosticHypotheses: [],
    decisionFactors: [],
    recommendations: [],
    proposedSkills: [],
    requiredCalculations: [],
    requiredApprovals: [],
    missingInformation: [],
    uncertainties: [],
    evidenceReferences: [],
    businessConceptReferences: [],
    recordReferences: [],
    policyReferences: [],
    confidence: "MEDIUM",
    ...draft,
  };
}

function arrayItemEnum(
  schema: typeof groqReasoningDraftSchema,
  property: string,
): readonly string[] | undefined {
  const propertySchema = schema.properties?.[property];
  if (
    typeof propertySchema !== "object" ||
    propertySchema === null ||
    propertySchema.type !== "array" ||
    typeof propertySchema.items !== "object" ||
    propertySchema.items === null
  ) {
    return undefined;
  }
  return propertySchema.items.enum;
}

function nestedArrayObjectPropertyEnum(
  schema: typeof groqReasoningDraftSchema,
  property: string,
  nestedProperty: string,
): readonly string[] | undefined {
  const propertySchema = schema.properties?.[property];
  if (
    typeof propertySchema !== "object" ||
    propertySchema === null ||
    propertySchema.type !== "array" ||
    typeof propertySchema.items !== "object" ||
    propertySchema.items === null ||
    propertySchema.items.type !== "object"
  ) {
    return undefined;
  }
  const nestedSchema = propertySchema.items.properties?.[nestedProperty];
  if (typeof nestedSchema !== "object" || nestedSchema === null) {
    return undefined;
  }
  return nestedSchema.enum;
}

function groqError(
  status: number,
  code?: string,
): Error & {
  readonly status: number;
  readonly code?: string;
} {
  const error = new Error(`Groq test error ${status}`) as Error & {
    status: number;
    code?: string;
  };
  error.status = status;
  if (code) error.code = code;
  return error;
}

function restoreEnv(previous: {
  readonly BLM_REAL_MODEL_TESTS: string | undefined;
  readonly GROQ_API_KEY: string | undefined;
  readonly BLM_GROQ_MODEL: string | undefined;
}): void {
  restoreEnvKey("BLM_REAL_MODEL_TESTS", previous.BLM_REAL_MODEL_TESTS);
  restoreEnvKey("GROQ_API_KEY", previous.GROQ_API_KEY);
  restoreEnvKey("BLM_GROQ_MODEL", previous.BLM_GROQ_MODEL);
}

function restoreEnvKey(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
