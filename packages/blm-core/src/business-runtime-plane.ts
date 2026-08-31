import {
  blmExpandedDomainIdsV1,
  logicId,
  type ERPCapabilityId,
  type SkillRelease,
  type WorkspaceExpertiseInstallation,
  type WorkspaceSkillInstallation,
  type BusinessLogicDefinition,
  type SemanticId,
} from "@flow/blm-contracts";
import type { ActorContext } from "@flow/contracts";

import type { RequiredCalculation } from "./business-reasoning-runtime.js";
import { InMemoryBusinessLogicRegistry } from "./business-logic-registry.js";
import { BusinessSkillRegistry } from "./business-skill-registry.js";
import { stableFingerprint } from "./knowledge-acquisition.js";

export type BusinessRequestSource =
  | "VOICE"
  | "TEXT"
  | "ERP_UI"
  | "FORM"
  | "DOCUMENT"
  | "API"
  | "AUTOMATION"
  | "IMPORT"
  | "EXTERNAL_ERP";

export type BusinessRequestClass =
  | "DIRECT_READ"
  | "BUSINESS_REASONING"
  | "DETERMINISTIC_CALCULATION"
  | "COMMAND"
  | "DOCUMENT_PROCESSING"
  | "ANALYTICS_QUERY"
  | "LONG_RUNNING_WORKFLOW"
  | "BULK_IMPORT"
  | "SYSTEM";

export type BusinessExecutionLane =
  | "FAST_SYNC"
  | "MODEL_SYNC"
  | "COMPUTE_SYNC"
  | "ACTION_GATED"
  | "ASYNC_BACKGROUND"
  | "ANALYTICS"
  | "DURABLE_WORKFLOW_FUTURE";

export type BusinessRequestPriority =
  | "CRITICAL_SYSTEM"
  | "INTERACTIVE"
  | "NORMAL"
  | "AUTOMATION"
  | "BULK"
  | "BACKGROUND";

export type BusinessRuntimeCostClass =
  "TINY" | "SMALL" | "MEDIUM" | "EXPENSIVE" | "EXTERNAL";

export interface BusinessRequestBudget {
  readonly deadlineMs: number;
  readonly maxRecords: number;
  readonly maxLogicNodes: number;
  readonly maxContextItems: number;
  readonly maxModelCalls: number;
  readonly maxExternalCalls: number;
  readonly maxOutputBytes: number;
  readonly allowQueue: boolean;
  readonly maxQueueWaitMs: number;
}

export interface UnifiedBusinessRequest {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly actor: ActorContext;
  readonly source: BusinessRequestSource;
  readonly requestType: BusinessRequestClass;
  readonly intent: string;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
  readonly recordReferences: readonly string[];
  readonly contextFingerprint?: string;
  readonly requestedAt: string;
  readonly deadline?: string;
  readonly priority: BusinessRequestPriority;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly budget: BusinessRequestBudget;
}

export interface BusinessRequestExecutionPlan {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly requestClass: BusinessRequestClass;
  readonly executionLane: BusinessExecutionLane;
  readonly runtimeSliceIds: readonly string[];
  readonly requiresAuthorization: boolean;
  readonly requiresContextCompiler: boolean;
  readonly requiresModel: boolean;
  readonly requiresDeterministicEngine: boolean;
  readonly requiresActionWall: boolean;
  readonly requiresAsyncExecution: boolean;
  readonly requiresDurableWorkflow: boolean;
  readonly estimatedCostClass: BusinessRuntimeCostClass;
  readonly deadline?: string;
  readonly priority: BusinessRequestPriority;
}

export interface WorkspaceRuntimeCompilerInput {
  readonly workspaceId: string;
  readonly runtimeVersion: string;
  readonly businessType: string;
  readonly industry: string;
  readonly jurisdiction: string;
  readonly currency: string;
  readonly enabledDomainIds: readonly SemanticId[];
  readonly enabledModuleIds: readonly string[];
  readonly dataProviderCapabilities: readonly string[];
  readonly externalSystemCapabilities: readonly string[];
  readonly localExecutionCapabilities: readonly string[];
  readonly authorizationPolicyReferences: readonly string[];
  readonly knowledgeReleaseId: string;
  readonly compiledAt: string;
  readonly installedSkills?: readonly WorkspaceSkillInstallation[];
  readonly installedExpertise?: readonly WorkspaceExpertiseInstallation[];
  readonly availableERPCapabilityIds?: readonly ERPCapabilityId[];
  readonly workspacePolicyIds?: readonly string[];
}

export interface WorkspaceRuntimeSlice {
  readonly sliceId: string;
  readonly workspaceId: string;
  readonly domainId: SemanticId;
  readonly logicIds: readonly SemanticId[];
  readonly skillIds: readonly SemanticId[];
  readonly dependencySliceIds: readonly string[];
  readonly capabilityReferences: readonly string[];
  readonly fingerprint: string;
}

export interface CompiledWorkspaceRuntimeManifest {
  readonly runtimeId: string;
  readonly workspaceId: string;
  readonly runtimeVersion: string;
  readonly businessType: string;
  readonly industry: string;
  readonly jurisdiction: string;
  readonly currency: string;
  readonly enabledDomainIds: readonly SemanticId[];
  readonly enabledModuleIds: readonly string[];
  readonly availableLogicIds: readonly SemanticId[];
  readonly availableSkillIds: readonly SemanticId[];
  readonly logicVersions: Readonly<Record<string, string>>;
  readonly logicFingerprints: Readonly<Record<string, string>>;
  readonly skillVersions: Readonly<Record<string, string>>;
  readonly skillFingerprints: Readonly<Record<string, string>>;
  readonly runtimeSliceIndex: readonly WorkspaceRuntimeSlice[];
  readonly dataProviderCapabilities: readonly string[];
  readonly externalSystemCapabilities: readonly string[];
  readonly localExecutionCapabilities: readonly string[];
  readonly authorizationPolicyReferences: readonly string[];
  readonly availableERPCapabilityIds: readonly ERPCapabilityId[];
  readonly installedExpertisePackIds: readonly SemanticId[];
  readonly knowledgeReleaseId: string;
  readonly compiledAt: string;
  readonly configurationFingerprint: string;
  readonly runtimeFingerprint: string;
}

export type AdmissionStatus =
  | "ADMITTED"
  | "RUNTIME_BUSY"
  | "DEFERRED"
  | "DEADLINE_EXCEEDED"
  | "RATE_LIMITED";

export interface AdmissionResult {
  readonly status: AdmissionStatus;
  readonly lane: BusinessExecutionLane;
  readonly workspaceId: string;
  readonly reason: string;
}

