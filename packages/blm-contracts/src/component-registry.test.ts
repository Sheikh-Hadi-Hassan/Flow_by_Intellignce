import { describe, expect, it } from "vitest";
import {
  ComponentRegistry,
  customerManagementComponentId,
  invoiceManagementComponentId,
  leadManagementComponentId,
  projectManagementComponentId,
  quotationApprovalComponentId,
  quotationManagementComponentId,
  taskManagementComponentId,
  type ComponentRegistration,
  type TrustedModuleDefinition,
} from "./component-registry.js";
import {
  toSemanticId,
  type BusinessProfile,
  type SemanticId,
} from "./business-semantic-model.js";

const organizationProfileComponentId = toSemanticId(
  "flow.component.core.organization-profile",
);
const simpleQuotationComponentId = toSemanticId(
  "flow.component.sales.simple-quotation",
);

const customerManagementCapabilityId = toSemanticId(
  "flow.capability.crm.customer-management",
);
const leadManagementCapabilityId = toSemanticId(
  "flow.capability.sales.lead-management",
);
const quotationManagementCapabilityId = toSemanticId(
  "flow.capability.sales.quotation-management",
);
const quotationApprovalCapabilityId = toSemanticId(
  "flow.capability.sales.quotation-approval",
);
const projectManagementCapabilityId = toSemanticId(
  "flow.capability.projects.project-management",
);
const invoicingCapabilityId = toSemanticId("flow.capability.finance.invoicing");
const taskManagementCapabilityId = toSemanticId(
  "flow.capability.work.task-management",
);
const organizationProfileCapabilityId = toSemanticId(
  "flow.capability.organization.profile",
);

const knownCapabilityIds = [
  customerManagementCapabilityId,
  leadManagementCapabilityId,
  quotationManagementCapabilityId,
  quotationApprovalCapabilityId,
  projectManagementCapabilityId,
  invoicingCapabilityId,
  taskManagementCapabilityId,
  organizationProfileCapabilityId,
] as const;

const trustedOrganizationModule: TrustedModuleDefinition = {
  key: "core.organization",
  version: "1.0.0",
  status: "ACTIVE",
  capabilities: [
    "organization.profile",
    "organization.units",
    "organization.locations",
  ],
  dependencies: [],
  entityTypes: ["core.organization.organization"],
  actions: ["organization.read", "organization.update_profile"],
};

function semanticOnlyComponent(input: {
  readonly id: SemanticId;
  readonly displayName: string;
  readonly providesCapabilityIds: readonly SemanticId[];
  readonly requiresCapabilityIds?: readonly SemanticId[];
  readonly dependsOnComponentIds?: readonly SemanticId[];
  readonly conflictsWithComponentIds?: readonly SemanticId[];
  readonly lifecycleStatus?: ComponentRegistration["lifecycleStatus"];
}): ComponentRegistration {
  return {
    semanticId: input.id,
    version: "1.0.0",
    displayName: input.displayName,
    description: `${input.displayName} semantic component.`,
    lifecycleStatus: input.lifecycleStatus ?? "ACTIVE",
    providesCapabilityIds: input.providesCapabilityIds,
    requiresCapabilityIds: input.requiresCapabilityIds ?? [],
    dependsOnComponentIds: input.dependsOnComponentIds ?? [],
    optionalDependencyIds: [],
    conflictsWithComponentIds: input.conflictsWithComponentIds ?? [],
    implementation: {
      availability: "SEMANTIC_ONLY",
      moduleBindings: [],
      deferredReason: "No trusted Flow ModuleDefinition exists yet.",
    },
    usesEntityTypeKeys: [],
    exposesActions: [],
    producesEvents: [],
    consumesEvents: [],
    scope: "GLOBAL",
  };
}

function organizationProfileComponent(): ComponentRegistration {
  return {
    semanticId: organizationProfileComponentId,
    version: "1.0.0",
    displayName: "Organization Profile",
    description:
      "Trusted executable bridge to the existing organization module.",
    lifecycleStatus: "ACTIVE",
    providesCapabilityIds: [organizationProfileCapabilityId],
    requiresCapabilityIds: [],
    dependsOnComponentIds: [],
    optionalDependencyIds: [],
    conflictsWithComponentIds: [],
    implementation: {
      availability: "EXECUTABLE",
      moduleBindings: [
        {
          moduleKey: "core.organization",
          moduleVersion: "1.0.0",
          required: true,
          purpose: "Provides trusted organization profile functionality.",
        },
      ],
    },
    configurationContract: {
      version: 1,
      fields: [
        {
          key: "profileEditing",
          type: "BOOLEAN",
          required: true,
          defaultValue: true,
        },
      ],
    },
    usesEntityTypeKeys: ["core.organization.organization"],
    exposesActions: ["organization.read", "organization.update_profile"],
    producesEvents: [],
    consumesEvents: [],
    scope: "GLOBAL",
  };
}

