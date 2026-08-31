import {
  logicId,
  toSemanticId,
  type BusinessCalculationInput,
  type BusinessCalculationInputBundle,
  type BusinessCalculationResult,
  type BusinessEvidenceItem,
  type BusinessLogicDefinition,
  type BusinessLogicInputRequirement,
  type GovernedBusinessMetricDefinition,
  type BusinessMetricGrain,
  type BusinessMetricType,
  type BusinessMetricUnitType,
  type BusinessRecordRef,
  type BusinessTimeRange,
  type BusinessAssertionVerification,
  type BusinessUserAssertion,
  type MetricSelectionResult,
  type RequiredBusinessCalculation,
  type SemanticId,
} from "@flow/blm-contracts";
import type { BusinessEntityType } from "@flow/blm-contracts";

import { businessLanguageCoreConceptIds } from "./business-language-foundation.js";
import { smbStarterBusinessLogicCatalogV1 } from "./business-logic-registry.js";
import { stableFingerprint } from "./knowledge-acquisition.js";

const calculatedAt = "2026-08-13T00:00:00.000Z";

export const businessMetricIds = {
  projectRevenue: metricId("projects", "project-revenue"),
  projectDirectCost: metricId("projects", "project-direct-cost"),
  projectMarginAmount: metricId("projects", "project-margin-amount"),
  projectMarginPercentage: metricId("projects", "project-margin-percentage"),
  accountsReceivableBalance: metricId("finance", "accounts-receivable-balance"),
  overdueReceivableBalance: metricId("finance", "overdue-receivable-balance"),
  dso: metricId("finance", "days-sales-outstanding"),
  employeeCapacityHours: metricId("operations", "employee-capacity-hours"),
  employeeAllocatedHours: metricId("operations", "employee-allocated-hours"),
  utilizationPercentage: metricId("operations", "utilization-percentage"),
} as const;

export interface GovernedBusinessMetricRegistry {
  register(definition: GovernedBusinessMetricDefinition): void;
  get(metricIdValue: SemanticId): GovernedBusinessMetricDefinition | undefined;
  findBySemanticConcept(
    conceptId: SemanticId,
  ): readonly GovernedBusinessMetricDefinition[];
  findByCanonicalAlias(
    alias: string,
  ): readonly GovernedBusinessMetricDefinition[];
  list(): readonly GovernedBusinessMetricDefinition[];
}

export interface BusinessLogicRegistry {
  register(definition: BusinessLogicDefinition): void;
  getDefinition(logicIdValue: SemanticId): BusinessLogicDefinition | undefined;
  getExecutor(logicIdValue: SemanticId): BusinessLogicExecutor | undefined;
  resolveForMetric(metric: GovernedBusinessMetricDefinition):
    | {
        readonly status: "FOUND";
        readonly definition: BusinessLogicDefinition;
        readonly executor: BusinessLogicExecutor;
      }
    | { readonly status: "MISSING" | "INACTIVE" };
  list(): readonly BusinessLogicDefinition[];
}

export type BusinessLogicExecutor = (input: {
  readonly metric: GovernedBusinessMetricDefinition;
  readonly bundle: BusinessCalculationInputBundle;
}) => {
  readonly status: BusinessCalculationResult["status"];
  readonly value?: string | number | boolean;
  readonly warnings?: readonly string[];
  readonly explanationFacts?: Readonly<
    Record<string, string | number | boolean>
  >;
};

export class InMemoryGovernedBusinessMetricRegistry implements GovernedBusinessMetricRegistry {
  private readonly byId = new Map<
    SemanticId,
    GovernedBusinessMetricDefinition
  >();

  constructor(
    definitions: readonly GovernedBusinessMetricDefinition[] = universalGovernedBusinessMetricDefinitionsV1,
  ) {
    for (const definition of definitions) this.register(definition);
  }

  register(definition: GovernedBusinessMetricDefinition): void {
    this.byId.set(definition.metricId, definition);
  }

  get(metricIdValue: SemanticId): GovernedBusinessMetricDefinition | undefined {
    return this.byId.get(metricIdValue);
  }

  findBySemanticConcept(
    conceptId: SemanticId,
  ): readonly GovernedBusinessMetricDefinition[] {
    return this.list().filter(
      (definition) => definition.semanticConceptId === conceptId,
    );
  }

  findByCanonicalAlias(
    alias: string,
  ): readonly GovernedBusinessMetricDefinition[] {
    const normalized = normalizeAlias(alias);
    return this.list().filter(
      (definition) =>
        normalizeAlias(definition.canonicalName) === normalized ||
        normalizeAlias(definition.displayName) === normalized ||
        definition.metricId.endsWith(`.${normalized}`),
    );
  }

  list(): readonly GovernedBusinessMetricDefinition[] {
    return [...this.byId.values()];
  }
}

export class InMemoryMetricBusinessLogicRegistry implements BusinessLogicRegistry {
  private readonly definitions = new Map<SemanticId, BusinessLogicDefinition>();
  private readonly executors = new Map<SemanticId, BusinessLogicExecutor>();

  constructor(
    definitions: readonly BusinessLogicDefinition[] = [
      ...smbStarterBusinessLogicCatalogV1,
      ...metricBusinessLogicDefinitionsV1,
    ],
    executors: readonly {
      readonly logicId: SemanticId;
      readonly executor: BusinessLogicExecutor;
    }[] = metricBusinessLogicExecutorsV1,
  ) {
    for (const definition of definitions) this.register(definition);
    for (const item of executors)
      this.executors.set(item.logicId, item.executor);
  }

  register(definition: BusinessLogicDefinition): void {
    this.definitions.set(definition.logicId, definition);
  }

  getDefinition(logicIdValue: SemanticId): BusinessLogicDefinition | undefined {
    return this.definitions.get(logicIdValue);
  }

  getExecutor(logicIdValue: SemanticId): BusinessLogicExecutor | undefined {
    return this.executors.get(logicIdValue);
  }

