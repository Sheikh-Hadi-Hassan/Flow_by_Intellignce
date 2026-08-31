import {
  authoritativeBusinessLogicStatuses,
  businessLogicScopePrecedence,
  blmExpandedDomainIdsV1,
  logicId,
  toSemanticId,
  type BusinessLogicDefinition,
  type BusinessLogicResolutionContext,
  type BusinessLogicResolutionResult,
  type BusinessLogicScope,
  type BusinessLogicScopeLevel,
  type BusinessLogicType,
  type MissingBusinessLogic,
  type ProposedBusinessLogicDraft,
  type SemanticId,
} from "@flow/blm-contracts";

import { stableFingerprint } from "./knowledge-acquisition.js";

function field(
  name: string,
  valueType: "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "MONEY",
  required = true,
  semanticId?: SemanticId,
) {
  return {
    name,
    valueType,
    required,
    ...(semanticId ? { semanticId } : {}),
  };
}

function source(name: string) {
  return {
    sourceId: "flow-curated-smb-logic-v1",
    sourceName: name,
    trustLevel: "FLOW_CURATED" as const,
  };
}

function definition(input: {
  readonly id: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly type?: BusinessLogicType;
  readonly domainId: SemanticId;
  readonly concepts: readonly SemanticId[];
  readonly inputs: readonly ReturnType<typeof field>[];
  readonly outputs: readonly ReturnType<typeof field>[];
  readonly version?: string;
  readonly scope?: BusinessLogicScope;
  readonly status?: BusinessLogicDefinition["status"];
  readonly implementationType?: BusinessLogicDefinition["implementationType"];
  readonly supersedes?: SemanticId;
  readonly supersededBy?: SemanticId;
}): BusinessLogicDefinition {
  const status = input.status ?? "APPROVED";
  const base = {
    logicId: input.id,
    name: input.name,
    description: input.description,
    logicType: input.type ?? "CALCULATION",
    domainId: input.domainId,
    conceptIds: input.concepts,
    scope: input.scope ?? { level: "UNIVERSAL" as const },
    version: input.version ?? "1",
    effectiveFrom: "2026-08-11",
    status,
    inputSchema: input.inputs,
    outputSchema: input.outputs,
    implementationType: input.implementationType ?? "CONTRACT_ONLY",
    sourceReferences: [source("Flow curated SMB starter logic")],
    provenance: {
      source: "FLOW_CURATED" as const,
      notes:
        "Contract-only starter logic; execution engine is intentionally out of scope.",
    },
    testCases: [
      {
        caseId: `${input.id}.shape`,
        description:
          "Same inputs and same version must route to the same deterministic contract.",
        inputs: Object.fromEntries(
          input.inputs.map((item) => [
            item.name,
            item.valueType === "NUMBER" || item.valueType === "MONEY" ? 1 : "x",
          ]),
        ),
        expectedOutputShape: Object.fromEntries(
          input.outputs.map((item) => [item.name, item.valueType]),
        ),
        deterministic: true as const,
      },
    ],
    edgeCases: ["Missing input", "Zero denominator", "Negative value boundary"],
    approvalStatus:
      status === "APPROVED" || status === "PUBLISHED"
        ? ("APPROVED_BY_GOVERNANCE" as const)
        : ("DRAFT_ONLY" as const),
    ...(input.supersedes ? { supersedes: input.supersedes } : {}),
    ...(input.supersededBy ? { supersededBy: input.supersededBy } : {}),
  };
  return {
    ...base,
    fingerprint: stableFingerprint(base),
  };
}

const finance = blmExpandedDomainIdsV1.financeAccounting;
const sales = blmExpandedDomainIdsV1.crmSales;
const pricing = blmExpandedDomainIdsV1.productCatalogPricing;
const inventory = blmExpandedDomainIdsV1.inventoryLogistics;
const projects = blmExpandedDomainIdsV1.projectsServiceOperations;
const marketing = blmExpandedDomainIdsV1.marketingGrowth;
const analytics = blmExpandedDomainIdsV1.analyticsStrategyPlanning;

