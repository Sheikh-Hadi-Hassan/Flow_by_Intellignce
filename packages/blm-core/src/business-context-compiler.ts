import {
  blmBusinessDecisionPatternsV1,
  blmBusinessDiagnosticPatternsV1,
  blmBusinessPsychologyInsightsV1,
  blmExpandedBusinessRelationshipsV1,
  blmExpandedDomainPacksV1,
  type BusinessDecisionPattern,
  type BusinessDiagnosticPattern,
  type BusinessPsychologyInsightDefinition,
  type ExpandedBusinessDomainPack,
  type ExpandedBusinessRelationship,
} from "@flow/blm-contracts";
import {
  blmBusinessBrainProofPacksV1,
  type BusinessProfile,
  type BusinessSkillDefinition,
  type BusinessKnowledgeProvenance,
} from "@flow/blm-contracts";
import type { SkillRelease } from "@flow/blm-contracts";
import type { ActorContext, WorkspaceContext } from "@flow/contracts";
import {
  toSemanticId,
  validateSemanticId,
  type SemanticId,
} from "@flow/blm-contracts";
import { InMemoryBusinessLogicRegistry } from "./business-logic-registry.js";
import { stableFingerprint } from "./knowledge-acquisition.js";

export type BusinessTaskType =
  | "QUESTION"
  | "ANALYSIS"
  | "DRAFT"
  | "CALCULATION"
  | "DIAGNOSTIC"
  | "READ_OPERATION"
  | "MUTATION_REQUEST"
  | "PLANNING"
  | "DECISION_SUPPORT";

export type BusinessContextChannel =
  "TEXT" | "VOICE" | "UI" | "API" | "AUTOMATION" | "AGENT";

export type ContextInclusionReason =
  | "EXPLICIT_REFERENCE"
  | "TASK_DOMAIN"
  | "SKILL_REQUIREMENT"
  | "PROCESS_DEPENDENCY"
  | "FORMULA_DEPENDENCY"
  | "DIAGNOSTIC_REQUIREMENT"
  | "POLICY_REQUIREMENT"
  | "RELATIONSHIP_EXPANSION"
  | "AUTHORIZED_RECORD"
  | "BUSINESS_PROFILE";

export interface BusinessTaskEnvelope {
  readonly taskType: BusinessTaskType;
  readonly taskKey?: string;
  readonly requestedTask: string;
  readonly intent?: string;
}

export interface BusinessContextBudget {
  readonly maxDomains: number;
  readonly maxConcepts: number;
  readonly maxRelationships: number;
  readonly maxRecords: number;
  readonly maxSkills: number;
  readonly maxRules: number;
  readonly maxFormulas: number;
  readonly maxMetrics: number;
  readonly maxEvidence: number;
  readonly maxEstimatedCharacters: number;
  readonly maxRelationshipDepth: number;
}

export interface BusinessContextRequest {
  readonly workspace: WorkspaceContext;
  readonly actor: ActorContext;
  readonly task: BusinessTaskEnvelope;
  readonly referencedConceptIds: readonly SemanticId[];
  readonly referencedRecordIds?: readonly string[];
  readonly requestedDomainIds?: readonly SemanticId[];
  readonly requestedSkillIds?: readonly SemanticId[];
  readonly requestedCapabilityIds?: readonly SemanticId[];
  readonly channel: BusinessContextChannel;
  readonly budget?: Partial<BusinessContextBudget>;
  readonly knowledgeReleaseId: string;
  readonly workspaceContextVersion?: string;
}

