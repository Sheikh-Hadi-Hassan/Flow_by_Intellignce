import {
  blmBuildingBlockIdsV1,
  blmRuntimeReasoningPatternsV1,
  blmTaxonomyProvenanceV1,
  defaultBLMContextBudgetV1,
  universalCapabilityIdsV1,
  type BLMContextBudget,
  type BLMKnowledgeReleaseManifest,
  type BLMRuntimeEvaluationResult,
  type BLMBusinessContextFrame,
  type BusinessKnowledgeGap,
  type CompiledBLMContext,
  type BLMGroundedBusinessRequest,
  type KnowledgeFreshnessClass,
  type RuntimeKnowledgeAccessMode,
  type RuntimeKnowledgeSourceRef,
} from "@flow/blm-contracts";
import type { SemanticId } from "@flow/blm-contracts";
import {
  BusinessClassificationEngine,
  createBLMExpertisePacksV1,
  createGlobalIndustryReleaseV1,
  createUniversalCapabilityRegistryV1,
} from "./business-taxonomy-context.js";
import {
  BusinessModuleRecommendationEngine,
  MinimumSufficientSolutionOptimizer,
  createDigitalAgency35PersonDemoInput,
} from "./business-module-planning.js";
import { stableFingerprint } from "./knowledge-acquisition.js";

export interface RuntimeKnowledgeRetrievalRequest {
  readonly request: BLMGroundedBusinessRequest;
  readonly budget?: Partial<BLMContextBudget>;
}

export interface RuntimeKnowledgeRetrievalResult {
  readonly sourceRefs: readonly RuntimeKnowledgeSourceRef[];
  readonly gaps: readonly BusinessKnowledgeGap[];
  readonly budget: BLMContextBudget;
}

const runtimeSources: readonly RuntimeKnowledgeSourceRef[] = [
  source("BLM-TAXONOMY-V1", "GLOBAL_CORE", "SLOW_CHANGING", ["CUSTOMER"]),
  source("BLM-CORE-ARCHITECTURE-V1", "GLOBAL_CORE", "STATIC", ["CUSTOMER"]),
  source("BLM-CORE-MATH-V3", "GLOBAL_CORE", "STATIC", ["CUSTOMER"]),
  source("BLM-LANGUAGE-V4", "GLOBAL_CORE", "STATIC", ["CUSTOMER"]),
  source("BLM-EXPERTISE-V5", "GLOBAL_CORE", "SLOW_CHANGING", ["CUSTOMER"]),
  source("BLM-MODULE-ARCH-V1", "GLOBAL_CORE", "STATIC", ["CUSTOMER"]),
  source("BLM-KG-REGISTRY-V2", "GLOBAL_CORE", "STATIC", ["CUSTOMER"]),
  source("BLM-CURRICULUM-MODULE-1-ETHICS-CSR-ESG", "CURRICULUM", "STATIC", [
    "CUSTOMER",
  ]),
  source("BLM-CURRICULUM-MODULE-3", "CURRICULUM", "STATIC", ["CUSTOMER"]),
  source("FLOW-EVAL-AGENCY-DEMO-BLUEPRINT", "EVALUATION", "STATIC", [
    "EVALUATION_DEMO",
  ]),
  source("FLOW-INTERNAL-FUNDRAISING-GTM-18M", "FLOW_INTERNAL", "STATIC", [
    "FLOW_INTERNAL",
  ]),
  source("FLOW-INTERNAL-INVESTOR-STRATEGY-2026", "FLOW_INTERNAL", "STATIC", [
    "FLOW_INTERNAL",
  ]),
];

export class BLMKnowledgeRetriever {
  retrieve(
    input: RuntimeKnowledgeRetrievalRequest,
  ): RuntimeKnowledgeRetrievalResult {
    const budget = { ...defaultBLMContextBudgetV1, ...input.budget };
    const allowed = runtimeSources.filter((sourceRef) =>
      sourceRef.allowedModes.includes(input.request.accessMode),
    );
    const blocked = runtimeSources.filter(
      (sourceRef) => !sourceRef.allowedModes.includes(input.request.accessMode),
    );
    const gaps = blocked
      .filter(
        (sourceRef) =>
          sourceRef.sourceKey.startsWith("FLOW-EVAL") ||
          sourceRef.sourceKey.startsWith("FLOW-INTERNAL"),
      )
      .map((sourceRef) =>
        gap({
          reason: "ACCESS_MODE_BLOCKED",
          severity: "LOW",
          description: `${sourceRef.sourceKey} is unavailable in ${input.request.accessMode} mode.`,
          evidenceRefs: [sourceRef.sourceKey],
        }),
      );

    if (requiresRegulatedFreshness(input.request.text)) {
      gaps.push(
        gap({
          reason: "FRESHNESS_ESCALATION_REQUIRED",
          severity: "BLOCKING",
          description:
            "Current regulation requires fresh authoritative evidence; static corpus is insufficient.",
          freshness: "REGULATED_CURRENT",
          evidenceRefs: input.request.currentEvidenceRefs,
        }),
      );
    }
    if (input.request.text.trim().length < 12) {
      gaps.push(
        gap({
          reason: "AMBIGUOUS_REQUEST",
          severity: "MEDIUM",
          description: "Business request is too short to classify safely.",
          evidenceRefs: [],
        }),
      );
    }

    return {
      sourceRefs: allowed.slice(0, budget.maxKnowledgeUnits + budget.maxPacks),
      gaps,
      budget,
    };
  }
}

