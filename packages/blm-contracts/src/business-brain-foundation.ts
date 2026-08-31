import {
  toSemanticId,
  validateSemanticId,
  validateSemanticScope,
  type SemanticId,
} from "./business-semantic-model.js";

export type BusinessKnowledgeSourceType =
  | "OPEN_SOURCE_MODEL"
  | "ONTOLOGY"
  | "STANDARD"
  | "REFERENCE_IMPLEMENTATION"
  | "BENCHMARK"
  | "PROTOCOL";

export type BusinessKnowledgeSourceDecision =
  "ADOPT" | "ADAPT" | "REFERENCE_ONLY" | "DEFER" | "REJECT";

export type BusinessKnowledgeSourceLicenseStatus =
  "VERIFIED" | "REVIEW_REQUIRED" | "RESTRICTED";

export type BusinessKnowledgeImportPolicy =
  | "IMPORT_ALLOWED"
  | "ADAPT_WITH_ATTRIBUTION"
  | "MAP_ONLY"
  | "REFERENCE_ONLY"
  | "NO_INGESTION";

export type BusinessKnowledgeMappingPolicy =
  | "FLOW_CANONICAL"
  | "PRESERVE_EXTERNAL_NAMESPACE"
  | "VERSIONED_MAPPING_ONLY"
  | "REFERENCE_SUMMARY_ONLY";

export interface BusinessKnowledgeSource {
  readonly id: string;
  readonly name: string;
  readonly sourceType: BusinessKnowledgeSourceType;
  readonly canonicalLocation: string;
  readonly upstreamProject: string;
  readonly version: string;
  readonly commitSha?: string;
  readonly retrievedAt?: string;
  readonly license: string;
  readonly licenseStatus: BusinessKnowledgeSourceLicenseStatus;
  readonly licenseConfidence: "HIGH" | "MEDIUM" | "LOW";
  readonly attributionRequirements: readonly string[];
  readonly permittedUsage: readonly (
    "STUDY" | "REFERENCE" | "MAP" | "ADAPT" | "IMPORT"
  )[];
  readonly importPolicy: BusinessKnowledgeImportPolicy;
  readonly mappingPolicy: BusinessKnowledgeMappingPolicy;
  readonly decision: BusinessKnowledgeSourceDecision;
  readonly ingested: false;
  readonly provenance: {
    readonly verifiedFrom: readonly string[];
    readonly notes: string;
  };
}

export type BusinessKnowledgeProvenanceUse =
  | "FLOW_NATIVE"
  | "INSPIRED_BY"
  | "MAPPED_TO"
  | "ADAPTED_FROM"
  | "IMPORTED_FROM";

export interface BusinessKnowledgeProvenance {
  readonly sourceIds: readonly string[];
  readonly use: BusinessKnowledgeProvenanceUse;
  readonly notes: string;
}

export type BusinessDomainPackLifecycle =
  "FOUNDATION" | "PARTIAL" | "VALIDATED" | "DEPRECATED";

export type BusinessExecutionAuthority =
  | "KNOWLEDGE_ONLY"
  | "LLM_ADVISORY"
  | "LLM_DRAFT"
  | "DETERMINISTIC_REQUIRED"
  | "APPROVAL_REQUIRED"
  | "EXECUTABLE";

export type BusinessRiskClass = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BusinessContractFieldType =
  | "STRING"
  | "BOOLEAN"
  | "INTEGER"
  | "DECIMAL"
  | "MONEY"
  | "DATE"
  | "SEMANTIC_ID"
  | "OBJECT"
  | "ARRAY";

export interface BusinessContractFieldDefinition {
  readonly key: string;
  readonly type: BusinessContractFieldType;
  readonly required: boolean;
  readonly semanticId?: SemanticId;
}

export interface BusinessDataContractDefinition {
  readonly version: number;
  readonly fields: readonly BusinessContractFieldDefinition[];
}

