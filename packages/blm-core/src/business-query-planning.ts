import {
  logicId,
  type BusinessDataProviderCapability,
  type BusinessDataProviderError,
  type BusinessDataQueryOperation,
  type BusinessDataQueryPlan,
  type BusinessDataQueryPlanStatus,
  type BusinessDataQueryStep,
  type BusinessDataReadRequest,
  type BusinessDataRecord,
  type BusinessDataResult,
  type BusinessEvidenceItem,
  type BusinessContextFrame,
  type BusinessMissingInformation,
  type BusinessQueryFilter,
  type BusinessRecordRef,
  type BusinessUserAssertion,
  type GroundedBusinessRequest,
  type RequiredBusinessCalculation,
  type SemanticId,
  type SystemOfRecordClass,
} from "@flow/blm-contracts";
import type { BusinessEntityType } from "@flow/blm-contracts";

import { businessLanguageCoreConceptIds } from "./business-language-foundation.js";
import { InMemoryBusinessLogicRegistry } from "./business-logic-registry.js";
import { stableFingerprint } from "./knowledge-acquisition.js";

const DEFAULT_LIMIT = 50;

export interface BusinessDataProvider {
  readonly providerId: string;
  readonly sourceSystem: string;
  readonly capabilities: readonly BusinessDataProviderCapability[];
  canHandle(request: BusinessDataReadRequest): boolean;
  executeRead(request: BusinessDataReadRequest): BusinessDataResult;
}

export interface BusinessDataProviderRecord {
  readonly recordRef: BusinessRecordRef;
  readonly fields: Readonly<Record<string, string | number | boolean>>;
  readonly relationships?: readonly {
    readonly relationship: string;
    readonly targetRef: BusinessRecordRef;
  }[];
  readonly requiredPermissions: readonly string[];
  readonly sourceSystem: string;
  readonly systemOfRecordClass: SystemOfRecordClass;
  readonly effectiveAt?: string;
  readonly dataQuality?: Readonly<
    Record<string, BusinessEvidenceItem["dataQuality"]>
  >;
}

export class BusinessDataProviderRegistry {
  private readonly providers = new Map<string, BusinessDataProvider>();

  register(provider: BusinessDataProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  findProvider(input: {
    readonly entityType: BusinessEntityType;
    readonly operation: BusinessDataQueryOperation;
  }): BusinessDataProvider | undefined {
    return [...this.providers.values()].find((provider) =>
      provider.capabilities.some(
        (capability) =>
          capability.entityType === input.entityType &&
          capability.operations.includes(input.operation),
      ),
    );
  }

  getProvider(providerId: string): BusinessDataProvider | undefined {
    return this.providers.get(providerId);
  }
}

export class InMemoryBusinessDataProvider implements BusinessDataProvider {
  constructor(
    readonly providerId: string,
    readonly sourceSystem: string,
    readonly capabilities: readonly BusinessDataProviderCapability[],
    private readonly records: readonly BusinessDataProviderRecord[],
    private readonly observedAt = "2026-08-13T00:00:00.000Z",
  ) {}

  canHandle(request: BusinessDataReadRequest): boolean {
    return this.capabilities.some(
      (capability) =>
        capability.entityType === request.entityType &&
        capability.operations.includes(request.operation),
    );
  }