export interface BusinessRuntimeMetrics {
  readonly requestCountByClass: Readonly<Record<string, number>>;
  readonly requestCountByLane: Readonly<Record<string, number>>;
  readonly planningLatencyMs: number;
  readonly runtimeCompilationLatencyMs: number;
  readonly runtimeCacheHits: number;
  readonly runtimeCacheMisses: number;
  readonly sliceActivations: number;
  readonly calculationLatencyMs: number;
  readonly logicResolutionLatencyMs: number;
  readonly admissionRejections: number;
  readonly queueWaitMs: number;
  readonly deadlineExceeded: number;
  readonly modelRequired: number;
  readonly modelNotRequired: number;
}

export type BusinessCalculationStatus =
  | "COMPLETED"
  | "MISSING_INPUT"
  | "INVALID_INPUT"
  | "LOGIC_NOT_FOUND"
  | "LOGIC_NOT_APPROVED"
  | "LOGIC_NOT_APPLICABLE"
  | "VERSION_MISMATCH"
  | "UNIT_MISMATCH"
  | "DEPENDENCY_CYCLE"
  | "RUNTIME_MISMATCH"
  | "AUTHORIZATION_DENIED"
  | "DEADLINE_EXCEEDED"
  | "RUNTIME_BUSY"
  | "EXECUTION_FAILURE";

export interface BusinessCalculationRequest {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly actor: ActorContext;
  readonly logicId: SemanticId;
  readonly requestedVersion?: string;
  readonly inputs: Readonly<Record<string, string | number | boolean>>;
  readonly inputRecordReferences: readonly string[];
  readonly asOfDate: string;
  readonly currency?: string;
  readonly units?: Readonly<Record<string, string>>;
  readonly runtimeFingerprint: string;
  readonly contextFingerprint?: string;
  readonly correlationId: string;
}

export interface BusinessCalculationResult {
  readonly status: BusinessCalculationStatus;
  readonly logicId: SemanticId;
  readonly logicVersion?: string;
  readonly logicFingerprint?: string;
  readonly runtimeFingerprint: string;
  readonly normalizedInputs: Readonly<
    Record<string, string | number | boolean>
  >;
  readonly result: Readonly<Record<string, string | number | boolean>>;
  readonly resultType: "MONEY" | "NUMBER" | "STRING" | "BOOLEAN";
  readonly currency?: string;
  readonly unit?: string;
  readonly provenance: readonly {
    readonly recordId: string;
    readonly field?: string;
  }[];
  readonly warnings: readonly string[];
  readonly missingInputs: readonly string[];
  readonly executionFingerprint: string;
  readonly authority: "DETERMINISTIC";
}

export interface TrustedLogicImplementation {
  readonly implementationId: string;
  readonly logicId: SemanticId;
  readonly version: string;
  execute(input: {
    readonly inputs: Readonly<Record<string, string | number | boolean>>;
    readonly currency?: string;
  }): {
    readonly result: Readonly<Record<string, string | number | boolean>>;
    readonly resultType: BusinessCalculationResult["resultType"];
    readonly unit?: string;
  };
}

export interface BusinessCalculationInputResolver {
  resolve(input: {
    readonly workspaceId: string;
    readonly actor: ActorContext;
    readonly recordReferences: readonly string[];
    readonly requiredInputs: readonly string[];
  }): Readonly<Record<string, string | number | boolean>>;
}

export interface DocumentProcessingRequest {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly documentReference: string;
  readonly lane: "ASYNC_BACKGROUND";
}

export interface DocumentProcessingResult {
  readonly status: "ACCEPTED" | "REJECTED" | "DEFERRED";
  readonly producedRequestIds: readonly string[];
}

export interface DurableWorkflowRequest {
  readonly workflowRequestId: string;
  readonly workspaceId: string;
  readonly workflowType: string;
  readonly idempotencyKey: string;
}

export interface DurableBusinessWorkflowPort {
  submit(request: DurableWorkflowRequest): { readonly status: "ACCEPTED" };
}

export interface BusinessDecisionEnginePort {
  evaluate(input: {
    readonly workspaceId: string;
    readonly logicId: SemanticId;
    readonly facts: Readonly<Record<string, string | number | boolean>>;
  }): { readonly status: "SUPPORTED_BY_PORT" | "UNSUPPORTED" };
}

export interface PortableLogicPackageBoundary {
  readonly packageId: string;
  readonly compatibility: "FUTURE_SIGNED_NATIVE_OR_WASM_PACKAGE";
  readonly signedReleaseRequired: true;
}

const defaultBudget: BusinessRequestBudget = {
  deadlineMs: 5_000,
  maxRecords: 50,
  maxLogicNodes: 20,
  maxContextItems: 100,
  maxModelCalls: 1,
  maxExternalCalls: 0,
  maxOutputBytes: 64_000,
  allowQueue: false,
  maxQueueWaitMs: 0,
};

const sliceByDomain: Readonly<Record<string, string>> = {
  [blmExpandedDomainIdsV1.financeAccounting]: "finance",
  [blmExpandedDomainIdsV1.crmSales]: "crm",
  [blmExpandedDomainIdsV1.marketingGrowth]: "sales",
  [blmExpandedDomainIdsV1.productCatalogPricing]: "sales",
  [blmExpandedDomainIdsV1.inventoryLogistics]: "inventory",
  [blmExpandedDomainIdsV1.procurementVendors]: "procurement",
  [blmExpandedDomainIdsV1.projectsServiceOperations]: "projects",
  [blmExpandedDomainIdsV1.assetsRentalMaintenance]: "assets",
  [blmExpandedDomainIdsV1.commercePosMarketplace]: "commerce",
  [blmExpandedDomainIdsV1.manufacturingMrp]: "manufacturing",
  [blmExpandedDomainIdsV1.hrOrganizationalPsychology]: "hr",
};

export class BusinessRequestPlanner {
  plan(request: UnifiedBusinessRequest): BusinessRequestExecutionPlan {
    const lane = laneFor(request.requestType);
    return {
      requestId: request.requestId,
      workspaceId: request.workspaceId,
      requestClass: request.requestType,
      executionLane: lane,
      runtimeSliceIds: slicesForIntent(request.intent, request.requestType),
      requiresAuthorization: true,
      requiresContextCompiler: request.requestType === "BUSINESS_REASONING",
      requiresModel: request.requestType === "BUSINESS_REASONING",
      requiresDeterministicEngine:
        request.requestType === "DETERMINISTIC_CALCULATION",
      requiresActionWall: request.requestType === "COMMAND",
      requiresAsyncExecution:
        request.requestType === "DOCUMENT_PROCESSING" ||
        request.requestType === "BULK_IMPORT" ||
        request.requestType === "LONG_RUNNING_WORKFLOW",
      requiresDurableWorkflow: request.requestType === "LONG_RUNNING_WORKFLOW",
      estimatedCostClass: costFor(request.requestType),
      ...(request.deadline ? { deadline: request.deadline } : {}),
      priority: request.priority,
    };
  }
}

