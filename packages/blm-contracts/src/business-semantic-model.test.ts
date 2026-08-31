import { describe, expect, it } from "vitest";
import {
  BusinessSemanticModelRegistry,
  businessSemanticModelConceptsV01,
  businessSemanticRelationshipsV01,
  toSemanticId,
  validateSemanticId,
  type BusinessCapabilityDefinition,
  type BusinessComponentDefinition,
  type BusinessProfile,
} from "./business-semantic-model.js";

const salesCapabilityId = toSemanticId("flow.capability.sales.core");
const leadManagementCapabilityId = toSemanticId(
  "flow.capability.sales.lead-management",
);
const quotationManagementCapabilityId = toSemanticId(
  "flow.capability.sales.quotation-management",
);
const quotationApprovalCapabilityId = toSemanticId(
  "flow.capability.sales.quotation-approval",
);
const customerManagementCapabilityId = toSemanticId(
  "flow.capability.crm.customer-management",
);
const projectManagementCapabilityId = toSemanticId(
  "flow.capability.projects.project-management",
);
const invoicingCapabilityId = toSemanticId("flow.capability.finance.invoicing");

const leadManagementComponentId = toSemanticId(
  "flow.component.crm.lead-management@1.0.0",
);
const customerManagementComponentId = toSemanticId(
  "flow.component.crm.customer-management@1.0.0",
);
const quotationManagementComponentId = toSemanticId(
  "flow.component.sales.quotation-management@1.0.0",
);
const quotationApprovalComponentId = toSemanticId(
  "flow.component.sales.quotation-approval@1.0.0",
);
const simpleQuotationComponentId = toSemanticId(
  "flow.component.sales.simple-quotation@1.0.0",
);
const projectManagementComponentId = toSemanticId(
  "flow.component.projects.project-management@1.0.0",
);
const invoiceManagementComponentId = toSemanticId(
  "flow.component.finance.invoice-management@1.0.0",
);

function capability(input: {
  readonly id: ReturnType<typeof toSemanticId>;
  readonly name: string;
  readonly parentCapabilityId?: ReturnType<typeof toSemanticId>;
}): BusinessCapabilityDefinition {
  return {
    semanticId: input.id,
    concept: "BusinessCapability",
    name: input.name,
    description: `${input.name} capability.`,
    version: "1.0.0",
    scope: "GLOBAL",
    status: "ACTIVE",
    capabilityType: input.parentCapabilityId ? "OPERATIONAL" : "DOMAIN",
    ...(input.parentCapabilityId
      ? { parentCapabilityId: input.parentCapabilityId }
      : {}),
  };
}

function component(input: {
  readonly id: ReturnType<typeof toSemanticId>;
  readonly name: string;
  readonly providesCapabilityIds: readonly ReturnType<typeof toSemanticId>[];
  readonly requiresCapabilityIds?: readonly ReturnType<typeof toSemanticId>[];
  readonly dependsOnComponentIds?: readonly ReturnType<typeof toSemanticId>[];
  readonly conflictsWithComponentIds?: readonly ReturnType<
    typeof toSemanticId
  >[];
}): BusinessComponentDefinition {
  return {
    semanticId: input.id,
    concept: "Component",
    name: input.name,
    description: `${input.name} business component.`,
    version: "1.0.0",
    scope: "GLOBAL",
    status: "ACTIVE",
    providesCapabilityIds: input.providesCapabilityIds,
    requiresCapabilityIds: input.requiresCapabilityIds ?? [],
    dependsOnComponentIds: input.dependsOnComponentIds ?? [],
    conflictsWithComponentIds: input.conflictsWithComponentIds ?? [],
    usesEntityIds: [],
    producesEventIds: [],
    consumesEventIds: [],
    exposesActionIds: [],
    usesWorkflowIds: [],
    usesDecisionIds: [],
    governedByPolicyIds: [],
    rendersScreenIds: [],
    integratesWithIds: [],
    dataContracts: [],
    aiContracts: [],
    constraints: [],
  };
}

