export * from "./business-semantic-model.js";
export * from "./business-brain-foundation.js";
export * from "./business-expertise-expansion.js";
export * from "./component-registry.js";
export * from "./business-data-foundation.js";
export * from "./business-logic-registry.js";
export * from "./business-skill-framework.js";
export * from "./business-knowledge-governance.js";
export * from "./business-language-foundation.js";
export * from "./business-intent-entity-resolution.js";
export * from "./business-query-planning.js";
export * from "./business-metrics.js";
export * from "./business-taxonomy-architecture.js";
export * from "./business-module-planning.js";
export * from "./blm-runtime-knowledge.js";
export * from "./business-role-registry.js";

export type BusinessSemanticConcept =
  | "Workspace"
  | "Organization"
  | "OrganizationUnit"
  | "Person"
  | "User"
  | "Role"
  | "Permission"
  | "Module"
  | "Capability"
  | "EntityType"
  | "Action"
  | "Tool"
  | "Document"
  | "Evidence"
  | "Decision"
  | "BusinessRule";

export type BusinessSemanticRelationship =
  | "BELONGS_TO"
  | "MEMBER_OF"
  | "HAS_ROLE"
  | "OWNS"
  | "REQUIRES_PERMISSION"
  | "ENABLES"
  | "RELATES_TO"
  | "BASED_ON"
  | "EVIDENCED_BY"
  | "DECIDED_BY"
  | "AFFECTS"
  | "CONTACT_FOR"
  | "HAS_CONTRACT"
  | "COVERS_SERVICE";

export type SemanticFactKind =
  | "FACT"
  | "INFERENCE"
  | "ASSUMPTION"
  | "RECOMMENDATION"
  | "USER_CONFIRMED_FACT"
  | "AI_EXTRACTED_FACT";

export type ReasoningRoute =
  "DETERMINISTIC" | "LOCAL_MODEL" | "CLOUD_MODEL" | "HUMAN_CLARIFICATION";

export interface SemanticEntity {
  readonly workspaceId: string;
  readonly entityId: string;
  readonly concept:
    BusinessSemanticConcept | (string & { readonly __customConcept?: never });
  readonly label: string;
  readonly organizationId?: string;
  readonly canonicalFlowReference?: {
    readonly entityType: string;
    readonly entityId: string;
  };
}

export interface SemanticRelationship {
  readonly workspaceId: string;
  readonly sourceEntityId: string;
  readonly relationship: BusinessSemanticRelationship;
  readonly targetEntityId: string;
  readonly evidenceReferenceId?: string;
}

export interface SemanticFact {
  readonly workspaceId: string;
  readonly factId: string;
  readonly subjectEntityId: string;
  readonly predicate: string;
  readonly value: string | number | boolean;
  readonly kind: SemanticFactKind;
  readonly confidence: number;
  readonly source: string;
  readonly evidenceReferenceId?: string;
}

export interface SemanticDecisionTrace {
  readonly workspaceId: string;
  readonly decisionId: string;
  readonly question: string;
  readonly resolvedEntityId?: string;
  readonly confidence: number;
  readonly factIds: readonly string[];
  readonly evidenceReferenceIds: readonly string[];
}

export interface SemanticConflict {
  readonly workspaceId: string;
  readonly subjectEntityId: string;
  readonly predicate: string;
  readonly factIds: readonly string[];
  readonly values: readonly (string | number | boolean)[];
}

export interface BusinessSemanticProvider {
  addEntity(entity: SemanticEntity): Promise<SemanticEntity>;
  addRelationship(
    relationship: SemanticRelationship,
  ): Promise<SemanticRelationship>;
  resolveEntity(input: {
    readonly workspaceId: string;
    readonly label: string;
  }): Promise<SemanticEntity | undefined>;
  getNeighbors(input: {
    readonly workspaceId: string;
    readonly entityId: string;
  }): Promise<readonly SemanticRelationship[]>;
  recordFact(fact: SemanticFact): Promise<SemanticFact>;
  traceDecision(input: {
    readonly workspaceId: string;
    readonly decisionId: string;
  }): Promise<SemanticDecisionTrace | undefined>;
  getProvenance(input: {
    readonly workspaceId: string;
    readonly factId: string;
  }): Promise<SemanticFact | undefined>;
  findConflicts(input: {
    readonly workspaceId: string;
  }): Promise<readonly SemanticConflict[]>;
  validateOntology(): Promise<{
    readonly valid: boolean;
    readonly reason: string;
  }>;
}

export interface LegacyBusinessIntent {
  readonly language: "en" | "ur" | "roman-ur";
  readonly rawInput: string;
  readonly normalizedIntent: string;
  readonly workspaceId: string;
  readonly organizationId?: string;
  readonly requestedAction?: string;
  readonly entityReferences: readonly string[];
  readonly parameters: Readonly<Record<string, string | number | boolean>>;
  readonly missingInformation: readonly string[];
  readonly assumptions: readonly string[];
  readonly evidenceReferences: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly confidence: number;
  readonly reasoningRoute: ReasoningRoute;
}

