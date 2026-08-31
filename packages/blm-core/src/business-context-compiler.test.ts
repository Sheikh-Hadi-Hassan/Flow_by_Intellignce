import { describe, expect, it } from "vitest";

import {
  blmExpandedDomainIdsV1,
  logicId,
  projectMarginAnalysisSkillV1,
  toSemanticId,
  type BusinessKnowledgeProvenance,
  type BusinessProfile,
  type SemanticId,
} from "@flow/blm-contracts";
import type { ActorContext, WorkspaceContext } from "@flow/contracts";

import {
  BusinessContextCompiler,
  InMemoryBusinessPolicyProvider,
  InMemoryBusinessProfileProvider,
  InMemoryBusinessRecordProvider,
  validateBusinessContextRequest,
  type BusinessContextRequest,
  type BusinessRecordSnapshot,
  type WorkspaceBusinessPolicy,
} from "./business-context-compiler.js";

const provenance: BusinessKnowledgeProvenance = {
  sourceIds: [],
  use: "FLOW_NATIVE",
  notes: "BLM context compiler proof fixture.",
};

const workspaceAlpha: WorkspaceContext = {
  workspaceId: "workspace-alpha" as WorkspaceContext["workspaceId"],
  slug: "alpha",
};

const workspaceBeta: WorkspaceContext = {
  workspaceId: "workspace-beta" as WorkspaceContext["workspaceId"],
  slug: "beta",
};

function actor(
  permissionIds: readonly string[],
  workspace: WorkspaceContext = workspaceAlpha,
): ActorContext {
  return {
    actorId: `user-${workspace.slug ?? "workspace"}` as ActorContext["actorId"],
    userId: `user-${workspace.slug ?? "workspace"}` as ActorContext["userId"],
    membershipId:
      `membership-${workspace.slug ?? "workspace"}` as ActorContext["membershipId"],
    actorKind: "user",
    workspace,
    roleIds: ["business-operator"],
    permissionIds,
    requestSource: "UI",
    correlationId:
      `correlation-${workspace.slug ?? "workspace"}` as ActorContext["correlationId"],
  };
}

const profileAlpha: BusinessProfile = {
  profileId: "profile-alpha",
  workspaceId: workspaceAlpha.workspaceId,
  organizationId: "organization-alpha",
  version: "1",
  businessType: "Marketing agency",
  businessModel: "Retainer and project services",
  productsAndServices: ["Campaign management", "Brand strategy"],
  customerTypes: ["B2B clients"],
  departments: ["Sales", "Finance", "Delivery"],
  teamStructure: ["Account managers", "Project leads"],
  locations: ["PK"],
  requiredCapabilityIds: [
    toSemanticId("flow.capability.crm.manage-customer-relationships"),
  ],
  salesModel: "Relationship-led B2B sales",
  billingModel: "Monthly retainer plus project billing",
  approvalRequirements: ["Discounts above 10 percent require owner approval"],
  importantProcesses: ["Invoice-to-cash", "Lead-to-opportunity"],
  complianceRequirements: ["Workspace authorization before record access"],
  integrations: ["Supabase"],
  businessScale: "SMB",
};

const profileBeta: BusinessProfile = {
  ...profileAlpha,
  profileId: "profile-beta",
  workspaceId: workspaceBeta.workspaceId,
  organizationId: "organization-beta",
};

const policies: readonly WorkspaceBusinessPolicy[] = [
  {
    policyId: "policy-discount-alpha",
    workspaceId: workspaceAlpha.workspaceId,
    semanticId: toSemanticId("flow.concept.pricing.pricing-rule"),
    name: "Discount approval threshold",
    value: "Discounts above 10 percent require human approval.",
    version: "1",
    requiredPermission: "pricing.policy.read",
    provenance,
  },
  {
    policyId: "policy-invoice-alpha",
    workspaceId: workspaceAlpha.workspaceId,
    semanticId: toSemanticId("flow.concept.finance.invoice"),
    name: "Invoice collection policy",
    value: "Collections outreach requires invoice-read permission.",
    version: "2",
    requiredPermission: "finance.policy.read",
    provenance,
  },
  {
    policyId: "policy-discount-beta",
    workspaceId: workspaceBeta.workspaceId,
    semanticId: toSemanticId("flow.concept.pricing.pricing-rule"),
    name: "Beta discount approval threshold",
    value: "Beta policy must not leak to alpha.",
    version: "1",
    requiredPermission: "pricing.policy.read",
    provenance,
  },
];

