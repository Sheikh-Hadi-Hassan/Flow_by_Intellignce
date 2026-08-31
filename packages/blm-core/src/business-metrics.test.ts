import { describe, expect, it } from "vitest";

import {
  logicId,
  toSemanticId,
  type BusinessContextFrame,
  type BusinessDataProviderCapability,
  type BusinessEvidenceItem,
  type BusinessRecordRef,
  type BusinessUserAssertion,
  type GovernedBusinessMetricDefinition,
  type SemanticId,
} from "@flow/blm-contracts";
import type { BusinessEntityType } from "@flow/blm-contracts";

import { businessLanguageCoreConceptIds } from "./business-language-foundation.js";
import {
  EntityResolverRegistry,
  GroundedBusinessRequestCompiler,
  InMemoryBusinessEntityLookupProvider,
  type BusinessEntityLookupRecord,
} from "./business-intent-entity-resolution.js";
import {
  BusinessDataProviderRegistry,
  BusinessQueryExecutor,
  BusinessQueryPlanner,
  InMemoryBusinessDataProvider,
  type BusinessDataProviderRecord,
} from "./business-query-planning.js";
import {
  BusinessAssertionVerifier,
  BusinessLogicRouter,
  DeterministicBusinessCalculationEngine,
  InMemoryGovernedBusinessMetricRegistry,
  InMemoryMetricBusinessLogicRegistry,
  businessMetricIds,
  universalGovernedBusinessMetricDefinitionsV1,
} from "./business-metrics.js";
import { stableFingerprint } from "./knowledge-acquisition.js";

const workspaceA = "workspace-a";
const workspaceB = "workspace-b";
const fixedNow = "2026-08-13T12:00:00.000Z";

const refs = {
  northstarProjectA: ref(
    workspaceA,
    "PROJECT",
    "project-a-northstar",
    "Northstar",
    businessLanguageCoreConceptIds.project,
  ),
  northstarProjectB: ref(
    workspaceB,
    "PROJECT",
    "project-b-northstar",
    "Northstar",
    businessLanguageCoreConceptIds.project,
  ),
  northstarClientA: ref(
    workspaceA,
    "CLIENT",
    "client-a-northstar",
    "Northstar",
  ),
  sarah: ref(workspaceA, "EMPLOYEE", "employee-a-sarah", "Sarah"),
  invoice1: ref(workspaceA, "INVOICE", "invoice-a-1", "Invoice 1"),
  invoice2: ref(workspaceA, "INVOICE", "invoice-a-2", "Invoice 2"),
} as const;