export interface BusinessLanguageModelProvider {
  interpretIntent(input: {
    readonly workspaceId: string;
    readonly rawInput: string;
    readonly language: LegacyBusinessIntent["language"];
  }): Promise<LegacyBusinessIntent>;
  extractBusinessEntities(input: {
    readonly workspaceId: string;
    readonly rawInput: string;
  }): Promise<readonly string[]>;
  classifyBusinessRequest(input: {
    readonly rawInput: string;
  }): Promise<{ readonly action: string; readonly confidence: number }>;
  identifyMissingParameters(
    intent: LegacyBusinessIntent,
  ): Promise<readonly string[]>;
  mapToCapabilities(intent: LegacyBusinessIntent): Promise<readonly string[]>;
}

export interface ModelRouterDecision {
  readonly route: ReasoningRoute;
  readonly confidenceThreshold: number;
  readonly reason: string;
}

export interface BusinessIntentBenchmarkCase {
  readonly id: string;
  readonly input: string;
  readonly language: LegacyBusinessIntent["language"];
  readonly expectedAction: string;
  readonly expectedEntities: readonly string[];
  readonly expectedCapabilities: readonly string[];
  readonly expectedMissingFields: readonly string[];
  readonly riskCategory: "LOW" | "MEDIUM" | "HIGH";
}

export const businessOntologyV01 = {
  concepts: [
    "Workspace",
    "Organization",
    "OrganizationUnit",
    "Person",
    "User",
    "Role",
    "Permission",
    "Module",
    "Capability",
    "EntityType",
    "Action",
    "Tool",
    "Document",
    "Evidence",
    "Decision",
    "BusinessRule",
  ] satisfies readonly BusinessSemanticConcept[],
  relationships: [
    "BELONGS_TO",
    "MEMBER_OF",
    "HAS_ROLE",
    "OWNS",
    "REQUIRES_PERMISSION",
    "ENABLES",
    "RELATES_TO",
    "BASED_ON",
    "EVIDENCED_BY",
    "DECIDED_BY",
    "AFFECTS",
    "CONTACT_FOR",
    "HAS_CONTRACT",
    "COVERS_SERVICE",
  ] satisfies readonly BusinessSemanticRelationship[],
} as const;

export const benchmarkCasesV01: readonly BusinessIntentBenchmarkCase[] = [
  {
    id: "invoice-roman-ur",
    input: "Amar ki next invoice bana do.",
    language: "roman-ur",
    expectedAction: "invoice.create",
    expectedEntities: ["Amar"],
    expectedCapabilities: ["invoicing.invoices"],
    expectedMissingFields: ["contract", "billing_schedule"],
    riskCategory: "MEDIUM",
  },
  {
    id: "contract-status-roman-ur",
    input: "Morganics ke social media contract ka status batao.",
    language: "roman-ur",
    expectedAction: "contract.status",
    expectedEntities: ["Morganics", "social media contract"],
    expectedCapabilities: ["documents.contracts"],
    expectedMissingFields: [],
    riskCategory: "LOW",
  },
  {
    id: "project-draft-en",
    input: "Read this contract and draft the project setup.",
    language: "en",
    expectedAction: "project.setup_draft",
    expectedEntities: ["contract"],
    expectedCapabilities: ["projects.setup", "documents.read"],
    expectedMissingFields: ["document"],
    riskCategory: "MEDIUM",
  },
  {
    id: "attendance-roman-ur",
    input: "Mr X ki attendance change kar do.",
    language: "roman-ur",
    expectedAction: "attendance.update",
    expectedEntities: ["Mr X"],
    expectedCapabilities: ["hr.attendance"],
    expectedMissingFields: ["date", "new_value"],
    riskCategory: "HIGH",
  },
  {
    id: "invoice-clarify-ur",
    input: "انوائس بھیج دیں۔",
    language: "ur",
    expectedAction: "invoice.send",
    expectedEntities: [],
    expectedCapabilities: ["invoicing.invoices"],
    expectedMissingFields: ["invoice", "client"],
    riskCategory: "HIGH",
  },
];

export function validateBusinessIntent(intent: LegacyBusinessIntent): void {
  if (!intent.workspaceId) {
    throw new Error("BusinessIntent requires workspaceId.");
  }
  if (intent.confidence < 0 || intent.confidence > 1) {
    throw new Error("BusinessIntent confidence must be between 0 and 1.");
  }
  if (intent.reasoningRoute === "CLOUD_MODEL" && intent.confidence >= 1) {
    throw new Error("Cloud model route cannot claim deterministic certainty.");
  }
}

export function routeBusinessIntent(input: {
  readonly task: "lookup" | "classification" | "generation" | "high-risk";
  readonly confidence: number;
}): ModelRouterDecision {
  if (input.confidence < 0.65) {
    return {
      route: "HUMAN_CLARIFICATION",
      confidenceThreshold: 0.65,
      reason: "Confidence is below safe automation threshold.",
    };
  }
  if (input.task === "lookup") {
    return {
      route: "DETERMINISTIC",
      confidenceThreshold: 0.9,
      reason: "Known lookup can use deterministic registry or graph data.",
    };
  }
  if (input.task === "generation") {
    return {
      route: "CLOUD_MODEL",
      confidenceThreshold: 0.8,
      reason: "Long-form generation remains a future cloud reasoning route.",
    };
  }
  if (input.task === "high-risk") {
    return {
      route: "HUMAN_CLARIFICATION",
      confidenceThreshold: 0.95,
      reason: "High-risk uncertainty requires human clarification.",
    };
  }
  return {
    route: "LOCAL_MODEL",
    confidenceThreshold: 0.75,
    reason: "Classification and extraction are local-first candidates.",
  };
}