export class WorkspaceRuntimeCompiler {
  constructor(
    private readonly logicRegistry = new InMemoryBusinessLogicRegistry(),
    private readonly skillRegistry = new BusinessSkillRegistry(),
  ) {}

  compile(
    input: WorkspaceRuntimeCompilerInput,
  ): CompiledWorkspaceRuntimeManifest {
    const candidateInstalledSkillReleases = (input.installedSkills ?? [])
      .map((installation) =>
        this.skillRegistry.get(installation.skillId, installation.skillVersion),
      )
      .filter(
        (skill): skill is SkillRelease =>
          skill?.status === "APPROVED" || skill?.status === "PUBLISHED",
      );
    const candidateEnabledDomainIds = uniqueRuntimeSemanticIds([
      ...input.enabledDomainIds,
      ...candidateInstalledSkillReleases.flatMap((skill) => skill.domainIds),
    ]);
    const logic = this.logicRegistry
      .list()
      .filter(
        (item) => item.status === "APPROVED" || item.status === "PUBLISHED",
      )
      .filter((item) => candidateEnabledDomainIds.includes(item.domainId))
      .filter(
        (item) =>
          item.scope.level === "UNIVERSAL" ||
          item.scope.industry === input.industry ||
          item.scope.jurisdiction === input.jurisdiction ||
          item.scope.businessType === input.businessType ||
          item.scope.workspaceId === input.workspaceId,
      );
    const availableLogicIds = logic.map((item) => item.logicId);
    const installedSkills = this.skillRegistry.resolveInstalled({
      workspaceId: input.workspaceId,
      industry: input.industry,
      businessType: input.businessType,
      asOf: input.compiledAt.slice(0, 10),
      installedSkills: input.installedSkills ?? [],
      availableLogicIds,
      availableERPCapabilities: input.availableERPCapabilityIds ?? [],
      actorPermissionIds: input.workspacePolicyIds ?? [],
    });
    const skillRequiredDomainIds = uniqueRuntimeSemanticIds(
      installedSkills.flatMap((skill) => skill.domainIds),
    );
    const allEnabledDomainIds = uniqueRuntimeSemanticIds([
      ...input.enabledDomainIds,
      ...skillRequiredDomainIds,
    ]);
    const configurationFingerprint = stableFingerprint({
      workspaceId: input.workspaceId,
      runtimeVersion: input.runtimeVersion,
      businessType: input.businessType,
      industry: input.industry,
      jurisdiction: input.jurisdiction,
      currency: input.currency,
      domains: allEnabledDomainIds,
      modules: input.enabledModuleIds,
      knowledgeReleaseId: input.knowledgeReleaseId,
      logic: logic.map((item) => ({
        id: item.logicId,
        version: item.version,
        fingerprint: item.fingerprint,
      })),
      capabilities: {
        data: input.dataProviderCapabilities,
        external: input.externalSystemCapabilities,
        local: input.localExecutionCapabilities,
        erp: input.availableERPCapabilityIds ?? [],
      },
      expertise: (input.installedExpertise ?? []).map((item) => ({
        id: item.expertisePackId,
        version: item.expertiseVersion,
        fingerprint: item.configurationFingerprint,
      })),
      skills: installedSkills.map((skill) => ({
        id: skill.skillId,
        version: skill.version,
        fingerprint: skill.fingerprint,
      })),
    });
    const slices = compileSlices(input.workspaceId, logic, installedSkills);
    const manifestWithoutRuntimeFingerprint = {
      runtimeId: `runtime:${input.workspaceId}:${configurationFingerprint}`,
      workspaceId: input.workspaceId,
      runtimeVersion: input.runtimeVersion,
      businessType: input.businessType,
      industry: input.industry,
      jurisdiction: input.jurisdiction,
      currency: input.currency,
      enabledDomainIds: allEnabledDomainIds,
      enabledModuleIds: input.enabledModuleIds,
      availableLogicIds: logic.map((item) => item.logicId),
      availableSkillIds: installedSkills.map((skill) => skill.skillId),
      logicVersions: Object.fromEntries(
        logic.map((item) => [item.logicId, item.version]),
      ),
      logicFingerprints: Object.fromEntries(
        logic.map((item) => [item.logicId, item.fingerprint]),
      ),
      skillVersions: Object.fromEntries(
        installedSkills.map((item) => [item.skillId, item.version]),
      ),
      skillFingerprints: Object.fromEntries(
        installedSkills.map((item) => [item.skillId, item.fingerprint]),
      ),
      runtimeSliceIndex: slices,
      dataProviderCapabilities: input.dataProviderCapabilities,
      externalSystemCapabilities: input.externalSystemCapabilities,
      localExecutionCapabilities: input.localExecutionCapabilities,
      authorizationPolicyReferences: input.authorizationPolicyReferences,
      availableERPCapabilityIds: input.availableERPCapabilityIds ?? [],
      installedExpertisePackIds: (input.installedExpertise ?? []).map(
        (item) => item.expertisePackId,
      ),
      knowledgeReleaseId: input.knowledgeReleaseId,
      compiledAt: input.compiledAt,
      configurationFingerprint,
    };
    return {
      ...manifestWithoutRuntimeFingerprint,
      runtimeFingerprint: stableFingerprint(manifestWithoutRuntimeFingerprint),
    };
  }
}

export class WorkspaceRuntimeCache {
  private readonly entries = new Map<
    string,
    CompiledWorkspaceRuntimeManifest
  >();
  private hits = 0;
  private misses = 0;

  constructor(private readonly maxEntries: number) {}

  get(input: {
    readonly workspaceId: string;
    readonly runtimeFingerprint: string;
  }): CompiledWorkspaceRuntimeManifest | undefined {
    const key = cacheKey(input.workspaceId, input.runtimeFingerprint);
    const value = this.entries.get(key);
    if (!value) {
      this.misses += 1;
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, value);
    this.hits += 1;
    return value;
  }

  set(manifest: CompiledWorkspaceRuntimeManifest): void {
    const key = cacheKey(manifest.workspaceId, manifest.runtimeFingerprint);
    this.entries.delete(key);
    this.entries.set(key, manifest);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (!oldest) return;
      this.entries.delete(oldest);
    }
  }

  invalidateWorkspace(workspaceId: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(`${workspaceId}:`)) this.entries.delete(key);
    }
  }

  metrics() {
    return { hits: this.hits, misses: this.misses, size: this.entries.size };
  }
}

export class BusinessRuntimeAdmissionController {
  private readonly laneActive = new Map<BusinessExecutionLane, number>();
  private readonly workspaceActive = new Map<string, number>();

