import { type BusinessKnowledgeProvenance } from "./business-brain-foundation.js";
import { blmExpandedDomainIdsV1 } from "./business-expertise-expansion.js";
import {
  logicId,
  type BusinessLogicDefinition,
} from "./business-logic-registry.js";
import { toSemanticId, type SemanticId } from "./business-semantic-model.js";

export type PackReleaseStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "DEPRECATED"
  | "SUPERSEDED"
  | "REJECTED";

export type SkillAuthorityLevel =
  | "KNOWLEDGE_ONLY"
  | "LLM_ADVISORY"
  | "LLM_DRAFT"
  | "DETERMINISTIC_REQUIRED"
  | "APPROVAL_REQUIRED"
  | "EXECUTABLE";

export type SkillExecutionMode =
  | "KNOWLEDGE_REASONING"
  | "STRUCTURED_ANALYSIS"
  | "DOCUMENT_DRAFT"
  | "REQUIRED_CALCULATION"
  | "DECISION_SUPPORT"
  | "ACTION_PROPOSAL"
  | "WORKFLOW_PROPOSAL";

export type SkillCompatibilityStatus =
  | "COMPATIBLE"
  | "COMPATIBLE_WITH_WARNINGS"
  | "DEGRADED"
  | "INCOMPATIBLE"
  | "MISSING_DATA"
  | "MISSING_LOGIC"
  | "MISSING_CAPABILITY"
  | "NOT_AUTHORIZED";

export type SkillRiskClass = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type WorkspaceInstallationStatus =
  "INSTALLED" | "DISABLED" | "DEPRECATED" | "REMOVED";

export type ERPCapabilityKind = "RECORD" | "QUERY" | "ACTION";

export type ERPCapabilityId =
  | "CUSTOMER_READ"
  | "CUSTOMER_WRITE"
  | "INVOICE_READ"
  | "INVOICE_CREATE"
  | "PAYMENT_READ"
  | "INVENTORY_READ"
  | "INVENTORY_RESERVE"
  | "INVENTORY_RESERVATION_READ"
  | "PROJECT_READ"
  | "TIMESHEET_READ"
  | "PURCHASE_ORDER_READ"
  | "PURCHASE_ORDER_CREATE"
  | "CONTRACT_READ"
  | "CAMPAIGN_READ";

export interface ERPBusinessCapability {
  readonly capabilityId: ERPCapabilityId;
  readonly kind: ERPCapabilityKind;
  readonly canonicalConceptIds: readonly SemanticId[];
  readonly authority: "READ_ONLY" | "WRITE_REQUIRES_ACTION_WALL";
  readonly description: string;
}

export interface ExternalERPAdapterCapability {
  readonly adapterId: string;
  readonly provider:
    | "FLOW_NATIVE"
    | "ODOO"
    | "SAP"
    | "ORACLE"
    | "DYNAMICS"
    | "ERPNEXT"
    | "CUSTOM";
  readonly capabilityIds: readonly ERPCapabilityId[];
  readonly canonicalMappingVersion: string;
}

export interface ERPRecordCapability {
  readonly capabilityId: ERPCapabilityId;
  readonly recordType: string;
  readonly readableFieldIds: readonly string[];
}

export interface ERPQueryCapability {
  readonly capabilityId: ERPCapabilityId;
  readonly queryType: string;
  readonly bounded: true;
  readonly maxRecords: number;
}

export interface ERPActionCapability {
  readonly capabilityId: ERPCapabilityId;
  readonly actionType: string;
  readonly requiresActionWall: true;
  readonly idempotencyRequired: true;
}

export interface SkillDependency {
  readonly skillId: SemanticId;
  readonly versionRange: string;
  readonly required: boolean;
}

export interface SkillCapabilityRequirement {
  readonly capabilityId: ERPCapabilityId;
  readonly required: boolean;
  readonly degradedIfMissing: boolean;
}

export interface SkillEvaluationCase {
  readonly caseId: string;
  readonly input: string;
  readonly expectedMissingFields: readonly string[];
  readonly expectedLogicIds: readonly SemanticId[];
  readonly expectedCapabilityIds: readonly ERPCapabilityId[];
  readonly deterministic: true;
}