export const smbStarterBusinessLogicCatalogV1: readonly BusinessLogicDefinition[] =
  [
    definition({
      id: logicId("finance", "gross-margin", 1),
      name: "Gross margin",
      description: "Revenue less cost of goods sold.",
      domainId: finance,
      concepts: [
        toSemanticId("flow.concept.finance.gross-margin"),
        toSemanticId("flow.concept.finance.revenue"),
        toSemanticId("flow.concept.finance.cogs"),
      ],
      inputs: [field("revenue", "MONEY"), field("costOfGoodsSold", "MONEY")],
      outputs: [field("grossMargin", "MONEY")],
    }),
    definition({
      id: logicId("finance", "gross-margin-percentage", 1),
      name: "Gross margin percentage",
      description: "Gross margin divided by revenue.",
      domainId: finance,
      concepts: [toSemanticId("flow.concept.finance.gross-margin")],
      inputs: [field("grossMargin", "MONEY"), field("revenue", "MONEY")],
      outputs: [field("grossMarginPercentage", "NUMBER")],
    }),
    definition({
      id: logicId("pricing", "markup", 1),
      name: "Markup",
      description: "Selling price relative to cost.",
      domainId: pricing,
      concepts: [toSemanticId("flow.concept.pricing.price")],
      inputs: [field("sellingPrice", "MONEY"), field("cost", "MONEY")],
      outputs: [field("markupPercentage", "NUMBER")],
    }),
    definition({
      id: logicId("finance", "net-revenue", 1),
      name: "Net revenue",
      description: "Gross revenue after discounts, returns, and allowances.",
      domainId: finance,
      concepts: [toSemanticId("flow.concept.finance.revenue")],
      inputs: [
        field("grossRevenue", "MONEY"),
        field("discounts", "MONEY"),
        field("returns", "MONEY"),
      ],
      outputs: [field("netRevenue", "MONEY")],
    }),
    definition({
      id: logicId("finance", "ar-aging-bucket-assignment", 1),
      name: "AR aging bucket assignment",
      description: "Classifies receivables by days outstanding.",
      domainId: finance,
      concepts: [toSemanticId("flow.concept.finance.receivable")],
      inputs: [field("daysOutstanding", "NUMBER")],
      outputs: [field("agingBucket", "STRING")],
    }),
    definition({
      id: logicId("finance", "ap-aging-bucket-assignment", 1),
      name: "AP aging bucket assignment",
      description: "Classifies payables by days outstanding.",
      domainId: finance,
      concepts: [toSemanticId("flow.concept.finance.payable")],
      inputs: [field("daysOutstanding", "NUMBER")],
      outputs: [field("agingBucket", "STRING")],
    }),
    definition({
      id: logicId("inventory", "available-inventory", 1),
      name: "Available inventory",
      description: "Stock on hand less reserved and unavailable quantities.",
      domainId: inventory,
      concepts: [
        toSemanticId("flow.concept.inventory.stock-on-hand"),
        toSemanticId("flow.concept.inventory.reservation"),
      ],
      inputs: [
        field("stockOnHand", "NUMBER"),
        field("reservedStock", "NUMBER"),
        field("unavailableStock", "NUMBER", false),
      ],
      outputs: [field("availableInventory", "NUMBER")],
    }),
    definition({
      id: logicId("inventory", "stock-coverage-inputs", 1),
      name: "Stock coverage inputs",
      description:
        "Contract for deterministic stock coverage calculation inputs.",
      domainId: inventory,
      concepts: [toSemanticId("flow.concept.inventory.stock-on-hand")],
      inputs: [
        field("stockOnHand", "NUMBER"),
        field("averageDailyDemand", "NUMBER"),
      ],
      outputs: [field("coverageDays", "NUMBER")],
    }),
    definition({
      id: logicId("inventory", "reorder-point-inputs", 1),
      name: "Reorder point inputs",
      description: "Contract for reorder point calculation inputs.",
      domainId: inventory,
      concepts: [toSemanticId("flow.concept.procurement.purchase-order")],
      inputs: [
        field("leadTimeDemand", "NUMBER"),
        field("safetyStock", "NUMBER"),
      ],
      outputs: [field("reorderPoint", "NUMBER")],
    }),
    definition({
      id: logicId("projects", "project-margin", 1),
      name: "Project margin",
      description: "Project revenue less project cost.",
      domainId: projects,
      concepts: [toSemanticId("flow.concept.project.project-margin")],
      inputs: [field("projectRevenue", "MONEY"), field("projectCost", "MONEY")],
      outputs: [field("projectMargin", "MONEY")],
    }),
    definition({
      id: logicId("projects", "employee-utilization", 1),
      name: "Employee utilization",
      description: "Billable time divided by available working time.",
      domainId: projects,
      concepts: [toSemanticId("flow.concept.project.utilization")],
      inputs: [
        field("billableHours", "NUMBER"),
        field("availableHours", "NUMBER"),
      ],
      outputs: [field("utilizationRate", "NUMBER")],
    }),
    definition({
      id: logicId("crm", "lead-conversion-rate", 1),
      name: "Lead conversion rate",
      description: "Converted leads divided by total leads.",
      domainId: sales,
      concepts: [toSemanticId("flow.concept.crm.lead")],
      inputs: [
        field("convertedLeads", "NUMBER"),
        field("totalLeads", "NUMBER"),
      ],
      outputs: [field("leadConversionRate", "NUMBER")],
    }),
    definition({
      id: logicId("crm", "average-deal-size", 1),
      name: "Average deal size",
      description: "Won revenue divided by won deal count.",
      domainId: sales,
      concepts: [toSemanticId("flow.concept.crm.deal")],
      inputs: [field("wonRevenue", "MONEY"), field("wonDealCount", "NUMBER")],
      outputs: [field("averageDealSize", "MONEY")],
    }),
    definition({
      id: logicId("saas", "churn-rate", 1),
      name: "Churn rate",
      description: "Lost customers or revenue divided by starting base.",
      domainId: analytics,
      concepts: [toSemanticId("flow.concept.saas.churn")],
      inputs: [field("lostBase", "NUMBER"), field("startingBase", "NUMBER")],
      outputs: [field("churnRate", "NUMBER")],
    }),
    definition({
      id: logicId("saas", "mrr", 1),
      name: "MRR",
      description: "Monthly recurring revenue contract.",
      domainId: analytics,
      concepts: [toSemanticId("flow.concept.saas.mrr")],
      inputs: [field("monthlySubscriptionRevenue", "MONEY")],
      outputs: [field("mrr", "MONEY")],
    }),
    definition({
      id: logicId("saas", "arr", 1),
      name: "ARR",
      description: "Annual recurring revenue contract.",
      domainId: analytics,
      concepts: [toSemanticId("flow.concept.saas.arr")],
      inputs: [field("mrr", "MONEY")],
      outputs: [field("arr", "MONEY")],
    }),
    definition({
      id: logicId("finance", "cash-conversion-cycle-inputs", 1),
      name: "Cash conversion cycle inputs",
      description: "Contract for DIO, DSO, and DPO inputs.",
      domainId: finance,
      concepts: [toSemanticId("flow.concept.finance.cash-flow")],
      inputs: [
        field("daysInventoryOutstanding", "NUMBER"),
        field("daysSalesOutstanding", "NUMBER"),
        field("daysPayableOutstanding", "NUMBER"),
      ],
      outputs: [field("cashConversionCycleDays", "NUMBER")],
    }),
    definition({
      id: logicId("finance", "working-capital", 1),
      name: "Working capital",
      description: "Current assets less current liabilities.",
      domainId: finance,
      concepts: [toSemanticId("flow.concept.finance.working-capital")],
      inputs: [
        field("currentAssets", "MONEY"),
        field("currentLiabilities", "MONEY"),
      ],
      outputs: [field("workingCapital", "MONEY")],
    }),
    definition({
      id: logicId("pricing", "discount-percentage", 1),
      name: "Discount percentage",
      description: "Discount amount divided by list price.",
      domainId: pricing,
      concepts: [toSemanticId("flow.concept.pricing.discount")],
      inputs: [field("listPrice", "MONEY"), field("discountAmount", "MONEY")],
      outputs: [field("discountPercentage", "NUMBER")],
    }),
    definition({
      id: logicId("tax", "tax-exclusive-inclusive-boundary", 1),
      name: "Tax-exclusive / tax-inclusive boundary",
      description:
        "Jurisdiction-specific tax calculation is not authoritative without governed source.",
      type: "POLICY_RULE",
      domainId: finance,
      concepts: [toSemanticId("flow.concept.finance.tax")],
      inputs: [field("price", "MONEY"), field("jurisdiction", "STRING")],
      outputs: [field("missingAuthoritativeTaxLogic", "BOOLEAN")],
      status: "DRAFT",
      implementationType: "CONTRACT_ONLY",
    }),
    definition({
      id: logicId("marketing", "campaign-response-rate", 1),
      name: "Campaign response rate",
      description: "Responses divided by campaign audience.",
      domainId: marketing,
      concepts: [toSemanticId("flow.concept.marketing.campaign")],
      inputs: [field("responses", "NUMBER"), field("audience", "NUMBER")],
      outputs: [field("responseRate", "NUMBER")],
    }),
  ];