  constructor(
    private readonly limits: {
      readonly global: number;
      readonly perWorkspace: number;
      readonly perLane: Readonly<
        Partial<Record<BusinessExecutionLane, number>>
      >;
    },
  ) {}

  admit(plan: BusinessRequestExecutionPlan): AdmissionResult {
    if (plan.deadline && Date.parse(plan.deadline) < Date.now()) {
      return {
        status: "DEADLINE_EXCEEDED",
        lane: plan.executionLane,
        workspaceId: plan.workspaceId,
        reason: "Request deadline already passed.",
      };
    }
    const globalActive = [...this.laneActive.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    const laneLimit =
      this.limits.perLane[plan.executionLane] ?? this.limits.global;
    const laneActive = this.laneActive.get(plan.executionLane) ?? 0;
    const workspaceActive = this.workspaceActive.get(plan.workspaceId) ?? 0;
    if (workspaceActive >= this.limits.perWorkspace) {
      return {
        status:
          plan.executionLane === "ASYNC_BACKGROUND"
            ? "DEFERRED"
            : "RUNTIME_BUSY",
        lane: plan.executionLane,
        workspaceId: plan.workspaceId,
        reason: "Per-workspace runtime limit reached.",
      };
    }
    if (laneActive >= laneLimit || globalActive >= this.limits.global) {
      return {
        status:
          plan.priority === "BULK" || plan.priority === "BACKGROUND"
            ? "DEFERRED"
            : "RUNTIME_BUSY",
        lane: plan.executionLane,
        workspaceId: plan.workspaceId,
        reason: "Runtime lane capacity reached.",
      };
    }
    this.laneActive.set(plan.executionLane, laneActive + 1);
    this.workspaceActive.set(plan.workspaceId, workspaceActive + 1);
    return {
      status: "ADMITTED",
      lane: plan.executionLane,
      workspaceId: plan.workspaceId,
      reason: "Admitted.",
    };
  }

  release(plan: BusinessRequestExecutionPlan): void {
    decrement(this.laneActive, plan.executionLane);
    decrement(this.workspaceActive, plan.workspaceId);
  }
}

export class TrustedBusinessLogicImplementationRegistry {
  private readonly implementations = new Map<
    string,
    TrustedLogicImplementation
  >();

  constructor(
    implementations: readonly TrustedLogicImplementation[] = trustedImplementationsV1,
  ) {
    for (const implementation of implementations) {
      this.implementations.set(
        implementationKey(implementation.logicId, implementation.version),
        implementation,
      );
    }
  }

  get(
    logicIdValue: SemanticId,
    version: string,
  ): TrustedLogicImplementation | undefined {
    return this.implementations.get(implementationKey(logicIdValue, version));
  }

  implementationIds(): readonly string[] {
    return [...this.implementations.values()].map(
      (item) => item.implementationId,
    );
  }
}

export class BusinessCalculationDependencyGraph {
  constructor(private readonly maxNodes: number) {}

  executionOrder(
    edges: readonly {
      readonly logicId: SemanticId;
      readonly dependsOn: readonly SemanticId[];
      readonly version: string;
    }[],
  ): {
    readonly status: "VALID" | "DEPENDENCY_CYCLE";
    readonly order: readonly SemanticId[];
  } {
    if (edges.length > this.maxNodes) {
      return { status: "DEPENDENCY_CYCLE", order: [] };
    }
    const visiting = new Set<SemanticId>();
    const visited = new Set<SemanticId>();
    const order: SemanticId[] = [];
    const byId = new Map(edges.map((edge) => [edge.logicId, edge]));
    const visit = (id: SemanticId): boolean => {
      if (visited.has(id)) return true;
      if (visiting.has(id)) return false;
      visiting.add(id);
      for (const dependency of byId.get(id)?.dependsOn ?? []) {
        if (!visit(dependency)) return false;
      }
      visiting.delete(id);
      visited.add(id);
      order.push(id);
      return true;
    };
    for (const edge of edges) {
      if (!visit(edge.logicId))
        return { status: "DEPENDENCY_CYCLE", order: [] };
    }
    return { status: "VALID", order };
  }
}

export class DeterministicBusinessEngine {
  constructor(
    private readonly logicRegistry = new InMemoryBusinessLogicRegistry(),
    private readonly implementationRegistry = new TrustedBusinessLogicImplementationRegistry(),
  ) {}

  calculate(input: {
    readonly request: BusinessCalculationRequest;
    readonly manifest: CompiledWorkspaceRuntimeManifest;
    readonly slice: WorkspaceRuntimeSlice;
  }): BusinessCalculationResult {
    const { request, manifest, slice } = input;
    if (!actorCanCalculate(request.actor)) {
      return calculationFailure(request, "AUTHORIZATION_DENIED");
    }
    if (
      manifest.workspaceId !== request.workspaceId ||
      slice.workspaceId !== request.workspaceId
    ) {
      return calculationFailure(request, "LOGIC_NOT_APPLICABLE");
    }
    if (manifest.runtimeFingerprint !== request.runtimeFingerprint) {
      return calculationFailure(request, "RUNTIME_MISMATCH");
    }
    if (
      !manifest.availableLogicIds.includes(request.logicId) ||
      !slice.logicIds.includes(request.logicId)
    ) {
      return calculationFailure(request, "LOGIC_NOT_APPLICABLE");
    }
    const definition = this.logicRegistry
      .list()
      .find((item) => item.logicId === request.logicId);
    if (!definition) return calculationFailure(request, "LOGIC_NOT_FOUND");
    if (definition.status !== "APPROVED" && definition.status !== "PUBLISHED") {
      return calculationFailure(request, "LOGIC_NOT_APPROVED", definition);
    }
    if (
      request.requestedVersion &&
      request.requestedVersion !== definition.version
    ) {
      return calculationFailure(request, "VERSION_MISMATCH", definition);
    }
    const missingInputs = definition.inputSchema
      .filter(
        (field) => field.required && request.inputs[field.name] === undefined,
      )
      .map((field) => field.name);
    if (missingInputs.length > 0) {
      return calculationFailure(
        request,
        "MISSING_INPUT",
        definition,
        missingInputs,
      );
    }
    const unitIssue = validateUnits(definition, request);
    if (unitIssue)
      return calculationFailure(request, "UNIT_MISMATCH", definition);
    const implementation = this.implementationRegistry.get(
      request.logicId,
      definition.version,
    );
    if (!implementation) {
      return calculationFailure(request, "EXECUTION_FAILURE", definition);
    }
    try {
      const executed = implementation.execute({
        inputs: request.inputs,
        ...(request.currency ? { currency: request.currency } : {}),
      });
      const base = {
        logicId: request.logicId,
        logicVersion: definition.version,
        logicFingerprint: definition.fingerprint,
        runtimeFingerprint: request.runtimeFingerprint,
        normalizedInputs: request.inputs,
        result: executed.result,
        resultType: executed.resultType,
        ...(request.currency ? { currency: request.currency } : {}),
        ...(executed.unit ? { unit: executed.unit } : {}),
        provenance: request.inputRecordReferences.map((recordId) => ({
          recordId,
        })),
        warnings: [],
        missingInputs: [],
        authority: "DETERMINISTIC" as const,
      };
      return {
        status: "COMPLETED",
        ...base,
        executionFingerprint: stableFingerprint({
          requestId: request.requestId,
          logicId: request.logicId,
          logicVersion: definition.version,
          inputs: request.inputs,
          result: executed.result,
          runtimeFingerprint: request.runtimeFingerprint,
        }),
      };
    } catch {
      return calculationFailure(request, "INVALID_INPUT", definition);
    }
  }
}

export class VirtualWorkspaceBusinessRuntime {
  constructor(
    readonly manifest: CompiledWorkspaceRuntimeManifest,
    private readonly engine: DeterministicBusinessEngine,
  ) {}