const records: readonly BusinessRecordSnapshot[] = [
  {
    recordId: "invoice-alpha-001",
    workspaceId: workspaceAlpha.workspaceId,
    semanticId: toSemanticId("flow.concept.finance.invoice"),
    label: "Invoice INV-001",
    version: "1",
    requiredPermission: "finance.invoice.read",
    fields: [
      { key: "status", value: "unpaid" },
      { key: "amount", value: 125000 },
      {
        key: "bankAccount",
        value: "PK00FLOW000001",
        sensitive: true,
        requiredPermission: "finance.bank.read",
      },
    ],
    provenance,
  },
  {
    recordId: "customer-alpha-001",
    workspaceId: workspaceAlpha.workspaceId,
    semanticId: toSemanticId("flow.concept.crm.customer"),
    label: "Acme Customer",
    version: "3",
    requiredPermission: "crm.customer.read",
    fields: [
      { key: "name", value: "Acme" },
      { key: "paymentTerms", value: "Net 30" },
    ],
    provenance,
  },
  {
    recordId: "contract-alpha-001",
    workspaceId: workspaceAlpha.workspaceId,
    semanticId: toSemanticId("flow.concept.commercial-document.contract"),
    label: "Acme Retainer Contract",
    version: "4",
    requiredPermission: "commercial.contract.read",
    fields: [
      { key: "paymentTerms", value: "Net 30" },
      { key: "renewal", value: "annual" },
    ],
    provenance,
  },
  {
    recordId: "invoice-beta-001",
    workspaceId: workspaceBeta.workspaceId,
    semanticId: toSemanticId("flow.concept.finance.invoice"),
    label: "Beta Invoice",
    version: "1",
    requiredPermission: "finance.invoice.read",
    fields: [{ key: "status", value: "unpaid" }],
    provenance,
  },
  {
    recordId: "stock-alpha-001",
    workspaceId: workspaceAlpha.workspaceId,
    semanticId: toSemanticId("flow.concept.inventory.stock-on-hand"),
    label: "Warehouse Stock",
    version: "1",
    requiredPermission: "inventory.stock.read",
    fields: [
      { key: "onHand", value: 100 },
      { key: "reserved", value: 95 },
      { key: "available", value: 5 },
    ],
    provenance,
  },
  {
    recordId: "project-alpha-001",
    workspaceId: workspaceAlpha.workspaceId,
    semanticId: toSemanticId("flow.concept.project.project-margin"),
    label: "Project Margin Snapshot",
    version: "1",
    requiredPermission: "project.margin.read",
    fields: [
      { key: "revenue", value: 900000 },
      { key: "cost", value: 790000 },
      { key: "billableUtilization", value: 0.71 },
    ],
    provenance,
  },
];

function compiler(input?: {
  readonly skills?: readonly (typeof projectMarginAnalysisSkillV1)[];
}): BusinessContextCompiler {
  return new BusinessContextCompiler({
    businessProfileProvider: new InMemoryBusinessProfileProvider([
      profileAlpha,
      profileBeta,
    ]),
    policyProvider: new InMemoryBusinessPolicyProvider(policies),
    recordProvider: new InMemoryBusinessRecordProvider(records),
    ...(input?.skills
      ? {
          skillProvider: {
            listApplicableSkills: () => input.skills ?? [],
          },
        }
      : {}),
  });
}

