import {
  calculateDomainExpertiseScoresV1,
  validateSemanticId,
  type BusinessKnowledgeProvenance,
  type ModelCapabilityProfile,
  type SemanticId,
} from "@flow/blm-contracts";

import type {
  BusinessTaskEnvelope,
  CompiledBusinessContextBundle,
  CompiledBusinessSkill,
  RedactedBusinessRecord,
  WorkspaceBusinessPolicy,
} from "./business-context-compiler.js";
import { stableFingerprint } from "./knowledge-acquisition.js";

export type ModelExecutionClass =
  | "GENERAL_LLM"
  | "BUSINESS_SLM"
  | "SPECIALIZED_MODEL"
  | "DETERMINISTIC_ENGINE"
  | "NO_MODEL";

export type ReasoningExpectedOutputType =
  | "ANSWER"
  | "SUMMARY"
  | "DIAGNOSTIC"
  | "DECISION_SUPPORT"
  | "DRAFT"
  | "CALCULATION_HANDOFF"
  | "STRUCTURED_LOOKUP";

export type BusinessReasoningRiskProfile =
  "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BusinessReasoningResponseMode =
  "STRUCTURED" | "CONCISE" | "DETAILED";

export type BusinessReasoningStatus =
  | "COMPLETED"
  | "NEEDS_INFORMATION"
  | "NEEDS_CALCULATION"
  | "NEEDS_APPROVAL"
  | "UNSUPPORTED"
  | "BLOCKED_BY_POLICY"
  | "INSUFFICIENT_AUTHORITY"
  | "INVALID_CONTEXT"
  | "MODEL_FAILURE";

export type BusinessConfidence = "LOW" | "MEDIUM" | "HIGH";

export type BusinessUncertaintyCategory =
  | "MISSING_DATA"
  | "CONFLICTING_DATA"
  | "AMBIGUOUS_BUSINESS_RULE"
  | "INSUFFICIENT_EVIDENCE"
  | "MODEL_UNCERTAINTY"
  | "OUTSIDE_DOMAIN_COVERAGE";

export type EvidenceReferenceKind =
  | "WORKSPACE_RECORD"
  | "WORKSPACE_POLICY"
  | "BUSINESS_PROFILE"
  | "BLM_KNOWLEDGE"
  | "BUSINESS_RULE"
  | "METRIC"
  | "FORMULA"
  | "DIAGNOSTIC_PATTERN"
  | "USER_INPUT";

export interface BusinessReasoningRequest {
  readonly compiledContext: CompiledBusinessContextBundle;
  readonly objective: string;
  readonly expectedOutputType: ReasoningExpectedOutputType;
  readonly modelRequirements?: Partial<ModelCapabilityProfile>;
  readonly riskProfile: BusinessReasoningRiskProfile;
  readonly taskType?: BusinessTaskEnvelope["taskType"];
  readonly responseMode: BusinessReasoningResponseMode;
  readonly constraints?: readonly string[];
}

export interface ModelRoutingRequest {
  readonly task: BusinessTaskEnvelope;
  readonly expectedOutputType: ReasoningExpectedOutputType;
  readonly riskProfile: BusinessReasoningRiskProfile;
  readonly context: {
    readonly fingerprint: string;
    readonly hasAuthorizedRecords: boolean;
    readonly hasFormulas: boolean;
    readonly hasDecisionPatterns: boolean;
    readonly hasDiagnosticPatterns: boolean;
    readonly availableSkillCount: number;
  };
  readonly modelRequirements?: Partial<ModelCapabilityProfile>;
  readonly candidateProfiles: readonly ModelCapabilityProfile[];
}

export interface ModelRoutingDecision {
  readonly executionClass: ModelExecutionClass;
  readonly profile?: ModelCapabilityProfile;
  readonly reason: string;
}

export interface ModelRouter {
  selectTarget(request: ModelRoutingRequest): ModelRoutingDecision;
}

export interface EvidenceReference {
  readonly kind: EvidenceReferenceKind;
  readonly referenceId: string;
  readonly semanticId?: SemanticId;
  readonly description: string;
}

export interface BusinessFinding {
  readonly findingId: string;
  readonly statement: string;
  readonly businessMeaning: string;
  readonly evidenceReferences: readonly EvidenceReference[];
  readonly confidence: BusinessConfidence;
}

export interface DiagnosticHypothesis {
  readonly hypothesisId: string;
  readonly statement: string;
  readonly investigationDimensions: readonly string[];
  readonly supportingEvidence: readonly EvidenceReference[];
  readonly contradictingEvidence: readonly EvidenceReference[];
  readonly missingEvidence: readonly MissingInformation[];
  readonly uncertainty: BusinessConfidence;
}

export interface DecisionFactor {
  readonly factorId: string;
  readonly factor: string;
  readonly evidenceReferences: readonly EvidenceReference[];
  readonly tradeOff?: string;
  readonly confidence: BusinessConfidence;
}