  executeRead(request: BusinessDataReadRequest): BusinessDataResult {
    if (!this.canHandle(request)) {
      return result({
        queryPlanId: request.planId,
        actorPermissions: request.actorContext.permissionIds ?? [],
        workspaceId: request.workspaceId,
        records: [],
        evidence: [],
        sourceSummary: [],
        errors: [
          {
            code: "CAPABILITY_UNSUPPORTED",
            detail: "Provider does not support the requested read capability.",
            queryStepId: request.queryStepId,
            providerId: this.providerId,
          },
        ],
        missingData: [],
        status: "UNSUPPORTED",
      });
    }
    const candidateRecords = this.records
      .filter(
        (recordItem) =>
          recordItem.recordRef.workspaceId === request.workspaceId,
      )
      .filter(
        (recordItem) => recordItem.recordRef.entityType === request.entityType,
      )
      .filter((recordItem) => isAuthorized(recordItem, request))
      .filter((recordItem) => matchesRefs(recordItem, request.recordRefs))
      .filter((recordItem) => matchesRelationship(recordItem, request))
      .filter((recordItem) => matchesFilters(recordItem, request.filters))
      .slice(0, request.limit);
    const evidence = candidateRecords.flatMap((recordItem) =>
      evidenceForRecord({
        record: recordItem,
        request,
        providerId: this.providerId,
        sourceSystem: this.sourceSystem,
        observedAt: this.observedAt,
      }),
    );
    const records = candidateRecords.map((recordItem): BusinessDataRecord => ({
      recordRef: recordItem.recordRef,
      fields: projectFields(recordItem.fields, request.projection),
      evidenceIds: evidence
        .filter(
          (item) => item.recordRef.recordId === recordItem.recordRef.recordId,
        )
        .map((item) => item.evidenceId),
      sourceProvider: this.providerId,
      systemOfRecordClass: recordItem.systemOfRecordClass,
    }));
    return result({
      queryPlanId: request.planId,
      actorPermissions: request.actorContext.permissionIds ?? [],
      workspaceId: request.workspaceId,
      records,
      evidence,
      sourceSummary: uniqueSourceSummary(
        records,
        this.providerId,
        this.sourceSystem,
      ),
      errors: [],
      missingData: missingProjectionData(candidateRecords, request.projection),
      status: "SUCCESS",
    });
  }
}

export class BusinessQueryPlanner {
  constructor(
    private readonly providerRegistry: BusinessDataProviderRegistry,
    private readonly logicRegistry = new InMemoryBusinessLogicRegistry(),
    private readonly createdAt = "2026-08-13T00:00:00.000Z",
  ) {}