function request(input: {
  readonly requestedTask: string;
  readonly taskType?: BusinessContextRequest["task"]["taskType"];
  readonly taskKey?: string;
  readonly referencedConceptIds?: readonly SemanticId[];
  readonly referencedRecordIds?: readonly string[];
  readonly requestedDomainIds?: readonly SemanticId[];
  readonly requestedCapabilityIds?: readonly SemanticId[];
  readonly requestedSkillIds?: readonly SemanticId[];
  readonly permissionIds?: readonly string[];
  readonly workspace?: WorkspaceContext;
  readonly channel?: BusinessContextRequest["channel"];
  readonly workspaceContextVersion?: string;
  readonly budget?: BusinessContextRequest["budget"];
}): BusinessContextRequest {
  const workspace = input.workspace ?? workspaceAlpha;
  const task = input.taskKey
    ? {
        taskType: input.taskType ?? "QUESTION",
        taskKey: input.taskKey,
        requestedTask: input.requestedTask,
      }
    : {
        taskType: input.taskType ?? "QUESTION",
        requestedTask: input.requestedTask,
      };
  const base = {
    workspace,
    actor: actor(input.permissionIds ?? [], workspace),
    task,
    referencedConceptIds: input.referencedConceptIds ?? [],
    channel: input.channel ?? "TEXT",
    knowledgeReleaseId: "flow.blm.knowledge-release.test",
    ...(input.referencedRecordIds
      ? { referencedRecordIds: input.referencedRecordIds }
      : {}),
    ...(input.requestedDomainIds
      ? { requestedDomainIds: input.requestedDomainIds }
      : {}),
    ...(input.requestedCapabilityIds
      ? { requestedCapabilityIds: input.requestedCapabilityIds }
      : {}),
    ...(input.requestedSkillIds
      ? { requestedSkillIds: input.requestedSkillIds }
      : {}),
    ...(input.workspaceContextVersion
      ? { workspaceContextVersion: input.workspaceContextVersion }
      : {}),
    ...(input.budget ? { budget: input.budget } : {}),
  };
  return base;
}

function domainKeys(bundle: ReturnType<BusinessContextCompiler["compile"]>) {
  return bundle.relevantDomains.map((domain) => domain.key);
}

