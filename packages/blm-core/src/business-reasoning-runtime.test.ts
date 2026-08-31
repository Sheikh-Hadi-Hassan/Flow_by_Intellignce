import { describe, expect, it } from "vitest";

import {
  blmExpandedDomainIdsV1,
  toSemanticId,
  type BusinessKnowledgeProvenance,
  type BusinessProfile,
  type SemanticId,
} from "@flow/blm-contracts";
import type { ActorContext, WorkspaceContext } from "@flow/contracts";

import {
  BusinessContextCompiler,
  InMemoryBusinessPolicyProvider,
  InMemoryBusinessProfileProvider,
  InMemoryBusinessRecordProvider,
  type BusinessContextRequest,
  type BusinessRecordSnapshot,
  type CompiledBusinessContextBundle,
  type WorkspaceBusinessPolicy,
} from "./business-context-compiler.js";
import {
  BusinessReasoningRuntime,
  DeterministicFakeBusinessReasoningAdapter,
  DeterministicModelRouter,
  createModelReasoningEnvelope,
  representativeModelCapabilityProfilesV1,
  validateBusinessReasoningRequest,
  type BusinessReasoningRequest,
  type EvidenceReference,
  type ModelBusinessReasoningDraft,
} from "./business-reasoning-runtime.js";

const fixedNow = new Date("2026-08-11T10:00:00.000Z");

const provenance: BusinessKnowledgeProvenance = {
  sourceIds: [],
  use: "FLOW_NATIVE",
  notes: "BLM reasoning runtime proof fixture.",
};

const workspace: WorkspaceContext = {
  workspaceId: "workspace-alpha" as WorkspaceContext["workspaceId"],
  slug: "alpha",
};

function actor(permissionIds: readonly string[] = []): ActorContext {
  return {
    actorId: "user-alpha" as ActorContext["actorId"],
    userId: "user-alpha" as ActorContext["userId"],
    membershipId: "membership-alpha" as ActorContext["membershipId"],
    actorKind: "user",
    workspace,
    roleIds: ["business-operator"],
    permissionIds,
    requestSource: "UI",
    correlationId: "correlation-alpha" as ActorContext["correlationId"],
  };
}

const profile: BusinessProfile = {
  profileId: "profile-alpha",
  workspaceId: workspace.workspaceId,
  version: "1",
  businessType: "Marketing agency",
  businessModel: "Retainer and project services",
  productsAndServices: ["Campaign management"],
  customerTypes: ["B2B clients"],
  departments: ["Sales", "Finance", "Delivery"],
  teamStructure: ["Account managers", "Project leads"],
  locations: ["PK"],
  requiredCapabilityIds: [
    toSemanticId("flow.capability.crm.manage-customer-relationships"),
  ],
  salesModel: "Relationship-led B2B sales",
  billingModel: "Monthly retainer plus project billing",
  approvalRequirements: ["Discounts above 10 percent require owner approval"],
  importantProcesses: ["Invoice-to-cash"],
  complianceRequirements: ["Workspace authorization before record access"],
  integrations: ["Supabase"],
};

const policies: readonly WorkspaceBusinessPolicy[] = [
  {
    policyId: "policy-discount-alpha",
    workspaceId: workspace.workspaceId,
    semanticId: toSemanticId("flow.concept.pricing.pricing-rule"),
    name: "Discount approval threshold",
    value: "Discounts above 10 percent require human approval.",
    version: "1",
    requiredPermission: "pricing.policy.read",
    provenance,
  },
  {
    policyId: "policy-invoice-alpha",
    workspaceId: workspace.workspaceId,
    semanticId: toSemanticId("flow.concept.finance.invoice"),
    name: "Invoice collection policy",
    value: "Collections outreach requires invoice-read permission.",
    version: "2",
    requiredPermission: "finance.policy.read",
    provenance,
  },
];