export interface ExternalStandardMapping {
  readonly sourceId: string;
  readonly externalId: string;
  readonly externalLabel: string;
  readonly version: string;
  readonly relationship:
    "EQUIVALENT_TO" | "NARROWER_THAN" | "BROADER_THAN" | "RELATED_TO";
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface BusinessConceptDefinition {
  readonly semanticId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly aliases: readonly string[];
  readonly capabilityIds: readonly SemanticId[];
  readonly relatedConceptIds: readonly SemanticId[];
  readonly externalMappings: readonly ExternalStandardMapping[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessSkillDefinition {
  readonly semanticId: SemanticId;
  readonly domainPackId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly conceptIds: readonly SemanticId[];
  readonly capabilityIds: readonly SemanticId[];
  readonly inputContract: BusinessDataContractDefinition;
  readonly outputContract: BusinessDataContractDefinition;
  readonly reads: readonly SemanticId[];
  readonly writes: readonly SemanticId[];
  readonly requiredCapabilities: readonly SemanticId[];
  readonly requiredPermissions: readonly string[];
  readonly preconditions: readonly string[];
  readonly postconditions: readonly string[];
  readonly riskClass: BusinessRiskClass;
  readonly executionAuthority: BusinessExecutionAuthority;
  readonly deterministicImplementation?: {
    readonly engine: "FUTURE_DETERMINISTIC_ENGINE" | "EXISTING_FLOW_ACTION";
    readonly formulaId?: SemanticId;
  };
  readonly toolBinding?: {
    readonly toolId: string;
    readonly adapter: "FLOW_INTERNAL" | "FUTURE_MCP";
  };
  readonly actionBinding?: {
    readonly actionId: string;
    readonly actionWallOperationId: string;
  };
  readonly idempotencyPolicy:
    "NOT_APPLICABLE" | "REQUIRED" | "CALLER_PROVIDED_KEY";
  readonly approvalPolicy: "NONE" | "THRESHOLD_BASED" | "ALWAYS_REQUIRED";
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessFormulaDefinition {
  readonly semanticId: SemanticId;
  readonly domainPackId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly inputs: readonly SemanticId[];
  readonly output: SemanticId;
  readonly representation: string;
  readonly authority: "DOCUMENTED_FORMULA" | "FUTURE_DETERMINISTIC_ENGINE";
  readonly executionAuthority: Extract<
    BusinessExecutionAuthority,
    "DETERMINISTIC_REQUIRED" | "EXECUTABLE"
  >;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessRuleDefinition {
  readonly semanticId: SemanticId;
  readonly domainPackId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly appliesToConceptIds: readonly SemanticId[];
  readonly condition: string;
  readonly consequence: string;
  readonly authority: "POLICY" | "DMN_REFERENCE";
  readonly executionAuthority: BusinessExecutionAuthority;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessProcessPatternDefinition {
  readonly semanticId: SemanticId;
  readonly domainPackId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly stepCapabilityIds: readonly SemanticId[];
  readonly relatedSkillIds: readonly SemanticId[];
  readonly relatedDocumentIds: readonly SemanticId[];
  readonly externalMappings: readonly ExternalStandardMapping[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessDocumentDefinition {
  readonly semanticId: SemanticId;
  readonly domainPackId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly participantConceptIds: readonly SemanticId[];
  readonly requiredFieldKeys: readonly string[];
  readonly optionalFieldKeys: readonly string[];
  readonly lineItemConceptId?: SemanticId;
  readonly lifecycle: readonly string[];
  readonly relatedProcessIds: readonly SemanticId[];
  readonly relatedSkillIds: readonly SemanticId[];
  readonly externalMappings: readonly ExternalStandardMapping[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessMetricDefinition {
  readonly semanticId: SemanticId;
  readonly domainPackId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly requiredInputIds: readonly SemanticId[];
  readonly unit: "COUNT" | "MONEY" | "PERCENT" | "RATIO" | "DAYS";
  readonly timeGrain: "POINT_IN_TIME" | "DAILY" | "MONTHLY" | "PERIOD";
  readonly calculationAuthority: Extract<
    BusinessExecutionAuthority,
    "DETERMINISTIC_REQUIRED" | "EXECUTABLE"
  >;
  readonly formulaId?: SemanticId;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BLMEvaluationCase {
  readonly semanticId: SemanticId;
  readonly domainPackId: SemanticId;
  readonly name: string;
  readonly dimension:
    | "SEMANTIC_UNDERSTANDING"
    | "PROCESS_UNDERSTANDING"
    | "CALCULATION_CORRECTNESS"
    | "DOCUMENT_REASONING"
    | "SKILL_SELECTION"
    | "PERMISSION_AWARENESS"
    | "CROSS_DOMAIN_REASONING"
    | "SOURCE_PROVENANCE";
  readonly inputFacts: Readonly<Record<string, string | number | boolean>>;
  readonly expected: Readonly<Record<string, string | number | boolean>>;
  readonly evaluationMode: "DETERMINISTIC_FIXTURE";
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface BusinessDomainPack {
  readonly semanticId: SemanticId;
  readonly name: string;
  readonly version: string;
  readonly lifecycle: BusinessDomainPackLifecycle;
  readonly description: string;
  readonly conceptIds: readonly SemanticId[];
  readonly capabilityIds: readonly SemanticId[];
  readonly skillIds: readonly SemanticId[];
  readonly formulaIds: readonly SemanticId[];
  readonly ruleIds: readonly SemanticId[];
  readonly processPatternIds: readonly SemanticId[];
  readonly documentIds: readonly SemanticId[];
  readonly metricIds: readonly SemanticId[];
  readonly externalSourceIds: readonly string[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessDomainPackBundle {
  readonly domainPack: BusinessDomainPack;
  readonly concepts: readonly BusinessConceptDefinition[];
  readonly skills: readonly BusinessSkillDefinition[];
  readonly formulas: readonly BusinessFormulaDefinition[];
  readonly rules: readonly BusinessRuleDefinition[];
  readonly processPatterns: readonly BusinessProcessPatternDefinition[];
  readonly documents: readonly BusinessDocumentDefinition[];
  readonly metrics: readonly BusinessMetricDefinition[];
  readonly evaluationCases: readonly BLMEvaluationCase[];
}

export interface TenantBusinessKnowledgeOverlay {
  readonly workspaceId: string;
  readonly enabledDomainPackIds: readonly SemanticId[];
  readonly terminologyAliases: Readonly<Record<string, string>>;
  readonly policies: Readonly<Record<string, string | number | boolean>>;
  readonly thresholds: Readonly<Record<string, number>>;
}

export interface BusinessContextBundle {
  readonly bundleId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly requestedTask: string;
  readonly includedDomainPackIds: readonly SemanticId[];
  readonly includedSkillIds: readonly SemanticId[];
  readonly currentFactReferences: readonly string[];
  readonly permissionReferences: readonly string[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly tokenBudget: number;
}

export interface ModelCapabilityProfile {
  readonly modelFamily:
    "CLOUD_LLM" | "LOCAL_SLM" | "SPECIALIZED_MODEL" | "NO_MODEL";
  readonly supportsToolUse: boolean;
  readonly supportsStructuredOutput: boolean;
  readonly maxContextTokens?: number;
}

export interface BusinessDomainCoverageTrack {
  readonly id: string;
  readonly name: string;
  readonly status: "NOT_STARTED" | "FOUNDATION" | "PARTIAL" | "VALIDATED";
  readonly activeDomainPackIds: readonly SemanticId[];
  readonly notes: string;
}

export interface ExternalBenchmarkReference {
  readonly id: string;
  readonly source: string;
  readonly license: string;
  readonly tasks: readonly string[];
  readonly domain: string;
  readonly plannedUse: string;
  readonly ingestionStatus: "NOT_INGESTED" | "REVIEW_REQUIRED";
}

export type BusinessExpertiseRegistryValidationCode =
  | "DUPLICATE_DOMAIN_PACK"
  | "INVALID_SEMANTIC_ID"
  | "TENANT_BOUNDARY_VIOLATION"
  | "UNKNOWN_SOURCE"
  | "SOURCE_NOT_APPROVED_FOR_IMPORT"
  | "UNKNOWN_DOMAIN_PACK"
  | "UNKNOWN_CONCEPT"
  | "UNKNOWN_SKILL"
  | "UNKNOWN_CAPABILITY"
  | "INVALID_CONTRACT"
  | "MISSING_EXECUTION_AUTHORITY"
  | "INVALID_CALCULATION_AUTHORITY"
  | "MISSING_ACTION_WALL_METADATA"
  | "INVALID_FORMULA_AUTHORITY"
  | "INVALID_PROVENANCE";

export interface BusinessExpertiseRegistryValidationError {
  readonly code: BusinessExpertiseRegistryValidationCode;
  readonly message: string;
  readonly semanticId?: SemanticId;
  readonly sourceId?: string;
  readonly field?: string;
}

export interface BusinessExpertiseRegistryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly BusinessExpertiseRegistryValidationError[];
}

export class BusinessExpertiseRegistry {
  private readonly domainPacks = new Map<
    SemanticId,
    BusinessDomainPackBundle
  >();
  private readonly tenantOverlays = new Map<
    string,
    TenantBusinessKnowledgeOverlay
  >();
  private readonly sources: ReadonlyMap<string, BusinessKnowledgeSource>;

  constructor(input: {
    readonly sources: readonly BusinessKnowledgeSource[];
    readonly domainPacks?: readonly BusinessDomainPackBundle[];
    readonly tenantOverlays?: readonly TenantBusinessKnowledgeOverlay[];
  }) {
    this.sources = new Map(input.sources.map((source) => [source.id, source]));
    for (const bundle of input.domainPacks ?? []) {
      this.registerDomainPack(bundle);
    }
    for (const overlay of input.tenantOverlays ?? []) {
      this.setTenantOverlay(overlay);
    }
  }

  registerDomainPack(
    bundle: BusinessDomainPackBundle,
  ): BusinessExpertiseRegistryValidationResult {
    const errors = this.validateDomainPackBundle(bundle);
    if (this.domainPacks.has(bundle.domainPack.semanticId)) {
      errors.push({
        code: "DUPLICATE_DOMAIN_PACK",
        message: `Domain pack already registered: ${bundle.domainPack.semanticId}`,
        semanticId: bundle.domainPack.semanticId,
      });
    }
    if (errors.length === 0) {
      this.domainPacks.set(bundle.domainPack.semanticId, bundle);
    }
    return { valid: errors.length === 0, errors };
  }

  listDomainPacks(): readonly BusinessDomainPack[] {
    return [...this.domainPacks.values()].map((bundle) => bundle.domainPack);
  }

  getDomainPack(semanticId: SemanticId): BusinessDomainPack | undefined {
    return this.domainPacks.get(semanticId)?.domainPack;
  }

  getConceptsForDomain(
    domainPackId: SemanticId,
  ): readonly BusinessConceptDefinition[] {
    return this.domainPacks.get(domainPackId)?.concepts ?? [];
  }

  getSkillsForConcept(
    conceptId: SemanticId,
  ): readonly BusinessSkillDefinition[] {
    return this.allSkills().filter((skill) =>
      skill.conceptIds.includes(conceptId),
    );
  }

  getSkillsForCapability(
    capabilityId: SemanticId,
  ): readonly BusinessSkillDefinition[] {
    return this.allSkills().filter((skill) =>
      skill.capabilityIds.includes(capabilityId),
    );
  }

  getProcessPatternsForCapability(
    capabilityId: SemanticId,
  ): readonly BusinessProcessPatternDefinition[] {
    return this.allProcessPatterns().filter((pattern) =>
      pattern.stepCapabilityIds.includes(capabilityId),
    );
  }

  getDocumentsForProcess(
    processPatternId: SemanticId,
  ): readonly BusinessDocumentDefinition[] {
    return this.allDocuments().filter((document) =>
      document.relatedProcessIds.includes(processPatternId),
    );
  }

  getMetricsForDomain(
    domainPackId: SemanticId,
  ): readonly BusinessMetricDefinition[] {
    return this.domainPacks.get(domainPackId)?.metrics ?? [];
  }

  getAuthoritativeFormulas(): readonly BusinessFormulaDefinition[] {
    return this.allFormulas().filter(
      (formula) => formula.executionAuthority === "DETERMINISTIC_REQUIRED",
    );
  }

  getExternalMappingsForConcept(
    conceptId: SemanticId,
  ): readonly ExternalStandardMapping[] {
    const concept = this.allConcepts().find(
      (item) => item.semanticId === conceptId,
    );
    return concept?.externalMappings ?? [];
  }

  getSource(sourceId: string): BusinessKnowledgeSource | undefined {
    return this.sources.get(sourceId);
  }

  setTenantOverlay(overlay: TenantBusinessKnowledgeOverlay): void {
    this.tenantOverlays.set(overlay.workspaceId, overlay);
  }

  getTenantOverlay(
    workspaceId: string,
  ): TenantBusinessKnowledgeOverlay | undefined {
    return this.tenantOverlays.get(workspaceId);
  }

  validateEvaluationCases(): BusinessExpertiseRegistryValidationResult {
    const errors: BusinessExpertiseRegistryValidationError[] = [];
    for (const evaluationCase of this.allEvaluationCases()) {
      if (evaluationCase.evaluationMode !== "DETERMINISTIC_FIXTURE") {
        errors.push({
          code: "INVALID_PROVENANCE",
          message: "BLM v1 evaluation cases must be deterministic fixtures.",
          semanticId: evaluationCase.semanticId,
        });
      }
      if (Object.keys(evaluationCase.expected).length === 0) {
        errors.push({
          code: "INVALID_PROVENANCE",
          message: "Evaluation case is missing deterministic expected output.",
          semanticId: evaluationCase.semanticId,
        });
      }
    }
    return { valid: errors.length === 0, errors };
  }

  private validateDomainPackBundle(
    bundle: BusinessDomainPackBundle,
  ): BusinessExpertiseRegistryValidationError[] {
    const errors: BusinessExpertiseRegistryValidationError[] = [];
    const globalItems = [
      bundle.domainPack,
      ...bundle.concepts,
      ...bundle.skills,
      ...bundle.formulas,
      ...bundle.rules,
      ...bundle.processPatterns,
      ...bundle.documents,
      ...bundle.metrics,
      ...bundle.evaluationCases,
    ];

    for (const item of globalItems) {
      try {
        validateSemanticId(item.semanticId);
        const scopeInput: {
          readonly scope: "GLOBAL";
          readonly workspaceId?: string;
          readonly label: string;
        } = {
          scope: "GLOBAL",
          label: item.semanticId,
        };
        const workspaceId = (item as { readonly workspaceId?: string })
          .workspaceId;
        validateSemanticScope(
          workspaceId === undefined
            ? scopeInput
            : { ...scopeInput, workspaceId },
        );
      } catch (error) {
        errors.push({
          code:
            (item as { readonly workspaceId?: string }).workspaceId !==
            undefined
              ? "TENANT_BOUNDARY_VIOLATION"
              : "INVALID_SEMANTIC_ID",
          message:
            error instanceof Error ? error.message : "Invalid semantic item.",
          semanticId: item.semanticId,
        });
      }
      errors.push(...this.validateProvenance(item.semanticId, item.provenance));
    }

    const conceptIds = new Set(
      bundle.concepts.map((concept) => concept.semanticId),
    );
    const skillIds = new Set(bundle.skills.map((skill) => skill.semanticId));
    for (const conceptId of bundle.domainPack.conceptIds) {
      if (!conceptIds.has(conceptId)) {
        errors.push({
          code: "UNKNOWN_CONCEPT",
          message: `Domain pack references unknown concept: ${conceptId}`,
          semanticId: bundle.domainPack.semanticId,
        });
      }
    }
    for (const skill of bundle.skills) {
      if (skill.executionAuthority.length === 0) {
        errors.push({
          code: "MISSING_EXECUTION_AUTHORITY",
          message: "Business skills must declare execution authority.",
          semanticId: skill.semanticId,
        });
      }
      errors.push(
        ...validateBusinessDataContract(skill.semanticId, skill.inputContract),
      );
      errors.push(
        ...validateBusinessDataContract(skill.semanticId, skill.outputContract),
      );
      if (
        skill.deterministicImplementation?.formulaId &&
        !["DETERMINISTIC_REQUIRED", "EXECUTABLE"].includes(
          skill.executionAuthority,
        )
      ) {
        errors.push({
          code: "INVALID_CALCULATION_AUTHORITY",
          message:
            "Authoritative calculation skills cannot use free-form LLM authority.",
          semanticId: skill.semanticId,
        });
      }
      if (
        (skill.riskClass === "HIGH" || skill.riskClass === "CRITICAL") &&
        skill.writes.length > 0 &&
        (skill.requiredPermissions.length === 0 ||
          !skill.actionBinding?.actionWallOperationId)
      ) {
        errors.push({
          code: "MISSING_ACTION_WALL_METADATA",
          message:
            "High-risk mutation skills must declare permissions and Action Wall metadata.",
          semanticId: skill.semanticId,
        });
      }
    }
    for (const formula of bundle.formulas) {
      if (
        formula.executionAuthority !== "DETERMINISTIC_REQUIRED" &&
        formula.executionAuthority !== "EXECUTABLE"
      ) {
        errors.push({
          code: "INVALID_FORMULA_AUTHORITY",
          message: "Business formulas require deterministic authority.",
          semanticId: formula.semanticId,
        });
      }
    }
    for (const pattern of bundle.processPatterns) {
      for (const skillId of pattern.relatedSkillIds) {
        if (!skillIds.has(skillId)) {
          errors.push({
            code: "UNKNOWN_SKILL",
            message: `Process pattern references unknown skill: ${skillId}`,
            semanticId: pattern.semanticId,
          });
        }
      }
    }
    return errors;
  }

  private validateProvenance(
    semanticId: SemanticId,
    provenance: BusinessKnowledgeProvenance,
  ): BusinessExpertiseRegistryValidationError[] {
    const errors: BusinessExpertiseRegistryValidationError[] = [];
    for (const sourceId of provenance.sourceIds) {
      const source = this.sources.get(sourceId);
      if (!source) {
        errors.push({
          code: "UNKNOWN_SOURCE",
          message: `Unknown business knowledge source: ${sourceId}`,
          semanticId,
          sourceId,
        });
        continue;
      }
      if (
        provenance.use === "IMPORTED_FROM" &&
        (source.licenseStatus !== "VERIFIED" ||
          !source.permittedUsage.includes("IMPORT") ||
          !["ADOPT", "ADAPT"].includes(source.decision))
      ) {
        errors.push({
          code: "SOURCE_NOT_APPROVED_FOR_IMPORT",
          message: `Source is not approved for trusted imported knowledge: ${sourceId}`,
          semanticId,
          sourceId,
        });
      }
    }
    return errors;
  }

  private allConcepts(): readonly BusinessConceptDefinition[] {
    return [...this.domainPacks.values()].flatMap((bundle) => bundle.concepts);
  }

  private allSkills(): readonly BusinessSkillDefinition[] {
    return [...this.domainPacks.values()].flatMap((bundle) => bundle.skills);
  }

  private allFormulas(): readonly BusinessFormulaDefinition[] {
    return [...this.domainPacks.values()].flatMap((bundle) => bundle.formulas);
  }

  private allProcessPatterns(): readonly BusinessProcessPatternDefinition[] {
    return [...this.domainPacks.values()].flatMap(
      (bundle) => bundle.processPatterns,
    );
  }

  private allDocuments(): readonly BusinessDocumentDefinition[] {
    return [...this.domainPacks.values()].flatMap((bundle) => bundle.documents);
  }

  private allEvaluationCases(): readonly BLMEvaluationCase[] {
    return [...this.domainPacks.values()].flatMap(
      (bundle) => bundle.evaluationCases,
    );
  }
}

function validateBusinessDataContract(
  semanticId: SemanticId,
  contract: BusinessDataContractDefinition,
): BusinessExpertiseRegistryValidationError[] {
  const errors: BusinessExpertiseRegistryValidationError[] = [];
  const seen = new Set<string>();
  for (const field of contract.fields) {
    if (seen.has(field.key)) {
      errors.push({
        code: "INVALID_CONTRACT",
        message: `Duplicate contract field: ${field.key}`,
        semanticId,
        field: field.key,
      });
    }
    seen.add(field.key);
  }
  return errors;
}

const retrievedAt = "2026-08-11";

export const blmSourceManifestV1: readonly BusinessKnowledgeSource[] = [
  {
    id: "moqui.mantle-udm",
    name: "Mantle Universal Data Model",
    sourceType: "OPEN_SOURCE_MODEL",
    canonicalLocation: "https://github.com/moqui/mantle-udm",
    upstreamProject: "moqui/mantle-udm",
    version: "v2.2.0; master inspected",
    commitSha: "f53aba96a14fc97c6b42918300ee880fa0eb03a1",
    retrievedAt,
    license: "CC0 1.0 Universal plus separate patent grant",
    licenseStatus: "VERIFIED",
    licenseConfidence: "HIGH",
    attributionRequirements: ["Preserve source provenance in Flow mappings."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP", "ADAPT", "IMPORT"],
    importPolicy: "ADAPT_WITH_ATTRIBUTION",
    mappingPolicy: "VERSIONED_MAPPING_ONLY",
    decision: "ADAPT",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://github.com/moqui/mantle-udm",
        "https://www.moqui.org/mantle.html",
      ],
      notes:
        "Highest-priority universal business model seed; no upstream code ingested.",
    },
  },
  {
    id: "moqui.mantle-usl",
    name: "Mantle Universal Service Library",
    sourceType: "OPEN_SOURCE_MODEL",
    canonicalLocation: "https://github.com/moqui/mantle-usl",
    upstreamProject: "moqui/mantle-usl",
    version: "v2.2.0; master inspected",
    commitSha: "6b6ce35e7a000b5e476d51f91413bc98d7f75f89",
    retrievedAt,
    license: "CC0 1.0 Universal plus separate patent grant",
    licenseStatus: "VERIFIED",
    licenseConfidence: "HIGH",
    attributionRequirements: [
      "Preserve source provenance in Flow service/skill mappings.",
    ],
    permittedUsage: ["STUDY", "REFERENCE", "MAP", "ADAPT", "IMPORT"],
    importPolicy: "ADAPT_WITH_ATTRIBUTION",
    mappingPolicy: "VERSIONED_MAPPING_ONLY",
    decision: "ADAPT",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://github.com/moqui/mantle-usl/blob/master/LICENSE.md",
      ],
      notes:
        "Reference for service/skill coverage; no upstream code executed or ingested.",
    },
  },
  {
    id: "semanticarts.gist",
    name: "gist Enterprise Upper Ontology",
    sourceType: "ONTOLOGY",
    canonicalLocation: "https://github.com/semanticarts/gist",
    upstreamProject: "semanticarts/gist",
    version: "main inspected",
    commitSha: "c73068bfe779db2643b1e43c920cc8039b15a013",
    retrievedAt,
    license: "Creative Commons Attribution 4.0 International",
    licenseStatus: "VERIFIED",
    licenseConfidence: "HIGH",
    attributionRequirements: [
      "Provide attribution.",
      "Terms used from gist remain in the gist namespace.",
      "Do not define Flow-owned terms in the gist namespace.",
    ],
    permittedUsage: ["STUDY", "REFERENCE", "MAP", "ADAPT"],
    importPolicy: "MAP_ONLY",
    mappingPolicy: "PRESERVE_EXTERNAL_NAMESPACE",
    decision: "ADAPT",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://github.com/semanticarts/gist",
        "https://www.semanticarts.com/gist/",
      ],
      notes: "Upper ontology reference only; Flow concepts remain Flow-owned.",
    },
  },
  {
    id: "edmcouncil.fibo",
    name: "Financial Industry Business Ontology",
    sourceType: "ONTOLOGY",
    canonicalLocation: "https://github.com/edmcouncil/fibo",
    upstreamProject: "edmcouncil/fibo",
    version: "master inspected",
    commitSha: "119fa8c091aa4beece7d22aefa6fe138021a4355",
    retrievedAt,
    license: "MIT",
    licenseStatus: "VERIFIED",
    licenseConfidence: "HIGH",
    attributionRequirements: [
      "Preserve EDM Council copyright and attribution.",
    ],
    permittedUsage: ["STUDY", "REFERENCE", "MAP", "ADAPT", "IMPORT"],
    importPolicy: "MAP_ONLY",
    mappingPolicy: "PRESERVE_EXTERNAL_NAMESPACE",
    decision: "ADAPT",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://github.com/edmcouncil/fibo/blob/master/LICENSE",
        "https://github.com/edmcouncil/fibo/blob/master/ONTOLOGY_GUIDE.md",
      ],
      notes: "Selective finance mapping only; no wholesale ontology import.",
    },
  },
  {
    id: "oagi.score",
    name: "OAGi connectCenter / Score",
    sourceType: "REFERENCE_IMPLEMENTATION",
    canonicalLocation: "https://github.com/OAGi/Score",
    upstreamProject: "OAGi/Score",
    version: "master inspected",
    commitSha: "08afc22ba71794e5860e06132a0996982f61d490",
    retrievedAt,
    license: "MIT",
    licenseStatus: "VERIFIED",
    licenseConfidence: "MEDIUM",
    attributionRequirements: ["Preserve OAGi/NIST attribution for mappings."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "REFERENCE_ONLY",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "REFERENCE_ONLY",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://github.com/OAGi/Score",
        "https://oagi.org/pages/connectcenter",
      ],
      notes:
        "Pattern reference for core component plus context/profile to constrained schema.",
    },
  },
  {
    id: "oasis.ubl-2.4",
    name: "OASIS Universal Business Language 2.4",
    sourceType: "STANDARD",
    canonicalLocation: "https://docs.oasis-open.org/ubl/UBL-2.4.html",
    upstreamProject: "OASIS UBL TC",
    version: "2.4",
    retrievedAt,
    license:
      "OASIS standards terms; freely available per official specification",
    licenseStatus: "VERIFIED",
    licenseConfidence: "MEDIUM",
    attributionRequirements: ["Preserve OASIS UBL versioned references."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "MAP_ONLY",
    mappingPolicy: "VERSIONED_MAPPING_ONLY",
    decision: "ADAPT",
    ingested: false,
    provenance: {
      verifiedFrom: ["https://docs.oasis-open.org/ubl/UBL-2.4.html"],
      notes: "Commercial document mapping reference; schemas not ingested.",
    },
  },
  {
    id: "xbrl.global-ledger",
    name: "XBRL Global Ledger Taxonomy Framework",
    sourceType: "STANDARD",
    canonicalLocation:
      "https://www.xbrl.org/int/gl/2015-03-25/gl-framework-REC-2015-03-25.html",
    upstreamProject: "XBRL International",
    version: "2015-03-25 recommendation",
    retrievedAt,
    license: "XBRL International IP policy; modification restrictions noted",
    licenseStatus: "REVIEW_REQUIRED",
    licenseConfidence: "MEDIUM",
    attributionRequirements: [
      "Preserve XBRL International copyright and references.",
    ],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "MAP_ONLY",
    mappingPolicy: "VERSIONED_MAPPING_ONLY",
    decision: "DEFER",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://www.xbrl.org/the-standard/what/global-ledger/",
        "https://www.xbrl.org/int/gl/2015-03-25/gl-framework-REC-2015-03-25.html",
      ],
      notes: "Finance mapping candidate; import requires legal review.",
    },
  },
  {
    id: "w3c.org",
    name: "W3C Organization Ontology",
    sourceType: "ONTOLOGY",
    canonicalLocation: "https://www.w3.org/TR/vocab-org/",
    upstreamProject: "W3C",
    version: "2014 Recommendation",
    retrievedAt,
    license: "W3C document/software licensing",
    licenseStatus: "VERIFIED",
    licenseConfidence: "MEDIUM",
    attributionRequirements: ["Preserve W3C namespace/version references."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "MAP_ONLY",
    mappingPolicy: "PRESERVE_EXTERNAL_NAMESPACE",
    decision: "ADAPT",
    ingested: false,
    provenance: {
      verifiedFrom: ["https://www.w3.org/TR/vocab-org/"],
      notes: "Organization/role mapping reference.",
    },
  },
  {
    id: "w3c.prov-o",
    name: "W3C PROV-O",
    sourceType: "ONTOLOGY",
    canonicalLocation: "https://www.w3.org/TR/prov-o/",
    upstreamProject: "W3C",
    version: "2013 Recommendation",
    retrievedAt,
    license: "W3C document/software licensing",
    licenseStatus: "VERIFIED",
    licenseConfidence: "MEDIUM",
    attributionRequirements: ["Preserve W3C namespace/version references."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "MAP_ONLY",
    mappingPolicy: "PRESERVE_EXTERNAL_NAMESPACE",
    decision: "ADAPT",
    ingested: false,
    provenance: {
      verifiedFrom: ["https://www.w3.org/TR/prov-o/"],
      notes: "Architectural inspiration for Flow source provenance.",
    },
  },
  {
    id: "w3c.shacl",
    name: "W3C SHACL",
    sourceType: "STANDARD",
    canonicalLocation: "https://www.w3.org/TR/shacl/",
    upstreamProject: "W3C",
    version: "1.0 Recommendation; 1.2 current work noted",
    retrievedAt,
    license: "W3C document/software licensing",
    licenseStatus: "VERIFIED",
    licenseConfidence: "MEDIUM",
    attributionRequirements: ["Preserve W3C namespace/version references."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "REFERENCE_ONLY",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "REFERENCE_ONLY",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://www.w3.org/TR/shacl/",
        "https://www.w3.org/TR/shacl12-core/",
      ],
      notes: "Validation concept reference only; no RDF runtime added.",
    },
  },
  {
    id: "w3c.skos",
    name: "W3C SKOS",
    sourceType: "ONTOLOGY",
    canonicalLocation: "https://www.w3.org/TR/skos-reference/",
    upstreamProject: "W3C",
    version: "2009 Recommendation",
    retrievedAt,
    license: "W3C document/software licensing",
    licenseStatus: "VERIFIED",
    licenseConfidence: "MEDIUM",
    attributionRequirements: ["Preserve W3C namespace/version references."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "MAP_ONLY",
    mappingPolicy: "PRESERVE_EXTERNAL_NAMESPACE",
    decision: "ADAPT",
    ingested: false,
    provenance: {
      verifiedFrom: ["https://www.w3.org/TR/skos-reference/"],
      notes: "Terminology/synonym mapping inspiration.",
    },
  },
  {
    id: "omg.bpmn",
    name: "Business Process Model and Notation",
    sourceType: "STANDARD",
    canonicalLocation: "https://www.omg.org/spec/BPMN/2.0.2",
    upstreamProject: "OMG",
    version: "2.0.2",
    retrievedAt,
    license: "OMG specification terms",
    licenseStatus: "REVIEW_REQUIRED",
    licenseConfidence: "LOW",
    attributionRequirements: ["Preserve OMG specification references."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "REFERENCE_ONLY",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "REFERENCE_ONLY",
    ingested: false,
    provenance: {
      verifiedFrom: ["https://www.omg.org/spec/BPMN/2.0.2/About-BPMN"],
      notes: "Process pattern inspiration only; no workflow engine.",
    },
  },
  {
    id: "omg.dmn",
    name: "Decision Model and Notation",
    sourceType: "STANDARD",
    canonicalLocation: "https://www.omg.org/spec/DMN/",
    upstreamProject: "OMG",
    version: "Current OMG DMN family inspected",
    retrievedAt,
    license: "OMG specification terms",
    licenseStatus: "REVIEW_REQUIRED",
    licenseConfidence: "LOW",
    attributionRequirements: ["Preserve OMG specification references."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "REFERENCE_ONLY",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "REFERENCE_ONLY",
    ingested: false,
    provenance: {
      verifiedFrom: ["https://www.omg.org/spec/DMN/1.6/Beta1/About-DMN"],
      notes: "Business rule/decision inspiration only; no DMN engine.",
    },
  },
  {
    id: "hropen.standards",
    name: "HR Open Standards",
    sourceType: "STANDARD",
    canonicalLocation: "https://www.hropenstandards.org/",
    upstreamProject: "HR Open Standards Consortium",
    version: "Current official site/GitHub org inspected",
    retrievedAt,
    license: "REVIEW_REQUIRED",
    licenseStatus: "REVIEW_REQUIRED",
    licenseConfidence: "LOW",
    attributionRequirements: ["Review license before any ingestion."],
    permittedUsage: ["STUDY", "REFERENCE"],
    importPolicy: "NO_INGESTION",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "DEFER",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://www.hropenstandards.org/",
        "https://github.com/HROpen",
      ],
      notes: "HR mapping candidate; license not clear enough for ingestion.",
    },
  },
  {
    id: "gs1.epcis",
    name: "GS1 EPCIS and CBV",
    sourceType: "STANDARD",
    canonicalLocation: "https://www.gs1.org/standards/epcis",
    upstreamProject: "GS1",
    version: "EPCIS/CBV 2.0 current standard page inspected",
    retrievedAt,
    license: "GS1 standard terms",
    licenseStatus: "REVIEW_REQUIRED",
    licenseConfidence: "LOW",
    attributionRequirements: [
      "Review GS1 terms before importing controlled vocabulary.",
    ],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "MAP_ONLY",
    mappingPolicy: "VERSIONED_MAPPING_ONLY",
    decision: "DEFER",
    ingested: false,
    provenance: {
      verifiedFrom: ["https://www.gs1.org/standards/epcis"],
      notes: "Inventory event mapping candidate; no vocabulary ingestion.",
    },
  },
  {
    id: "accord.cicero",
    name: "Accord Project Cicero",
    sourceType: "REFERENCE_IMPLEMENTATION",
    canonicalLocation: "https://accordproject.org/projects/cicero/",
    upstreamProject: "Accord Project",
    version: "Current project/repositories inspected",
    retrievedAt,
    license: "Apache-2.0 for source; CC-BY-4.0 for documentation",
    licenseStatus: "VERIFIED",
    licenseConfidence: "MEDIUM",
    attributionRequirements: [
      "Preserve Accord Project attribution and license notices.",
    ],
    permittedUsage: ["STUDY", "REFERENCE", "MAP", "ADAPT"],
    importPolicy: "REFERENCE_ONLY",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "REFERENCE_ONLY",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://accordproject.org/projects/cicero/",
        "https://github.com/accordproject/cicero-template-library",
      ],
      notes: "Contract/document pattern reference only.",
    },
  },
  {
    id: "un.isic-rev5",
    name: "UN ISIC Revision 5",
    sourceType: "STANDARD",
    canonicalLocation:
      "https://unstats.un.org/unsd/classifications/Family/Detail/2095",
    upstreamProject: "United Nations Statistics Division",
    version: "Revision 5",
    retrievedAt,
    license: "REVIEW_REQUIRED",
    licenseStatus: "REVIEW_REQUIRED",
    licenseConfidence: "LOW",
    attributionRequirements: ["Review UN terms before ingestion."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP"],
    importPolicy: "MAP_ONLY",
    mappingPolicy: "VERSIONED_MAPPING_ONLY",
    decision: "DEFER",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://unstats.un.org/unsd/classifications/Family/Detail/2095",
      ],
      notes: "Future industry classification reference; no code list imported.",
    },
  },
  {
    id: "mcp.specification",
    name: "Model Context Protocol Specification",
    sourceType: "PROTOCOL",
    canonicalLocation:
      "https://modelcontextprotocol.io/specification/2025-06-18",
    upstreamProject: "modelcontextprotocol/modelcontextprotocol",
    version: "2025-06-18 specification",
    retrievedAt,
    license: "MIT",
    licenseStatus: "VERIFIED",
    licenseConfidence: "HIGH",
    attributionRequirements: ["Preserve MCP specification attribution."],
    permittedUsage: ["STUDY", "REFERENCE", "MAP", "ADAPT"],
    importPolicy: "REFERENCE_ONLY",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "REFERENCE_ONLY",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://modelcontextprotocol.io/specification/2025-06-18",
        "https://github.com/modelcontextprotocol/modelcontextprotocol",
      ],
      notes: "Adapter boundary reference only; BLM skills remain canonical.",
    },
  },
  {
    id: "apache.ofbiz-framework",
    name: "Apache OFBiz Framework",
    sourceType: "REFERENCE_IMPLEMENTATION",
    canonicalLocation: "https://github.com/apache/ofbiz-framework",
    upstreamProject: "apache/ofbiz-framework",
    version: "trunk inspected",
    commitSha: "90c5ae72dfef79cae62adbf06e3d65ef1af31ea1",
    retrievedAt,
    license: "Apache-2.0",
    licenseStatus: "VERIFIED",
    licenseConfidence: "HIGH",
    attributionRequirements: ["Preserve Apache attribution if ever reused."],
    permittedUsage: ["STUDY", "REFERENCE"],
    importPolicy: "REFERENCE_ONLY",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "REFERENCE_ONLY",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://ofbiz.apache.org/",
        "https://github.com/apache/ofbiz-framework",
      ],
      notes: "Comparative ERP coverage reference only; no code copied.",
    },
  },
  {
    id: "frappe.erpnext",
    name: "ERPNext",
    sourceType: "REFERENCE_IMPLEMENTATION",
    canonicalLocation: "https://github.com/frappe/erpnext",
    upstreamProject: "frappe/erpnext",
    version: "develop inspected",
    commitSha: "575f34e7c66c4100fc3fe4e8a26616b3e0a831ff",
    retrievedAt,
    license: "GPL-3.0",
    licenseStatus: "RESTRICTED",
    licenseConfidence: "HIGH",
    attributionRequirements: [
      "Do not copy GPL code or derived structure into Flow.",
    ],
    permittedUsage: ["STUDY", "REFERENCE"],
    importPolicy: "NO_INGESTION",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "REFERENCE_ONLY",
    ingested: false,
    provenance: {
      verifiedFrom: ["https://github.com/frappe/erpnext"],
      notes: "Reference implementation only due GPL boundary.",
    },
  },
  {
    id: "odoo.odoo",
    name: "Odoo Community",
    sourceType: "REFERENCE_IMPLEMENTATION",
    canonicalLocation: "https://github.com/odoo/odoo",
    upstreamProject: "odoo/odoo",
    version: "19.0 inspected",
    commitSha: "5e84fdd99e34836a15cadc4fdf4b6bc449727e58",
    retrievedAt,
    license: "LGPL-3.0",
    licenseStatus: "RESTRICTED",
    licenseConfidence: "HIGH",
    attributionRequirements: ["Do not copy LGPL code into Flow contracts."],
    permittedUsage: ["STUDY", "REFERENCE"],
    importPolicy: "NO_INGESTION",
    mappingPolicy: "REFERENCE_SUMMARY_ONLY",
    decision: "REFERENCE_ONLY",
    ingested: false,
    provenance: {
      verifiedFrom: [
        "https://github.com/odoo/odoo",
        "https://www.odoo.com/documentation/19.0/legal/licenses.html",
      ],
      notes: "Comparative coverage reference only.",
    },
  },
];