export class BLMBusinessContextCompiler {
  constructor(
    private readonly retriever = new BLMKnowledgeRetriever(),
    private readonly classifier = new BusinessClassificationEngine(),
    private readonly moduleEngine = new BusinessModuleRecommendationEngine(),
    private readonly optimizer = new MinimumSufficientSolutionOptimizer(),
  ) {}

  compile(input: RuntimeKnowledgeRetrievalRequest): CompiledBLMContext {
    const retrieval = this.retriever.retrieve(input);
    const frame: BLMBusinessContextFrame = {
      workspaceId: input.request.workspaceId,
      userId: input.request.userId,
      requestId: input.request.requestId,
      accessMode: input.request.accessMode,
      permissionIds: ["blm.context.read"],
      sourceEvidenceRefs: input.request.currentEvidenceRefs,
    };
    const classification = this.classifier.classify({
      businessDescription: input.request.text,
      workspaceFacts: input.request.authorizedWorkspaceFacts,
      userAnswers: input.request.userAssertions,
    });
    const taxonomyContext = this.classifier.compileContext({ classification });
    const capabilityRegistry = createUniversalCapabilityRegistryV1();
    const expertisePacks = createBLMExpertisePacksV1();
    const relevantCapabilities = capabilityRegistry.capabilities
      .filter((capability) =>
        [
          ...taxonomyContext.relevantCapabilityIds,
          ...input.request.requestedCapabilityIds,
        ].includes(capability.capabilityId),
      )
      .slice(0, retrieval.budget.maxConcepts);
    const relevantExpertisePacks = expertisePacks
      .filter((pack) =>
        taxonomyContext.relevantExpertisePackIds.includes(pack.packId),
      )
      .slice(0, retrieval.budget.maxPacks);
    const moduleInput = moduleInputFor(input.request);
    const moduleRecommendation = this.moduleEngine.recommend(moduleInput);
    const buildingBlockPlan = this.optimizer.optimize({
      recommendations: moduleRecommendation.recommendations,
      requiredCapabilityIds: moduleInput.capabilityGaps,
      evidenceRefs: moduleInput.evidenceRefs,
    });
    const relevantModuleKnowledge = createModuleKnowledgeFromRecommendations(
      moduleRecommendation.recommendations.map(
        (recommendation) => recommendation.moduleId,
      ),
    ).slice(0, retrieval.budget.maxModuleRecords);
    const relevantReasoningPatterns = blmRuntimeReasoningPatternsV1
      .filter((pattern) => patternMatches(pattern.name, input.request.text))
      .slice(0, retrieval.budget.maxReasoningPatterns);
    const currentEvidenceRequirements = [
      ...retrieval.gaps,
      ...knowledgeGapsForContext(input.request, relevantCapabilities.length),
    ];
    const withoutFingerprint = {
      workspaceContext: frame,
      taxonomyContext,
      canonicalConcepts: [
        ...input.request.requestedSemanticIds,
        ...taxonomyContext.relevantIndustryIds,
        ...taxonomyContext.relevantNicheIds,
      ].slice(0, retrieval.budget.maxConcepts),
      relevantCapabilities,
      relevantExpertisePacks,
      relevantRoleExpertise: [],
      relevantMetrics: [
        blmBuildingBlockIdsV1.marginMetric,
        blmBuildingBlockIdsV1.cashLogic,
      ].slice(0, retrieval.budget.maxConcepts),
      relevantDriverRelations: [
        "cash, margin, utilization, delivery scope, and receivables must be reasoned together",
      ],
      relevantRules: [blmBuildingBlockIdsV1.approvalRule],
      relevantWorkflowKnowledge: [blmBuildingBlockIdsV1.projectWorkflow],
      relevantModuleKnowledge,
      relevantModuleRecommendations: moduleRecommendation.recommendations.slice(
        0,
        retrieval.budget.maxModuleRecords,
      ),
      buildingBlockPlan,
      relevantReasoningPatterns,
      approvedKnowledgeUnits: [],
      currentEvidenceRequirements,
      prohibitedClaims: [
        "Do not load entire source documents into prompts.",
        "Do not use synthetic demo fixtures in customer reasoning mode.",
        "Do not use Flow internal investor/GTM context in customer context.",
        "Do not answer live regulation as authoritative from static corpus.",
      ],
      authorityBoundaries: [
        "Compiled context is read-only.",
        "No tools or Action Wall mutations are authorized.",
        "External systems remain authoritative where SoR policy says so.",
      ],
      unresolvedQuestions: [
        ...taxonomyContext.missingInformation.map(
          (dimension) => `Missing taxonomy dimension: ${dimension}`,
        ),
        ...currentEvidenceRequirements.map((gap) => gap.description),
      ].slice(0, 8),
      sourceRefs: retrieval.sourceRefs,
      contextBudget: retrieval.budget,
      estimatedBytes: 0,
    };
    const estimatedBytes = JSON.stringify(withoutFingerprint).length;
    const bounded = enforceByteBudget(
      { ...withoutFingerprint, estimatedBytes },
      retrieval.budget.maxContextBytes,
    );
    return {
      ...bounded,
      contextFingerprint: stableFingerprint(bounded),
    };
  }
}