function marketingAgencyProfile(workspaceId: string): BusinessProfile {
  return {
    profileId: `${workspaceId}:marketing-agency-profile`,
    workspaceId,
    version: "1.0.0",
    businessType: "marketing agency",
    businessModel: "service business",
    productsAndServices: ["marketing services"],
    customerTypes: ["small business clients"],
    departments: ["sales", "delivery", "finance"],
    teamStructure: ["account manager", "designer", "finance admin"],
    locations: ["Karachi"],
    requiredCapabilityIds: [
      leadManagementCapabilityId,
      quotationManagementCapabilityId,
      quotationApprovalCapabilityId,
      projectManagementCapabilityId,
      invoicingCapabilityId,
    ],
    salesModel: "lead to quotation",
    billingModel: "project and retainer invoicing",
    approvalRequirements: ["quotation approval before client send"],
    importantProcesses: [
      "lead intake",
      "quotation approval",
      "project delivery",
    ],
    complianceRequirements: [],
    integrations: [],
    businessScale: "small",
  };
}

function buildMarketingAgencyRegistry(): BusinessSemanticModelRegistry {
  const registry = new BusinessSemanticModelRegistry();
  for (const definition of [
    capability({ id: salesCapabilityId, name: "Sales" }),
    capability({
      id: leadManagementCapabilityId,
      name: "Lead Management",
      parentCapabilityId: salesCapabilityId,
    }),
    capability({
      id: quotationManagementCapabilityId,
      name: "Quotation Management",
      parentCapabilityId: salesCapabilityId,
    }),
    capability({
      id: quotationApprovalCapabilityId,
      name: "Quotation Approval",
      parentCapabilityId: quotationManagementCapabilityId,
    }),
    capability({
      id: customerManagementCapabilityId,
      name: "Customer Management",
    }),
    capability({
      id: projectManagementCapabilityId,
      name: "Project Management",
    }),
    capability({ id: invoicingCapabilityId, name: "Invoicing" }),
  ]) {
    registry.registerCapability(definition);
  }

  for (const definition of [
    component({
      id: leadManagementComponentId,
      name: "Lead Management",
      providesCapabilityIds: [leadManagementCapabilityId],
    }),
    component({
      id: customerManagementComponentId,
      name: "Customer Management",
      providesCapabilityIds: [customerManagementCapabilityId],
    }),
    component({
      id: quotationManagementComponentId,
      name: "Quotation Management",
      providesCapabilityIds: [quotationManagementCapabilityId],
      requiresCapabilityIds: [customerManagementCapabilityId],
      dependsOnComponentIds: [customerManagementComponentId],
    }),
    component({
      id: simpleQuotationComponentId,
      name: "Simple Quotation",
      providesCapabilityIds: [quotationManagementCapabilityId],
      conflictsWithComponentIds: [quotationApprovalComponentId],
    }),
    component({
      id: quotationApprovalComponentId,
      name: "Quotation Approval",
      providesCapabilityIds: [quotationApprovalCapabilityId],
      requiresCapabilityIds: [quotationManagementCapabilityId],
      dependsOnComponentIds: [quotationManagementComponentId],
      conflictsWithComponentIds: [simpleQuotationComponentId],
    }),
    component({
      id: projectManagementComponentId,
      name: "Project Management",
      providesCapabilityIds: [projectManagementCapabilityId],
    }),
    component({
      id: invoiceManagementComponentId,
      name: "Invoice Management",
      providesCapabilityIds: [invoicingCapabilityId],
      requiresCapabilityIds: [customerManagementCapabilityId],
      dependsOnComponentIds: [customerManagementComponentId],
    }),
  ]) {
    registry.registerComponent(definition);
  }
  return registry;
}