  plan(input: {
    readonly request: GroundedBusinessRequest;
    readonly contextFrame: BusinessContextFrame;
  }): BusinessDataQueryPlan {
    const { request, contextFrame } = input;
    const unresolvedInputs = effectiveMissingInformation(request);
    const steps: BusinessDataQueryStep[] = [];
    const calculations: RequiredBusinessCalculation[] = [];
    const assertionNeeds = request.userAssertions.map((assertion) =>
      assertionVerificationNeed(assertion),
    );
    const statusFromGrounding = statusFromGroundedRequest(request);
    if (statusFromGrounding !== "READY") {
      return this.buildPlan({
        request,
        contextFrame,
        steps,
        calculations,
        assertionNeeds,
        unresolvedInputs,
        status: statusFromGrounding,
        resultShape: "EVIDENCE_ONLY",
      });
    }

    if (isOverdueInvoiceRequest(request)) {
      const clientRef = selectedRef(request, "CLIENT");
      if (clientRef) {
        steps.push(
          this.step({
            request,
            operation: "RELATED_RECORDS",
            entityType: "INVOICE",
            inputRefs: [clientRef],
            filters: overdueInvoiceFilters(request),
            projection: [
              "invoiceNumber",
              "status",
              "dueDate",
              "openBalance",
              "currency",
              "clientId",
            ],
            relationship: {
              from: "CLIENT",
              to: "INVOICE",
              relationship: "CLIENT_INVOICES",
              bounded: true,
            },
            expectedOutput: "RECORDS",
            capability: "finance.invoice.read",
          }),
        );
      }
    } else if (isProjectMarginRequest(request)) {
      const projectRef = selectedRef(request, "PROJECT");
      if (projectRef) {
        const step = this.step({
          request,
          operation: "GET_BY_REF",
          entityType: "PROJECT",
          inputRefs: [projectRef],
          filters: [],
          projection: ["projectRevenue", "projectCost", "currency"],
          expectedOutput: "EVIDENCE",
          capability: "project.financials.read",
        });
        steps.push(step);
        calculations.push(this.projectMarginCalculation(step.stepId));
      }
    } else if (isAvailabilityRequest(request)) {
      steps.push(
        this.step({
          request,
          operation: "LIST",
          entityType: "EMPLOYEE",
          inputRefs: [],
          filters: request.filters,
          projection: [
            "displayName",
            "weeklyCapacityHours",
            "allocatedHours",
            "leaveHours",
          ],
          expectedOutput: "EVIDENCE",
          capability: "hr.capacity.read",
        }),
      );
      unresolvedInputs.push({
        code: "MISSING_METRIC_DEFINITION",
        detail:
          "Workspace-specific definition of 'free' capacity is required before ranking employees.",
      });
    } else if (isActionSupportRequest(request)) {
      for (const target of request.actionProposalIntent?.targetRefs ?? []) {
        steps.push(
          this.step({
            request,
            operation: "GET_BY_REF",
            entityType: target.entityType,
            inputRefs: [target],
            filters: [],
            projection: [
              "status",
              "recipientId",
              "recipientEmail",
              "openBalance",
              "currency",
            ],
            expectedOutput: "EVIDENCE",
            capability: capabilityFor(target.entityType),
          }),
        );
      }
    } else if (request.userAssertions.length > 0) {
      const clientRef = selectedRef(request, "CLIENT");
      if (clientRef) {
        const step = this.step({
          request,
          operation: "RELATED_RECORDS",
          entityType: "PROJECT",
          inputRefs: [clientRef],
          filters: [],
          projection: ["projectRevenue", "projectCost", "currency", "clientId"],
          relationship: {
            from: "CLIENT",
            to: "PROJECT",
            relationship: "CLIENT_PROJECTS",
            bounded: true,
          },
          expectedOutput: "EVIDENCE",
          capability: "project.financials.read",
        });
        steps.push(step);
        calculations.push(this.projectMarginCalculation(step.stepId));
      }
    } else if (request.queryIntent?.targetEntityType) {
      steps.push(
        this.step({
          request,
          operation: "LIST",
          entityType: request.queryIntent.targetEntityType,
          inputRefs: request.queryIntent.targetRefs,
          filters: request.filters,
          projection: ["displayLabel"],
          expectedOutput: "RECORDS",
          capability: capabilityFor(request.queryIntent.targetEntityType),
        }),
      );
    }

    const status = planStatus(steps, unresolvedInputs);
    return this.buildPlan({
      request,
      contextFrame,
      steps,
      calculations,
      assertionNeeds,
      unresolvedInputs,
      status,
      resultShape:
        calculations.length > 0 ? "CALCULATION_INPUTS" : "RECORD_SET",
    });
  }

  private step(input: {
    readonly request: GroundedBusinessRequest;
    readonly operation: BusinessDataQueryOperation;
    readonly entityType: BusinessEntityType;
    readonly inputRefs: readonly BusinessRecordRef[];
    readonly filters: readonly BusinessQueryFilter[];
    readonly projection: readonly string[];
    readonly expectedOutput: BusinessDataQueryStep["expectedOutput"];
    readonly capability: string;
    readonly relationship?: BusinessDataQueryStep["relationshipTraversal"];
  }): BusinessDataQueryStep {
    const provider = this.providerRegistry.findProvider({
      entityType: input.entityType,
      operation: input.operation,
    });
    const capability = provider?.capabilities.find(
      (candidate) =>
        candidate.entityType === input.entityType &&
        candidate.operations.includes(input.operation),
    );
    const material = {
      operation: input.operation,
      entityType: input.entityType,
      inputRefs: input.inputRefs,
      filters: input.filters,
      projection: input.projection,
      relationship: input.relationship,
      sourceIntentFingerprint: input.request.intent.fingerprint,
    };
    return {
      stepId: `step:${stableFingerprint(material).slice(0, 24)}`,
      operation: input.operation,
      targetEntityType: input.entityType,
      providerCapability: capability?.capabilityId ?? input.capability,
      inputRefs: input.inputRefs,
      filters: input.filters,
      projection: input.projection,
      ordering: [],
      grouping: [],
      limit: DEFAULT_LIMIT,
      ...(input.request.timeRange
        ? { timeRange: input.request.timeRange }
        : {}),
      requiredPermissions: capability?.requiredPermissions ?? [
        input.capability,
      ],
      dependencies: [],
      expectedOutput: input.expectedOutput,
      evidencePolicy: "REQUIRED",
      ...(input.relationship
        ? { relationshipTraversal: input.relationship }
        : {}),
      parallelizable: true,
    };
  }