export class InMemoryBusinessLogicRegistry {
  constructor(
    private readonly definitions: readonly BusinessLogicDefinition[] = smbStarterBusinessLogicCatalogV1,
  ) {}

  list(): readonly BusinessLogicDefinition[] {
    return this.definitions;
  }

  resolve(
    context: BusinessLogicResolutionContext,
  ): BusinessLogicResolutionResult {
    const candidates = this.definitions.filter((definitionItem) => {
      if (context.logicType && definitionItem.logicType !== context.logicType) {
        return false;
      }
      if (!isAuthoritative(definitionItem)) return false;
      if (!isEffective(definitionItem, context.asOf)) return false;
      if (!scopeMatches(definitionItem.scope, context)) return false;
      return definitionItem.conceptIds.some((conceptId) =>
        context.conceptIds.includes(conceptId),
      );
    });
    const ordered = [...candidates].sort(compareSpecificityThenVersion);
    const found = ordered[0];
    if (found) {
      return {
        status: "FOUND",
        logic: found,
        consideredLogicIds: ordered.map((item) => item.logicId),
      };
    }
    return {
      status: "MISSING",
      missing: missingBusinessLogic(context, this.definitions),
      consideredLogicIds: this.definitions.map((item) => item.logicId),
    };
  }

  relevantLogicIdsFor(input: {
    readonly conceptIds: readonly SemanticId[];
    readonly domainIds: readonly SemanticId[];
    readonly asOf: string;
    readonly workspaceId?: string;
    readonly businessType?: string;
    readonly industry?: string;
    readonly jurisdiction?: string;
  }): readonly SemanticId[] {
    return this.definitions
      .filter((definitionItem) => isAuthoritative(definitionItem))
      .filter((definitionItem) => isEffective(definitionItem, input.asOf))
      .filter(
        (definitionItem) =>
          input.domainIds.includes(definitionItem.domainId) ||
          definitionItem.conceptIds.some((conceptId) =>
            input.conceptIds.includes(conceptId),
          ),
      )
      .filter((definitionItem) =>
        scopeMatches(definitionItem.scope, {
          conceptIds: input.conceptIds,
          asOf: input.asOf,
          ...optionalString("workspaceId", input.workspaceId),
          ...optionalString("businessType", input.businessType),
          ...optionalString("industry", input.industry),
          ...optionalString("jurisdiction", input.jurisdiction),
        }),
      )
      .sort(compareSpecificityThenVersion)
      .map((definitionItem) => definitionItem.logicId);
  }
}

