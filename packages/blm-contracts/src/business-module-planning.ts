import type { BusinessKnowledgeProvenance } from "./business-brain-foundation.js";
import type { SystemOfRecordClass } from "./business-query-planning.js";
import {
  blmTaxonomyProvenanceV1,
  universalCapabilityIdsV1,
} from "./business-taxonomy-architecture.js";
import { toSemanticId, type SemanticId } from "./business-semantic-model.js";

export type BusinessModuleClass = "FOUNDATION" | "UNIVERSAL" | "CONDITIONAL";

export type BusinessModuleBLMRole =
  | "SYSTEM_OF_RECORD"
  | "READ_ONLY_OVERLAY"
  | "CONTROL_LAYER"
  | "WORKFLOW_ORCHESTRATION"
  | "ANALYTIC_CONTEXT"
  | "AI_ASSISTED_DRAFTING";

export type ModuleRecommendationOutcome =
  | "INSTALL_NOW"
  | "INSTALL_NEXT"
  | "DEFER"
  | "EXTERNAL_SYSTEM_REMAINS_SOR"
  | "READ_ONLY_OVERLAY"
  | "REPLACE_EXISTING"
  | "DO_NOT_INSTALL"
  | "NEEDS_INFORMATION";

export type ModuleCriticality = "P0" | "P1" | "P2" | "P3";

export type ModuleTiming = "NOW" | "NEXT" | "LATER" | "NEEDS_INFORMATION";

export type ModuleMaturitySupport =
  "FOUNDATION" | "BASIC" | "STANDARD" | "ADVANCED";

export type BuildingBlockType =
  | "ENTITY"
  | "DOCUMENT"
  | "WORKFLOW"
  | "STATE"
  | "RULE"
  | "DECISION"
  | "ROLE"
  | "PERMISSION"
  | "METRIC"
  | "LOGIC"
  | "UI_BLOCK"
  | "EVENT"
  | "NOTIFICATION"
  | "INTEGRATION"
  | "AI_SKILL"
  | "SOR_POLICY";