export interface BusinessRecommendation {
  readonly recommendationId: string;
  readonly statement: string;
  readonly authority: "DRAFT_ONLY" | "ADVISORY_ONLY" | "REQUIRES_APPROVAL";
  readonly evidenceReferences: readonly EvidenceReference[];
}

export interface RequiredCalculation {
  readonly formulaId: SemanticId;
  readonly requiredInputs: readonly SemanticId[];
  readonly reason: string;
  readonly status: "REQUIRED" | "BLOCKED_MISSING_INPUT";
}

export interface RequiredApproval {
  readonly approvalId: string;
  readonly reason: string;
  readonly policyReferences: readonly EvidenceReference[];
}

export interface MissingInformation {
  readonly field: string;
  readonly reason: string;
  readonly requiredPermission?: string;
}

export interface BusinessUncertainty {
  readonly category: BusinessUncertaintyCategory;
  readonly detail: string;
}

export interface ContextExpansionRequest {
  readonly need: string;
  readonly reason: string;
  readonly semanticIds: readonly SemanticId[];
  readonly requiredPermission?: string;
}

export interface ProposedBusinessSkillInvocation {
  readonly skillId: SemanticId;
  readonly reason: string;
  readonly inputReferences: readonly EvidenceReference[];
  readonly authority: string;
  readonly requiredPermissions: readonly string[];
  readonly approvalRequirement: string;
  readonly status: "ACCEPTED" | "REJECTED";
  readonly rejectionReason?: string;
}

export interface ReasoningWarning {
  readonly code:
    | "LOW_DOMAIN_MATURITY"
    | "UNVERIFIED_MODEL_ASSERTION"
    | "INVALID_REFERENCE_REJECTED"
    | "SKILL_PROPOSAL_REJECTED"
    | "AUTHORITY_ESCALATION_REJECTED"
    | "MODEL_OUTPUT_INVALID";
  readonly message: string;
}

export interface ReasoningAuditMetadata {
  readonly reasoningId: string;
  readonly contextFingerprint: string;
  readonly knowledgeReleaseId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly taskType: BusinessTaskEnvelope["taskType"];
  readonly modelTarget: ModelExecutionClass;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly status: BusinessReasoningStatus;
}

export interface ModelExecutionMetadata {
  readonly executionClass: ModelExecutionClass;
  readonly profile?: ModelCapabilityProfile;
  readonly adapterId?: string;
  readonly deterministic: boolean;
  readonly routingReason: string;
  readonly providerMetadata?: Readonly<Record<string, unknown>>;
}

export interface BusinessReasoningResult {
  readonly reasoningId: string;
  readonly contextFingerprint: string;
  readonly knowledgeReleaseId: string;
  readonly task: BusinessTaskEnvelope;
  readonly status: BusinessReasoningStatus;
  readonly answer?: string;
  readonly summary?: string;
  readonly findings: readonly BusinessFinding[];
  readonly diagnosticHypotheses: readonly DiagnosticHypothesis[];
  readonly decisionFactors: readonly DecisionFactor[];
  readonly recommendations: readonly BusinessRecommendation[];
  readonly proposedSkills: readonly ProposedBusinessSkillInvocation[];
  readonly requiredCalculations: readonly RequiredCalculation[];
  readonly requiredApprovals: readonly RequiredApproval[];
  readonly missingInformation: readonly MissingInformation[];
  readonly uncertainties: readonly BusinessUncertainty[];
  readonly evidenceReferences: readonly EvidenceReference[];
  readonly businessConceptReferences: readonly SemanticId[];
  readonly recordReferences: readonly string[];
  readonly policyReferences: readonly string[];
  readonly warnings: readonly ReasoningWarning[];
  readonly confidence: BusinessConfidence;
  readonly modelExecutionMetadata: ModelExecutionMetadata;
  readonly authorityBoundary: readonly string[];
  readonly provenance: readonly BusinessKnowledgeProvenance[];
  readonly audit: ReasoningAuditMetadata;
  readonly contextExpansionRequests: readonly ContextExpansionRequest[];
}

export interface ModelReasoningEnvelope {
  readonly objective: string;
  readonly taskInstruction: BusinessTaskEnvelope;
  readonly boundedContext: CompiledBusinessContextBundle;
  readonly authorityRules: readonly string[];
  readonly outputSchema: string;
  readonly evidenceRequirements: readonly string[];
  readonly prohibitedActions: readonly string[];
  readonly contextFingerprint: string;
}

export interface ModelBusinessReasoningDraft {
  readonly status?: BusinessReasoningStatus;
  readonly answer?: string;
  readonly summary?: string;
  readonly findings?: readonly BusinessFinding[];
  readonly diagnosticHypotheses?: readonly DiagnosticHypothesis[];
  readonly decisionFactors?: readonly DecisionFactor[];
  readonly recommendations?: readonly BusinessRecommendation[];
  readonly proposedSkills?: readonly Omit<
    ProposedBusinessSkillInvocation,
    "status" | "rejectionReason"
  >[];
  readonly requiredCalculations?: readonly RequiredCalculation[];
  readonly requiredApprovals?: readonly RequiredApproval[];
  readonly missingInformation?: readonly MissingInformation[];
  readonly uncertainties?: readonly BusinessUncertainty[];
  readonly evidenceReferences?: readonly EvidenceReference[];
  readonly businessConceptReferences?: readonly SemanticId[];
  readonly recordReferences?: readonly string[];
  readonly policyReferences?: readonly string[];
  readonly confidence?: BusinessConfidence;
}