export function createProposedBusinessLogicDraft(input: {
  readonly name: string;
  readonly businessPurpose: string;
  readonly logicType: BusinessLogicType;
  readonly conceptIds: readonly SemanticId[];
  readonly scope: BusinessLogicScope;
}): ProposedBusinessLogicDraft {
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    proposedLogicId: toSemanticId(`flow.decision.logic.draft.${slug}@1.0.0`),
    name: input.name,
    businessPurpose: input.businessPurpose,
    logicType: input.logicType,
    requiredInputs: [],
    expectedOutput: [],
    proposedFormulaOrRule:
      "Draft only; requires human governance before publication.",
    assumptions: [],
    edgeCases: [],
    missingInformation: [
      "Authoritative source",
      "Approval owner",
      "Test cases",
    ],
    sourceReferences: [],
    proposedTests: [],
    scope: input.scope,
    authority: "DRAFT_ONLY",
  };
}

export function assertDraftCannotPublish(
  draft: ProposedBusinessLogicDraft,
): void {
  if (draft.authority !== "DRAFT_ONLY") {
    throw new Error("AI-created business logic drafts must remain DRAFT_ONLY.");
  }
}

function isAuthoritative(definitionItem: BusinessLogicDefinition): boolean {
  return (
    authoritativeBusinessLogicStatuses.includes(definitionItem.status) &&
    definitionItem.approvalStatus === "APPROVED_BY_GOVERNANCE"
  );
}