  resolveForMetric(metric: GovernedBusinessMetricDefinition):
    | {
        readonly status: "FOUND";
        readonly definition: BusinessLogicDefinition;
        readonly executor: BusinessLogicExecutor;
      }
    | { readonly status: "MISSING" | "INACTIVE" } {
    const definition = this.getDefinition(metric.businessLogicId);
    if (!definition) return { status: "MISSING" };
    if (definition.status !== "APPROVED" && definition.status !== "PUBLISHED") {
      return { status: "INACTIVE" };
    }
    const executor = this.getExecutor(metric.businessLogicId);
    if (!executor) return { status: "MISSING" };
    return { status: "FOUND", definition, executor };
  }

  list(): readonly BusinessLogicDefinition[] {
    return [...this.definitions.values()];
  }
}

export class BusinessLogicRouter {
  constructor(
    private readonly metricRegistry: GovernedBusinessMetricRegistry = new InMemoryGovernedBusinessMetricRegistry(),
    private readonly logicRegistry: BusinessLogicRegistry = new InMemoryMetricBusinessLogicRegistry(),
  ) {}

  selectMetric(input: {
    readonly requestedConcepts: readonly SemanticId[];
    readonly requiredCalculation?: RequiredBusinessCalculation;
    readonly preferredMetricId?: SemanticId;
    readonly phrase?: string;
  }): MetricSelectionResult {
    const requestedConcepts = [
      ...new Set([
        ...input.requestedConcepts,
        ...(input.requiredCalculation?.metricId
          ? [input.requiredCalculation.metricId]
          : []),
      ]),
    ];
    const candidates = uniqueMetrics([
      ...(input.preferredMetricId
        ? [this.metricRegistry.get(input.preferredMetricId)].filter(
            (item): item is GovernedBusinessMetricDefinition => Boolean(item),
          )
        : []),
      ...requestedConcepts.flatMap((concept) =>
        this.metricRegistry.findBySemanticConcept(concept),
      ),
      ...(input.phrase
        ? this.metricRegistry.findByCanonicalAlias(input.phrase)
        : []),
    ]);
    const selected =
      input.preferredMetricId && candidates.length > 0
        ? candidates.find(
            (candidate) => candidate.metricId === input.preferredMetricId,
          )
        : disambiguateMetric(candidates, input.phrase);
    const status = selectionStatus({
      requestedConcepts,
      candidates,
      ...(selected ? { selected } : {}),
      ...(input.preferredMetricId
        ? { preferredMetricId: input.preferredMetricId }
        : {}),
    });
    const logic =
      selected && selected.status === "ACTIVE"
        ? this.logicRegistry.resolveForMetric(selected)
        : undefined;
    const finalStatus =
      status !== "SELECTED"
        ? status
        : selected?.status !== "ACTIVE"
          ? "INACTIVE_METRIC"
          : logic?.status === "FOUND"
            ? "SELECTED"
            : logic?.status === "INACTIVE"
              ? "INVALID_LOGIC"
              : "UNKNOWN_LOGIC";
    const material = {
      requestedConcepts,
      candidates: candidates.map((candidate) => candidate.metricId),
      selected: selected?.metricId,
      finalStatus,
    };
    return {
      requestedConcepts,
      candidates,
      ...(selected
        ? { selectedMetricId: selected.metricId, selectedMetric: selected }
        : {}),
      ...(logic?.status === "FOUND"
        ? { logicDefinition: logic.definition }
        : {}),
      resolutionStatus: finalStatus,
      ambiguity:
        finalStatus === "AMBIGUOUS_METRIC"
          ? candidates.map((candidate) => candidate.metricId)
          : [],
      missingInformation:
        finalStatus === "UNKNOWN_METRIC"
          ? [
              {
                code: "MISSING_METRIC_DEFINITION",
                detail: "No active governed metric matched the request.",
              },
            ]
          : [],
      selectionEvidence: [
        "TASK_002_SEMANTIC_CONCEPTS",
        "TASK_005_GOVERNED_METRIC_REGISTRY",
      ],
      fingerprint: stableFingerprint(material),
    };
  }
}

export class DeterministicBusinessCalculationEngine {
  constructor(
    private readonly metricRegistry: GovernedBusinessMetricRegistry = new InMemoryGovernedBusinessMetricRegistry(),
    private readonly logicRegistry: BusinessLogicRegistry = new InMemoryMetricBusinessLogicRegistry(),
  ) {}

  createInputBundle(input: {
    readonly calculationRequestId: string;
    readonly workspaceId: string;
    readonly metricId: SemanticId;
    readonly entityRefs: readonly BusinessRecordRef[];
    readonly evidence: readonly BusinessEvidenceItem[];
    readonly timeRange?: BusinessTimeRange;
  }): BusinessCalculationInputBundle {
    const metric = this.metricRegistry.get(input.metricId);
    if (!metric) {
      return emptyBundle(
        input,
        toSemanticId("flow.decision.logic.unknown.metric@1.0.0"),
      );
    }
    const inputs: BusinessCalculationInput[] = [];
    const missing: BusinessLogicInputRequirement[] = [];
    const currencyValues = evidenceValues(input.evidence, "currency").map(
      (item) => String(item.value),
    );
    const currency = [...new Set(currencyValues)].sort()[0];
    for (const requirement of metric.inputRequirements) {
      const matching = input.evidence.filter(
        (item) =>
          item.field === requirement.inputKey &&
          item.entityType === requirement.entityType,
      );
      if (matching.length === 0 && requirement.required) {
        missing.push(requirement);
      }
      for (const evidence of matching) {
        const inputCurrency = input.evidence.find(
          (item) =>
            item.field === "currency" &&
            item.recordRef.workspaceId === evidence.recordRef.workspaceId &&
            item.recordRef.entityType === evidence.recordRef.entityType &&
            item.recordRef.recordId === evidence.recordRef.recordId,
        )?.value;
        inputs.push({
          inputKey: requirement.inputKey,
          value: evidence.value,
          ...(requirement.expectedUnit
            ? { unit: requirement.expectedUnit }
            : {}),
          ...(inputCurrency ? { currency: String(inputCurrency) } : {}),
          entityRef: evidence.recordRef,
          evidenceId: evidence.evidenceId,
          evidence,
        });
      }
    }
    const material = {
      calculationRequestId: input.calculationRequestId,
      workspaceId: input.workspaceId,
      metricId: metric.metricId,
      logicId: metric.businessLogicId,
      entityRefs: input.entityRefs,
      evidence: inputs.map((item) => item.evidence.fingerprint).sort(),
      missing: missing.map((item) => item.inputKey),
      timeRange: input.timeRange,
      currency,
    };
    return {
      calculationRequestId: input.calculationRequestId,
      workspaceId: input.workspaceId,
      metricId: metric.metricId,
      logicId: metric.businessLogicId,
      entityRefs: input.entityRefs,
      ...(input.timeRange ? { timeRange: input.timeRange } : {}),
      inputs,
      evidenceRefs: inputs.map((item) => item.evidenceId),
      ...(currency ? { currency } : {}),
      units: Object.fromEntries(
        metric.inputRequirements.map((item) => [
          item.inputKey,
          item.expectedUnit ?? metric.unitType,
        ]),
      ),
      completeness: missing.length > 0 ? "INCOMPLETE" : "COMPLETE",
      missingInputs: missing,
      fingerprint: stableFingerprint(material),
    };
  }