  private projectMarginCalculation(
    stepId: string,
  ): RequiredBusinessCalculation {
    const resolved = this.logicRegistry.resolve({
      conceptIds: [toProjectMarginLogicConcept()],
      logicType: "CALCULATION",
      asOf: "2026-08-13",
    });
    return {
      logicId:
        resolved.logic?.logicId ?? logicId("projects", "project-margin", 1),
      metricId: businessLanguageCoreConceptIds.projectMargin,
      inputEvidenceRequirements: [
        {
          field: "projectRevenue",
          entityType: "PROJECT",
          sourceStepId: stepId,
        },
        { field: "projectCost", entityType: "PROJECT", sourceStepId: stepId },
      ],
      parameterBindings: {
        projectRevenue: "projectRevenue",
        projectCost: "projectCost",
      },
      reason:
        "Project margin requires governed deterministic calculation over revenue and cost evidence.",
    };
  }

  private buildPlan(input: {
    readonly request: GroundedBusinessRequest;
    readonly contextFrame: BusinessContextFrame;
    readonly steps: readonly BusinessDataQueryStep[];
    readonly calculations: readonly RequiredBusinessCalculation[];
    readonly assertionNeeds: readonly ReturnType<
      typeof assertionVerificationNeed
    >[];
    readonly unresolvedInputs: readonly BusinessMissingInformation[];
    readonly status: BusinessDataQueryPlanStatus;
    readonly resultShape: BusinessDataQueryPlan["resultShape"];
  }): BusinessDataQueryPlan {
    const authorizationRequirements = input.steps.map((step) => ({
      entityType: step.targetEntityType,
      operation: step.operation,
      requiredPermissions: step.requiredPermissions,
      workspaceId: input.request.workspaceId,
    }));
    const fingerprintInput = {
      workspaceId: input.request.workspaceId,
      actorScope:
        input.request.intent.sideEffectClass === "READ_ONLY"
          ? input.request.intent.fingerprint
          : input.request.fingerprint,
      sourceIntentFingerprint: input.request.intent.fingerprint,
      targetEntityTypes: input.request.intent.targetEntityTypes,
      steps: input.steps,
      calculations: input.calculations,
      unresolvedInputs: input.unresolvedInputs,
      quantities: input.request.quantities,
      timeRange: input.request.timeRange,
      status: input.status,
    };
    return {
      planId: `plan:${stableFingerprint(fingerprintInput).slice(0, 24)}`,
      workspaceId: input.request.workspaceId,
      actorContext: input.contextFrame,
      sourceIntentFingerprint: input.request.intent.fingerprint,
      purpose: input.request.intent.requestedOutcome,
      targetEntityTypes: input.request.intent.targetEntityTypes,
      steps: input.steps,
      requestedEvidence: input.steps.flatMap((step) => step.projection),
      requiredMetrics: input.request.intent.requestedMetrics,
      requiredCalculations: input.calculations,
      assertionVerificationNeeds: input.assertionNeeds,
      ...(input.request.timeRange
        ? { timeContext: input.request.timeRange }
        : {}),
      quantityContext: input.request.quantities,
      assumptions: input.request.intent.assumptions,
      unresolvedInputs: dedupeMissing(input.unresolvedInputs),
      authorizationRequirements,
      resultShape: input.resultShape,
      executionPolicy:
        input.status === "READY" || input.status === "PARTIALLY_READY"
          ? "READ_ONLY"
          : "NO_EXECUTION",
      status: input.status,
      fingerprint: stableFingerprint(fingerprintInput),
      createdAt: this.createdAt,
    };
  }
}

export class BusinessQueryExecutor {
  constructor(
    private readonly providerRegistry: BusinessDataProviderRegistry,
  ) {}