function proofComponents(): readonly ComponentRegistration[] {
  return [
    organizationProfileComponent(),
    semanticOnlyComponent({
      id: customerManagementComponentId,
      displayName: "Customer Management",
      providesCapabilityIds: [customerManagementCapabilityId],
    }),
    semanticOnlyComponent({
      id: leadManagementComponentId,
      displayName: "Lead Management",
      providesCapabilityIds: [leadManagementCapabilityId],
      requiresCapabilityIds: [customerManagementCapabilityId],
      dependsOnComponentIds: [customerManagementComponentId],
    }),
    semanticOnlyComponent({
      id: quotationManagementComponentId,
      displayName: "Quotation Management",
      providesCapabilityIds: [quotationManagementCapabilityId],
      requiresCapabilityIds: [customerManagementCapabilityId],
      dependsOnComponentIds: [customerManagementComponentId],
    }),
    semanticOnlyComponent({
      id: simpleQuotationComponentId,
      displayName: "Simple Quotation",
      providesCapabilityIds: [quotationManagementCapabilityId],
    }),
    semanticOnlyComponent({
      id: quotationApprovalComponentId,
      displayName: "Quotation Approval",
      providesCapabilityIds: [quotationApprovalCapabilityId],
      requiresCapabilityIds: [quotationManagementCapabilityId],
      dependsOnComponentIds: [quotationManagementComponentId],
      conflictsWithComponentIds: [simpleQuotationComponentId],
    }),
    semanticOnlyComponent({
      id: projectManagementComponentId,
      displayName: "Project Management",
      providesCapabilityIds: [projectManagementCapabilityId],
    }),
    semanticOnlyComponent({
      id: invoiceManagementComponentId,
      displayName: "Invoice Management",
      providesCapabilityIds: [invoicingCapabilityId],
      requiresCapabilityIds: [customerManagementCapabilityId],
      dependsOnComponentIds: [customerManagementComponentId],
    }),
    semanticOnlyComponent({
      id: taskManagementComponentId,
      displayName: "Task Management",
      providesCapabilityIds: [taskManagementCapabilityId],
      lifecycleStatus: "EXPERIMENTAL",
    }),
  ];
}

function buildRegistry(): ComponentRegistry {
  return new ComponentRegistry({
    trustedModules: [trustedOrganizationModule],
    knownCapabilityIds,
    components: proofComponents(),
  });
}