export interface BusinessReasoningModelAdapter {
  readonly adapterId: string;
  reason?(
    envelope: ModelReasoningEnvelope,
  ): ModelBusinessReasoningDraft | Promise<ModelBusinessReasoningDraft>;
  reasonAsync?(
    envelope: ModelReasoningEnvelope,
  ): Promise<ModelBusinessReasoningDraft>;
}

export const representativeModelCapabilityProfilesV1: readonly ModelCapabilityProfile[] =
  [
    {
      modelFamily: "CLOUD_LLM",
      supportsToolUse: false,
      supportsStructuredOutput: true,
      maxContextTokens: 64_000,
    },
    {
      modelFamily: "LOCAL_SLM",
      supportsToolUse: false,
      supportsStructuredOutput: true,
      maxContextTokens: 16_000,
    },
    {
      modelFamily: "SPECIALIZED_MODEL",
      supportsToolUse: false,
      supportsStructuredOutput: true,
      maxContextTokens: 32_000,
    },
    {
      modelFamily: "NO_MODEL",
      supportsToolUse: false,
      supportsStructuredOutput: true,
    },
  ];

export class DeterministicModelRouter implements ModelRouter {
  selectTarget(request: ModelRoutingRequest): ModelRoutingDecision {
    if (
      request.task.taskType === "CALCULATION" &&
      request.context.hasFormulas
    ) {
      return {
        executionClass: "DETERMINISTIC_ENGINE",
        reason: "Calculation task has deterministic formula context.",
      };
    }
    if (
      request.task.taskType === "READ_OPERATION" &&
      request.context.hasAuthorizedRecords
    ) {
      const noModelProfile = request.candidateProfiles.find(
        (profile) => profile.modelFamily === "NO_MODEL",
      );
      return {
        executionClass: "NO_MODEL",
        ...(noModelProfile ? { profile: noModelProfile } : {}),
        reason: "Structured record lookup can be answered without a model.",
      };
    }
    if (
      request.task.taskType === "DIAGNOSTIC" ||
      request.expectedOutputType === "DIAGNOSTIC"
    ) {
      return selectReasoningProfile(request, "Diagnostic reasoning required.");
    }
    if (
      request.task.taskType === "DRAFT" ||
      request.expectedOutputType === "DRAFT"
    ) {
      return selectReasoningProfile(
        request,
        "Draft generation requires LLM_DRAFT authority.",
      );
    }
    if (request.task.taskType === "DECISION_SUPPORT") {
      return selectReasoningProfile(
        request,
        "Decision support reasoning required.",
      );
    }
    if (request.riskProfile === "CRITICAL") {
      return selectReasoningProfile(
        request,
        "Critical risk may analyze but cannot grant execution authority.",
      );
    }
    return selectReasoningProfile(
      request,
      "General business reasoning required.",
    );
  }
}

export class DeterministicFakeBusinessReasoningAdapter implements BusinessReasoningModelAdapter {
  readonly adapterId = "deterministic-fake-business-reasoning-adapter";

  constructor(private readonly draft: ModelBusinessReasoningDraft) {}

  reason(envelope: ModelReasoningEnvelope): ModelBusinessReasoningDraft {
    void envelope;
    return this.draft;
  }

  reasonAsync(
    envelope: ModelReasoningEnvelope,
  ): Promise<ModelBusinessReasoningDraft> {
    return Promise.resolve(this.reason(envelope));
  }
}

export class BusinessReasoningRuntime {
  constructor(
    private readonly dependencies: {
      readonly router: ModelRouter;
      readonly modelProfiles?: readonly ModelCapabilityProfile[];
      readonly modelAdapter?: BusinessReasoningModelAdapter;
      readonly now?: () => Date;
    },
  ) {}