describe("business metric selection and deterministic calculation", () => {
  it("publishes a compact governed metric seed and validates logic links", () => {
    const registry = new InMemoryGovernedBusinessMetricRegistry();
    const logic = new InMemoryMetricBusinessLogicRegistry();

    expect(registry.list().map((item) => item.metricId)).toEqual(
      expect.arrayContaining([
        businessMetricIds.projectRevenue,
        businessMetricIds.projectDirectCost,
        businessMetricIds.projectMarginAmount,
        businessMetricIds.projectMarginPercentage,
        businessMetricIds.accountsReceivableBalance,
        businessMetricIds.overdueReceivableBalance,
        businessMetricIds.dso,
        businessMetricIds.employeeCapacityHours,
        businessMetricIds.employeeAllocatedHours,
        businessMetricIds.utilizationPercentage,
      ]),
    );
    for (const metric of registry.list()) {
      expect(logic.getDefinition(metric.businessLogicId)).toBeDefined();
      expect(metric.fingerprint).toBe(
        stableFingerprint(stripFingerprint(metric)),
      );
    }
  });

  it("surfaces project margin ambiguity unless amount or percentage is requested", () => {
    const router = new BusinessLogicRouter();

    expect(
      router.selectMetric({
        requestedConcepts: [businessLanguageCoreConceptIds.projectMargin],
        phrase: "project margin",
      }).resolutionStatus,
    ).toBe("AMBIGUOUS_METRIC");
    expect(
      router.selectMetric({
        requestedConcepts: [businessLanguageCoreConceptIds.projectMargin],
        phrase: "project margin percentage",
      }).selectedMetricId,
    ).toBe(businessMetricIds.projectMarginPercentage);
  });

  it("rejects unknown inactive and unknown-logic metric proposals", () => {
    const inactive: GovernedBusinessMetricDefinition = {
      ...universalGovernedBusinessMetricDefinitionsV1[0]!,
      metricId: toSemanticId("flow.decision.metric.test.inactive@1.0.0"),
      status: "INACTIVE",
      fingerprint: "inactive",
    };
    const missingLogic: GovernedBusinessMetricDefinition = {
      ...universalGovernedBusinessMetricDefinitionsV1[0]!,
      metricId: toSemanticId("flow.decision.metric.test.missing-logic@1.0.0"),
      businessLogicId: toSemanticId("flow.decision.logic.test.missing@1.0.0"),
      fingerprint: "missing-logic",
    };
    const router = new BusinessLogicRouter(
      new InMemoryGovernedBusinessMetricRegistry([inactive, missingLogic]),
      new InMemoryMetricBusinessLogicRegistry([]),
    );

    expect(
      router.selectMetric({
        requestedConcepts: [],
        preferredMetricId: toSemanticId(
          "flow.decision.metric.magic.score@1.0.0",
        ),
      }).resolutionStatus,
    ).toBe("UNKNOWN_METRIC");
    expect(
      router.selectMetric({
        requestedConcepts: [],
        preferredMetricId: inactive.metricId,
      }).resolutionStatus,
    ).toBe("INACTIVE_METRIC");
    expect(
      router.selectMetric({
        requestedConcepts: [],
        preferredMetricId: missingLogic.metricId,
      }).resolutionStatus,
    ).toBe("UNKNOWN_LOGIC");
  });

  it("calculates project margin amount and binds reconstructable evidence", () => {
    const result = calculateMetric({
      metricId: businessMetricIds.projectMarginAmount,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("100000", "70000", "USD"),
    });

    expect(result.status).toBe("CALCULATED");
    expect(result.value).toBe("30000.00");
    expect(result.currency).toBe("USD");
    expect(result.logicId).toBe(logicId("projects", "project-margin", 1));
    expect(result.evidence.map((item) => item.field)).toEqual([
      "projectRevenue",
      "projectCost",
    ]);
    expect(result.provenance).toContain("TASK_004_AUTHORIZED_EVIDENCE");
  });

  it("calculates project margin percentage and handles zero revenue explicitly", () => {
    const normal = calculateMetric({
      metricId: businessMetricIds.projectMarginPercentage,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("100000", "70000", "USD"),
    });
    const zero = calculateMetric({
      metricId: businessMetricIds.projectMarginPercentage,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("0", "10000", "USD"),
    });
    const amount = calculateMetric({
      metricId: businessMetricIds.projectMarginAmount,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("0", "10000", "USD"),
    });

    expect(normal.status).toBe("CALCULATED");
    expect(normal.value).toBe("30.00");
    expect(zero.status).toBe("UNDEFINED");
    expect(zero.warnings).toContain(
      "PROJECT_REVENUE_ZERO_PERCENTAGE_UNDEFINED",
    );
    expect(amount.value).toBe("-10000.00");
  });

  it("calculates receivables and overdue receivables from authorized evidence only", () => {
    const receivableEvidence = [
      evidence("openBalance", 12000, refs.invoice1, "USD"),
      evidence("currency", "USD", refs.invoice1, "USD"),
      evidence("openBalance", 3000, refs.invoice2, "USD"),
      evidence("currency", "USD", refs.invoice2, "USD"),
    ];

    expect(
      calculateMetric({
        metricId: businessMetricIds.accountsReceivableBalance,
        entityRefs: [refs.invoice1, refs.invoice2],
        evidence: receivableEvidence,
      }).value,
    ).toBe("15000.00");
    expect(
      calculateMetric({
        metricId: businessMetricIds.overdueReceivableBalance,
        entityRefs: [refs.invoice1, refs.invoice2],
        evidence: receivableEvidence,
      }).value,
    ).toBe("15000.00");
  });

  it("calculates employee utilization percentage without model arithmetic", () => {
    const result = calculateMetric({
      metricId: businessMetricIds.utilizationPercentage,
      entityRefs: [refs.sarah],
      evidence: [
        evidence("allocatedHours", 32, refs.sarah),
        evidence("weeklyCapacityHours", 40, refs.sarah),
      ],
      timeRange: monthRange(),
    });

    expect(result.status).toBe("CALCULATED");
    expect(result.value).toBe("80.00");
    expect(result.unit).toBe("PERCENTAGE");
    expect(result.provenance).not.toContain("LLM");
  });

  it("keeps missing input separate from zero and rejects invalid input", () => {
    const missing = calculateMetric({
      metricId: businessMetricIds.projectMarginAmount,
      entityRefs: [refs.northstarProjectA],
      evidence: [
        evidence("projectRevenue", "100000", refs.northstarProjectA, "USD"),
        evidence("currency", "USD", refs.northstarProjectA, "USD"),
      ],
    });
    const invalid = calculateMetric({
      metricId: businessMetricIds.projectMarginAmount,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("100000", "banana", "USD"),
    });

    expect(missing.status).toBe("NEEDS_INFORMATION");
    expect(missing.missingInputs.map((item) => item.inputKey)).toContain(
      "projectCost",
    );
    expect(invalid.status).toBe("INVALID_INPUT");
  });

  it("rejects workspace entity period currency and fingerprint contamination", () => {
    expect(
      calculateMetric({
        metricId: businessMetricIds.projectMarginAmount,
        entityRefs: [refs.northstarProjectA],
        evidence: projectEvidence(
          "100000",
          "70000",
          "USD",
          refs.northstarProjectB,
        ),
      }).warnings,
    ).toContain("EVIDENCE_WORKSPACE_MISMATCH");
    expect(
      calculateMetric({
        metricId: businessMetricIds.projectMarginAmount,
        entityRefs: [refs.northstarProjectA],
        evidence: projectEvidence("100000", "70000", "USD", {
          ...refs.northstarProjectB,
          workspaceId: workspaceA,
        }),
      }).warnings,
    ).toContain("EVIDENCE_ENTITY_MISMATCH");
    expect(
      calculateMetric({
        metricId: businessMetricIds.utilizationPercentage,
        entityRefs: [refs.sarah],
        evidence: [
          evidence("allocatedHours", 32, refs.sarah, undefined, "2026-08-01"),
          evidence(
            "weeklyCapacityHours",
            40,
            refs.sarah,
            undefined,
            "2026-07-01",
          ),
        ],
      }).warnings,
    ).toContain("TIME_PERIOD_MISMATCH");
    expect(
      calculateMetric({
        metricId: businessMetricIds.accountsReceivableBalance,
        entityRefs: [refs.invoice1, refs.invoice2],
        evidence: [
          evidence("openBalance", 100000, refs.invoice1, "USD"),
          evidence("currency", "USD", refs.invoice1, "USD"),
          evidence("openBalance", 70000, refs.invoice2, "PKR"),
          evidence("currency", "PKR", refs.invoice2, "PKR"),
        ],
      }).warnings,
    ).toContain("CURRENCY_MISMATCH");
    expect(
      calculateMetric({
        metricId: businessMetricIds.projectMarginAmount,
        entityRefs: [refs.northstarProjectA],
        evidence: [
          {
            ...evidence(
              "projectRevenue",
              "100000",
              refs.northstarProjectA,
              "USD",
            ),
            fingerprint: "tampered",
          },
          evidence("currency", "USD", refs.northstarProjectA, "USD"),
          evidence("projectCost", "70000", refs.northstarProjectA, "USD"),
        ],
      }).warnings,
    ).toContain("EVIDENCE_FINGERPRINT_MISMATCH");
  });

  it("produces deterministic fingerprints and changes on material input changes", () => {
    const first = calculateMetric({
      metricId: businessMetricIds.projectMarginAmount,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("100000", "70000", "USD"),
    });
    const second = calculateMetric({
      metricId: businessMetricIds.projectMarginAmount,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("100000", "70000", "USD"),
    });
    const changed = calculateMetric({
      metricId: businessMetricIds.projectMarginAmount,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("100000", "80000", "USD"),
    });

    expect(first.inputFingerprint).toBe(second.inputFingerprint);
    expect(first.resultFingerprint).toBe(second.resultFingerprint);
    expect(first.resultFingerprint).not.toBe(changed.resultFingerprint);
  });

  it("runs Northstar project margin through Task 002 to Task 005 without model calculation", () => {
    const contextFrame = frame({ activeProjectRef: refs.northstarProjectA });
    const request = compile("What's Northstar's project margin?", contextFrame);
    const plan = new BusinessQueryPlanner(providerRegistry()).plan({
      request,
      contextFrame,
    });
    const retrieved = new BusinessQueryExecutor(providerRegistry()).execute(
      plan,
    );
    const selection = new BusinessLogicRouter().selectMetric({
      requestedConcepts: request.concepts,
      ...(plan.requiredCalculations[0]
        ? { requiredCalculation: plan.requiredCalculations[0] }
        : {}),
      phrase: "project margin percentage",
    });
    const result = calculateMetric({
      metricId: selection.selectedMetricId!,
      entityRefs: [refs.northstarProjectA],
      evidence: retrieved.evidence,
    });

    expect(plan.requiredCalculations).toHaveLength(1);
    expect(selection.selectedMetricId).toBe(
      businessMetricIds.projectMarginPercentage,
    );
    expect(result.status).toBe("CALCULATED");
    expect(result.value).toBe("20.00");
  });

  it("verifies unprofitable assertions without causal explanation", () => {
    const result = calculateMetric({
      metricId: businessMetricIds.projectMarginAmount,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("100000", "120000", "USD"),
    });
    const verification = new BusinessAssertionVerifier().verify({
      assertion: assertion("Why is Northstar unprofitable?"),
      result,
    });

    expect(verification.status).toBe("SUPPORTED");
    expect(verification.explanationFacts.join(" ")).not.toContain("because");
  });

  it("contradicts an unsupported user numeric margin claim", () => {
    const result = calculateMetric({
      metricId: businessMetricIds.projectMarginPercentage,
      entityRefs: [refs.northstarProjectA],
      evidence: projectEvidence("100000", "80000", "USD"),
    });
    const verification = new BusinessAssertionVerifier().verify({
      assertion: assertion(
        "Project revenue is 100k and cost is 80k, margin is 30%.",
      ),
      result,
      expected: "PERCENTAGE_EQUALS",
      assertedValue: 30,
    });

    expect(result.value).toBe("20.00");
    expect(verification.status).toBe("NOT_SUPPORTED");
  });

  it("keeps missing currency for who owes us more than 10k", () => {
    const contextFrame = frame();
    const request = compile("Who owes us more than 10k?", contextFrame);
    const plan = new BusinessQueryPlanner(providerRegistry()).plan({
      request,
      contextFrame,
    });

    expect(plan.status).toBe("NEEDS_INFORMATION");
    expect(plan.unresolvedInputs.map((item) => item.code)).toContain(
      "MISSING_CURRENCY",
    );
  });
});