  calculate(input: {
    readonly bundle: BusinessCalculationInputBundle;
  }): BusinessCalculationResult {
    const { bundle } = input;
    const metric = this.metricRegistry.get(bundle.metricId);
    if (!metric) return failure(bundle, "NOT_APPLICABLE", "COUNT", []);
    const logic = this.logicRegistry.resolveForMetric(metric);
    if (logic.status !== "FOUND") {
      return failure(bundle, "NOT_APPLICABLE", metric.unitType, []);
    }
    const validation = validateBundle(metric, bundle);
    if (validation.status !== "OK") {
      return failure(
        bundle,
        validation.status,
        metric.unitType,
        validation.warnings,
        metric,
        logic.definition,
      );
    }
    if (bundle.missingInputs.length > 0) {
      return failure(
        bundle,
        "NEEDS_INFORMATION",
        metric.unitType,
        [],
        metric,
        logic.definition,
      );
    }
    let executed: ReturnType<BusinessLogicExecutor>;
    try {
      executed = logic.executor({ metric, bundle });
    } catch {
      return failure(
        bundle,
        "INVALID_INPUT",
        metric.unitType,
        [],
        metric,
        logic.definition,
      );
    }
    const evidence = bundle.inputs.map((item) => item.evidence);
    const explanationFacts = {
      metricName: metric.displayName,
      ...Object.fromEntries(
        bundle.inputs.map((item) => [item.inputKey, String(item.value)]),
      ),
      ...(executed.value !== undefined
        ? { result: String(executed.value) }
        : {}),
      ...(bundle.timeRange ? { timeRange: bundle.timeRange.expression } : {}),
      ...(bundle.currency ? { currency: bundle.currency } : {}),
      ...(executed.explanationFacts ?? {}),
    };
    const resultFingerprint = stableFingerprint({
      metricId: metric.metricId,
      metricVersion: metric.version,
      logicId: logic.definition.logicId,
      logicVersion: logic.definition.version,
      inputFingerprint: bundle.fingerprint,
      value: executed.value,
      status: executed.status,
      currency: bundle.currency,
    });
    return {
      calculationId: `calculation:${resultFingerprint.slice(0, 24)}`,
      workspaceId: bundle.workspaceId,
      metricId: metric.metricId,
      metricVersion: metric.version,
      logicId: logic.definition.logicId,
      logicVersion: logic.definition.version,
      entityRefs: bundle.entityRefs,
      ...(bundle.timeRange ? { timeRange: bundle.timeRange } : {}),
      ...(executed.value !== undefined ? { value: executed.value } : {}),
      unit: metric.unitType,
      ...(bundle.currency ? { currency: bundle.currency } : {}),
      status: executed.status,
      inputFingerprint: bundle.fingerprint,
      resultFingerprint,
      evidence,
      missingInputs: [],
      warnings: executed.warnings ?? [],
      calculatedAt,
      provenance: [
        "TASK_004_AUTHORIZED_EVIDENCE",
        "TASK_005_DETERMINISTIC_BUSINESS_LOGIC",
        ...metric.provenance,
      ],
      explanationFacts,
    };
  }
}

export class BusinessAssertionVerifier {
  verify(input: {
    readonly assertion: BusinessUserAssertion;
    readonly result: BusinessCalculationResult;
    readonly expected?: "NEGATIVE" | "PERCENTAGE_EQUALS";
    readonly assertedValue?: string | number;
  }): BusinessAssertionVerification {
    const assertionType = assertionTypeFor(input.assertion.normalizedText);
    const status = assertionStatus(input);
    const evidence = status === "SUPPORTED" ? input.result.evidence : [];
    const contradicting =
      status === "NOT_SUPPORTED" ? input.result.evidence : [];
    const material = {
      assertion: input.assertion.normalizedText,
      result: input.result.resultFingerprint,
      status,
      assertedValue: input.assertedValue,
    };
    return {
      assertionId: `assertion:${stableFingerprint(input.assertion).slice(0, 24)}`,
      assertionType,
      sourceAssertion: input.assertion,
      metricIds: [input.result.metricId],
      calculationIds: [input.result.calculationId],
      status,
      supportingEvidence: evidence,
      contradictingEvidence: contradicting,
      missingInformation:
        input.result.status === "CALCULATED"
          ? []
          : [
              {
                code: "INSUFFICIENT_CONTEXT",
                detail: "Calculation did not produce a verified result.",
              },
            ],
      explanationFacts: [
        `calculationStatus:${input.result.status}`,
        `metric:${input.result.metricId}`,
        ...(input.result.value !== undefined
          ? [`value:${String(input.result.value)}`]
          : []),
      ],
      fingerprint: stableFingerprint(material),
    };
  }
}