  reason(request: BusinessReasoningRequest): BusinessReasoningResult {
    validateBusinessReasoningRequest(request);
    const startedAt = this.nowIso();
    const routingRequest: ModelRoutingRequest = {
      task: request.compiledContext.task,
      expectedOutputType: request.expectedOutputType,
      riskProfile: request.riskProfile,
      context: {
        fingerprint: request.compiledContext.fingerprint,
        hasAuthorizedRecords:
          request.compiledContext.authorizedRecords.length > 0,
        hasFormulas: request.compiledContext.relevantFormulaIds.length > 0,
        hasDecisionPatterns:
          request.compiledContext.relevantDecisionPatterns.length > 0,
        hasDiagnosticPatterns:
          request.compiledContext.relevantDiagnosticPatterns.length > 0,
        availableSkillCount:
          request.compiledContext.availableBusinessSkills.length,
      },
      candidateProfiles:
        this.dependencies.modelProfiles ??
        representativeModelCapabilityProfilesV1,
      ...(request.modelRequirements
        ? { modelRequirements: request.modelRequirements }
        : {}),
    };
    const routingDecision =
      this.dependencies.router.selectTarget(routingRequest);
    const envelope = createModelReasoningEnvelope(request);
    const base = createEmptyReasoningResult(
      request,
      routingDecision,
      startedAt,
      this.nowIso(),
    );

    if (routingDecision.executionClass === "NO_MODEL") {
      return finalizeReasoningResult(
        mergeReasoningDraft(
          base,
          createNoModelStructuredLookupDraft(request.compiledContext),
        ),
        request.compiledContext,
      );
    }

    if (routingDecision.executionClass === "DETERMINISTIC_ENGINE") {
      return finalizeReasoningResult(
        mergeReasoningDraft(
          base,
          createCalculationHandoffDraft(request.compiledContext),
        ),
        request.compiledContext,
      );
    }

    if (!this.dependencies.modelAdapter?.reason) {
      return {
        ...base,
        status: "MODEL_FAILURE",
        warnings: [
          ...base.warnings,
          {
            code: "MODEL_OUTPUT_INVALID",
            message: "No reasoning model adapter was supplied.",
          },
        ],
        audit: { ...base.audit, status: "MODEL_FAILURE" },
      };
    }

    try {
      const draft = this.dependencies.modelAdapter.reason(envelope);
      if (isPromiseLike(draft)) {
        return {
          ...base,
          status: "MODEL_FAILURE",
          warnings: [
            ...base.warnings,
            {
              code: "MODEL_OUTPUT_INVALID",
              message:
                "Reasoning model adapter returned an async draft on the sync runtime path.",
            },
          ],
          audit: { ...base.audit, status: "MODEL_FAILURE" },
        };
      }
      return finalizeReasoningResult(
        mergeReasoningDraft(
          base,
          draft,
          this.dependencies.modelAdapter.adapterId,
        ),
        request.compiledContext,
      );
    } catch {
      return {
        ...base,
        status: "MODEL_FAILURE",
        warnings: [
          ...base.warnings,
          {
            code: "MODEL_OUTPUT_INVALID",
            message: "Reasoning model adapter failed.",
          },
        ],
        audit: { ...base.audit, status: "MODEL_FAILURE" },
      };
    }
  }

  async reasonAsync(
    request: BusinessReasoningRequest,
  ): Promise<BusinessReasoningResult> {
    validateBusinessReasoningRequest(request);
    const startedAt = this.nowIso();
    const routingRequest: ModelRoutingRequest = {
      task: request.compiledContext.task,
      expectedOutputType: request.expectedOutputType,
      riskProfile: request.riskProfile,
      context: {
        fingerprint: request.compiledContext.fingerprint,
        hasAuthorizedRecords:
          request.compiledContext.authorizedRecords.length > 0,
        hasFormulas: request.compiledContext.relevantFormulaIds.length > 0,
        hasDecisionPatterns:
          request.compiledContext.relevantDecisionPatterns.length > 0,
        hasDiagnosticPatterns:
          request.compiledContext.relevantDiagnosticPatterns.length > 0,
        availableSkillCount:
          request.compiledContext.availableBusinessSkills.length,
      },
      candidateProfiles:
        this.dependencies.modelProfiles ??
        representativeModelCapabilityProfilesV1,
      ...(request.modelRequirements
        ? { modelRequirements: request.modelRequirements }
        : {}),
    };
    const routingDecision =
      this.dependencies.router.selectTarget(routingRequest);
    const envelope = createModelReasoningEnvelope(request);
    const base = createEmptyReasoningResult(
      request,
      routingDecision,
      startedAt,
      this.nowIso(),
    );

    if (routingDecision.executionClass === "NO_MODEL") {
      return finalizeReasoningResult(
        mergeReasoningDraft(
          base,
          createNoModelStructuredLookupDraft(request.compiledContext),
        ),
        request.compiledContext,
      );
    }

    if (routingDecision.executionClass === "DETERMINISTIC_ENGINE") {
      return finalizeReasoningResult(
        mergeReasoningDraft(
          base,
          createCalculationHandoffDraft(request.compiledContext),
        ),
        request.compiledContext,
      );
    }

    if (
      !this.dependencies.modelAdapter?.reason &&
      !this.dependencies.modelAdapter?.reasonAsync
    ) {
      return {
        ...base,
        status: "MODEL_FAILURE",
        warnings: [
          ...base.warnings,
          {
            code: "MODEL_OUTPUT_INVALID",
            message: "No reasoning model adapter was supplied.",
          },
        ],
        audit: { ...base.audit, status: "MODEL_FAILURE" },
      };
    }

    try {
      const draft = this.dependencies.modelAdapter.reasonAsync
        ? await this.dependencies.modelAdapter.reasonAsync(envelope)
        : await this.dependencies.modelAdapter.reason?.(envelope);
      if (!draft) {
        return {
          ...base,
          status: "MODEL_FAILURE",
          warnings: [
            ...base.warnings,
            {
              code: "MODEL_OUTPUT_INVALID",
              message: "Reasoning model adapter returned no draft.",
            },
          ],
          audit: { ...base.audit, status: "MODEL_FAILURE" },
        };
      }
      return finalizeReasoningResult(
        mergeReasoningDraft(
          base,
          draft,
          this.dependencies.modelAdapter.adapterId,
        ),
        request.compiledContext,
      );
    } catch {
      return {
        ...base,
        status: "MODEL_FAILURE",
        warnings: [
          ...base.warnings,
          {
            code: "MODEL_OUTPUT_INVALID",
            message: "Reasoning model adapter failed.",
          },
        ],
        audit: { ...base.audit, status: "MODEL_FAILURE" },
      };
    }
  }