function calculateMetric(input: {
  readonly metricId: SemanticId;
  readonly entityRefs: readonly BusinessRecordRef[];
  readonly evidence: readonly BusinessEvidenceItem[];
  readonly timeRange?: ReturnType<typeof monthRange>;
}) {
  const engine = new DeterministicBusinessCalculationEngine();
  const bundle = engine.createInputBundle({
    calculationRequestId: "calc:test",
    workspaceId: input.entityRefs[0]?.workspaceId ?? workspaceA,
    metricId: input.metricId,
    entityRefs: input.entityRefs,
    evidence: input.evidence,
    ...(input.timeRange ? { timeRange: input.timeRange } : {}),
  });
  return engine.calculate({ bundle });
}

function projectEvidence(
  revenue: string | number,
  cost: string | number,
  currency: string,
  recordRef: BusinessRecordRef = refs.northstarProjectA,
): readonly BusinessEvidenceItem[] {
  return [
    evidence("projectRevenue", revenue, recordRef, currency),
    evidence("currency", currency, recordRef, currency),
    evidence("projectCost", cost, recordRef, currency),
  ];
}

function evidence(
  field: string,
  value: string | number | boolean,
  recordRef: BusinessRecordRef,
  currency?: string,
  effectiveAt = "2026-08-01",
): BusinessEvidenceItem {
  const material = {
    workspaceId: recordRef.workspaceId,
    recordRef,
    field,
    value,
    queryPlanId: "plan:test",
    queryStepId: "step:test",
  };
  return {
    evidenceId: `evidence:${stableFingerprint(material).slice(0, 24)}`,
    workspaceId: recordRef.workspaceId,
    entityType: recordRef.entityType,
    recordRef,
    field,
    value,
    sourceProvider: "test-provider",
    sourceSystem: "test-source",
    systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
    observedAt: "2026-08-13T00:00:00.000Z",
    effectiveAt,
    provenance: ["test"],
    authorityClass: "EXTERNAL_RECORD",
    confidence: 1,
    queryPlanId: "plan:test",
    queryStepId: "step:test",
    dataQuality: "OK",
    fingerprint: stableFingerprint(material),
  };
}