export const universalGovernedBusinessMetricDefinitionsV1: readonly GovernedBusinessMetricDefinition[] =
  [
    metric({
      id: businessMetricIds.projectRevenue,
      concept: businessLanguageCoreConceptIds.revenue,
      canonicalName: "PROJECT_REVENUE",
      displayName: "Project revenue",
      domain: "projects",
      type: "AMOUNT",
      grain: "PROJECT",
      unitType: "CURRENCY",
      logic: logicId("projects", "project-revenue", 1),
      entityTypes: ["PROJECT"],
      inputs: [
        inputReq(
          "projectRevenue",
          businessLanguageCoreConceptIds.revenue,
          "PROJECT",
          "CURRENCY",
          "PROJECT",
        ),
      ],
      aggregationRule: "SUM",
    }),
    metric({
      id: businessMetricIds.projectDirectCost,
      concept: businessLanguageCoreConceptIds.cost,
      canonicalName: "PROJECT_DIRECT_COST",
      displayName: "Project direct cost",
      domain: "projects",
      type: "AMOUNT",
      grain: "PROJECT",
      unitType: "CURRENCY",
      logic: logicId("projects", "project-direct-cost", 1),
      entityTypes: ["PROJECT"],
      inputs: [
        inputReq(
          "projectCost",
          businessLanguageCoreConceptIds.cost,
          "PROJECT",
          "CURRENCY",
          "PROJECT",
        ),
      ],
      aggregationRule: "SUM",
    }),
    metric({
      id: businessMetricIds.projectMarginAmount,
      concept: businessLanguageCoreConceptIds.projectMargin,
      canonicalName: "PROJECT_MARGIN_AMOUNT",
      displayName: "Project margin amount",
      domain: "projects",
      type: "AMOUNT",
      grain: "PROJECT",
      unitType: "CURRENCY",
      logic: logicId("projects", "project-margin", 1),
      entityTypes: ["PROJECT"],
      inputs: [
        inputReq(
          "projectRevenue",
          businessLanguageCoreConceptIds.revenue,
          "PROJECT",
          "CURRENCY",
          "PROJECT",
        ),
        inputReq(
          "projectCost",
          businessLanguageCoreConceptIds.cost,
          "PROJECT",
          "CURRENCY",
          "PROJECT",
        ),
      ],
      aggregationRule: "DO_NOT_AGGREGATE",
    }),
    metric({
      id: businessMetricIds.projectMarginPercentage,
      concept: businessLanguageCoreConceptIds.projectMargin,
      canonicalName: "PROJECT_MARGIN_PERCENTAGE",
      displayName: "Project margin percentage",
      domain: "projects",
      type: "PERCENTAGE",
      grain: "PROJECT",
      unitType: "PERCENTAGE",
      logic: logicId("projects", "project-margin-percentage", 1),
      entityTypes: ["PROJECT"],
      inputs: [
        inputReq(
          "projectRevenue",
          businessLanguageCoreConceptIds.revenue,
          "PROJECT",
          "CURRENCY",
          "PROJECT",
        ),
        inputReq(
          "projectCost",
          businessLanguageCoreConceptIds.cost,
          "PROJECT",
          "CURRENCY",
          "PROJECT",
        ),
      ],
      aggregationRule: "DO_NOT_AGGREGATE",
      zeroHandlingPolicy: "DENOMINATOR_ZERO_UNDEFINED",
      percentageSemantics: "RATIO_TIMES_100",
      rounding: { mode: "HALF_UP", precision: 2 },
    }),
    metric({
      id: businessMetricIds.accountsReceivableBalance,
      concept: businessLanguageCoreConceptIds.receivable,
      canonicalName: "ACCOUNTS_RECEIVABLE_BALANCE",
      displayName: "Accounts receivable balance",
      domain: "finance",
      type: "BALANCE",
      grain: "CLIENT_PERIOD",
      unitType: "CURRENCY",
      logic: logicId("finance", "accounts-receivable-balance", 1),
      entityTypes: ["INVOICE"],
      inputs: [
        inputReq(
          "openBalance",
          businessLanguageCoreConceptIds.receivable,
          "INVOICE",
          "CURRENCY",
          "CLIENT_PERIOD",
          "SUM",
        ),
      ],
      aggregationRule: "SUM",
    }),
    metric({
      id: businessMetricIds.overdueReceivableBalance,
      concept: businessLanguageCoreConceptIds.overdueInvoice,
      canonicalName: "OVERDUE_RECEIVABLE_BALANCE",
      displayName: "Overdue receivable balance",
      domain: "finance",
      type: "BALANCE",
      grain: "CLIENT_PERIOD",
      unitType: "CURRENCY",
      logic: logicId("finance", "overdue-receivable-balance", 1),
      entityTypes: ["INVOICE"],
      inputs: [
        inputReq(
          "openBalance",
          businessLanguageCoreConceptIds.receivable,
          "INVOICE",
          "CURRENCY",
          "CLIENT_PERIOD",
          "SUM",
        ),
      ],
      aggregationRule: "SUM",
    }),
    metric({
      id: businessMetricIds.dso,
      concept: businessLanguageCoreConceptIds.receivable,
      canonicalName: "DSO",
      displayName: "Days sales outstanding",
      domain: "finance",
      type: "DURATION",
      grain: "WORKSPACE",
      unitType: "DAYS",
      logic: logicId("finance", "dso-flow-default", 1),
      entityTypes: ["INVOICE"],
      inputs: [
        inputReq(
          "averageReceivables",
          businessLanguageCoreConceptIds.receivable,
          "INVOICE",
          "CURRENCY",
          "PERIOD",
          "AVERAGE",
        ),
        inputReq(
          "creditSales",
          businessLanguageCoreConceptIds.revenue,
          "INVOICE",
          "CURRENCY",
          "PERIOD",
          "SUM",
        ),
        inputReq(
          "daysInPeriod",
          businessLanguageCoreConceptIds.timeWindow,
          "INVOICE",
          "DAYS",
          "PERIOD",
        ),
      ],
      aggregationRule: "DO_NOT_AGGREGATE",
      timeSemantics: "PERIOD",
    }),
    metric({
      id: businessMetricIds.employeeCapacityHours,
      concept: businessLanguageCoreConceptIds.capacity,
      canonicalName: "EMPLOYEE_CAPACITY_HOURS",
      displayName: "Employee capacity hours",
      domain: "operations",
      type: "DURATION",
      grain: "EMPLOYEE_PERIOD",
      unitType: "HOURS",
      logic: logicId("projects", "employee-capacity-hours", 1),
      entityTypes: ["EMPLOYEE"],
      inputs: [
        inputReq(
          "weeklyCapacityHours",
          businessLanguageCoreConceptIds.capacity,
          "EMPLOYEE",
          "HOURS",
          "EMPLOYEE_PERIOD",
        ),
      ],
      aggregationRule: "SUM",
      timeSemantics: "PERIOD",
    }),
    metric({
      id: businessMetricIds.employeeAllocatedHours,
      concept: businessLanguageCoreConceptIds.utilization,
      canonicalName: "EMPLOYEE_ALLOCATED_HOURS",
      displayName: "Employee allocated hours",
      domain: "operations",
      type: "DURATION",
      grain: "EMPLOYEE_PERIOD",
      unitType: "HOURS",
      logic: logicId("projects", "employee-allocated-hours", 1),
      entityTypes: ["EMPLOYEE"],
      inputs: [
        inputReq(
          "allocatedHours",
          businessLanguageCoreConceptIds.utilization,
          "EMPLOYEE",
          "HOURS",
          "EMPLOYEE_PERIOD",
        ),
      ],
      aggregationRule: "SUM",
      timeSemantics: "PERIOD",
    }),
    metric({
      id: businessMetricIds.utilizationPercentage,
      concept: businessLanguageCoreConceptIds.utilization,
      canonicalName: "UTILIZATION_PERCENTAGE",
      displayName: "Utilization percentage",
      domain: "operations",
      type: "PERCENTAGE",
      grain: "EMPLOYEE_PERIOD",
      unitType: "PERCENTAGE",
      logic: logicId("projects", "employee-utilization-percentage", 1),
      entityTypes: ["EMPLOYEE"],
      inputs: [
        inputReq(
          "allocatedHours",
          businessLanguageCoreConceptIds.utilization,
          "EMPLOYEE",
          "HOURS",
          "EMPLOYEE_PERIOD",
        ),
        inputReq(
          "weeklyCapacityHours",
          businessLanguageCoreConceptIds.capacity,
          "EMPLOYEE",
          "HOURS",
          "EMPLOYEE_PERIOD",
        ),
      ],
      aggregationRule: "DO_NOT_AGGREGATE",
      zeroHandlingPolicy: "DENOMINATOR_ZERO_UNDEFINED",
      percentageSemantics: "RATIO_TIMES_100",
      timeSemantics: "PERIOD",
      rounding: { mode: "HALF_UP", precision: 2 },
    }),
  ];