export interface SkillManifest {
  readonly manifestId: SemanticId;
  readonly packageName: string;
  readonly version: string;
  readonly publisherType: "FLOW" | "PARTNER" | "DEVELOPER" | "ENTERPRISE";
  readonly releaseIds: readonly SemanticId[];
  readonly capabilityBoundary: "DECLARATIVE_ONLY_NO_ARBITRARY_CODE";
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface SkillRelease {
  readonly skillId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly industryScopes: readonly SemanticId[];
  readonly businessTypeScopes: readonly string[];
  readonly domainIds: readonly SemanticId[];
  readonly requiredConceptIds: readonly SemanticId[];
  readonly requiredRecordTypes: readonly string[];
  readonly requiredLogicIds: readonly SemanticId[];
  readonly requiredPolicyIds: readonly string[];
  readonly requiredDataCapabilities: readonly string[];
  readonly requiredERPCapabilities: readonly SkillCapabilityRequirement[];
  readonly inputSchema: readonly string[];
  readonly outputSchema: readonly string[];
  readonly authority: SkillAuthorityLevel;
  readonly executionMode: SkillExecutionMode;
  readonly dependencies: readonly SkillDependency[];
  readonly knowledgeRequirements: readonly SemanticId[];
  readonly logicRequirements: readonly SemanticId[];
  readonly policyRequirements: readonly string[];
  readonly evaluationCases: readonly SkillEvaluationCase[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly approvalStatus: "DRAFT_ONLY" | "APPROVED_BY_GOVERNANCE";
  readonly status: PackReleaseStatus;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly risk: SkillRiskClass;
  readonly actionWallRequired: boolean;
  readonly arbitraryCodeAllowed: false;
  readonly fingerprint: string;
}

export interface BusinessSkillPack {
  readonly packId: SemanticId;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly skillIds: readonly SemanticId[];
  readonly releases: readonly SkillRelease[];
  readonly dependencies: readonly SkillDependency[];
  readonly status: PackReleaseStatus;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly fingerprint: string;
}

export interface BusinessExpertisePack {
  readonly packId: SemanticId;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly composedDomainIds: readonly SemanticId[];
  readonly knowledgeReleaseIds: readonly string[];
  readonly industryPackIds: readonly SemanticId[];
  readonly skillPackIds: readonly SemanticId[];
  readonly status: PackReleaseStatus;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly fingerprint: string;
}

export interface IndustryExpertisePack {
  readonly packId: SemanticId;
  readonly version: string;
  readonly industryId: SemanticId;
  readonly businessTypeIds: readonly string[];
  readonly domainIds: readonly SemanticId[];
  readonly conceptIds: readonly SemanticId[];
  readonly relationshipIds: readonly SemanticId[];
  readonly processPatternIds: readonly SemanticId[];
  readonly metricIds: readonly SemanticId[];
  readonly formulaIds: readonly SemanticId[];
  readonly ruleIds: readonly SemanticId[];
  readonly psychologyInsightIds: readonly SemanticId[];
  readonly diagnosticPatternIds: readonly SemanticId[];
  readonly decisionPatternIds: readonly SemanticId[];
  readonly knowledgeReleaseIds: readonly string[];
  readonly sourceReferences: readonly string[];
  readonly dependencies: readonly SkillDependency[];
  readonly skillIds: readonly SemanticId[];
  readonly status: PackReleaseStatus;
  readonly fingerprint: string;
}

export interface WorkspaceSkillInstallation {
  readonly workspaceId: string;
  readonly skillId: SemanticId;
  readonly skillVersion: string;
  readonly status: WorkspaceInstallationStatus;
  readonly installedAt: string;
  readonly installedBy: string;
  readonly configuration: Readonly<Record<string, string | number | boolean>>;
  readonly configurationFingerprint: string;
  readonly runtimeFingerprint?: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
}

export interface WorkspaceExpertiseInstallation {
  readonly workspaceId: string;
  readonly expertisePackId: SemanticId;
  readonly expertiseVersion: string;
  readonly status: WorkspaceInstallationStatus;
  readonly installedAt: string;
  readonly installedBy: string;
  readonly configurationFingerprint: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
}

export interface WorkspaceSkillInstallationContext {
  readonly workspaceId: string;
  readonly industry: string;
  readonly businessType: string;
  readonly installedSkills: readonly WorkspaceSkillInstallation[];
  readonly installedExpertise: readonly WorkspaceExpertiseInstallation[];
  readonly availableLogicIds: readonly SemanticId[];
  readonly availableERPCapabilities: readonly ERPCapabilityId[];
  readonly actorPermissionIds: readonly string[];
}

export interface SkillCompatibilityResult {
  readonly skillId: SemanticId;
  readonly version: string;
  readonly status: SkillCompatibilityStatus;
  readonly missingLogicIds: readonly SemanticId[];
  readonly missingCapabilityIds: readonly ERPCapabilityId[];
  readonly missingPolicyIds: readonly string[];
  readonly missingDataFields: readonly string[];
  readonly dependencyIssues: readonly string[];
  readonly warnings: readonly string[];
}

export interface ProposedBusinessSkillDraft {
  readonly proposedSkillId: SemanticId;
  readonly name: string;
  readonly purpose: string;
  readonly industry: string;
  readonly businessType: string;
  readonly requiredInputs: readonly string[];
  readonly expectedOutputs: readonly string[];
  readonly requiredConcepts: readonly SemanticId[];
  readonly requiredLogic: readonly SemanticId[];
  readonly requiredPolicies: readonly string[];
  readonly requiredERPCapabilities: readonly ERPCapabilityId[];
  readonly authority: "DRAFT_ONLY";
  readonly risk: SkillRiskClass;
  readonly assumptions: readonly string[];
  readonly evaluationCases: readonly SkillEvaluationCase[];
  readonly dependencies: readonly SkillDependency[];
}

export interface SkillAmendmentDraft {
  readonly baseSkillId: SemanticId;
  readonly baseVersion: string;
  readonly draftVersion: string;
  readonly status: "DRAFT";
  readonly changeReason: string;
  readonly changedDependencies: readonly SkillDependency[];
  readonly changedLogicReferences: readonly SemanticId[];
  readonly newEvaluationCases: readonly SkillEvaluationCase[];
  readonly impactReport: readonly string[];
}

const provenance: BusinessKnowledgeProvenance = {
  sourceIds: [],
  use: "FLOW_NATIVE",
  notes:
    "Flow curated declarative skill and expertise framework; no external source ingestion.",
};

function sid(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.capability.${domain}.${name}`);
}

function concept(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.concept.${domain}.${name}`);
}

function packId(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.module.${domain}.${name}`);
}

function fp(value: string): string {
  return `flow-fp-${value}`;
}

function evaluationCase(
  caseId: string,
  expectedLogicIds: readonly SemanticId[] = [],
  expectedCapabilityIds: readonly ERPCapabilityId[] = [],
  missing: readonly string[] = [],
): SkillEvaluationCase {
  return {
    caseId,
    input: caseId,
    expectedMissingFields: missing,
    expectedLogicIds,
    expectedCapabilityIds,
    deterministic: true,
  };
}

function skill(
  input: Omit<
    SkillRelease,
    | "provenance"
    | "status"
    | "approvalStatus"
    | "arbitraryCodeAllowed"
    | "fingerprint"
    | "effectiveFrom"
  > & {
    readonly status?: PackReleaseStatus;
  },
): SkillRelease {
  const status = input.status ?? "APPROVED";
  return {
    ...input,
    provenance,
    status,
    approvalStatus:
      status === "APPROVED" || status === "PUBLISHED"
        ? "APPROVED_BY_GOVERNANCE"
        : "DRAFT_ONLY",
    arbitraryCodeAllowed: false,
    effectiveFrom: "2026-08-12",
    fingerprint: fp(`${input.skillId}:${input.version}`),
  };
}

export const erpBusinessCapabilitiesV1: readonly ERPBusinessCapability[] = [
  {
    capabilityId: "CUSTOMER_READ",
    kind: "RECORD",
    canonicalConceptIds: [concept("crm", "customer")],
    authority: "READ_ONLY",
    description: "Read canonical customer records.",
  },
  {
    capabilityId: "INVOICE_READ",
    kind: "RECORD",
    canonicalConceptIds: [concept("finance", "invoice")],
    authority: "READ_ONLY",
    description: "Read invoice records.",
  },
  {
    capabilityId: "INVENTORY_READ",
    kind: "QUERY",
    canonicalConceptIds: [concept("inventory", "available-stock")],
    authority: "READ_ONLY",
    description: "Read bounded inventory availability.",
  },
  {
    capabilityId: "PROJECT_READ",
    kind: "QUERY",
    canonicalConceptIds: [concept("project", "project-margin")],
    authority: "READ_ONLY",
    description: "Read project revenue, cost, and status evidence.",
  },
  {
    capabilityId: "TIMESHEET_READ",
    kind: "RECORD",
    canonicalConceptIds: [concept("project", "billable-time")],
    authority: "READ_ONLY",
    description: "Read timesheet evidence.",
  },
  {
    capabilityId: "INVENTORY_RESERVE",
    kind: "ACTION",
    canonicalConceptIds: [concept("inventory", "reservation")],
    authority: "WRITE_REQUIRES_ACTION_WALL",
    description: "Reserve inventory through Action Wall controlled execution.",
  },
];

export const projectMarginAnalysisSkillV1 = skill({
  skillId: sid("skill", "project-margin-analysis"),
  name: "Project Margin Analysis",
  description:
    "Analyze project profitability using approved project-margin logic and bounded evidence.",
  version: "1",
  industryScopes: [],
  businessTypeScopes: ["Services", "Marketing Agency", "Law Firm"],
  domainIds: [
    blmExpandedDomainIdsV1.projectsServiceOperations,
    blmExpandedDomainIdsV1.financeAccounting,
  ],
  requiredConceptIds: [
    concept("project", "project-revenue"),
    concept("project", "project-cost"),
    concept("project", "project-margin"),
  ],
  requiredRecordTypes: ["project"],
  requiredLogicIds: [logicId("projects", "project-margin", 1)],
  requiredPolicyIds: ["business.calculation.execute"],
  requiredDataCapabilities: ["PROJECT_REVENUE_COST_READ"],
  requiredERPCapabilities: [
    { capabilityId: "PROJECT_READ", required: true, degradedIfMissing: false },
  ],
  inputSchema: ["projectRevenue", "projectCost"],
  outputSchema: ["projectMargin"],
  authority: "DETERMINISTIC_REQUIRED",
  executionMode: "REQUIRED_CALCULATION",
  dependencies: [],
  knowledgeRequirements: [concept("project", "project-margin")],
  logicRequirements: [logicId("projects", "project-margin", 1)],
  policyRequirements: ["business.calculation.execute"],
  evaluationCases: [
    evaluationCase("project-margin-handoff", [
      logicId("projects", "project-margin", 1),
    ]),
  ],
  risk: "MEDIUM",
  actionWallRequired: false,
});

export const scopeCreepDiagnosisSkillV1 = skill({
  skillId: sid("skill", "scope-creep-diagnosis"),
  name: "Scope Creep Diagnosis",
  description:
    "Diagnose observed scope expansion, revisions, approvals, and utilization signals without inventing client intent.",
  version: "1",
  industryScopes: [],
  businessTypeScopes: ["Marketing Agency", "Services"],
  domainIds: [blmExpandedDomainIdsV1.projectsServiceOperations],
  requiredConceptIds: [
    concept("project", "scope"),
    concept("project", "billable-time"),
  ],
  requiredRecordTypes: ["project", "timesheet"],
  requiredLogicIds: [],
  requiredPolicyIds: [],
  requiredDataCapabilities: ["PROJECT_SCOPE_READ"],
  requiredERPCapabilities: [
    { capabilityId: "PROJECT_READ", required: true, degradedIfMissing: false },
    {
      capabilityId: "TIMESHEET_READ",
      required: false,
      degradedIfMissing: true,
    },
  ],
  inputSchema: ["approvedScope", "actualWork", "revisions"],
  outputSchema: [
    "observedSignals",
    "possibleInterpretations",
    "safeRecommendations",
  ],
  authority: "LLM_ADVISORY",
  executionMode: "STRUCTURED_ANALYSIS",
  dependencies: [],
  knowledgeRequirements: [concept("project", "scope")],
  logicRequirements: [],
  policyRequirements: [],
  evaluationCases: [evaluationCase("scope-creep-observed-behavior")],
  risk: "MEDIUM",
  actionWallRequired: false,
});

export const clientProfitabilityAnalysisSkillV1 = skill({
  skillId: sid("skill", "client-profitability-analysis"),
  name: "Client Profitability Analysis",
  description:
    "Analyze revenue, direct costs, collections, and project evidence for client profitability.",
  version: "1",
  industryScopes: [],
  businessTypeScopes: ["Law Firm", "Marketing Agency", "Services"],
  domainIds: [
    blmExpandedDomainIdsV1.financeAccounting,
    blmExpandedDomainIdsV1.crmSales,
    blmExpandedDomainIdsV1.projectsServiceOperations,
  ],
  requiredConceptIds: [
    concept("crm", "customer"),
    concept("finance", "revenue"),
    concept("finance", "receivable"),
  ],
  requiredRecordTypes: ["customer", "invoice", "project"],
  requiredLogicIds: [logicId("projects", "project-margin", 1)],
  requiredPolicyIds: ["business.calculation.execute"],
  requiredDataCapabilities: ["CLIENT_REVENUE_COST_COLLECTIONS_READ"],
  requiredERPCapabilities: [
    { capabilityId: "CUSTOMER_READ", required: true, degradedIfMissing: false },
    { capabilityId: "INVOICE_READ", required: true, degradedIfMissing: false },
    { capabilityId: "PROJECT_READ", required: false, degradedIfMissing: true },
  ],
  inputSchema: ["revenue", "directCosts", "collections"],
  outputSchema: [
    "profitabilityStatus",
    "missingInformation",
    "recommendations",
  ],
  authority: "DETERMINISTIC_REQUIRED",
  executionMode: "DECISION_SUPPORT",
  dependencies: [
    {
      skillId: projectMarginAnalysisSkillV1.skillId,
      versionRange: "^1",
      required: false,
    },
  ],
  knowledgeRequirements: [concept("finance", "revenue")],
  logicRequirements: [logicId("projects", "project-margin", 1)],
  policyRequirements: ["business.calculation.execute"],
  evaluationCases: [
    evaluationCase(
      "client-profitability-missing-collections",
      [logicId("projects", "project-margin", 1)],
      ["CUSTOMER_READ", "INVOICE_READ"],
      ["collections"],
    ),
  ],
  risk: "MEDIUM",
  actionWallRequired: false,
});

export const inventoryAvailabilityAnalysisSkillV1 = skill({
  skillId: sid("skill", "inventory-availability-analysis"),
  name: "Inventory Availability Analysis",
  description:
    "Analyze stock, reservations, and fulfillment constraints without reserving inventory.",
  version: "1",
  industryScopes: [],
  businessTypeScopes: ["Grocery", "Retail"],
  domainIds: [blmExpandedDomainIdsV1.inventoryLogistics],
  requiredConceptIds: [
    concept("inventory", "stock-on-hand"),
    concept("inventory", "reserved-stock"),
    concept("inventory", "available-stock"),
  ],
  requiredRecordTypes: ["inventory_item"],
  requiredLogicIds: [logicId("inventory", "available-inventory", 1)],
  requiredPolicyIds: ["business.calculation.execute"],
  requiredDataCapabilities: ["INVENTORY_AVAILABILITY_READ"],
  requiredERPCapabilities: [
    {
      capabilityId: "INVENTORY_READ",
      required: true,
      degradedIfMissing: false,
    },
    {
      capabilityId: "INVENTORY_RESERVATION_READ",
      required: false,
      degradedIfMissing: true,
    },
  ],
  inputSchema: ["stockOnHand", "reservedStock"],
  outputSchema: ["availableInventory", "fulfillmentRisk"],
  authority: "DETERMINISTIC_REQUIRED",
  executionMode: "REQUIRED_CALCULATION",
  dependencies: [],
  knowledgeRequirements: [concept("inventory", "available-stock")],
  logicRequirements: [logicId("inventory", "available-inventory", 1)],
  policyRequirements: ["business.calculation.execute"],
  evaluationCases: [
    evaluationCase("inventory-availability-handoff", [
      logicId("inventory", "available-inventory", 1),
    ]),
  ],
  risk: "MEDIUM",
  actionWallRequired: false,
});

export const businessPsychologySafetyBoundariesV1 = {
  observedBehaviorOnly: true,
  prohibitedSensitiveInference: true,
  prohibitedManipulativePersuasion: true,
  requiresAlternativeExplanations: true,
  requiresUncertainty: true,
} as const;

export const universalBusinessExpertisePackV1: BusinessExpertisePack = {
  packId: packId("expertise", "universal-business-core"),
  version: "1",
  name: "Universal Business Core",
  description:
    "Composed release over the existing 15-domain universal business expertise.",
  composedDomainIds: Object.values(blmExpandedDomainIdsV1),
  knowledgeReleaseIds: [
    "flow.blm.knowledge-release.universal-business-core-v1",
  ],
  industryPackIds: [],
  skillPackIds: [packId("skill-pack", "universal-business-skills")],
  status: "APPROVED",
  provenance,
  fingerprint: fp("universal-business-core:1"),
};

export const lawFirmIndustryExpertisePackV1: IndustryExpertisePack = {
  packId: packId("industry", "law-firm-business-operations"),
  version: "1",
  industryId: concept("industry", "law-firm-business-operations"),
  businessTypeIds: ["Law Firm", "Legal Services"],
  domainIds: [
    blmExpandedDomainIdsV1.financeAccounting,
    blmExpandedDomainIdsV1.projectsServiceOperations,
    blmExpandedDomainIdsV1.commercialDocumentsContracts,
  ],
  conceptIds: [
    concept("legal-operations", "client"),
    concept("legal-operations", "matter"),
    concept("legal-operations", "retainer"),
    concept("legal-operations", "fee-arrangement"),
    concept("legal-operations", "time-entry"),
    concept("legal-operations", "matter-profitability"),
    concept("legal-operations", "client-collections"),
    concept("legal-operations", "conflict-check-business-boundary"),
  ],
  relationshipIds: [
    toSemanticId("flow.dependency.legal-operations.matter-client"),
  ],
  processPatternIds: [
    toSemanticId("flow.process.legal-operations.billing-review"),
  ],
  metricIds: [
    toSemanticId("flow.decision.metric.legal-operations.matter-margin"),
  ],
  formulaIds: [toSemanticId("flow.decision.formula.project.project-margin")],
  ruleIds: [toSemanticId("flow.policy.legal-operations.business-review-only")],
  psychologyInsightIds: [concept("psychology", "insight-buyer-hesitation")],
  diagnosticPatternIds: [
    toSemanticId("flow.decision.diagnostic.legal-operations.collections-risk"),
  ],
  decisionPatternIds: [
    toSemanticId("flow.decision.pattern.legal-operations.billing-review"),
  ],
  knowledgeReleaseIds: ["flow.blm.knowledge-release.law-firm-business-ops-v1"],
  sourceReferences: ["flow-curated"],
  dependencies: [],
  skillIds: [
    projectMarginAnalysisSkillV1.skillId,
    clientProfitabilityAnalysisSkillV1.skillId,
    sid("skill", "client-billing-analysis"),
    sid("skill", "matter-workload-analysis"),
    sid("skill", "contract-business-term-review"),
  ],
  status: "APPROVED",
  fingerprint: fp("law-firm-business-operations:1"),
};

export const creativeAgencyIndustryExpertisePackV1: IndustryExpertisePack = {
  packId: packId("industry", "creative-agency"),
  version: "1",
  industryId: concept("industry", "creative-agency"),
  businessTypeIds: ["Marketing Agency", "Creative Agency"],
  domainIds: [
    blmExpandedDomainIdsV1.marketingGrowth,
    blmExpandedDomainIdsV1.projectsServiceOperations,
    blmExpandedDomainIdsV1.financeAccounting,
  ],
  conceptIds: [
    concept("agency", "brief"),
    concept("agency", "campaign"),
    concept("agency", "deliverable"),
    concept("agency", "revision"),
    concept("agency", "approval"),
    concept("agency", "scope-creep"),
    concept("agency", "creative-capacity"),
    concept("agency", "campaign-kpi"),
    concept("agency", "client-profitability"),
  ],
  relationshipIds: [toSemanticId("flow.dependency.agency.project-client")],
  processPatternIds: [toSemanticId("flow.process.agency.creative-brief")],
  metricIds: [toSemanticId("flow.decision.metric.agency.campaign-kpi")],
  formulaIds: [toSemanticId("flow.decision.formula.project.project-margin")],
  ruleIds: [toSemanticId("flow.policy.agency.scope-change-review")],
  psychologyInsightIds: [concept("psychology", "insight-pricing-resistance")],
  diagnosticPatternIds: [
    toSemanticId("flow.decision.diagnostic.agency.scope-creep"),
  ],
  decisionPatternIds: [
    toSemanticId("flow.decision.pattern.agency.campaign-diagnosis"),
  ],
  knowledgeReleaseIds: ["flow.blm.knowledge-release.creative-agency-v1"],
  sourceReferences: ["flow-curated"],
  dependencies: [],
  skillIds: [
    sid("skill", "creative-brief-builder"),
    sid("skill", "campaign-performance-diagnosis"),
    projectMarginAnalysisSkillV1.skillId,
    scopeCreepDiagnosisSkillV1.skillId,
    clientProfitabilityAnalysisSkillV1.skillId,
  ],
  status: "APPROVED",
  fingerprint: fp("creative-agency:1"),
};

export const groceryRetailIndustryExpertisePackV1: IndustryExpertisePack = {
  packId: packId("industry", "grocery-retail"),
  version: "1",
  industryId: concept("industry", "grocery-retail"),
  businessTypeIds: ["Grocery", "Retail"],
  domainIds: [
    blmExpandedDomainIdsV1.inventoryLogistics,
    blmExpandedDomainIdsV1.procurementVendors,
    blmExpandedDomainIdsV1.financeAccounting,
  ],
  conceptIds: [
    concept("retail", "sku"),
    concept("retail", "supplier"),
    concept("retail", "purchase-order"),
    concept("retail", "stock"),
    concept("retail", "reserved-stock"),
    concept("retail", "available-inventory"),
    concept("retail", "sales-velocity"),
    concept("retail", "perishable-boundary"),
    concept("retail", "store-location"),
  ],
  relationshipIds: [toSemanticId("flow.dependency.retail.sku-supplier")],
  processPatternIds: [toSemanticId("flow.process.retail.replenishment")],
  metricIds: [toSemanticId("flow.decision.metric.retail.sales-velocity")],
  formulaIds: [
    toSemanticId("flow.decision.formula.inventory.available-inventory"),
  ],
  ruleIds: [toSemanticId("flow.policy.retail.perishable-boundary")],
  psychologyInsightIds: [concept("psychology", "insight-discount-pressure")],
  diagnosticPatternIds: [
    toSemanticId("flow.decision.diagnostic.retail.stockout"),
  ],
  decisionPatternIds: [
    toSemanticId("flow.decision.pattern.retail.replenishment"),
  ],
  knowledgeReleaseIds: ["flow.blm.knowledge-release.grocery-retail-v1"],
  sourceReferences: ["flow-curated"],
  dependencies: [],
  skillIds: [
    inventoryAvailabilityAnalysisSkillV1.skillId,
    sid("skill", "stockout-diagnosis"),
    sid("skill", "margin-erosion-diagnosis"),
    sid("skill", "supplier-delay-diagnosis"),
    sid("skill", "replenishment-decision-support"),
  ],
  status: "APPROVED",
  fingerprint: fp("grocery-retail:1"),
};

export const universalBusinessSkillPackV1: BusinessSkillPack = {
  packId: packId("skill-pack", "universal-business-skills"),
  version: "1",
  name: "Universal Business Skill Pack",
  description:
    "Declarative skill releases shared across services, agency, legal operations, and retail use cases.",
  skillIds: [
    projectMarginAnalysisSkillV1.skillId,
    scopeCreepDiagnosisSkillV1.skillId,
    clientProfitabilityAnalysisSkillV1.skillId,
    inventoryAvailabilityAnalysisSkillV1.skillId,
  ],
  releases: [
    projectMarginAnalysisSkillV1,
    scopeCreepDiagnosisSkillV1,
    clientProfitabilityAnalysisSkillV1,
    inventoryAvailabilityAnalysisSkillV1,
  ],
  dependencies: [],
  status: "APPROVED",
  provenance,
  fingerprint: fp("universal-business-skills:1"),
};

export const industryExpertisePacksV1 = [
  lawFirmIndustryExpertisePackV1,
  creativeAgencyIndustryExpertisePackV1,
  groceryRetailIndustryExpertisePackV1,
] as const;

export const businessSkillReleasesV1 = universalBusinessSkillPackV1.releases;

export function isAuthoritativeSkillRelease(release: SkillRelease): boolean {
  return release.status === "APPROVED" || release.status === "PUBLISHED";
}

export function businessLogicDefinitionForSkill(
  skillRelease: SkillRelease,
): readonly Pick<BusinessLogicDefinition, "logicId" | "version">[] {
  return skillRelease.requiredLogicIds.map((id) => ({
    logicId: id,
    version: "1",
  }));
}