function compile(utterance: string, contextFrame: BusinessContextFrame) {
  return new GroundedBusinessRequestCompiler({
    entityRegistry: entityRegistry(),
  }).compile({
    utterance,
    contextFrame,
    relativeTo: fixedNow,
  });
}

function entityRegistry(): EntityResolverRegistry {
  const registry = new EntityResolverRegistry();
  for (const entityType of [
    "PROJECT",
    "CLIENT",
    "EMPLOYEE",
  ] satisfies readonly BusinessEntityType[]) {
    registry.register(
      new InMemoryBusinessEntityLookupProvider(entityType, entityRecords),
    );
  }
  return registry;
}

function providerRegistry(): BusinessDataProviderRegistry {
  const registry = new BusinessDataProviderRegistry();
  registry.register(
    new InMemoryBusinessDataProvider(
      "project-provider",
      "projects",
      [
        capability(
          "project.financials.read",
          "PROJECT",
          ["GET_BY_REF"],
          ["project.financials.read"],
        ),
      ],
      providerRecords,
    ),
  );
  return registry;
}

const entityRecords: readonly BusinessEntityLookupRecord[] = [
  entityRecord(refs.northstarProjectA, "project.read", ["Northstar"]),
  entityRecord(refs.northstarProjectB, "project.read", ["Northstar"]),
  entityRecord(refs.northstarClientA, "client.read", ["Northstar"]),
  entityRecord(refs.sarah, "employee.read", ["Sarah"]),
];

