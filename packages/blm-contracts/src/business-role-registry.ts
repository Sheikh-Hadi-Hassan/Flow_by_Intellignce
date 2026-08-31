import { toSemanticId, type SemanticId } from "./business-semantic-model.js";

export type BusinessRoleFamily =
  | "BOARD_GOVERNANCE"
  | "EXECUTIVE_GENERAL_MANAGEMENT"
  | "FINANCE"
  | "REVENUE"
  | "MARKETING"
  | "SALES"
  | "CUSTOMER"
  | "OPERATIONS"
  | "SUPPLY_CHAIN"
  | "MANUFACTURING"
  | "PROJECT_PROGRAM"
  | "PRODUCT"
  | "TECHNOLOGY"
  | "DATA_ANALYTICS"
  | "AI"
  | "SECURITY"
  | "PEOPLE_HR"
  | "LEGAL"
  | "COMPLIANCE"
  | "RISK"
  | "INTERNAL_AUDIT"
  | "STRATEGY"
  | "CORPORATE_DEVELOPMENT"
  | "REGIONAL_GENERAL_MANAGEMENT"
  | "FOUNDER_OWNER";

export type BusinessRoleStatus =
  "DRAFT" | "REVIEWED" | "VALIDATED" | "LOCKED" | "DEPRECATED";

export type OrganizationScale =
  "MICRO_BUSINESS" | "SMB" | "MID_MARKET" | "ENTERPRISE" | "MULTINATIONAL";

export type RoleAuthorityVerb =
  | "advisory"
  | "recommend"
  | "review"
  | "approve"
  | "reject"
  | "execute"
  | "delegate"
  | "escalate";

export type DecisionRoleLinkKind =
  | "PRIMARY_OWNER"
  | "CO_OWNER"
  | "APPROVER"
  | "REVIEWER"
  | "CONSULTED"
  | "INFORMED"
  | "EXECUTOR"
  | "CONTROL_OWNER";

export type RoleAliasResolutionStatus = "RESOLVED" | "AMBIGUOUS" | "UNKNOWN";

export interface BusinessRoleSourceRef {
  readonly sourceId: string;
  readonly url: string;
  readonly versionOrDate: string;
  readonly licenseOrRights: string;
  readonly provenance: "FLOW_CURATED" | "PUBLIC_REFERENCE";
  readonly confidence: "LOW" | "MEDIUM" | "HIGH";
  readonly freshness: "CURRENT" | "DATED" | "UNKNOWN";
}

export interface RoleEvidenceRequirement {
  readonly evidenceId: string;
  readonly label: string;
  readonly required: boolean;
  readonly decisionMaterial: boolean;
  readonly sourceType:
    "SYSTEM_OF_RECORD" | "DOCUMENT" | "POLICY" | "MODEL" | "HUMAN_INPUT";
  readonly freshnessRequirement: string;
  readonly authorizationRequirement: string;
}

export interface RoleDecisionLink {
  readonly decisionId: SemanticId;
  readonly roleId: SemanticId;
  readonly linkKind: DecisionRoleLinkKind;
  readonly configurableByWorkspace: true;
  readonly notes: string;
}

export interface RoleMetricLink {
  readonly metricId: SemanticId;
  readonly variable: string;
  readonly indicatorType:
    "LEADING" | "LAGGING" | "CONSTRAINT" | "DECISION_VARIABLE";
}

export interface RoleLanguagePattern {
  readonly phrase: string;
  readonly languageTag: "en" | "ur" | "ur-Latn" | "mixed";
  readonly likelyIntent: string;
  readonly decisionId: SemanticId;
  readonly variableIds: readonly string[];
  readonly evidenceRequirementIds: readonly string[];
  readonly expectedOutput: string;
}

export interface FounderTranslation {
  readonly phrase: string;
  readonly roleLensIds: readonly SemanticId[];
  readonly possibleInterpretations: readonly string[];
  readonly decisionMaterialQuestions: readonly string[];
}