const records: readonly BusinessRecordSnapshot[] = [
  {
    recordId: "invoice-alpha-001",
    workspaceId: workspace.workspaceId,
    semanticId: toSemanticId("flow.concept.finance.invoice"),
    label: "Invoice INV-001",
    version: "1",
    requiredPermission: "finance.invoice.read",
    fields: [
      { key: "status", value: "unpaid" },
      { key: "daysOverdue", value: 23 },
      { key: "amount", value: 125000 },
    ],
    provenance,
  },
  {
    recordId: "customer-alpha-001",
    workspaceId: workspace.workspaceId,
    semanticId: toSemanticId("flow.concept.crm.customer"),
    label: "Acme Customer",
    version: "3",
    requiredPermission: "crm.customer.read",
    fields: [
      { key: "name", value: "Acme" },
      { key: "lifetimeValue", value: 2500000 },
    ],
    provenance,
  },
  {
    recordId: "contract-alpha-001",
    workspaceId: workspace.workspaceId,
    semanticId: toSemanticId("flow.concept.commercial-document.contract"),
    label: "Acme Retainer Contract",
    version: "4",
    requiredPermission: "commercial.contract.read",
    fields: [{ key: "paymentTerms", value: "Net 30" }],
    provenance,
  },
  {
    recordId: "stock-alpha-001",
    workspaceId: workspace.workspaceId,
    semanticId: toSemanticId("flow.concept.inventory.stock-on-hand"),
    label: "Warehouse Stock",
    version: "1",
    requiredPermission: "inventory.stock.read",
    fields: [
      { key: "onHand", value: 100 },
      { key: "reserved", value: 95 },
      { key: "available", value: 5 },
    ],
    provenance,
  },
];

function compiler(): BusinessContextCompiler {
  return new BusinessContextCompiler({
    businessProfileProvider: new InMemoryBusinessProfileProvider([profile]),
    policyProvider: new InMemoryBusinessPolicyProvider(policies),
    recordProvider: new InMemoryBusinessRecordProvider(records),
  });
}

function contextRequest(input: {
  readonly requestedTask: string;
  readonly taskType: BusinessContextRequest["task"]["taskType"];
  readonly taskKey?: string;
  readonly referencedConceptIds?: readonly SemanticId[];
  readonly requestedDomainIds?: readonly SemanticId[];
  readonly permissionIds?: readonly string[];
  readonly channel?: BusinessContextRequest["channel"];
}): BusinessContextRequest {
  return {
    workspace,
    actor: actor(input.permissionIds),
    task: {
      taskType: input.taskType,
      ...(input.taskKey ? { taskKey: input.taskKey } : {}),
      requestedTask: input.requestedTask,
    },
    referencedConceptIds: input.referencedConceptIds ?? [],
    ...(input.requestedDomainIds
      ? { requestedDomainIds: input.requestedDomainIds }
      : {}),
    channel: input.channel ?? "TEXT",
    knowledgeReleaseId: "flow.blm.knowledge-release.test",
    workspaceContextVersion: "1",
  };
}

function compileContext(
  input: Parameters<typeof contextRequest>[0],
): CompiledBusinessContextBundle {
  return compiler().compile(contextRequest(input));
}

function reasoningRequest(
  compiledContext: CompiledBusinessContextBundle,
  expectedOutputType: BusinessReasoningRequest["expectedOutputType"] = "ANSWER",
): BusinessReasoningRequest {
  return {
    compiledContext,
    objective: compiledContext.task.requestedTask,
    expectedOutputType,
    riskProfile: "MEDIUM",
    taskType: compiledContext.task.taskType,
    responseMode: "STRUCTURED",
  };
}

function runtime(draft: ModelBusinessReasoningDraft): BusinessReasoningRuntime {
  return new BusinessReasoningRuntime({
    router: new DeterministicModelRouter(),
    modelProfiles: representativeModelCapabilityProfilesV1,
    modelAdapter: new DeterministicFakeBusinessReasoningAdapter(draft),
    now: () => fixedNow,
  });
}

function recordEvidence(recordId: string): EvidenceReference {
  return {
    kind: "WORKSPACE_RECORD",
    referenceId: recordId,
    semanticId: toSemanticId("flow.concept.finance.invoice"),
    description: recordId,
  };
}