export const externalBenchmarkRegistryV1: readonly ExternalBenchmarkReference[] =
  [
    {
      id: "bizbench.quantitative-business-finance",
      source: "https://aclanthology.org/2024.acl-long.452/",
      license: "Dataset license requires review before download",
      tasks: ["business and finance quantitative reasoning"],
      domain: "business-finance",
      plannedUse: "Future benchmark comparison after legal review.",
      ingestionStatus: "REVIEW_REQUIRED",
    },
    {
      id: "finqa.financial-numerical-reasoning",
      source: "https://finqasite.github.io/",
      license: "CC-BY-4.0 per official dataset site",
      tasks: ["financial QA", "numerical reasoning", "explainable programs"],
      domain: "finance",
      plannedUse: "Future finance evaluation seed; not downloaded in v1.",
      ingestionStatus: "NOT_INGESTED",
    },
  ];

const universalCoreDomainId = toSemanticId(
  "flow.concept.blm.domain.universal-core",
);
const crmSalesDomainId = toSemanticId("flow.concept.blm.domain.crm-sales");
const financeAccountingDomainId = toSemanticId(
  "flow.concept.blm.domain.finance-accounting",
);
const inventoryProcurementDomainId = toSemanticId(
  "flow.concept.blm.domain.inventory-procurement",
);