function isEffective(
  definitionItem: BusinessLogicDefinition,
  asOf: string,
): boolean {
  return (
    definitionItem.effectiveFrom <= asOf &&
    (!definitionItem.effectiveTo || definitionItem.effectiveTo >= asOf) &&
    definitionItem.status !== "DEPRECATED" &&
    definitionItem.status !== "SUPERSEDED"
  );
}

function scopeMatches(
  scope: BusinessLogicScope,
  context: Omit<BusinessLogicResolutionContext, "logicType">,
): boolean {
  if (scope.level === "UNIVERSAL") return true;
  if (scope.level === "INDUSTRY") return scope.industry === context.industry;
  if (scope.level === "JURISDICTION")
    return scope.jurisdiction === context.jurisdiction;
  if (scope.level === "BUSINESS_TYPE")
    return scope.businessType === context.businessType;
  return scope.workspaceId === context.workspaceId;
}

function compareSpecificityThenVersion(
  left: BusinessLogicDefinition,
  right: BusinessLogicDefinition,
): number {
  const leftRank = scopeRank(left.scope.level);
  const rightRank = scopeRank(right.scope.level);
  if (leftRank !== rightRank) return leftRank - rightRank;
  return Number(right.version) - Number(left.version);
}

function scopeRank(level: BusinessLogicScopeLevel): number {
  return businessLogicScopePrecedence.indexOf(level);
}

function missingBusinessLogic(
  context: BusinessLogicResolutionContext,
  definitions: readonly BusinessLogicDefinition[],
): MissingBusinessLogic {
  const draft = definitions.some(
    (definitionItem) =>
      definitionItem.status === "DRAFT" &&
      definitionItem.conceptIds.some((conceptId) =>
        context.conceptIds.includes(conceptId),
      ),
  );
  return {
    requestedLogicName: context.conceptIds.join(","),
    logicType: context.logicType ?? "CALCULATION",
    conceptIds: context.conceptIds,
    reason: draft ? "ONLY_DRAFT_FOUND" : "NO_APPROVED_LOGIC",
  };
}

function optionalString<Key extends string>(
  key: Key,
  value: string | undefined,
): { readonly [Property in Key]?: string } {
  return value
    ? ({ [key]: value } as { readonly [Property in Key]?: string })
    : {};
}