export interface WorkspaceBusinessPolicy {
  readonly policyId: string;
  readonly workspaceId: string;
  readonly semanticId: SemanticId;
  readonly name: string;
  readonly value: string | number | boolean;
  readonly version: string;
  readonly requiredPermission?: string;
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface BusinessRecordField {
  readonly key: string;
  readonly value: string | number | boolean;
  readonly sensitive?: boolean;
  readonly requiredPermission?: string;
}

export type RedactedBusinessRecordValue = string | number | boolean;

export interface BusinessRecordSnapshot {
  readonly recordId: string;
  readonly workspaceId: string;
  readonly semanticId: SemanticId;
  readonly label: string;
  readonly version: string;
  readonly requiredPermission: string;
  readonly fields: readonly BusinessRecordField[];
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface RedactedBusinessRecord {
  readonly recordId: string;
  readonly semanticId: SemanticId;
  readonly label: string;
  readonly version: string;
  readonly fields: Readonly<Record<string, RedactedBusinessRecordValue>>;
  readonly redactions: readonly {
    readonly field: string;
    readonly reason: string;
    readonly requiredPermission?: string;
  }[];
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface BusinessProfileProvider {
  getBusinessProfile(input: {
    readonly workspaceId: string;
  }): BusinessProfile | undefined;
}

export interface BusinessPolicyProvider {
  listPolicies(input: {
    readonly workspaceId: string;
    readonly semanticIds: readonly SemanticId[];
    readonly actor: ActorContext;
  }): readonly WorkspaceBusinessPolicy[];
}

export interface BusinessRecordProvider {
  listAuthorizedRecords(input: {
    readonly workspaceId: string;
    readonly actor: ActorContext;
    readonly semanticIds: readonly SemanticId[];
    readonly recordIds?: readonly string[];
    readonly limit: number;
  }): readonly BusinessRecordSnapshot[];
}

export interface CompiledBusinessSkill {
  readonly semanticId: SemanticId;
  readonly skillVersion?: string;
  readonly executionAuthority: string;
  readonly requiredPermissions: readonly string[];
  readonly requiredLogicIds: readonly SemanticId[];
  readonly requiredERPCapabilities: readonly string[];
  readonly approvalPolicy: string;
  readonly bindingAvailability: "KNOWN" | "UNBOUND";
  readonly inclusionReason: ContextInclusionReason;
}

export interface BusinessSkillContextProvider {
  listApplicableSkills(input: {
    readonly workspaceId: string;
    readonly requestedSkillIds: readonly SemanticId[];
    readonly actor: ActorContext;
  }): readonly SkillRelease[];
}

export interface BusinessContextInclusion {
  readonly semanticId?: SemanticId;
  readonly recordId?: string;
  readonly reason: ContextInclusionReason;
  readonly detail: string;
}

export interface CompiledBusinessContextBundle {
  readonly bundleId: string;
  readonly knowledgeReleaseId: string;
  readonly task: BusinessTaskEnvelope;
  readonly actor: {
    readonly actorId: string;
    readonly userId: string;
    readonly membershipId: string;
    readonly roleIds: readonly string[];
    readonly permissionIds: readonly string[];
    readonly requestSource: string;
  };
  readonly workspace: WorkspaceContext;
  readonly businessProfileSummary?: {
    readonly businessType: string;
    readonly billingModel?: string;
    readonly salesModel?: string;
    readonly requiredCapabilityIds: readonly SemanticId[];
    readonly approvalRequirements: readonly string[];
  };
  readonly relevantDomains: readonly ExpandedBusinessDomainPack[];
  readonly relevantConceptIds: readonly SemanticId[];
  readonly relevantRelationships: readonly ExpandedBusinessRelationship[];
  readonly relevantProcessPatternIds: readonly SemanticId[];
  readonly relevantMetricIds: readonly SemanticId[];
  readonly relevantFormulaIds: readonly SemanticId[];
  readonly relevantRuleIds: readonly SemanticId[];
  readonly relevantLogicIds: readonly SemanticId[];
  readonly relevantPsychologyInsights: readonly BusinessPsychologyInsightDefinition[];
  readonly relevantDiagnosticPatterns: readonly BusinessDiagnosticPattern[];
  readonly relevantDecisionPatterns: readonly BusinessDecisionPattern[];
  readonly availableBusinessSkills: readonly CompiledBusinessSkill[];
  readonly workspacePolicies: readonly WorkspaceBusinessPolicy[];
  readonly authorizedRecords: readonly RedactedBusinessRecord[];
  readonly authorityConstraints: readonly string[];
  readonly contextLimits: BusinessContextBudget;
  readonly inclusionReasons: readonly BusinessContextInclusion[];
  readonly provenance: readonly BusinessKnowledgeProvenance[];
  readonly fingerprint: string;
  readonly compilerExplanation: string;
}

export const defaultBusinessContextBudget: BusinessContextBudget = {
  maxDomains: 4,
  maxConcepts: 24,
  maxRelationships: 16,
  maxRecords: 8,
  maxSkills: 8,
  maxRules: 8,
  maxFormulas: 8,
  maxMetrics: 10,
  maxEvidence: 8,
  maxEstimatedCharacters: 24_000,
  maxRelationshipDepth: 2,
};

export class InMemoryBusinessProfileProvider implements BusinessProfileProvider {
  constructor(private readonly profiles: readonly BusinessProfile[]) {}

  getBusinessProfile(input: {
    readonly workspaceId: string;
  }): BusinessProfile | undefined {
    return this.profiles.find(
      (profile) => profile.workspaceId === input.workspaceId,
    );
  }
}

export class InMemoryBusinessPolicyProvider implements BusinessPolicyProvider {
  constructor(private readonly policies: readonly WorkspaceBusinessPolicy[]) {}

  listPolicies(input: {
    readonly workspaceId: string;
    readonly semanticIds: readonly SemanticId[];
    readonly actor: ActorContext;
  }): readonly WorkspaceBusinessPolicy[] {
    return this.policies.filter(
      (policy) =>
        policy.workspaceId === input.workspaceId &&
        input.semanticIds.includes(policy.semanticId) &&
        (!policy.requiredPermission ||
          input.actor.permissionIds.includes(policy.requiredPermission)),
    );
  }
}

export class InMemoryBusinessRecordProvider implements BusinessRecordProvider {
  constructor(private readonly records: readonly BusinessRecordSnapshot[]) {}

  listAuthorizedRecords(input: {
    readonly workspaceId: string;
    readonly actor: ActorContext;
    readonly semanticIds: readonly SemanticId[];
    readonly recordIds?: readonly string[];
    readonly limit: number;
  }): readonly BusinessRecordSnapshot[] {
    return this.records
      .filter(
        (record) =>
          record.workspaceId === input.workspaceId &&
          input.semanticIds.includes(record.semanticId) &&
          input.actor.permissionIds.includes(record.requiredPermission) &&
          (!input.recordIds || input.recordIds.includes(record.recordId)),
      )
      .slice(0, input.limit);
  }
}

export class BusinessContextCompiler {
  constructor(
    private readonly providers: {
      readonly businessProfileProvider: BusinessProfileProvider;
      readonly policyProvider: BusinessPolicyProvider;
      readonly recordProvider: BusinessRecordProvider;
      readonly skillProvider?: BusinessSkillContextProvider;
    },
  ) {}

  compile(request: BusinessContextRequest): CompiledBusinessContextBundle {
    validateBusinessContextRequest(request);
    const budget = { ...defaultBusinessContextBudget, ...request.budget };
    const inclusionReasons: BusinessContextInclusion[] = [];
    const selectedDomainIds = selectDomainIds(
      request,
      inclusionReasons,
      budget,
    );
    const domains = selectedDomainIds
      .map((domainId) =>
        blmExpandedDomainPacksV1.find((domain) => domain.domainId === domainId),
      )
      .filter(
        (domain): domain is ExpandedBusinessDomainPack => domain !== undefined,
      )
      .slice(0, budget.maxDomains);
    const taskSpecificConceptIds = uniqueSemanticIds([
      ...taskConceptHintsFor(request),
      ...diagnosticConceptsFor(request, domains),
      ...decisionConceptsFor(request, domains),
      ...skillsFromProvider(this.providers.skillProvider, request).flatMap(
        (skill) => skill.requiredConceptIds,
      ),
    ]);
    const explicitlyExpandedConceptIds = expandConcepts(
      uniqueSemanticIds([
        ...request.referencedConceptIds,
        ...taskSpecificConceptIds,
      ]),
      budget.maxRelationshipDepth,
    );
    const seededConceptIds = uniqueSemanticIds([
      ...request.referencedConceptIds,
      ...taskSpecificConceptIds,
      ...explicitlyExpandedConceptIds,
      ...domains.flatMap((domain) => domain.conceptIds.slice(0, 8)),
    ]);
    const expandedConceptIds = filterConceptsBySelectedDomains(
      expandConcepts(seededConceptIds, budget.maxRelationshipDepth),
      domains,
      allowsCrossDomainExpansion(request),
    ).slice(0, budget.maxConcepts);
    for (const conceptId of request.referencedConceptIds) {
      inclusionReasons.push({
        semanticId: conceptId,
        reason: "EXPLICIT_REFERENCE",
        detail: "Explicit request concept reference.",
      });
    }
    const relationships = blmExpandedBusinessRelationshipsV1
      .filter(
        (relationship) =>
          expandedConceptIds.includes(relationship.sourceConceptId) ||
          expandedConceptIds.includes(relationship.targetConceptId),
      )
      .slice(0, budget.maxRelationships);
    for (const relationship of relationships) {
      inclusionReasons.push({
        semanticId: relationship.semanticId,
        reason: "RELATIONSHIP_EXPANSION",
        detail: relationship.description,
      });
    }
    const diagnostics = selectDiagnostics(request, expandedConceptIds);
    const decisions = selectDecisions(request, expandedConceptIds);
    const psychology = selectPsychology(request, expandedConceptIds);
    const skillReleases = skillsFromProvider(
      this.providers.skillProvider,
      request,
    );
    const skills = selectSkills(
      request,
      domains,
      expandedConceptIds,
      skillReleases,
    ).slice(0, budget.maxSkills);
    const formulas = uniqueSemanticIds([
      ...domains.flatMap((domain) => domain.formulaIds),
      ...(request.task.taskType === "CALCULATION"
        ? domains.flatMap((domain) => domain.formulaIds)
        : []),
    ]).slice(0, budget.maxFormulas);
    const rules = uniqueSemanticIds([
      ...domains.flatMap((domain) => domain.ruleIds),
      ...policySemanticIdsFor(request),
    ]).slice(0, budget.maxRules);
    const metrics = uniqueSemanticIds([
      ...taskMetricHintsFor(request),
      ...diagnostics.flatMap((diagnostic) => diagnostic.relatedMetricIds),
      ...domains.flatMap((domain) => domain.metricIds),
    ]).slice(0, budget.maxMetrics);
    const relevantLogicIds = uniqueSemanticIds([
      ...new InMemoryBusinessLogicRegistry().relevantLogicIdsFor({
        conceptIds: expandedConceptIds,
        domainIds: domains.map((domain) => domain.domainId),
        asOf: "2026-08-11",
        workspaceId: request.workspace.workspaceId,
        ...optionalBusinessType(
          profileBusinessTypeFor(
            this.providers.businessProfileProvider.getBusinessProfile({
              workspaceId: request.workspace.workspaceId,
            }),
          ),
        ),
      }),
      ...skillReleases.flatMap((skill) => skill.requiredLogicIds),
    ]);
    const policies = this.providers.policyProvider.listPolicies({
      workspaceId: request.workspace.workspaceId,
      semanticIds: uniqueSemanticIds([...expandedConceptIds, ...rules]),
      actor: request.actor,
    });
    for (const policy of policies) {
      inclusionReasons.push({
        semanticId: policy.semanticId,
        reason: "POLICY_REQUIREMENT",
        detail: policy.name,
      });
    }
    const records = this.providers.recordProvider
      .listAuthorizedRecords(
        request.referencedRecordIds
          ? {
              workspaceId: request.workspace.workspaceId,
              actor: request.actor,
              semanticIds: expandedConceptIds,
              recordIds: request.referencedRecordIds,
              limit: budget.maxRecords,
            }
          : {
              workspaceId: request.workspace.workspaceId,
              actor: request.actor,
              semanticIds: expandedConceptIds,
              limit: budget.maxRecords,
            },
      )
      .map((record) => redactRecord(record, request.actor));
    for (const record of records) {
      inclusionReasons.push({
        recordId: record.recordId,
        reason: "AUTHORIZED_RECORD",
        detail:
          "Authorized workspace record included after permission filtering.",
      });
    }
    const profile = this.providers.businessProfileProvider.getBusinessProfile({
      workspaceId: request.workspace.workspaceId,
    });
    const profileSummary = profile
      ? summarizeProfile(profile, expandedConceptIds)
      : undefined;
    if (profileSummary) {
      inclusionReasons.push({
        reason: "BUSINESS_PROFILE",
        detail: "Relevant BusinessProfile fields included.",
      });
    }
    const provenance = [
      ...domains.map((domain) => domain.provenance),
      ...psychology.map((item) => item.provenance),
      ...diagnostics.map((item) => item.provenance),
      ...decisions.map((item) => item.provenance),
      ...records.map((item) => item.provenance),
      ...policies.map((item) => item.provenance),
    ];
    const fingerprintInput = {
      knowledgeReleaseId: request.knowledgeReleaseId,
      workspaceId: request.workspace.workspaceId,
      workspaceContextVersion: request.workspaceContextVersion,
      task: request.task,
      channel: request.channel,
      actor: {
        actorId: request.actor.actorId,
        membershipId: request.actor.membershipId,
        roles: request.actor.roleIds,
        permissions: request.actor.permissionIds,
      },
      domains: domains.map((domain) => domain.domainId),
      concepts: expandedConceptIds,
      records: records.map((record) => ({
        recordId: record.recordId,
        version: record.version,
        redactions: record.redactions.map((redaction) => redaction.field),
      })),
      policies: policies.map((policy) => ({
        policyId: policy.policyId,
        version: policy.version,
      })),
      skills: skills.map((skill) => skill.semanticId),
      logic: relevantLogicIds,
    };
    return {
      bundleId: `context:${stableFingerprint(fingerprintInput)}`,
      knowledgeReleaseId: request.knowledgeReleaseId,
      task: request.task,
      actor: {
        actorId: request.actor.actorId,
        userId: request.actor.userId,
        membershipId: request.actor.membershipId,
        roleIds: request.actor.roleIds,
        permissionIds: request.actor.permissionIds,
        requestSource: request.actor.requestSource,
      },
      workspace: request.workspace,
      ...(profileSummary ? { businessProfileSummary: profileSummary } : {}),
      relevantDomains: domains,
      relevantConceptIds: expandedConceptIds,
      relevantRelationships: relationships,
      relevantProcessPatternIds: uniqueSemanticIds(
        domains.flatMap((domain) => domain.processPatternIds),
      ),
      relevantMetricIds: metrics,
      relevantFormulaIds: formulas,
      relevantRuleIds: rules,
      relevantLogicIds,
      relevantPsychologyInsights: psychology,
      relevantDiagnosticPatterns: diagnostics,
      relevantDecisionPatterns: decisions,
      availableBusinessSkills: skills,
      workspacePolicies: policies,
      authorizedRecords: records,
      authorityConstraints: [
        "Knowledge is not execution authority.",
        "Mutations require Action Wall authorization.",
        "Deterministic calculations require deterministic engine authority.",
        "Unauthorized records and restricted fields are excluded before model context.",
      ],
      contextLimits: budget,
      inclusionReasons,
      provenance,
      fingerprint: stableFingerprint(fingerprintInput),
      compilerExplanation:
        "Context selected deterministically from task metadata, explicit references, domain packs, bounded relationships, provider-authorized records, policies, and budget limits.",
    };
  }
}

export function validateBusinessContextRequest(
  request: BusinessContextRequest,
): void {
  if (request.workspace.workspaceId !== request.actor.workspace.workspaceId) {
    throw new Error(
      "BusinessContextRequest actor and request workspace must match.",
    );
  }
  if (request.task.requestedTask.trim().length === 0) {
    throw new Error("BusinessContextRequest task is required.");
  }
  for (const semanticId of [
    ...request.referencedConceptIds,
    ...(request.requestedDomainIds ?? []),
    ...(request.requestedSkillIds ?? []),
    ...(request.requestedCapabilityIds ?? []),
  ]) {
    validateSemanticId(semanticId);
  }
}

function selectDomainIds(
  request: BusinessContextRequest,
  inclusionReasons: BusinessContextInclusion[],
  budget: BusinessContextBudget,
): readonly SemanticId[] {
  const selected = new Set<SemanticId>(request.requestedDomainIds ?? []);
  for (const domain of blmExpandedDomainPacksV1) {
    if (
      request.referencedConceptIds.some((conceptId) =>
        domain.conceptIds.includes(conceptId),
      )
    ) {
      selected.add(domain.domainId);
      inclusionReasons.push({
        semanticId: domain.domainId,
        reason: "EXPLICIT_REFERENCE",
        detail: "Domain selected from explicit concept reference.",
      });
    }
  }
  for (const domainId of domainHintsForTask(request)) {
    selected.add(domainId);
    inclusionReasons.push({
      semanticId: domainId,
      reason: "TASK_DOMAIN",
      detail: "Domain selected from explicit task envelope.",
    });
  }
  for (const domainId of patternDomainHintsForTask(request)) {
    selected.add(domainId);
    inclusionReasons.push({
      semanticId: domainId,
      reason:
        request.task.taskType === "DIAGNOSTIC"
          ? "DIAGNOSTIC_REQUIREMENT"
          : "SKILL_REQUIREMENT",
      detail: "Domain selected from business pattern requirements.",
    });
  }
  if (allowsCrossDomainExpansion(request)) {
    const expandedByRelationships = expandDomainIds([...selected], request);
    for (const domainId of expandedByRelationships) selected.add(domainId);
  }
  return [...selected].slice(0, budget.maxDomains);
}

function allowsCrossDomainExpansion(request: BusinessContextRequest): boolean {
  return ["ANALYSIS", "DIAGNOSTIC", "DECISION_SUPPORT", "PLANNING"].includes(
    request.task.taskType,
  );
}

function domainHintsForTask(
  request: BusinessContextRequest,
): readonly SemanticId[] {
  const key =
    `${request.task.taskKey ?? ""} ${request.task.requestedTask}`.toLowerCase();
  const ids: SemanticId[] = [];
  if (
    key.includes("invoice") ||
    key.includes("cash") ||
    key.includes("margin")
  ) {
    ids.push(toSemanticId("flow.concept.blm.domain.finance-accounting"));
  }
  if (
    key.includes("customer") ||
    key.includes("sales") ||
    key.includes("lead") ||
    key.includes("discount")
  ) {
    ids.push(toSemanticId("flow.concept.blm.domain.crm-sales"));
  }
  if (key.includes("contract") || key.includes("payment terms")) {
    ids.push(
      toSemanticId("flow.concept.blm.domain.commercial-documents-contracts"),
    );
  }
  if (
    key.includes("stock") ||
    key.includes("inventory") ||
    key.includes("fulfill") ||
    key.includes("warehouse") ||
    key.includes("reservation") ||
    key.includes("order")
  ) {
    ids.push(toSemanticId("flow.concept.blm.domain.inventory-logistics"));
  }
  if (
    key.includes("campaign") ||
    key.includes("conversion") ||
    key.includes("revenue falling")
  ) {
    ids.push(toSemanticId("flow.concept.blm.domain.marketing-growth"));
  }
  if (key.includes("project") || key.includes("utilization")) {
    ids.push(
      toSemanticId("flow.concept.blm.domain.projects-service-operations"),
    );
  }
  if (
    key.includes("kpi") ||
    key.includes("variance") ||
    key.includes("diagnostic")
  ) {
    ids.push(
      toSemanticId("flow.concept.blm.domain.analytics-strategy-planning"),
    );
  }
  if (
    key.includes("pricing") ||
    key.includes("price") ||
    key.includes("discount")
  ) {
    ids.push(toSemanticId("flow.concept.blm.domain.product-catalog-pricing"));
  }
  if (key.includes("price is too high") || key.includes("objection")) {
    ids.push(toSemanticId("flow.concept.blm.domain.customer-sales-psychology"));
  }
  return ids;
}

function patternDomainHintsForTask(
  request: BusinessContextRequest,
): readonly SemanticId[] {
  if (request.task.taskType === "DIAGNOSTIC") {
    return selectDiagnostics(request, request.referencedConceptIds).flatMap(
      (pattern) => pattern.relatedDomainIds,
    );
  }
  if (request.task.taskType === "DECISION_SUPPORT") {
    const matchingDecisionInputs = selectDecisions(
      request,
      request.referencedConceptIds,
    ).flatMap((pattern) => pattern.inputConceptIds);
    return blmExpandedDomainPacksV1
      .filter((domain) =>
        domain.conceptIds.some((conceptId) =>
          matchingDecisionInputs.includes(conceptId),
        ),
      )
      .map((domain) => domain.domainId);
  }
  return [];
}

function taskConceptHintsFor(
  request: BusinessContextRequest,
): readonly SemanticId[] {
  const key =
    `${request.task.taskKey ?? ""} ${request.task.requestedTask}`.toLowerCase();
  const ids: SemanticId[] = [];
  if (key.includes("invoice") || key.includes("unpaid")) {
    ids.push(
      toSemanticId("flow.concept.finance.invoice"),
      toSemanticId("flow.concept.finance.receivable"),
      toSemanticId("flow.concept.finance.payment"),
    );
  }
  if (key.includes("customer") || key.includes("client")) {
    ids.push(toSemanticId("flow.concept.crm.customer"));
  }
  if (key.includes("payment terms") || key.includes("contract")) {
    ids.push(
      toSemanticId("flow.concept.commercial-document.contract"),
      toSemanticId("flow.concept.commercial-document.clause"),
      toSemanticId("flow.concept.commercial-document.obligation"),
    );
  }
  if (
    key.includes("stock") ||
    key.includes("inventory") ||
    key.includes("warehouse")
  ) {
    ids.push(
      toSemanticId("flow.concept.inventory.stock-on-hand"),
      toSemanticId("flow.concept.inventory.reserved-stock"),
      toSemanticId("flow.concept.inventory.available-stock"),
      toSemanticId("flow.concept.inventory.warehouse"),
    );
  }
  if (key.includes("reservation") || key.includes("reserved")) {
    ids.push(toSemanticId("flow.concept.inventory.reservation"));
  }
  if (key.includes("project margin")) {
    ids.push(
      toSemanticId("flow.concept.project.project-margin"),
      toSemanticId("flow.concept.project.project-revenue"),
      toSemanticId("flow.concept.project.project-cost"),
      toSemanticId("flow.concept.project.billable-time"),
      toSemanticId("flow.concept.project.utilization"),
      toSemanticId("flow.concept.project.scope"),
    );
  }
  return ids;
}

function taskMetricHintsFor(
  request: BusinessContextRequest,
): readonly SemanticId[] {
  const key =
    `${request.task.taskKey ?? ""} ${request.task.requestedTask}`.toLowerCase();
  const ids: SemanticId[] = [];
  if (
    key.includes("invoice") ||
    key.includes("receivable") ||
    key.includes("unpaid")
  ) {
    ids.push(toSemanticId("flow.decision.metric.finance.ar-aging"));
  }
  if (key.includes("conversion")) {
    ids.push(toSemanticId("flow.decision.metric.marketing.conversion-rate"));
  }
  if (key.includes("sales cycle")) {
    ids.push(toSemanticId("flow.decision.metric.crm.sales-cycle-length"));
  }
  if (key.includes("billable utilization")) {
    ids.push(toSemanticId("flow.decision.metric.project.billable-utilization"));
  }
  return ids;
}

function expandDomainIds(
  domainIds: readonly SemanticId[],
  request: BusinessContextRequest,
): readonly SemanticId[] {
  const selectedConcepts = blmExpandedDomainPacksV1
    .filter((domain) => domainIds.includes(domain.domainId))
    .flatMap((domain) => domain.conceptIds);
  const relatedConcepts = blmExpandedBusinessRelationshipsV1
    .filter(
      (relationship) =>
        relationship.crossDomain &&
        (selectedConcepts.includes(relationship.sourceConceptId) ||
          selectedConcepts.includes(relationship.targetConceptId)),
    )
    .flatMap((relationship) => [
      relationship.sourceConceptId,
      relationship.targetConceptId,
    ]);
  return blmExpandedDomainPacksV1
    .filter((domain) =>
      domain.conceptIds.some(
        (conceptId) =>
          relatedConcepts.includes(conceptId) ||
          request.referencedConceptIds.includes(conceptId),
      ),
    )
    .map((domain) => domain.domainId);
}

function expandConcepts(
  seedConceptIds: readonly SemanticId[],
  maxDepth: number,
): readonly SemanticId[] {
  const selected = new Set(seedConceptIds);
  let frontier = new Set(seedConceptIds);
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next = new Set<SemanticId>();
    for (const relationship of blmExpandedBusinessRelationshipsV1) {
      if (frontier.has(relationship.sourceConceptId))
        next.add(relationship.targetConceptId);
      if (frontier.has(relationship.targetConceptId))
        next.add(relationship.sourceConceptId);
    }
    for (const conceptId of next) selected.add(conceptId);
    frontier = next;
  }
  return [...selected];
}

function filterConceptsBySelectedDomains(
  conceptIds: readonly SemanticId[],
  domains: readonly ExpandedBusinessDomainPack[],
  allowCrossDomain: boolean,
): readonly SemanticId[] {
  if (allowCrossDomain) return conceptIds;
  const selectedConceptIds = new Set(
    domains.flatMap((domain) => domain.conceptIds),
  );
  return conceptIds.filter((conceptId) => selectedConceptIds.has(conceptId));
}

function diagnosticConceptsFor(
  request: BusinessContextRequest,
  domains: readonly ExpandedBusinessDomainPack[],
): readonly SemanticId[] {
  if (request.task.taskType !== "DIAGNOSTIC") return [];
  return selectDiagnostics(
    request,
    domains.flatMap((domain) => domain.conceptIds),
  ).flatMap((pattern) => pattern.investigationConceptIds);
}

function decisionConceptsFor(
  request: BusinessContextRequest,
  domains: readonly ExpandedBusinessDomainPack[],
): readonly SemanticId[] {
  if (request.task.taskType !== "DECISION_SUPPORT") return [];
  return selectDecisions(
    request,
    domains.flatMap((domain) => domain.conceptIds),
  ).flatMap((pattern) => pattern.inputConceptIds);
}

function selectDiagnostics(
  request: BusinessContextRequest,
  conceptIds: readonly SemanticId[],
): readonly BusinessDiagnosticPattern[] {
  if (request.task.taskType !== "DIAGNOSTIC") return [];
  const key =
    `${request.task.taskKey ?? ""} ${request.task.requestedTask}`.toLowerCase();
  const explicitMatches = blmBusinessDiagnosticPatternsV1.filter((pattern) => {
    const patternSlug = pattern.semanticId.split(".").at(-1) ?? "";
    const nameSlug = pattern.name.toLowerCase().replaceAll(" ", "-");
    return (
      request.task.taskKey === patternSlug ||
      request.task.taskKey === nameSlug ||
      key.includes(nameSlug) ||
      key.includes(pattern.name.toLowerCase())
    );
  });
  if (explicitMatches.length > 0) return explicitMatches;
  return blmBusinessDiagnosticPatternsV1.filter((pattern) =>
    pattern.investigationConceptIds.some((conceptId) =>
      conceptIds.includes(conceptId),
    ),
  );
}

function selectDecisions(
  request: BusinessContextRequest,
  conceptIds: readonly SemanticId[],
): readonly BusinessDecisionPattern[] {
  if (request.task.taskType !== "DECISION_SUPPORT") return [];
  const key =
    `${request.task.taskKey ?? ""} ${request.task.requestedTask}`.toLowerCase();
  return blmBusinessDecisionPatternsV1.filter(
    (pattern) =>
      key.includes(pattern.name.toLowerCase().replaceAll(" ", "-")) ||
      key.includes("discount") ||
      pattern.inputConceptIds.some((conceptId) =>
        conceptIds.includes(conceptId),
      ),
  );
}

function selectPsychology(
  request: BusinessContextRequest,
  conceptIds: readonly SemanticId[],
): readonly BusinessPsychologyInsightDefinition[] {
  const key = request.task.requestedTask.toLowerCase();
  if (
    !key.includes("price") &&
    !key.includes("objection") &&
    !key.includes("customer says")
  ) {
    return [];
  }
  return blmBusinessPsychologyInsightsV1
    .filter(
      (insight) =>
        insight.observedSignals.some((signal) => key.includes(signal)) ||
        insight.applicableDomainIds.some((domainId) =>
          blmExpandedDomainPacksV1
            .find((domain) => domain.domainId === domainId)
            ?.conceptIds.some((conceptId) => conceptIds.includes(conceptId)),
        ),
    )
    .slice(0, 4);
}

function selectSkills(
  request: BusinessContextRequest,
  domains: readonly ExpandedBusinessDomainPack[],
  conceptIds: readonly SemanticId[],
  skillReleases: readonly SkillRelease[],
): readonly CompiledBusinessSkill[] {
  const knownSkills = blmBusinessBrainProofPacksV1.flatMap(
    (pack) => pack.skills,
  );
  const domainIds = domains.map((domain) => domain.domainId);
  const released = skillReleases
    .filter(
      (skill) =>
        skill.domainIds.some((domainId) => domainIds.includes(domainId)) ||
        skill.requiredConceptIds.some((conceptId) =>
          conceptIds.includes(conceptId),
        ) ||
        request.requestedSkillIds?.includes(skill.skillId),
    )
    .map((skill) => compileReleasedSkill(skill));
  const known = knownSkills
    .filter(
      (skill) =>
        (domainIds.includes(skill.domainPackId) &&
          skill.conceptIds.some((conceptId) =>
            conceptIds.includes(conceptId),
          )) ||
        request.requestedCapabilityIds?.some((capabilityId) =>
          skill.capabilityIds.includes(capabilityId),
        ),
    )
    .map((skill) => compileKnownSkill(skill));
  const expanded = domains
    .flatMap((domain) => domain.skillIds)
    .filter(
      (skillId) =>
        !released.some((skill) => skill.semanticId === skillId) &&
        !known.some((skill) => skill.semanticId === skillId),
    )
    .map((skillId) => ({
      semanticId: skillId,
      executionAuthority: "KNOWLEDGE_ONLY",
      requiredPermissions: [],
      requiredLogicIds: [],
      requiredERPCapabilities: [],
      approvalPolicy: "NONE",
      bindingAvailability: "UNBOUND" as const,
      inclusionReason: "TASK_DOMAIN" as const,
    }));
  return [...released, ...known, ...expanded];
}

function compileKnownSkill(
  skill: BusinessSkillDefinition,
): CompiledBusinessSkill {
  return {
    semanticId: skill.semanticId,
    executionAuthority: skill.executionAuthority,
    requiredPermissions: skill.requiredPermissions,
    requiredLogicIds: [],
    requiredERPCapabilities: [],
    approvalPolicy: skill.approvalPolicy,
    bindingAvailability:
      skill.actionBinding || skill.toolBinding ? "KNOWN" : "UNBOUND",
    inclusionReason: "SKILL_REQUIREMENT",
  };
}

function compileReleasedSkill(skill: SkillRelease): CompiledBusinessSkill {
  return {
    semanticId: skill.skillId,
    skillVersion: skill.version,
    executionAuthority: skill.authority,
    requiredPermissions: skill.requiredPolicyIds,
    requiredLogicIds: skill.requiredLogicIds,
    requiredERPCapabilities: skill.requiredERPCapabilities.map(
      (capability) => capability.capabilityId,
    ),
    approvalPolicy: skill.policyRequirements.join(",") || "NONE",
    bindingAvailability: "KNOWN",
    inclusionReason: "SKILL_REQUIREMENT",
  };
}

function skillsFromProvider(
  provider: BusinessSkillContextProvider | undefined,
  request: BusinessContextRequest,
): readonly SkillRelease[] {
  if (!provider) return [];
  return provider.listApplicableSkills({
    workspaceId: request.workspace.workspaceId,
    requestedSkillIds: request.requestedSkillIds ?? [],
    actor: request.actor,
  });
}

function policySemanticIdsFor(
  request: BusinessContextRequest,
): readonly SemanticId[] {
  const key = request.task.requestedTask.toLowerCase();
  if (key.includes("discount"))
    return [toSemanticId("flow.concept.pricing.pricing-rule")];
  if (key.includes("invoice"))
    return [toSemanticId("flow.concept.finance.invoice")];
  return [];
}

function redactRecord(
  record: BusinessRecordSnapshot,
  actor: ActorContext,
): RedactedBusinessRecord {
  const fields: Record<string, RedactedBusinessRecordValue> = {};
  const redactions: {
    readonly field: string;
    readonly reason: string;
    readonly requiredPermission?: string;
  }[] = [];
  for (const field of record.fields) {
    const allowed =
      !field.requiredPermission ||
      actor.permissionIds.includes(field.requiredPermission);
    if (field.sensitive && !allowed) {
      fields[field.key] = "[REDACTED]";
      redactions.push({
        field: field.key,
        reason: "Actor lacks field permission.",
        ...(field.requiredPermission
          ? { requiredPermission: field.requiredPermission }
          : {}),
      });
    } else {
      fields[field.key] = field.value;
    }
  }
  return {
    recordId: record.recordId,
    semanticId: record.semanticId,
    label: record.label,
    version: record.version,
    fields,
    redactions,
    provenance: record.provenance,
  };
}

function summarizeProfile(
  profile: BusinessProfile,
  conceptIds: readonly SemanticId[],
): CompiledBusinessContextBundle["businessProfileSummary"] {
  const includesSalesOrFinance = conceptIds.some(
    (conceptId) =>
      conceptId.includes(".crm.") || conceptId.includes(".finance."),
  );
  return {
    businessType: profile.businessType,
    ...(includesSalesOrFinance && profile.billingModel
      ? { billingModel: profile.billingModel }
      : {}),
    ...(includesSalesOrFinance && profile.salesModel
      ? { salesModel: profile.salesModel }
      : {}),
    requiredCapabilityIds: profile.requiredCapabilityIds,
    approvalRequirements: profile.approvalRequirements,
  };
}

function profileBusinessTypeFor(
  profile: BusinessProfile | undefined,
): string | undefined {
  return profile?.businessType;
}

function optionalBusinessType(businessType: string | undefined): {
  readonly businessType?: string;
} {
  return businessType ? { businessType } : {};
}

function uniqueSemanticIds(
  values: readonly SemanticId[],
): readonly SemanticId[] {
  return [...new Set(values)];
}