  private nowIso(): string {
    return (this.dependencies.now ?? (() => new Date()))().toISOString();
  }
}

export function validateBusinessReasoningRequest(
  request: BusinessReasoningRequest,
): void {
  if (!request.compiledContext) {
    throw new Error("BusinessReasoningRequest requires compiledContext.");
  }
  if (request.objective.trim().length === 0) {
    throw new Error("BusinessReasoningRequest objective is required.");
  }
  if (request.compiledContext.fingerprint.trim().length === 0) {
    throw new Error("CompiledBusinessContextBundle fingerprint is required.");
  }
  if (request.compiledContext.bundleId.trim().length === 0) {
    throw new Error("CompiledBusinessContextBundle bundleId is required.");
  }
  if (
    request.taskType &&
    request.taskType !== request.compiledContext.task.taskType
  ) {
    throw new Error(
      "BusinessReasoningRequest taskType must match compiled context task.",
    );
  }
}

export function createModelReasoningEnvelope(
  request: BusinessReasoningRequest,
): ModelReasoningEnvelope {
  return {
    objective: request.objective,
    taskInstruction: request.compiledContext.task,
    boundedContext: request.compiledContext,
    authorityRules: request.compiledContext.authorityConstraints,
    outputSchema: "BusinessReasoningResult structured rationale draft",
    evidenceRequirements: [
      "Important findings must cite context evidence where available.",
      "Unknown records, policies, concepts, and skills are not authoritative.",
      "Missing information must be represented instead of guessed.",
    ],
    prohibitedActions: [
      "Do not retrieve additional workspace data.",
      "Do not reveal redacted values.",
      "Do not execute skills.",
      "Do not mutate workspace state.",
      "Do not grant approval or execution authority.",
    ],
    contextFingerprint: request.compiledContext.fingerprint,
  };
}

function selectReasoningProfile(
  request: ModelRoutingRequest,
  reason: string,
): ModelRoutingDecision {
  const local = request.candidateProfiles.find(
    (profile) =>
      profile.modelFamily === "LOCAL_SLM" && profile.supportsStructuredOutput,
  );
  if (local) {
    return {
      executionClass: "BUSINESS_SLM",
      profile: local,
      reason,
    };
  }
  const cloud = request.candidateProfiles.find(
    (profile) =>
      profile.modelFamily === "CLOUD_LLM" && profile.supportsStructuredOutput,
  );
  if (cloud) {
    return {
      executionClass: "GENERAL_LLM",
      profile: cloud,
      reason,
    };
  }
  const specialized = request.candidateProfiles.find(
    (profile) =>
      profile.modelFamily === "SPECIALIZED_MODEL" &&
      profile.supportsStructuredOutput,
  );
  if (specialized) {
    return {
      executionClass: "SPECIALIZED_MODEL",
      profile: specialized,
      reason,
    };
  }
  return {
    executionClass: "NO_MODEL",
    reason: "No structured reasoning profile available.",
  };
}

function createEmptyReasoningResult(
  request: BusinessReasoningRequest,
  routingDecision: ModelRoutingDecision,
  startedAt: string,
  completedAt: string,
): BusinessReasoningResult {
  const reasoningId = `reasoning:${stableFingerprint({
    contextFingerprint: request.compiledContext.fingerprint,
    objective: request.objective,
    expectedOutputType: request.expectedOutputType,
    riskProfile: request.riskProfile,
    routing: routingDecision.executionClass,
  })}`;
  const warnings = domainMaturityWarnings(request.compiledContext);
  const audit = {
    reasoningId,
    contextFingerprint: request.compiledContext.fingerprint,
    knowledgeReleaseId: request.compiledContext.knowledgeReleaseId,
    workspaceId: request.compiledContext.workspace.workspaceId,
    actorId: request.compiledContext.actor.actorId,
    taskType: request.compiledContext.task.taskType,
    modelTarget: routingDecision.executionClass,
    startedAt,
    completedAt,
    status: "UNSUPPORTED" as const,
  };
  return {
    reasoningId,
    contextFingerprint: request.compiledContext.fingerprint,
    knowledgeReleaseId: request.compiledContext.knowledgeReleaseId,
    task: request.compiledContext.task,
    status: "UNSUPPORTED",
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
    warnings,
    confidence: "LOW",
    modelExecutionMetadata: {
      executionClass: routingDecision.executionClass,
      ...(routingDecision.profile ? { profile: routingDecision.profile } : {}),
      deterministic:
        routingDecision.executionClass === "NO_MODEL" ||
        routingDecision.executionClass === "DETERMINISTIC_ENGINE",
      routingReason: routingDecision.reason,
    },
    authorityBoundary: request.compiledContext.authorityConstraints,
    provenance: request.compiledContext.provenance,
    audit,
    contextExpansionRequests: [],
  };
}

