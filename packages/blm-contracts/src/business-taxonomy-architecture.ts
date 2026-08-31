import {
  type BusinessKnowledgeProvenance,
  type BusinessRiskClass,
} from "./business-brain-foundation.js";
import { toSemanticId, type SemanticId } from "./business-semantic-model.js";

export type TaxonomyLifecycleStatus = "DRAFT" | "ACTIVE" | "SUPERSEDED";

export type BusinessTaxonomyDimension =
  | "industry"
  | "niche"
  | "scale"
  | "customerModel"
  | "revenueModel"
  | "fulfilmentModel"
  | "assetModel"
  | "inventoryModel"
  | "workforceModel"
  | "regulatoryIntensity"
  | "topology"
  | "maturity"
  | "jurisdiction";

export type IndustryEdgeType =
  | "PARENT_OF"
  | "ADJACENT_TO"
  | "HAS_NICHE"
  | "COMMONLY_REQUIRES_CAPABILITY"
  | "COMMONLY_USES_ROLE"
  | "HAS_SECONDARY_ACTIVITY";

export type FlowExpertiseFamily =
  | "PROFESSIONAL_SERVICES"
  | "SOFTWARE_AND_PLATFORM"
  | "MANUFACTURING_AND_SUPPLY"
  | "RETAIL_AND_COMMERCE"
  | "CONSTRUCTION_AND_FIELD_SERVICES";

export type ScaleProfile = "SOLO" | "SMB" | "MID_MARKET" | "ENTERPRISE";

export type BusinessModelDimension =
  | "B2B"
  | "B2C"
  | "B2B2C"
  | "PROJECT_BASED"
  | "SUBSCRIPTION"
  | "TRANSACTIONAL"
  | "MAKE_TO_STOCK"
  | "MAKE_TO_ORDER"
  | "FIELD_PROJECT"
  | "SERVICE_RETAINER";

export type RegulatoryIntensity = "LOW" | "MEDIUM" | "HIGH";

export type ArchitectureNodeType =
  | "epistemic"
  | "identity"
  | "motivation"
  | "value"
  | "capability"
  | "operating_model"
  | "process"
  | "decision_control"
  | "information"
  | "people_work"
  | "application"
  | "integration"
  | "ai_skill"
  | "execution";

export type ArchitectureEdgeType =
  | "DEFINES"
  | "REQUIRES"
  | "ENABLES"
  | "GOVERNS"
  | "MEASURES"
  | "PRODUCES"
  | "CONSUMES"
  | "PERFORMED_BY"
  | "AUTOMATED_BY"
  | "EVIDENCED_BY";

export type RoleExpertiseKind =
  | "occupation"
  | "job_function"
  | "workspace_role"
  | "authorization_role"
  | "decision_authority";

export type ClassificationSignalSource =
  | "BUSINESS_DESCRIPTION"
  | "AUTHORIZED_DOCUMENT"
  | "WORKSPACE_FACT"
  | "EXISTING_SYSTEM"
  | "USER_ANSWER";

export interface SourceCorpusReference {
  readonly sourceKey: string;
  readonly repositoryPath: string;
  readonly version: string;
  readonly knowledgeGroup: "GLOBAL_CORE";
}

export interface BusinessClassificationEvidence {
  readonly evidenceId: string;
  readonly source: ClassificationSignalSource;
  readonly text: string;
  readonly supports: readonly BusinessTaxonomyDimension[];
  readonly confidence: number;
  readonly sourceLocator?: string;
  readonly workspaceScoped: boolean;
}