const providerRecords: readonly BusinessDataProviderRecord[] = [
  {
    recordRef: refs.northstarProjectA,
    fields: {
      projectRevenue: 100000,
      projectCost: 80000,
      currency: "USD",
    },
    requiredPermissions: ["project.financials.read"],
    sourceSystem: "projects",
    systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
  },
];

function entityRecord(
  recordRef: BusinessRecordRef,
  permission: string,
  aliases: readonly string[] = [],
): BusinessEntityLookupRecord {
  return {
    recordRef,
    displayLabel: recordRef.displayLabel ?? recordRef.recordId,
    searchableText: [recordRef.displayLabel ?? recordRef.recordId],
    aliases,
    requiredPermissions: [permission],
  };
}

function capability(
  capabilityId: string,
  entityType: BusinessEntityType,
  operations: BusinessDataProviderCapability["operations"],
  requiredPermissions: readonly string[],
): BusinessDataProviderCapability {
  return {
    capabilityId,
    entityType,
    operations,
    providerKind: "TEST_PROVIDER",
    systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
    requiredPermissions,
  };
}

function frame(
  overrides: Partial<BusinessContextFrame> = {},
): BusinessContextFrame {
  return {
    workspaceId: workspaceA,
    userId: "user-a",
    roleRefs: ["member"],
    permissionIds: [
      "project.read",
      "project.financials.read",
      "client.read",
      "employee.read",
    ],
    recentResolvedRefs: [],
    recentIntentRefs: [],
    locale: "en",
    timezone: "Asia/Karachi",
    availableDomains: ["finance", "operations"],
    ...overrides,
  };
}

function ref(
  workspaceId: string,
  entityType: BusinessEntityType,
  recordId: string,
  displayLabel: string,
  canonicalTypeRef?: BusinessRecordRef["canonicalTypeRef"],
): BusinessRecordRef {
  return {
    workspaceId,
    entityType,
    recordId,
    displayLabel,
    ...(canonicalTypeRef ? { canonicalTypeRef } : {}),
  };
}

function monthRange() {
  return {
    expression: "this month",
    start: "2026-08-01",
    end: "2026-08-31",
    timezone: "Asia/Karachi",
    granularity: "MONTH" as const,
    relativeTo: fixedNow,
    resolutionStatus: "RESOLVED" as const,
    missingInformation: [],
    ambiguity: [],
    fingerprint: "month-range",
  };
}

function assertion(rawText: string): BusinessUserAssertion {
  return {
    rawText,
    normalizedText: rawText.toLowerCase(),
    conceptRefs: [businessLanguageCoreConceptIds.projectMargin],
    status: "USER_ASSERTION",
    provenance: ["USER_UTTERANCE"],
  };
}

function stripFingerprint(metric: GovernedBusinessMetricDefinition) {
  return Object.fromEntries(
    Object.entries(metric).filter(([key]) => key !== "fingerprint"),
  );
}