function createNoModelStructuredLookupDraft(
  context: CompiledBusinessContextBundle,
): ModelBusinessReasoningDraft {
  const evidenceReferences = context.authorizedRecords.map(recordEvidence);
  const findings = context.authorizedRecords.map((record) => ({
    findingId: `finding:${record.recordId}`,
    statement: `${record.label} is present in authorized context.`,
    businessMeaning: record.semanticId.includes(".inventory.")
      ? "Physical stock and fulfillable stock must be distinguished."
      : "Structured workspace fact is available without model reasoning.",
    evidenceReferences: [recordEvidence(record)],
    confidence: "HIGH" as const,
  }));
  return {
    status: "COMPLETED",
    summary: "Structured lookup completed from authorized context.",
    findings,
    evidenceReferences,
    businessConceptReferences: context.relevantConceptIds,
    recordReferences: context.authorizedRecords.map(
      (record) => record.recordId,
    ),
    confidence: "HIGH",
  };
}

function createCalculationHandoffDraft(
  context: CompiledBusinessContextBundle,
): ModelBusinessReasoningDraft {
  const requiredCalculations = context.relevantFormulaIds.map((formulaId) => ({
    formulaId,
    requiredInputs: context.relevantConceptIds,
    reason:
      "Authoritative calculation requires deterministic engine execution.",
    status: "REQUIRED" as const,
  }));
  return {
    status: "NEEDS_CALCULATION",
    summary: "Authoritative calculation handoff required.",
    requiredCalculations,
    uncertainties: [
      {
        category: "MISSING_DATA",
        detail: "Deterministic engine inputs must be supplied and validated.",
      },
    ],
    confidence: "MEDIUM",
  };
}

function mergeReasoningDraft(
  base: BusinessReasoningResult,
  draft: ModelBusinessReasoningDraft,
  adapterId?: string,
): BusinessReasoningResult {
  if (!isValidModelDraft(draft)) {
    return {
      ...base,
      status: "MODEL_FAILURE",
      warnings: [
        ...base.warnings,
        {
          code: "MODEL_OUTPUT_INVALID",
          message: "Model response did not match the reasoning draft contract.",
        },
      ],
      audit: { ...base.audit, status: "MODEL_FAILURE" },
    };
  }
  const status = draft.status ?? base.status;
  return {
    ...base,
    status,
    ...(draft.answer ? { answer: draft.answer } : {}),
    ...(draft.summary ? { summary: draft.summary } : {}),
    findings: draft.findings ?? [],
    diagnosticHypotheses: draft.diagnosticHypotheses ?? [],
    decisionFactors: draft.decisionFactors ?? [],
    recommendations: draft.recommendations ?? [],
    proposedSkills:
      draft.proposedSkills?.map((skill) => ({
        ...skill,
        status: "ACCEPTED" as const,
      })) ?? [],
    requiredCalculations: draft.requiredCalculations ?? [],
    requiredApprovals: draft.requiredApprovals ?? [],
    missingInformation: draft.missingInformation ?? [],
    uncertainties: draft.uncertainties ?? [],
    evidenceReferences: draft.evidenceReferences ?? [],
    businessConceptReferences: draft.businessConceptReferences ?? [],
    recordReferences: draft.recordReferences ?? [],
    policyReferences: draft.policyReferences ?? [],
    confidence: draft.confidence ?? base.confidence,
    modelExecutionMetadata: {
      ...base.modelExecutionMetadata,
      ...(adapterId ? { adapterId } : {}),
      ...providerMetadataForDraft(draft),
    },
    audit: { ...base.audit, status },
  };
}

function finalizeReasoningResult(
  result: BusinessReasoningResult,
  context: CompiledBusinessContextBundle,
): BusinessReasoningResult {
  const validation = validateModelStructuredOutput(result, context);
  const status =
    result.status === "COMPLETED" &&
    (result.missingInformation.length > 0 ||
      result.contextExpansionRequests.length > 0)
      ? "NEEDS_INFORMATION"
      : result.status;
  return {
    ...result,
    status,
    proposedSkills: validation.proposedSkills,
    evidenceReferences: validation.evidenceReferences,
    findings: validation.findings,
    diagnosticHypotheses: validation.diagnosticHypotheses,
    decisionFactors: validation.decisionFactors,
    recommendations: validation.recommendations,
    requiredApprovals: validation.requiredApprovals,
    businessConceptReferences: validation.businessConceptReferences,
    recordReferences: validation.recordReferences,
    policyReferences: validation.policyReferences,
    warnings: [...result.warnings, ...validation.warnings],
    contextExpansionRequests: [
      ...result.contextExpansionRequests,
      ...contextExpansionRequestsForMissingInformation(
        result.missingInformation,
      ),
    ],
    audit: { ...result.audit, status },
  };
}