export interface IndustryNode {
  readonly industryId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly family: FlowExpertiseFamily;
  readonly aliases: readonly string[];
  readonly typicalNicheIds: readonly SemanticId[];
  readonly typicalCapabilityIds: readonly SemanticId[];
  readonly typicalRoleIds: readonly SemanticId[];
  readonly maturitySignals: readonly string[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface IndustryEdge {
  readonly edgeId: SemanticId;
  readonly sourceIndustryId: SemanticId;
  readonly edgeType: IndustryEdgeType;
  readonly targetId: SemanticId;
  readonly description: string;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface IndustryFamilyMapping {
  readonly family: FlowExpertiseFamily;
  readonly industryIds: readonly SemanticId[];
  readonly description: string;
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface NicheDefinition {
  readonly nicheId: SemanticId;
  readonly industryId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly signals: readonly string[];
  readonly excludedSignals: readonly string[];
  readonly requiredCapabilityIds: readonly SemanticId[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface IndustryRelease {
  readonly releaseId: string;
  readonly version: string;
  readonly status: TaxonomyLifecycleStatus;
  readonly sourceCorpusRelease: string;
  readonly sourceReferences: readonly SourceCorpusReference[];
  readonly industryNodes: readonly IndustryNode[];
  readonly industryEdges: readonly IndustryEdge[];
  readonly familyMappings: readonly IndustryFamilyMapping[];
  readonly niches: readonly NicheDefinition[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly fingerprint: string;
}

export interface ReferenceArchitectureNode {
  readonly nodeId: SemanticId;
  readonly nodeType: ArchitectureNodeType;
  readonly name: string;
  readonly description: string;
  readonly relatedCapabilityIds: readonly SemanticId[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface ReferenceArchitectureEdge {
  readonly edgeId: SemanticId;
  readonly sourceNodeId: SemanticId;
  readonly edgeType: ArchitectureEdgeType;
  readonly targetNodeId: SemanticId;
  readonly description: string;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface ReferenceBusinessArchitectureGraph {
  readonly graphType: "REFERENCE_BUSINESS_ARCHITECTURE";
  readonly graphId: string;
  readonly version: string;
  readonly nodes: readonly ReferenceArchitectureNode[];
  readonly edges: readonly ReferenceArchitectureEdge[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly fingerprint: string;
}

export interface WorkspaceBusinessTwinGraph {
  readonly graphType: "WORKSPACE_BUSINESS_TWIN";
  readonly workspaceId: string;
  readonly graphId: string;
  readonly version: string;
}

export interface SolutionInstallationGraph {
  readonly graphType: "SOLUTION_INSTALLATION";
  readonly workspaceId: string;
  readonly installationId: string;
  readonly graphId: string;
  readonly version: string;
}

export interface UniversalCapability {
  readonly capabilityId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly family: FlowExpertiseFamily | "UNIVERSAL";
  readonly parentCapabilityId?: SemanticId;
  readonly requiredEvidence: readonly string[];
  readonly commonMetricIds: readonly SemanticId[];
  readonly commonControlIds: readonly SemanticId[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface UniversalCapabilityRegistry {
  readonly registryId: string;
  readonly version: string;
  readonly capabilities: readonly UniversalCapability[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly fingerprint: string;
}

export interface RoleExpertiseDefinition {
  readonly roleId: SemanticId;
  readonly kind: RoleExpertiseKind;
  readonly name: string;
  readonly description: string;
  readonly capabilityIds: readonly SemanticId[];
  readonly decisionAuthority: "NONE" | "DRAFT" | "RECOMMEND" | "APPROVE";
  readonly authorizationBoundary: string;
  readonly commonEvidence: readonly string[];
  readonly prohibitedAssumptions: readonly string[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BLMExpertisePack {
  readonly packId: SemanticId;
  readonly version: string;
  readonly name: string;
  readonly industryScopes: readonly SemanticId[];
  readonly nicheScopes: readonly SemanticId[];
  readonly scaleScopes: readonly ScaleProfile[];
  readonly vocabulary: readonly string[];
  readonly roles: readonly SemanticId[];
  readonly businessPhysics: readonly string[];
  readonly valueStreams: readonly string[];
  readonly processes: readonly SemanticId[];
  readonly entities: readonly SemanticId[];
  readonly documents: readonly SemanticId[];
  readonly metrics: readonly SemanticId[];
  readonly driverRelations: readonly string[];
  readonly rules: readonly SemanticId[];
  readonly logicRequirements: readonly string[];
  readonly risks: readonly BusinessRiskClass[];
  readonly controls: readonly SemanticId[];
  readonly strategyPatterns: readonly string[];
  readonly psychologyPatterns: readonly string[];
  readonly prohibitedClaims: readonly string[];
  readonly liveEvidencePolicies: readonly string[];
  readonly evaluationCases: readonly SemanticId[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly fingerprint: string;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessClassificationCandidate {
  readonly candidateId: string;
  readonly industryId?: SemanticId;
  readonly nicheId?: SemanticId;
  readonly scale?: ScaleProfile;
  readonly dimensions: Partial<
    Readonly<Record<BusinessTaxonomyDimension, string>>
  >;
  readonly confidence: number;
  readonly evidenceIds: readonly string[];
  readonly missingInformation: readonly BusinessTaxonomyDimension[];
  readonly assumptions: readonly string[];
}

export interface BusinessClassificationResult {
  readonly status: "CLASSIFIED" | "AMBIGUOUS" | "INSUFFICIENT_INFORMATION";
  readonly candidates: readonly BusinessClassificationCandidate[];
  readonly evidence: readonly BusinessClassificationEvidence[];
  readonly missingInformation: readonly BusinessTaxonomyDimension[];
  readonly discoveryQuestions: readonly string[];
  readonly workspaceFactsAcceptedAsTruth: false;
  readonly genericPriorAcceptedAsWorkspaceFact: false;
}

export interface BusinessTaxonomyContext {
  readonly contextId: string;
  readonly source: "BUSINESS_TAXONOMY_CONTEXT_COMPILER";
  readonly classificationStatus: BusinessClassificationResult["status"];
  readonly selectedCandidate?: BusinessClassificationCandidate;
  readonly relevantIndustryIds: readonly SemanticId[];
  readonly relevantNicheIds: readonly SemanticId[];
  readonly relevantCapabilityIds: readonly SemanticId[];
  readonly relevantExpertisePackIds: readonly SemanticId[];
  readonly relevantRoleIds: readonly SemanticId[];
  readonly evidence: readonly BusinessClassificationEvidence[];
  readonly missingInformation: readonly BusinessTaxonomyDimension[];
  readonly contextLimit: {
    readonly maxIndustries: number;
    readonly maxCapabilities: number;
    readonly maxExpertisePacks: number;
    readonly maxRoles: number;
  };
  readonly provenance: BusinessKnowledgeProvenance;
  readonly fingerprint: string;
}

export const blmTaxonomySourceKeysV1 = [
  "BLM-TAXONOMY-V1",
  "BLM-CORE-ARCHITECTURE-V1",
  "BLM-MODULE-ARCH-V1",
  "BLM-KG-REGISTRY-V2",
  "BLM-EXPERTISE-V5",
] as const;

export const blmTaxonomyProvenanceV1: BusinessKnowledgeProvenance = {
  sourceIds: [...blmTaxonomySourceKeysV1],
  use: "FLOW_NATIVE",
  notes:
    "Governed Flow BLM Task 007.2 foundation compiled from repository source manifest and existing curated BLM outputs; generic knowledge is not workspace truth.",
};

export const industryIdsV1 = {
  digitalAgency: toSemanticId("flow.concept.industry.digital-agency"),
  saas: toSemanticId("flow.concept.industry.saas"),
  manufacturing: toSemanticId("flow.concept.industry.manufacturing"),
  retail: toSemanticId("flow.concept.industry.retail"),
  construction: toSemanticId("flow.concept.industry.construction"),
} as const;

export const nicheIdsV1 = {
  marketingAgency: toSemanticId("flow.concept.niche.marketing-agency"),
  productLedSaas: toSemanticId("flow.concept.niche.product-led-saas"),
  contractManufacturing: toSemanticId(
    "flow.concept.niche.contract-manufacturing",
  ),
  omnichannelRetail: toSemanticId("flow.concept.niche.omnichannel-retail"),
  generalContractor: toSemanticId("flow.concept.niche.general-contractor"),
} as const;

export const universalCapabilityIdsV1 = {
  leadManagement: toSemanticId("flow.capability.crm.lead-management"),
  quoteToCash: toSemanticId("flow.capability.sales.quote-to-cash"),
  projectDelivery: toSemanticId("flow.capability.operations.project-delivery"),
  subscriptionBilling: toSemanticId(
    "flow.capability.finance.subscription-billing",
  ),
  productionPlanning: toSemanticId(
    "flow.capability.operations.production-planning",
  ),
  inventoryAvailability: toSemanticId("flow.capability.inventory.availability"),
  fieldOperations: toSemanticId("flow.capability.operations.field-operations"),
  financialControl: toSemanticId("flow.capability.finance.financial-control"),
} as const;

export const roleExpertiseIdsV1 = {
  founder: toSemanticId("flow.role.occupation.founder"),
  accountManager: toSemanticId("flow.role.job-function.account-manager"),
  financeApprover: toSemanticId("flow.role.authorization.finance-approver"),
  operationsLead: toSemanticId("flow.role.workspace.operations-lead"),
  decisionOwner: toSemanticId("flow.role.decision-authority.owner"),
} as const;

export const blmIndustryNodesV1: readonly IndustryNode[] = [
  industry({
    id: industryIdsV1.digitalAgency,
    name: "Digital Agency",
    family: "PROFESSIONAL_SERVICES",
    aliases: ["agency", "marketing agency", "creative agency"],
    niches: [nicheIdsV1.marketingAgency],
    capabilities: [
      universalCapabilityIdsV1.leadManagement,
      universalCapabilityIdsV1.quoteToCash,
      universalCapabilityIdsV1.projectDelivery,
      universalCapabilityIdsV1.financialControl,
    ],
    roles: [
      roleExpertiseIdsV1.founder,
      roleExpertiseIdsV1.accountManager,
      roleExpertiseIdsV1.operationsLead,
    ],
    maturitySignals: ["retainers", "project margin", "utilization"],
  }),
  industry({
    id: industryIdsV1.saas,
    name: "SaaS Company",
    family: "SOFTWARE_AND_PLATFORM",
    aliases: ["software company", "subscription software", "platform"],
    niches: [nicheIdsV1.productLedSaas],
    capabilities: [
      universalCapabilityIdsV1.leadManagement,
      universalCapabilityIdsV1.subscriptionBilling,
      universalCapabilityIdsV1.financialControl,
    ],
    roles: [roleExpertiseIdsV1.founder, roleExpertiseIdsV1.decisionOwner],
    maturitySignals: ["MRR", "ARR", "churn", "activation"],
  }),
  industry({
    id: industryIdsV1.manufacturing,
    name: "Manufacturer",
    family: "MANUFACTURING_AND_SUPPLY",
    aliases: ["factory", "producer", "manufacturing company"],
    niches: [nicheIdsV1.contractManufacturing],
    capabilities: [
      universalCapabilityIdsV1.productionPlanning,
      universalCapabilityIdsV1.inventoryAvailability,
      universalCapabilityIdsV1.financialControl,
    ],
    roles: [roleExpertiseIdsV1.operationsLead, roleExpertiseIdsV1.founder],
    maturitySignals: ["work orders", "BOM", "inventory", "capacity"],
  }),
  industry({
    id: industryIdsV1.retail,
    name: "Retailer",
    family: "RETAIL_AND_COMMERCE",
    aliases: ["store", "shop", "retail business", "commerce"],
    niches: [nicheIdsV1.omnichannelRetail],
    capabilities: [
      universalCapabilityIdsV1.inventoryAvailability,
      universalCapabilityIdsV1.quoteToCash,
      universalCapabilityIdsV1.financialControl,
    ],
    roles: [roleExpertiseIdsV1.operationsLead, roleExpertiseIdsV1.founder],
    maturitySignals: ["POS", "stock", "sell-through", "returns"],
  }),
  industry({
    id: industryIdsV1.construction,
    name: "Construction Firm",
    family: "CONSTRUCTION_AND_FIELD_SERVICES",
    aliases: ["contractor", "builder", "construction company"],
    niches: [nicheIdsV1.generalContractor],
    capabilities: [
      universalCapabilityIdsV1.fieldOperations,
      universalCapabilityIdsV1.projectDelivery,
      universalCapabilityIdsV1.quoteToCash,
      universalCapabilityIdsV1.financialControl,
    ],
    roles: [roleExpertiseIdsV1.operationsLead, roleExpertiseIdsV1.founder],
    maturitySignals: ["job costing", "site work", "change orders", "crews"],
  }),
];

export const blmNicheDefinitionsV1: readonly NicheDefinition[] = [
  niche(nicheIdsV1.marketingAgency, industryIdsV1.digitalAgency, {
    name: "Marketing Agency",
    signals: ["campaign", "client retainer", "creative", "media buying"],
    excludedSignals: ["factory floor", "inventory counts"],
    capabilities: [
      universalCapabilityIdsV1.leadManagement,
      universalCapabilityIdsV1.projectDelivery,
    ],
  }),
  niche(nicheIdsV1.productLedSaas, industryIdsV1.saas, {
    name: "Product-Led SaaS",
    signals: ["trial", "activation", "self serve", "MRR"],
    excludedSignals: ["site crew", "purchase order inventory"],
    capabilities: [
      universalCapabilityIdsV1.subscriptionBilling,
      universalCapabilityIdsV1.leadManagement,
    ],
  }),
  niche(nicheIdsV1.contractManufacturing, industryIdsV1.manufacturing, {
    name: "Contract Manufacturing",
    signals: ["work order", "BOM", "production run", "raw material"],
    excludedSignals: ["retainer utilization"],
    capabilities: [
      universalCapabilityIdsV1.productionPlanning,
      universalCapabilityIdsV1.inventoryAvailability,
    ],
  }),
  niche(nicheIdsV1.omnichannelRetail, industryIdsV1.retail, {
    name: "Omnichannel Retail",
    signals: ["POS", "online store", "stockout", "fulfillment"],
    excludedSignals: ["change order", "SaaS activation"],
    capabilities: [
      universalCapabilityIdsV1.inventoryAvailability,
      universalCapabilityIdsV1.quoteToCash,
    ],
  }),
  niche(nicheIdsV1.generalContractor, industryIdsV1.construction, {
    name: "General Contractor",
    signals: ["job site", "subcontractor", "change order", "estimate"],
    excludedSignals: ["MRR", "media buying"],
    capabilities: [
      universalCapabilityIdsV1.fieldOperations,
      universalCapabilityIdsV1.projectDelivery,
    ],
  }),
];

export const blmUniversalCapabilitiesV1: readonly UniversalCapability[] = [
  capability(universalCapabilityIdsV1.leadManagement, "Lead Management", {
    family: "UNIVERSAL",
    evidence: ["lead source", "stage", "owner", "conversion status"],
  }),
  capability(universalCapabilityIdsV1.quoteToCash, "Quote To Cash", {
    family: "UNIVERSAL",
    evidence: ["quote", "order", "invoice", "payment status"],
  }),
  capability(universalCapabilityIdsV1.projectDelivery, "Project Delivery", {
    family: "PROFESSIONAL_SERVICES",
    evidence: ["scope", "tasks", "timeline", "utilization"],
  }),
  capability(
    universalCapabilityIdsV1.subscriptionBilling,
    "Subscription Billing",
    {
      family: "SOFTWARE_AND_PLATFORM",
      evidence: ["plan", "subscription", "MRR", "renewal"],
    },
  ),
  capability(
    universalCapabilityIdsV1.productionPlanning,
    "Production Planning",
    {
      family: "MANUFACTURING_AND_SUPPLY",
      evidence: ["BOM", "work order", "capacity", "routing"],
    },
  ),
  capability(
    universalCapabilityIdsV1.inventoryAvailability,
    "Inventory Availability",
    {
      family: "UNIVERSAL",
      evidence: ["on hand", "reserved", "allocated", "reorder point"],
    },
  ),
  capability(universalCapabilityIdsV1.fieldOperations, "Field Operations", {
    family: "CONSTRUCTION_AND_FIELD_SERVICES",
    evidence: ["crew", "site", "schedule", "materials"],
  }),
  capability(universalCapabilityIdsV1.financialControl, "Financial Control", {
    family: "UNIVERSAL",
    evidence: ["ledger", "cash", "margin", "approval"],
  }),
];

export const blmRoleExpertiseV1: readonly RoleExpertiseDefinition[] = [
  role(roleExpertiseIdsV1.founder, "occupation", "Founder", "RECOMMEND", [
    universalCapabilityIdsV1.financialControl,
    universalCapabilityIdsV1.leadManagement,
  ]),
  role(
    roleExpertiseIdsV1.accountManager,
    "job_function",
    "Account Manager",
    "DRAFT",
    [
      universalCapabilityIdsV1.leadManagement,
      universalCapabilityIdsV1.quoteToCash,
    ],
  ),
  role(
    roleExpertiseIdsV1.financeApprover,
    "authorization_role",
    "Finance Approver",
    "APPROVE",
    [universalCapabilityIdsV1.financialControl],
  ),
  role(
    roleExpertiseIdsV1.operationsLead,
    "workspace_role",
    "Operations Lead",
    "RECOMMEND",
    [
      universalCapabilityIdsV1.projectDelivery,
      universalCapabilityIdsV1.inventoryAvailability,
      universalCapabilityIdsV1.fieldOperations,
    ],
  ),
  role(
    roleExpertiseIdsV1.decisionOwner,
    "decision_authority",
    "Decision Owner",
    "APPROVE",
    [universalCapabilityIdsV1.financialControl],
  ),
];

export const blmIndustryEdgesV1: readonly IndustryEdge[] =
  blmIndustryNodesV1.flatMap(
    (node) =>
      [
        ...node.typicalNicheIds.map((targetId) =>
          edge(node.industryId, "HAS_NICHE", targetId),
        ),
        ...node.typicalCapabilityIds.map((targetId) =>
          edge(node.industryId, "COMMONLY_REQUIRES_CAPABILITY", targetId),
        ),
        ...node.typicalRoleIds.map((targetId) =>
          edge(node.industryId, "COMMONLY_USES_ROLE", targetId),
        ),
      ] satisfies readonly IndustryEdge[],
  );

export const blmIndustryFamilyMappingsV1: readonly IndustryFamilyMapping[] = [
  "PROFESSIONAL_SERVICES",
  "SOFTWARE_AND_PLATFORM",
  "MANUFACTURING_AND_SUPPLY",
  "RETAIL_AND_COMMERCE",
  "CONSTRUCTION_AND_FIELD_SERVICES",
].map((family) => ({
  family: family as FlowExpertiseFamily,
  industryIds: blmIndustryNodesV1
    .filter((node) => node.family === family)
    .map((node) => node.industryId),
  description: `${family} industry family mapping.`,
  provenance: blmTaxonomyProvenanceV1,
}));

export const blmReferenceArchitectureNodesV1: readonly ReferenceArchitectureNode[] =
  [
    architectureNode("epistemic", "Knowledge And Evidence", [
      universalCapabilityIdsV1.financialControl,
    ]),
    architectureNode("identity", "Parties And Roles", [
      universalCapabilityIdsV1.leadManagement,
    ]),
    architectureNode("motivation", "Goals And Constraints", [
      universalCapabilityIdsV1.financialControl,
    ]),
    architectureNode("value", "Value Streams", [
      universalCapabilityIdsV1.quoteToCash,
    ]),
    architectureNode("capability", "Business Capabilities", [
      universalCapabilityIdsV1.quoteToCash,
      universalCapabilityIdsV1.inventoryAvailability,
    ]),
    architectureNode("operating_model", "Operating Model", [
      universalCapabilityIdsV1.projectDelivery,
    ]),
    architectureNode("process", "Business Processes", [
      universalCapabilityIdsV1.projectDelivery,
    ]),
    architectureNode("decision_control", "Decision And Control", [
      universalCapabilityIdsV1.financialControl,
    ]),
    architectureNode("information", "Business Information", [
      universalCapabilityIdsV1.inventoryAvailability,
    ]),
    architectureNode("people_work", "People And Work", [
      universalCapabilityIdsV1.fieldOperations,
    ]),
    architectureNode("application", "Applications", [
      universalCapabilityIdsV1.subscriptionBilling,
    ]),
    architectureNode("integration", "Integrations", [
      universalCapabilityIdsV1.quoteToCash,
    ]),
    architectureNode("ai_skill", "AI Skills", [
      universalCapabilityIdsV1.leadManagement,
    ]),
    architectureNode("execution", "Execution", [
      universalCapabilityIdsV1.fieldOperations,
    ]),
  ];

export const blmReferenceArchitectureEdgesV1: readonly ReferenceArchitectureEdge[] =
  blmReferenceArchitectureNodesV1.slice(0, -1).map((node, index) => {
    const target = blmReferenceArchitectureNodesV1[index + 1]!;
    return {
      edgeId: toSemanticId(
        `flow.dependency.architecture.${node.nodeType.replaceAll("_", "-")}-to-${target.nodeType.replaceAll("_", "-")}`,
      ),
      sourceNodeId: node.nodeId,
      edgeType: "ENABLES",
      targetNodeId: target.nodeId,
      description: `${node.name} informs ${target.name}.`,
      provenance: blmTaxonomyProvenanceV1,
      scope: "GLOBAL",
    };
  });

export const blmExpertisePacksV1: readonly BLMExpertisePack[] = [
  expertisePack(
    "digital-agency",
    "Digital Agency Expertise",
    [industryIdsV1.digitalAgency],
    [nicheIdsV1.marketingAgency],
    [
      universalCapabilityIdsV1.leadManagement,
      universalCapabilityIdsV1.projectDelivery,
      universalCapabilityIdsV1.financialControl,
    ],
  ),
  expertisePack(
    "saas",
    "SaaS Expertise",
    [industryIdsV1.saas],
    [nicheIdsV1.productLedSaas],
    [
      universalCapabilityIdsV1.subscriptionBilling,
      universalCapabilityIdsV1.leadManagement,
      universalCapabilityIdsV1.financialControl,
    ],
  ),
  expertisePack(
    "manufacturing",
    "Manufacturing Expertise",
    [industryIdsV1.manufacturing],
    [nicheIdsV1.contractManufacturing],
    [
      universalCapabilityIdsV1.productionPlanning,
      universalCapabilityIdsV1.inventoryAvailability,
      universalCapabilityIdsV1.financialControl,
    ],
  ),
  expertisePack(
    "retail",
    "Retail Expertise",
    [industryIdsV1.retail],
    [nicheIdsV1.omnichannelRetail],
    [
      universalCapabilityIdsV1.inventoryAvailability,
      universalCapabilityIdsV1.quoteToCash,
      universalCapabilityIdsV1.financialControl,
    ],
  ),
  expertisePack(
    "construction",
    "Construction Expertise",
    [industryIdsV1.construction],
    [nicheIdsV1.generalContractor],
    [
      universalCapabilityIdsV1.fieldOperations,
      universalCapabilityIdsV1.projectDelivery,
      universalCapabilityIdsV1.financialControl,
    ],
  ),
];

export function industry(input: {
  readonly id: SemanticId;
  readonly name: string;
  readonly family: FlowExpertiseFamily;
  readonly aliases: readonly string[];
  readonly niches: readonly SemanticId[];
  readonly capabilities: readonly SemanticId[];
  readonly roles: readonly SemanticId[];
  readonly maturitySignals: readonly string[];
}): IndustryNode {
  return {
    industryId: input.id,
    name: input.name,
    description: `${input.name} global business taxonomy node.`,
    family: input.family,
    aliases: input.aliases,
    typicalNicheIds: input.niches,
    typicalCapabilityIds: input.capabilities,
    typicalRoleIds: input.roles,
    maturitySignals: input.maturitySignals,
    provenance: blmTaxonomyProvenanceV1,
    scope: "GLOBAL",
  };
}

function niche(
  nicheId: SemanticId,
  industryId: SemanticId,
  input: {
    readonly name: string;
    readonly signals: readonly string[];
    readonly excludedSignals: readonly string[];
    readonly capabilities: readonly SemanticId[];
  },
): NicheDefinition {
  return {
    nicheId,
    industryId,
    name: input.name,
    description: `${input.name} niche classification.`,
    signals: input.signals,
    excludedSignals: input.excludedSignals,
    requiredCapabilityIds: input.capabilities,
    provenance: blmTaxonomyProvenanceV1,
    scope: "GLOBAL",
  };
}

function capability(
  capabilityId: SemanticId,
  name: string,
  input: {
    readonly family: UniversalCapability["family"];
    readonly evidence: readonly string[];
  },
): UniversalCapability {
  return {
    capabilityId,
    name,
    description: `${name} describes what a business must be able to do; it is not a software module.`,
    family: input.family,
    requiredEvidence: input.evidence,
    commonMetricIds: [],
    commonControlIds: [],
    provenance: blmTaxonomyProvenanceV1,
    scope: "GLOBAL",
  };
}

function role(
  roleId: SemanticId,
  kind: RoleExpertiseKind,
  name: string,
  decisionAuthority: RoleExpertiseDefinition["decisionAuthority"],
  capabilityIds: readonly SemanticId[],
): RoleExpertiseDefinition {
  return {
    roleId,
    kind,
    name,
    description: `${name} role expertise definition.`,
    capabilityIds,
    decisionAuthority,
    authorizationBoundary:
      "Role expertise is advisory and does not grant workspace authorization.",
    commonEvidence: ["scope", "responsibility", "approval record"],
    prohibitedAssumptions: [
      "Do not infer authorization from occupation or job function alone.",
    ],
    provenance: blmTaxonomyProvenanceV1,
    scope: "GLOBAL",
  };
}

function edge(
  sourceIndustryId: SemanticId,
  edgeType: IndustryEdgeType,
  targetId: SemanticId,
): IndustryEdge {
  return {
    edgeId: toSemanticId(
      `flow.dependency.taxonomy.${sourceIndustryId.split(".").at(-1)}-${edgeType.toLowerCase().replaceAll("_", "-")}-${targetId.split(".").at(-1)}`,
    ),
    sourceIndustryId,
    edgeType,
    targetId,
    description: `${sourceIndustryId} ${edgeType} ${targetId}.`,
    provenance: blmTaxonomyProvenanceV1,
    scope: "GLOBAL",
  };
}

function architectureNode(
  nodeType: ArchitectureNodeType,
  name: string,
  relatedCapabilityIds: readonly SemanticId[],
): ReferenceArchitectureNode {
  return {
    nodeId: toSemanticId(
      `flow.concept.architecture.${nodeType.replaceAll("_", "-")}`,
    ),
    nodeType,
    name,
    description: `${name} reference architecture node.`,
    relatedCapabilityIds,
    provenance: blmTaxonomyProvenanceV1,
    scope: "GLOBAL",
  };
}

function expertisePack(
  key: string,
  name: string,
  industryScopes: readonly SemanticId[],
  nicheScopes: readonly SemanticId[],
  capabilities: readonly SemanticId[],
): BLMExpertisePack {
  return {
    packId: toSemanticId(`flow.concept.expertise-pack.${key}`),
    version: "1.0.0",
    name,
    industryScopes,
    nicheScopes,
    scaleScopes: ["SMB", "MID_MARKET"],
    vocabulary: [key, name],
    roles: blmIndustryNodesV1
      .filter((industryNode) =>
        industryScopes.includes(industryNode.industryId),
      )
      .flatMap((industryNode) => industryNode.typicalRoleIds),
    businessPhysics: [
      "Business outcomes depend on cross-functional drivers, constraints, and evidence.",
    ],
    valueStreams: ["lead-to-cash", "operate-to-margin"],
    processes: [toSemanticId(`flow.process.${key}.core-operations`)],
    entities: [toSemanticId(`flow.entity.${key}.business-record`)],
    documents: [
      toSemanticId(`flow.contract.document.${key}.operating-evidence`),
    ],
    metrics: [toSemanticId(`flow.decision.metric.${key}.performance`)],
    driverRelations: [
      "demand, capacity, cash, and margin must be reasoned together",
    ],
    rules: [toSemanticId(`flow.decision.rule.${key}.evidence-required`)],
    logicRequirements: [
      `Pack covers ${capabilities.length} task-critical business capabilities.`,
      "Calculations require deterministic logic before authoritative output.",
    ],
    risks: ["MEDIUM"],
    controls: [toSemanticId(`flow.policy.${key}.human-approval`)],
    strategyPatterns: ["diagnose before prescribing"],
    psychologyPatterns: ["avoid manipulative or unsupported customer claims"],
    prohibitedClaims: [
      "Do not claim workspace-specific facts without workspace evidence.",
    ],
    liveEvidencePolicies: [
      "Use live workspace evidence only when authorized and tenant scoped.",
    ],
    evaluationCases: [
      toSemanticId(`flow.contract.evaluation.${key}.classification`),
    ],
    provenance: blmTaxonomyProvenanceV1,
    fingerprint: "",
    scope: "GLOBAL",
  };
}
