import {
  blmDomainPackIdsV1,
  type BusinessKnowledgeProvenance,
} from "./business-brain-foundation.js";
import { toSemanticId, type SemanticId } from "./business-semantic-model.js";

export type ExpandedDomainCoverageStatus =
  "NOT_STARTED" | "FOUNDATION" | "PARTIAL" | "VALIDATED";

export type ExpandedRelationshipType =
  | "HAS"
  | "HAS_ROLE"
  | "OWNS"
  | "PARTICIPATES_IN"
  | "RELATES_TO"
  | "GENERATES"
  | "BECOMES"
  | "MAY_BECOME"
  | "AFFECTS"
  | "CREATES"
  | "SETTLES"
  | "CONTRIBUTES_TO"
  | "REQUIRES"
  | "DISTINGUISHES"
  | "INFORMS";

export interface ExpandedBusinessRelationship {
  readonly semanticId: SemanticId;
  readonly sourceConceptId: SemanticId;
  readonly relationship: ExpandedRelationshipType;
  readonly targetConceptId: SemanticId;
  readonly description: string;
  readonly crossDomain: boolean;
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface BusinessPsychologyInsightDefinition {
  readonly semanticId: SemanticId;
  readonly principle: string;
  readonly businessContext: string;
  readonly applicableDomainIds: readonly SemanticId[];
  readonly observedSignals: readonly string[];
  readonly possibleInterpretations: readonly string[];
  readonly recommendedEthicalResponses: readonly string[];
  readonly risks: readonly string[];
  readonly prohibitedMisuse: readonly string[];
  readonly confidenceCategory: "LOW" | "MEDIUM" | "HIGH";
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessDiagnosticPattern {
  readonly semanticId: SemanticId;
  readonly name: string;
  readonly problemSignal: string;
  readonly investigationConceptIds: readonly SemanticId[];
  readonly relatedMetricIds: readonly SemanticId[];
  readonly relatedDomainIds: readonly SemanticId[];
  readonly prohibitedConclusion: string;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface BusinessDecisionPattern {
  readonly semanticId: SemanticId;
  readonly name: string;
  readonly decisionContext: string;
  readonly inputConceptIds: readonly SemanticId[];
  readonly decisionFactors: readonly string[];
  readonly outputBoundary: string;
  readonly requiredAuthority:
    "HUMAN_REVIEW" | "POLICY" | "DETERMINISTIC_ENGINE";
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface ExpandedEvaluationCase {
  readonly semanticId: SemanticId;
  readonly name: string;
  readonly domainIds: readonly SemanticId[];
  readonly input: string;
  readonly expectedKnowledgePath: readonly SemanticId[];
  readonly expectedDecisionFactors: readonly string[];
  readonly deterministic: true;
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface ExpandedBusinessDomainPack {
  readonly domainId: SemanticId;
  readonly key: string;
  readonly name: string;
  readonly coverageStatus: ExpandedDomainCoverageStatus;
  readonly conceptIds: readonly SemanticId[];
  readonly processPatternIds: readonly SemanticId[];
  readonly skillIds: readonly SemanticId[];
  readonly formulaIds: readonly SemanticId[];
  readonly ruleIds: readonly SemanticId[];
  readonly metricIds: readonly SemanticId[];
  readonly documentIds: readonly SemanticId[];
  readonly psychologyInsightIds: readonly SemanticId[];
  readonly diagnosticPatternIds: readonly SemanticId[];
  readonly decisionPatternIds: readonly SemanticId[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface DomainExpertiseScore {
  readonly domainId: SemanticId;
  readonly conceptCoverage: number;
  readonly relationshipCoverage: number;
  readonly processCoverage: number;
  readonly skillCoverage: number;
  readonly ruleFormulaCoverage: number;
  readonly metricCoverage: number;
  readonly evaluationCoverage: number;
  readonly crossDomainIntegration: number;
  readonly overall: number;
}

const flowCuratedProvenance: BusinessKnowledgeProvenance = {
  sourceIds: [],
  use: "FLOW_NATIVE",
  notes:
    "FLOW_CURATED BLM Business Expertise Expansion v1 knowledge; no external source ingestion.",
};

const domainIds = {
  universalCore: blmDomainPackIdsV1.universalCore,
  crmSales: blmDomainPackIdsV1.crmSales,
  marketingGrowth: toSemanticId("flow.concept.blm.domain.marketing-growth"),
  customerSalesPsychology: toSemanticId(
    "flow.concept.blm.domain.customer-sales-psychology",
  ),
  financeAccounting: blmDomainPackIdsV1.financeAccounting,
  commercialDocumentsContracts: toSemanticId(
    "flow.concept.blm.domain.commercial-documents-contracts",
  ),
  procurementVendors: toSemanticId(
    "flow.concept.blm.domain.procurement-vendors",
  ),
  productCatalogPricing: toSemanticId(
    "flow.concept.blm.domain.product-catalog-pricing",
  ),
  inventoryLogistics: toSemanticId(
    "flow.concept.blm.domain.inventory-logistics",
  ),
  projectsServiceOperations: toSemanticId(
    "flow.concept.blm.domain.projects-service-operations",
  ),
  hrOrganizationalPsychology: toSemanticId(
    "flow.concept.blm.domain.hr-organizational-psychology",
  ),
  assetsRentalMaintenance: toSemanticId(
    "flow.concept.blm.domain.assets-rental-maintenance",
  ),
  commercePosMarketplace: toSemanticId(
    "flow.concept.blm.domain.commerce-pos-marketplace",
  ),
  manufacturingMrp: toSemanticId("flow.concept.blm.domain.manufacturing-mrp"),
  analyticsStrategyPlanning: toSemanticId(
    "flow.concept.blm.domain.analytics-strategy-planning",
  ),
} as const;

export const blmExpandedDomainIdsV1 = domainIds;

function c(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.concept.${domain}.${name}`);
}

function p(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.process.${domain}.${name}`);
}

function a(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.action.${domain}.${name}`);
}

function f(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.decision.formula.${domain}.${name}`);
}

function r(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.decision.rule.${domain}.${name}`);
}

function m(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.decision.metric.${domain}.${name}`);
}

function d(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.contract.document.${domain}.${name}`);
}

function insight(name: string): SemanticId {
  return toSemanticId(`flow.concept.psychology.insight-${name}`);
}

function diagnostic(name: string): SemanticId {
  return toSemanticId(`flow.decision.diagnostic.${name}`);
}

function decision(name: string): SemanticId {
  return toSemanticId(`flow.decision.pattern.${name}`);
}

function evaluation(name: string): SemanticId {
  return toSemanticId(`flow.contract.evaluation.expansion.${name}`);
}

function pack(input: {
  readonly id: SemanticId;
  readonly key: string;
  readonly name: string;
  readonly status: ExpandedDomainCoverageStatus;
  readonly concepts: readonly SemanticId[];
  readonly processes?: readonly SemanticId[];
  readonly skills?: readonly SemanticId[];
  readonly formulas?: readonly SemanticId[];
  readonly rules?: readonly SemanticId[];
  readonly metrics?: readonly SemanticId[];
  readonly documents?: readonly SemanticId[];
  readonly psychology?: readonly SemanticId[];
  readonly diagnostics?: readonly SemanticId[];
  readonly decisions?: readonly SemanticId[];
}): ExpandedBusinessDomainPack {
  return {
    domainId: input.id,
    key: input.key,
    name: input.name,
    coverageStatus: input.status,
    conceptIds: input.concepts,
    processPatternIds: input.processes ?? [],
    skillIds: input.skills ?? [],
    formulaIds: input.formulas ?? [],
    ruleIds: input.rules ?? [],
    metricIds: input.metrics ?? [],
    documentIds: input.documents ?? [],
    psychologyInsightIds: input.psychology ?? [],
    diagnosticPatternIds: input.diagnostics ?? [],
    decisionPatternIds: input.decisions ?? [],
    provenance: flowCuratedProvenance,
    scope: "GLOBAL",
  };
}

const universalConcepts = [
  "party",
  "person",
  "organization",
  "business-unit",
  "role",
  "location",
  "contact-point",
  "address",
  "product",
  "service",
  "resource",
  "asset",
  "money",
  "currency",
  "quantity",
  "unit",
  "document",
  "agreement",
  "event",
  "status",
  "classification",
  "identifier",
  "period",
  "calendar",
  "ownership",
  "responsibility",
  "obligation",
].map((name) => c("universal", name));

const crmConcepts = [
  "lead",
  "prospect",
  "contact",
  "account",
  "customer",
  "opportunity",
  "pipeline",
  "stage",
  "sales-activity",
  "quote",
  "proposal",
  "sales-order",
  "deal",
  "win",
  "loss",
  "forecast",
  "territory",
  "sales-representative",
  "account-owner",
  "follow-up",
  "objection",
  "discount",
  "commission",
].map((name) => c("crm", name));

const marketingConcepts = [
  "market",
  "segment",
  "audience",
  "persona",
  "positioning",
  "value-proposition",
  "offer",
  "campaign",
  "channel",
  "creative",
  "message",
  "touchpoint",
  "lead-source",
  "attribution",
  "conversion",
  "funnel",
  "acquisition",
  "retention",
  "churn",
  "referral",
  "experiment",
  "cohort",
].map((name) => c("marketing", name));

const psychologyConcepts = [
  "trust",
  "risk-perception",
  "perceived-value",
  "price-sensitivity",
  "social-proof",
  "urgency",
  "decision-friction",
  "choice-overload",
  "loss-aversion",
  "reciprocity",
  "commitment",
  "buyer-motivation",
  "objection",
  "buying-intent",
  "decision-authority",
  "decision-committee",
  "negotiation-position",
  "switching-cost",
].map((name) => c("psychology", name));

const financeConcepts = [
  "chart-of-accounts",
  "account",
  "journal",
  "journal-entry",
  "debit",
  "credit",
  "ledger",
  "trial-balance",
  "revenue",
  "expense",
  "asset",
  "liability",
  "equity",
  "receivable",
  "payable",
  "invoice",
  "credit-note",
  "payment",
  "cash",
  "bank",
  "tax",
  "cost-center",
  "budget",
  "forecast",
  "accounting-period",
  "accrual",
  "prepayment",
  "depreciation",
  "cogs",
  "gross-profit",
  "gross-margin",
  "operating-profit",
  "net-profit",
  "cash-flow",
  "working-capital",
].map((name) => c("finance", name));

const documentConcepts = [
  "quotation",
  "proposal",
  "contract",
  "agreement",
  "sales-order",
  "purchase-order",
  "invoice",
  "credit-note",
  "statement-of-work",
  "nda",
  "service-agreement",
  "subscription-agreement",
  "rental-agreement",
  "amendment",
  "renewal",
  "termination",
  "clause",
  "obligation",
  "party",
  "effective-date",
  "expiration-date",
].map((name) => c("commercial-document", name));

const procurementConcepts = [
  "vendor",
  "supplier",
  "purchase-request",
  "rfq",
  "vendor-quote",
  "purchase-order",
  "goods-receipt",
  "supplier-invoice",
  "supplier-payment",
  "vendor-score",
  "procurement-policy",
  "approval-limit",
].map((name) => c("procurement", name));

const pricingConcepts = [
  "product",
  "service",
  "sku",
  "variant",
  "bundle",
  "category",
  "price",
  "price-list",
  "cost",
  "markup",
  "margin",
  "discount",
  "promotion",
  "subscription",
  "plan",
  "tier",
  "pricing-rule",
].map((name) => c("pricing", name));

const inventoryConcepts = [
  "warehouse",
  "location",
  "inventory-item",
  "stock-on-hand",
  "available-stock",
  "reserved-stock",
  "committed-stock",
  "damaged-stock",
  "in-transit-stock",
  "stock-movement",
  "reservation",
  "shipment",
  "transfer",
  "reorder-point",
  "safety-stock",
  "lot",
  "serial-number",
].map((name) => c("inventory", name));

const projectConcepts = [
  "project",
  "phase",
  "milestone",
  "task",
  "assignment",
  "resource",
  "timesheet",
  "billable-time",
  "non-billable-time",
  "utilization",
  "project-cost",
  "project-revenue",
  "project-margin",
  "scope",
  "deliverable",
  "deadline",
  "capacity",
].map((name) => c("project", name));

const hrConcepts = [
  "employee",
  "position",
  "role",
  "department",
  "manager",
  "team",
  "attendance",
  "leave",
  "timesheet",
  "performance",
  "goal",
  "compensation",
  "payroll",
  "benefit",
  "training",
  "skill",
  "capacity",
  "engagement",
  "motivation",
  "incentive",
  "burnout-risk",
  "role-clarity",
  "decision-fatigue",
  "team-conflict",
  "psychological-safety",
  "accountability",
  "autonomy",
  "recognition",
  "workload",
].map((name) => c("hr", name));

const assetConcepts = [
  "asset",
  "asset-class",
  "ownership",
  "rental-item",
  "rental-agreement",
  "availability",
  "reservation",
  "checkout",
  "checkin",
  "maintenance",
  "inspection",
  "depreciation",
  "damage",
  "asset-status",
  "warranty",
].map((name) => c("asset", name));

const commerceConcepts = [
  "store",
  "pos",
  "cart",
  "checkout",
  "order",
  "payment",
  "refund",
  "return",
  "seller",
  "vendor",
  "marketplace",
  "commission",
  "payout",
  "settlement",
  "listing",
  "catalog",
  "fulfillment",
  "promotion",
].map((name) => c("commerce", name));

const manufacturingConcepts = [
  "bill-of-materials",
  "component-material",
  "work-order",
  "production-order",
  "routing",
  "operation",
  "work-center",
  "material-requirement",
  "finished-good",
  "scrap",
  "yield",
  "capacity",
].map((name) => c("manufacturing", name));

const analyticsConcepts = [
  "kpi",
  "target",
  "actual",
  "variance",
  "trend",
  "forecast",
  "scenario",
  "plan",
  "objective",
  "risk",
  "opportunity",
  "benchmark",
  "business-health",
  "unit-economics",
].map((name) => c("analytics", name));

export const blmExpandedDomainPacksV1: readonly ExpandedBusinessDomainPack[] = [
  pack({
    id: domainIds.universalCore,
    key: "universal-core",
    name: "Universal Core",
    status: "PARTIAL",
    concepts: universalConcepts,
    rules: [r("universal", "knowledge-is-not-authority")],
    documents: [
      d("universal", "agreement"),
      d("universal", "business-document"),
    ],
  }),
  pack({
    id: domainIds.crmSales,
    key: "crm-sales",
    name: "CRM and Sales",
    status: "PARTIAL",
    concepts: crmConcepts,
    processes: [
      p("crm", "lead-to-opportunity"),
      p("crm", "opportunity-to-quote"),
      p("crm", "quote-to-order"),
      p("crm", "lead-qualification"),
      p("crm", "follow-up"),
      p("crm", "sales-forecasting"),
      p("crm", "account-management"),
    ],
    skills: [
      a("crm", "create-lead"),
      a("crm", "qualify-lead"),
      a("crm", "assign-lead"),
      a("crm", "advance-opportunity"),
      a("crm", "record-activity"),
      a("sales", "create-quote"),
      a("sales", "evaluate-discount"),
      a("sales", "forecast-pipeline"),
    ],
    metrics: [
      m("crm", "lead-conversion-rate"),
      m("crm", "opportunity-conversion-rate"),
      m("crm", "win-rate"),
      m("crm", "average-deal-size"),
      m("crm", "sales-cycle-length"),
      m("crm", "pipeline-coverage"),
      m("crm", "forecast-accuracy"),
      m("crm", "follow-up-delay"),
    ],
    decisions: [decision("discount-decision")],
    diagnostics: [diagnostic("sales-decline")],
  }),
  pack({
    id: domainIds.marketingGrowth,
    key: "marketing-growth",
    name: "Marketing and Growth",
    status: "PARTIAL",
    concepts: marketingConcepts,
    processes: [
      p("marketing", "market-segmentation"),
      p("marketing", "campaign-planning"),
      p("marketing", "lead-generation"),
      p("marketing", "experimentation"),
      p("marketing", "attribution"),
      p("marketing", "retention"),
      p("marketing", "lifecycle-marketing"),
    ],
    formulas: [
      f("marketing", "cac"),
      f("marketing", "ltv"),
      f("marketing", "roas"),
      f("marketing", "conversion-rate"),
      f("marketing", "churn-rate"),
      f("marketing", "payback-period"),
    ],
    metrics: [
      m("marketing", "cac"),
      m("marketing", "ltv"),
      m("marketing", "roas"),
      m("marketing", "ctr"),
      m("marketing", "cpc"),
      m("marketing", "cpa"),
      m("marketing", "conversion-rate"),
      m("marketing", "retention-rate"),
      m("marketing", "churn-rate"),
      m("marketing", "activation-rate"),
      m("marketing", "payback-period"),
      m("marketing", "marketing-qualified-lead-rate"),
    ],
    diagnostics: [diagnostic("high-churn")],
  }),
  pack({
    id: domainIds.customerSalesPsychology,
    key: "customer-sales-psychology",
    name: "Customer and Sales Psychology",
    status: "FOUNDATION",
    concepts: psychologyConcepts,
    psychology: [
      insight("high-price-objection"),
      insight("risk-uncertainty"),
      insight("decision-friction"),
      insight("choice-overload"),
      insight("switching-cost"),
    ],
    decisions: [decision("ethical-persuasion-boundary")],
  }),
  pack({
    id: domainIds.financeAccounting,
    key: "finance-accounting",
    name: "Finance and Accounting",
    status: "PARTIAL",
    concepts: financeConcepts,
    processes: [
      p("finance", "invoice-to-cash"),
      p("finance", "procure-to-pay"),
      p("finance", "record-to-report"),
      p("finance", "bank-reconciliation"),
      p("finance", "period-close"),
      p("finance", "expense-management"),
      p("finance", "budgeting"),
      p("finance", "cash-forecasting"),
    ],
    formulas: [
      f("finance", "gross-profit"),
      f("finance", "gross-margin"),
      f("finance", "operating-margin"),
      f("finance", "net-margin"),
      f("finance", "working-capital"),
      f("finance", "current-ratio"),
      f("finance", "cash-conversion-cycle"),
    ],
    rules: [
      r("finance", "closed-period-blocks-posting"),
      r("finance", "jurisdiction-tax-rules-deferred"),
    ],
    metrics: [
      m("finance", "revenue"),
      m("finance", "gross-profit"),
      m("finance", "gross-margin"),
      m("finance", "operating-margin"),
      m("finance", "net-margin"),
      m("finance", "ar-aging"),
      m("finance", "ap-aging"),
      m("finance", "dso"),
      m("finance", "working-capital"),
      m("finance", "burn-rate"),
      m("finance", "runway"),
      m("finance", "current-ratio"),
      m("finance", "cash-conversion-cycle"),
    ],
    diagnostics: [diagnostic("negative-cash-flow")],
  }),
  pack({
    id: domainIds.commercialDocumentsContracts,
    key: "commercial-documents-contracts",
    name: "Commercial Documents and Contracts",
    status: "FOUNDATION",
    concepts: documentConcepts,
    processes: [
      p("contracts", "draft"),
      p("contracts", "review"),
      p("contracts", "negotiate"),
      p("contracts", "approve"),
      p("contracts", "execute"),
      p("contracts", "renew"),
      p("contracts", "amend"),
      p("contracts", "terminate"),
    ],
    skills: [
      a("contracts", "draft"),
      a("contracts", "summarize"),
      a("contracts", "extract-obligations"),
      a("contracts", "identify-renewal"),
      a("contracts", "compare-version"),
      a("proposal", "create"),
      a("proposal", "revise"),
    ],
    rules: [r("contracts", "blm-does-not-provide-legal-approval")],
    documents: [
      d("contracts", "quotation"),
      d("contracts", "proposal"),
      d("contracts", "contract"),
      d("contracts", "statement-of-work"),
      d("contracts", "nda"),
      d("contracts", "rental-agreement"),
    ],
  }),
  pack({
    id: domainIds.procurementVendors,
    key: "procurement-vendors",
    name: "Procurement and Vendors",
    status: "FOUNDATION",
    concepts: procurementConcepts,
    processes: [
      p("procurement", "source-to-contract"),
      p("procurement", "procure-to-pay"),
      p("procurement", "vendor-evaluation"),
      p("procurement", "purchase-approval"),
      p("procurement", "receiving"),
    ],
    metrics: [
      m("procurement", "supplier-lead-time"),
      m("procurement", "purchase-price-variance"),
      m("procurement", "on-time-delivery"),
      m("procurement", "vendor-defect-rate"),
      m("procurement", "spend-by-vendor"),
    ],
  }),
  pack({
    id: domainIds.productCatalogPricing,
    key: "product-catalog-pricing",
    name: "Product, Catalog, and Pricing",
    status: "FOUNDATION",
    concepts: pricingConcepts,
    processes: [
      p("pricing", "product-setup"),
      p("pricing", "pricing"),
      p("pricing", "repricing"),
      p("pricing", "discount-approval"),
      p("pricing", "catalog-publication"),
    ],
    formulas: [
      f("pricing", "markup"),
      f("pricing", "margin"),
      f("pricing", "discounted-price"),
    ],
    rules: [r("pricing", "markup-is-not-margin")],
    metrics: [m("pricing", "gross-margin"), m("pricing", "discount-rate")],
  }),
  pack({
    id: domainIds.inventoryLogistics,
    key: "inventory-logistics",
    name: "Inventory and Logistics",
    status: "FOUNDATION",
    concepts: inventoryConcepts,
    processes: [
      p("inventory", "receive-to-stock"),
      p("inventory", "reserve-to-fulfill"),
      p("inventory", "pick-pack-ship"),
      p("inventory", "replenishment"),
      p("inventory", "stock-transfer"),
      p("inventory", "inventory-adjustment"),
      p("inventory", "return-to-stock"),
    ],
    rules: [r("inventory", "available-stock-excludes-reserved-stock")],
    metrics: [
      m("inventory", "inventory-turnover"),
      m("inventory", "days-inventory-outstanding"),
      m("inventory", "stockout-rate"),
      m("inventory", "fill-rate"),
      m("inventory", "shrinkage"),
      m("inventory", "inventory-accuracy"),
    ],
  }),
  pack({
    id: domainIds.projectsServiceOperations,
    key: "projects-service-operations",
    name: "Projects and Service Operations",
    status: "FOUNDATION",
    concepts: projectConcepts,
    processes: [
      p("project", "project-initiation"),
      p("project", "planning"),
      p("project", "assignment"),
      p("project", "execution"),
      p("project", "time-tracking"),
      p("project", "billing"),
      p("project", "project-closure"),
    ],
    formulas: [f("project", "project-margin"), f("project", "utilization")],
    metrics: [
      m("project", "utilization"),
      m("project", "billable-utilization"),
      m("project", "project-margin"),
      m("project", "budget-variance"),
      m("project", "schedule-variance"),
      m("project", "capacity"),
      m("project", "realization-rate"),
    ],
    diagnostics: [diagnostic("low-project-margin")],
  }),
  pack({
    id: domainIds.hrOrganizationalPsychology,
    key: "hr-organizational-psychology",
    name: "HR and Organizational Psychology",
    status: "FOUNDATION",
    concepts: hrConcepts,
    processes: [
      p("hr", "hire-to-retire"),
      p("hr", "onboarding"),
      p("hr", "leave-management"),
      p("hr", "performance-review"),
      p("hr", "payroll"),
      p("hr", "training"),
      p("hr", "offboarding"),
    ],
    rules: [r("hr", "no-mental-health-diagnosis")],
    metrics: [m("hr", "engagement"), m("hr", "turnover"), m("hr", "capacity")],
    psychology: [insight("burnout-risk"), insight("role-clarity")],
  }),
  pack({
    id: domainIds.assetsRentalMaintenance,
    key: "assets-rental-maintenance",
    name: "Assets, Rental, and Maintenance",
    status: "FOUNDATION",
    concepts: assetConcepts,
    processes: [
      p("asset", "asset-acquisition"),
      p("asset", "asset-assignment"),
      p("asset", "rental-booking"),
      p("asset", "rental-fulfillment"),
      p("asset", "return"),
      p("asset", "inspection"),
      p("asset", "maintenance"),
      p("asset", "retirement"),
    ],
    metrics: [
      m("asset", "asset-utilization"),
      m("asset", "rental-utilization"),
      m("asset", "downtime"),
      m("asset", "maintenance-cost"),
      m("asset", "revenue-per-asset"),
    ],
  }),
  pack({
    id: domainIds.commercePosMarketplace,
    key: "commerce-pos-marketplace",
    name: "Commerce, POS, and Marketplace",
    status: "FOUNDATION",
    concepts: commerceConcepts,
    processes: [
      p("commerce", "checkout"),
      p("commerce", "return-to-refund"),
      p("commerce", "seller-settlement"),
      p("commerce", "marketplace-fulfillment"),
    ],
    formulas: [f("commerce", "commission"), f("commerce", "seller-payout")],
    metrics: [m("commerce", "gmv"), m("commerce", "refund-rate")],
  }),
  pack({
    id: domainIds.manufacturingMrp,
    key: "manufacturing-mrp",
    name: "Manufacturing and MRP",
    status: "FOUNDATION",
    concepts: manufacturingConcepts,
    processes: [
      p("manufacturing", "plan-to-produce"),
      p("manufacturing", "material-planning"),
      p("manufacturing", "production"),
      p("manufacturing", "quality-check"),
      p("manufacturing", "finished-goods-receipt"),
    ],
    formulas: [f("manufacturing", "yield"), f("manufacturing", "scrap-rate")],
    metrics: [
      m("manufacturing", "yield"),
      m("manufacturing", "scrap-rate"),
      m("manufacturing", "capacity-utilization"),
      m("manufacturing", "production-variance"),
      m("manufacturing", "cycle-time"),
    ],
  }),
  pack({
    id: domainIds.analyticsStrategyPlanning,
    key: "analytics-strategy-planning",
    name: "Analytics, Strategy, and Planning",
    status: "FOUNDATION",
    concepts: analyticsConcepts,
    skills: [
      a("analytics", "explain-kpi"),
      a("analytics", "detect-variance"),
      a("analytics", "compare-periods"),
      a("strategy", "evaluate-unit-economics"),
      a("strategy", "analyze-profitability"),
      a("strategy", "scenario-analysis"),
    ],
    processes: [
      p("analytics", "performance-review"),
      p("strategy", "planning"),
    ],
    metrics: [m("analytics", "variance"), m("analytics", "forecast-accuracy")],
  }),
] as const;

function rel(
  sourceConceptId: SemanticId,
  relationship: ExpandedRelationshipType,
  targetConceptId: SemanticId,
  description: string,
  crossDomain = false,
): ExpandedBusinessRelationship {
  return {
    semanticId: toSemanticId(
      `flow.dependency.relationship.${relationship.toLowerCase().replaceAll("_", "-")}.${sourceConceptId.split(".").at(-1)}.${targetConceptId.split(".").at(-1)}`,
    ),
    sourceConceptId,
    relationship,
    targetConceptId,
    description,
    crossDomain,
    provenance: flowCuratedProvenance,
  };
}

export const blmExpandedBusinessRelationshipsV1: readonly ExpandedBusinessRelationship[] =
  [
    rel(
      c("universal", "person"),
      "HAS_ROLE",
      c("universal", "role"),
      "Person has role.",
    ),
    rel(
      c("universal", "organization"),
      "HAS",
      c("universal", "business-unit"),
      "Organization has business units.",
    ),
    rel(
      c("universal", "party"),
      "PARTICIPATES_IN",
      c("universal", "agreement"),
      "Party participates in agreement.",
    ),
    rel(
      c("universal", "organization"),
      "OWNS",
      c("universal", "asset"),
      "Organization owns assets.",
    ),
    rel(
      c("universal", "product"),
      "HAS",
      c("pricing", "price"),
      "Product has price.",
      true,
    ),
    rel(
      c("universal", "document"),
      "RELATES_TO",
      c("universal", "party"),
      "Document relates to party.",
    ),
    rel(
      c("marketing", "campaign"),
      "GENERATES",
      c("crm", "lead"),
      "Campaign generates leads.",
      true,
    ),
    rel(
      c("crm", "lead"),
      "BECOMES",
      c("crm", "opportunity"),
      "Qualified lead becomes opportunity.",
    ),
    rel(
      c("crm", "opportunity"),
      "BECOMES",
      c("crm", "quote"),
      "Opportunity becomes quote.",
    ),
    rel(
      c("crm", "quote"),
      "MAY_BECOME",
      c("commercial-document", "contract"),
      "Quote may become contract.",
      true,
    ),
    rel(
      c("crm", "quote"),
      "MAY_BECOME",
      c("crm", "sales-order"),
      "Quote may become order.",
    ),
    rel(
      c("crm", "sales-order"),
      "GENERATES",
      c("commerce", "fulfillment"),
      "Order generates fulfillment.",
      true,
    ),
    rel(
      c("commerce", "fulfillment"),
      "MAY_BECOME",
      c("finance", "invoice"),
      "Fulfillment may create invoice.",
      true,
    ),
    rel(
      c("finance", "invoice"),
      "CREATES",
      c("finance", "receivable"),
      "Invoice creates receivable.",
    ),
    rel(
      c("finance", "payment"),
      "SETTLES",
      c("finance", "receivable"),
      "Payment settles receivable.",
    ),
    rel(
      c("pricing", "product"),
      "HAS",
      c("pricing", "cost"),
      "Product has cost.",
    ),
    rel(
      c("crm", "sales-order"),
      "CREATES",
      c("finance", "revenue"),
      "Sale creates revenue.",
      true,
    ),
    rel(
      c("pricing", "cost"),
      "CONTRIBUTES_TO",
      c("finance", "cogs"),
      "Cost contributes to COGS.",
      true,
    ),
    rel(
      c("finance", "revenue"),
      "CONTRIBUTES_TO",
      c("finance", "gross-profit"),
      "Revenue contributes to gross profit.",
    ),
    rel(
      c("finance", "cogs"),
      "CONTRIBUTES_TO",
      c("finance", "gross-profit"),
      "COGS reduces gross profit.",
    ),
    rel(
      c("project", "billable-time"),
      "CONTRIBUTES_TO",
      c("project", "project-revenue"),
      "Billable time contributes to project revenue.",
    ),
    rel(
      c("project", "project-cost"),
      "CONTRIBUTES_TO",
      c("project", "project-margin"),
      "Project cost affects margin.",
    ),
    rel(
      c("project", "project-revenue"),
      "CONTRIBUTES_TO",
      c("project", "project-margin"),
      "Project revenue affects margin.",
    ),
    rel(
      c("procurement", "purchase-order"),
      "AFFECTS",
      c("inventory", "stock-on-hand"),
      "Purchase affects inventory.",
      true,
    ),
    rel(
      c("procurement", "supplier-invoice"),
      "CREATES",
      c("finance", "payable"),
      "Supplier invoice creates payable.",
      true,
    ),
    rel(
      c("inventory", "stock-on-hand"),
      "DISTINGUISHES",
      c("inventory", "available-stock"),
      "Physical stock differs from available stock.",
    ),
    rel(
      c("inventory", "reserved-stock"),
      "AFFECTS",
      c("inventory", "available-stock"),
      "Reservations reduce available stock.",
    ),
    rel(
      c("commerce", "marketplace"),
      "HAS",
      c("commerce", "seller"),
      "Marketplace has sellers.",
    ),
    rel(
      c("commerce", "seller"),
      "OWNS",
      c("commerce", "listing"),
      "Seller owns listing.",
    ),
    rel(
      c("commerce", "order"),
      "MAY_BECOME",
      c("commerce", "seller"),
      "Marketplace order may include multiple sellers.",
    ),
    rel(
      c("commerce", "payment"),
      "AFFECTS",
      c("commerce", "commission"),
      "Payment allocation creates commission.",
    ),
    rel(
      c("commerce", "commission"),
      "AFFECTS",
      c("commerce", "payout"),
      "Commission affects seller payout.",
    ),
    rel(
      c("asset", "depreciation"),
      "AFFECTS",
      c("finance", "expense"),
      "Depreciation affects expense.",
      true,
    ),
    rel(
      c("asset", "rental-agreement"),
      "GENERATES",
      c("finance", "revenue"),
      "Rental agreement generates revenue.",
      true,
    ),
    rel(
      c("manufacturing", "bill-of-materials"),
      "REQUIRES",
      c("manufacturing", "component-material"),
      "BOM requires component materials.",
    ),
    rel(
      c("manufacturing", "material-requirement"),
      "AFFECTS",
      c("inventory", "available-stock"),
      "Material requirements affect availability.",
      true,
    ),
    rel(
      c("analytics", "variance"),
      "INFORMS",
      c("analytics", "risk"),
      "Variance informs risk.",
    ),
  ];

export const blmBusinessPsychologyInsightsV1: readonly BusinessPsychologyInsightDefinition[] =
  [
    {
      semanticId: insight("high-price-objection"),
      principle: "High price objection",
      businessContext: "Sales negotiation",
      applicableDomainIds: [
        domainIds.crmSales,
        domainIds.customerSalesPsychology,
      ],
      observedSignals: [
        "asks for discount",
        "compares competitor price",
        "delays decision",
      ],
      possibleInterpretations: [
        "true budget constraint",
        "insufficient perceived value",
        "risk uncertainty",
        "comparison pressure",
      ],
      recommendedEthicalResponses: [
        "clarify requirements",
        "explain value and tradeoffs",
        "offer transparent options",
      ],
      risks: ["margin erosion", "misreading buyer constraint"],
      prohibitedMisuse: ["hidden manipulation", "false urgency", "deception"],
      confidenceCategory: "MEDIUM",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: insight("risk-uncertainty"),
      principle: "Risk uncertainty",
      businessContext: "Complex purchase decision",
      applicableDomainIds: [
        domainIds.crmSales,
        domainIds.customerSalesPsychology,
      ],
      observedSignals: [
        "asks for references",
        "requests guarantees",
        "needs stakeholder approval",
      ],
      possibleInterpretations: [
        "implementation risk",
        "trust gap",
        "unclear ROI",
      ],
      recommendedEthicalResponses: [
        "provide evidence",
        "clarify scope",
        "make limitations explicit",
      ],
      risks: ["overpromising", "trust loss"],
      prohibitedMisuse: ["concealing risk", "fabricating proof"],
      confidenceCategory: "MEDIUM",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: insight("decision-friction"),
      principle: "Decision friction",
      businessContext: "Buyer decision process",
      applicableDomainIds: [domainIds.crmSales, domainIds.marketingGrowth],
      observedSignals: [
        "slow response",
        "asks same questions repeatedly",
        "unclear next step",
      ],
      possibleInterpretations: [
        "process complexity",
        "authority gap",
        "choice overload",
      ],
      recommendedEthicalResponses: [
        "simplify next step",
        "summarize options",
        "confirm decision owner",
      ],
      risks: ["lost momentum", "incorrect pressure"],
      prohibitedMisuse: ["coercive urgency"],
      confidenceCategory: "LOW",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: insight("choice-overload"),
      principle: "Choice overload",
      businessContext: "Pricing or package selection",
      applicableDomainIds: [
        domainIds.productCatalogPricing,
        domainIds.customerSalesPsychology,
      ],
      observedSignals: [
        "asks for recommendation",
        "cannot compare options",
        "postpones choice",
      ],
      possibleInterpretations: [
        "too many offers",
        "poor packaging",
        "unclear value differences",
      ],
      recommendedEthicalResponses: [
        "reduce options",
        "compare transparently",
        "state fit criteria",
      ],
      risks: ["mis-selling", "decision fatigue"],
      prohibitedMisuse: ["steering to unsuitable option"],
      confidenceCategory: "MEDIUM",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: insight("switching-cost"),
      principle: "Switching cost",
      businessContext: "Retention or replacement purchase",
      applicableDomainIds: [domainIds.marketingGrowth, domainIds.crmSales],
      observedSignals: [
        "mentions migration",
        "asks about onboarding",
        "worries about downtime",
      ],
      possibleInterpretations: [
        "operational risk",
        "training cost",
        "data migration concern",
      ],
      recommendedEthicalResponses: [
        "explain transition plan",
        "state support commitments",
        "avoid lock-in deception",
      ],
      risks: ["underestimated implementation effort"],
      prohibitedMisuse: ["exploit lock-in", "hide exit costs"],
      confidenceCategory: "MEDIUM",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: insight("burnout-risk"),
      principle: "Burnout risk",
      businessContext: "Workload planning",
      applicableDomainIds: [
        domainIds.hrOrganizationalPsychology,
        domainIds.projectsServiceOperations,
      ],
      observedSignals: [
        "sustained overtime",
        "missed deadlines",
        "declining engagement",
      ],
      possibleInterpretations: [
        "capacity overload",
        "role ambiguity",
        "resource mismatch",
      ],
      recommendedEthicalResponses: [
        "rebalance workload",
        "clarify roles",
        "review capacity",
      ],
      risks: ["do not diagnose mental health", "privacy concerns"],
      prohibitedMisuse: ["medical diagnosis", "punitive targeting"],
      confidenceCategory: "LOW",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: insight("role-clarity"),
      principle: "Role clarity",
      businessContext: "Team operating model",
      applicableDomainIds: [domainIds.hrOrganizationalPsychology],
      observedSignals: [
        "duplicated work",
        "handoff misses",
        "conflicting ownership",
      ],
      possibleInterpretations: [
        "unclear accountability",
        "poor process design",
      ],
      recommendedEthicalResponses: [
        "clarify responsibility",
        "document handoffs",
        "align managers",
      ],
      risks: ["blame culture"],
      prohibitedMisuse: ["unfair individual attribution"],
      confidenceCategory: "MEDIUM",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
  ];

export const blmBusinessDiagnosticPatternsV1: readonly BusinessDiagnosticPattern[] =
  [
    {
      semanticId: diagnostic("sales-decline"),
      name: "Sales Decline",
      problemSignal: "Revenue or bookings decline.",
      investigationConceptIds: [
        c("marketing", "lead-source"),
        c("crm", "lead"),
        c("crm", "opportunity"),
        c("crm", "win"),
        c("crm", "deal"),
        c("crm", "sales-cycle"),
        c("pricing", "price"),
        c("marketing", "channel"),
      ],
      relatedMetricIds: [m("crm", "win-rate"), m("crm", "average-deal-size")],
      relatedDomainIds: [
        domainIds.marketingGrowth,
        domainIds.crmSales,
        domainIds.productCatalogPricing,
      ],
      prohibitedConclusion:
        "Do not assume cause without checking funnel, price, channel, and follow-up data.",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: diagnostic("negative-cash-flow"),
      name: "Negative Cash Flow",
      problemSignal: "Profit exists but cash balance declines.",
      investigationConceptIds: [
        c("finance", "receivable"),
        c("finance", "payable"),
        c("finance", "working-capital"),
        c("finance", "cash-flow"),
        c("inventory", "stock-on-hand"),
        c("finance", "cash"),
      ],
      relatedMetricIds: [m("finance", "dso"), m("finance", "working-capital")],
      relatedDomainIds: [
        domainIds.financeAccounting,
        domainIds.inventoryLogistics,
        domainIds.procurementVendors,
      ],
      prohibitedConclusion:
        "Do not equate accounting profit with available cash.",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: diagnostic("low-project-margin"),
      name: "Low Project Margin",
      problemSignal: "Project margin below expectation.",
      investigationConceptIds: [
        c("project", "project-pricing"),
        c("project", "scope"),
        c("project", "project-cost"),
        c("project", "billable-time"),
        c("project", "utilization"),
        c("crm", "discount"),
      ],
      relatedMetricIds: [
        m("project", "project-margin"),
        m("project", "billable-utilization"),
      ],
      relatedDomainIds: [
        domainIds.projectsServiceOperations,
        domainIds.financeAccounting,
        domainIds.crmSales,
      ],
      prohibitedConclusion: "Do not assume utilization alone explains margin.",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: diagnostic("high-churn"),
      name: "High Churn",
      problemSignal: "Retention declines or churn rises.",
      investigationConceptIds: [
        c("marketing", "retention"),
        c("marketing", "churn"),
        c("crm", "customer"),
        c("psychology", "perceived-value"),
        c("psychology", "switching-cost"),
      ],
      relatedMetricIds: [
        m("marketing", "churn-rate"),
        m("marketing", "retention-rate"),
      ],
      relatedDomainIds: [
        domainIds.marketingGrowth,
        domainIds.crmSales,
        domainIds.customerSalesPsychology,
      ],
      prohibitedConclusion: "Do not infer dissatisfaction without evidence.",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
  ];

export const blmBusinessDecisionPatternsV1: readonly BusinessDecisionPattern[] =
  [
    {
      semanticId: decision("discount-decision"),
      name: "Discount Decision",
      decisionContext: "Customer requests discount.",
      inputConceptIds: [
        c("finance", "gross-margin"),
        c("crm", "deal"),
        c("crm", "customer"),
        c("project", "capacity"),
        c("pricing", "pricing-rule"),
        c("crm", "discount"),
      ],
      decisionFactors: [
        "margin",
        "deal value",
        "customer lifetime value",
        "capacity",
        "pricing policy",
        "discount precedent",
        "payment terms",
      ],
      outputBoundary: "Factors only; no automatic approval.",
      requiredAuthority: "HUMAN_REVIEW",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: decision("ethical-persuasion-boundary"),
      name: "Ethical Persuasion Boundary",
      decisionContext: "Using psychology insight in sales or marketing.",
      inputConceptIds: psychologyConcepts.slice(0, 8),
      decisionFactors: [
        "truthfulness",
        "customer fit",
        "risk disclosure",
        "non-discrimination",
      ],
      outputBoundary:
        "Supports ethical response selection, never coercion or deception.",
      requiredAuthority: "POLICY",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
    {
      semanticId: decision("cash-preservation"),
      name: "Cash Preservation Decision",
      decisionContext: "Cash flow pressure.",
      inputConceptIds: [
        c("finance", "cash"),
        c("finance", "receivable"),
        c("finance", "payable"),
        c("finance", "working-capital"),
      ],
      decisionFactors: [
        "collections",
        "payment timing",
        "inventory levels",
        "payroll timing",
      ],
      outputBoundary: "Factors only; treasury action requires authorization.",
      requiredAuthority: "HUMAN_REVIEW",
      provenance: flowCuratedProvenance,
      scope: "GLOBAL",
    },
  ];

function evalCase(
  index: number,
  name: string,
  domainIdsForCase: readonly SemanticId[],
  expectedKnowledgePath: readonly SemanticId[],
  expectedDecisionFactors: readonly string[] = [],
): ExpandedEvaluationCase {
  return {
    semanticId: evaluation(`case-${String(index).padStart(3, "0")}`),
    name,
    domainIds: domainIdsForCase,
    input: name,
    expectedKnowledgePath,
    expectedDecisionFactors,
    deterministic: true,
    provenance: flowCuratedProvenance,
  };
}

export const blmExpandedEvaluationCasesV1: readonly ExpandedEvaluationCase[] = [
  evalCase(
    1,
    "Lead count rising but revenue falling",
    [domainIds.marketingGrowth, domainIds.crmSales],
    [
      c("marketing", "lead-source"),
      c("crm", "lead"),
      c("crm", "opportunity"),
      c("crm", "deal"),
      c("crm", "sales-cycle"),
    ],
  ),
  evalCase(
    2,
    "Customer requests 15 percent discount",
    [domainIds.crmSales, domainIds.productCatalogPricing],
    [
      c("finance", "gross-margin"),
      c("crm", "deal"),
      c("crm", "customer"),
      c("pricing", "pricing-rule"),
      c("crm", "discount"),
    ],
    [
      "margin",
      "deal value",
      "customer value",
      "capacity",
      "pricing policy",
      "discount precedent",
    ],
  ),
  evalCase(
    3,
    "Profitable but cash flow negative",
    [domainIds.financeAccounting],
    [
      c("finance", "receivable"),
      c("finance", "payable"),
      c("finance", "working-capital"),
      c("finance", "cash-flow"),
    ],
  ),
  evalCase(
    4,
    "Inventory exists but order cannot fulfill",
    [domainIds.inventoryLogistics],
    [
      c("inventory", "stock-on-hand"),
      c("inventory", "reserved-stock"),
      c("inventory", "available-stock"),
      c("inventory", "warehouse"),
    ],
  ),
  evalCase(
    5,
    "Utilization rises while project margin falls",
    [domainIds.projectsServiceOperations, domainIds.financeAccounting],
    [
      c("project", "utilization"),
      c("project", "billable-time"),
      c("project", "project-cost"),
      c("project", "project-margin"),
    ],
  ),
  ...Array.from({ length: 50 }, (_, offset) => {
    const index = offset + 6;
    const domain =
      blmExpandedDomainPacksV1[offset % blmExpandedDomainPacksV1.length]!;
    const path = domain.conceptIds.slice(0, 3);
    return evalCase(
      index,
      `${domain.name} deterministic coverage ${offset + 1}`,
      [domain.domainId],
      path,
    );
  }),
];

export function calculateDomainExpertiseScoresV1(
  packs: readonly ExpandedBusinessDomainPack[] = blmExpandedDomainPacksV1,
): readonly DomainExpertiseScore[] {
  return packs.map((domain) => {
    const relationships = blmExpandedBusinessRelationshipsV1.filter(
      (relationship) =>
        domain.conceptIds.includes(relationship.sourceConceptId) ||
        domain.conceptIds.includes(relationship.targetConceptId),
    );
    const evaluations = blmExpandedEvaluationCasesV1.filter((item) =>
      item.domainIds.includes(domain.domainId),
    );
    const score = {
      domainId: domain.domainId,
      conceptCoverage: ratio(domain.conceptIds.length, 20),
      relationshipCoverage: ratio(relationships.length, 5),
      processCoverage: ratio(domain.processPatternIds.length, 5),
      skillCoverage: ratio(domain.skillIds.length, 5),
      ruleFormulaCoverage: ratio(
        domain.ruleIds.length + domain.formulaIds.length,
        4,
      ),
      metricCoverage: ratio(domain.metricIds.length, 5),
      evaluationCoverage: ratio(evaluations.length, 5),
      crossDomainIntegration: ratio(
        relationships.filter((relationship) => relationship.crossDomain).length,
        3,
      ),
    };
    return {
      ...score,
      overall:
        Math.round(
          ((score.conceptCoverage +
            score.relationshipCoverage +
            score.processCoverage +
            score.skillCoverage +
            score.ruleFormulaCoverage +
            score.metricCoverage +
            score.evaluationCoverage +
            score.crossDomainIntegration) /
            8) *
            100,
        ) / 100,
    };
  });
}

export function findCrossDomainKnowledgePathV1(
  conceptId: SemanticId,
): readonly ExpandedBusinessRelationship[] {
  return blmExpandedBusinessRelationshipsV1.filter(
    (relationship) =>
      relationship.crossDomain &&
      (relationship.sourceConceptId === conceptId ||
        relationship.targetConceptId === conceptId),
  );
}

export function assertNoDuplicateExpandedSemanticIdsV1(): void {
  const ids = [
    ...blmExpandedDomainPacksV1.flatMap((domain) => [
      domain.domainId,
      ...domain.conceptIds,
      ...domain.processPatternIds,
      ...domain.skillIds,
      ...domain.formulaIds,
      ...domain.ruleIds,
      ...domain.metricIds,
      ...domain.documentIds,
    ]),
    ...blmExpandedBusinessRelationshipsV1.map(
      (relationship) => relationship.semanticId,
    ),
    ...blmBusinessPsychologyInsightsV1.map((item) => item.semanticId),
    ...blmBusinessDiagnosticPatternsV1.map((item) => item.semanticId),
    ...blmBusinessDecisionPatternsV1.map((item) => item.semanticId),
    ...blmExpandedEvaluationCasesV1.map((item) => item.semanticId),
  ];
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate expanded BLM semantic IDs: ${duplicates.join(", ")}`,
    );
  }
}

function ratio(value: number, target: number): number {
  return Math.min(1, Math.round((value / target) * 100) / 100);
}