function validateModelStructuredOutput(
  result: BusinessReasoningResult,
  context: CompiledBusinessContextBundle,
): {
  readonly findings: readonly BusinessFinding[];
  readonly diagnosticHypotheses: readonly DiagnosticHypothesis[];
  readonly decisionFactors: readonly DecisionFactor[];
  readonly recommendations: readonly BusinessRecommendation[];
  readonly requiredApprovals: readonly RequiredApproval[];
  readonly proposedSkills: readonly ProposedBusinessSkillInvocation[];
  readonly evidenceReferences: readonly EvidenceReference[];
  readonly businessConceptReferences: readonly SemanticId[];
  readonly recordReferences: readonly string[];
  readonly policyReferences: readonly string[];
  readonly warnings: readonly ReasoningWarning[];
} {
  const warnings: ReasoningWarning[] = [];
  const contextRecordIds = new Set(
    context.authorizedRecords.map((record) => record.recordId),
  );
  const contextPolicyIds = new Set(
    context.workspacePolicies.map((policy) => policy.policyId),
  );
  const contextConceptIds = new Set(context.relevantConceptIds);
  const validEvidence = (result.evidenceReferences ?? []).filter((reference) =>
    isValidEvidenceReference(reference, contextRecordIds, contextPolicyIds),
  );
  if ((result.evidenceReferences ?? []).length !== validEvidence.length) {
    warnings.push({
      code: "INVALID_REFERENCE_REJECTED",
      message: "One or more evidence references were outside compiled context.",
    });
  }

  const recordReferences = result.recordReferences.filter((recordId) =>
    contextRecordIds.has(recordId),
  );
  if (recordReferences.length !== result.recordReferences.length) {
    warnings.push({
      code: "INVALID_REFERENCE_REJECTED",
      message:
        "One or more record references were absent from compiled context.",
    });
  }

  const policyReferences = result.policyReferences.filter((policyId) =>
    contextPolicyIds.has(policyId),
  );
  if (policyReferences.length !== result.policyReferences.length) {
    warnings.push({
      code: "INVALID_REFERENCE_REJECTED",
      message:
        "One or more policy references were absent from compiled context.",
    });
  }

  const businessConceptReferences = result.businessConceptReferences.filter(
    (semanticId) => {
      const known = contextConceptIds.has(semanticId);
      if (!known) {
        warnings.push({
          code: "UNVERIFIED_MODEL_ASSERTION",
          message: `Unknown or out-of-context semantic reference rejected: ${semanticId}`,
        });
      }
      return known;
    },
  );

  return {
    findings: result.findings.map((finding) => ({
      ...finding,
      evidenceReferences: finding.evidenceReferences.filter((reference) =>
        isValidEvidenceReference(reference, contextRecordIds, contextPolicyIds),
      ),
    })),
    diagnosticHypotheses: result.diagnosticHypotheses.map((hypothesis) => ({
      ...hypothesis,
      supportingEvidence: hypothesis.supportingEvidence.filter((reference) =>
        isValidEvidenceReference(reference, contextRecordIds, contextPolicyIds),
      ),
      contradictingEvidence: hypothesis.contradictingEvidence.filter(
        (reference) =>
          isValidEvidenceReference(
            reference,
            contextRecordIds,
            contextPolicyIds,
          ),
      ),
    })),
    decisionFactors: result.decisionFactors.map((factor) => ({
      ...factor,
      evidenceReferences: factor.evidenceReferences.filter((reference) =>
        isValidEvidenceReference(reference, contextRecordIds, contextPolicyIds),
      ),
    })),
    recommendations: result.recommendations.map((recommendation) => ({
      ...recommendation,
      evidenceReferences: recommendation.evidenceReferences.filter(
        (reference) =>
          isValidEvidenceReference(
            reference,
            contextRecordIds,
            contextPolicyIds,
          ),
      ),
    })),
    requiredApprovals: result.requiredApprovals.map((approval) => ({
      ...approval,
      policyReferences: approval.policyReferences.filter((reference) =>
        isValidEvidenceReference(reference, contextRecordIds, contextPolicyIds),
      ),
    })),
    proposedSkills: validateProposedSkills(
      result.proposedSkills,
      context,
      warnings,
    ),
    evidenceReferences: validEvidence,
    businessConceptReferences,
    recordReferences,
    policyReferences,
    warnings,
  };
}