describe("BLM Business Context Compiler Foundation v1", () => {
  it("validates the BusinessContextRequest contract", () => {
    expect(() =>
      validateBusinessContextRequest(
        request({
          requestedTask: "Review unpaid invoice.",
          permissionIds: ["finance.invoice.read"],
        }),
      ),
    ).not.toThrow();

    expect(() =>
      validateBusinessContextRequest({
        ...request({ requestedTask: "Review unpaid invoice." }),
        actor: actor([], workspaceBeta),
      }),
    ).toThrow(/workspace must match/);

    expect(() =>
      validateBusinessContextRequest(
        request({
          requestedTask: " ",
          referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
        }),
      ),
    ).toThrow(/task is required/);
  });

  it("compiles unpaid client invoice context across finance, CRM, and commercial documents", () => {
    const bundle = compiler().compile(
      request({
        requestedTask:
          "Why is this client invoice unpaid and what payment terms apply?",
        referencedConceptIds: [
          toSemanticId("flow.concept.finance.invoice"),
          toSemanticId("flow.concept.crm.customer"),
        ],
        referencedRecordIds: [
          "invoice-alpha-001",
          "customer-alpha-001",
          "contract-alpha-001",
          "invoice-beta-001",
        ],
        permissionIds: [
          "finance.invoice.read",
          "crm.customer.read",
          "commercial.contract.read",
          "finance.policy.read",
        ],
      }),
    );

    expect(domainKeys(bundle)).toEqual(
      expect.arrayContaining([
        "finance-accounting",
        "crm-sales",
        "commercial-documents-contracts",
      ]),
    );
    expect(bundle.relevantConceptIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.concept.finance.invoice"),
        toSemanticId("flow.concept.finance.receivable"),
        toSemanticId("flow.concept.finance.payment"),
        toSemanticId("flow.concept.crm.customer"),
      ]),
    );
    expect(bundle.relevantMetricIds).toContain(
      toSemanticId("flow.decision.metric.finance.ar-aging"),
    );
    expect(bundle.authorizedRecords.map((record) => record.recordId)).toEqual([
      "invoice-alpha-001",
      "customer-alpha-001",
      "contract-alpha-001",
    ]);
    expect(domainKeys(bundle)).not.toEqual(
      expect.arrayContaining([
        "hr-organizational-psychology",
        "manufacturing-mrp",
      ]),
    );
    expect(bundle.authorizedRecords).not.toContainEqual(
      expect.objectContaining({ recordId: "invoice-beta-001" }),
    );
  });

  it("compiles sales decline diagnostic context without deciding cause", () => {
    const bundle = compiler().compile(
      request({
        requestedTask:
          "Diagnostic: sales decline with lead volume, lead quality, conversion, win rate, deal size, sales cycle, pricing, and channel.",
        taskType: "DIAGNOSTIC",
        taskKey: "sales-decline",
        permissionIds: ["crm.customer.read", "pricing.policy.read"],
      }),
    );

    expect(domainKeys(bundle)).toEqual(
      expect.arrayContaining([
        "marketing-growth",
        "crm-sales",
        "product-catalog-pricing",
        "analytics-strategy-planning",
      ]),
    );
    expect(bundle.relevantDiagnosticPatterns).toContainEqual(
      expect.objectContaining({
        semanticId: toSemanticId("flow.decision.diagnostic.sales-decline"),
      }),
    );
    expect(bundle.relevantMetricIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.decision.metric.crm.win-rate"),
        toSemanticId("flow.decision.metric.crm.average-deal-size"),
        toSemanticId("flow.decision.metric.crm.sales-cycle-length"),
        toSemanticId("flow.decision.metric.marketing.conversion-rate"),
      ]),
    );
    expect(bundle.relevantConceptIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.concept.marketing.lead-source"),
        toSemanticId("flow.concept.marketing.channel"),
        toSemanticId("flow.concept.crm.lead"),
        toSemanticId("flow.concept.crm.opportunity"),
        toSemanticId("flow.concept.crm.deal"),
        toSemanticId("flow.concept.pricing.price"),
      ]),
    );
    expect(bundle.relevantDiagnosticPatterns[0]?.prohibitedConclusion).toMatch(
      /Do not assume cause/,
    );
  });

  it("compiles discount decision support factors and preserves human approval boundary", () => {
    const bundle = compiler().compile(
      request({
        requestedTask:
          "Customer says price is too high and asks for discount; compile decision support factors only.",
        taskType: "DECISION_SUPPORT",
        taskKey: "discount-decision",
        permissionIds: ["pricing.policy.read", "crm.customer.read"],
      }),
    );

    expect(domainKeys(bundle)).toEqual(
      expect.arrayContaining([
        "crm-sales",
        "product-catalog-pricing",
        "finance-accounting",
        "customer-sales-psychology",
      ]),
    );
    expect(bundle.relevantDecisionPatterns).toContainEqual(
      expect.objectContaining({
        outputBoundary: "Factors only; no automatic approval.",
        requiredAuthority: "HUMAN_REVIEW",
      }),
    );
    expect(bundle.relevantDecisionPatterns[0]?.decisionFactors).toEqual(
      expect.arrayContaining([
        "margin",
        "deal value",
        "customer lifetime value",
        "capacity",
        "pricing policy",
        "discount precedent",
        "payment terms",
      ]),
    );
    expect(bundle.workspacePolicies).toContainEqual(
      expect.objectContaining({ policyId: "policy-discount-alpha" }),
    );
    expect(
      bundle.relevantPsychologyInsights.map((item) => item.principle),
    ).toContain("High price objection");
  });

  it("compiles inventory availability context without unrelated domains", () => {
    const bundle = compiler().compile(
      request({
        requestedTask:
          "Can this order fulfill from the warehouse with stock on hand, reserved stock, available stock, and reservation?",
        referencedConceptIds: [
          toSemanticId("flow.concept.inventory.stock-on-hand"),
        ],
        permissionIds: ["inventory.stock.read"],
      }),
    );

    expect(domainKeys(bundle)).toEqual(["inventory-logistics"]);
    expect(bundle.relevantConceptIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.concept.inventory.stock-on-hand"),
        toSemanticId("flow.concept.inventory.reserved-stock"),
        toSemanticId("flow.concept.inventory.available-stock"),
        toSemanticId("flow.concept.inventory.warehouse"),
        toSemanticId("flow.concept.inventory.reservation"),
      ]),
    );
    expect(bundle.relevantRuleIds).toContain(
      toSemanticId(
        "flow.decision.rule.inventory.available-stock-excludes-reserved-stock",
      ),
    );
    expect(bundle.relevantLogicIds).toContain(
      logicId("inventory", "available-inventory", 1),
    );
    expect(bundle.authorizedRecords).toContainEqual(
      expect.objectContaining({ recordId: "stock-alpha-001" }),
    );
    expect(domainKeys(bundle)).not.toEqual(
      expect.arrayContaining([
        "finance-accounting",
        "hr-organizational-psychology",
      ]),
    );
  });

  it("compiles project margin context with project, finance, and analytics inputs", () => {
    const bundle = compiler().compile(
      request({
        requestedTask:
          "Diagnostic: project margin with billable utilization, employee cost, project revenue, cost, and scope.",
        taskType: "DIAGNOSTIC",
        taskKey: "low-project-margin",
        referencedConceptIds: [
          toSemanticId("flow.concept.project.project-margin"),
        ],
        requestedDomainIds: [
          blmExpandedDomainIdsV1.projectsServiceOperations,
          blmExpandedDomainIdsV1.financeAccounting,
          blmExpandedDomainIdsV1.analyticsStrategyPlanning,
        ],
        permissionIds: ["project.margin.read"],
      }),
    );

    expect(domainKeys(bundle)).toEqual(
      expect.arrayContaining([
        "projects-service-operations",
        "finance-accounting",
        "analytics-strategy-planning",
      ]),
    );
    expect(bundle.relevantConceptIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.concept.project.billable-time"),
        toSemanticId("flow.concept.project.project-cost"),
        toSemanticId("flow.concept.project.project-revenue"),
        toSemanticId("flow.concept.project.project-margin"),
        toSemanticId("flow.concept.project.scope"),
      ]),
    );
    expect(bundle.relevantMetricIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.decision.metric.project.billable-utilization"),
        toSemanticId("flow.decision.metric.project.project-margin"),
      ]),
    );
    expect(bundle.relevantLogicIds).toEqual(
      expect.arrayContaining([
        logicId("projects", "project-margin", 1),
        logicId("projects", "employee-utilization", 1),
      ]),
    );
    expect(bundle.authorizedRecords).toContainEqual(
      expect.objectContaining({ recordId: "project-alpha-001" }),
    );
  });

  it("proves grocery inventory availability context selects workspace records, domains, concepts, and logic IDs", () => {
    const bundle = compiler().compile(
      request({
        requestedTask:
          "Grocery inventory availability question: can this order be fulfilled from stock after reservations?",
        taskType: "QUESTION",
        taskKey: "grocery-inventory-availability",
        referencedConceptIds: [
          toSemanticId("flow.concept.inventory.stock-on-hand"),
          toSemanticId("flow.concept.inventory.reservation"),
        ],
        referencedRecordIds: ["stock-alpha-001", "invoice-beta-001"],
        permissionIds: ["inventory.stock.read", "finance.invoice.read"],
      }),
    );

    expect(bundle.workspace.workspaceId).toBe(workspaceAlpha.workspaceId);
    expect(domainKeys(bundle)).toContain("inventory-logistics");
    expect(bundle.relevantConceptIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.concept.inventory.stock-on-hand"),
        toSemanticId("flow.concept.inventory.reservation"),
      ]),
    );
    expect(bundle.relevantLogicIds).toContain(
      logicId("inventory", "available-inventory", 1),
    );
    expect(bundle.authorizedRecords.map((record) => record.recordId)).toEqual([
      "stock-alpha-001",
    ]);
  });

  it("proves marketing agency cash-flow receivables context selects finance logic without cross-workspace leakage", () => {
    const bundle = compiler().compile(
      request({
        requestedTask:
          "Marketing agency cash-flow question: receivables are late while invoices remain unpaid.",
        taskType: "DIAGNOSTIC",
        taskKey: "agency-cash-flow-receivables",
        referencedConceptIds: [
          toSemanticId("flow.concept.finance.cash-flow"),
          toSemanticId("flow.concept.finance.receivable"),
          toSemanticId("flow.concept.finance.invoice"),
        ],
        referencedRecordIds: ["invoice-alpha-001", "invoice-beta-001"],
        permissionIds: ["finance.invoice.read", "finance.policy.read"],
      }),
    );

    expect(bundle.workspace.workspaceId).toBe(workspaceAlpha.workspaceId);
    expect(domainKeys(bundle)).toContain("finance-accounting");
    expect(bundle.relevantConceptIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.concept.finance.cash-flow"),
        toSemanticId("flow.concept.finance.receivable"),
      ]),
    );
    expect(bundle.relevantLogicIds).toEqual(
      expect.arrayContaining([
        logicId("finance", "ar-aging-bucket-assignment", 1),
        logicId("finance", "cash-conversion-cycle-inputs", 1),
      ]),
    );
    expect(bundle.authorizedRecords.map((record) => record.recordId)).toEqual([
      "invoice-alpha-001",
    ]);
  });

  it("proves consulting project-margin context selects project records and required logic IDs", () => {
    const bundle = compiler().compile(
      request({
        requestedTask:
          "Consulting project-margin question: utilization increased but project margin declined.",
        taskType: "DIAGNOSTIC",
        taskKey: "consulting-project-margin",
        referencedConceptIds: [
          toSemanticId("flow.concept.project.project-margin"),
          toSemanticId("flow.concept.project.utilization"),
        ],
        referencedRecordIds: ["project-alpha-001", "invoice-beta-001"],
        requestedDomainIds: [blmExpandedDomainIdsV1.projectsServiceOperations],
        permissionIds: ["project.margin.read", "finance.invoice.read"],
      }),
    );

    expect(bundle.workspace.workspaceId).toBe(workspaceAlpha.workspaceId);
    expect(domainKeys(bundle)).toContain("projects-service-operations");
    expect(bundle.relevantConceptIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.concept.project.project-margin"),
        toSemanticId("flow.concept.project.utilization"),
      ]),
    );
    expect(bundle.relevantLogicIds).toEqual(
      expect.arrayContaining([
        logicId("projects", "project-margin", 1),
        logicId("projects", "employee-utilization", 1),
      ]),
    );
    expect(bundle.authorizedRecords.map((record) => record.recordId)).toEqual([
      "project-alpha-001",
    ]);
  });

  it("enforces authorization before record inclusion and redacts restricted fields", () => {
    const permitted = compiler().compile(
      request({
        requestedTask: "Review unpaid invoice.",
        referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
        permissionIds: ["finance.invoice.read"],
      }),
    );
    const denied = compiler().compile(
      request({
        requestedTask: "Review unpaid invoice.",
        referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
        permissionIds: [],
      }),
    );

    const invoiceRecord = permitted.authorizedRecords.find(
      (record) => record.recordId === "invoice-alpha-001",
    );
    expect(invoiceRecord?.fields.bankAccount).toBe("[REDACTED]");
    expect(invoiceRecord?.redactions).toContainEqual(
      expect.objectContaining({
        field: "bankAccount",
        requiredPermission: "finance.bank.read",
      }),
    );
    expect(denied.authorizedRecords).toHaveLength(0);
  });

  it("keeps global knowledge, workspace profile, workspace policies, and tenant records distinct", () => {
    const alpha = compiler().compile(
      request({
        requestedTask: "Evaluate discount policy for customer.",
        taskType: "DECISION_SUPPORT",
        taskKey: "discount-decision",
        permissionIds: ["pricing.policy.read"],
      }),
    );
    const beta = compiler().compile(
      request({
        requestedTask: "Evaluate discount policy for customer.",
        taskType: "DECISION_SUPPORT",
        taskKey: "discount-decision",
        permissionIds: ["pricing.policy.read"],
        workspace: workspaceBeta,
      }),
    );

    expect(
      alpha.relevantDomains.every((domain) => domain.scope === "GLOBAL"),
    ).toBe(true);
    expect(alpha.businessProfileSummary?.businessType).toBe("Marketing agency");
    expect(alpha.workspacePolicies.map((policy) => policy.policyId)).toContain(
      "policy-discount-alpha",
    );
    expect(
      alpha.workspacePolicies.map((policy) => policy.policyId),
    ).not.toContain("policy-discount-beta");
    expect(beta.workspacePolicies.map((policy) => policy.policyId)).toContain(
      "policy-discount-beta",
    );
  });

  it("applies budget limits, keeps authority constraints, and records inclusion reasons", () => {
    const bundle = compiler().compile(
      request({
        requestedTask:
          "Diagnostic: sales decline and pricing discount across finance, CRM, analytics, and contracts.",
        taskType: "DIAGNOSTIC",
        taskKey: "sales-decline",
        referencedConceptIds: [
          toSemanticId("flow.concept.finance.invoice"),
          toSemanticId("flow.concept.crm.customer"),
        ],
        budget: {
          maxDomains: 2,
          maxConcepts: 5,
          maxRecords: 1,
          maxSkills: 1,
          maxRelationships: 2,
        },
        permissionIds: [
          "finance.invoice.read",
          "crm.customer.read",
          "commercial.contract.read",
        ],
      }),
    );

    expect(bundle.relevantDomains.length).toBeLessThanOrEqual(2);
    expect(bundle.relevantConceptIds.length).toBeLessThanOrEqual(5);
    expect(bundle.relevantRelationships.length).toBeLessThanOrEqual(2);
    expect(bundle.authorizedRecords.length).toBeLessThanOrEqual(1);
    expect(bundle.availableBusinessSkills.length).toBeLessThanOrEqual(1);
    expect(bundle.authorityConstraints).toEqual(
      expect.arrayContaining([
        "Knowledge is not execution authority.",
        "Mutations require Action Wall authorization.",
        "Unauthorized records and restricted fields are excluded before model context.",
      ]),
    );
    expect(bundle.inclusionReasons.map((item) => item.reason)).toEqual(
      expect.arrayContaining([
        "EXPLICIT_REFERENCE",
        "TASK_DOMAIN",
        "RELATIONSHIP_EXPANSION",
        "AUTHORIZED_RECORD",
        "BUSINESS_PROFILE",
      ]),
    );
    expect(bundle.provenance.length).toBeGreaterThan(0);
  });

  it("selects skills as bounded context without granting execution", () => {
    const bundle = compiler().compile(
      request({
        requestedTask: "Calculate gross margin for invoice revenue and COGS.",
        taskType: "CALCULATION",
        referencedConceptIds: [
          toSemanticId("flow.concept.finance.gross-margin"),
          toSemanticId("flow.concept.finance.revenue"),
          toSemanticId("flow.concept.finance.cogs"),
        ],
        requestedCapabilityIds: [
          toSemanticId("flow.capability.finance.calculate-margin"),
        ],
      }),
    );

    expect(bundle.relevantFormulaIds).toContain(
      toSemanticId("flow.decision.formula.finance.gross-margin"),
    );
    expect(bundle.availableBusinessSkills).toContainEqual(
      expect.objectContaining({
        semanticId: toSemanticId("flow.action.finance.calculate-gross-margin"),
        executionAuthority: "DETERMINISTIC_REQUIRED",
        approvalPolicy: "NONE",
      }),
    );
    expect(bundle.availableBusinessSkills).not.toContainEqual(
      expect.objectContaining({
        semanticId: toSemanticId("flow.action.crm.create-lead"),
      }),
    );
  });

  it("uses installed skill releases to pull task-critical context and logic", () => {
    const bundle = compiler({ skills: [projectMarginAnalysisSkillV1] }).compile(
      request({
        requestedTask:
          "Review project profitability and identify missing inputs before calculation.",
        taskType: "CALCULATION",
        referencedConceptIds: [toSemanticId("flow.concept.project.project")],
        requestedSkillIds: [projectMarginAnalysisSkillV1.skillId],
        permissionIds: ["project.record.read", "business.calculation.execute"],
      }),
    );

    expect(bundle.availableBusinessSkills).toContainEqual(
      expect.objectContaining({
        semanticId: projectMarginAnalysisSkillV1.skillId,
        skillVersion: projectMarginAnalysisSkillV1.version,
        executionAuthority: "DETERMINISTIC_REQUIRED",
        requiredLogicIds: [logicId("projects", "project-margin", 1)],
        requiredERPCapabilities: ["PROJECT_READ"],
      }),
    );
    expect(bundle.relevantConceptIds).toEqual(
      expect.arrayContaining([
        ...projectMarginAnalysisSkillV1.requiredConceptIds,
      ]),
    );
    expect(bundle.relevantLogicIds).toContain(
      logicId("projects", "project-margin", 1),
    );
    expect(bundle.authorityConstraints).toContain(
      "Mutations require Action Wall authorization.",
    );
  });

  it("is deterministic, fingerprints identical inputs, and changes when context changes", () => {
    const baseRequest = request({
      requestedTask: "Review unpaid invoice.",
      referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
      permissionIds: ["finance.invoice.read"],
      workspaceContextVersion: "1",
    });
    const first = compiler().compile(baseRequest);
    const second = compiler().compile(baseRequest);
    const changed = compiler().compile({
      ...baseRequest,
      workspaceContextVersion: "2",
    });

    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.bundleId).toBe(`context:${first.fingerprint}`);
    expect(changed.fingerprint).not.toBe(first.fingerprint);
  });

  it("keeps selected business context independent of input channel", () => {
    const text = compiler().compile(
      request({
        requestedTask: "Review unpaid invoice.",
        referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
        permissionIds: ["finance.invoice.read"],
        channel: "TEXT",
      }),
    );
    const voice = compiler().compile(
      request({
        requestedTask: "Review unpaid invoice.",
        referencedConceptIds: [toSemanticId("flow.concept.finance.invoice")],
        permissionIds: ["finance.invoice.read"],
        channel: "VOICE",
      }),
    );

    expect(domainKeys(voice)).toEqual(domainKeys(text));
    expect(voice.relevantConceptIds).toEqual(text.relevantConceptIds);
    expect(voice.authorizedRecords).toEqual(text.authorizedRecords);
  });

  it("does not couple the compiler to model routing, RAG, embeddings, execution, or Semantica internals", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./business-context-compiler.ts", import.meta.url),
        "utf8",
      ),
    );

    expect(source).not.toMatch(
      /openai|anthropic|llm|slm|rag|embedding|vector/i,
    );
    expect(source).not.toMatch(/semantica|speech|tts|composition resolver/i);
    expect(source).not.toMatch(
      /fetch\(|createClient|executeAction|actionWall/i,
    );
  });
});