describe("BLM Reasoning Runtime and Model Interface Foundation v1", () => {
  it("validates BusinessReasoningRequest and requires compiled context", () => {
    const context = compileContext({
      requestedTask: "Review unpaid invoice.",
      taskType: "ANALYSIS",
      referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
      permissionIds: ["finance.invoice.read"],
    });

    expect(() =>
      validateBusinessReasoningRequest(reasoningRequest(context)),
    ).not.toThrow();
    expect(() =>
      validateBusinessReasoningRequest({
        ...reasoningRequest(context),
        objective: " ",
      }),
    ).toThrow(/objective is required/);
    expect(() =>
      validateBusinessReasoningRequest({
        ...reasoningRequest(context),
        compiledContext: undefined as unknown as CompiledBusinessContextBundle,
      }),
    ).toThrow(/compiledContext/);
  });

  it("routes deterministically across execution classes", () => {
    const router = new DeterministicModelRouter();
    const profiles = representativeModelCapabilityProfilesV1;
    const base = {
      expectedOutputType: "ANSWER" as const,
      riskProfile: "MEDIUM" as const,
      candidateProfiles: profiles,
      context: {
        fingerprint: "fp",
        hasAuthorizedRecords: true,
        hasFormulas: true,
        hasDecisionPatterns: false,
        hasDiagnosticPatterns: false,
        availableSkillCount: 1,
      },
    };

    expect(
      router.selectTarget({
        ...base,
        task: { taskType: "CALCULATION", requestedTask: "Calculate margin." },
      }).executionClass,
    ).toBe("DETERMINISTIC_ENGINE");
    expect(
      router.selectTarget({
        ...base,
        task: { taskType: "READ_OPERATION", requestedTask: "Get status." },
      }).executionClass,
    ).toBe("NO_MODEL");
    expect(
      router.selectTarget({
        ...base,
        task: { taskType: "DIAGNOSTIC", requestedTask: "Diagnose sales." },
      }).executionClass,
    ).toBe("BUSINESS_SLM");
    expect(
      router.selectTarget({
        ...base,
        task: { taskType: "DRAFT", requestedTask: "Draft follow-up." },
      }).executionClass,
    ).toBe("BUSINESS_SLM");
  });

  it("creates a model-independent envelope without changing context", () => {
    const context = compileContext({
      requestedTask: "Analyze unpaid invoice.",
      taskType: "ANALYSIS",
      referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
      permissionIds: ["finance.invoice.read"],
    });
    const envelope = createModelReasoningEnvelope(reasoningRequest(context));

    expect(envelope.contextFingerprint).toBe(context.fingerprint);
    expect(envelope.boundedContext.authorizedRecords).toEqual(
      context.authorizedRecords,
    );
    expect(envelope.prohibitedActions).toEqual(
      expect.arrayContaining([
        "Do not retrieve additional workspace data.",
        "Do not execute skills.",
        "Do not mutate workspace state.",
      ]),
    );
  });

  it("uses a fake provider-independent adapter and validates unpaid invoice reasoning", () => {
    const context = compileContext({
      requestedTask: "Analyze unpaid invoice with payment terms.",
      taskType: "ANALYSIS",
      referencedConceptIds: [
        toSemanticId("flow.concept.finance.invoice"),
        toSemanticId("flow.concept.crm.customer"),
      ],
      permissionIds: [
        "finance.invoice.read",
        "crm.customer.read",
        "commercial.contract.read",
        "finance.policy.read",
      ],
    });
    const result = runtime({
      status: "NEEDS_INFORMATION",
      summary: "Invoice is overdue; payment history is not in context.",
      findings: [
        {
          findingId: "finding-overdue-invoice",
          statement: "Invoice is 23 days overdue.",
          businessMeaning: "AR aging risk.",
          evidenceReferences: [recordEvidence("invoice-alpha-001")],
          confidence: "HIGH",
        },
      ],
      missingInformation: [
        {
          field: "invoice payment history",
          reason: "Determine whether late payment is recurring.",
          requiredPermission: "finance.invoice.read",
        },
      ],
      proposedSkills: [
        {
          skillId: toSemanticId("flow.action.contracts.summarize"),
          reason: "Summarize payment terms before follow-up.",
          inputReferences: [recordEvidence("contract-alpha-001")],
          authority: "KNOWLEDGE_ONLY",
          requiredPermissions: [],
          approvalRequirement: "NONE",
        },
      ],
      evidenceReferences: [recordEvidence("invoice-alpha-001")],
      businessConceptReferences: [toSemanticId("flow.concept.finance.invoice")],
      recordReferences: ["invoice-alpha-001"],
      policyReferences: ["policy-invoice-alpha"],
      confidence: "MEDIUM",
    }).reason(reasoningRequest(context, "ANSWER"));

    expect(result.status).toBe("NEEDS_INFORMATION");
    expect(result.findings[0]?.evidenceReferences[0]?.referenceId).toBe(
      "invoice-alpha-001",
    );
    expect(result.contextExpansionRequests).toContainEqual(
      expect.objectContaining({
        need: "invoice payment history",
        requiredPermission: "finance.invoice.read",
      }),
    );
    expect(result.modelExecutionMetadata.adapterId).toBe(
      "deterministic-fake-business-reasoning-adapter",
    );
    expect(result.contextFingerprint).toBe(context.fingerprint);
    expect(result.knowledgeReleaseId).toBe("flow.blm.knowledge-release.test");
  });

  it("organizes diagnostic hypotheses without fabricated causal conclusions", () => {
    const context = compileContext({
      requestedTask:
        "Diagnostic: negative cash flow with profitability, receivables, payables, inventory, and cash timing.",
      taskType: "DIAGNOSTIC",
      taskKey: "negative-cash-flow",
      permissionIds: ["finance.invoice.read"],
    });
    const result = runtime({
      status: "NEEDS_INFORMATION",
      diagnosticHypotheses: [
        {
          hypothesisId: "hypothesis-collections",
          statement: "Receivable timing may be contributing to cash pressure.",
          investigationDimensions: ["receivables", "payables", "inventory"],
          supportingEvidence: [],
          contradictingEvidence: [],
          missingEvidence: [
            {
              field: "cash receipt dates",
              reason: "Confirm whether receivables are delayed.",
              requiredPermission: "finance.invoice.read",
            },
          ],
          uncertainty: "MEDIUM",
        },
      ],
      uncertainties: [
        {
          category: "INSUFFICIENT_EVIDENCE",
          detail: "No cash timing records are present in context.",
        },
      ],
      confidence: "LOW",
    }).reason(reasoningRequest(context, "DIAGNOSTIC"));

    expect(result.diagnosticHypotheses[0]?.statement).toMatch(/may be/);
    expect(result.uncertainties).toContainEqual(
      expect.objectContaining({ category: "INSUFFICIENT_EVIDENCE" }),
    );
  });

  it("returns deterministic calculation handoff for calculation tasks", () => {
    const context = compileContext({
      requestedTask: "Calculate gross margin.",
      taskType: "CALCULATION",
      referencedConceptIds: [
        toSemanticId("flow.concept.finance.gross-margin"),
        toSemanticId("flow.concept.finance.revenue"),
        toSemanticId("flow.concept.finance.cogs"),
      ],
    });
    const result = runtime({ status: "COMPLETED" }).reason(
      reasoningRequest(context, "CALCULATION_HANDOFF"),
    );

    expect(result.modelExecutionMetadata.executionClass).toBe(
      "DETERMINISTIC_ENGINE",
    );
    expect(result.status).toBe("NEEDS_CALCULATION");
    expect(result.requiredCalculations).toContainEqual(
      expect.objectContaining({
        formulaId: toSemanticId("flow.decision.formula.finance.gross-margin"),
        status: "REQUIRED",
      }),
    );
  });

  it("returns NEEDS_CALCULATION for discount decision when margin calculation is missing", () => {
    const context = compileContext({
      requestedTask: "Should we give this client 15% discount?",
      taskType: "DECISION_SUPPORT",
      taskKey: "discount-decision",
      permissionIds: ["pricing.policy.read", "crm.customer.read"],
    });
    const result = runtime({
      status: "NEEDS_CALCULATION",
      decisionFactors: [
        {
          factorId: "factor-margin",
          factor: "Margin must be known before discount approval.",
          evidenceReferences: [],
          tradeOff: "Revenue growth versus margin erosion.",
          confidence: "MEDIUM",
        },
      ],
      requiredCalculations: [
        {
          formulaId: toSemanticId("flow.decision.formula.finance.gross-margin"),
          requiredInputs: [
            toSemanticId("flow.concept.finance.revenue"),
            toSemanticId("flow.concept.finance.cogs"),
          ],
          reason: "Margin required for 15% discount decision.",
          status: "REQUIRED",
        },
      ],
      requiredApprovals: [
        {
          approvalId: "approval-discount",
          reason: "Discount exceeds policy threshold.",
          policyReferences: [
            {
              kind: "WORKSPACE_POLICY",
              referenceId: "policy-discount-alpha",
              semanticId: toSemanticId("flow.concept.pricing.pricing-rule"),
              description: "Discount approval threshold",
            },
          ],
        },
      ],
      confidence: "MEDIUM",
    }).reason(reasoningRequest(context, "DECISION_SUPPORT"));

    expect(result.status).toBe("NEEDS_CALCULATION");
    expect(result.decisionFactors).toHaveLength(1);
    expect(result.requiredApprovals[0]?.policyReferences[0]?.referenceId).toBe(
      "policy-discount-alpha",
    );
  });

  it("routes structured inventory lookup to NO_MODEL and distinguishes fulfillable stock", () => {
    const context = compileContext({
      requestedTask:
        "Read inventory availability for warehouse stock on hand, reserved stock, and available stock.",
      taskType: "READ_OPERATION",
      referencedConceptIds: [
        toSemanticId("flow.concept.inventory.stock-on-hand"),
      ],
      permissionIds: ["inventory.stock.read"],
    });
    const result = runtime({ status: "COMPLETED" }).reason(
      reasoningRequest(context, "STRUCTURED_LOOKUP"),
    );

    expect(result.modelExecutionMetadata.executionClass).toBe("NO_MODEL");
    expect(result.findings[0]?.businessMeaning).toMatch(/fulfillable stock/);
    expect(result.recordReferences).toEqual(["stock-alpha-001"]);
  });

  it("keeps psychology as possible interpretations rather than asserted facts", () => {
    const context = compileContext({
      requestedTask: "Customer says your price is too high.",
      taskType: "DECISION_SUPPORT",
      taskKey: "discount-decision",
      permissionIds: ["pricing.policy.read", "crm.customer.read"],
    });
    const result = runtime({
      status: "COMPLETED",
      findings: [
        {
          findingId: "finding-possible-interpretations",
          statement:
            "Possible interpretations include budget constraint, perceived value gap, comparison pressure, or risk uncertainty.",
          businessMeaning: "POSSIBLE_INTERPRETATION, not customer diagnosis.",
          evidenceReferences: [],
          confidence: "LOW",
        },
      ],
      uncertainties: [
        {
          category: "MODEL_UNCERTAINTY",
          detail: "Psychology insight is probabilistic and non-diagnostic.",
        },
      ],
      confidence: "LOW",
    }).reason(reasoningRequest(context, "DECISION_SUPPORT"));

    expect(result.findings[0]?.businessMeaning).toContain(
      "POSSIBLE_INTERPRETATION",
    );
    expect(result.findings[0]?.statement).not.toBe(
      "Customer is price sensitive.",
    );
  });

  it("rejects invalid model schema", () => {
    const context = compileContext({
      requestedTask: "Analyze unpaid invoice.",
      taskType: "ANALYSIS",
      referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
      permissionIds: ["finance.invoice.read"],
    });
    const invalidDraft = [] as unknown as ModelBusinessReasoningDraft;
    const result = runtime(invalidDraft).reason(reasoningRequest(context));

    expect(result.status).toBe("MODEL_FAILURE");
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "MODEL_OUTPUT_INVALID" }),
    );
  });

  it("contains hallucinated records and unknown semantic references", () => {
    const context = compileContext({
      requestedTask: "Analyze unpaid invoice.",
      taskType: "ANALYSIS",
      referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
      permissionIds: ["finance.invoice.read"],
    });
    const result = runtime({
      status: "COMPLETED",
      evidenceReferences: [recordEvidence("invoice-999")],
      recordReferences: ["invoice-999"],
      businessConceptReferences: [toSemanticId("flow.concept.finance.unknown")],
      confidence: "LOW",
    }).reason(reasoningRequest(context));

    expect(result.recordReferences).toHaveLength(0);
    expect(result.evidenceReferences).toHaveLength(0);
    expect(result.businessConceptReferences).toHaveLength(0);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_REFERENCE_REJECTED" }),
        expect.objectContaining({ code: "UNVERIFIED_MODEL_ASSERTION" }),
      ]),
    );
  });

  it("rejects unknown, absent, unauthorized, and escalating skill proposals", () => {
    const context = compileContext({
      requestedTask: "Draft a quote for the customer.",
      taskType: "DRAFT",
      referencedConceptIds: [toSemanticId("flow.concept.crm.quote")],
      permissionIds: [],
    });
    const contextWithUnauthorizedSkill: CompiledBusinessContextBundle = {
      ...context,
      availableBusinessSkills: [
        ...context.availableBusinessSkills,
        {
          semanticId: toSemanticId("flow.action.hr.run-payroll"),
          executionAuthority: "APPROVAL_REQUIRED",
          requiredPermissions: ["hr.payroll.run"],
          requiredLogicIds: [],
          requiredERPCapabilities: [],
          approvalPolicy: "ALWAYS_REQUIRED",
          bindingAvailability: "UNBOUND",
          inclusionReason: "TASK_DOMAIN",
        },
        {
          semanticId: toSemanticId("flow.action.sales.context-only-advice"),
          executionAuthority: "KNOWLEDGE_ONLY",
          requiredPermissions: [],
          requiredLogicIds: [],
          requiredERPCapabilities: [],
          approvalPolicy: "NONE",
          bindingAvailability: "UNBOUND",
          inclusionReason: "TASK_DOMAIN",
        },
      ],
    };
    const result = runtime({
      status: "COMPLETED",
      proposedSkills: [
        {
          skillId: toSemanticId("flow.action.unknown.do-thing"),
          reason: "Unknown skill should be rejected.",
          inputReferences: [],
          authority: "EXECUTABLE",
          requiredPermissions: [],
          approvalRequirement: "NONE",
        },
        {
          skillId: toSemanticId("flow.action.hr.run-payroll"),
          reason: "Payroll mutation is not authorized.",
          inputReferences: [],
          authority: "APPROVAL_REQUIRED",
          requiredPermissions: ["hr.payroll.run"],
          approvalRequirement: "ALWAYS_REQUIRED",
        },
        {
          skillId: toSemanticId("flow.action.sales.context-only-advice"),
          reason: "Escalate context-only advice.",
          inputReferences: [],
          authority: "EXECUTABLE",
          requiredPermissions: [],
          approvalRequirement: "NONE",
        },
      ],
    }).reason(reasoningRequest(contextWithUnauthorizedSkill, "DRAFT"));

    expect(result.proposedSkills).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "REJECTED" })]),
    );
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "SKILL_PROPOSAL_REJECTED" }),
        expect.objectContaining({ code: "AUTHORITY_ESCALATION_REJECTED" }),
      ]),
    );
  });

  it("surfaces low domain maturity warnings", () => {
    const context = compileContext({
      requestedTask: "Analyze manufacturing material requirement coverage.",
      taskType: "ANALYSIS",
      requestedDomainIds: [blmExpandedDomainIdsV1.manufacturingMrp],
    });
    const result = runtime({
      status: "COMPLETED",
      summary: "Manufacturing analysis is foundational only.",
    }).reason(reasoningRequest(context));

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "LOW_DOMAIN_MATURITY",
      }),
    );
  });

  it("is deterministic and modality-independent for equivalent compiled contexts", () => {
    const textContext = compileContext({
      requestedTask: "Analyze unpaid invoice.",
      taskType: "ANALYSIS",
      referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
      permissionIds: ["finance.invoice.read"],
      channel: "TEXT",
    });
    const voiceContext: CompiledBusinessContextBundle = {
      ...textContext,
      workspace: textContext.workspace,
    };
    const draft: ModelBusinessReasoningDraft = {
      status: "COMPLETED",
      summary: "Same structured reasoning.",
      confidence: "MEDIUM",
    };

    const first = runtime(draft).reason(reasoningRequest(textContext));
    const second = runtime(draft).reason(reasoningRequest(voiceContext));

    expect(second.summary).toBe(first.summary);
    expect(second.findings).toEqual(first.findings);
    expect(second.modelExecutionMetadata.executionClass).toBe(
      first.modelExecutionMetadata.executionClass,
    );
  });

  it("does not include provider, retrieval, tool-calling, mutation, or Action Wall code", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./business-reasoning-runtime.ts", import.meta.url),
        "utf8",
      ),
    );

    expect(source).not.toMatch(/openai|anthropic|gemini|qwen|llama/i);
    expect(source).not.toMatch(/\b(embedding|vector|rag|fine.?tuning)\b/i);
    expect(source).not.toMatch(
      /fetch\(|createClient|executeAction|actionWall/i,
    );
    expect(source).not.toMatch(/speech|text-to-speech|tts/i);
  });
});