  getSlice(sliceId: string): WorkspaceRuntimeSlice | undefined {
    return this.manifest.runtimeSliceIndex.find(
      (slice) => slice.sliceId === sliceId,
    );
  }

  calculate(request: BusinessCalculationRequest): BusinessCalculationResult {
    const logic = this.manifest.runtimeSliceIndex.find((slice) =>
      slice.logicIds.includes(request.logicId),
    );
    if (!logic) return calculationFailure(request, "LOGIC_NOT_APPLICABLE");
    return this.engine.calculate({
      request,
      manifest: this.manifest,
      slice: logic,
    });
  }
}

export function createUnifiedBusinessRequest(
  input: Omit<UnifiedBusinessRequest, "budget"> & {
    readonly budget?: Partial<BusinessRequestBudget>;
  },
): UnifiedBusinessRequest {
  return {
    ...input,
    budget: { ...defaultBudget, ...(input.budget ?? {}) },
  };
}

export function bridgeRequiredCalculation(input: {
  readonly requiredCalculation: RequiredCalculation;
  readonly request: UnifiedBusinessRequest;
  readonly manifest: CompiledWorkspaceRuntimeManifest;
  readonly contextRecordReferences: readonly string[];
  readonly inputs: Readonly<Record<string, string | number | boolean>>;
}):
  | BusinessCalculationRequest
  | { readonly status: "REJECTED"; readonly reason: string } {
  const logicIdValue = requiredCalculationToLogicId(
    input.requiredCalculation,
    input.manifest,
  );
  if (
    !logicIdValue ||
    !input.manifest.availableLogicIds.includes(logicIdValue)
  ) {
    return { status: "REJECTED", reason: "LOGIC_NOT_IN_RUNTIME" };
  }
  const invalidReference = input.request.recordReferences.find(
    (recordId) => !input.contextRecordReferences.includes(recordId),
  );
  if (invalidReference) {
    return { status: "REJECTED", reason: "REFERENCE_NOT_IN_CONTEXT" };
  }
  if (!actorCanCalculate(input.request.actor)) {
    return { status: "REJECTED", reason: "AUTHORIZATION_DENIED" };
  }
  return {
    requestId: `${input.request.requestId}:calculation`,
    workspaceId: input.request.workspaceId,
    actor: input.request.actor,
    logicId: logicIdValue,
    inputs: input.inputs,
    inputRecordReferences: input.request.recordReferences,
    asOfDate: input.request.requestedAt.slice(0, 10),
    currency: String(input.request.payload.currency ?? input.manifest.currency),
    runtimeFingerprint: input.manifest.runtimeFingerprint,
    ...(input.request.contextFingerprint
      ? { contextFingerprint: input.request.contextFingerprint }
      : {}),
    correlationId: input.request.correlationId,
  };
}

export function fakeVoiceRequest(input: {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly actor: ActorContext;
  readonly intent: string;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
}): UnifiedBusinessRequest {
  return createUnifiedBusinessRequest({
    ...input,
    source: "VOICE",
    requestType: "DETERMINISTIC_CALCULATION",
    recordReferences: [],
    requestedAt: "2026-08-12T00:00:00.000Z",
    priority: "INTERACTIVE",
    idempotencyKey: `${input.requestId}:voice`,
    correlationId: `${input.requestId}:correlation`,
  });
}

export function fakeErpUiRequest(input: {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly actor: ActorContext;
  readonly intent: string;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
}): UnifiedBusinessRequest {
  return createUnifiedBusinessRequest({
    ...input,
    source: "ERP_UI",
    requestType: "DETERMINISTIC_CALCULATION",
    recordReferences: [],
    requestedAt: "2026-08-12T00:00:00.000Z",
    priority: "INTERACTIVE",
    idempotencyKey: `${input.requestId}:erp`,
    correlationId: `${input.requestId}:correlation`,
  });
}

export function benchmarkBusinessRuntimePlane(iterations = 100) {
  const compiler = new WorkspaceRuntimeCompiler();
  const request = createUnifiedBusinessRequest({
    requestId: "benchmark-request",
    workspaceId: "benchmark-workspace",
    actor: benchmarkActor("benchmark-workspace"),
    source: "API",
    requestType: "DETERMINISTIC_CALCULATION",
    intent: "Calculate gross margin.",
    payload: {},
    recordReferences: [],
    requestedAt: "2026-08-12T00:00:00.000Z",
    priority: "INTERACTIVE",
    idempotencyKey: "benchmark",
    correlationId: "benchmark",
  });
  const planner = new BusinessRequestPlanner();
  const t0 = performance.now();
  const plan = planner.plan(request);
  const planningLatencyMs = performance.now() - t0;
  const t1 = performance.now();
  const manifest = compiler.compile(
    workspaceInput("benchmark-workspace", "Services", [
      blmExpandedDomainIdsV1.financeAccounting,
    ]),
  );
  const coldManifestCompileMs = performance.now() - t1;
  const cache = new WorkspaceRuntimeCache(4);
  cache.set(manifest);
  const t2 = performance.now();
  cache.get({
    workspaceId: manifest.workspaceId,
    runtimeFingerprint: manifest.runtimeFingerprint,
  });
  const warmManifestLookupMs = performance.now() - t2;
  const t3 = performance.now();
  manifest.runtimeSliceIndex.find((slice) => slice.sliceId === "finance");
  const runtimeSliceLookupMs = performance.now() - t3;
  const runtime = new VirtualWorkspaceBusinessRuntime(
    manifest,
    new DeterministicBusinessEngine(),
  );
  const calcRequest = calculationRequest({
    requestId: "benchmark-calc",
    workspaceId: manifest.workspaceId,
    actor: benchmarkActor(manifest.workspaceId),
    logicId: logicId("finance", "gross-margin", 1),
    inputs: { revenue: "100.00", costOfGoodsSold: "60.00" },
    runtimeFingerprint: manifest.runtimeFingerprint,
    currency: "USD",
  });
  const t4 = performance.now();
  runtime.calculate(calcRequest);
  const singleCalculationMs = performance.now() - t4;
  const ten = runCalculations(runtime, calcRequest, 10);
  const hundred = runCalculations(runtime, calcRequest, iterations);
  const alternate = runAlternatingCalculations(iterations);
  return {
    requestClassificationOverheadMs: roundMetric(planningLatencyMs),
    warmManifestLookupMs: roundMetric(warmManifestLookupMs),
    coldManifestCompileMs: roundMetric(coldManifestCompileMs),
    runtimeSliceLookupMs: roundMetric(runtimeSliceLookupMs),
    singleCalculationMs: roundMetric(singleCalculationMs),
    tenCalculationsMs: roundMetric(ten),
    hundredCalculationsMs: roundMetric(hundred),
    crossWorkspaceAlternatingCalculationsMs: roundMetric(alternate),
    planLane: plan.executionLane,
  };
}

export function workspaceInput(
  workspaceId: string,
  businessType: string,
  enabledDomainIds: readonly SemanticId[],
): WorkspaceRuntimeCompilerInput {
  return {
    workspaceId,
    runtimeVersion: "1",
    businessType,
    industry:
      businessType === "B2B SaaS"
        ? "Recurring Revenue"
        : businessType === "Grocery"
          ? "Retail"
          : "Services",
    jurisdiction: "US",
    currency: "USD",
    enabledDomainIds,
    enabledModuleIds: enabledDomainIds.map((id) => id.split(".").at(-1) ?? id),
    dataProviderCapabilities: ["IN_MEMORY_FIXTURE"],
    externalSystemCapabilities: [],
    localExecutionCapabilities: ["NATIVE_TS_DETERMINISTIC_KERNEL"],
    authorizationPolicyReferences: ["policy.business-calculation.execute"],
    knowledgeReleaseId: "flow.blm.knowledge-release.runtime-plane-v1",
    compiledAt: "2026-08-12T00:00:00.000Z",
  };
}

export function calculationRequest(input: {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly actor: ActorContext;
  readonly logicId: SemanticId;
  readonly inputs: Readonly<Record<string, string | number | boolean>>;
  readonly runtimeFingerprint: string;
  readonly currency?: string;
}): BusinessCalculationRequest {
  return {
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    actor: input.actor,
    logicId: input.logicId,
    inputs: input.inputs,
    inputRecordReferences: [],
    asOfDate: "2026-08-12",
    ...(input.currency ? { currency: input.currency } : {}),
    runtimeFingerprint: input.runtimeFingerprint,
    correlationId: `${input.requestId}:correlation`,
  };
}

export function benchmarkActor(workspaceId: string): ActorContext {
  const workspace = {
    workspaceId: workspaceId as ActorContext["workspace"]["workspaceId"],
    slug: workspaceId,
  };
  return {
    actorId: `${workspaceId}:actor` as ActorContext["actorId"],
    userId: `${workspaceId}:user` as ActorContext["userId"],
    membershipId: `${workspaceId}:membership` as ActorContext["membershipId"],
    actorKind: "user",
    workspace,
    roleIds: ["operator"],
    permissionIds: ["business.calculation.execute"],
    requestSource: "UI",
    correlationId:
      `${workspaceId}:correlation` as ActorContext["correlationId"],
  };
}

export const portableLogicPackageBoundaryV1: PortableLogicPackageBoundary = {
  packageId: "flow.logic-package.boundary.native-or-wasm.future",
  compatibility: "FUTURE_SIGNED_NATIVE_OR_WASM_PACKAGE",
  signedReleaseRequired: true,
};

function compileSlices(
  workspaceId: string,
  logic: readonly BusinessLogicDefinition[],
  skills: readonly SkillRelease[],
): readonly WorkspaceRuntimeSlice[] {
  const bySlice = new Map<string, BusinessLogicDefinition[]>();
  for (const item of logic) {
    const sliceId = sliceByDomain[item.domainId] ?? "universal";
    bySlice.set(sliceId, [...(bySlice.get(sliceId) ?? []), item]);
  }
  const skillsBySlice = new Map<string, SkillRelease[]>();
  for (const skill of skills) {
    for (const domainId of skill.domainIds) {
      const sliceId = sliceByDomain[domainId] ?? "universal";
      skillsBySlice.set(sliceId, [
        ...(skillsBySlice.get(sliceId) ?? []),
        skill,
      ]);
    }
  }
  const sliceIds = new Set([...bySlice.keys(), ...skillsBySlice.keys()]);
  return [...sliceIds].map((sliceId) => {
    const items = bySlice.get(sliceId) ?? [];
    const sliceSkills = skillsBySlice.get(sliceId) ?? [];
    const domainId =
      items[0]?.domainId ??
      sliceSkills[0]?.domainIds[0] ??
      blmExpandedDomainIdsV1.universalCore;
    const base = {
      sliceId,
      workspaceId,
      domainId,
      logicIds: items.map((item) => item.logicId),
      skillIds: uniqueRuntimeSemanticIds(
        sliceSkills.map((skill) => skill.skillId),
      ),
      dependencySliceIds:
        sliceId === "inventory" ? ["finance", "commerce"] : [],
      capabilityReferences: [
        ...items.map((item) => item.name),
        ...sliceSkills.flatMap((skill) =>
          skill.requiredERPCapabilities.map((item) => item.capabilityId),
        ),
      ],
    };
    return { ...base, fingerprint: stableFingerprint(base) };
  });
}

function uniqueRuntimeSemanticIds(
  ids: readonly SemanticId[],
): readonly SemanticId[] {
  return [...new Set(ids)];
}

function laneFor(requestClass: BusinessRequestClass): BusinessExecutionLane {
  if (requestClass === "DIRECT_READ" || requestClass === "SYSTEM") {
    return "FAST_SYNC";
  }
  if (requestClass === "BUSINESS_REASONING") return "MODEL_SYNC";
  if (requestClass === "DETERMINISTIC_CALCULATION") return "COMPUTE_SYNC";
  if (requestClass === "COMMAND") return "ACTION_GATED";
  if (requestClass === "ANALYTICS_QUERY") return "ANALYTICS";
  if (requestClass === "LONG_RUNNING_WORKFLOW")
    return "DURABLE_WORKFLOW_FUTURE";
  return "ASYNC_BACKGROUND";
}

function costFor(requestClass: BusinessRequestClass): BusinessRuntimeCostClass {
  if (requestClass === "DIRECT_READ" || requestClass === "SYSTEM")
    return "TINY";
  if (requestClass === "DETERMINISTIC_CALCULATION") return "SMALL";
  if (requestClass === "BUSINESS_REASONING") return "EXTERNAL";
  if (
    requestClass === "BULK_IMPORT" ||
    requestClass === "DOCUMENT_PROCESSING" ||
    requestClass === "LONG_RUNNING_WORKFLOW"
  ) {
    return "EXPENSIVE";
  }
  return "MEDIUM";
}

function slicesForIntent(
  intent: string,
  requestClass: BusinessRequestClass,
): readonly string[] {
  const key = intent.toLowerCase();
  if (requestClass === "DIRECT_READ") return [];
  if (key.includes("inventory") || key.includes("stock")) return ["inventory"];
  if (key.includes("project") || key.includes("utilization"))
    return ["projects"];
  if (key.includes("lead") || key.includes("deal")) return ["crm"];
  if (key.includes("mrr") || key.includes("arr") || key.includes("churn"))
    return ["finance"];
  if (key.includes("margin") || key.includes("revenue") || key.includes("cash"))
    return ["finance"];
  return ["universal"];
}

function cacheKey(workspaceId: string, runtimeFingerprint: string): string {
  return `${workspaceId}:${runtimeFingerprint}`;
}

function decrement<Key>(map: Map<Key, number>, key: Key): void {
  const value = map.get(key) ?? 0;
  if (value <= 1) map.delete(key);
  else map.set(key, value - 1);
}

function implementationKey(logicIdValue: SemanticId, version: string): string {
  return `${logicIdValue}:${version}`;
}

function actorCanCalculate(actor: ActorContext): boolean {
  return (
    actor.permissionIds.includes("business.calculation.execute") ||
    actor.permissionIds.includes("business.runtime.calculate")
  );
}

function calculationFailure(
  request: BusinessCalculationRequest,
  status: BusinessCalculationStatus,
  definition?: BusinessLogicDefinition,
  missingInputs: readonly string[] = [],
): BusinessCalculationResult {
  return {
    status,
    logicId: request.logicId,
    ...(definition
      ? {
          logicVersion: definition.version,
          logicFingerprint: definition.fingerprint,
        }
      : {}),
    runtimeFingerprint: request.runtimeFingerprint,
    normalizedInputs: request.inputs,
    result: {},
    resultType: "STRING",
    provenance: [],
    warnings: [],
    missingInputs,
    executionFingerprint: stableFingerprint({
      requestId: request.requestId,
      status,
      logicId: request.logicId,
      runtimeFingerprint: request.runtimeFingerprint,
      missingInputs,
    }),
    authority: "DETERMINISTIC",
  };
}

function validateUnits(
  definition: BusinessLogicDefinition,
  request: BusinessCalculationRequest,
): string | undefined {
  const schemaUnits = definition.inputSchema
    .filter((field) => field.valueType === "MONEY")
    .map((field) => field.name);
  if (schemaUnits.length > 0 && !request.currency) return "MISSING_CURRENCY";
  for (const field of definition.inputSchema) {
    const unit = request.units?.[field.name];
    if (field.valueType === "MONEY" && unit && unit !== request.currency)
      return "CURRENCY_MISMATCH";
    if (field.valueType === "NUMBER" && unit === "currency")
      return "UNIT_MISMATCH";
  }
  return undefined;
}

const trustedImplementationsV1: readonly TrustedLogicImplementation[] = [
  impl("finance", "gross-margin", ({ inputs }) => ({
    result: {
      grossMargin: money(requiredInput(inputs, "revenue"))
        .sub(money(requiredInput(inputs, "costOfGoodsSold")))
        .toMoney(),
    },
    resultType: "MONEY",
  })),
  impl("finance", "gross-margin-percentage", ({ inputs }) => ({
    result: {
      grossMarginPercentage: ratio(
        money(requiredInput(inputs, "grossMargin")),
        money(requiredInput(inputs, "revenue")),
      ),
    },
    resultType: "NUMBER",
    unit: "ratio",
  })),
  impl("pricing", "markup", ({ inputs }) => ({
    result: {
      markupPercentage: ratio(
        money(requiredInput(inputs, "sellingPrice")).sub(
          money(requiredInput(inputs, "cost")),
        ),
        money(requiredInput(inputs, "cost")),
      ),
    },
    resultType: "NUMBER",
    unit: "ratio",
  })),
  impl("finance", "net-revenue", ({ inputs }) => ({
    result: {
      netRevenue: money(requiredInput(inputs, "grossRevenue"))
        .sub(money(requiredInput(inputs, "discounts")))
        .sub(money(requiredInput(inputs, "returns")))
        .toMoney(),
    },
    resultType: "MONEY",
  })),
  impl("finance", "ar-aging-bucket-assignment", ({ inputs }) => ({
    result: {
      agingBucket: agingBucket(
        numberInput(requiredInput(inputs, "daysOutstanding")),
      ),
    },
    resultType: "STRING",
  })),
  impl("finance", "ap-aging-bucket-assignment", ({ inputs }) => ({
    result: {
      agingBucket: agingBucket(
        numberInput(requiredInput(inputs, "daysOutstanding")),
      ),
    },
    resultType: "STRING",
  })),
  impl("inventory", "available-inventory", ({ inputs }) => ({
    result: {
      availableInventory:
        numberInput(requiredInput(inputs, "stockOnHand")) -
        numberInput(requiredInput(inputs, "reservedStock")) -
        numberInput(inputs.unavailableStock ?? 0),
    },
    resultType: "NUMBER",
    unit: "quantity",
  })),
  impl("projects", "project-margin", ({ inputs }) => ({
    result: {
      projectMargin: money(requiredInput(inputs, "projectRevenue"))
        .sub(money(requiredInput(inputs, "projectCost")))
        .toMoney(),
    },
    resultType: "MONEY",
  })),
  impl("projects", "employee-utilization", ({ inputs }) => ({
    result: {
      utilizationRate: ratioNumber(
        numberInput(requiredInput(inputs, "billableHours")),
        numberInput(requiredInput(inputs, "availableHours")),
      ),
    },
    resultType: "NUMBER",
    unit: "ratio",
  })),
  impl("crm", "lead-conversion-rate", ({ inputs }) => ({
    result: {
      leadConversionRate: ratioNumber(
        numberInput(requiredInput(inputs, "convertedLeads")),
        numberInput(requiredInput(inputs, "totalLeads")),
      ),
    },
    resultType: "NUMBER",
    unit: "ratio",
  })),
  impl("crm", "average-deal-size", ({ inputs }) => ({
    result: {
      averageDealSize: money(requiredInput(inputs, "wonRevenue"))
        .div(numberInput(requiredInput(inputs, "wonDealCount")))
        .toMoney(),
    },
    resultType: "MONEY",
  })),
  impl("saas", "churn-rate", ({ inputs }) => ({
    result: {
      churnRate: ratioNumber(
        numberInput(requiredInput(inputs, "lostBase")),
        numberInput(requiredInput(inputs, "startingBase")),
      ),
    },
    resultType: "NUMBER",
    unit: "ratio",
  })),
  impl("saas", "mrr", ({ inputs }) => ({
    result: {
      mrr: money(requiredInput(inputs, "monthlySubscriptionRevenue")).toMoney(),
    },
    resultType: "MONEY",
  })),
  impl("saas", "arr", ({ inputs }) => ({
    result: { arr: money(requiredInput(inputs, "mrr")).mul(12).toMoney() },
    resultType: "MONEY",
  })),
  impl("finance", "working-capital", ({ inputs }) => ({
    result: {
      workingCapital: money(requiredInput(inputs, "currentAssets"))
        .sub(money(requiredInput(inputs, "currentLiabilities")))
        .toMoney(),
    },
    resultType: "MONEY",
  })),
  impl("pricing", "discount-percentage", ({ inputs }) => ({
    result: {
      discountPercentage: ratio(
        money(requiredInput(inputs, "discountAmount")),
        money(requiredInput(inputs, "listPrice")),
      ),
    },
    resultType: "NUMBER",
    unit: "ratio",
  })),
];

function impl(
  domain: string,
  name: string,
  execute: TrustedLogicImplementation["execute"],
): TrustedLogicImplementation {
  const id = logicId(domain, name, 1);
  return {
    implementationId: `trusted.native.${domain}.${name}.v1`,
    logicId: id,
    version: "1",
    execute,
  };
}

class FixedDecimal {
  private static readonly scale = 10_000n;