export const blmDomainPackIdsV1 = {
  universalCore: universalCoreDomainId,
  crmSales: crmSalesDomainId,
  financeAccounting: financeAccountingDomainId,
  inventoryProcurement: inventoryProcurementDomainId,
} as const;

const flowNativeProvenance: BusinessKnowledgeProvenance = {
  sourceIds: [],
  use: "FLOW_NATIVE",
  notes: "Flow-owned canonical BLM proof definition.",
};

function sourceProvenance(
  sourceIds: readonly string[],
  use: BusinessKnowledgeProvenanceUse,
  notes: string,
): BusinessKnowledgeProvenance {
  return { sourceIds, use, notes };
}

function concept(input: {
  readonly id: string;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly capabilityIds?: readonly SemanticId[];
  readonly relatedConceptIds?: readonly SemanticId[];
  readonly externalMappings?: readonly ExternalStandardMapping[];
  readonly provenance?: BusinessKnowledgeProvenance;
}): BusinessConceptDefinition {
  return {
    semanticId: toSemanticId(input.id),
    name: input.name,
    description: `${input.name} business concept.`,
    aliases: input.aliases ?? [],
    capabilityIds: input.capabilityIds ?? [],
    relatedConceptIds: input.relatedConceptIds ?? [],
    externalMappings: input.externalMappings ?? [],
    provenance: input.provenance ?? flowNativeProvenance,
    scope: "GLOBAL",
  };
}

function capability(id: string): SemanticId {
  return toSemanticId(`flow.capability.${id}`);
}

function action(id: string): SemanticId {
  return toSemanticId(`flow.action.${id}`);
}