export const metricBusinessLogicDefinitionsV1: readonly BusinessLogicDefinition[] =
  [
    logicDefinition(
      "projects",
      "project-revenue",
      "Project revenue passthrough",
      ["projectRevenue"],
      ["projectRevenue"],
    ),
    logicDefinition(
      "projects",
      "project-direct-cost",
      "Project direct cost passthrough",
      ["projectCost"],
      ["projectCost"],
    ),
    logicDefinition(
      "projects",
      "project-margin-percentage",
      "Project margin percentage",
      ["projectRevenue", "projectCost"],
      ["projectMarginPercentage"],
    ),
    logicDefinition(
      "finance",
      "accounts-receivable-balance",
      "Accounts receivable balance",
      ["openBalance"],
      ["accountsReceivableBalance"],
    ),
    logicDefinition(
      "finance",
      "overdue-receivable-balance",
      "Overdue receivable balance",
      ["openBalance"],
      ["overdueReceivableBalance"],
    ),
    logicDefinition(
      "finance",
      "dso-flow-default",
      "Flow default DSO calculation",
      ["averageReceivables", "creditSales", "daysInPeriod"],
      ["daysSalesOutstanding"],
    ),
    logicDefinition(
      "projects",
      "employee-capacity-hours",
      "Employee capacity hours passthrough",
      ["weeklyCapacityHours"],
      ["employeeCapacityHours"],
    ),
    logicDefinition(
      "projects",
      "employee-allocated-hours",
      "Employee allocated hours passthrough",
      ["allocatedHours"],
      ["employeeAllocatedHours"],
    ),
    logicDefinition(
      "projects",
      "employee-utilization-percentage",
      "Employee utilization percentage",
      ["allocatedHours", "weeklyCapacityHours"],
      ["utilizationPercentage"],
    ),
  ];

const metricBusinessLogicExecutorsV1: readonly {
  readonly logicId: SemanticId;
  readonly executor: BusinessLogicExecutor;
}[] = [
  executor("projects", "project-revenue", ({ bundle }) =>
    passthrough(bundle, "projectRevenue"),
  ),
  executor("projects", "project-direct-cost", ({ bundle }) =>
    passthrough(bundle, "projectCost"),
  ),
  executor("projects", "project-margin", ({ bundle }) => {
    const revenue = requiredMoney(bundle, "projectRevenue");
    const cost = requiredMoney(bundle, "projectCost");
    return { status: "CALCULATED", value: revenue.sub(cost).toMoney() };
  }),
  executor("projects", "project-margin-percentage", ({ bundle }) => {
    const revenue = requiredMoney(bundle, "projectRevenue");
    const cost = requiredMoney(bundle, "projectCost");
    if (revenue.isZero()) {
      return {
        status: "UNDEFINED",
        warnings: ["PROJECT_REVENUE_ZERO_PERCENTAGE_UNDEFINED"],
      };
    }
    return {
      status: "CALCULATED",
      value: revenue.sub(cost).percentageOf(revenue, 2),
      explanationFacts: {
        numerator: revenue.sub(cost).toMoney(),
        denominator: revenue.toMoney(),
      },
    };
  }),
  executor("finance", "accounts-receivable-balance", ({ bundle }) => ({
    status: "CALCULATED",
    value: sumMoney(bundle, "openBalance").toMoney(),
  })),
  executor("finance", "overdue-receivable-balance", ({ bundle }) => ({
    status: "CALCULATED",
    value: sumMoney(bundle, "openBalance").toMoney(),
  })),
  executor("finance", "dso-flow-default", ({ bundle }) => {
    const averageReceivables = requiredMoney(bundle, "averageReceivables");
    const creditSales = requiredMoney(bundle, "creditSales");
    const days = requiredNumber(bundle, "daysInPeriod");
    if (creditSales.isZero())
      return {
        status: "UNDEFINED",
        warnings: ["CREDIT_SALES_ZERO_DSO_UNDEFINED"],
      };
    return {
      status: "CALCULATED",
      value: averageReceivables
        .ratioToNumber(creditSales)
        .mulNumber(days)
        .toDecimal(2),
    };
  }),
  executor("projects", "employee-capacity-hours", ({ bundle }) =>
    passthrough(bundle, "weeklyCapacityHours"),
  ),
  executor("projects", "employee-allocated-hours", ({ bundle }) =>
    passthrough(bundle, "allocatedHours"),
  ),
  executor("projects", "employee-utilization-percentage", ({ bundle }) => {
    const allocated = requiredNumber(bundle, "allocatedHours");
    const capacity = requiredNumber(bundle, "weeklyCapacityHours");
    if (capacity === 0) {
      return {
        status: "UNDEFINED",
        warnings: ["CAPACITY_ZERO_UTILIZATION_UNDEFINED"],
      };
    }
    return {
      status: "CALCULATED",
      value: decimalFromNumber((allocated / capacity) * 100).toDecimal(2),
      explanationFacts: {
        numerator: allocated,
        denominator: capacity,
      },
    };
  }),
];

