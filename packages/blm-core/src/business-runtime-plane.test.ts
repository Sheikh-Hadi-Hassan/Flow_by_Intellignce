import { describe, expect, it } from "vitest";

import {
  blmExpandedDomainIdsV1,
  logicId,
  projectMarginAnalysisSkillV1,
  toSemanticId,
} from "@flow/blm-contracts";

import {
  BusinessCalculationDependencyGraph,
  BusinessRequestPlanner,
  BusinessRuntimeAdmissionController,
  DeterministicBusinessEngine,
  TrustedBusinessLogicImplementationRegistry,
  VirtualWorkspaceBusinessRuntime,
  WorkspaceRuntimeCache,
  WorkspaceRuntimeCompiler,
  benchmarkActor,
  benchmarkBusinessRuntimePlane,
  bridgeRequiredCalculation,
  calculationRequest,
  createUnifiedBusinessRequest,
  fakeErpUiRequest,
  fakeVoiceRequest,
  portableLogicPackageBoundaryV1,
  workspaceInput,
  type BusinessRequestClass,
} from "./business-runtime-plane.js";
import { workspaceSkillInstallation } from "./business-skill-registry.js";

function runtime(
  workspaceId: string,
  businessType: string,
  domains = [
    blmExpandedDomainIdsV1.financeAccounting,
    blmExpandedDomainIdsV1.inventoryLogistics,
    blmExpandedDomainIdsV1.projectsServiceOperations,
    blmExpandedDomainIdsV1.crmSales,
    blmExpandedDomainIdsV1.analyticsStrategyPlanning,
    blmExpandedDomainIdsV1.productCatalogPricing,
  ],
) {
  const manifest = new WorkspaceRuntimeCompiler().compile(
    workspaceInput(workspaceId, businessType, domains),
  );
  return new VirtualWorkspaceBusinessRuntime(
    manifest,
    new DeterministicBusinessEngine(),
  );
}

function requestType(type: BusinessRequestClass, intent = "open invoice") {
  return createUnifiedBusinessRequest({
    requestId: `request-${type}`,
    workspaceId: "workspace-runtime",
    actor: benchmarkActor("workspace-runtime"),
    source: "FORM",
    requestType: type,
    intent,
    payload: {},
    recordReferences: [],
    requestedAt: "2026-08-12T00:00:00.000Z",
    priority: type === "BULK_IMPORT" ? "BULK" : "INTERACTIVE",
    idempotencyKey: `idempotency-${type}`,
    correlationId: `correlation-${type}`,
  });
}

