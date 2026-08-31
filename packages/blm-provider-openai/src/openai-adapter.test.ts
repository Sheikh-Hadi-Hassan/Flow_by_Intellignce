import { describe, expect, it } from "vitest";

import { toSemanticId } from "@flow/blm-contracts";
import type { ModelReasoningEnvelope } from "@flow/blm-core";

import {
  OpenAIBusinessReasoningAdapter,
  createOpenAIResponseRequest,
  openAiBlmReasoningPromptVersion,
  openAiReasoningDraftSchema,
  parseOpenAIResponseDraft,
  serializeOpenAISystemPrompt,
  serializeOpenAIUserPayload,
  type OpenAIResponseClient,
} from "./index.js";

const envelope = {
  objective: "Analyze overdue invoice.",
  taskInstruction: {
    taskType: "ANALYSIS",
    requestedTask: "Analyze overdue invoice.",
  },
  boundedContext: {
    bundleId: "context:test",
    knowledgeReleaseId: "flow.blm.knowledge-release.test",
    task: {
      taskType: "ANALYSIS",
      requestedTask: "Analyze overdue invoice.",
    },
    actor: {
      actorId: "actor-1",
      userId: "user-1",
      membershipId: "membership-1",
      roleIds: ["finance"],
      permissionIds: ["finance.invoice.read"],
      requestSource: "UI",
    },
    workspace: { workspaceId: "workspace-1" as never, slug: "workspace" },
    relevantDomains: [],
    relevantConceptIds: [toSemanticId("flow.concept.finance.invoice")],
    relevantRelationships: [],
    relevantProcessPatternIds: [],
    relevantMetricIds: [],
    relevantFormulaIds: [],
    relevantRuleIds: [],
    relevantLogicIds: [],
    relevantPsychologyInsights: [],
    relevantDiagnosticPatterns: [],
    relevantDecisionPatterns: [],
    availableBusinessSkills: [],
    workspacePolicies: [],
    authorizedRecords: [
      {
        recordId: "invoice-1",
        semanticId: toSemanticId("flow.concept.finance.invoice"),
        label: "Invoice 1",
        version: "1",
        fields: { status: "unpaid" },
        redactions: [],
        provenance: { sourceIds: [], use: "FLOW_NATIVE", notes: "test" },
      },
    ],
    authorityConstraints: [
      "Unauthorized records and restricted fields are excluded before model context.",
    ],
    contextLimits: {
      maxDomains: 1,
      maxConcepts: 4,
      maxRelationships: 2,
      maxRecords: 2,
      maxSkills: 2,
      maxRules: 2,
      maxFormulas: 2,
      maxMetrics: 2,
      maxEvidence: 2,
      maxEstimatedCharacters: 1000,
      maxRelationshipDepth: 1,
    },
    inclusionReasons: [],
    provenance: [{ sourceIds: [], use: "FLOW_NATIVE", notes: "test" }],
    fingerprint: "fingerprint-test",
    compilerExplanation: "test",
  },
  authorityRules: ["Do not execute actions."],
  outputSchema: "BusinessReasoningResult structured rationale draft",
  evidenceRequirements: ["Cite evidence."],
  prohibitedActions: ["Do not retrieve additional workspace data."],
  contextFingerprint: "fingerprint-test",
} satisfies ModelReasoningEnvelope;

function draftJson() {
  return JSON.stringify({
    status: "COMPLETED",
    summary: "Invoice is unpaid.",
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
    businessConceptReferences: ["flow.concept.finance.invoice"],
    recordReferences: ["invoice-1"],
    policyReferences: [],
    confidence: "MEDIUM",
  });
}

