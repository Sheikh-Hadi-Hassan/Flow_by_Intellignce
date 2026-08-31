import { describe, expect, it } from "vitest";
import {
  BusinessExpertiseRegistry,
  blmBusinessBrainProofPacksV1,
  blmDomainCoverageManifestV1,
  blmDomainPackIdsV1,
  blmSourceManifestV1,
  createBusinessBrainFoundationRegistryV1,
  crmSalesPackV1,
  externalBenchmarkRegistryV1,
  financeAccountingPackV1,
  inventoryProcurementPackV1,
  type BusinessDomainPackBundle,
  type BusinessSkillDefinition,
} from "./business-brain-foundation.js";
import {
  ComponentRegistry,
  customerManagementComponentId,
  type TrustedModuleDefinition,
} from "./component-registry.js";
import { toSemanticId } from "./business-semantic-model.js";

describe("BLM Business Brain Foundation v1", () => {
  it("registers the four proof domain packs deterministically", () => {
    const registry = createBusinessBrainFoundationRegistryV1();

    expect(registry.listDomainPacks().map((pack) => pack.semanticId)).toEqual([
      blmDomainPackIdsV1.universalCore,
      blmDomainPackIdsV1.crmSales,
      blmDomainPackIdsV1.financeAccounting,
      blmDomainPackIdsV1.inventoryProcurement,
    ]);
  });

  it("enforces stable Flow semantic IDs for domain packs", () => {
    expect(() => toSemanticId("flow.blm.domain.crm-sales")).toThrow(
      /Invalid semantic id/,
    );
    expect(
      () =>
        new BusinessExpertiseRegistry({
          sources: blmSourceManifestV1,
          domainPacks: [
            {
              ...crmSalesPackV1,
              domainPack: {
                ...crmSalesPackV1.domainPack,
                semanticId: "not-a-flow-id" as never,
              },
            },
          ],
        }),
    ).not.toThrow();
    const registry = new BusinessExpertiseRegistry({
      sources: blmSourceManifestV1,
    });
    const result = registry.registerDomainPack({
      ...crmSalesPackV1,
      domainPack: {
        ...crmSalesPackV1.domainPack,
        semanticId: "not-a-flow-id" as never,
      },
    });

    expect(result).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: "INVALID_SEMANTIC_ID" })],
    });
  });

  it("attaches external source provenance to mapped concepts", () => {
    const registry = createBusinessBrainFoundationRegistryV1();
    const organizationMappings = registry.getExternalMappingsForConcept(
      toSemanticId("flow.concept.universal.organization"),
    );

    expect(organizationMappings).toContainEqual(
      expect.objectContaining({
        sourceId: "w3c.org",
        externalId: "org:Organization",
        version: "2014 Recommendation",
      }),
    );
  });

  it("blocks review-required sources from trusted imported knowledge", () => {
    const importedFromXbrl: BusinessDomainPackBundle = {
      ...financeAccountingPackV1,
      concepts: [
        {
          ...financeAccountingPackV1.concepts[0]!,
          provenance: {
            sourceIds: ["xbrl.global-ledger"],
            use: "IMPORTED_FROM",
            notes: "Unsafe import attempt.",
          },
        },
      ],
    };
    const registry = new BusinessExpertiseRegistry({
      sources: blmSourceManifestV1,
    });

    const result = registry.registerDomainPack(importedFromXbrl);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "SOURCE_NOT_APPROVED_FOR_IMPORT",
        sourceId: "xbrl.global-ledger",
      }),
    );
  });

  it("keeps global domain knowledge tenant-free and tenant overlays workspace-scoped", () => {
    const registry = new BusinessExpertiseRegistry({
      sources: blmSourceManifestV1,
    });
    const malformedTenantPack = {
      ...crmSalesPackV1,
      domainPack: {
        ...crmSalesPackV1.domainPack,
        workspaceId: "workspace-alpha",
      },
    } as unknown as BusinessDomainPackBundle;

    const result = registry.registerDomainPack(malformedTenantPack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "TENANT_BOUNDARY_VIOLATION" }),
    );

    registry.setTenantOverlay({
      workspaceId: "workspace-alpha",
      enabledDomainPackIds: [blmDomainPackIdsV1.crmSales],
      terminologyAliases: { customer: "client" },
      policies: { quoteApprovalRequired: true },
      thresholds: { quoteApprovalThreshold: 5000 },
    });

    expect(registry.getTenantOverlay("workspace-alpha")).toMatchObject({
      workspaceId: "workspace-alpha",
      terminologyAliases: { customer: "client" },
    });
    expect(registry.getTenantOverlay("workspace-beta")).toBeUndefined();
  });

  it("indexes skills by domain concepts and capabilities", () => {
    const registry = createBusinessBrainFoundationRegistryV1();

    expect(
      registry
        .getSkillsForConcept(toSemanticId("flow.concept.crm.lead"))
        .map((skill) => skill.semanticId),
    ).toContain(toSemanticId("flow.action.crm.create-lead"));
    expect(
      registry
        .getSkillsForCapability(
          toSemanticId("flow.capability.sales.quote-calculation"),
        )
        .map((skill) => skill.semanticId),
    ).toEqual([toSemanticId("flow.action.sales.calculate-quote-total")]);
  });

  it("validates business skill contracts and execution authority", () => {
    const invalidSkill: BusinessSkillDefinition = {
      ...crmSalesPackV1.skills[0]!,
      inputContract: {
        version: 1,
        fields: [
          { key: "name", type: "STRING", required: true },
          { key: "name", type: "STRING", required: false },
        ],
      },
    };
    const registry = new BusinessExpertiseRegistry({
      sources: blmSourceManifestV1,
    });

    const result = registry.registerDomainPack({
      ...crmSalesPackV1,
      skills: crmSalesPackV1.skills.map((skill) =>
        skill.semanticId === invalidSkill.semanticId ? invalidSkill : skill,
      ),
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_CONTRACT" }),
    );
    expect(
      crmSalesPackV1.skills.every((skill) => skill.executionAuthority),
    ).toBe(true);
  });

  it("prevents authoritative calculation skills from using free-form LLM authority", () => {
    const invalidSkill: BusinessSkillDefinition = {
      ...financeAccountingPackV1.skills[1]!,
      executionAuthority: "LLM_ADVISORY",
    };
    const registry = new BusinessExpertiseRegistry({
      sources: blmSourceManifestV1,
    });

    expect(
      registry.registerDomainPack({
        ...financeAccountingPackV1,
        skills: [invalidSkill],
      }),
    ).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({ code: "INVALID_CALCULATION_AUTHORITY" }),
      ],
    });
  });

  it("requires Action Wall and permission metadata for high-risk mutation skills", () => {
    const invalidSkill: BusinessSkillDefinition = {
      ...crmSalesPackV1.skills[0]!,
      requiredPermissions: [],
    };
    const invalidSkillWithoutAction = ((): BusinessSkillDefinition => {
      const { actionBinding, ...skill } = invalidSkill;
      void actionBinding;
      return skill;
    })();
    const registry = new BusinessExpertiseRegistry({
      sources: blmSourceManifestV1,
    });

    const result = registry.registerDomainPack({
      ...crmSalesPackV1,
      skills: crmSalesPackV1.skills.map((skill) =>
        skill.semanticId === invalidSkillWithoutAction.semanticId
          ? invalidSkillWithoutAction
          : skill,
      ),
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_ACTION_WALL_METADATA" }),
    );
  });

  it("represents formulas, rules, documents, metrics, and external mappings deterministically", () => {
    const registry = createBusinessBrainFoundationRegistryV1();

    expect(
      registry.getAuthoritativeFormulas().map((formula) => formula.semanticId),
    ).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.decision.formula.finance.gross-profit"),
        toSemanticId("flow.decision.formula.finance.gross-margin"),
        toSemanticId("flow.decision.formula.finance.invoice-total"),
      ]),
    );
    expect(financeAccountingPackV1.rules[0]).toMatchObject({
      authority: "DMN_REFERENCE",
      executionAuthority: "DETERMINISTIC_REQUIRED",
    });
    expect(
      registry
        .getDocumentsForProcess(
          toSemanticId("flow.process.sales.opportunity-to-quote"),
        )
        .map((document) => document.semanticId),
    ).toContain(toSemanticId("flow.contract.document.sales.quotation"));
    expect(financeAccountingPackV1.metrics[1]).toMatchObject({
      calculationAuthority: "DETERMINISTIC_REQUIRED",
      formulaId: toSemanticId("flow.decision.formula.finance.gross-margin"),
    });
    expect(
      registry.getExternalMappingsForConcept(
        toSemanticId("flow.concept.finance.invoice"),
      )[0],
    ).toMatchObject({ sourceId: "oasis.ubl-2.4", version: "2.4" });
  });

  it("keeps Semantica and model vendors out of BLM contracts", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./business-brain-foundation.ts", import.meta.url),
        "utf8",
      ),
    );

    expect(source).not.toContain('from "semantica"');
    expect(source).not.toContain("ContextGraph");
    expect(source).not.toContain("OpenAI");
    expect(source).not.toContain("Anthropic");
    expect(source).not.toContain("Qwen");
  });

  it("does not treat domain packs as ModuleDefinitions and preserves Component Registry", () => {
    const moduleShapeKeys = ["key", "status", "capabilities", "actions"];
    expect(
      moduleShapeKeys.every((key) => key in crmSalesPackV1.domainPack),
    ).toBe(false);

    const componentRegistry = new ComponentRegistry({
      trustedModules: [
        {
          key: "core.organization",
          version: "1.0.0",
          status: "ACTIVE",
          capabilities: ["organization.profile"],
          dependencies: [],
          entityTypes: ["core.organization.organization"],
          actions: ["organization.read"],
        } satisfies TrustedModuleDefinition,
      ],
      knownCapabilityIds: [
        toSemanticId("flow.capability.crm.customer-management"),
      ],
      components: [
        {
          semanticId: customerManagementComponentId,
          version: "1.0.0",
          displayName: "Customer Management",
          description: "Semantic customer component.",
          lifecycleStatus: "ACTIVE",
          providesCapabilityIds: [
            toSemanticId("flow.capability.crm.customer-management"),
          ],
          requiresCapabilityIds: [],
          dependsOnComponentIds: [],
          optionalDependencyIds: [],
          conflictsWithComponentIds: [],
          implementation: {
            availability: "SEMANTIC_ONLY",
            moduleBindings: [],
          },
          usesEntityTypeKeys: [],
          exposesActions: [],
          producesEvents: [],
          consumesEvents: [],
          scope: "GLOBAL",
        },
      ],
    });

    expect(
      componentRegistry.isTrustedComponent(customerManagementComponentId),
    ).toBe(true);
  });

  it("supports CRM, finance, inventory, and cross-domain deterministic evaluation fixtures", () => {
    const registry = createBusinessBrainFoundationRegistryV1();

    expect(
      registry
        .getConceptsForDomain(blmDomainPackIdsV1.crmSales)
        .map((concept) => concept.semanticId),
    ).toContain(toSemanticId("flow.concept.crm.lead"));
    expect(
      registry
        .getMetricsForDomain(blmDomainPackIdsV1.financeAccounting)
        .map((metric) => metric.semanticId),
    ).toContain(toSemanticId("flow.decision.metric.finance.gross-margin"));
    expect(
      registry
        .getProcessPatternsForCapability(
          toSemanticId("flow.capability.inventory.availability"),
        )
        .map((pattern) => pattern.semanticId),
    ).toContain(toSemanticId("flow.process.inventory.reserve-to-fulfill"));

    expect(registry.validateEvaluationCases()).toEqual({
      valid: true,
      errors: [],
    });
    expect(
      blmBusinessBrainProofPacksV1.flatMap((pack) => pack.evaluationCases),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semanticId: toSemanticId(
            "flow.contract.evaluation.finance.gross-margin-deterministic",
          ),
          expected: { grossProfit: 400, grossMargin: 0.4 },
        }),
        expect.objectContaining({
          semanticId: toSemanticId(
            "flow.contract.evaluation.inventory.fulfillment-requires-reservation",
          ),
          expected: { requiresAvailability: true, requiresReservation: true },
        }),
      ]),
    );
  });

  it("records source manifest, benchmark registry, and domain coverage without ingestion claims", () => {
    expect(
      blmSourceManifestV1.every((source) => source.ingested === false),
    ).toBe(true);
    expect(
      blmSourceManifestV1.find((source) => source.id === "frappe.erpnext"),
    ).toMatchObject({
      decision: "REFERENCE_ONLY",
      importPolicy: "NO_INGESTION",
      licenseStatus: "RESTRICTED",
    });
    expect(externalBenchmarkRegistryV1).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "bizbench.quantitative-business-finance",
          ingestionStatus: "REVIEW_REQUIRED",
        }),
        expect.objectContaining({
          id: "finqa.financial-numerical-reasoning",
          ingestionStatus: "NOT_INGESTED",
        }),
      ]),
    );
    expect(
      blmDomainCoverageManifestV1
        .filter((track) => track.status === "FOUNDATION")
        .map((track) => track.id),
    ).toEqual([
      "universal-core",
      "crm-sales",
      "finance-accounting",
      "inventory-procurement",
    ]);
  });

  it("does not add runtime dependencies through the source manifest", () => {
    const runtimeDependencySources = blmSourceManifestV1.filter(
      (source) => source.ingested,
    );

    expect(runtimeDependencySources).toEqual([]);
    expect(
      inventoryProcurementPackV1.concepts.some((concept) =>
        concept.externalMappings.some(
          (mapping) => mapping.sourceId === "gs1.epcis",
        ),
      ),
    ).toBe(true);
  });
});