export interface BusinessRolePacket {
  readonly role_id: SemanticId;
  readonly canonical_title: string;
  readonly role_family: BusinessRoleFamily;
  readonly functional_domain: string;
  readonly aliases: readonly string[];
  readonly abbreviations: readonly string[];
  readonly language_aliases: readonly RoleLanguagePattern[];
  readonly mission: string;
  readonly accountabilities: readonly string[];
  readonly decision_families: readonly string[];
  readonly recurring_decisions: readonly RoleDecisionLink[];
  readonly strategic_decisions: readonly RoleDecisionLink[];
  readonly operational_decisions: readonly RoleDecisionLink[];
  readonly crisis_decisions: readonly RoleDecisionLink[];
  readonly owned_business_objects: readonly SemanticId[];
  readonly influenced_business_objects: readonly SemanticId[];
  readonly core_variables: readonly string[];
  readonly constraints: readonly string[];
  readonly kpis: readonly RoleMetricLink[];
  readonly metrics: readonly SemanticId[];
  readonly formulas: readonly SemanticId[];
  readonly logic_ids: readonly SemanticId[];
  readonly evidence_requirements: readonly RoleEvidenceRequirement[];
  readonly preferred_sources: readonly string[];
  readonly systems_of_record: readonly string[];
  readonly documents_created: readonly string[];
  readonly documents_consumed: readonly string[];
  readonly workflows_owned: readonly SemanticId[];
  readonly workflows_participated: readonly SemanticId[];
  readonly meeting_cadences: readonly string[];
  readonly review_cadences: readonly string[];
  readonly reporting_relationships: readonly SemanticId[];
  readonly peer_roles: readonly SemanticId[];
  readonly cross_function_dependencies: readonly SemanticId[];
  readonly authority_scope: {
    readonly normative: readonly RoleAuthorityVerb[];
    readonly workspaceActualAuthorityOverridesNormative: true;
    readonly boundary: string;
  };
  readonly approval_limits: readonly string[];
  readonly escalation_conditions: readonly string[];
  readonly risk_responsibilities: readonly string[];
  readonly communication_style_defaults: readonly string[];
  readonly language_patterns: readonly RoleLanguagePattern[];
  readonly founder_translations: readonly FounderTranslation[];
  readonly high_value_cross_questions: readonly string[];
  readonly common_failure_modes: readonly string[];
  readonly cognitive_risks: readonly string[];
  readonly case_ids: readonly string[];
  readonly evaluation_ids: readonly string[];
  readonly industry_overrides: readonly RoleOverlay[];
  readonly scale_overrides: readonly RoleOverlay[];
  readonly jurisdiction_sensitivity: readonly string[];
  readonly source_refs: readonly BusinessRoleSourceRef[];
  readonly version: string;
  readonly status: BusinessRoleStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface RoleOverlay {
  readonly overlayId: string;
  readonly roleId: SemanticId;
  readonly overlayType: "SCALE" | "INDUSTRY" | "JURISDICTION" | "WORKSPACE";
  readonly match: string;
  readonly addedAccountabilities: readonly string[];
  readonly removedAccountabilities: readonly string[];
  readonly addedMetricIds: readonly SemanticId[];
  readonly addedEvidenceRequirementIds: readonly string[];
  readonly authorityNotes: readonly string[];
}

export interface WorkspaceRoleOverlay extends RoleOverlay {
  readonly overlayType: "WORKSPACE";
  readonly workspaceId: string;
  readonly workspaceTitle: string;
}

export interface BusinessRoleAssignment {
  readonly assignmentId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly businessRoleId: SemanticId;
  readonly workspaceRoleOverlayIds: readonly string[];
}

export interface WorkspaceRoleAssignment {
  readonly assignmentId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly workspaceRoleId: string;
  readonly securityRoleIds: readonly string[];
  readonly businessRoleIds: readonly SemanticId[];
}

export type SecurityRole = "ADMIN" | "EDITOR" | "MEMBER" | "VIEWER";

export interface RoleAliasResolutionCandidate {
  readonly role: BusinessRolePacket;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface RoleAliasResolution {
  readonly input: string;
  readonly normalizedInput: string;
  readonly status: RoleAliasResolutionStatus;
  readonly candidates: readonly RoleAliasResolutionCandidate[];
  readonly selectedRole?: BusinessRolePacket;
  readonly ambiguityReason?: string;
  readonly askIfDecisionMaterial: boolean;
}

export interface MultiRolePerspective {
  readonly roleId: SemanticId;
  readonly roleTitle: string;
  readonly keyConcern: string;
  readonly evidenceRequirementIds: readonly string[];
  readonly metricIds: readonly SemanticId[];
  readonly tradeOff: string;
  readonly recommendationBoundary: string;
  readonly conflictRoleIds: readonly SemanticId[];
}

export interface RoleQualityIssue {
  readonly code:
    | "DUPLICATE_ROLE_ID"
    | "DUPLICATE_ALIAS"
    | "AMBIGUOUS_ALIAS"
    | "DUPLICATE_METRIC_DEFINITION"
    | "INVALID_DECISION_LINK"
    | "ORPHAN_ROLE_REFERENCE"
    | "INVALID_AUTHORITY_MAPPING"
    | "MISSING_SOURCE_REFS";
  readonly message: string;
  readonly roleId?: SemanticId;
}

export interface RoleGapRepairRequest {
  readonly failingEvaluationId: string;
  readonly roleId: SemanticId;
  readonly missingCapability?: string;
  readonly missingDecision?: SemanticId;
  readonly missingMetric?: SemanticId;
  readonly missingLanguageMapping?: string;
  readonly missingEvidenceExpectation?: string;
  readonly missingAuthorityMapping?: string;
}

const compiledAt = "2026-08-14T00:00:00.000Z";

export const businessRoleSourceRefsV1: readonly BusinessRoleSourceRef[] = [
  {
    sourceId: "ONET-11-1011-CHIEF-EXECUTIVES-2026",
    url: "https://www.onetonline.org/link/summary/11-1011.00",
    versionOrDate: "Updated 2026",
    licenseOrRights: "O*NET public occupation data; attribution required.",
    provenance: "PUBLIC_REFERENCE",
    confidence: "HIGH",
    freshness: "CURRENT",
  },
  {
    sourceId: "IIBA-BABOK-TASKS",
    url: "https://www.iiba.org/knowledgehub/business-analysis-body-of-knowledge-babok-guide/tasks/",
    versionOrDate: "Accessed 2026-08-14",
    licenseOrRights:
      "Public web reference; do not copy proprietary BABOK text.",
    provenance: "PUBLIC_REFERENCE",
    confidence: "MEDIUM",
    freshness: "CURRENT",
  },
  {
    sourceId: "PMI-PROJECT-MANAGER-ROLE",
    url: "https://www.pmi.org/about/what-is-a-project-manager",
    versionOrDate: "Accessed 2026-08-14",
    licenseOrRights: "Public web reference; summarize only.",
    provenance: "PUBLIC_REFERENCE",
    confidence: "MEDIUM",
    freshness: "CURRENT",
  },
  {
    sourceId: "NIST-CSF-2.0-2024",
    url: "https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf",
    versionOrDate: "2024-02-26",
    licenseOrRights: "NIST public domain publication.",
    provenance: "PUBLIC_REFERENCE",
    confidence: "HIGH",
    freshness: "CURRENT",
  },
  {
    sourceId: "COSO-ERM-GUIDANCE",
    url: "https://www.coso.org/guidance-erm",
    versionOrDate: "Accessed 2026-08-14",
    licenseOrRights:
      "Public guidance landing page; framework content remains COSO-owned.",
    provenance: "PUBLIC_REFERENCE",
    confidence: "MEDIUM",
    freshness: "CURRENT",
  },
  {
    sourceId: "IFAC-CFO-FINANCE-VALUE-CREATION-2020",
    url: "https://www.ifac.org/knowledge-gateway/professional-accountants-business-paib/publications/cfo-and-finance-function-role-value-creation",
    versionOrDate: "2020-06-25",
    licenseOrRights: "Public IFAC resource; summarize only.",
    provenance: "PUBLIC_REFERENCE",
    confidence: "MEDIUM",
    freshness: "DATED",
  },
  {
    sourceId: "ISACA-CIO-CAREER-JOURNEY",
    url: "https://www.isaca.org/career-center/career-journey/governance-executive/chief-information-officer",
    versionOrDate: "Accessed 2026-08-14",
    licenseOrRights: "Public ISACA role page; summarize only.",
    provenance: "PUBLIC_REFERENCE",
    confidence: "MEDIUM",
    freshness: "CURRENT",
  },
  {
    sourceId: "ISACA-CISO-CAREER-JOURNEY",
    url: "https://www.isaca.org/career-center/career-journey/security-executive/chief-information-security-officer",
    versionOrDate: "Accessed 2026-08-14",
    licenseOrRights: "Public ISACA role page; summarize only.",
    provenance: "PUBLIC_REFERENCE",
    confidence: "MEDIUM",
    freshness: "CURRENT",
  },
  {
    sourceId: "FLOW-BLM-ROLE-SEED-008.1",
    url: "repository://attachments/91734846-ed64-4080-a2c4-ce015f72596a",
    versionOrDate: "2026-08-14",
    licenseOrRights: "User-supplied Flow product specification.",
    provenance: "FLOW_CURATED",
    confidence: "HIGH",
    freshness: "CURRENT",
  },
];

const familyDefaults: Record<
  BusinessRoleFamily,
  {
    readonly domain: string;
    readonly mission: string;
    readonly accountabilities: readonly string[];
    readonly variables: readonly string[];
    readonly metricIds: readonly SemanticId[];
    readonly evidence: readonly string[];
    readonly documents: readonly string[];
    readonly style: readonly string[];
  }
> = {
  BOARD_GOVERNANCE: defaults(
    "governance",
    "Provide oversight, challenge, approval conditions, and stewardship.",
    [
      "governance oversight",
      "material risk challenge",
      "executive accountability",
    ],
    ["enterprise value", "risk appetite", "capital allocation"],
    ["flow.decision.metric.finance.roic", "flow.decision.metric.risk.exposure"],
    ["board pack", "risk register", "financial statements"],
    ["board decision paper", "approval conditions"],
    ["decision-focused", "risk-aware", "materiality-driven"],
  ),
  EXECUTIVE_GENERAL_MANAGEMENT: defaults(
    "enterprise",
    "Integrate enterprise priorities and make cross-functional trade-offs.",
    ["strategy", "resource allocation", "operating cadence"],
    ["growth", "cash", "margin", "execution capacity"],
    [
      "flow.decision.metric.finance.cash-flow",
      "flow.decision.metric.finance.gross-margin",
    ],
    ["operating review", "financial forecast", "customer evidence"],
    ["strategy memo", "priority memo"],
    ["enterprise trade-offs", "options", "decision"],
  ),
  FINANCE: defaults(
    "finance",
    "Protect financial truth, liquidity, controls, and value creation.",
    ["forecasting", "financial control", "capital allocation"],
    ["cash", "working capital", "margin", "runway", "variance"],
    [
      "flow.decision.metric.finance.cash-flow",
      "flow.decision.metric.finance.gross-margin",
      "flow.decision.metric.finance.ar-aging",
    ],
    ["ledger", "cash forecast", "financial model"],
    ["forecast", "variance bridge", "investment memo"],
    ["numbers", "variance", "cash", "scenario", "assumptions"],
  ),
  REVENUE: defaults(
    "revenue",
    "Own commercial performance across pipeline, conversion, pricing, and retention.",
    ["revenue strategy", "pipeline governance", "commercial execution"],
    ["pipeline", "win rate", "deal size", "sales cycle"],
    [
      "flow.decision.metric.crm.win-rate",
      "flow.decision.metric.crm.average-deal-size",
      "flow.decision.metric.crm.sales-cycle-length",
    ],
    ["CRM pipeline", "bookings report", "pricing policy"],
    ["revenue plan", "forecast call"],
    ["pipeline", "conversion", "deal quality"],
  ),
  MARKETING: defaults(
    "marketing",
    "Create demand and market understanding while proving incremental growth.",
    ["positioning", "channel allocation", "demand generation"],
    ["CAC", "LTV", "conversion", "incrementality"],
    [
      "flow.decision.metric.marketing.conversion-rate",
      "flow.decision.metric.marketing.cac",
    ],
    ["cohorts", "channel report", "creative performance"],
    ["growth strategy", "channel plan"],
    ["customer", "positioning", "channel economics"],
  ),
  SALES: defaults(
    "sales",
    "Convert qualified demand into durable, profitable customer commitments.",
    ["sales execution", "forecast discipline", "account strategy"],
    ["pipeline coverage", "win rate", "discount", "deal velocity"],
    [
      "flow.decision.metric.crm.win-rate",
      "flow.decision.metric.crm.pipeline-coverage",
    ],
    ["CRM opportunity data", "deal desk notes", "contracts"],
    ["sales forecast", "account plan"],
    ["customer need", "deal risk", "next step"],
  ),
  CUSTOMER: defaults(
    "customer",
    "Improve customer outcomes, retention, and support experience.",
    ["retention", "support quality", "customer health"],
    ["churn", "NPS", "ticket backlog", "time to resolution"],
    [
      "flow.decision.metric.marketing.churn-rate",
      "flow.decision.metric.customer.nps",
    ],
    ["support tickets", "customer health score", "renewal forecast"],
    ["customer health review", "retention plan"],
    ["outcome", "experience", "renewal risk"],
  ),
  OPERATIONS: defaults(
    "operations",
    "Translate strategy into reliable throughput, capacity, quality, and service levels.",
    ["capacity", "process performance", "execution cadence"],
    ["throughput", "capacity", "utilization", "cycle time", "quality"],
    [
      "flow.decision.metric.operations.throughput",
      "flow.decision.metric.project.utilization",
    ],
    ["backlog", "capacity plan", "quality report"],
    ["operating review", "capacity plan"],
    ["process", "constraint", "owner", "timing"],
  ),
  SUPPLY_CHAIN: defaults(
    "supply-chain",
    "Balance supply continuity, working capital, supplier risk, and fulfillment reliability.",
    ["supplier performance", "availability", "procurement continuity"],
    ["OTIF", "lead time", "inventory", "supplier risk"],
    [
      "flow.decision.metric.inventory.available-stock",
      "flow.decision.metric.procurement.supplier-otif",
    ],
    ["purchase orders", "supplier scorecard", "inventory report"],
    ["supply plan", "supplier review"],
    ["availability", "lead time", "trade-off"],
  ),
  MANUFACTURING: defaults(
    "manufacturing",
    "Run production safely, efficiently, and at the required quality level.",
    ["production planning", "quality", "maintenance"],
    ["yield", "OEE", "scrap", "downtime"],
    [
      "flow.decision.metric.manufacturing.oee",
      "flow.decision.metric.manufacturing.scrap-rate",
    ],
    ["production schedule", "BOM", "quality logs"],
    ["production review", "quality plan"],
    ["throughput", "yield", "downtime"],
  ),
  PROJECT_PROGRAM: defaults(
    "project-program",
    "Coordinate programs, dependencies, delivery risk, and benefits realization.",
    ["program governance", "dependency management", "delivery assurance"],
    ["milestone risk", "budget variance", "scope change"],
    [
      "flow.decision.metric.project.margin",
      "flow.decision.metric.project.schedule-variance",
    ],
    ["program plan", "RAID log", "budget tracker"],
    ["program review", "delivery plan"],
    ["scope", "dependency", "risk"],
  ),
  PRODUCT: defaults(
    "product",
    "Prioritize customer, business, and delivery outcomes through the product roadmap.",
    ["roadmap", "discovery", "launch decisions"],
    ["adoption", "retention", "usage", "roadmap capacity"],
    [
      "flow.decision.metric.product.adoption",
      "flow.decision.metric.customer.retention",
    ],
    ["research", "usage analytics", "roadmap"],
    ["product strategy", "roadmap recommendation"],
    ["customer", "trade-off", "outcome"],
  ),
  TECHNOLOGY: defaults(
    "technology",
    "Ensure technology choices support business outcomes, reliability, cost, and scale.",
    ["architecture", "platform operations", "technical risk"],
    ["TCO", "availability", "technical debt", "delivery capacity"],
    [
      "flow.decision.metric.technology.tco",
      "flow.decision.metric.technology.availability",
    ],
    ["architecture record", "incident data", "cost report"],
    ["architecture decision record", "technology strategy"],
    ["architecture", "risk", "TCO", "reliability"],
  ),
  DATA_ANALYTICS: defaults(
    "data-analytics",
    "Make data reliable, governed, and decision-useful.",
    ["data quality", "analytics enablement", "governance"],
    ["data freshness", "metric trust", "adoption"],
    [
      "flow.decision.metric.data.quality",
      "flow.decision.metric.analytics.adoption",
    ],
    ["semantic layer", "data quality report", "BI usage"],
    ["analytics plan", "metric governance memo"],
    ["definition", "lineage", "confidence"],
  ),
  AI: defaults(
    "ai",
    "Apply AI where evidence, safety, cost, and business value justify it.",
    ["AI portfolio", "model risk", "automation economics"],
    ["ROI", "error rate", "latency", "human review load"],
    ["flow.decision.metric.ai.roi", "flow.decision.metric.ai.error-rate"],
    ["evaluation results", "risk assessment", "usage data"],
    ["AI deployment memo", "model evaluation"],
    ["evaluation", "risk", "automation boundary"],
  ),
  SECURITY: defaults(
    "security",
    "Protect information assets through risk-based controls, monitoring, and response.",
    ["security governance", "risk treatment", "incident readiness"],
    ["control coverage", "risk exposure", "MTTD", "MTTR"],
    [
      "flow.decision.metric.security.risk-exposure",
      "flow.decision.metric.security.mttr",
    ],
    ["risk register", "incident report", "control assessment"],
    ["security plan", "risk exception"],
    ["control", "risk", "friction", "resilience"],
  ),
  PEOPLE_HR: defaults(
    "people-hr",
    "Build workforce capability while managing people risk, fairness, and change.",
    ["workforce planning", "talent", "org design"],
    ["attrition", "capability gap", "labor cost", "engagement"],
    [
      "flow.decision.metric.hr.attrition",
      "flow.decision.metric.hr.capability-gap",
    ],
    ["workforce plan", "performance evidence", "compensation bands"],
    ["workforce plan", "org design"],
    ["capability", "people risk", "change"],
  ),
  LEGAL: defaults(
    "legal",
    "Protect legal position while enabling acceptable commercial outcomes.",
    ["contract risk", "legal advice coordination", "dispute prevention"],
    ["liability", "contract exposure", "regulatory risk"],
    [
      "flow.decision.metric.legal.contract-risk",
      "flow.decision.metric.risk.exposure",
    ],
    ["contracts", "policies", "legal register"],
    ["legal review", "contract position"],
    ["risk allocation", "obligation", "precedent"],
  ),
  COMPLIANCE: defaults(
    "compliance",
    "Ensure obligations, controls, monitoring, and reporting are governed.",
    ["obligation tracking", "control monitoring", "compliance reporting"],
    ["control exceptions", "obligation coverage", "testing status"],
    [
      "flow.decision.metric.compliance.control-exceptions",
      "flow.decision.metric.risk.exposure",
    ],
    ["obligation register", "control tests", "policy attestations"],
    ["compliance report", "remediation plan"],
    ["obligation", "control", "evidence"],
  ),
  RISK: defaults(
    "risk",
    "Integrate risk appetite, controls, and enterprise decision quality.",
    ["risk appetite", "risk assessment", "control challenge"],
    ["risk exposure", "likelihood", "impact", "control effectiveness"],
    [
      "flow.decision.metric.risk.exposure",
      "flow.decision.metric.risk.control-effectiveness",
    ],
    ["risk register", "control assessment", "scenario analysis"],
    ["risk challenge", "risk report"],
    ["risk appetite", "control", "scenario"],
  ),
  INTERNAL_AUDIT: defaults(
    "internal-audit",
    "Independently assess control design, operation, and governance evidence.",
    ["audit planning", "control testing", "findings"],
    ["finding severity", "control failure", "remediation age"],
    [
      "flow.decision.metric.audit.finding-severity",
      "flow.decision.metric.compliance.control-exceptions",
    ],
    ["audit workpapers", "control evidence", "management response"],
    ["audit report", "finding memo"],
    ["independence", "evidence", "control"],
  ),
  STRATEGY: defaults(
    "strategy",
    "Clarify choices, trade-offs, market options, and transformation sequencing.",
    ["strategic planning", "portfolio choices", "transformation"],
    ["market attractiveness", "option value", "execution capacity"],
    [
      "flow.decision.metric.strategy.option-value",
      "flow.decision.metric.finance.roic",
    ],
    ["market analysis", "operating model", "portfolio data"],
    ["strategy memo", "transformation roadmap"],
    ["choice", "trade-off", "scenario"],
  ),
  CORPORATE_DEVELOPMENT: defaults(
    "corporate-development",
    "Evaluate inorganic growth, partnerships, capital events, and investor communication.",
    ["M&A", "partnerships", "investor narrative"],
    ["valuation", "synergy", "dilution", "strategic fit"],
    [
      "flow.decision.metric.corpdev.valuation",
      "flow.decision.metric.finance.roic",
    ],
    ["deal model", "diligence", "cap table"],
    ["investment memo", "IR brief"],
    ["fit", "valuation", "risk"],
  ),
  REGIONAL_GENERAL_MANAGEMENT: defaults(
    "regional-general-management",
    "Run a business unit or geography with local P&L, market, and execution trade-offs.",
    ["local P&L", "regional strategy", "execution alignment"],
    ["regional revenue", "margin", "market risk"],
    [
      "flow.decision.metric.finance.gross-margin",
      "flow.decision.metric.crm.win-rate",
    ],
    ["regional P&L", "local market data", "operating review"],
    ["regional plan", "business review"],
    ["local market", "P&L", "execution"],
  ),
  FOUNDER_OWNER: defaults(
    "founder-owner",
    "Integrate owner judgment, survival constraints, growth, cash, and operating reality.",
    ["business survival", "growth choices", "owner approvals"],
    ["cash", "runway", "margin", "capacity", "focus"],
    [
      "flow.decision.metric.finance.cash-flow",
      "flow.decision.metric.finance.runway",
    ],
    ["bank balance", "pipeline", "delivery capacity", "customer list"],
    ["owner decision memo", "priority plan"],
    ["plain language", "trade-off", "cash reality"],
  ),
};

const roleSeeds = [
  [
    "board-chair",
    "Board Chair",
    "BOARD_GOVERNANCE",
    ["Chair", "Board Chairman", "Board Chairperson"],
    ["Chair"],
  ],
  [
    "board-director",
    "Board Director",
    "BOARD_GOVERNANCE",
    ["Director", "Non-Executive Director"],
    ["NED"],
  ],
  [
    "ceo",
    "CEO",
    "EXECUTIVE_GENERAL_MANAGEMENT",
    ["Chief Executive Officer", "President", "Managing Director"],
    ["CEO"],
  ],
  [
    "coo",
    "COO",
    "OPERATIONS",
    ["Chief Operating Officer", "Operations Chief"],
    ["COO"],
  ],
  [
    "cfo",
    "CFO",
    "FINANCE",
    ["Chief Financial Officer", "Finance Chief"],
    ["CFO"],
  ],
  [
    "cto",
    "CTO",
    "TECHNOLOGY",
    ["Chief Technology Officer", "Technology Chief"],
    ["CTO"],
  ],
  [
    "cio",
    "CIO",
    "TECHNOLOGY",
    ["Chief Information Officer", "IT Chief"],
    ["CIO"],
  ],
  [
    "cmo",
    "CMO",
    "MARKETING",
    ["Chief Marketing Officer", "Marketing Chief"],
    ["CMO"],
  ],
  [
    "chief-revenue-officer",
    "Chief Revenue Officer",
    "REVENUE",
    ["Revenue Chief", "Chief Commercial Officer"],
    ["CRO", "CCO"],
  ],
  [
    "chro",
    "CHRO",
    "PEOPLE_HR",
    ["Chief Human Resources Officer", "People Chief"],
    ["CHRO"],
  ],
  [
    "general-counsel",
    "General Counsel / CLO",
    "LEGAL",
    ["Chief Legal Officer", "General Counsel"],
    ["GC", "CLO"],
  ],
  [
    "chief-risk-officer",
    "Chief Risk Officer",
    "RISK",
    ["Risk Chief", "Enterprise Risk Officer"],
    ["CRO"],
  ],
  [
    "chief-strategy-officer",
    "Chief Strategy Officer",
    "STRATEGY",
    ["Strategy Chief"],
    ["CSO"],
  ],
  [
    "chief-product-officer",
    "Chief Product Officer",
    "PRODUCT",
    ["Product Chief"],
    ["CPO"],
  ],
  [
    "chief-data-analytics-officer",
    "Chief Data / Analytics Officer",
    "DATA_ANALYTICS",
    ["Chief Data Officer", "Chief Analytics Officer"],
    ["CDO", "CAO", "CDAO"],
  ],
  [
    "ciso",
    "CISO",
    "SECURITY",
    ["Chief Information Security Officer", "Security Chief"],
    ["CISO"],
  ],
  [
    "chief-customer-officer",
    "Chief Customer Officer",
    "CUSTOMER",
    ["Customer Chief"],
    ["CCO"],
  ],
  [
    "vp-sales",
    "VP Sales",
    "SALES",
    ["Vice President Sales", "Head of Sales"],
    ["VP Sales"],
  ],
  [
    "vp-marketing-growth",
    "VP Marketing / Growth",
    "MARKETING",
    ["VP Growth", "Head of Growth"],
    ["VP Marketing"],
  ],
  [
    "vp-finance",
    "VP Finance",
    "FINANCE",
    ["Head of Finance", "Finance VP"],
    ["VP Finance"],
  ],
  [
    "controller",
    "Controller",
    "FINANCE",
    ["Financial Controller", "Corporate Controller"],
    [],
  ],
  ["treasurer", "Treasurer", "FINANCE", ["Corporate Treasurer"], []],
  [
    "fpa-director",
    "FP&A Director",
    "FINANCE",
    ["Financial Planning and Analysis Director"],
    ["FP&A"],
  ],
  [
    "accounting-director",
    "Accounting Director",
    "FINANCE",
    ["Director of Accounting"],
    [],
  ],
  ["tax-director", "Tax Director", "FINANCE", ["Director of Tax"], []],
  [
    "operations-director",
    "Operations Director",
    "OPERATIONS",
    ["Director of Operations"],
    [],
  ],
  [
    "supply-chain-director",
    "Supply Chain Director",
    "SUPPLY_CHAIN",
    ["Director of Supply Chain"],
    [],
  ],
  [
    "procurement-director",
    "Procurement Director",
    "SUPPLY_CHAIN",
    ["Director of Procurement"],
    [],
  ],
  [
    "manufacturing-director",
    "Manufacturing Director",
    "MANUFACTURING",
    ["Director of Manufacturing"],
    [],
  ],
  [
    "quality-director",
    "Quality Director",
    "MANUFACTURING",
    ["Director of Quality"],
    [],
  ],
  [
    "maintenance-reliability-director",
    "Maintenance / Reliability Director",
    "MANUFACTURING",
    ["Reliability Director"],
    [],
  ],
  [
    "logistics-warehouse-director",
    "Logistics / Warehouse Director",
    "SUPPLY_CHAIN",
    ["Warehouse Director", "Logistics Director"],
    [],
  ],
  [
    "pmo-program-director",
    "PMO / Program Director",
    "PROJECT_PROGRAM",
    ["Program Director", "PMO Director"],
    ["PMO"],
  ],
  [
    "product-director",
    "Product Director",
    "PRODUCT",
    ["Director of Product"],
    [],
  ],
  [
    "engineering-director",
    "Engineering Director",
    "TECHNOLOGY",
    ["Director of Engineering"],
    [],
  ],
  ["it-director", "IT Director", "TECHNOLOGY", ["Director of IT"], []],
  [
    "data-bi-director",
    "Data / BI Director",
    "DATA_ANALYTICS",
    ["BI Director", "Data Director"],
    ["BI"],
  ],
  [
    "ai-ml-director",
    "AI / ML Director",
    "AI",
    ["AI Director", "Machine Learning Director"],
    ["AI", "ML"],
  ],
  [
    "security-director",
    "Security Director",
    "SECURITY",
    ["Director of Security"],
    [],
  ],
  [
    "hr-director",
    "HR Director",
    "PEOPLE_HR",
    ["Human Resources Director"],
    ["HR"],
  ],
  [
    "talent-acquisition-director",
    "Talent Acquisition Director",
    "PEOPLE_HR",
    ["Recruiting Director"],
    ["TA"],
  ],
  [
    "ld-director",
    "L&D Director",
    "PEOPLE_HR",
    ["Learning and Development Director"],
    ["L&D"],
  ],
  [
    "comp-benefits-director",
    "Compensation & Benefits Director",
    "PEOPLE_HR",
    ["Total Rewards Director"],
    [],
  ],
  [
    "employee-relations-director",
    "Employee Relations Director",
    "PEOPLE_HR",
    ["ER Director"],
    ["ER"],
  ],
  ["legal-director", "Legal Director", "LEGAL", ["Director of Legal"], []],
  [
    "compliance-director",
    "Compliance Director",
    "COMPLIANCE",
    ["Director of Compliance"],
    [],
  ],
  [
    "internal-audit-director",
    "Internal Audit Director",
    "INTERNAL_AUDIT",
    ["Director of Internal Audit"],
    [],
  ],
  [
    "customer-success-director",
    "Customer Success Director",
    "CUSTOMER",
    ["CS Director"],
    ["CS"],
  ],
  [
    "customer-support-director",
    "Customer Support Director",
    "CUSTOMER",
    ["Support Director"],
    [],
  ],
  [
    "revenue-operations-director",
    "Revenue Operations Director",
    "REVENUE",
    ["RevOps Director"],
    ["RevOps"],
  ],
  [
    "sales-operations-director",
    "Sales Operations Director",
    "SALES",
    ["Sales Ops Director"],
    ["Sales Ops"],
  ],
  [
    "marketing-operations-director",
    "Marketing Operations Director",
    "MARKETING",
    ["Marketing Ops Director"],
    ["Marketing Ops"],
  ],
  [
    "ecommerce-director",
    "E-commerce Director",
    "REVENUE",
    ["Ecommerce Director"],
    [],
  ],
  [
    "retail-director",
    "Retail Director",
    "OPERATIONS",
    ["Director of Retail"],
    [],
  ],
  [
    "corporate-development-ma-director",
    "Corporate Development / M&A Director",
    "CORPORATE_DEVELOPMENT",
    ["M&A Director", "Corporate Development Director"],
    ["M&A"],
  ],
  [
    "investor-relations-director",
    "Investor Relations Director",
    "CORPORATE_DEVELOPMENT",
    ["IR Director"],
    ["IR"],
  ],
  [
    "strategy-transformation-director",
    "Strategy / Transformation Director",
    "STRATEGY",
    ["Transformation Director", "Strategy Director"],
    [],
  ],
  [
    "business-unit-general-manager",
    "Business Unit General Manager",
    "REGIONAL_GENERAL_MANAGEMENT",
    ["BU General Manager", "General Manager"],
    ["GM"],
  ],
  [
    "country-regional-general-manager",
    "Country / Regional General Manager",
    "REGIONAL_GENERAL_MANAGEMENT",
    ["Country Manager", "Regional GM"],
    ["GM"],
  ],
  [
    "founder-owner",
    "Founder / Owner",
    "FOUNDER_OWNER",
    ["Founder", "Owner", "Business Owner"],
    [],
  ],
] as const satisfies readonly (readonly [
  string,
  string,
  BusinessRoleFamily,
  readonly string[],
  readonly string[],
])[];

const executiveMajorRoleIds = new Set([
  "board-chair",
  "board-director",
  "ceo",
  "coo",
  "cfo",
  "cto",
  "cio",
  "cmo",
  "chief-revenue-officer",
  "chro",
  "general-counsel",
  "chief-risk-officer",
  "chief-strategy-officer",
  "chief-product-officer",
  "chief-data-analytics-officer",
  "ciso",
  "chief-customer-officer",
]);

export const universalBusinessRolesV1: readonly BusinessRolePacket[] =
  roleSeeds.map(([key, title, family, aliases, abbreviations]) =>
    buildRolePacket(key, title, family, aliases, abbreviations),
  );

export const roleDecisionOwnershipGraphV1: readonly RoleDecisionLink[] =
  universalBusinessRolesV1.flatMap((role) => [
    ...role.recurring_decisions,
    ...role.strategic_decisions,
    ...role.operational_decisions,
    ...role.crisis_decisions,
  ]);

export const roleMetricGraphV1: readonly RoleMetricLink[] =
  universalBusinessRolesV1.flatMap((role) => role.kpis);

export const roleEvidenceRequirementsV1: readonly RoleEvidenceRequirement[] =
  universalBusinessRolesV1.flatMap((role) => role.evidence_requirements);

export const roleEvaluationCasesV1 = universalBusinessRolesV1.flatMap((role) =>
  Array.from({
    length: executiveMajorRoleIds.has(role.role_id.split(".").at(-1) ?? "")
      ? 5
      : 2,
  }).map((_, index) => ({
    evaluationId: `flow.eval.role.${role.role_id.split(".").at(-1)}.${index + 1}`,
    roleId: role.role_id,
    category: [
      "role vocabulary",
      "decision priorities",
      "metric selection",
      "evidence requirements",
      "authority boundaries",
    ][index % 5]!,
    languageVariants: ["en", "ur", "ur-Latn", "mixed"] as const,
    expectedMetricIds: role.metrics.slice(0, 3),
    expectedEvidenceRequirementIds: role.evidence_requirements
      .slice(0, 3)
      .map((item) => item.evidenceId),
    expectedAuthorityBoundary: role.authority_scope.boundary,
  })),
);

export const roleConfusionPairsV1 = [
  ["flow.role.business.cfo", "flow.role.business.controller"],
  ["flow.role.business.cio", "flow.role.business.cto"],
  ["flow.role.business.cmo", "flow.role.business.chief-revenue-officer"],
  [
    "flow.role.business.chief-revenue-officer",
    "flow.role.business.chief-risk-officer",
  ],
  ["flow.role.business.chro", "flow.role.business.hr-director"],
  ["flow.role.business.board-director", "flow.role.business.ceo"],
  [
    "flow.role.business.strategy-transformation-director",
    "flow.role.business.pmo-program-director",
  ],
  ["flow.role.business.ciso", "flow.role.business.security-director"],
  [
    "flow.role.business.chief-product-officer",
    "flow.role.business.product-director",
  ],
] as const;

export function resolveBusinessRoleAlias(input: {
  readonly title: string;
  readonly businessContext?: readonly string[];
  readonly decisionContext?: readonly string[];
  readonly decisionMaterial?: boolean;
}): RoleAliasResolution {
  const normalizedInput = normalizeRoleAlias(input.title);
  const candidates = universalBusinessRolesV1
    .map((role) => {
      const names = [
        role.canonical_title,
        ...role.aliases,
        ...role.abbreviations,
      ].map(normalizeRoleAlias);
      const exact = names.includes(normalizedInput);
      const contextualScore = scoreRoleContext(role, [
        ...(input.businessContext ?? []),
        ...(input.decisionContext ?? []),
      ]);
      return {
        role,
        score: (exact ? 10 : 0) + contextualScore,
        reasons: [
          ...(exact ? ["alias/title match"] : []),
          ...(contextualScore > 0 ? ["context matched role domain"] : []),
        ],
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);
  if (candidates.length === 0) {
    return {
      input: input.title,
      normalizedInput,
      status: "UNKNOWN",
      candidates: [],
      askIfDecisionMaterial: Boolean(input.decisionMaterial),
    };
  }
  const topScore = candidates[0]?.score ?? 0;
  const tied = candidates.filter((candidate) => candidate.score === topScore);
  if (tied.length > 1) {
    return {
      input: input.title,
      normalizedInput,
      status: "AMBIGUOUS",
      candidates: tied,
      ambiguityReason:
        "Multiple business roles share this alias or abbreviation.",
      askIfDecisionMaterial: true,
    };
  }
  return {
    input: input.title,
    normalizedInput,
    status: "RESOLVED",
    candidates: tied,
    selectedRole: tied[0]!.role,
    askIfDecisionMaterial: false,
  };
}

export function createWorkspaceRoleOverlay(input: {
  readonly workspaceId: string;
  readonly roleId: SemanticId;
  readonly workspaceTitle: string;
  readonly addedAccountabilities?: readonly string[];
  readonly removedAccountabilities?: readonly string[];
  readonly addedMetricIds?: readonly SemanticId[];
  readonly authorityNotes?: readonly string[];
}): WorkspaceRoleOverlay {
  return {
    overlayId: `workspace-role-overlay:${input.workspaceId}:${input.workspaceTitle
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")}`,
    roleId: input.roleId,
    overlayType: "WORKSPACE",
    match: input.workspaceTitle,
    workspaceId: input.workspaceId,
    workspaceTitle: input.workspaceTitle,
    addedAccountabilities: input.addedAccountabilities ?? [],
    removedAccountabilities: input.removedAccountabilities ?? [],
    addedMetricIds: input.addedMetricIds ?? [],
    addedEvidenceRequirementIds: [],
    authorityNotes: input.authorityNotes ?? [
      "Workspace actual authority must be checked separately.",
    ],
  };
}

export function applyRoleOverlays(input: {
  readonly role: BusinessRolePacket;
  readonly overlays: readonly RoleOverlay[];
}): BusinessRolePacket {
  const relevant = input.overlays.filter(
    (overlay) => overlay.roleId === input.role.role_id,
  );
  if (relevant.length === 0) return input.role;
  const removed = new Set(
    relevant.flatMap((overlay) => overlay.removedAccountabilities),
  );
  const addedAccountabilities = relevant.flatMap(
    (overlay) => overlay.addedAccountabilities,
  );
  const addedMetrics = relevant.flatMap((overlay) => overlay.addedMetricIds);
  return {
    ...input.role,
    accountabilities: [
      ...input.role.accountabilities.filter((item) => !removed.has(item)),
      ...addedAccountabilities,
    ],
    metrics: uniqueSemanticIds([...input.role.metrics, ...addedMetrics]),
    kpis: [
      ...input.role.kpis,
      ...addedMetrics.map((metricId) => ({
        metricId,
        variable: "workspace-specific responsibility",
        indicatorType: "DECISION_VARIABLE" as const,
      })),
    ],
    authority_scope: {
      ...input.role.authority_scope,
      boundary:
        "Universal role knowledge remains advisory; workspace actual authority overrides this overlay.",
    },
  };
}

export function createMultiRolePerspectives(
  roles: readonly BusinessRolePacket[],
): readonly MultiRolePerspective[] {
  return roles.map((role) => ({
    roleId: role.role_id,
    roleTitle: role.canonical_title,
    keyConcern: role.core_variables.slice(0, 3).join(", "),
    evidenceRequirementIds: role.evidence_requirements
      .slice(0, 3)
      .map((item) => item.evidenceId),
    metricIds: role.metrics.slice(0, 3),
    tradeOff: role.cross_function_dependencies.length
      ? "Role lens should surface trade-offs against peer functions instead of impersonating a persona."
      : "Role lens should stay grounded in shared evidence.",
    recommendationBoundary:
      "Recommend and explain; do not grant authority or execute actions.",
    conflictRoleIds: role.cross_function_dependencies,
  }));
}

export function validateBusinessRoleRegistry(
  roles: readonly BusinessRolePacket[] = universalBusinessRolesV1,
): readonly RoleQualityIssue[] {
  const issues: RoleQualityIssue[] = [];
  const roleIds = new Set<string>();
  const aliasOwners = new Map<string, SemanticId[]>();
  const knownIds = new Set(roles.map((role) => role.role_id));
  for (const role of roles) {
    if (roleIds.has(role.role_id)) {
      issues.push({
        code: "DUPLICATE_ROLE_ID",
        message: `Duplicate role id ${role.role_id}`,
        roleId: role.role_id,
      });
    }
    roleIds.add(role.role_id);
    if (role.source_refs.length === 0) {
      issues.push({
        code: "MISSING_SOURCE_REFS",
        message: `Role ${role.role_id} has no source refs.`,
        roleId: role.role_id,
      });
    }
    if (!role.authority_scope.workspaceActualAuthorityOverridesNormative) {
      issues.push({
        code: "INVALID_AUTHORITY_MAPPING",
        message: `Role ${role.role_id} does not preserve workspace authority override.`,
        roleId: role.role_id,
      });
    }
    for (const peerRoleId of [
      ...role.peer_roles,
      ...role.cross_function_dependencies,
      ...role.reporting_relationships,
    ]) {
      if (!knownIds.has(peerRoleId)) {
        issues.push({
          code: "ORPHAN_ROLE_REFERENCE",
          message: `${role.role_id} references unknown role ${peerRoleId}`,
          roleId: role.role_id,
        });
      }
    }
    for (const alias of [
      role.canonical_title,
      ...role.aliases,
      ...role.abbreviations,
    ]) {
      const normalized = normalizeRoleAlias(alias);
      aliasOwners.set(normalized, [
        ...(aliasOwners.get(normalized) ?? []),
        role.role_id,
      ]);
    }
  }
  for (const [alias, owners] of aliasOwners) {
    const uniqueOwners = [...new Set(owners)];
    if (
      uniqueOwners.length > 1 &&
      alias !== "cro" &&
      alias !== "cco" &&
      alias !== "gm"
    ) {
      issues.push({
        code: "DUPLICATE_ALIAS",
        message: `Alias ${alias} maps to ${uniqueOwners.join(", ")}`,
      });
    }
  }
  return issues;
}

function buildRolePacket(
  key: string,
  title: string,
  family: BusinessRoleFamily,
  aliases: readonly string[],
  abbreviations: readonly string[],
): BusinessRolePacket {
  const roleId = toSemanticId(`flow.role.business.${key}`);
  const defaultsForFamily = familyDefaults[family];
  const decision = decisionId(defaultsForFamily.domain, "role-context");
  const metrics = defaultsForFamily.metricIds;
  const evidenceRequirements = defaultsForFamily.evidence.map(
    (label, index) => ({
      evidenceId: `evidence:${key}:${index + 1}`,
      label,
      required: index === 0,
      decisionMaterial: index <= 1,
      sourceType:
        index === 0 ? ("SYSTEM_OF_RECORD" as const) : ("DOCUMENT" as const),
      freshnessRequirement:
        index === 0 ? "current operating period" : "decision-relevant period",
      authorizationRequirement:
        "Workspace permission required before evidence enters context.",
    }),
  );
  return {
    role_id: roleId,
    canonical_title: title,
    role_family: family,
    functional_domain: defaultsForFamily.domain,
    aliases,
    abbreviations,
    language_aliases: languagePatterns(key, roleId, decision),
    mission: titleSpecificMission(title, defaultsForFamily.mission),
    accountabilities: defaultsForFamily.accountabilities,
    decision_families: [
      "diagnostic",
      "planning",
      "resource allocation",
      "risk review",
    ],
    recurring_decisions: [roleDecision(roleId, decision, "PRIMARY_OWNER")],
    strategic_decisions: [
      roleDecision(
        roleId,
        decisionId(defaultsForFamily.domain, "strategy"),
        "REVIEWER",
      ),
    ],
    operational_decisions: [
      roleDecision(
        roleId,
        decisionId(defaultsForFamily.domain, "operations"),
        "CONSULTED",
      ),
    ],
    crisis_decisions: [
      roleDecision(
        roleId,
        decisionId(defaultsForFamily.domain, "crisis"),
        "CONTROL_OWNER",
      ),
    ],
    owned_business_objects: [
      conceptId(defaultsForFamily.domain, "operating-context"),
    ],
    influenced_business_objects: [
      conceptId("enterprise", "objective"),
      conceptId("risk", "trade-off"),
    ],
    core_variables: titleSpecificVariables(key, defaultsForFamily.variables),
    constraints: [
      "authority boundary",
      "evidence sufficiency",
      "workspace permissions",
    ],
    kpis: metrics.map((metricId, index) => ({
      metricId,
      variable:
        defaultsForFamily.variables[index] ??
        defaultsForFamily.variables[0] ??
        "business outcome",
      indicatorType:
        index === 0 ? "DECISION_VARIABLE" : index === 1 ? "LAGGING" : "LEADING",
    })),
    metrics,
    formulas: formulaIdsForFamily(family),
    logic_ids: logicIdsForFamily(family),
    evidence_requirements: evidenceRequirements,
    preferred_sources: evidenceRequirements.map((item) => item.label),
    systems_of_record: systemsOfRecordForFamily(family),
    documents_created: defaultsForFamily.documents,
    documents_consumed: defaultsForFamily.evidence,
    workflows_owned: [workflowId(defaultsForFamily.domain, "review")],
    workflows_participated: [workflowId("enterprise", "decision-review")],
    meeting_cadences: ["weekly operating review", "monthly business review"],
    review_cadences: ["monthly", "quarterly"],
    reporting_relationships: reportingRelationshipsFor(key),
    peer_roles: peerRolesFor(key),
    cross_function_dependencies: crossDependenciesFor(family),
    authority_scope: {
      normative: authorityForFamily(family),
      workspaceActualAuthorityOverridesNormative: true,
      boundary:
        "Role packet describes normative advisory context only; workspace permissions and Action Wall determine actual authority.",
    },
    approval_limits: [
      "Do not infer approval limits from title.",
      "Use workspace policy and approval records.",
    ],
    escalation_conditions: [
      "material financial impact",
      "legal/regulatory uncertainty",
      "insufficient evidence",
      "authority ambiguity",
    ],
    risk_responsibilities: riskResponsibilitiesFor(family),
    communication_style_defaults: defaultsForFamily.style,
    language_patterns: languagePatterns(key, roleId, decision),
    founder_translations: founderTranslationsFor(roleId),
    high_value_cross_questions: crossQuestionsFor(family),
    common_failure_modes: failureModesFor(key, family),
    cognitive_risks: [
      "departmental tunnel vision",
      "unsupported certainty",
      "metric overfocus",
    ],
    case_ids: [`role-case:${key}:v1`],
    evaluation_ids: roleEvaluationIdsFor(key),
    industry_overrides: [],
    scale_overrides: scaleOverlaysFor(roleId, key),
    jurisdiction_sensitivity: jurisdictionSensitivityFor(family),
    source_refs: sourceRefsFor(family),
    version: "1.0.0",
    status: "VALIDATED",
    created_at: compiledAt,
    updated_at: compiledAt,
  };
}

function defaults(
  domain: string,
  mission: string,
  accountabilities: readonly string[],
  variables: readonly string[],
  metricIds: readonly string[],
  evidence: readonly string[],
  documents: readonly string[],
  style: readonly string[],
) {
  return {
    domain,
    mission,
    accountabilities,
    variables,
    metricIds: metricIds.map(toSemanticId),
    evidence,
    documents,
    style,
  };
}

function titleSpecificMission(title: string, mission: string): string {
  return `${title}: ${mission}`;
}

function titleSpecificVariables(
  key: string,
  variables: readonly string[],
): readonly string[] {
  if (key === "cfo")
    return [
      "cash",
      "free cash flow",
      "working capital",
      "ROIC",
      "WACC",
      "gross margin",
      "runway",
      "leverage",
    ];
  if (key === "coo")
    return [
      "throughput",
      "capacity",
      "utilization",
      "cycle time",
      "quality",
      "backlog",
      "OTIF",
      "cost-to-serve",
    ];
  if (key === "cmo")
    return [
      "CAC",
      "LTV",
      "conversion",
      "incrementality",
      "brand metrics",
      "retention",
      "channel economics",
    ];
  return variables;
}

function authorityForFamily(
  family: BusinessRoleFamily,
): readonly RoleAuthorityVerb[] {
  if (family === "BOARD_GOVERNANCE")
    return ["review", "approve", "reject", "escalate"];
  if (
    ["LEGAL", "COMPLIANCE", "RISK", "INTERNAL_AUDIT", "SECURITY"].includes(
      family,
    )
  ) {
    return ["review", "recommend", "escalate"];
  }
  if (family === "FOUNDER_OWNER")
    return ["advisory", "recommend", "review", "escalate"];
  return ["advisory", "recommend", "review"];
}

function roleDecision(
  roleId: SemanticId,
  decision: SemanticId,
  linkKind: DecisionRoleLinkKind,
): RoleDecisionLink {
  return {
    roleId,
    decisionId: decision,
    linkKind,
    configurableByWorkspace: true,
    notes:
      "Universal role ownership is normative; workspace policy can override.",
  };
}

function decisionId(domain: string, key: string): SemanticId {
  return toSemanticId(`flow.decision.${domain}.${key}`);
}

function conceptId(domain: string, key: string): SemanticId {
  return toSemanticId(`flow.concept.${domain}.${key}`);
}

function workflowId(domain: string, key: string): SemanticId {
  return toSemanticId(`flow.workflow.${domain}.${key}`);
}

function formulaIdsForFamily(
  family: BusinessRoleFamily,
): readonly SemanticId[] {
  if (family === "FINANCE")
    return [toSemanticId("flow.decision.formula.finance.gross-margin")];
  if (family === "MARKETING")
    return [toSemanticId("flow.decision.formula.marketing.cac")];
  if (family === "OPERATIONS")
    return [toSemanticId("flow.decision.formula.operations.utilization")];
  return [];
}

function logicIdsForFamily(family: BusinessRoleFamily): readonly SemanticId[] {
  if (family === "FINANCE") {
    return [toSemanticId("flow.decision.logic.finance.cash-conversion@1.0.0")];
  }
  if (family === "SUPPLY_CHAIN") {
    return [
      toSemanticId("flow.decision.logic.inventory.available-inventory@1.0.0"),
    ];
  }
  return [];
}

function systemsOfRecordForFamily(
  family: BusinessRoleFamily,
): readonly string[] {
  if (family === "FINANCE")
    return ["ERP", "general ledger", "banking", "billing"];
  if (family === "REVENUE" || family === "SALES")
    return ["CRM", "billing", "contract repository"];
  if (family === "MARKETING")
    return ["marketing automation", "analytics", "CRM"];
  if (family === "PEOPLE_HR") return ["HRIS", "payroll", "performance system"];
  if (family === "SECURITY") return ["SIEM", "GRC", "asset inventory"];
  return ["workspace source of record", "document repository"];
}

function reportingRelationshipsFor(key: string): readonly SemanticId[] {
  if (key.startsWith("vp-") || key.endsWith("director"))
    return [toSemanticId("flow.role.business.ceo")];
  if (key === "ceo") return [toSemanticId("flow.role.business.board-chair")];
  return [];
}

function peerRolesFor(key: string): readonly SemanticId[] {
  if (key === "cfo")
    return [
      toSemanticId("flow.role.business.ceo"),
      toSemanticId("flow.role.business.coo"),
    ];
  if (key === "cto")
    return [
      toSemanticId("flow.role.business.cio"),
      toSemanticId("flow.role.business.ciso"),
    ];
  if (key === "chief-revenue-officer")
    return [
      toSemanticId("flow.role.business.cmo"),
      toSemanticId("flow.role.business.cfo"),
    ];
  return [];
}

function crossDependenciesFor(
  family: BusinessRoleFamily,
): readonly SemanticId[] {
  if (family === "SALES" || family === "REVENUE")
    return [
      toSemanticId("flow.role.business.cfo"),
      toSemanticId("flow.role.business.cmo"),
    ];
  if (family === "MARKETING")
    return [
      toSemanticId("flow.role.business.cfo"),
      toSemanticId("flow.role.business.chief-revenue-officer"),
    ];
  if (family === "OPERATIONS")
    return [
      toSemanticId("flow.role.business.vp-sales"),
      toSemanticId("flow.role.business.cfo"),
    ];
  if (family === "TECHNOLOGY")
    return [
      toSemanticId("flow.role.business.cfo"),
      toSemanticId("flow.role.business.ciso"),
    ];
  if (family === "SECURITY")
    return [
      toSemanticId("flow.role.business.chief-product-officer"),
      toSemanticId("flow.role.business.cio"),
    ];
  if (family === "LEGAL")
    return [toSemanticId("flow.role.business.chief-revenue-officer")];
  return [toSemanticId("flow.role.business.ceo")];
}

function riskResponsibilitiesFor(
  family: BusinessRoleFamily,
): readonly string[] {
  if (family === "FINANCE")
    return ["liquidity risk", "control risk", "forecast risk"];
  if (family === "SECURITY")
    return ["cyber risk", "information asset protection", "incident response"];
  if (family === "LEGAL")
    return ["contract risk", "regulatory uncertainty", "dispute risk"];
  if (family === "RISK")
    return ["risk appetite", "risk aggregation", "control challenge"];
  return ["role-specific execution risk", "evidence sufficiency risk"];
}

function languagePatterns(
  key: string,
  roleId: SemanticId,
  decision: SemanticId,
): readonly RoleLanguagePattern[] {
  const base = [
    {
      phrase: phraseForRole(key),
      languageTag: "en" as const,
      likelyIntent: "role-aware diagnostic or decision framing",
      decisionId: decision,
      variableIds: ["primary role variables"],
      evidenceRequirementIds: [`evidence:${key}:1`],
      expectedOutput: "role-aware business recommendation with evidence gaps",
    },
    {
      phrase: "cash ka scene tight hai",
      languageTag: "ur-Latn" as const,
      likelyIntent: "liquidity or working-capital concern",
      decisionId: decisionId("finance", "liquidity"),
      variableIds: ["liquidity", "runway", "working capital", "collections"],
      evidenceRequirementIds: ["evidence:cfo:1"],
      expectedOutput: "cash-flow lens without assuming cause",
    },
    {
      phrase: "sales team pipeline inflate kar rahi hai",
      languageTag: "mixed" as const,
      likelyIntent: "pipeline quality and forecast bias",
      decisionId: decisionId("revenue", "forecast-quality"),
      variableIds: ["pipeline quality", "stage governance", "forecast bias"],
      evidenceRequirementIds: ["evidence:chief-revenue-officer:1"],
      expectedOutput: "RevOps and sales leadership diagnostic",
    },
    {
      phrase: "operations bottleneck kidhar hai?",
      languageTag: "mixed" as const,
      likelyIntent: "constraint and capacity diagnostic",
      decisionId: decisionId("operations", "constraint"),
      variableIds: ["throughput", "cycle time", "capacity"],
      evidenceRequirementIds: ["evidence:coo:1"],
      expectedOutput: "COO lens with constraint evidence",
    },
  ];
  return key === "founder-owner"
    ? base
    : base
        .filter((pattern) => pattern.phrase === phraseForRole(key))
        .map((pattern) => ({
          ...pattern,
          variableIds: [roleId],
        }));
}

function phraseForRole(key: string): string {
  if (key === "ceo") return "What's actually stopping growth?";
  if (key === "cfo") return "Bridge EBITDA to cash.";
  if (key === "coo") return "Where is the constraint?";
  if (key === "cto") return "Build or buy?";
  if (key === "cmo") return "Is this incremental growth?";
  if (key === "chro") return "Is this a role issue or a person issue?";
  return "What evidence changes this role's decision?";
}

function founderTranslationsFor(
  roleId: SemanticId,
): readonly FounderTranslation[] {
  return [
    {
      phrase: "We're busy but broke.",
      roleLensIds: [
        toSemanticId("flow.role.business.cfo"),
        toSemanticId("flow.role.business.coo"),
        toSemanticId("flow.role.business.chief-revenue-officer"),
      ],
      possibleInterpretations: [
        "cash conversion",
        "working capital",
        "collections",
        "capacity cost",
        "revenue quality",
      ],
      decisionMaterialQuestions: [
        "Which cash-flow period is tight?",
        "Are receivables growing?",
        "Is utilization profitable?",
      ],
    },
    {
      phrase: "Marketing is wasting money.",
      roleLensIds: [
        toSemanticId("flow.role.business.cmo"),
        toSemanticId("flow.role.business.cfo"),
        toSemanticId("flow.role.business.chief-revenue-officer"),
      ],
      possibleInterpretations: [
        "incrementality",
        "channel economics",
        "CAC payback",
        "lead quality",
        "pipeline conversion",
      ],
      decisionMaterialQuestions: [
        "Which channel and cohort?",
        "What is payback by cohort?",
        "Are leads converting to revenue?",
      ],
    },
  ].filter(
    (translation) =>
      translation.roleLensIds.includes(roleId) ||
      roleId === toSemanticId("flow.role.business.founder-owner"),
  );
}

function crossQuestionsFor(family: BusinessRoleFamily): readonly string[] {
  if (family === "FINANCE")
    return [
      "Which period, entity, and cash account are authoritative?",
      "What evidence bridges profit to cash?",
    ];
  if (family === "OPERATIONS")
    return [
      "Where is the measured constraint?",
      "Is the bottleneck demand, capacity, quality, or staffing?",
    ];
  if (family === "MARKETING")
    return [
      "Is the growth incremental by cohort?",
      "Which segment and channel economics are authoritative?",
    ];
  return [
    "What evidence would materially change this decision?",
    "Who has actual workspace authority for approval?",
  ];
}

function failureModesFor(
  key: string,
  family: BusinessRoleFamily,
): readonly string[] {
  const base = [
    "confusing normative role with actual authority",
    "using stale or unauthorized evidence",
  ];
  if (key === "controller")
    return [
      ...base,
      "confusing accounting close/control with CFO capital allocation",
    ];
  if (key === "cio")
    return [
      ...base,
      "confusing internal IT operations with CTO product technology strategy",
    ];
  if (key === "chief-risk-officer")
    return [
      ...base,
      "confusing Chief Risk Officer with Chief Revenue Officer abbreviation",
    ];
  if (family === "SECURITY")
    return [
      ...base,
      "treating security control as product veto without enterprise trade-off",
    ];
  return base;
}

function scaleOverlaysFor(
  roleId: SemanticId,
  key: string,
): readonly RoleOverlay[] {
  if (key !== "cfo" && key !== "founder-owner") return [];
  return [
    {
      overlayId: `scale-overlay:${roleId}:smb`,
      roleId,
      overlayType: "SCALE",
      match: "SMB",
      addedAccountabilities:
        key === "cfo"
          ? [
              "procurement coordination",
              "legal coordination",
              "fundraising support",
            ]
          : ["cash control", "sales prioritization"],
      removedAccountabilities: [],
      addedMetricIds: [toSemanticId("flow.decision.metric.finance.runway")],
      addedEvidenceRequirementIds: [`evidence:${key}:1`],
      authorityNotes: [
        "Small-company scope may be broader, but workspace actual authority still controls approval.",
      ],
    },
  ];
}

function jurisdictionSensitivityFor(
  family: BusinessRoleFamily,
): readonly string[] {
  if (
    ["LEGAL", "COMPLIANCE", "PEOPLE_HR", "FINANCE", "SECURITY"].includes(family)
  ) {
    return [
      "jurisdiction-specific rules may apply; escalate legal/regulatory certainty.",
    ];
  }
  return [];
}

function sourceRefsFor(
  family: BusinessRoleFamily,
): readonly BusinessRoleSourceRef[] {
  const refs = [businessRoleSourceRefsV1.at(-1)!];
  if (
    family === "EXECUTIVE_GENERAL_MANAGEMENT" ||
    family === "BOARD_GOVERNANCE"
  )
    refs.push(businessRoleSourceRefsV1[0]!);
  if (family === "PROJECT_PROGRAM") refs.push(businessRoleSourceRefsV1[2]!);
  if (family === "SECURITY")
    refs.push(businessRoleSourceRefsV1[3]!, businessRoleSourceRefsV1[7]!);
  if (
    family === "RISK" ||
    family === "COMPLIANCE" ||
    family === "INTERNAL_AUDIT"
  )
    refs.push(businessRoleSourceRefsV1[4]!);
  if (family === "FINANCE") refs.push(businessRoleSourceRefsV1[5]!);
  if (family === "TECHNOLOGY") refs.push(businessRoleSourceRefsV1[6]!);
  return refs;
}

function roleEvaluationIdsFor(key: string): readonly string[] {
  const count = executiveMajorRoleIds.has(key) ? 5 : 2;
  return Array.from(
    { length: count },
    (_, index) => `flow.eval.role.${key}.${index + 1}`,
  );
}

function normalizeRoleAlias(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreRoleContext(
  role: BusinessRolePacket,
  contexts: readonly string[],
): number {
  const contextText = contexts.join(" ").toLowerCase();
  if (!contextText) return 0;
  let score = 0;
  if (contextText.includes(role.functional_domain)) score += 4;
  for (const variable of role.core_variables) {
    if (contextText.includes(variable.toLowerCase())) score += 1;
  }
  return score;
}

function uniqueSemanticIds(ids: readonly SemanticId[]): readonly SemanticId[] {
  return [...new Set(ids)];
}