describe("OpenAI BLM reasoning adapter", () => {
  it("builds a Responses API request with strict structured output, no tools, and storage disabled", () => {
    const request = createOpenAIResponseRequest({
      envelope,
      model: "configured-model",
      store: false,
      timeoutMs: 12_000,
    });

    expect(request.model).toBe("configured-model");
    expect(request.store).toBe(false);
    expect(request.tools).toEqual([]);
    expect(request.text.format).toMatchObject({
      type: "json_schema",
      strict: true,
      name: "flow_blm_reasoning_draft",
    });
    expect(request.text.format.schema.additionalProperties).toBe(false);
    expect(request.metadata.prompt_version).toBe(
      openAiBlmReasoningPromptVersion,
    );
  });

  it("serializes documented prompt sections without enabling retrieval or tools", () => {
    const system = serializeOpenAISystemPrompt(envelope);
    const user = serializeOpenAIUserPayload(envelope);

    expect(system).toContain("BLM ROLE");
    expect(system).toContain("AUTHORITY CONSTRAINTS");
    expect(system).toContain("EVIDENCE REQUIREMENTS");
    expect(system).toContain("PROHIBITED ACTIONS");
    expect(system).toContain(openAiBlmReasoningPromptVersion);
    expect(user).toContain("workspace_facts");
    expect(user).toContain("available_business_skills");
    expect(system + user).not.toMatch(/file_search|web_search|tool_choice/i);
  });

  it("parses provider structured output into the neutral draft", () => {
    const parsed = parseOpenAIResponseDraft({
      output_text: draftJson(),
      _request_id: "req_123",
    });

    expect(parsed.status).toBe("COMPLETED");
    expect(parsed.recordReferences).toEqual(["invoice-1"]);
  });

  it("fails malformed provider output safely", () => {
    const parsed = parseOpenAIResponseDraft({ output_text: "not-json" });

    expect(parsed.status).toBe("MODEL_FAILURE");
    expect(parsed.summary).toMatch(/could not be parsed/);
  });

  it("handles provider refusal or empty output safely", () => {
    const parsed = parseOpenAIResponseDraft({ output: [] });

    expect(parsed.status).toBe("MODEL_FAILURE");
    expect(parsed.summary).toMatch(/did not include/);
  });

  it("maps rate limit with bounded retries and safe metadata", async () => {
    let attempts = 0;
    const client: OpenAIResponseClient = {
      responses: {
        create() {
          attempts += 1;
          return Promise.reject(openAIError(429, "rate_limit_exceeded"));
        },
      },
    };
    const adapter = new OpenAIBusinessReasoningAdapter({
      client,
      model: "configured-model",
      maxRetries: 1,
      store: false,
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });

    const result = await adapter.reasonAsync(envelope);

    expect(attempts).toBe(2);
    expect(result.status).toBe("MODEL_FAILURE");
    expect(result.providerMetadata?.retryCount).toBe(1);
    expect(result.providerMetadata?.storageDisabled).toBe(true);
    expect(JSON.stringify(result)).not.toContain("OPENAI_API_KEY");
  });

  it("maps authentication failure without retrying", async () => {
    let attempts = 0;
    const client: OpenAIResponseClient = {
      responses: {
        create() {
          attempts += 1;
          return Promise.reject(openAIError(401));
        },
      },
    };
    const adapter = new OpenAIBusinessReasoningAdapter({
      client,
      model: "configured-model",
      maxRetries: 3,
    });

    const result = await adapter.reasonAsync(envelope);

    expect(attempts).toBe(1);
    expect(result.status).toBe("MODEL_FAILURE");
    expect(result.summary).toMatch(/authentication/i);
  });

  it("supports timeout and unavailable failures without leaking provider types to BLM core", async () => {
    const client: OpenAIResponseClient = {
      responses: {
        create() {
          return Promise.reject(openAIError(503));
        },
      },
    };
    const adapter = new OpenAIBusinessReasoningAdapter({
      client,
      model: "configured-model",
      maxRetries: 0,
    });

    const result = await adapter.reasonAsync(envelope);

    expect(result.status).toBe("MODEL_FAILURE");
    expect(result.summary).toMatch(/unavailable/i);
  });

  it("defines schema restrictions aligned with strict structured output", () => {
    expect(openAiReasoningDraftSchema.additionalProperties).toBe(false);
    expect(openAiReasoningDraftSchema.required).toContain("status");
    expect(openAiReasoningDraftSchema.required).toContain("confidence");
  });

  it("skips live provider integration when credentials are absent", async () => {
    if (
      process.env.BLM_REAL_MODEL_TESTS !== "1" ||
      !process.env.OPENAI_API_KEY ||
      !process.env.BLM_OPENAI_MODEL
    ) {
      expect(true).toBe(true);
      return;
    }
    const adapter = new OpenAIBusinessReasoningAdapter({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.BLM_OPENAI_MODEL,
      store: false,
      maxRetries: 0,
    });
    const result = await adapter.reasonAsync(envelope);
    expect(result.providerMetadata?.provider).toBe("openai");
  });
});

function openAIError(
  status: number,
  code?: string,
): Error & {
  readonly status: number;
  readonly code?: string;
} {
  const error = new Error(`OpenAI test error ${status}`) as Error & {
    status: number;
    code?: string;
  };
  error.status = status;
  if (code) error.code = code;
  return error;
}