function process(id: string): SemanticId {
  return toSemanticId(`flow.process.${id}`);
}

function documentId(id: string): SemanticId {
  return toSemanticId(`flow.contract.document.${id}`);
}

function formulaId(id: string): SemanticId {
  return toSemanticId(`flow.decision.formula.${id}`);
}

function metricId(id: string): SemanticId {
  return toSemanticId(`flow.decision.metric.${id}`);
}

function ruleId(id: string): SemanticId {
  return toSemanticId(`flow.decision.rule.${id}`);
}

function evaluationId(id: string): SemanticId {
  return toSemanticId(`flow.contract.evaluation.${id}`);
}

const partyId = toSemanticId("flow.concept.universal.party");
const organizationId = toSemanticId("flow.concept.universal.organization");
const productId = toSemanticId("flow.concept.universal.product");
const moneyId = toSemanticId("flow.concept.universal.money");
const currencyId = toSemanticId("flow.concept.universal.currency");
const quantityId = toSemanticId("flow.concept.universal.quantity");
const documentConceptId = toSemanticId("flow.concept.universal.document");
const agreementId = toSemanticId("flow.concept.universal.agreement");
const accountId = toSemanticId("flow.concept.universal.account");
const periodId = toSemanticId("flow.concept.universal.period");
const leadId = toSemanticId("flow.concept.crm.lead");
const opportunityId = toSemanticId("flow.concept.crm.opportunity");
const quoteId = toSemanticId("flow.concept.sales.quote");
const salesOrderId = toSemanticId("flow.concept.sales.sales-order");
const invoiceId = toSemanticId("flow.concept.finance.invoice");
const invoiceLineId = toSemanticId("flow.concept.finance.invoice-line");
const revenueId = toSemanticId("flow.concept.finance.revenue");
const cogsId = toSemanticId("flow.concept.finance.cogs");
const grossProfitId = toSemanticId("flow.concept.finance.gross-profit");
const grossMarginId = toSemanticId("flow.concept.finance.gross-margin");
const inventoryItemId = toSemanticId("flow.concept.inventory.inventory-item");
const stockLevelId = toSemanticId("flow.concept.inventory.stock-level");
const reservationId = toSemanticId("flow.concept.inventory.reservation");
const purchaseOrderId = toSemanticId("flow.concept.procurement.purchase-order");

const leadManagementCapability = capability("crm.lead-management");
const quotationManagementCapability = capability("sales.quotation-management");
const quoteCalculationCapability = capability("sales.quote-calculation");
const invoicingCapability = capability("finance.invoicing");
const financialAnalysisCapability = capability("finance.financial-analysis");
const inventoryAvailabilityCapability = capability("inventory.availability");
const procurementCapability = capability(
  "procurement.purchase-order-management",
);

const grossProfitFormulaId = formulaId("finance.gross-profit");
const grossMarginFormulaId = formulaId("finance.gross-margin");
const invoiceTotalFormulaId = formulaId("finance.invoice-total");

const createLeadSkillId = action("crm.create-lead");
const qualifyLeadSkillId = action("crm.qualify-lead");
const updateOpportunitySkillId = action("crm.update-opportunity");
const createQuoteSkillId = action("sales.create-quote");
const calculateQuoteTotalSkillId = action("sales.calculate-quote-total");
const explainGrossMarginSkillId = action("finance.explain-gross-margin");
const calculateGrossMarginSkillId = action("finance.calculate-gross-margin");
const reserveInventorySkillId = action("inventory.reserve-stock");

function basicContract(
  fields: readonly BusinessContractFieldDefinition[],
): BusinessDataContractDefinition {
  return { version: 1, fields };
}

function requiredString(key: string): BusinessContractFieldDefinition {
  return { key, type: "STRING", required: true };
}

function requiredMoney(key: string): BusinessContractFieldDefinition {
  return { key, type: "MONEY", required: true };
}

export const universalCorePackV1: BusinessDomainPackBundle = {
  domainPack: {
    semanticId: universalCoreDomainId,
    name: "Universal Core",
    version: "1.0.0",
    lifecycle: "FOUNDATION",
    description: "Shared business primitives used by all BLM domain packs.",
    conceptIds: [
      partyId,
      toSemanticId("flow.concept.universal.person"),
      organizationId,
      toSemanticId("flow.concept.universal.role"),
      toSemanticId("flow.concept.universal.contact-point"),
      toSemanticId("flow.concept.universal.address"),
      toSemanticId("flow.concept.universal.location"),
      productId,
      toSemanticId("flow.concept.universal.service"),
      moneyId,
      currencyId,
      quantityId,
      toSemanticId("flow.concept.universal.unit"),
      documentConceptId,
      agreementId,
      toSemanticId("flow.concept.universal.event"),
      toSemanticId("flow.concept.universal.resource"),
      toSemanticId("flow.concept.universal.status"),
      toSemanticId("flow.concept.universal.classification"),
      toSemanticId("flow.concept.universal.identifier"),
      accountId,
      periodId,
    ],
    capabilityIds: [],
    skillIds: [],
    formulaIds: [],
    ruleIds: [],
    processPatternIds: [],
    documentIds: [],
    metricIds: [],
    externalSourceIds: [
      "moqui.mantle-udm",
      "semanticarts.gist",
      "w3c.org",
      "w3c.prov-o",
      "w3c.skos",
    ],
    provenance: sourceProvenance(
      ["moqui.mantle-udm", "semanticarts.gist", "w3c.org"],
      "ADAPTED_FROM",
      "Universal concepts compare Flow-native names with Mantle UDM, gist, and W3C ORG.",
    ),
    scope: "GLOBAL",
  },
  concepts: [
    concept({
      id: "flow.concept.universal.party",
      name: "Party",
      aliases: ["actor", "counterparty"],
      provenance: sourceProvenance(
        ["moqui.mantle-udm", "semanticarts.gist"],
        "ADAPTED_FROM",
        "Party retained as Flow-owned universal concept after comparison with Mantle and gist.",
      ),
    }),
    concept({ id: "flow.concept.universal.person", name: "Person" }),
    concept({
      id: "flow.concept.universal.organization",
      name: "Organization",
      externalMappings: [
        {
          sourceId: "w3c.org",
          externalId: "org:Organization",
          externalLabel: "Organization",
          version: "2014 Recommendation",
          relationship: "RELATED_TO",
          provenance: sourceProvenance(
            ["w3c.org"],
            "MAPPED_TO",
            "Mapping reference only; Flow does not import W3C ORG terms.",
          ),
        },
      ],
    }),
    concept({ id: "flow.concept.universal.role", name: "Role" }),
    concept({
      id: "flow.concept.universal.contact-point",
      name: "ContactPoint",
    }),
    concept({ id: "flow.concept.universal.address", name: "Address" }),
    concept({ id: "flow.concept.universal.location", name: "Location" }),
    concept({ id: "flow.concept.universal.product", name: "Product" }),
    concept({ id: "flow.concept.universal.service", name: "Service" }),
    concept({ id: "flow.concept.universal.money", name: "Money" }),
    concept({ id: "flow.concept.universal.currency", name: "Currency" }),
    concept({ id: "flow.concept.universal.quantity", name: "Quantity" }),
    concept({ id: "flow.concept.universal.unit", name: "Unit" }),
    concept({ id: "flow.concept.universal.document", name: "Document" }),
    concept({ id: "flow.concept.universal.agreement", name: "Agreement" }),
    concept({ id: "flow.concept.universal.event", name: "Event" }),
    concept({ id: "flow.concept.universal.resource", name: "Resource" }),
    concept({ id: "flow.concept.universal.status", name: "Status" }),
    concept({
      id: "flow.concept.universal.classification",
      name: "Classification",
    }),
    concept({ id: "flow.concept.universal.identifier", name: "Identifier" }),
    concept({ id: "flow.concept.universal.account", name: "Account" }),
    concept({ id: "flow.concept.universal.period", name: "Period" }),
  ],
  skills: [],
  formulas: [],
  rules: [],
  processPatterns: [],
  documents: [],
  metrics: [],
  evaluationCases: [
    {
      semanticId: evaluationId("universal.provenance-attached"),
      domainPackId: universalCoreDomainId,
      name: "Universal concepts preserve provenance",
      dimension: "SOURCE_PROVENANCE",
      inputFacts: { concept: "Party" },
      expected: { hasProvenance: true },
      evaluationMode: "DETERMINISTIC_FIXTURE",
      provenance: flowNativeProvenance,
    },
  ],
};