  execute(plan: BusinessDataQueryPlan): BusinessDataResult {
    if (plan.executionPolicy !== "READ_ONLY") {
      return result({
        queryPlanId: plan.planId,
        workspaceId: plan.workspaceId,
        actorPermissions: plan.actorContext.permissionIds ?? [],
        records: [],
        evidence: [],
        sourceSummary: [],
        errors: [],
        missingData: plan.unresolvedInputs,
        status: "NEEDS_INFORMATION",
      });
    }
    const results = plan.steps.map((step) => {
      const provider = this.providerRegistry.findProvider({
        entityType: step.targetEntityType,
        operation: step.operation,
      });
      if (!provider) {
        return result({
          queryPlanId: plan.planId,
          workspaceId: plan.workspaceId,
          actorPermissions: plan.actorContext.permissionIds ?? [],
          records: [],
          evidence: [],
          sourceSummary: [],
          errors: [
            {
              code: "PROVIDER_NOT_AVAILABLE",
              detail: "No registered provider can execute this query step.",
              queryStepId: step.stepId,
            },
          ],
          missingData: [],
          status: "UNSUPPORTED",
        });
      }
      return provider.executeRead({
        requestId: `read:${step.stepId}`,
        workspaceId: plan.workspaceId,
        actorContext: plan.actorContext,
        entityType: step.targetEntityType,
        operation: step.operation,
        recordRefs: step.inputRefs,
        filters: step.filters,
        projection: step.projection,
        sort: step.ordering,
        limit: step.limit,
        ...(step.timeRange ? { timeRange: step.timeRange } : {}),
        ...(step.relationshipTraversal
          ? { relationshipTraversal: step.relationshipTraversal }
          : {}),
        evidenceRequirements: step.projection,
        planId: plan.planId,
        queryStepId: step.stepId,
      });
    });
    return combineResults(plan, results);
  }
}

function statusFromGroundedRequest(
  request: GroundedBusinessRequest,
): BusinessDataQueryPlanStatus {
  const unresolvedInputs = effectiveMissingInformation(request);
  if (
    request.resolutionStatus === "AMBIGUOUS" &&
    !hasResolvedProjectMarginContext(request)
  ) {
    return "NEEDS_INFORMATION";
  }
  if (
    unresolvedInputs.some((item) =>
      [
        "MISSING_ENTITY_IDENTITY",
        "MISSING_TARGET_OBJECT",
        "MISSING_CURRENCY",
      ].includes(item.code),
    ) &&
    !isActionSupportRequest(request)
  ) {
    return "NEEDS_INFORMATION";
  }
  if (
    request.intent.sideEffectClass === "PROPOSE_ACTION" &&
    !isActionSupportRequest(request)
  ) {
    return "NEEDS_INFORMATION";
  }
  return "READY";
}

function hasResolvedProjectMarginContext(
  request: GroundedBusinessRequest,
): boolean {
  return (
    request.concepts.includes(businessLanguageCoreConceptIds.projectMargin) &&
    selectedRef(request, "PROJECT") !== undefined
  );
}

function effectiveMissingInformation(
  request: GroundedBusinessRequest,
): BusinessMissingInformation[] {
  const hasSelectedEntity = request.resolvedEntities.some(
    (resolution) => resolution.selectedEntity,
  );
  if (!hasSelectedEntity) return [...request.missingInformation];
  return request.missingInformation.filter(
    (item) => item.code !== "MISSING_ENTITY_IDENTITY",
  );
}

function planStatus(
  steps: readonly BusinessDataQueryStep[],
  unresolvedInputs: readonly BusinessMissingInformation[],
): BusinessDataQueryPlanStatus {
  if (
    unresolvedInputs.some((item) =>
      [
        "MISSING_ENTITY_IDENTITY",
        "MISSING_TARGET_OBJECT",
        "MISSING_CURRENCY",
      ].includes(item.code),
    )
  ) {
    return "NEEDS_INFORMATION";
  }
  if (steps.length === 0) return "UNSUPPORTED";
  if (unresolvedInputs.length > 0) return "PARTIALLY_READY";
  return "READY";
}

function isOverdueInvoiceRequest(request: GroundedBusinessRequest): boolean {
  return (
    request.intent.intentClass === "READ" &&
    request.filters.some(
      (filter) =>
        filter.operator === "IS_OVERDUE" ||
        filter.fieldConceptRef ===
          businessLanguageCoreConceptIds.overdueInvoice,
    )
  );
}

function isProjectMarginRequest(request: GroundedBusinessRequest): boolean {
  return request.concepts.includes(
    businessLanguageCoreConceptIds.projectMargin,
  );
}

function isAvailabilityRequest(request: GroundedBusinessRequest): boolean {
  return (
    request.concepts.includes(businessLanguageCoreConceptIds.availability) ||
    request.concepts.includes(businessLanguageCoreConceptIds.capacity)
  );
}

function isActionSupportRequest(request: GroundedBusinessRequest): boolean {
  return (
    request.intent.sideEffectClass === "PROPOSE_ACTION" &&
    (request.actionProposalIntent?.targetRefs.length ?? 0) > 0
  );
}

function selectedRef(
  request: GroundedBusinessRequest,
  entityType: BusinessEntityType,
): BusinessRecordRef | undefined {
  return request.resolvedEntities.find(
    (resolution) =>
      resolution.selectedEntity?.recordRef.entityType === entityType ||
      (entityType === "CLIENT" &&
        resolution.selectedEntity?.recordRef.entityType === "CUSTOMER"),
  )?.selectedEntity?.recordRef;
}

function overdueInvoiceFilters(
  request: GroundedBusinessRequest,
): readonly BusinessQueryFilter[] {
  return [
    ...request.filters,
    {
      fieldConceptRef: businessLanguageCoreConceptIds.receivable,
      operator: "GREATER_THAN",
      value: 0,
    },
    {
      fieldConceptRef: businessLanguageCoreConceptIds.invoice,
      operator: "BEFORE",
      value: request.timeRange?.relativeTo.slice(0, 10) ?? "2026-08-13",
    },
  ];
}

function capabilityFor(entityType: BusinessEntityType): string {
  switch (entityType) {
    case "CLIENT":
    case "CUSTOMER":
    case "CONTACT":
      return "crm.record.read";
    case "PROJECT":
      return "project.record.read";
    case "INVOICE":
    case "PAYMENT":
      return "finance.invoice.read";
    case "EMPLOYEE":
    case "TEAM":
      return "hr.capacity.read";
    default:
      return "business.record.read";
  }
}

function assertionVerificationNeed(assertion: BusinessUserAssertion) {
  const calculation = {
    logicId: logicId("projects", "project-margin", 1),
    metricId: businessLanguageCoreConceptIds.projectMargin,
    inputEvidenceRequirements: [
      {
        field: "projectRevenue",
        entityType: "PROJECT" as const,
        sourceStepId: "planned-project-financials",
      },
      {
        field: "projectCost",
        entityType: "PROJECT" as const,
        sourceStepId: "planned-project-financials",
      },
    ],
    parameterBindings: {
      projectRevenue: "projectRevenue",
      projectCost: "projectCost",
    },
    reason:
      "Profitability assertion requires deterministic margin/profitability calculation over evidence.",
  };
  return {
    assertionFingerprint: stableFingerprint(assertion),
    assertion,
    requiredEvidence: ["revenue", "cost", "margin/profitability inputs"],
    requiredCalculation: calculation,
  };
}

function toProjectMarginLogicConcept(): SemanticId {
  return "flow.concept.project.project-margin" as SemanticId;
}

function isAuthorized(
  record: BusinessDataProviderRecord,
  request: BusinessDataReadRequest,
): boolean {
  const permissions = request.actorContext.permissionIds ?? [];
  return record.requiredPermissions.every((permission) =>
    permissions.includes(permission),
  );
}

function matchesRefs(
  record: BusinessDataProviderRecord,
  refs: readonly BusinessRecordRef[],
): boolean {
  if (refs.length === 0) return true;
  if (refs.some((ref) => ref.entityType === record.recordRef.entityType)) {
    return refs.some(
      (ref) =>
        ref.workspaceId === record.recordRef.workspaceId &&
        ref.entityType === record.recordRef.entityType &&
        ref.recordId === record.recordRef.recordId,
    );
  }
  return true;
}

function matchesRelationship(
  record: BusinessDataProviderRecord,
  request: BusinessDataReadRequest,
): boolean {
  if (!request.relationshipTraversal) return true;
  return request.recordRefs.some((inputRef) =>
    record.relationships?.some(
      (relationship) =>
        relationship.relationship ===
          request.relationshipTraversal?.relationship &&
        relationship.targetRef.workspaceId === inputRef.workspaceId &&
        relationship.targetRef.entityType === inputRef.entityType &&
        relationship.targetRef.recordId === inputRef.recordId,
    ),
  );
}

function matchesFilters(
  record: BusinessDataProviderRecord,
  filters: readonly BusinessQueryFilter[],
): boolean {
  return filters.every((filter) => {
    if (filter.operator === "IS_OVERDUE") {
      return (
        record.fields.status === "OPEN" &&
        Number(record.fields.openBalance ?? 0) > 0
      );
    }
    if (
      filter.fieldConceptRef === businessLanguageCoreConceptIds.receivable &&
      filter.operator === "GREATER_THAN"
    ) {
      return Number(record.fields.openBalance ?? 0) > Number(filter.value ?? 0);
    }
    if (
      filter.fieldConceptRef === businessLanguageCoreConceptIds.invoice &&
      filter.operator === "BEFORE" &&
      typeof record.fields.dueDate === "string" &&
      typeof filter.value === "string"
    ) {
      return record.fields.dueDate < filter.value;
    }
    if (filter.operator === "BETWEEN") return true;
    if (filter.operator === "CONTAINS") return true;
    return true;
  });
}

function evidenceForRecord(input: {
  readonly record: BusinessDataProviderRecord;
  readonly request: BusinessDataReadRequest;
  readonly providerId: string;
  readonly sourceSystem: string;
  readonly observedAt: string;
}): readonly BusinessEvidenceItem[] {
  return Object.entries(
    projectFields(input.record.fields, input.request.projection),
  ).map(([field, value]) => {
    const material = {
      workspaceId: input.request.workspaceId,
      recordRef: input.record.recordRef,
      field,
      value,
      queryPlanId: input.request.planId,
      queryStepId: input.request.queryStepId,
    };
    return {
      evidenceId: `evidence:${stableFingerprint(material).slice(0, 24)}`,
      workspaceId: input.request.workspaceId,
      entityType: input.record.recordRef.entityType,
      recordRef: input.record.recordRef,
      field,
      value,
      sourceProvider: input.providerId,
      sourceSystem: input.sourceSystem,
      systemOfRecordClass: input.record.systemOfRecordClass,
      observedAt: input.observedAt,
      ...(input.record.effectiveAt
        ? { effectiveAt: input.record.effectiveAt }
        : {}),
      provenance: [
        `provider:${input.providerId}`,
        `source-system:${input.sourceSystem}`,
        `query-plan:${input.request.planId}`,
        `query-step:${input.request.queryStepId}`,
      ],
      authorityClass:
        input.record.systemOfRecordClass === "FLOW_AUTHORITATIVE"
          ? "AUTHORITATIVE_RECORD"
          : "EXTERNAL_RECORD",
      confidence: 1,
      queryPlanId: input.request.planId,
      queryStepId: input.request.queryStepId,
      dataQuality: input.record.dataQuality?.[field] ?? "OK",
      fingerprint: stableFingerprint(material),
    };
  });
}

function projectFields(
  fields: Readonly<Record<string, string | number | boolean>>,
  projection: readonly string[],
): Readonly<Record<string, string | number | boolean>> {
  if (projection.length === 0) return fields;
  return Object.fromEntries(
    Object.entries(fields).filter(([field]) => projection.includes(field)),
  );
}

function missingProjectionData(
  records: readonly BusinessDataProviderRecord[],
  projection: readonly string[],
): readonly BusinessMissingInformation[] {
  return records.flatMap((record) =>
    projection
      .filter((field) => record.fields[field] === undefined)
      .map((field) => ({
        code: "INSUFFICIENT_CONTEXT" as const,
        detail: `Required field '${field}' is missing for ${record.recordRef.entityType}:${record.recordRef.recordId}.`,
      })),
  );
}

function uniqueSourceSummary(
  records: readonly BusinessDataRecord[],
  providerId: string,
  sourceSystem: string,
) {
  const classes = [
    ...new Set(records.map((record) => record.systemOfRecordClass)),
  ];
  return classes.map((systemOfRecordClass) => ({
    providerId,
    sourceSystem,
    systemOfRecordClass,
  }));
}

function combineResults(
  plan: BusinessDataQueryPlan,
  results: readonly BusinessDataResult[],
): BusinessDataResult {
  const records = results.flatMap((item) => item.records);
  const evidence = results.flatMap((item) => item.evidence);
  const errors = results.flatMap((item) => item.errors);
  const missingData = results.flatMap((item) => item.missingData);
  return result({
    queryPlanId: plan.planId,
    workspaceId: plan.workspaceId,
    actorPermissions: plan.actorContext.permissionIds ?? [],
    records,
    evidence,
    sourceSummary: results.flatMap((item) => item.sourceSummary),
    errors,
    missingData,
    status:
      errors.length > 0
        ? "PARTIAL"
        : missingData.length > 0
          ? "PARTIAL"
          : "SUCCESS",
  });
}

function result(input: {
  readonly queryPlanId: string;
  readonly workspaceId: string;
  readonly actorPermissions: readonly string[];
  readonly records: readonly BusinessDataRecord[];
  readonly evidence: readonly BusinessEvidenceItem[];
  readonly sourceSummary: BusinessDataResult["sourceSummary"];
  readonly errors: readonly BusinessDataProviderError[];
  readonly missingData: readonly BusinessMissingInformation[];
  readonly status: BusinessDataResult["status"];
}): BusinessDataResult {
  const fingerprintInput = {
    queryPlanId: input.queryPlanId,
    records: input.records.map((record) => record.recordRef),
    evidence: input.evidence.map((item) => item.fingerprint).sort(),
    errors: input.errors,
    missingData: input.missingData,
    status: input.status,
  };
  return {
    queryPlanId: input.queryPlanId,
    status: input.status,
    records: input.records,
    evidence: input.evidence,
    counts: {
      records: input.records.length,
      evidence: input.evidence.length,
    },
    missingData: input.missingData,
    warnings: [],
    errors: input.errors,
    authorizationSummary: {
      workspaceId: input.workspaceId,
      actorPermissionScope: input.actorPermissions,
      returnedRecordCount: input.records.length,
    },
    sourceSummary: input.sourceSummary,
    fingerprint: stableFingerprint(fingerprintInput),
  };
}

function dedupeMissing(
  items: readonly BusinessMissingInformation[],
): readonly BusinessMissingInformation[] {
  return [
    ...new Map(
      items.map((item) => [`${item.code}:${item.detail}`, item]),
    ).values(),
  ];
}