function marketingAgencyProfile(): BusinessProfile {
  return {
    profileId: "workspace-alpha:marketing-agency-profile",
    workspaceId: "workspace-alpha",
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

describe("Component Registry v0.1", () => {
  it("registers trusted components and enforces semantic ID uniqueness", () => {
    const registry = buildRegistry();

    expect(registry.isTrustedComponent(quotationManagementComponentId)).toBe(
      true,
    );
    expect(registry.register(organizationProfileComponent())).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: "DUPLICATE_COMPONENT" })],
    });
  });

  it("supports deterministic capability-to-component and component-to-capability lookup", () => {
    const registry = buildRegistry();

    expect(
      registry
        .findComponentsProvidingCapability(quotationManagementCapabilityId)
        .map((component) => component.semanticId),
    ).toEqual(
      expect.arrayContaining([
        quotationManagementComponentId,
        simpleQuotationComponentId,
      ]),
    );
    expect(
      registry.getCapabilitiesProvidedByComponent(quotationApprovalComponentId),
    ).toEqual([quotationApprovalCapabilityId]);
    expect(
      registry.getCapabilitiesRequiredByComponent(quotationApprovalComponentId),
    ).toEqual([quotationManagementCapabilityId]);
  });

  it("represents component dependencies and detects missing dependencies in candidate sets", () => {
    const registry = buildRegistry();

    expect(
      registry.getComponentDependencies(quotationManagementComponentId),
    ).toEqual([customerManagementComponentId]);
    expect(
      registry.validateComponentSet([quotationManagementComponentId]),
    ).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: "UNKNOWN_DEPENDENCY" })],
    });
  });

  it("represents component conflicts and fails conflicting candidate sets", () => {
    const registry = buildRegistry();

    expect(
      registry.getComponentConflicts(quotationApprovalComponentId),
    ).toEqual([simpleQuotationComponentId]);
    expect(
      registry.validateComponentSet([
        customerManagementComponentId,
        quotationManagementComponentId,
        quotationApprovalComponentId,
        simpleQuotationComponentId,
      ]),
    ).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: "DIRECT_CONFLICT" })],
    });
  });

  it("resolves executable implementation binding only to trusted ModuleDefinition metadata", () => {
    const registry = buildRegistry();

    expect(
      registry.getImplementationBinding(organizationProfileComponentId)
        .moduleBindings[0],
    ).toMatchObject({
      moduleKey: "core.organization",
      moduleVersion: "1.0.0",
      required: true,
    });
    expect(
      registry.getAvailabilityReport(organizationProfileComponentId),
    ).toMatchObject({
      registered: true,
      executable: true,
      availability: "EXECUTABLE",
    });
  });

  it("fails closed for unknown module bindings, unknown components, and invalid versions", () => {
    const registry = buildRegistry();
    const badModule = {
      ...organizationProfileComponent(),
      semanticId: toSemanticId("flow.component.core.bad-module"),
      implementation: {
        availability: "EXECUTABLE" as const,
        moduleBindings: [
          {
            moduleKey: "missing.module",
            moduleVersion: "1.0.0",
            required: true,
          },
        ],
      },
    };
    const badVersion = {
      ...organizationProfileComponent(),
      semanticId: toSemanticId("flow.component.core.bad-version"),
      implementation: {
        availability: "EXECUTABLE" as const,
        moduleBindings: [
          {
            moduleKey: "core.organization",
            moduleVersion: "9.9.9",
            required: true,
          },
        ],
      },
    };

    expect(registry.register(badModule)).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: "UNKNOWN_MODULE_BINDING" })],
    });
    expect(registry.register(badVersion)).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: "INVALID_MODULE_VERSION" })],
    });
    expect(() =>
      registry.requireComponent(toSemanticId("flow.component.unknown.missing")),
    ).toThrow("Unknown component");
    expect(
      registry.getAvailabilityReport(
        toSemanticId("flow.component.unknown.missing"),
      ),
    ).toMatchObject({
      registered: false,
      executable: false,
      availability: "UNKNOWN",
    });
  });

  it("enforces lifecycle and global registry tenant boundary", () => {
    const registry = buildRegistry();
    const invalidLifecycle = {
      ...semanticOnlyComponent({
        id: toSemanticId("flow.component.sales.invalid-lifecycle"),
        displayName: "Invalid Lifecycle",
        providesCapabilityIds: [leadManagementCapabilityId],
      }),
      lifecycleStatus: "ENABLED",
    } as unknown as ComponentRegistration;
    const tenantOwnedGlobal = {
      ...semanticOnlyComponent({
        id: toSemanticId("flow.component.sales.tenant-owned"),
        displayName: "Tenant Owned",
        providesCapabilityIds: [leadManagementCapabilityId],
      }),
      workspaceId: "workspace-alpha",
    } as unknown as ComponentRegistration;

    expect(registry.register(invalidLifecycle)).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: "INVALID_LIFECYCLE" })],
    });
    expect(registry.register(tenantOwnedGlobal)).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: "INVALID_SCOPE" })],
    });
  });

  it("keeps workspace-specific component configuration tenant scoped and deterministic", () => {
    const registry = buildRegistry();

    expect(
      registry.setWorkspaceComponentConfiguration({
        workspaceId: "workspace-alpha",
        componentSemanticId: organizationProfileComponentId,
        componentVersion: "1.0.0",
        configuration: { profileEditing: true },
      }),
    ).toMatchObject({ valid: true });
    expect(
      registry.setWorkspaceComponentConfiguration({
        workspaceId: "workspace-beta",
        componentSemanticId: organizationProfileComponentId,
        componentVersion: "1.0.0",
        configuration: { profileEditing: false },
      }),
    ).toMatchObject({ valid: true });

    expect(
      registry.getWorkspaceComponentConfiguration({
        workspaceId: "workspace-alpha",
        componentSemanticId: organizationProfileComponentId,
      })?.configuration,
    ).toEqual({ profileEditing: true });
    expect(
      registry.getWorkspaceComponentConfiguration({
        workspaceId: "workspace-beta",
        componentSemanticId: organizationProfileComponentId,
      })?.configuration,
    ).toEqual({ profileEditing: false });
  });

  it("keeps semantic-only proof components from falsely claiming executable availability", () => {
    const registry = buildRegistry();

    expect(
      registry.getAvailabilityReport(quotationManagementComponentId),
    ).toMatchObject({
      registered: true,
      availability: "SEMANTIC_ONLY",
      executable: false,
    });
    expect(registry.validateRegistrations()).toMatchObject({ valid: true });
  });

  it("answers marketing-agency profile capability provider queries without composing", () => {
    const registry = buildRegistry();
    const profile = marketingAgencyProfile();

    const providers = new Map(
      profile.requiredCapabilityIds.map((capabilityId) => [
        capabilityId,
        registry
          .findComponentsProvidingCapability(capabilityId)
          .map((component) => component.semanticId),
      ]),
    );

    expect(providers.get(leadManagementCapabilityId)).toContain(
      leadManagementComponentId,
    );
    expect(providers.get(quotationManagementCapabilityId)).toEqual(
      expect.arrayContaining([
        quotationManagementComponentId,
        simpleQuotationComponentId,
      ]),
    );
    expect(
      registry.getCapabilitiesRequiredByComponent(
        quotationManagementComponentId,
      ),
    ).toEqual([customerManagementCapabilityId]);
  });

  it("does not depend on Semantica implementation details", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./component-registry.ts", import.meta.url), "utf8"),
    );

    expect(source).not.toMatch(/from ["']semantica|import ["']semantica/);
    expect(source).not.toContain("ContextGraph");
  });
});