export const crmSalesPackV1: BusinessDomainPackBundle = {
  domainPack: {
    semanticId: crmSalesDomainId,
    name: "CRM and Sales",
    version: "1.0.0",
    lifecycle: "FOUNDATION",
    description:
      "Proof business expertise for leads, opportunities, quotes, and sales orders.",
    conceptIds: [
      leadId,
      toSemanticId("flow.concept.crm.prospect"),
      toSemanticId("flow.concept.crm.customer"),
      toSemanticId("flow.concept.crm.contact"),
      opportunityId,
      toSemanticId("flow.concept.crm.pipeline"),
      quoteId,
      toSemanticId("flow.concept.sales.proposal"),
      salesOrderId,
      toSemanticId("flow.concept.sales.price"),
      toSemanticId("flow.concept.sales.discount"),
      toSemanticId("flow.concept.sales.sales-activity"),
    ],
    capabilityIds: [
      leadManagementCapability,
      quotationManagementCapability,
      quoteCalculationCapability,
    ],
    skillIds: [
      createLeadSkillId,
      qualifyLeadSkillId,
      updateOpportunitySkillId,
      createQuoteSkillId,
      calculateQuoteTotalSkillId,
    ],
    formulaIds: [invoiceTotalFormulaId],
    ruleIds: [ruleId("sales.quote-approval-threshold")],
    processPatternIds: [
      process("crm.lead-to-opportunity"),
      process("sales.opportunity-to-quote"),
      process("sales.quote-to-order"),
    ],
    documentIds: [documentId("sales.quotation"), documentId("sales.proposal")],
    metricIds: [
      metricId("sales.lead-conversion-rate"),
      metricId("sales.average-deal-size"),
    ],
    externalSourceIds: [
      "moqui.mantle-udm",
      "moqui.mantle-usl",
      "oasis.ubl-2.4",
    ],
    provenance: sourceProvenance(
      ["moqui.mantle-udm", "moqui.mantle-usl", "oasis.ubl-2.4"],
      "ADAPTED_FROM",
      "Proof CRM/sales pack inspired by Mantle model/service coverage and UBL document mapping.",
    ),
    scope: "GLOBAL",
  },
  concepts: [
    concept({
      id: "flow.concept.crm.lead",
      name: "Lead",
      capabilityIds: [leadManagementCapability],
    }),
    concept({ id: "flow.concept.crm.prospect", name: "Prospect" }),
    concept({ id: "flow.concept.crm.customer", name: "Customer" }),
    concept({ id: "flow.concept.crm.contact", name: "Contact" }),
    concept({ id: "flow.concept.crm.opportunity", name: "Opportunity" }),
    concept({ id: "flow.concept.crm.pipeline", name: "Pipeline" }),
    concept({
      id: "flow.concept.sales.quote",
      name: "Quote",
      capabilityIds: [quotationManagementCapability],
    }),
    concept({ id: "flow.concept.sales.proposal", name: "Proposal" }),
    concept({ id: "flow.concept.sales.sales-order", name: "SalesOrder" }),
    concept({ id: "flow.concept.sales.price", name: "Price" }),
    concept({ id: "flow.concept.sales.discount", name: "Discount" }),
    concept({ id: "flow.concept.sales.sales-activity", name: "SalesActivity" }),
  ],
  skills: [
    {
      semanticId: createLeadSkillId,
      domainPackId: crmSalesDomainId,
      name: "Create Lead",
      description: "Create a lead through governed Flow execution.",
      conceptIds: [leadId],
      capabilityIds: [leadManagementCapability],
      inputContract: basicContract([
        requiredString("name"),
        requiredString("source"),
      ]),
      outputContract: basicContract([
        { key: "leadId", type: "SEMANTIC_ID", required: true },
      ]),
      reads: [],
      writes: [leadId],
      requiredCapabilities: [leadManagementCapability],
      requiredPermissions: ["crm.lead.create"],
      preconditions: ["User can create CRM leads."],
      postconditions: ["Lead exists as a Flow record."],
      riskClass: "HIGH",
      executionAuthority: "EXECUTABLE",
      actionBinding: {
        actionId: "crm.create_lead",
        actionWallOperationId: "crm.lead.create",
      },
      idempotencyPolicy: "CALLER_PROVIDED_KEY",
      approvalPolicy: "NONE",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: qualifyLeadSkillId,
      domainPackId: crmSalesDomainId,
      name: "Qualify Lead",
      description: "Assess whether a lead can become an opportunity.",
      conceptIds: [leadId, opportunityId],
      capabilityIds: [leadManagementCapability],
      inputContract: basicContract([requiredString("leadId")]),
      outputContract: basicContract([
        { key: "qualified", type: "BOOLEAN", required: true },
      ]),
      reads: [leadId],
      writes: [opportunityId],
      requiredCapabilities: [leadManagementCapability],
      requiredPermissions: ["crm.lead.update"],
      preconditions: ["Lead exists."],
      postconditions: ["Lead qualification status is recorded."],
      riskClass: "MEDIUM",
      executionAuthority: "APPROVAL_REQUIRED",
      actionBinding: {
        actionId: "crm.qualify_lead",
        actionWallOperationId: "crm.lead.update",
      },
      idempotencyPolicy: "REQUIRED",
      approvalPolicy: "THRESHOLD_BASED",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: updateOpportunitySkillId,
      domainPackId: crmSalesDomainId,
      name: "Update Opportunity",
      description: "Update opportunity facts through Flow permissions.",
      conceptIds: [opportunityId],
      capabilityIds: [leadManagementCapability],
      inputContract: basicContract([requiredString("opportunityId")]),
      outputContract: basicContract([
        { key: "updated", type: "BOOLEAN", required: true },
      ]),
      reads: [opportunityId],
      writes: [opportunityId],
      requiredCapabilities: [leadManagementCapability],
      requiredPermissions: ["crm.opportunity.update"],
      preconditions: ["Opportunity exists."],
      postconditions: ["Opportunity update is auditable."],
      riskClass: "HIGH",
      executionAuthority: "EXECUTABLE",
      actionBinding: {
        actionId: "crm.update_opportunity",
        actionWallOperationId: "crm.opportunity.update",
      },
      idempotencyPolicy: "CALLER_PROVIDED_KEY",
      approvalPolicy: "NONE",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: createQuoteSkillId,
      domainPackId: crmSalesDomainId,
      name: "Create Quote",
      description: "Create a quotation draft.",
      conceptIds: [quoteId, opportunityId],
      capabilityIds: [quotationManagementCapability],
      inputContract: basicContract([requiredString("opportunityId")]),
      outputContract: basicContract([
        { key: "quoteId", type: "SEMANTIC_ID", required: true },
      ]),
      reads: [opportunityId],
      writes: [quoteId],
      requiredCapabilities: [quotationManagementCapability],
      requiredPermissions: ["sales.quote.create"],
      preconditions: ["Opportunity exists."],
      postconditions: ["Quote draft exists."],
      riskClass: "HIGH",
      executionAuthority: "EXECUTABLE",
      actionBinding: {
        actionId: "sales.create_quote",
        actionWallOperationId: "sales.quote.create",
      },
      idempotencyPolicy: "CALLER_PROVIDED_KEY",
      approvalPolicy: "NONE",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: calculateQuoteTotalSkillId,
      domainPackId: crmSalesDomainId,
      name: "Calculate Quote Total",
      description:
        "Calculate quote total using deterministic formula authority.",
      conceptIds: [quoteId, moneyId],
      capabilityIds: [quoteCalculationCapability],
      inputContract: basicContract([requiredMoney("lineTotals")]),
      outputContract: basicContract([requiredMoney("total")]),
      reads: [quoteId],
      writes: [],
      requiredCapabilities: [quoteCalculationCapability],
      requiredPermissions: [],
      preconditions: ["Quote line values are present."],
      postconditions: ["Total is calculated by deterministic authority."],
      riskClass: "LOW",
      executionAuthority: "DETERMINISTIC_REQUIRED",
      deterministicImplementation: {
        engine: "FUTURE_DETERMINISTIC_ENGINE",
        formulaId: invoiceTotalFormulaId,
      },
      idempotencyPolicy: "NOT_APPLICABLE",
      approvalPolicy: "NONE",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  formulas: [
    {
      semanticId: invoiceTotalFormulaId,
      domainPackId: crmSalesDomainId,
      name: "Invoice or Quote Total",
      description: "Line totals plus tax minus discounts plus adjustments.",
      inputs: [moneyId],
      output: moneyId,
      representation: "line totals + tax - discounts + adjustments",
      authority: "FUTURE_DETERMINISTIC_ENGINE",
      executionAuthority: "DETERMINISTIC_REQUIRED",
      provenance: sourceProvenance(
        ["oasis.ubl-2.4"],
        "MAPPED_TO",
        "Commercial total maps selectively to UBL monetary document structures.",
      ),
      scope: "GLOBAL",
    },
  ],
  rules: [
    {
      semanticId: ruleId("sales.quote-approval-threshold"),
      domainPackId: crmSalesDomainId,
      name: "Quote Above Threshold Requires Approval",
      description:
        "Quotes above configured workspace threshold require approval.",
      appliesToConceptIds: [quoteId],
      condition: "quote.total > workspace.policy.quoteApprovalThreshold",
      consequence: "approval required before external send",
      authority: "DMN_REFERENCE",
      executionAuthority: "APPROVAL_REQUIRED",
      provenance: sourceProvenance(
        ["omg.dmn"],
        "INSPIRED_BY",
        "DMN concept reference only; no DMN engine.",
      ),
      scope: "GLOBAL",
    },
  ],
  processPatterns: [
    {
      semanticId: process("crm.lead-to-opportunity"),
      domainPackId: crmSalesDomainId,
      name: "Lead-to-Opportunity",
      description: "Qualify lead into a sales opportunity.",
      stepCapabilityIds: [leadManagementCapability],
      relatedSkillIds: [qualifyLeadSkillId],
      relatedDocumentIds: [],
      externalMappings: [],
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: process("sales.opportunity-to-quote"),
      domainPackId: crmSalesDomainId,
      name: "Opportunity-to-Quote",
      description: "Prepare a quotation for an opportunity.",
      stepCapabilityIds: [
        quotationManagementCapability,
        quoteCalculationCapability,
      ],
      relatedSkillIds: [createQuoteSkillId, calculateQuoteTotalSkillId],
      relatedDocumentIds: [documentId("sales.quotation")],
      externalMappings: [],
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: process("sales.quote-to-order"),
      domainPackId: crmSalesDomainId,
      name: "Quote-to-Order",
      description: "Accepted quote can become a sales order.",
      stepCapabilityIds: [quotationManagementCapability],
      relatedSkillIds: [createQuoteSkillId],
      relatedDocumentIds: [documentId("sales.quotation")],
      externalMappings: [],
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  documents: [
    {
      semanticId: documentId("sales.quotation"),
      domainPackId: crmSalesDomainId,
      name: "Quotation",
      description: "Commercial quotation document.",
      participantConceptIds: [partyId, organizationId],
      requiredFieldKeys: ["seller", "buyer", "lineItems", "total", "currency"],
      optionalFieldKeys: ["validUntil", "discounts", "terms"],
      lineItemConceptId: invoiceLineId,
      lifecycle: ["DRAFT", "APPROVED", "SENT", "ACCEPTED", "REJECTED"],
      relatedProcessIds: [
        process("sales.opportunity-to-quote"),
        process("sales.quote-to-order"),
      ],
      relatedSkillIds: [createQuoteSkillId, calculateQuoteTotalSkillId],
      externalMappings: [
        {
          sourceId: "oasis.ubl-2.4",
          externalId: "UBL Quotation",
          externalLabel: "Quotation",
          version: "2.4",
          relationship: "RELATED_TO",
          provenance: sourceProvenance(
            ["oasis.ubl-2.4"],
            "MAPPED_TO",
            "Versioned UBL document mapping only.",
          ),
        },
      ],
      provenance: sourceProvenance(
        ["oasis.ubl-2.4"],
        "MAPPED_TO",
        "Flow-owned quotation definition with UBL mapping.",
      ),
      scope: "GLOBAL",
    },
    {
      semanticId: documentId("sales.proposal"),
      domainPackId: crmSalesDomainId,
      name: "Proposal",
      description: "Sales proposal document.",
      participantConceptIds: [partyId, organizationId],
      requiredFieldKeys: ["recipient", "scope", "price"],
      optionalFieldKeys: ["timeline", "assumptions", "terms"],
      lifecycle: ["DRAFT", "APPROVED", "SENT"],
      relatedProcessIds: [process("sales.opportunity-to-quote")],
      relatedSkillIds: [createQuoteSkillId],
      externalMappings: [],
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  metrics: [
    {
      semanticId: metricId("sales.lead-conversion-rate"),
      domainPackId: crmSalesDomainId,
      name: "Lead Conversion Rate",
      description: "Qualified leads divided by total leads for a period.",
      requiredInputIds: [leadId, opportunityId, periodId],
      unit: "PERCENT",
      timeGrain: "PERIOD",
      calculationAuthority: "DETERMINISTIC_REQUIRED",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: metricId("sales.average-deal-size"),
      domainPackId: crmSalesDomainId,
      name: "Average Deal Size",
      description: "Sales value divided by closed deal count.",
      requiredInputIds: [moneyId, salesOrderId, periodId],
      unit: "MONEY",
      timeGrain: "PERIOD",
      calculationAuthority: "DETERMINISTIC_REQUIRED",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  evaluationCases: [
    {
      semanticId: evaluationId("crm.valid-next-capability"),
      domainPackId: crmSalesDomainId,
      name: "Lead lifecycle valid next capability",
      dimension: "PROCESS_UNDERSTANDING",
      inputFacts: { lifecycleState: "lead_created" },
      expected: { nextCapability: "flow.capability.crm.lead-management" },
      evaluationMode: "DETERMINISTIC_FIXTURE",
      provenance: flowNativeProvenance,
    },
  ],
};

export const financeAccountingPackV1: BusinessDomainPackBundle = {
  domainPack: {
    semanticId: financeAccountingDomainId,
    name: "Finance and Accounting",
    version: "1.0.0",
    lifecycle: "FOUNDATION",
    description:
      "Proof finance/accounting expertise with deterministic formula authority.",
    conceptIds: [
      accountId,
      toSemanticId("flow.concept.finance.chart-of-accounts"),
      toSemanticId("flow.concept.finance.ledger"),
      toSemanticId("flow.concept.finance.journal-entry"),
      toSemanticId("flow.concept.finance.debit"),
      toSemanticId("flow.concept.finance.credit"),
      invoiceId,
      invoiceLineId,
      toSemanticId("flow.concept.finance.payment"),
      toSemanticId("flow.concept.finance.receivable"),
      toSemanticId("flow.concept.finance.payable"),
      revenueId,
      toSemanticId("flow.concept.finance.expense"),
      toSemanticId("flow.concept.finance.asset"),
      toSemanticId("flow.concept.finance.liability"),
      toSemanticId("flow.concept.finance.equity"),
      toSemanticId("flow.concept.finance.tax"),
      currencyId,
      toSemanticId("flow.concept.finance.exchange-rate"),
      periodId,
      cogsId,
      grossProfitId,
      grossMarginId,
    ],
    capabilityIds: [invoicingCapability, financialAnalysisCapability],
    skillIds: [explainGrossMarginSkillId, calculateGrossMarginSkillId],
    formulaIds: [grossProfitFormulaId, grossMarginFormulaId],
    ruleIds: [ruleId("finance.invoice-period-open")],
    processPatternIds: [process("finance.order-to-cash")],
    documentIds: [documentId("finance.invoice")],
    metricIds: [
      metricId("finance.gross-profit"),
      metricId("finance.gross-margin"),
    ],
    externalSourceIds: [
      "moqui.mantle-udm",
      "xbrl.global-ledger",
      "edmcouncil.fibo",
      "oasis.ubl-2.4",
    ],
    provenance: sourceProvenance(
      [
        "moqui.mantle-udm",
        "xbrl.global-ledger",
        "edmcouncil.fibo",
        "oasis.ubl-2.4",
      ],
      "ADAPTED_FROM",
      "Selective finance/accounting mappings only; no standard imported wholesale.",
    ),
    scope: "GLOBAL",
  },
  concepts: [
    concept({ id: "flow.concept.universal.account", name: "Account" }),
    concept({
      id: "flow.concept.finance.chart-of-accounts",
      name: "ChartOfAccounts",
    }),
    concept({ id: "flow.concept.finance.ledger", name: "Ledger" }),
    concept({ id: "flow.concept.finance.journal-entry", name: "JournalEntry" }),
    concept({ id: "flow.concept.finance.debit", name: "Debit" }),
    concept({ id: "flow.concept.finance.credit", name: "Credit" }),
    concept({
      id: "flow.concept.finance.invoice",
      name: "Invoice",
      capabilityIds: [invoicingCapability],
      externalMappings: [
        {
          sourceId: "oasis.ubl-2.4",
          externalId: "UBL Invoice",
          externalLabel: "Invoice",
          version: "2.4",
          relationship: "RELATED_TO",
          provenance: sourceProvenance(
            ["oasis.ubl-2.4"],
            "MAPPED_TO",
            "Versioned document mapping only.",
          ),
        },
      ],
    }),
    concept({ id: "flow.concept.finance.invoice-line", name: "InvoiceLine" }),
    concept({ id: "flow.concept.finance.payment", name: "Payment" }),
    concept({ id: "flow.concept.finance.receivable", name: "Receivable" }),
    concept({ id: "flow.concept.finance.payable", name: "Payable" }),
    concept({ id: "flow.concept.finance.revenue", name: "Revenue" }),
    concept({ id: "flow.concept.finance.expense", name: "Expense" }),
    concept({ id: "flow.concept.finance.asset", name: "Asset" }),
    concept({ id: "flow.concept.finance.liability", name: "Liability" }),
    concept({ id: "flow.concept.finance.equity", name: "Equity" }),
    concept({ id: "flow.concept.finance.tax", name: "Tax" }),
    concept({ id: "flow.concept.universal.currency", name: "Currency" }),
    concept({ id: "flow.concept.finance.exchange-rate", name: "ExchangeRate" }),
    concept({ id: "flow.concept.universal.period", name: "AccountingPeriod" }),
    concept({ id: "flow.concept.finance.cogs", name: "COGS" }),
    concept({ id: "flow.concept.finance.gross-profit", name: "GrossProfit" }),
    concept({ id: "flow.concept.finance.gross-margin", name: "GrossMargin" }),
  ],
  skills: [
    {
      semanticId: explainGrossMarginSkillId,
      domainPackId: financeAccountingDomainId,
      name: "Explain Gross Margin",
      description:
        "Explain the meaning of gross margin without authoritatively calculating it.",
      conceptIds: [grossMarginId],
      capabilityIds: [financialAnalysisCapability],
      inputContract: basicContract([requiredString("question")]),
      outputContract: basicContract([requiredString("explanation")]),
      reads: [grossMarginId],
      writes: [],
      requiredCapabilities: [financialAnalysisCapability],
      requiredPermissions: [],
      preconditions: [],
      postconditions: ["No business record is mutated."],
      riskClass: "LOW",
      executionAuthority: "LLM_ADVISORY",
      idempotencyPolicy: "NOT_APPLICABLE",
      approvalPolicy: "NONE",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: calculateGrossMarginSkillId,
      domainPackId: financeAccountingDomainId,
      name: "Calculate Gross Margin",
      description: "Calculate gross margin through deterministic authority.",
      conceptIds: [grossProfitId, grossMarginId],
      capabilityIds: [financialAnalysisCapability],
      inputContract: basicContract([
        requiredMoney("revenue"),
        requiredMoney("cogs"),
      ]),
      outputContract: basicContract([
        { key: "grossMargin", type: "DECIMAL", required: true },
      ]),
      reads: [revenueId, cogsId],
      writes: [],
      requiredCapabilities: [financialAnalysisCapability],
      requiredPermissions: [],
      preconditions: ["Revenue is non-zero."],
      postconditions: ["Gross margin is reproducible."],
      riskClass: "LOW",
      executionAuthority: "DETERMINISTIC_REQUIRED",
      deterministicImplementation: {
        engine: "FUTURE_DETERMINISTIC_ENGINE",
        formulaId: grossMarginFormulaId,
      },
      idempotencyPolicy: "NOT_APPLICABLE",
      approvalPolicy: "NONE",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  formulas: [
    {
      semanticId: grossProfitFormulaId,
      domainPackId: financeAccountingDomainId,
      name: "Gross Profit",
      description: "Revenue minus cost of goods sold.",
      inputs: [revenueId, cogsId],
      output: grossProfitId,
      representation: "Revenue - COGS",
      authority: "FUTURE_DETERMINISTIC_ENGINE",
      executionAuthority: "DETERMINISTIC_REQUIRED",
      provenance: sourceProvenance(
        ["edmcouncil.fibo", "xbrl.global-ledger"],
        "MAPPED_TO",
        "Finance concept mapping only.",
      ),
      scope: "GLOBAL",
    },
    {
      semanticId: grossMarginFormulaId,
      domainPackId: financeAccountingDomainId,
      name: "Gross Margin",
      description: "Gross profit divided by revenue.",
      inputs: [grossProfitId, revenueId],
      output: grossMarginId,
      representation: "(Revenue - COGS) / Revenue",
      authority: "FUTURE_DETERMINISTIC_ENGINE",
      executionAuthority: "DETERMINISTIC_REQUIRED",
      provenance: sourceProvenance(
        ["edmcouncil.fibo", "xbrl.global-ledger"],
        "MAPPED_TO",
        "Finance concept mapping only.",
      ),
      scope: "GLOBAL",
    },
  ],
  rules: [
    {
      semanticId: ruleId("finance.invoice-period-open"),
      domainPackId: financeAccountingDomainId,
      name: "Invoice Cannot Post To Closed Period",
      description: "Posting requires an open accounting period.",
      appliesToConceptIds: [invoiceId, periodId],
      condition: "accountingPeriod.status == OPEN",
      consequence: "invoice posting allowed; otherwise reject or escalate",
      authority: "DMN_REFERENCE",
      executionAuthority: "DETERMINISTIC_REQUIRED",
      provenance: sourceProvenance(
        ["omg.dmn"],
        "INSPIRED_BY",
        "DMN concept reference only.",
      ),
      scope: "GLOBAL",
    },
  ],
  processPatterns: [
    {
      semanticId: process("finance.order-to-cash"),
      domainPackId: financeAccountingDomainId,
      name: "Order-to-Cash",
      description: "Sales order through invoice and payment.",
      stepCapabilityIds: [quotationManagementCapability, invoicingCapability],
      relatedSkillIds: [],
      relatedDocumentIds: [documentId("finance.invoice")],
      externalMappings: [],
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  documents: [
    {
      semanticId: documentId("finance.invoice"),
      domainPackId: financeAccountingDomainId,
      name: "Invoice",
      description: "Commercial invoice document.",
      participantConceptIds: [partyId, organizationId],
      requiredFieldKeys: [
        "seller",
        "buyer",
        "invoiceLines",
        "total",
        "currency",
      ],
      optionalFieldKeys: ["tax", "paymentTerms"],
      lineItemConceptId: invoiceLineId,
      lifecycle: ["DRAFT", "POSTED", "PAID", "VOID"],
      relatedProcessIds: [process("finance.order-to-cash")],
      relatedSkillIds: [],
      externalMappings: [
        {
          sourceId: "oasis.ubl-2.4",
          externalId: "UBL Invoice",
          externalLabel: "Invoice",
          version: "2.4",
          relationship: "RELATED_TO",
          provenance: sourceProvenance(
            ["oasis.ubl-2.4"],
            "MAPPED_TO",
            "Versioned UBL mapping only.",
          ),
        },
      ],
      provenance: sourceProvenance(
        ["oasis.ubl-2.4"],
        "MAPPED_TO",
        "Flow-owned invoice definition with UBL mapping.",
      ),
      scope: "GLOBAL",
    },
  ],
  metrics: [
    {
      semanticId: metricId("finance.gross-profit"),
      domainPackId: financeAccountingDomainId,
      name: "Gross Profit",
      description: "Revenue less COGS.",
      requiredInputIds: [revenueId, cogsId],
      unit: "MONEY",
      timeGrain: "PERIOD",
      calculationAuthority: "DETERMINISTIC_REQUIRED",
      formulaId: grossProfitFormulaId,
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: metricId("finance.gross-margin"),
      domainPackId: financeAccountingDomainId,
      name: "Gross Margin",
      description: "Gross profit divided by revenue.",
      requiredInputIds: [grossProfitId, revenueId],
      unit: "PERCENT",
      timeGrain: "PERIOD",
      calculationAuthority: "DETERMINISTIC_REQUIRED",
      formulaId: grossMarginFormulaId,
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  evaluationCases: [
    {
      semanticId: evaluationId("finance.gross-margin-deterministic"),
      domainPackId: financeAccountingDomainId,
      name: "Gross margin deterministic expected result",
      dimension: "CALCULATION_CORRECTNESS",
      inputFacts: { revenue: 1000, cogs: 600 },
      expected: { grossProfit: 400, grossMargin: 0.4 },
      evaluationMode: "DETERMINISTIC_FIXTURE",
      provenance: flowNativeProvenance,
    },
  ],
};

export const inventoryProcurementPackV1: BusinessDomainPackBundle = {
  domainPack: {
    semanticId: inventoryProcurementDomainId,
    name: "Inventory and Procurement",
    version: "1.0.0",
    lifecycle: "FOUNDATION",
    description:
      "Proof expertise for supplier purchasing and stock availability.",
    conceptIds: [
      productId,
      toSemanticId("flow.concept.inventory.sku"),
      toSemanticId("flow.concept.procurement.supplier"),
      toSemanticId("flow.concept.procurement.vendor"),
      toSemanticId("flow.concept.procurement.purchase-request"),
      purchaseOrderId,
      toSemanticId("flow.concept.inventory.goods-receipt"),
      toSemanticId("flow.concept.inventory.warehouse"),
      inventoryItemId,
      stockLevelId,
      toSemanticId("flow.concept.inventory.stock-movement"),
      reservationId,
      toSemanticId("flow.concept.inventory.shipment"),
      toSemanticId("flow.concept.inventory.reorder-point"),
    ],
    capabilityIds: [inventoryAvailabilityCapability, procurementCapability],
    skillIds: [reserveInventorySkillId],
    formulaIds: [],
    ruleIds: [ruleId("inventory.prevent-negative-availability")],
    processPatternIds: [
      process("procurement.procure-to-pay"),
      process("inventory.receive-to-stock"),
      process("inventory.reserve-to-fulfill"),
    ],
    documentIds: [
      documentId("procurement.purchase-order"),
      documentId("inventory.goods-receipt"),
    ],
    metricIds: [metricId("inventory.turnover")],
    externalSourceIds: ["moqui.mantle-udm", "gs1.epcis"],
    provenance: sourceProvenance(
      ["moqui.mantle-udm", "gs1.epcis"],
      "ADAPTED_FROM",
      "Inventory concepts are Flow-owned with Mantle and EPCIS mapping references.",
    ),
    scope: "GLOBAL",
  },
  concepts: [
    concept({ id: "flow.concept.universal.product", name: "Product" }),
    concept({ id: "flow.concept.inventory.sku", name: "SKU" }),
    concept({ id: "flow.concept.procurement.supplier", name: "Supplier" }),
    concept({ id: "flow.concept.procurement.vendor", name: "Vendor" }),
    concept({
      id: "flow.concept.procurement.purchase-request",
      name: "PurchaseRequest",
    }),
    concept({
      id: "flow.concept.procurement.purchase-order",
      name: "PurchaseOrder",
    }),
    concept({
      id: "flow.concept.inventory.goods-receipt",
      name: "GoodsReceipt",
      externalMappings: [
        {
          sourceId: "gs1.epcis",
          externalId: "ObjectEvent/receiving",
          externalLabel: "Receiving visibility event",
          version: "2.0",
          relationship: "RELATED_TO",
          provenance: sourceProvenance(
            ["gs1.epcis"],
            "MAPPED_TO",
            "Event concept mapping only.",
          ),
        },
      ],
    }),
    concept({ id: "flow.concept.inventory.warehouse", name: "Warehouse" }),
    concept({
      id: "flow.concept.inventory.inventory-item",
      name: "InventoryItem",
    }),
    concept({
      id: "flow.concept.inventory.stock-level",
      name: "StockLevel",
      capabilityIds: [inventoryAvailabilityCapability],
    }),
    concept({
      id: "flow.concept.inventory.stock-movement",
      name: "StockMovement",
    }),
    concept({ id: "flow.concept.inventory.reservation", name: "Reservation" }),
    concept({ id: "flow.concept.inventory.shipment", name: "Shipment" }),
    concept({
      id: "flow.concept.inventory.reorder-point",
      name: "ReorderPoint",
    }),
  ],
  skills: [
    {
      semanticId: reserveInventorySkillId,
      domainPackId: inventoryProcurementDomainId,
      name: "Reserve Stock",
      description: "Reserve stock through governed inventory execution.",
      conceptIds: [inventoryItemId, stockLevelId, reservationId],
      capabilityIds: [inventoryAvailabilityCapability],
      inputContract: basicContract([
        requiredString("sku"),
        { key: "quantity", type: "DECIMAL", required: true },
      ]),
      outputContract: basicContract([
        { key: "reservationId", type: "SEMANTIC_ID", required: true },
      ]),
      reads: [stockLevelId],
      writes: [reservationId],
      requiredCapabilities: [inventoryAvailabilityCapability],
      requiredPermissions: ["inventory.reservation.create"],
      preconditions: ["Available stock is sufficient under workspace policy."],
      postconditions: ["Reservation is auditable."],
      riskClass: "HIGH",
      executionAuthority: "EXECUTABLE",
      actionBinding: {
        actionId: "inventory.reserve_stock",
        actionWallOperationId: "inventory.reservation.create",
      },
      idempotencyPolicy: "CALLER_PROVIDED_KEY",
      approvalPolicy: "NONE",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  formulas: [],
  rules: [
    {
      semanticId: ruleId("inventory.prevent-negative-availability"),
      domainPackId: inventoryProcurementDomainId,
      name: "Prevent Negative Availability",
      description:
        "Inventory allocation cannot reduce available stock below allowed policy.",
      appliesToConceptIds: [stockLevelId, reservationId],
      condition: "requestedQuantity <= availableQuantity - safetyStock",
      consequence: "reservation allowed; otherwise reject or backorder",
      authority: "DMN_REFERENCE",
      executionAuthority: "DETERMINISTIC_REQUIRED",
      provenance: sourceProvenance(
        ["omg.dmn"],
        "INSPIRED_BY",
        "DMN concept reference only.",
      ),
      scope: "GLOBAL",
    },
  ],
  processPatterns: [
    {
      semanticId: process("procurement.procure-to-pay"),
      domainPackId: inventoryProcurementDomainId,
      name: "Procure-to-Pay",
      description:
        "Purchase request through order, receipt, invoice, and payment.",
      stepCapabilityIds: [procurementCapability, invoicingCapability],
      relatedSkillIds: [],
      relatedDocumentIds: [documentId("procurement.purchase-order")],
      externalMappings: [],
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: process("inventory.receive-to-stock"),
      domainPackId: inventoryProcurementDomainId,
      name: "Receive-to-Stock",
      description: "Record goods receipt and update stock semantics.",
      stepCapabilityIds: [inventoryAvailabilityCapability],
      relatedSkillIds: [],
      relatedDocumentIds: [documentId("inventory.goods-receipt")],
      externalMappings: [
        {
          sourceId: "gs1.epcis",
          externalId: "EPCIS ObjectEvent",
          externalLabel: "Object event",
          version: "2.0",
          relationship: "RELATED_TO",
          provenance: sourceProvenance(
            ["gs1.epcis"],
            "MAPPED_TO",
            "Event mapping only.",
          ),
        },
      ],
      provenance: sourceProvenance(
        ["gs1.epcis"],
        "MAPPED_TO",
        "EPCIS event mapping reference.",
      ),
      scope: "GLOBAL",
    },
    {
      semanticId: process("inventory.reserve-to-fulfill"),
      domainPackId: inventoryProcurementDomainId,
      name: "Reserve-to-Fulfill",
      description: "Reserve available stock before fulfillment.",
      stepCapabilityIds: [inventoryAvailabilityCapability],
      relatedSkillIds: [reserveInventorySkillId],
      relatedDocumentIds: [],
      externalMappings: [],
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  documents: [
    {
      semanticId: documentId("procurement.purchase-order"),
      domainPackId: inventoryProcurementDomainId,
      name: "Purchase Order",
      description: "Procurement purchase order.",
      participantConceptIds: [organizationId, partyId],
      requiredFieldKeys: ["buyer", "supplier", "lineItems", "currency"],
      optionalFieldKeys: ["deliveryTerms", "tax"],
      lifecycle: ["DRAFT", "APPROVED", "SENT", "RECEIVED", "CLOSED"],
      relatedProcessIds: [process("procurement.procure-to-pay")],
      relatedSkillIds: [],
      externalMappings: [
        {
          sourceId: "oasis.ubl-2.4",
          externalId: "UBL Order",
          externalLabel: "Order",
          version: "2.4",
          relationship: "RELATED_TO",
          provenance: sourceProvenance(
            ["oasis.ubl-2.4"],
            "MAPPED_TO",
            "Versioned UBL mapping only.",
          ),
        },
      ],
      provenance: sourceProvenance(
        ["oasis.ubl-2.4"],
        "MAPPED_TO",
        "Document mapping only.",
      ),
      scope: "GLOBAL",
    },
    {
      semanticId: documentId("inventory.goods-receipt"),
      domainPackId: inventoryProcurementDomainId,
      name: "Goods Receipt",
      description: "Receipt document for accepted goods.",
      participantConceptIds: [organizationId, partyId],
      requiredFieldKeys: ["receiver", "supplier", "items", "receivedAt"],
      optionalFieldKeys: ["shipmentReference"],
      lifecycle: ["DRAFT", "POSTED", "VOID"],
      relatedProcessIds: [process("inventory.receive-to-stock")],
      relatedSkillIds: [],
      externalMappings: [],
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  metrics: [
    {
      semanticId: metricId("inventory.turnover"),
      domainPackId: inventoryProcurementDomainId,
      name: "Inventory Turnover",
      description: "COGS divided by average inventory value.",
      requiredInputIds: [cogsId, inventoryItemId, periodId],
      unit: "RATIO",
      timeGrain: "PERIOD",
      calculationAuthority: "DETERMINISTIC_REQUIRED",
      provenance: flowNativeProvenance,
      scope: "GLOBAL",
    },
  ],
  evaluationCases: [
    {
      semanticId: evaluationId("inventory.fulfillment-requires-reservation"),
      domainPackId: inventoryProcurementDomainId,
      name: "Fulfillment requires availability and reservation semantics",
      dimension: "SEMANTIC_UNDERSTANDING",
      inputFacts: { request: "fulfill stocked item" },
      expected: { requiresAvailability: true, requiresReservation: true },
      evaluationMode: "DETERMINISTIC_FIXTURE",
      provenance: flowNativeProvenance,
    },
  ],
};

export const blmBusinessBrainProofPacksV1 = [
  universalCorePackV1,
  crmSalesPackV1,
  financeAccountingPackV1,
  inventoryProcurementPackV1,
] as const satisfies readonly BusinessDomainPackBundle[];

export const blmDomainCoverageManifestV1: readonly BusinessDomainCoverageTrack[] =
  [
    {
      id: "universal-core",
      name: "Universal Core",
      status: "FOUNDATION",
      activeDomainPackIds: [universalCoreDomainId],
      notes:
        "Seed primitives only; not validated as complete business ontology.",
    },
    {
      id: "crm-sales",
      name: "CRM and Sales",
      status: "FOUNDATION",
      activeDomainPackIds: [crmSalesDomainId],
      notes: "Lead, opportunity, quote, and sales-order proof coverage.",
    },
    {
      id: "finance-accounting",
      name: "Finance and Accounting",
      status: "FOUNDATION",
      activeDomainPackIds: [financeAccountingDomainId],
      notes:
        "Core invoice, ledger, gross profit, and gross margin proof coverage.",
    },
    {
      id: "inventory-procurement",
      name: "Inventory and Procurement",
      status: "FOUNDATION",
      activeDomainPackIds: [inventoryProcurementDomainId],
      notes: "Supplier purchase and stock availability proof coverage.",
    },
    ...[
      "commercial-documents",
      "procurement-vendors",
      "product-catalog-pricing",
      "inventory-logistics",
      "projects-work",
      "hr-payroll",
      "assets-rental-maintenance",
      "commerce-pos-marketplace",
      "manufacturing-mrp",
      "service-operations",
      "compliance-policy",
      "analytics-planning",
    ].map((track) => ({
      id: track,
      name: track,
      status: "NOT_STARTED" as const,
      activeDomainPackIds: [],
      notes: "Future domain coverage track.",
    })),
  ];

export function createBusinessBrainFoundationRegistryV1(): BusinessExpertiseRegistry {
  return new BusinessExpertiseRegistry({
    sources: blmSourceManifestV1,
    domainPacks: blmBusinessBrainProofPacksV1,
  });
}