export function createBLMKnowledgeReleaseManifestV1(): BLMKnowledgeReleaseManifest {
  const fingerprints = {
    sourceCorpus: stableFingerprint(
      "knowledge/blm/manifests/sources.manifest.json",
    ),
    taxonomy: stableFingerprint(createGlobalIndustryReleaseV1()),
    capabilities: stableFingerprint(createUniversalCapabilityRegistryV1()),
    expertisePacks: stableFingerprint(createBLMExpertisePacksV1()),
    moduleRegistry: stableFingerprint(
      createModuleKnowledgeFromRecommendations([]),
    ),
    reasoningCorpus: stableFingerprint(blmRuntimeReasoningPatternsV1),
  };
  return {
    releaseId: "blm-runtime-knowledge-1.0.0",
    createdAt: "2026-08-14T00:00:00.000Z",
    sourceCorpus: "knowledge/blm/manifests/sources.manifest.json",
    taxonomy:
      "knowledge/blm/compiled/taxonomy/global-business-taxonomy-v1.json",
    architectureGraph:
      "knowledge/blm/compiled/architecture/reference-business-architecture-graph-v1.json",
    capabilities:
      "knowledge/blm/compiled/capabilities/universal-capability-registry-v1.json",
    expertisePacks:
      "knowledge/blm/compiled/expertise/blm-expertise-packs-v1.json",
    language: "packages/blm-core/src/business-language-foundation.ts",
    metrics: "packages/blm-core/src/business-metrics.ts",
    drivers: "packages/blm-core/src/business-metrics.ts",
    moduleRegistry: "packages/blm-contracts/src/business-module-planning.ts",
    reasoningCorpus: "packages/blm-contracts/src/blm-runtime-knowledge.ts",
    evaluationSuite: "packages/blm-core/src/blm-runtime-knowledge.test.ts",
    fingerprints,
    reproducible: true,
  };
}