export interface BusinessModuleDefinition {
  readonly moduleId: SemanticId;
  readonly canonicalName: string;
  readonly moduleClass: BusinessModuleClass;
  readonly capabilityIds: readonly SemanticId[];
  readonly outcome: string;
  readonly buildingBlockRequirements: readonly SemanticId[];
  readonly canonicalRecordTypes: readonly SemanticId[];
  readonly workflowRequirements: readonly SemanticId[];
  readonly metricRequirements: readonly SemanticId[];
  readonly ruleRequirements: readonly SemanticId[];
  readonly logicRequirements: readonly SemanticId[];
  readonly blmRole: BusinessModuleBLMRole;
  readonly dependencies: readonly SemanticId[];
  readonly substitutes: readonly SemanticId[];
  readonly applicabilityTriggers: readonly string[];
  readonly exclusions: readonly string[];
  readonly authorityBoundaries: readonly string[];
  readonly maturitySupport: readonly ModuleMaturitySupport[];
  readonly provenance: readonly BusinessKnowledgeProvenance[];
  readonly version: string;
  readonly reviewStatus: "REVIEWED" | "PUBLISHED";
  readonly fingerprint: string;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface ModuleRecommendation {
  readonly moduleId: SemanticId;
  readonly capabilityIds: readonly SemanticId[];
  readonly outcome: ModuleRecommendationOutcome;
  readonly needProbability: number;
  readonly confidence: number;
  readonly criticality: ModuleCriticality;
  readonly priority: number;
  readonly targetMaturity: ModuleMaturitySupport;
  readonly timing: ModuleTiming;
  readonly directEvidence: readonly string[];
  readonly inferredEvidence: readonly string[];
  readonly negativeEvidence: readonly string[];
  readonly dependencies: readonly SemanticId[];
  readonly substitutes: readonly SemanticId[];
  readonly currentCoverage: readonly string[];
  readonly systemOfRecordPolicy: SystemOfRecordClass;
  readonly requiredBuildingBlocks: readonly SemanticId[];
  readonly requiredWorkflows: readonly SemanticId[];
  readonly requiredRules: readonly SemanticId[];
  readonly requiredMetrics: readonly SemanticId[];
  readonly requiredIntegrations: readonly string[];
  readonly authorityBoundaries: readonly string[];
  readonly why: readonly string[];
  readonly whyNotAlternatives: readonly string[];
  readonly missingInformation: readonly string[];
  readonly fingerprint: string;
}

export interface BuildingBlockDefinition {
  readonly blockId: SemanticId;
  readonly blockType: BuildingBlockType;
  readonly name: string;
  readonly description: string;
  readonly capabilityIds: readonly SemanticId[];
  readonly requiredForModuleIds: readonly SemanticId[];
  readonly authorityBoundary: string;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BuildingBlockPlan {
  readonly planId: string;
  readonly dryRunOnly: true;
  readonly approvedCapabilityIds: readonly SemanticId[];
  readonly modules: readonly ModuleRecommendation[];
  readonly targetMaturityByCapability: Readonly<
    Record<string, ModuleMaturitySupport>
  >;
  readonly canonicalEntitiesAndRelationships: readonly SemanticId[];
  readonly documents: readonly SemanticId[];
  readonly workflowTemplatesAndParameters: readonly SemanticId[];
  readonly rolePermissionTemplates: readonly SemanticId[];
  readonly businessLogicAndDecisionRuleIds: readonly SemanticId[];
  readonly uiBlocksAndViews: readonly SemanticId[];
  readonly blmSkillsAndExpertisePacks: readonly SemanticId[];
  readonly integrationAdapterCapabilities: readonly string[];
  readonly systemOfRecordPolicies: readonly {
    readonly moduleId: SemanticId;
    readonly policy: SystemOfRecordClass;
    readonly reason: string;
  }[];
  readonly notificationApprovalPolicies: readonly SemanticId[];
  readonly migrationMappings: readonly string[];
  readonly implementationWave: readonly {
    readonly wave: number;
    readonly moduleIds: readonly SemanticId[];
    readonly rationale: string;
  }[];
  readonly evidenceRefs: readonly string[];
  readonly approvalRequirements: readonly string[];
  readonly architectureFingerprint: string;
}

export const blmModulePlanningProvenanceV1: BusinessKnowledgeProvenance = {
  sourceIds: [
    "BLM-MODULE-ARCH-V1",
    "BLM-KG-REGISTRY-V2",
    "BLM-TAXONOMY-V1",
    "BLM-CORE-ARCHITECTURE-V1",
  ],
  use: "FLOW_NATIVE",
  notes:
    "Governed Flow BLM Task 007.3 module planning foundation. Recommendations are dry-run planning outputs only.",
};

export const blmModuleIdsV1 = {
  organizationFoundation: toSemanticId("flow.module.foundation.organization"),
  customerRevenue: toSemanticId("flow.module.universal.customer-revenue"),
  quoteToCash: toSemanticId("flow.module.universal.quote-to-cash"),
  projectDelivery: toSemanticId("flow.module.universal.project-delivery"),
  cashCollection: toSemanticId("flow.module.universal.cash-collection"),
  financeOverlay: toSemanticId("flow.module.universal.finance-overlay"),
  manufacturingOperations: toSemanticId(
    "flow.module.conditional.manufacturing-operations",
  ),
  inventoryControl: toSemanticId("flow.module.conditional.inventory-control"),
  retailPosOverlay: toSemanticId("flow.module.conditional.retail-pos-overlay"),
} as const;

export const blmBuildingBlockIdsV1 = {
  organizationEntity: toSemanticId("flow.entity.foundation.organization"),
  customerEntity: toSemanticId("flow.entity.revenue.customer"),
  opportunityEntity: toSemanticId("flow.entity.revenue.opportunity"),
  proposalDocument: toSemanticId("flow.contract.document.revenue.proposal"),
  invoiceDocument: toSemanticId("flow.contract.document.finance.invoice"),
  projectWorkflow: toSemanticId("flow.workflow.delivery.project-lifecycle"),
  receivableState: toSemanticId("flow.record.finance.receivable-state"),
  approvalRule: toSemanticId("flow.decision.rule.finance.approval-required"),
  marginMetric: toSemanticId("flow.decision.metric.delivery.project-margin"),
  cashLogic: toSemanticId("flow.decision.logic.finance.cash-collection"),
  workspaceRole: toSemanticId("flow.role.workspace.module-owner"),
  readPermission: toSemanticId("flow.policy.permission.module-read"),
  dashboardView: toSemanticId("flow.widget.dashboard.business-health"),
  notification: toSemanticId("flow.event.notification.approval-request"),
  accountingIntegration: toSemanticId(
    "flow.integration.accounting.external-sor",
  ),
  sorPolicy: toSemanticId("flow.policy.sor.external-authoritative"),
  inventoryEntity: toSemanticId("flow.entity.inventory.item"),
  manufacturingWorkflow: toSemanticId(
    "flow.workflow.manufacturing.production-run",
  ),
  posIntegration: toSemanticId("flow.integration.retail.pos"),
} as const;

export const blmBusinessModulesV1: readonly BusinessModuleDefinition[] = [
  moduleDef({
    moduleId: blmModuleIdsV1.organizationFoundation,
    canonicalName: "Organization Foundation",
    moduleClass: "FOUNDATION",
    capabilityIds: [universalCapabilityIdsV1.financialControl],
    outcome:
      "Know the workspace, organization, roles, and operating boundaries.",
    buildingBlockRequirements: [
      blmBuildingBlockIdsV1.organizationEntity,
      blmBuildingBlockIdsV1.workspaceRole,
      blmBuildingBlockIdsV1.readPermission,
    ],
    blmRole: "CONTROL_LAYER",
    triggers: ["workspace setup", "roles", "permissions", "organization"],
    critical: true,
  }),
  moduleDef({
    moduleId: blmModuleIdsV1.customerRevenue,
    canonicalName: "Customer Revenue",
    moduleClass: "UNIVERSAL",
    capabilityIds: [universalCapabilityIdsV1.leadManagement],
    outcome: "Track customers, opportunities, and commercial pipeline.",
    buildingBlockRequirements: [
      blmBuildingBlockIdsV1.customerEntity,
      blmBuildingBlockIdsV1.opportunityEntity,
    ],
    blmRole: "ANALYTIC_CONTEXT",
    triggers: ["client", "customer", "lead", "pipeline", "B2B"],
  }),
  moduleDef({
    moduleId: blmModuleIdsV1.quoteToCash,
    canonicalName: "Quote To Cash",
    moduleClass: "UNIVERSAL",
    capabilityIds: [universalCapabilityIdsV1.quoteToCash],
    outcome: "Connect proposals, approvals, invoices, and payment status.",
    buildingBlockRequirements: [
      blmBuildingBlockIdsV1.proposalDocument,
      blmBuildingBlockIdsV1.invoiceDocument,
      blmBuildingBlockIdsV1.approvalRule,
    ],
    blmRole: "WORKFLOW_ORCHESTRATION",
    triggers: ["proposal", "quote", "invoice", "cash collection", "retainer"],
  }),
  moduleDef({
    moduleId: blmModuleIdsV1.projectDelivery,
    canonicalName: "Project Delivery",
    moduleClass: "UNIVERSAL",
    capabilityIds: [universalCapabilityIdsV1.projectDelivery],
    outcome: "Manage project delivery, scope, utilization, and margin signals.",
    buildingBlockRequirements: [
      blmBuildingBlockIdsV1.projectWorkflow,
      blmBuildingBlockIdsV1.marginMetric,
      blmBuildingBlockIdsV1.dashboardView,
    ],
    blmRole: "ANALYTIC_CONTEXT",
    triggers: ["project", "delivery", "scope creep", "utilization", "ClickUp"],
  }),
  moduleDef({
    moduleId: blmModuleIdsV1.cashCollection,
    canonicalName: "Cash Collection",
    moduleClass: "UNIVERSAL",
    capabilityIds: [universalCapabilityIdsV1.financialControl],
    outcome: "Expose receivables, collection state, and cash timing risks.",
    buildingBlockRequirements: [
      blmBuildingBlockIdsV1.receivableState,
      blmBuildingBlockIdsV1.cashLogic,
      blmBuildingBlockIdsV1.notification,
    ],
    blmRole: "CONTROL_LAYER",
    triggers: [
      "cash collection",
      "late payment",
      "receivable",
      "runs out of cash",
    ],
  }),
  moduleDef({
    moduleId: blmModuleIdsV1.financeOverlay,
    canonicalName: "Finance Overlay",
    moduleClass: "UNIVERSAL",
    capabilityIds: [universalCapabilityIdsV1.financialControl],
    outcome:
      "Read financial truth from external accounting without duplicating SoR.",
    buildingBlockRequirements: [
      blmBuildingBlockIdsV1.accountingIntegration,
      blmBuildingBlockIdsV1.sorPolicy,
    ],
    blmRole: "READ_ONLY_OVERLAY",
    triggers: ["QuickBooks", "accounting", "cash", "margin", "finance"],
  }),
  moduleDef({
    moduleId: blmModuleIdsV1.manufacturingOperations,
    canonicalName: "Manufacturing Operations",
    moduleClass: "CONDITIONAL",
    capabilityIds: [universalCapabilityIdsV1.productionPlanning],
    outcome: "Plan production runs, BOMs, and capacity.",
    buildingBlockRequirements: [blmBuildingBlockIdsV1.manufacturingWorkflow],
    blmRole: "SYSTEM_OF_RECORD",
    triggers: ["manufacturing", "factory", "BOM", "production run"],
    exclusions: ["agency", "retainer", "ClickUp delivery"],
  }),
  moduleDef({
    moduleId: blmModuleIdsV1.inventoryControl,
    canonicalName: "Inventory Control",
    moduleClass: "CONDITIONAL",
    capabilityIds: [universalCapabilityIdsV1.inventoryAvailability],
    outcome: "Track inventory availability and fulfillment constraints.",
    buildingBlockRequirements: [blmBuildingBlockIdsV1.inventoryEntity],
    blmRole: "SYSTEM_OF_RECORD",
    triggers: ["inventory", "stock", "warehouse", "fulfillment"],
    exclusions: ["agency", "service retainer"],
  }),
  moduleDef({
    moduleId: blmModuleIdsV1.retailPosOverlay,
    canonicalName: "Retail POS Overlay",
    moduleClass: "CONDITIONAL",
    capabilityIds: [universalCapabilityIdsV1.quoteToCash],
    outcome: "Overlay retail POS sales and return signals.",
    buildingBlockRequirements: [blmBuildingBlockIdsV1.posIntegration],
    blmRole: "READ_ONLY_OVERLAY",
    triggers: ["POS", "store", "retail", "returns"],
    exclusions: ["agency", "SaaS", "manufacturer"],
  }),
];

export const blmBuildingBlocksV1: readonly BuildingBlockDefinition[] = [
  block(blmBuildingBlockIdsV1.organizationEntity, "ENTITY", "Organization"),
  block(blmBuildingBlockIdsV1.customerEntity, "ENTITY", "Customer"),
  block(blmBuildingBlockIdsV1.opportunityEntity, "ENTITY", "Opportunity"),
  block(blmBuildingBlockIdsV1.proposalDocument, "DOCUMENT", "Proposal"),
  block(blmBuildingBlockIdsV1.invoiceDocument, "DOCUMENT", "Invoice"),
  block(blmBuildingBlockIdsV1.projectWorkflow, "WORKFLOW", "Project Lifecycle"),
  block(blmBuildingBlockIdsV1.receivableState, "STATE", "Receivable State"),
  block(blmBuildingBlockIdsV1.approvalRule, "RULE", "Approval Required"),
  block(blmBuildingBlockIdsV1.marginMetric, "METRIC", "Project Margin"),
  block(blmBuildingBlockIdsV1.cashLogic, "LOGIC", "Cash Collection Logic"),
  block(blmBuildingBlockIdsV1.workspaceRole, "ROLE", "Module Owner"),
  block(blmBuildingBlockIdsV1.readPermission, "PERMISSION", "Module Read"),
  block(blmBuildingBlockIdsV1.dashboardView, "UI_BLOCK", "Business Health"),
  block(blmBuildingBlockIdsV1.notification, "NOTIFICATION", "Approval Request"),
  block(
    blmBuildingBlockIdsV1.accountingIntegration,
    "INTEGRATION",
    "Accounting External SoR",
  ),
  block(
    blmBuildingBlockIdsV1.sorPolicy,
    "SOR_POLICY",
    "External Authoritative",
  ),
  block(blmBuildingBlockIdsV1.inventoryEntity, "ENTITY", "Inventory Item"),
  block(
    blmBuildingBlockIdsV1.manufacturingWorkflow,
    "WORKFLOW",
    "Production Run",
  ),
  block(blmBuildingBlockIdsV1.posIntegration, "INTEGRATION", "Retail POS"),
];

function moduleDef(input: {
  readonly moduleId: SemanticId;
  readonly canonicalName: string;
  readonly moduleClass: BusinessModuleClass;
  readonly capabilityIds: readonly SemanticId[];
  readonly outcome: string;
  readonly buildingBlockRequirements: readonly SemanticId[];
  readonly blmRole: BusinessModuleBLMRole;
  readonly triggers: readonly string[];
  readonly critical?: boolean;
  readonly exclusions?: readonly string[];
}): BusinessModuleDefinition {
  return {
    moduleId: input.moduleId,
    canonicalName: input.canonicalName,
    moduleClass: input.moduleClass,
    capabilityIds: input.capabilityIds,
    outcome: input.outcome,
    buildingBlockRequirements: input.buildingBlockRequirements,
    canonicalRecordTypes: input.buildingBlockRequirements.filter((id) =>
      id.startsWith("flow.entity."),
    ),
    workflowRequirements: input.buildingBlockRequirements.filter((id) =>
      id.startsWith("flow.workflow."),
    ),
    metricRequirements: input.buildingBlockRequirements.filter((id) =>
      id.startsWith("flow.decision.metric."),
    ),
    ruleRequirements: input.buildingBlockRequirements.filter((id) =>
      id.startsWith("flow.decision.rule."),
    ),
    logicRequirements: input.buildingBlockRequirements.filter((id) =>
      id.startsWith("flow.decision.logic."),
    ),
    blmRole: input.blmRole,
    dependencies:
      input.moduleClass === "FOUNDATION"
        ? []
        : [blmModuleIdsV1.organizationFoundation],
    substitutes: [],
    applicabilityTriggers: input.triggers,
    exclusions: input.exclusions ?? [],
    authorityBoundaries: [
      "Recommendation is dry-run only.",
      "No production install or ERP mutation is authorized.",
      "Action Wall remains required for side effects.",
    ],
    maturitySupport: input.critical
      ? ["FOUNDATION", "BASIC", "STANDARD", "ADVANCED"]
      : ["BASIC", "STANDARD", "ADVANCED"],
    provenance: [blmModulePlanningProvenanceV1, blmTaxonomyProvenanceV1],
    version: "1.0.0",
    reviewStatus: "REVIEWED",
    fingerprint: "",
    scope: "GLOBAL",
  };
}

function block(
  blockId: SemanticId,
  blockType: BuildingBlockType,
  name: string,
): BuildingBlockDefinition {
  return {
    blockId,
    blockType,
    name,
    description: `${name} building block for dry-run module planning.`,
    capabilityIds: [],
    requiredForModuleIds: blmBusinessModulesV1
      .filter((module) => module.buildingBlockRequirements.includes(blockId))
      .map((module) => module.moduleId),
    authorityBoundary:
      "Building block registry is planning metadata; it does not execute actions.",
    provenance: blmModulePlanningProvenanceV1,
    scope: "GLOBAL",
  };
}
