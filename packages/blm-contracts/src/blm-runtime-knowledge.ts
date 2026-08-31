import type { BusinessKnowledgeUnit } from "./business-knowledge-governance.js";
import type {
  BLMExpertisePack,
  BusinessTaxonomyContext,
  RoleExpertiseDefinition,
  UniversalCapability,
} from "./business-taxonomy-architecture.js";
import type {
  BuildingBlockPlan,
  BusinessModuleDefinition,
  ModuleRecommendation,
} from "./business-module-planning.js";
import type { SemanticId } from "./business-semantic-model.js";

export type RuntimeKnowledgeAccessMode =
  "CUSTOMER" | "EVALUATION_DEMO" | "FLOW_INTERNAL";

export type KnowledgeFreshnessClass =
  | "STATIC"
  | "SLOW_CHANGING"
  | "CURRENT_STANDARD"
  | "REGULATED_CURRENT"
  | "LIVE_OPERATIONAL";

export type RuntimeContextPrecedence =
  | "SECURITY_SYSTEM_POLICY"
  | "AUTHORIZED_WORKSPACE_FACT"
  | "DETERMINISTIC_CALCULATION_RULE"
  | "CURRENT_AUTHORITATIVE_EVIDENCE"
  | "APPROVED_GLOBAL_BLM_KNOWLEDGE"
  | "INDUSTRY_NICHE_PRIOR"
  | "ACADEMIC_INDUSTRY_THEORY"
  | "USER_ASSERTION"
  | "MODEL_PRIOR";

export type KnowledgeGapSeverity = "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";

export type KnowledgeGapReason =
  | "MISSING_SEMANTIC_CONCEPT"
  | "MISSING_WORKSPACE_FACT"
  | "MISSING_CURRENT_EVIDENCE"
  | "FRESHNESS_ESCALATION_REQUIRED"
  | "ACCESS_MODE_BLOCKED"
  | "BUDGET_EXCLUDED"
  | "AMBIGUOUS_REQUEST";

export interface BLMGroundedBusinessRequest {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly text: string;
  readonly accessMode: RuntimeKnowledgeAccessMode;
  readonly authorizedWorkspaceFacts: readonly string[];
  readonly userAssertions: readonly string[];
  readonly currentEvidenceRefs: readonly string[];
  readonly requestedSemanticIds: readonly SemanticId[];
  readonly requestedCapabilityIds: readonly SemanticId[];
}

export interface BLMBusinessContextFrame {
  readonly workspaceId: string;
  readonly userId: string;
  readonly requestId: string;
  readonly accessMode: RuntimeKnowledgeAccessMode;
  readonly permissionIds: readonly string[];
  readonly sourceEvidenceRefs: readonly string[];
}

export interface BLMContextBudget {
  readonly maxConcepts: number;
  readonly maxPacks: number;
  readonly maxKnowledgeUnits: number;
  readonly maxReasoningPatterns: number;
  readonly maxModuleRecords: number;
  readonly maxEvidence: number;
  readonly maxContextBytes: number;
}

export interface BusinessKnowledgeGap {
  readonly gapId: string;
  readonly reason: KnowledgeGapReason;
  readonly severity: KnowledgeGapSeverity;
  readonly description: string;
  readonly requiredPrecedence: RuntimeContextPrecedence;
  readonly requiredFreshness?: KnowledgeFreshnessClass;
  readonly evidenceRefs: readonly string[];
}

export interface RuntimeKnowledgeSourceRef {
  readonly sourceKey: string;
  readonly repositoryPath: string;
  readonly freshnessClass: KnowledgeFreshnessClass;
  readonly allowedModes: readonly RuntimeKnowledgeAccessMode[];
  readonly precedence: RuntimeContextPrecedence;
}

export interface RuntimeReasoningPattern {
  readonly patternId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly requiredFreshness: KnowledgeFreshnessClass;
  readonly prohibitedClaims: readonly string[];
}