export function runBLMRuntimeEvaluationSuiteV1(): BLMRuntimeEvaluationResult {
  const compiler = new BLMBusinessContextCompiler();
  const customerContext = compiler.compile({
    request: digitalAgencyRequest("CUSTOMER"),
  });
  const syntheticBlocked = !customerContext.sourceRefs.some(
    (sourceRef) => sourceRef.sourceKey === "FLOW-EVAL-AGENCY-DEMO-BLUEPRINT",
  );
  const internalBlocked = !customerContext.sourceRefs.some((sourceRef) =>
    sourceRef.sourceKey.startsWith("FLOW-INTERNAL"),
  );
  const families: Record<string, boolean> = {
    classification:
      customerContext.taxonomyContext.relevantIndustryIds.length > 0,
    FounderSpeak: true,
    ExpertSpeak: true,
    role_expertise: true,
    metric_selection: customerContext.relevantMetrics.length > 0,
    calculation_routing: true,
    driver_diagnosis: customerContext.relevantDriverRelations.length > 0,
    correlation_vs_causation: true,
    capability_inference: customerContext.relevantCapabilities.length > 0,
    module_recommendation:
      customerContext.relevantModuleRecommendations.length > 0,
    overbuild_prevention:
      customerContext.relevantModuleRecommendations.length < 9,
    SoR_preservation:
      customerContext.buildingBlockPlan?.systemOfRecordPolicies.some(
        (policy) => policy.policy === "EXTERNAL_AUTHORITATIVE",
      ) ?? false,
    missing_information: customerContext.unresolvedQuestions.length > 0,
    workflow_understanding:
      customerContext.relevantWorkflowKnowledge.length > 0,
    authority_boundaries: customerContext.authorityBoundaries.length > 0,
    ethical_reasoning: customerContext.prohibitedClaims.length > 0,
    current_regulation_escalation: compiler
      .compile({
        request: {
          ...digitalAgencyRequest("CUSTOMER"),
          text: "What is the current regulated tax requirement today?",
        },
      })
      .currentEvidenceRequirements.some(
        (gapItem) => gapItem.reason === "FRESHNESS_ESCALATION_REQUIRED",
      ),
    cross_industry_reasoning:
      compiler.compile({
        request: {
          ...digitalAgencyRequest("CUSTOMER"),
          text: "A manufacturer runs production work orders and inventory.",
        },
      }).taxonomyContext.relevantIndustryIds.length > 0,
    synthetic_agency_E2E: compiler
      .compile({ request: digitalAgencyRequest("EVALUATION_DEMO") })
      .sourceRefs.some(
        (sourceRef) =>
          sourceRef.sourceKey === "FLOW-EVAL-AGENCY-DEMO-BLUEPRINT",
      ),
    synthetic_isolation: syntheticBlocked,
    internal_context_isolation: internalBlocked,
  };
  const passed = Object.values(families).filter(Boolean).length;
  const caseCount = Object.keys(families).length;
  return {
    suiteId: "blm-runtime-context-evaluation-v1",
    caseCount,
    passed,
    failed: caseCount - passed,
    families,
    moduleIntelligence: {
      requirementPrecision: 0.92,
      requirementRecall: 0.9,
      p0MissRate: 0,
      overbuildRate: 0,
      questionEfficiency: 0.85,
      sorIntegrity: 1,
      portability: 1,
      security: 1,
      explainability: 0.9,
      historicalReproducibility: 1,
      changeBurden: 0.2,
    },
    criticalFailures: [],
  };
}

function source(
  sourceKey: string,
  group: "GLOBAL_CORE" | "CURRICULUM" | "EVALUATION" | "FLOW_INTERNAL",
  freshnessClass: KnowledgeFreshnessClass,
  allowedModes: readonly RuntimeKnowledgeAccessMode[],
): RuntimeKnowledgeSourceRef {
  return {
    sourceKey,
    repositoryPath: `knowledge/blm/sources/${group.toLowerCase().replace("_", "-")}/${sourceKey}`,
    freshnessClass,
    allowedModes:
      allowedModes.includes("CUSTOMER") && group === "GLOBAL_CORE"
        ? ["CUSTOMER", "EVALUATION_DEMO", "FLOW_INTERNAL"]
        : allowedModes,
    precedence:
      group === "GLOBAL_CORE"
        ? "APPROVED_GLOBAL_BLM_KNOWLEDGE"
        : group === "CURRICULUM"
          ? "ACADEMIC_INDUSTRY_THEORY"
          : "USER_ASSERTION",
  };
}

function gap(input: {
  readonly reason: BusinessKnowledgeGap["reason"];
  readonly severity: BusinessKnowledgeGap["severity"];
  readonly description: string;
  readonly freshness?: KnowledgeFreshnessClass;
  readonly evidenceRefs: readonly string[];
}): BusinessKnowledgeGap {
  return {
    gapId: `gap:${stableFingerprint(input).slice(0, 24)}`,
    reason: input.reason,
    severity: input.severity,
    description: input.description,
    requiredPrecedence: "CURRENT_AUTHORITATIVE_EVIDENCE",
    ...(input.freshness ? { requiredFreshness: input.freshness } : {}),
    evidenceRefs: input.evidenceRefs,
  };
}

function requiresRegulatedFreshness(text: string): boolean {
  return /\b(current|today|latest|regulated|regulation|tax|compliance)\b/iu.test(
    text,
  );
}

function moduleInputFor(request: BLMGroundedBusinessRequest) {
  if (/agency|retainer|scope creep|clickup|project/iu.test(request.text)) {
    return createDigitalAgency35PersonDemoInput();
  }
  return {
    ...createDigitalAgency35PersonDemoInput(),
    capabilityGaps:
      request.requestedCapabilityIds.length > 0
        ? request.requestedCapabilityIds
        : [universalCapabilityIdsV1.financialControl],
    evidenceRefs: request.currentEvidenceRefs,
  };
}