  private constructor(private readonly scaled: bigint) {}

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

  sub(other: FixedDecimal): FixedDecimal {
    return new FixedDecimal(this.scaled - other.scaled);
  }

  mul(multiplier: number): FixedDecimal {
    return new FixedDecimal(this.scaled * BigInt(multiplier));
  }

  div(divisor: number): FixedDecimal {
    if (divisor === 0) throw new Error("Division by zero.");
    return new FixedDecimal(this.scaled / BigInt(divisor));
  }

  ratioTo(other: FixedDecimal): string {
    if (other.scaled === 0n) throw new Error("Division by zero.");
    const quotient = (this.scaled * FixedDecimal.scale) / other.scaled;
    return new FixedDecimal(quotient).toRatio();
  }

  toMoney(): string {
    const rounded = roundScaled(this.scaled, 2);
    return formatScaled(rounded, 2);
  }

  toRatio(): string {
    return formatScaled(this.scaled, 4);
  }
}

function money(value: string | number | boolean): FixedDecimal {
  return FixedDecimal.parse(value);
}

function ratio(left: FixedDecimal, right: FixedDecimal): string {
  return left.ratioTo(right);
}

function ratioNumber(left: number, right: number): string {
  if (right === 0) throw new Error("Division by zero.");
  return FixedDecimal.parse(String(left)).ratioTo(
    FixedDecimal.parse(String(right)),
  );
}

function numberInput(value: string | number | boolean): number {
  if (typeof value === "boolean") throw new Error("Boolean is not numeric.");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid number.");
  return parsed;
}

function requiredInput(
  inputs: Readonly<Record<string, string | number | boolean>>,
  key: string,
): string | number | boolean {
  const value = inputs[key];
  if (value === undefined) throw new Error(`Missing input: ${key}`);
  return value;
}

function agingBucket(days: number): string {
  if (days < 0) throw new Error("Invalid days.");
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
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
  const divisor = 10n ** BigInt(4);
  const whole = absolute / divisor;
  const fractionScale = 10n ** BigInt(4 - decimals);
  const fraction = (absolute % divisor) / fractionScale;
  return `${negative ? "-" : ""}${whole}.${fraction.toString().padStart(decimals, "0")}`;
}

function requiredCalculationToLogicId(
  calculation: RequiredCalculation,
  manifest: CompiledWorkspaceRuntimeManifest,
): SemanticId | undefined {
  if (manifest.availableLogicIds.includes(calculation.formulaId)) {
    return calculation.formulaId;
  }
  const mapping: Readonly<Record<string, SemanticId>> = {
    "flow.decision.formula.finance.gross-margin": logicId(
      "finance",
      "gross-margin",
      1,
    ),
    "flow.decision.formula.project.project-margin": logicId(
      "projects",
      "project-margin",
      1,
    ),
    "flow.decision.formula.pricing.discount-percentage": logicId(
      "pricing",
      "discount-percentage",
      1,
    ),
  };
  return mapping[calculation.formulaId];
}

function runCalculations(
  runtime: VirtualWorkspaceBusinessRuntime,
  request: BusinessCalculationRequest,
  count: number,
): number {
  const started = performance.now();
  for (let index = 0; index < count; index += 1) runtime.calculate(request);
  return performance.now() - started;
}

function runAlternatingCalculations(count: number): number {
  const compiler = new WorkspaceRuntimeCompiler();
  const first = new VirtualWorkspaceBusinessRuntime(
    compiler.compile(
      workspaceInput("benchmark-a", "Grocery", [
        blmExpandedDomainIdsV1.inventoryLogistics,
      ]),
    ),
    new DeterministicBusinessEngine(),
  );
  const second = new VirtualWorkspaceBusinessRuntime(
    compiler.compile(
      workspaceInput("benchmark-b", "Services", [
        blmExpandedDomainIdsV1.financeAccounting,
      ]),
    ),
    new DeterministicBusinessEngine(),
  );
  const started = performance.now();
  for (let index = 0; index < count; index += 1) {
    const runtime = index % 2 === 0 ? first : second;
    const logic =
      index % 2 === 0
        ? logicId("inventory", "available-inventory", 1)
        : logicId("finance", "gross-margin", 1);
    runtime.calculate(
      calculationRequest({
        requestId: `alternating-${index}`,
        workspaceId: runtime.manifest.workspaceId,
        actor: benchmarkActor(runtime.manifest.workspaceId),
        logicId: logic,
        inputs:
          index % 2 === 0
            ? { stockOnHand: 10, reservedStock: 2 }
            : { revenue: "10.00", costOfGoodsSold: "4.00" },
        runtimeFingerprint: runtime.manifest.runtimeFingerprint,
        currency: "USD",
      }),
    );
  }
  return performance.now() - started;
}

function roundMetric(value: number): number {
  return Math.round(value * 1000) / 1000;
}