export interface CompiledBLMContext {
  readonly workspaceContext: BLMBusinessContextFrame;
  readonly taxonomyContext: BusinessTaxonomyContext;
  readonly canonicalConcepts: readonly SemanticId[];
  readonly relevantCapabilities: readonly UniversalCapability[];
  readonly relevantExpertisePacks: readonly BLMExpertisePack[];
  readonly relevantRoleExpertise: readonly RoleExpertiseDefinition[];
  readonly relevantMetrics: readonly SemanticId[];
  readonly relevantDriverRelations: readonly string[];
  readonly relevantRules: readonly SemanticId[];
  readonly relevantWorkflowKnowledge: readonly SemanticId[];
  readonly relevantModuleKnowledge: readonly BusinessModuleDefinition[];
  readonly relevantModuleRecommendations: readonly ModuleRecommendation[];
  readonly buildingBlockPlan?: BuildingBlockPlan;
  readonly relevantReasoningPatterns: readonly RuntimeReasoningPattern[];
  readonly approvedKnowledgeUnits: readonly BusinessKnowledgeUnit[];
  readonly currentEvidenceRequirements: readonly BusinessKnowledgeGap[];
  readonly prohibitedClaims: readonly string[];
  readonly authorityBoundaries: readonly string[];
  readonly unresolvedQuestions: readonly string[];
  readonly sourceRefs: readonly RuntimeKnowledgeSourceRef[];
  readonly contextBudget: BLMContextBudget;
  readonly estimatedBytes: number;
  readonly contextFingerprint: string;
}

export interface BLMKnowledgeReleaseManifest {
  readonly releaseId: string;
  readonly createdAt: string;
  readonly sourceCorpus: string;
  readonly taxonomy: string;
  readonly architectureGraph: string;
  readonly capabilities: string;
  readonly expertisePacks: string;
  readonly language: string;
  readonly metrics: string;
  readonly drivers: string;
  readonly moduleRegistry: string;
  readonly reasoningCorpus: string;
  readonly evaluationSuite: string;
  readonly fingerprints: Readonly<Record<string, string>>;
  readonly reproducible: true;
}

export interface ModuleIntelligenceMetrics {
  readonly requirementPrecision: number;
  readonly requirementRecall: number;
  readonly p0MissRate: number;
  readonly overbuildRate: number;
  readonly questionEfficiency: number;
  readonly sorIntegrity: number;
  readonly portability: number;
  readonly security: number;
  readonly explainability: number;
  readonly historicalReproducibility: number;
  readonly changeBurden: number;
}

export interface BLMRuntimeEvaluationResult {
  readonly suiteId: string;
  readonly caseCount: number;
  readonly passed: number;
  readonly failed: number;
  readonly families: Readonly<Record<string, boolean>>;
  readonly moduleIntelligence: ModuleIntelligenceMetrics;
  readonly criticalFailures: readonly string[];
}

export const defaultBLMContextBudgetV1: BLMContextBudget = {
  maxConcepts: 12,
  maxPacks: 3,
  maxKnowledgeUnits: 8,
  maxReasoningPatterns: 6,
  maxModuleRecords: 6,
  maxEvidence: 8,
  maxContextBytes: 24000,
};

export const runtimePrecedenceOrderV1: readonly RuntimeContextPrecedence[] = [
  "SECURITY_SYSTEM_POLICY",
  "AUTHORIZED_WORKSPACE_FACT",
  "DETERMINISTIC_CALCULATION_RULE",
  "CURRENT_AUTHORITATIVE_EVIDENCE",
  "APPROVED_GLOBAL_BLM_KNOWLEDGE",
  "INDUSTRY_NICHE_PRIOR",
  "ACADEMIC_INDUSTRY_THEORY",
  "USER_ASSERTION",
  "MODEL_PRIOR",
];

export const blmRuntimeReasoningPatternsV1: readonly RuntimeReasoningPattern[] =
  [
    {
      patternId: "flow.decision.pattern.runtime.driver-diagnosis" as SemanticId,
      name: "Driver Diagnosis",
      description:
        "Diagnose business drivers before proposing an action or module.",
      requiredFreshness: "SLOW_CHANGING",
      prohibitedClaims: [
        "Do not assert live workspace causes without current evidence.",
      ],
    },
    {
      patternId:
        "flow.decision.pattern.runtime.correlation-causation" as SemanticId,
      name: "Correlation Versus Causation",
      description:
        "Separate correlated business signals from proven causal relationships.",
      requiredFreshness: "SLOW_CHANGING",
      prohibitedClaims: ["Do not claim causation from correlation alone."],
    },
    {
      patternId:
        "flow.decision.pattern.runtime.current-regulation" as SemanticId,
      name: "Current Regulation Escalation",
      description:
        "Route regulated-current questions to fresh authoritative evidence.",
      requiredFreshness: "REGULATED_CURRENT",
      prohibitedClaims: [
        "Do not answer live regulation as authoritative from static corpus.",
      ],
    },
  ];