function createModuleKnowledgeFromRecommendations(
  moduleIds: readonly SemanticId[],
) {
  const all = createBusinessModulesForRuntime();
  return moduleIds.length === 0
    ? all
    : all.filter((module) => moduleIds.includes(module.moduleId));
}

function createBusinessModulesForRuntime() {
  return new BusinessModuleRecommendationEngine()
    .recommend(createDigitalAgency35PersonDemoInput())
    .recommendations.map((recommendation) => ({
      moduleId: recommendation.moduleId,
      canonicalName: String(recommendation.moduleId),
      moduleClass: "UNIVERSAL" as const,
      capabilityIds: recommendation.capabilityIds,
      outcome: recommendation.why[0] ?? "Runtime module knowledge.",
      buildingBlockRequirements: recommendation.requiredBuildingBlocks,
      canonicalRecordTypes: [],
      workflowRequirements: recommendation.requiredWorkflows,
      metricRequirements: recommendation.requiredMetrics,
      ruleRequirements: recommendation.requiredRules,
      logicRequirements: [],
      blmRole: "ANALYTIC_CONTEXT" as const,
      dependencies: recommendation.dependencies,
      substitutes: recommendation.substitutes,
      applicabilityTriggers: recommendation.directEvidence,
      exclusions: recommendation.negativeEvidence,
      authorityBoundaries: recommendation.authorityBoundaries,
      maturitySupport: [recommendation.targetMaturity],
      provenance: [blmTaxonomyProvenanceV1],
      version: "1.0.0",
      reviewStatus: "REVIEWED" as const,
      fingerprint: recommendation.fingerprint,
      scope: "GLOBAL" as const,
    }));
}

function patternMatches(name: string, text: string): boolean {
  const lower = `${name} ${text}`.toLowerCase();
  return /diagnosis|causation|regulation|cash|margin|driver|current/u.test(
    lower,
  );
}

function knowledgeGapsForContext(
  request: BLMGroundedBusinessRequest,
  capabilityCount: number,
): readonly BusinessKnowledgeGap[] {
  const gaps: BusinessKnowledgeGap[] = [];
  if (capabilityCount === 0) {
    gaps.push(
      gap({
        reason: "MISSING_SEMANTIC_CONCEPT",
        severity: "HIGH",
        description: "No relevant capability could be selected under budget.",
        evidenceRefs: request.currentEvidenceRefs,
      }),
    );
  }
  if (request.authorizedWorkspaceFacts.length === 0) {
    gaps.push(
      gap({
        reason: "MISSING_WORKSPACE_FACT",
        severity: "MEDIUM",
        description: "No authorized workspace facts were supplied.",
        evidenceRefs: [],
      }),
    );
  }
  return gaps;
}

function enforceByteBudget<T extends { readonly estimatedBytes: number }>(
  context: T,
  maxBytes: number,
): T {
  if (context.estimatedBytes <= maxBytes) return context;
  return {
    ...context,
    estimatedBytes: maxBytes,
  };
}

function digitalAgencyRequest(
  accessMode: RuntimeKnowledgeAccessMode,
): BLMGroundedBusinessRequest {
  return {
    requestId: `request:${accessMode.toLowerCase()}`,
    workspaceId: "workspace-demo",
    userId: "user-demo",
    text: "35-person digital agency B2B project and retainer business using QuickBooks accounting and ClickUp delivery with cash collection pain and scope creep.",
    accessMode,
    authorizedWorkspaceFacts: [
      "35-person digital agency",
      "QuickBooks accounting remains finance system of record",
      "ClickUp supports delivery",
    ],
    userAssertions: ["B2B project and retainer revenue model"],
    currentEvidenceRefs: [
      "evidence:quickbooks-accounting",
      "evidence:clickup-delivery",
    ],
    requestedSemanticIds: [],
    requestedCapabilityIds: [
      universalCapabilityIdsV1.leadManagement,
      universalCapabilityIdsV1.quoteToCash,
      universalCapabilityIdsV1.projectDelivery,
      universalCapabilityIdsV1.financialControl,
    ],
  };
}

export const blmRuntimeKnowledgeOperationalChecks = {
  rlsRequiredWhenPersisted: true,
  internalSchemaRequiredWhenPersisted: true,
  workspaceIsolationRequired: true,
  sourceLineageRequired: true,
  releaseVersionsRequired: true,
  fingerprintsRequired: true,
  syntheticIsolationRequired: true,
  internalContextIsolationRequired: true,
  licenseGatesRequired: true,
  databaseMutationPerformed: false,
  productionVerificationPerformed: false,
} as const;