function validateProposedSkills(
  proposedSkills: readonly ProposedBusinessSkillInvocation[],
  context: CompiledBusinessContextBundle,
  warnings: ReasoningWarning[],
): readonly ProposedBusinessSkillInvocation[] {
  return proposedSkills.map((proposal) => {
    const contextSkill = context.availableBusinessSkills.find(
      (skill) => skill.semanticId === proposal.skillId,
    );
    if (!contextSkill) {
      warnings.push({
        code: "SKILL_PROPOSAL_REJECTED",
        message: `Skill proposal rejected because it is not in compiled context: ${proposal.skillId}`,
      });
      return rejectSkill(proposal, "Skill is absent from compiled context.");
    }
    if (
      !contextSkill.requiredPermissions.every((permission) =>
        context.actor.permissionIds.includes(permission),
      ) ||
      !proposal.requiredPermissions.every((permission) =>
        context.actor.permissionIds.includes(permission),
      )
    ) {
      warnings.push({
        code: "SKILL_PROPOSAL_REJECTED",
        message: `Skill proposal rejected because actor lacks required permission: ${proposal.skillId}`,
      });
      return rejectSkill(proposal, "Actor lacks required skill permission.");
    }
    if (!isAuthorityAllowed(proposal.authority, contextSkill)) {
      warnings.push({
        code: "AUTHORITY_ESCALATION_REJECTED",
        message: `Skill proposal rejected for authority escalation: ${proposal.skillId}`,
      });
      return rejectSkill(
        proposal,
        "Proposed authority exceeds compiled skill authority.",
      );
    }
    return {
      ...proposal,
      authority: contextSkill.executionAuthority,
      approvalRequirement: contextSkill.approvalPolicy,
      status: "ACCEPTED",
    };
  });
}

function rejectSkill(
  proposal: ProposedBusinessSkillInvocation,
  rejectionReason: string,
): ProposedBusinessSkillInvocation {
  return {
    ...proposal,
    status: "REJECTED",
    rejectionReason,
  };
}

function isAuthorityAllowed(
  proposedAuthority: string,
  contextSkill: CompiledBusinessSkill,
): boolean {
  return (
    proposedAuthority === contextSkill.executionAuthority ||
    proposedAuthority === "DRAFT_ONLY" ||
    proposedAuthority === "ADVISORY_ONLY"
  );
}

function isValidEvidenceReference(
  reference: EvidenceReference,
  contextRecordIds: ReadonlySet<string>,
  contextPolicyIds: ReadonlySet<string>,
): boolean {
  if (reference.kind === "WORKSPACE_RECORD") {
    return contextRecordIds.has(reference.referenceId);
  }
  if (reference.kind === "WORKSPACE_POLICY") {
    return contextPolicyIds.has(reference.referenceId);
  }
  if (reference.semanticId) {
    validateSemanticId(reference.semanticId);
  }
  return true;
}

function contextExpansionRequestsForMissingInformation(
  missingInformation: readonly MissingInformation[],
): readonly ContextExpansionRequest[] {
  return missingInformation.map((item) => ({
    need: item.field,
    reason: item.reason,
    semanticIds: [],
    ...(item.requiredPermission
      ? { requiredPermission: item.requiredPermission }
      : {}),
  }));
}

function domainMaturityWarnings(
  context: CompiledBusinessContextBundle,
): readonly ReasoningWarning[] {
  const scores = calculateDomainExpertiseScoresV1();
  return context.relevantDomains
    .filter(
      (domain) =>
        domain.coverageStatus === "FOUNDATION" ||
        (scores.find((score) => score.domainId === domain.domainId)?.overall ??
          1) < 0.7,
    )
    .map((domain) => ({
      code: "LOW_DOMAIN_MATURITY" as const,
      message: `${domain.key} coverage is foundational; do not present conclusions as fully authoritative.`,
    }));
}

function recordEvidence(record: RedactedBusinessRecord): EvidenceReference {
  return {
    kind: "WORKSPACE_RECORD",
    referenceId: record.recordId,
    semanticId: record.semanticId,
    description: record.label,
  };
}

export function policyEvidence(
  policy: WorkspaceBusinessPolicy,
): EvidenceReference {
  return {
    kind: "WORKSPACE_POLICY",
    referenceId: policy.policyId,
    semanticId: policy.semanticId,
    description: policy.name,
  };
}

function isValidModelDraft(draft: ModelBusinessReasoningDraft): boolean {
  return typeof draft === "object" && draft !== null && !Array.isArray(draft);
}

function providerMetadataForDraft(draft: ModelBusinessReasoningDraft): {
  readonly providerMetadata?: Readonly<Record<string, unknown>>;
} {
  if (
    typeof draft === "object" &&
    draft !== null &&
    "providerMetadata" in draft &&
    typeof draft.providerMetadata === "object" &&
    draft.providerMetadata !== null &&
    !Array.isArray(draft.providerMetadata)
  ) {
    return {
      providerMetadata: draft.providerMetadata as Readonly<
        Record<string, unknown>
      >,
    };
  }
  return {};
}

function isPromiseLike(
  draft: ModelBusinessReasoningDraft | Promise<ModelBusinessReasoningDraft>,
): draft is Promise<ModelBusinessReasoningDraft> {
  return (
    typeof draft === "object" &&
    draft !== null &&
    "then" in draft &&
    typeof draft.then === "function"
  );
}