function metric(input: {
  readonly id: SemanticId;
  readonly concept: SemanticId;
  readonly canonicalName: string;
  readonly displayName: string;
  readonly domain: string;
  readonly type: BusinessMetricType;
  readonly grain: BusinessMetricGrain;
  readonly unitType: BusinessMetricUnitType;
  readonly logic: SemanticId;
  readonly entityTypes: readonly BusinessEntityType[];
  readonly inputs: readonly BusinessLogicInputRequirement[];
  readonly aggregationRule: GovernedBusinessMetricDefinition["aggregationRule"];
  readonly zeroHandlingPolicy?: GovernedBusinessMetricDefinition["zeroHandlingPolicy"];
  readonly percentageSemantics?: GovernedBusinessMetricDefinition["percentageSemantics"];
  readonly timeSemantics?: GovernedBusinessMetricDefinition["timeSemantics"];
  readonly rounding?: GovernedBusinessMetricDefinition["roundingPolicy"];
}): GovernedBusinessMetricDefinition {
  const base = {
    metricId: input.id,
    semanticConceptId: input.concept,
    canonicalName: input.canonicalName,
    displayName: input.displayName,
    domain: input.domain,
    metricType: input.type,
    description: `${input.displayName} governed Flow metric definition.`,
    grain: input.grain,
    dimensions: [],
    unitType: input.unitType,
    ...(input.unitType === "CURRENCY"
      ? { currencySemantics: "SINGLE_CURRENCY_REQUIRED" as const }
      : { currencySemantics: "NOT_CURRENCY" as const }),
    ...(input.percentageSemantics
      ? { percentageSemantics: input.percentageSemantics }
      : {}),
    timeSemantics: input.timeSemantics ?? "LIFETIME",
    businessLogicId: input.logic,
    inputRequirements: input.inputs,
    aggregationRule: input.aggregationRule,
    missingDataPolicy: "REQUIRE_ALL_INPUTS" as const,
    zeroHandlingPolicy: input.zeroHandlingPolicy ?? "ZERO_IS_VALID",
    ...(input.rounding ? { roundingPolicy: input.rounding } : {}),
    applicableEntityTypes: input.entityTypes,
    status: "ACTIVE" as const,
    version: "1",
    provenance: ["FLOW_CANONICAL", "TASK_005_GOVERNED_METRIC_SEED"],
  };
  return { ...base, fingerprint: stableFingerprint(base) };
}

function inputReq(
  inputKey: string,
  concept: SemanticId,
  entityType: BusinessEntityType,
  unit: BusinessMetricUnitType,
  grain: BusinessMetricGrain,
  aggregationRule?: GovernedBusinessMetricDefinition["aggregationRule"],
): BusinessLogicInputRequirement {
  return {
    inputKey,
    businessConceptId: concept,
    entityType,
    fieldConcept: concept,
    required: true,
    expectedUnit: unit,
    grain,
    timeAlignment:
      grain.endsWith("PERIOD") || grain === "PERIOD"
        ? "SAME_PERIOD"
        : "LIFETIME",
    ...(aggregationRule ? { aggregationRule } : {}),
    missingDataPolicy: "REQUIRE_ALL_INPUTS",
  };
}

function logicDefinition(
  domain: string,
  name: string,
  description: string,
  inputs: readonly string[],
  outputs: readonly string[],
): BusinessLogicDefinition {
  const base = {
    logicId: logicId(domain, name, 1),
    name,
    description,
    logicType: "CALCULATION" as const,
    domainId: toSemanticId(`flow.concept.${domain}.logic`),
    conceptIds: [toSemanticId(`flow.concept.${domain}.${name}`)],
    scope: { level: "UNIVERSAL" as const },
    version: "1",
    effectiveFrom: "2026-08-13",
    status: "APPROVED" as const,
    inputSchema: inputs.map((item) => ({
      name: item,
      valueType: "NUMBER" as const,
      required: true,
    })),
    outputSchema: outputs.map((item) => ({
      name: item,
      valueType: "NUMBER" as const,
      required: true,
    })),
    implementationType: "DETERMINISTIC_FUNCTION" as const,
    sourceReferences: [
      {
        sourceId: "flow-task-005-metric-routing",
        sourceName: "Flow Task 005 governed metric seed",
        trustLevel: "FLOW_CURATED" as const,
      },
    ],
    provenance: {
      source: "FLOW_CURATED" as const,
      notes: "Task 005 deterministic metric calculation foundation.",
    },
    testCases: [],
    edgeCases: ["Missing input", "Invalid input", "Zero denominator"],
    approvalStatus: "APPROVED_BY_GOVERNANCE" as const,
  };
  return { ...base, fingerprint: stableFingerprint(base) };
}