describe("Flow Business Runtime Plane v1", () => {
  it("plans request classes into non-recursive execution lanes", () => {
    const planner = new BusinessRequestPlanner();
    expect(planner.plan(requestType("DIRECT_READ")).executionLane).toBe(
      "FAST_SYNC",
    );
    expect(
      planner.plan(requestType("DETERMINISTIC_CALCULATION", "gross margin"))
        .requiresDeterministicEngine,
    ).toBe(true);
    expect(
      planner.plan(requestType("BUSINESS_REASONING", "why did margin fall"))
        .requiresModel,
    ).toBe(true);
    expect(planner.plan(requestType("COMMAND")).requiresActionWall).toBe(true);
    expect(planner.plan(requestType("DOCUMENT_PROCESSING")).executionLane).toBe(
      "ASYNC_BACKGROUND",
    );
    expect(
      planner.plan(requestType("LONG_RUNNING_WORKFLOW")).executionLane,
    ).toBe("DURABLE_WORKFLOW_FUTURE");
  });

  it("compiles serializable workspace manifests and lazy domain slices", () => {
    const grocery = new WorkspaceRuntimeCompiler().compile(
      workspaceInput("workspace-grocery", "Grocery", [
        blmExpandedDomainIdsV1.inventoryLogistics,
        blmExpandedDomainIdsV1.financeAccounting,
      ]),
    );
    const agency = new WorkspaceRuntimeCompiler().compile(
      workspaceInput("workspace-agency", "Marketing Agency", [
        blmExpandedDomainIdsV1.projectsServiceOperations,
        blmExpandedDomainIdsV1.financeAccounting,
      ]),
    );
    const serialized = JSON.stringify(grocery);

    expect(serialized).not.toMatch(/secret|api[_-]?key|password/i);
    expect(grocery.runtimeFingerprint).not.toBe(agency.runtimeFingerprint);
    expect(grocery.runtimeSliceIndex.map((slice) => slice.sliceId)).toEqual(
      expect.arrayContaining(["inventory", "finance"]),
    );
    expect(agency.runtimeSliceIndex.map((slice) => slice.sliceId)).toEqual(
      expect.arrayContaining(["projects", "finance"]),
    );
  });

  it("compiles installed skills into deterministic manifests and lazy slices", () => {
    const manifest = new WorkspaceRuntimeCompiler().compile({
      ...workspaceInput("workspace-agency-skill", "Marketing Agency", [
        blmExpandedDomainIdsV1.financeAccounting,
      ]),
      installedSkills: [
        workspaceSkillInstallation({
          workspaceId: "workspace-agency-skill",
          skillId: projectMarginAnalysisSkillV1.skillId,
          skillVersion: projectMarginAnalysisSkillV1.version,
          installedBy: "workspace-owner",
        }),
      ],
      availableERPCapabilityIds: ["PROJECT_READ"],
      workspacePolicyIds: ["business.calculation.execute"],
    });
    const projectSlice = manifest.runtimeSliceIndex.find(
      (slice) => slice.sliceId === "projects",
    );

    expect(manifest.availableSkillIds).toContain(
      projectMarginAnalysisSkillV1.skillId,
    );
    expect(manifest.enabledDomainIds).toContain(
      blmExpandedDomainIdsV1.projectsServiceOperations,
    );
    expect(projectSlice?.skillIds).toContain(
      projectMarginAnalysisSkillV1.skillId,
    );
    expect(projectSlice?.logicIds).toContain(
      logicId("projects", "project-margin", 1),
    );
    expect(projectSlice?.capabilityReferences).toContain("PROJECT_READ");
  });

  it("caches manifests by fingerprint and replaces changed runtime versions", () => {
    const compiler = new WorkspaceRuntimeCompiler();
    const v1 = compiler.compile(
      workspaceInput("workspace-cache", "Grocery", [
        blmExpandedDomainIdsV1.inventoryLogistics,
      ]),
    );
    const v2 = compiler.compile({
      ...workspaceInput("workspace-cache", "Grocery", [
        blmExpandedDomainIdsV1.inventoryLogistics,
        blmExpandedDomainIdsV1.financeAccounting,
      ]),
      runtimeVersion: "2",
    });
    const cache = new WorkspaceRuntimeCache(2);
    cache.set(v1);
    expect(
      cache.get({
        workspaceId: v1.workspaceId,
        runtimeFingerprint: v1.runtimeFingerprint,
      })?.runtimeFingerprint,
    ).toBe(v1.runtimeFingerprint);
    cache.set(v2);
    expect(v2.runtimeFingerprint).not.toBe(v1.runtimeFingerprint);
    expect(
      cache.get({
        workspaceId: v2.workspaceId,
        runtimeFingerprint: v2.runtimeFingerprint,
      })?.runtimeVersion,
    ).toBe("2");
  });

  it("executes the priority SMB calculations through the deterministic engine", () => {
    const r = runtime("workspace-smb", "B2B SaaS");
    const cases = [
      [
        logicId("finance", "gross-margin", 1),
        { revenue: "100.00", costOfGoodsSold: "64.35" },
        { grossMargin: "35.65" },
      ],
      [
        logicId("finance", "gross-margin-percentage", 1),
        { grossMargin: "35.00", revenue: "100.00" },
        { grossMarginPercentage: "0.3500" },
      ],
      [
        logicId("pricing", "markup", 1),
        { sellingPrice: "150.00", cost: "100.00" },
        { markupPercentage: "0.5000" },
      ],
      [
        logicId("finance", "net-revenue", 1),
        { grossRevenue: "1000.00", discounts: "50.00", returns: "25.00" },
        { netRevenue: "925.00" },
      ],
      [
        logicId("finance", "ar-aging-bucket-assignment", 1),
        { daysOutstanding: 75 },
        { agingBucket: "61-90" },
      ],
      [
        logicId("finance", "ap-aging-bucket-assignment", 1),
        { daysOutstanding: 120 },
        { agingBucket: "90+" },
      ],
      [
        logicId("inventory", "available-inventory", 1),
        { stockOnHand: 50, reservedStock: 45 },
        { availableInventory: 5 },
      ],
      [
        logicId("projects", "project-margin", 1),
        { projectRevenue: "900.00", projectCost: "790.00" },
        { projectMargin: "110.00" },
      ],
      [
        logicId("projects", "employee-utilization", 1),
        { billableHours: 30, availableHours: 40 },
        { utilizationRate: "0.7500" },
      ],
      [
        logicId("crm", "lead-conversion-rate", 1),
        { convertedLeads: 12, totalLeads: 80 },
        { leadConversionRate: "0.1500" },
      ],
      [
        logicId("crm", "average-deal-size", 1),
        { wonRevenue: "1000.00", wonDealCount: 4 },
        { averageDealSize: "250.00" },
      ],
      [
        logicId("saas", "churn-rate", 1),
        { lostBase: 5, startingBase: 100 },
        { churnRate: "0.0500" },
      ],
      [
        logicId("saas", "mrr", 1),
        { monthlySubscriptionRevenue: "1200.00" },
        { mrr: "1200.00" },
      ],
      [logicId("saas", "arr", 1), { mrr: "1200.00" }, { arr: "14400.00" }],
      [
        logicId("finance", "working-capital", 1),
        { currentAssets: "500.00", currentLiabilities: "350.00" },
        { workingCapital: "150.00" },
      ],
      [
        logicId("pricing", "discount-percentage", 1),
        { listPrice: "100.00", discountAmount: "15.00" },
        { discountPercentage: "0.1500" },
      ],
    ] as const;

    for (const [logic, inputs, expected] of cases) {
      const result = r.calculate(
        calculationRequest({
          requestId: `calc-${logic}`,
          workspaceId: r.manifest.workspaceId,
          actor: benchmarkActor(r.manifest.workspaceId),
          logicId: logic,
          inputs,
          runtimeFingerprint: r.manifest.runtimeFingerprint,
          currency: "USD",
        }),
      );
      expect(result.status).toBe("COMPLETED");
      expect(result.result).toEqual(expected);
      expect(result.authority).toBe("DETERMINISTIC");
    }
  });

  it("blocks draft, missing, unauthorized, and runtime-mismatched execution", () => {
    const r = runtime("workspace-security", "Grocery");
    const deniedActor = {
      ...benchmarkActor(r.manifest.workspaceId),
      permissionIds: [],
    };

    expect(
      r.calculate(
        calculationRequest({
          requestId: "draft",
          workspaceId: r.manifest.workspaceId,
          actor: benchmarkActor(r.manifest.workspaceId),
          logicId: logicId("tax", "tax-exclusive-inclusive-boundary", 1),
          inputs: { price: "100.00", jurisdiction: "US" },
          runtimeFingerprint: r.manifest.runtimeFingerprint,
          currency: "USD",
        }),
      ).status,
    ).toBe("LOGIC_NOT_APPLICABLE");
    expect(
      r.calculate(
        calculationRequest({
          requestId: "denied",
          workspaceId: r.manifest.workspaceId,
          actor: deniedActor,
          logicId: logicId("finance", "gross-margin", 1),
          inputs: { revenue: "1.00", costOfGoodsSold: "0.50" },
          runtimeFingerprint: r.manifest.runtimeFingerprint,
          currency: "USD",
        }),
      ).status,
    ).toBe("AUTHORIZATION_DENIED");
    expect(
      r.calculate(
        calculationRequest({
          requestId: "mismatch",
          workspaceId: r.manifest.workspaceId,
          actor: benchmarkActor(r.manifest.workspaceId),
          logicId: logicId("finance", "gross-margin", 1),
          inputs: { revenue: "1.00", costOfGoodsSold: "0.50" },
          runtimeFingerprint: "wrong-runtime",
          currency: "USD",
        }),
      ).status,
    ).toBe("RUNTIME_MISMATCH");
  });

  it("bridges BLM RequiredCalculation to approved runtime logic and ignores model numeric authority", () => {
    const r = runtime("workspace-bridge", "Services");
    const request = createUnifiedBusinessRequest({
      requestId: "reasoning-request",
      workspaceId: r.manifest.workspaceId,
      actor: benchmarkActor(r.manifest.workspaceId),
      source: "TEXT",
      requestType: "BUSINESS_REASONING",
      intent:
        "Project margin declined. Model suggests 999 but asks for calculation.",
      payload: { currency: "USD", modelSuggestedValue: 999 },
      recordReferences: ["project-1"],
      contextFingerprint: "context-1",
      requestedAt: "2026-08-12T00:00:00.000Z",
      priority: "INTERACTIVE",
      idempotencyKey: "reasoning-request",
      correlationId: "correlation",
    });
    const bridge = bridgeRequiredCalculation({
      requiredCalculation: {
        formulaId: logicId("projects", "project-margin", 1),
        requiredInputs: [toSemanticId("flow.concept.project.project-margin")],
        reason: "Authoritative margin required.",
        status: "REQUIRED",
      },
      request,
      manifest: r.manifest,
      contextRecordReferences: ["project-1"],
      inputs: { projectRevenue: "900.00", projectCost: "790.00" },
    });
    expect("status" in bridge && bridge.status === "REJECTED").toBe(false);
    const result = r.calculate(bridge as ReturnType<typeof calculationRequest>);
    expect(result.result).toEqual({ projectMargin: "110.00" });
  });

  it("uses the same engine for fake voice and ERP UI requests", () => {
    const r = runtime("workspace-modal", "Services");
    const voice = fakeVoiceRequest({
      requestId: "voice",
      workspaceId: r.manifest.workspaceId,
      actor: benchmarkActor(r.manifest.workspaceId),
      intent: "What is gross margin?",
      payload: {},
    });
    const erp = fakeErpUiRequest({
      requestId: "erp",
      workspaceId: r.manifest.workspaceId,
      actor: benchmarkActor(r.manifest.workspaceId),
      intent: "gross margin form",
      payload: {},
    });
    const make = (requestId: string) =>
      r.calculate(
        calculationRequest({
          requestId,
          workspaceId: r.manifest.workspaceId,
          actor: benchmarkActor(r.manifest.workspaceId),
          logicId: logicId("finance", "gross-margin", 1),
          inputs: { revenue: "100.00", costOfGoodsSold: "60.00" },
          runtimeFingerprint: r.manifest.runtimeFingerprint,
          currency: "USD",
        }),
      );

    expect(voice.source).toBe("VOICE");
    expect(erp.source).toBe("ERP_UI");
    expect(make("same").executionFingerprint).toBe(
      make("same").executionFingerprint,
    );
    expect(make("same").result).toEqual({ grossMargin: "40.00" });
  });

  it("detects dependency cycles and produces deterministic dependency order", () => {
    const graph = new BusinessCalculationDependencyGraph(5);
    const gross = logicId("finance", "gross-margin", 1);
    const pct = logicId("finance", "gross-margin-percentage", 1);

    expect(
      graph.executionOrder([
        { logicId: pct, dependsOn: [gross], version: "1" },
        { logicId: gross, dependsOn: [], version: "1" },
      ]),
    ).toEqual({ status: "VALID", order: [gross, pct] });
    expect(
      graph.executionOrder([
        { logicId: pct, dependsOn: [gross], version: "1" },
        { logicId: gross, dependsOn: [pct], version: "1" },
      ]).status,
    ).toBe("DEPENDENCY_CYCLE");
  });

  it("protects lanes with bounded admission, fairness, and load shedding", () => {
    const controller = new BusinessRuntimeAdmissionController({
      global: 2,
      perWorkspace: 1,
      perLane: { COMPUTE_SYNC: 1, ASYNC_BACKGROUND: 1 },
    });
    const planner = new BusinessRequestPlanner();
    const first = planner.plan(
      requestType("DETERMINISTIC_CALCULATION", "margin"),
    );
    const sameWorkspace = planner.plan(
      requestType("DETERMINISTIC_CALCULATION", "margin again"),
    );
    const otherWorkspace = {
      ...first,
      requestId: "workspace-b",
      workspaceId: "workspace-b",
    };

    expect(controller.admit(first).status).toBe("ADMITTED");
    expect(controller.admit(sameWorkspace).status).toBe("RUNTIME_BUSY");
    expect(controller.admit(otherWorkspace).status).toBe("RUNTIME_BUSY");
    controller.release(first);
    expect(controller.admit(otherWorkspace).status).toBe("ADMITTED");
  });

  it("keeps request path proofs separate without accidental model or engine routing", () => {
    const planner = new BusinessRequestPlanner();
    expect(planner.plan(requestType("DIRECT_READ")).requiresModel).toBe(false);
    expect(
      planner.plan(requestType("DIRECT_READ")).requiresDeterministicEngine,
    ).toBe(false);
    expect(
      planner.plan(requestType("DETERMINISTIC_CALCULATION")).requiresModel,
    ).toBe(false);
    expect(planner.plan(requestType("BUSINESS_REASONING")).requiresModel).toBe(
      true,
    );
    expect(planner.plan(requestType("COMMAND")).requiresActionWall).toBe(true);
    expect(
      planner.plan(requestType("DOCUMENT_PROCESSING")).requiresAsyncExecution,
    ).toBe(true);
    expect(
      planner.plan(requestType("LONG_RUNNING_WORKFLOW"))
        .requiresDurableWorkflow,
    ).toBe(true);
  });

  it("uses one shared deterministic kernel across isolated workspace runtimes", () => {
    const engine = new DeterministicBusinessEngine();
    const compiler = new WorkspaceRuntimeCompiler();
    const groceryManifest = compiler.compile(
      workspaceInput("workspace-grocery", "Grocery", [
        blmExpandedDomainIdsV1.inventoryLogistics,
      ]),
    );
    const agencyManifest = compiler.compile(
      workspaceInput("workspace-agency", "Marketing Agency", [
        blmExpandedDomainIdsV1.projectsServiceOperations,
      ]),
    );
    const saasManifest = compiler.compile(
      workspaceInput("workspace-saas", "B2B SaaS", [
        blmExpandedDomainIdsV1.analyticsStrategyPlanning,
      ]),
    );
    const runtimes = [
      new VirtualWorkspaceBusinessRuntime(groceryManifest, engine),
      new VirtualWorkspaceBusinessRuntime(agencyManifest, engine),
      new VirtualWorkspaceBusinessRuntime(saasManifest, engine),
    ];

    expect(
      new Set(runtimes.map((item) => item.manifest.runtimeFingerprint)).size,
    ).toBe(3);
    expect(
      groceryManifest.runtimeSliceIndex.map((slice) => slice.sliceId),
    ).toEqual(["inventory"]);
    expect(
      agencyManifest.runtimeSliceIndex.map((slice) => slice.sliceId),
    ).toEqual(["projects"]);
    expect(saasManifest.availableLogicIds).toEqual(
      expect.arrayContaining([
        logicId("saas", "mrr", 1),
        logicId("saas", "arr", 1),
      ]),
    );
  });

  it("prevents arbitrary generated code execution surfaces", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./business-runtime-plane.ts", import.meta.url),
        "utf8",
      ),
    );
    const registry = new TrustedBusinessLogicImplementationRegistry();

    expect(source).not.toMatch(
      /eval\(|new Function|child_process|exec\(|spawn\(/,
    );
    expect(registry.implementationIds()).toHaveLength(16);
    expect(portableLogicPackageBoundaryV1.signedReleaseRequired).toBe(true);
  });

  it("records local deterministic benchmark baselines", () => {
    const benchmarks = benchmarkBusinessRuntimePlane(100);

    expect(benchmarks.planLane).toBe("COMPUTE_SYNC");
    expect(benchmarks.requestClassificationOverheadMs).toBeGreaterThanOrEqual(
      0,
    );
    expect(benchmarks.warmManifestLookupMs).toBeGreaterThanOrEqual(0);
    expect(benchmarks.coldManifestCompileMs).toBeGreaterThanOrEqual(0);
    expect(benchmarks.singleCalculationMs).toBeGreaterThanOrEqual(0);
    expect(benchmarks.hundredCalculationsMs).toBeGreaterThanOrEqual(
      benchmarks.singleCalculationMs,
    );
  });
});