describe("Business Semantic Model v0.1", () => {
  it("declares canonical concepts and relationship vocabulary for composition", () => {
    expect(businessSemanticModelConceptsV01).toEqual(
      expect.arrayContaining([
        "BusinessProfile",
        "BusinessCapability",
        "Component",
        "DataContract",
        "AIContract",
        "Constraint",
      ]),
    );
    expect(businessSemanticRelationshipsV01).toEqual(
      expect.arrayContaining([
        "PROVIDES",
        "REQUIRES",
        "DEPENDS_ON",
        "CONFLICTS_WITH",
        "GOVERNED_BY",
      ]),
    );
  });

  it("validates stable machine-readable semantic identifiers", () => {
    expect(() =>
      validateSemanticId("flow.capability.sales.lead-management"),
    ).not.toThrow();
    expect(() =>
      validateSemanticId("flow.component.finance.invoice-management@1.0.0"),
    ).not.toThrow();
    expect(() => validateSemanticId("crm leads")).toThrow(
      "Invalid semantic id",
    );
    expect(() => validateSemanticId("https://example.test/component")).toThrow(
      "Invalid semantic id",
    );
  });

  it("represents capability hierarchy independently of UI or implementation", () => {
    const registry = buildMarketingAgencyRegistry();

    expect(
      registry
        .listCapabilityChildren(salesCapabilityId)
        .map((item) => item.semanticId),
    ).toEqual(
      expect.arrayContaining([
        leadManagementCapabilityId,
        quotationManagementCapabilityId,
      ]),
    );
    expect(registry.getCapability(quotationApprovalCapabilityId)).toMatchObject(
      {
        parentCapabilityId: quotationManagementCapabilityId,
      },
    );
  });

  it("represents component provided and required capabilities", () => {
    const registry = buildMarketingAgencyRegistry();
    const quotation = registry.getComponent(quotationManagementComponentId);

    expect(quotation?.providesCapabilityIds).toEqual([
      quotationManagementCapabilityId,
    ]);
    expect(quotation?.requiresCapabilityIds).toEqual([
      customerManagementCapabilityId,
    ]);
    expect(
      registry.listComponentsProvidingCapability(quotationApprovalCapabilityId),
    ).toHaveLength(1);
  });

  it("represents component dependencies and conflicts deterministically", () => {
    const registry = buildMarketingAgencyRegistry();
    const snapshot = registry.buildRelationshipSnapshot();

    expect(snapshot.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relationship: "DEPENDS_ON",
          sourceSemanticId: quotationApprovalComponentId,
          targetSemanticId: quotationManagementComponentId,
        }),
        expect.objectContaining({
          relationship: "CONFLICTS_WITH",
          sourceSemanticId: quotationApprovalComponentId,
          targetSemanticId: simpleQuotationComponentId,
        }),
      ]),
    );
  });

  it("prevents global semantic definitions from becoming tenant-owned operational data", () => {
    const registry = new BusinessSemanticModelRegistry();

    expect(() =>
      registry.registerCapability({
        ...capability({ id: salesCapabilityId, name: "Sales" }),
        workspaceId: "workspace-alpha",
      }),
    ).toThrow("global definitions cannot be workspace-owned");
  });

  it("keeps tenant-specific BusinessProfile configuration isolated by workspace", () => {
    const registry = buildMarketingAgencyRegistry();
    registry.setWorkspaceConfiguration({
      workspaceId: "workspace-alpha",
      businessProfile: marketingAgencyProfile("workspace-alpha"),
      enabledComponentIds: [
        leadManagementComponentId,
        customerManagementComponentId,
        quotationManagementComponentId,
      ],
      componentConfiguration: {},
    });
    registry.setWorkspaceConfiguration({
      workspaceId: "workspace-beta",
      businessProfile: {
        ...marketingAgencyProfile("workspace-beta"),
        businessType: "inventory-heavy retailer",
        requiredCapabilityIds: [invoicingCapabilityId],
      },
      enabledComponentIds: [invoiceManagementComponentId],
      componentConfiguration: {},
    });

    expect(
      registry.getWorkspaceConfiguration("workspace-alpha")?.businessProfile
        .businessType,
    ).toBe("marketing agency");
    expect(
      registry.getWorkspaceConfiguration("workspace-beta")?.businessProfile
        .businessType,
    ).toBe("inventory-heavy retailer");
    expect(
      registry.getWorkspaceConfiguration("workspace-gamma"),
    ).toBeUndefined();
  });

  it("shows proof-scenario components can satisfy marketing agency capabilities without composing automatically", () => {
    const registry = buildMarketingAgencyRegistry();
    registry.setWorkspaceConfiguration({
      workspaceId: "workspace-alpha",
      businessProfile: marketingAgencyProfile("workspace-alpha"),
      enabledComponentIds: [
        leadManagementComponentId,
        quotationManagementComponentId,
        quotationApprovalComponentId,
        projectManagementComponentId,
        invoiceManagementComponentId,
      ],
      componentConfiguration: {},
    });

    expect(
      registry.listUnsatisfiedProfileCapabilities("workspace-alpha"),
    ).toEqual([]);
  });

  it("keeps validation deterministic when profile requirements are not satisfied", () => {
    const registry = buildMarketingAgencyRegistry();
    registry.setWorkspaceConfiguration({
      workspaceId: "workspace-alpha",
      businessProfile: marketingAgencyProfile("workspace-alpha"),
      enabledComponentIds: [leadManagementComponentId],
      componentConfiguration: {},
    });

    expect(
      registry.listUnsatisfiedProfileCapabilities("workspace-alpha"),
    ).toEqual([
      quotationManagementCapabilityId,
      quotationApprovalCapabilityId,
      projectManagementCapabilityId,
      invoicingCapabilityId,
    ]);
  });
});