function metricId(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.decision.metric.${domain}.${name}@1.0.0`);
}

function executor(
  domain: string,
  name: string,
  calculation: BusinessLogicExecutor,
): { readonly logicId: SemanticId; readonly executor: BusinessLogicExecutor } {
  return { logicId: logicId(domain, name, 1), executor: calculation };
}

function passthrough(
  bundle: BusinessCalculationInputBundle,
  key: string,
): ReturnType<BusinessLogicExecutor> {
  const input = bundle.inputs.find((item) => item.inputKey === key);
  return input?.value === undefined
    ? { status: "NEEDS_INFORMATION" }
    : { status: "CALCULATED", value: input.value };
}

function validateBundle(
  metric: GovernedBusinessMetricDefinition,
  bundle: BusinessCalculationInputBundle,
):
  | { readonly status: "OK"; readonly warnings: readonly string[] }
  | {
      readonly status: BusinessCalculationResult["status"];
      readonly warnings: readonly string[];
    } {
  const warnings: string[] = [];
  for (const input of bundle.inputs) {
    if (input.evidence.workspaceId !== bundle.workspaceId) {
      return {
        status: "INVALID_INPUT",
        warnings: ["EVIDENCE_WORKSPACE_MISMATCH"],
      };
    }
    if (!evidenceFingerprintValid(input.evidence)) {
      return {
        status: "INVALID_INPUT",
        warnings: ["EVIDENCE_FINGERPRINT_MISMATCH"],
      };
    }
    const requirement = metric.inputRequirements.find(
      (item) => item.inputKey === input.inputKey,
    );
    if (!requirement) {
      return { status: "INVALID_INPUT", warnings: ["UNEXPECTED_INPUT"] };
    }
    if (input.evidence.entityType !== requirement.entityType) {
      return {
        status: "INVALID_INPUT",
        warnings: ["EVIDENCE_ENTITY_MISMATCH"],
      };
    }
    if (
      bundle.entityRefs.length > 0 &&
      !bundle.entityRefs.some(
        (ref) =>
          ref.workspaceId === input.entityRef.workspaceId &&
          ref.entityType === input.entityRef.entityType &&
          ref.recordId === input.entityRef.recordId,
      ) &&
      metric.aggregationRule === "DO_NOT_AGGREGATE"
    ) {
      return {
        status: "INVALID_INPUT",
        warnings: ["EVIDENCE_ENTITY_MISMATCH"],
      };
    }
    if (input.value === undefined) {
      return { status: "NEEDS_INFORMATION", warnings: ["INPUT_VALUE_MISSING"] };
    }
    if (
      (requirement.expectedUnit === "CURRENCY" ||
        metric.unitType === "CURRENCY") &&
      !bundle.currency
    ) {
      return { status: "NEEDS_INFORMATION", warnings: ["MISSING_CURRENCY"] };
    }
  }
  if (
    new Set(bundle.inputs.map((input) => input.currency).filter(Boolean)).size >
    1
  ) {
    return { status: "INVALID_INPUT", warnings: ["CURRENCY_MISMATCH"] };
  }
  if (
    metric.inputRequirements.some(
      (item) => item.timeAlignment === "SAME_PERIOD",
    )
  ) {
    const periods = [
      ...new Set(
        bundle.inputs
          .map((input) => input.evidence.effectiveAt?.slice(0, 7))
          .filter((item): item is string => Boolean(item)),
      ),
    ];
    if (periods.length > 1) {
      return { status: "INVALID_INPUT", warnings: ["TIME_PERIOD_MISMATCH"] };
    }
  }
  return { status: "OK", warnings };
}

function evidenceFingerprintValid(evidence: BusinessEvidenceItem): boolean {
  const material = {
    workspaceId: evidence.workspaceId,
    recordRef: evidence.recordRef,
    field: evidence.field,
    value: evidence.value,
    queryPlanId: evidence.queryPlanId,
    queryStepId: evidence.queryStepId,
  };
  return evidence.fingerprint === stableFingerprint(material);
}

function failure(
  bundle: BusinessCalculationInputBundle,
  status: BusinessCalculationResult["status"],
  unit: BusinessMetricUnitType,
  warnings: readonly string[],
  metric?: GovernedBusinessMetricDefinition,
  logic?: BusinessLogicDefinition,
): BusinessCalculationResult {
  const resultFingerprint = stableFingerprint({
    bundle: bundle.fingerprint,
    status,
    warnings,
    metric: metric?.metricId ?? bundle.metricId,
    logic: logic?.logicId ?? bundle.logicId,
  });
  return {
    calculationId: `calculation:${resultFingerprint.slice(0, 24)}`,
    workspaceId: bundle.workspaceId,
    metricId: metric?.metricId ?? bundle.metricId,
    metricVersion: metric?.version ?? "unknown",
    logicId: logic?.logicId ?? bundle.logicId,
    logicVersion: logic?.version ?? "unknown",
    entityRefs: bundle.entityRefs,
    ...(bundle.timeRange ? { timeRange: bundle.timeRange } : {}),
    unit,
    ...(bundle.currency ? { currency: bundle.currency } : {}),
    status,
    inputFingerprint: bundle.fingerprint,
    resultFingerprint,
    evidence: bundle.inputs.map((item) => item.evidence),
    missingInputs: bundle.missingInputs,
    warnings,
    calculatedAt,
    provenance: ["TASK_005_DETERMINISTIC_BUSINESS_LOGIC"],
    explanationFacts: { calculationStatus: status },
  };
}

function emptyBundle(
  input: {
    readonly calculationRequestId: string;
    readonly workspaceId: string;
    readonly metricId: SemanticId;
    readonly entityRefs: readonly BusinessRecordRef[];
    readonly evidence: readonly BusinessEvidenceItem[];
    readonly timeRange?: BusinessTimeRange;
  },
  logicIdValue: SemanticId,
): BusinessCalculationInputBundle {
  return {
    calculationRequestId: input.calculationRequestId,
    workspaceId: input.workspaceId,
    metricId: input.metricId,
    logicId: logicIdValue,
    entityRefs: input.entityRefs,
    ...(input.timeRange ? { timeRange: input.timeRange } : {}),
    inputs: [],
    evidenceRefs: [],
    units: {},
    completeness: "INVALID",
    missingInputs: [],
    fingerprint: stableFingerprint(input),
  };
}

function requiredMoney(
  bundle: BusinessCalculationInputBundle,
  key: string,
): FixedDecimal {
  const input = bundle.inputs.find((item) => item.inputKey === key);
  if (!input || input.value === undefined) throw new Error(`Missing ${key}`);
  return FixedDecimal.parse(input.value);
}

function requiredNumber(
  bundle: BusinessCalculationInputBundle,
  key: string,
): number {
  const input = bundle.inputs.find((item) => item.inputKey === key);
  if (!input || input.value === undefined) throw new Error(`Missing ${key}`);
  if (typeof input.value === "boolean")
    throw new Error("Boolean is not numeric.");
  const parsed = Number(input.value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid number.");
  return parsed;
}

function sumMoney(
  bundle: BusinessCalculationInputBundle,
  key: string,
): FixedDecimal {
  return bundle.inputs
    .filter((item) => item.inputKey === key)
    .reduce((total, item) => {
      if (item.value === undefined) return total;
      return total.add(FixedDecimal.parse(item.value));
    }, FixedDecimal.zero());
}

function evidenceValues(
  evidence: readonly BusinessEvidenceItem[],
  field: string,
): readonly BusinessEvidenceItem[] {
  return evidence.filter((item) => item.field === field);
}

function uniqueMetrics(
  metrics: readonly GovernedBusinessMetricDefinition[],
): readonly GovernedBusinessMetricDefinition[] {
  return [
    ...new Map(
      metrics.map((metricItem) => [metricItem.metricId, metricItem]),
    ).values(),
  ];
}

function disambiguateMetric(
  candidates: readonly GovernedBusinessMetricDefinition[],
  phrase: string | undefined,
): GovernedBusinessMetricDefinition | undefined {
  if (candidates.length === 1) return candidates[0];
  const normalized = phrase ? normalizeAlias(phrase) : "";
  if (normalized.includes("percentage") || normalized.includes("percent")) {
    return candidates.find(
      (candidate) => candidate.metricType === "PERCENTAGE",
    );
  }
  if (normalized.includes("amount")) {
    return candidates.find((candidate) => candidate.metricType === "AMOUNT");
  }
  return undefined;
}

function selectionStatus(input: {
  readonly requestedConcepts: readonly SemanticId[];
  readonly candidates: readonly GovernedBusinessMetricDefinition[];
  readonly selected?: GovernedBusinessMetricDefinition;
  readonly preferredMetricId?: SemanticId;
}): MetricSelectionResult["resolutionStatus"] {
  if (input.preferredMetricId && !input.selected) return "UNKNOWN_METRIC";
  if (input.candidates.length === 0) return "UNKNOWN_METRIC";
  if (!input.selected) return "AMBIGUOUS_METRIC";
  if (input.selected.status !== "ACTIVE") return "INACTIVE_METRIC";
  return "SELECTED";
}

function assertionTypeFor(
  normalizedText: string,
): BusinessAssertionVerification["assertionType"] {
  if (normalizedText.includes("unprofitable")) return "PROFITABILITY";
  if (normalizedText.includes("margin")) return "MARGIN";
  return "UNKNOWN";
}

function assertionStatus(input: {
  readonly assertion: BusinessUserAssertion;
  readonly result: BusinessCalculationResult;
  readonly expected?: "NEGATIVE" | "PERCENTAGE_EQUALS";
  readonly assertedValue?: string | number;
}): BusinessAssertionVerification["status"] {
  if (
    input.result.status !== "CALCULATED" ||
    input.result.value === undefined
  ) {
    return "CANNOT_VERIFY";
  }
  const value = Number(input.result.value);
  if (
    input.expected === "PERCENTAGE_EQUALS" &&
    input.assertedValue !== undefined
  ) {
    return Math.abs(value - Number(input.assertedValue)) < 0.0001
      ? "SUPPORTED"
      : "NOT_SUPPORTED";
  }
  if (input.assertion.normalizedText.includes("unprofitable")) {
    return value < 0 ? "SUPPORTED" : "NOT_SUPPORTED";
  }
  return "PARTIALLY_SUPPORTED";
}

function normalizeAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

class FixedDecimal {
  private static readonly scale = 10_000n;

  private constructor(private readonly scaled: bigint) {}

  static zero(): FixedDecimal {
    return new FixedDecimal(0n);
  }

  static parse(value: string | number | boolean): FixedDecimal {
    if (typeof value === "boolean") throw new Error("Boolean is not numeric.");
    const text = String(value);
    if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error("Invalid decimal.");
    const negative = text.startsWith("-");
    const unsigned = negative ? text.slice(1) : text;
    const [whole = "0", fraction = ""] = unsigned.split(".");
    const padded = `${fraction}0000`.slice(0, 4);
    const scaled = BigInt(whole) * FixedDecimal.scale + BigInt(padded);
    return new FixedDecimal(negative ? -scaled : scaled);
  }

  add(other: FixedDecimal): FixedDecimal {
    return new FixedDecimal(this.scaled + other.scaled);
  }

  sub(other: FixedDecimal): FixedDecimal {
    return new FixedDecimal(this.scaled - other.scaled);
  }

  mulNumber(value: number): FixedDecimal {
    return new FixedDecimal(
      (this.scaled * BigInt(Math.round(value * 10_000))) / FixedDecimal.scale,
    );
  }

  ratioToNumber(other: FixedDecimal): FixedDecimal {
    if (other.scaled === 0n) throw new Error("Division by zero.");
    return new FixedDecimal((this.scaled * FixedDecimal.scale) / other.scaled);
  }

  percentageOf(other: FixedDecimal, decimals: number): string {
    if (other.scaled === 0n) throw new Error("Division by zero.");
    return new FixedDecimal(
      (this.scaled * 100n * FixedDecimal.scale) / other.scaled,
    ).toDecimal(decimals);
  }

  isZero(): boolean {
    return this.scaled === 0n;
  }

  toMoney(): string {
    return this.toDecimal(2);
  }

  toDecimal(decimals: number): string {
    const rounded = roundScaled(this.scaled, decimals);
    return formatScaled(rounded, decimals);
  }
}

function decimalFromNumber(value: number): FixedDecimal {
  return FixedDecimal.parse(String(Math.round(value * 10_000) / 10_000));
}

function roundScaled(value: bigint, decimals: number): bigint {
  const divisor = 10n ** BigInt(4 - decimals);
  const half = divisor / 2n;
  return value >= 0n
    ? ((value + half) / divisor) * divisor
    : ((value - half) / divisor) * divisor;
}

function formatScaled(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = 10n ** 4n;
  const whole = absolute / divisor;
  const fractionScale = 10n ** BigInt(4 - decimals);
  const fraction = (absolute % divisor) / fractionScale;
  return `${negative ? "-" : ""}${whole}.${fraction.toString().padStart(decimals, "0")}`;
}
