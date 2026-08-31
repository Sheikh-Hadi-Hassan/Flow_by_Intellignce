import {
  toSemanticId,
  type BusinessIntentClass,
  type BusinessLanguageAlias,
  type BusinessLanguageAliasType,
  type BusinessLanguageConcept,
  type BusinessLanguageConceptType,
  type BusinessLanguageContext,
  type BusinessLanguageLifecycleStatus,
  type BusinessLanguageProvenance,
  type BusinessLanguageRelation,
  type BusinessLanguageRelationType,
  type BusinessUtteranceClass,
  type BusinessUtteranceInterpretation,
  type ConceptResolution,
  type ConceptResolutionCandidate,
  type ConceptResolutionStatus,
  type ModelAssistedBusinessLanguageProposal,
  type ModelAssistedBusinessLanguageValidation,
  type SemanticId,
} from "@flow/blm-contracts";

import { stableFingerprint } from "./knowledge-acquisition.js";

const CANONICAL_CREATED_AT = "2026-08-13T00:00:00.000Z";
const DEFAULT_RELEASE_ID = "flow-business-language-universal-v1";

const conceptIds = {
  organization: "flow.concept.organization.business",
  team: "flow.concept.organization.team",
  salesTeam: "flow.concept.organization.sales-team",
  customerSuccessTeam: "flow.concept.organization.customer-success-team",
  employee: "flow.concept.people.employee",
  contact: "flow.concept.people.contact",
  client: "flow.concept.commercial.client",
  prospect: "flow.concept.commercial.prospect",
  lead: "flow.concept.commercial.lead",
  supplier: "flow.concept.commercial.supplier",
  opportunity: "flow.concept.commercial.opportunity",
  quote: "flow.concept.commercial.quote",
  proposal: "flow.concept.commercial.proposal",
  contract: "flow.concept.commercial.contract",
  salesOrder: "flow.concept.commercial.sales-order",
  revenue: "flow.concept.finance.revenue",
  salesPerformance: "flow.concept.commercial.sales-performance",
  price: "flow.concept.commercial.price",
  discount: "flow.concept.commercial.discount",
  cost: "flow.concept.finance.cost",
  profit: "flow.concept.finance.profit",
  grossMargin: "flow.concept.finance.gross-margin",
  netMargin: "flow.concept.finance.net-margin",
  operatingMargin: "flow.concept.finance.operating-margin",
  contributionMargin: "flow.concept.finance.contribution-margin",
  projectMargin: "flow.concept.finance.project-margin",
  clientProfitability: "flow.concept.finance.client-profitability",
  cash: "flow.concept.finance.cash",
  workingCapital: "flow.concept.finance.working-capital",
  receivable: "flow.concept.finance.account-receivable",
  payable: "flow.concept.finance.account-payable",
  invoice: "flow.concept.finance.invoice",
  overdueInvoice: "flow.concept.finance.overdue-invoice",
  payment: "flow.concept.finance.payment",
  collection: "flow.concept.finance.collection",
  expense: "flow.concept.finance.expense",
  project: "flow.concept.operations.project",
  task: "flow.concept.operations.task",
  milestone: "flow.concept.operations.milestone",
  scope: "flow.concept.operations.scope",
  changeRequest: "flow.concept.operations.change-request",
  deliverable: "flow.concept.operations.deliverable",
  scopeVariance: "flow.concept.operations.scope-variance",
  costVariance: "flow.concept.operations.cost-variance",
  timeVariance: "flow.concept.operations.time-variance",
  capacity: "flow.concept.operations.capacity",
  availability: "flow.concept.operations.availability",
  utilization: "flow.concept.operations.utilization",
  workload: "flow.concept.operations.workload",
  inventory: "flow.concept.operations.inventory",
  stock: "flow.concept.operations.stock",
  warehouse: "flow.concept.operations.warehouse",
  fulfillment: "flow.concept.operations.fulfillment",
  purchaseOrder: "flow.concept.operations.purchase-order",
  risk: "flow.concept.control.risk",
  issue: "flow.concept.control.issue",
  approval: "flow.concept.control.approval",
  policy: "flow.concept.control.policy",
  control: "flow.concept.control.control",
  authority: "flow.concept.control.authority",
  execution: "flow.concept.control.execution",
  decision: "flow.concept.control.decision",
  recommendation: "flow.concept.control.recommendation",
  financialRecord: "flow.concept.control.financial-record",
  sendAction: "flow.action.communication.send",
  closeAction: "flow.action.workflow.close",
  calculateAction: "flow.action.analysis.calculate",
  diagnoseAction: "flow.action.analysis.diagnose",
  timeWindow: "flow.concept.time.time-window",
  nextWeek: "flow.concept.time.next-week",
} as const;

export const businessLanguageCoreConceptIds = Object.fromEntries(
  Object.entries(conceptIds).map(([key, value]) => [key, toSemanticId(value)]),
) as Record<keyof typeof conceptIds, SemanticId>;

export interface BusinessLanguageSeed {
  readonly concepts: readonly BusinessLanguageConcept[];
  readonly aliases: readonly BusinessLanguageAlias[];
  readonly relations: readonly BusinessLanguageRelation[];
}

export interface BusinessLanguageRepository {
  saveSeed(seed: BusinessLanguageSeed): Promise<void>;
  loadSeed(): Promise<BusinessLanguageSeed>;
  getConceptById(
    conceptId: SemanticId,
  ): Promise<BusinessLanguageConcept | undefined>;
  getConceptByCanonicalName(
    canonicalName: string,
  ): Promise<BusinessLanguageConcept | undefined>;
  listConcepts(input?: {
    readonly status?: BusinessLanguageLifecycleStatus;
  }): Promise<readonly BusinessLanguageConcept[]>;
  findAliases(input: {
    readonly normalizedAlias: string;
    readonly workspaceId?: string;
    readonly languageTag?: string;
  }): Promise<readonly BusinessLanguageAlias[]>;
  getAliasesForConcept(
    conceptId: SemanticId,
  ): Promise<readonly BusinessLanguageAlias[]>;
  findWorkspaceAliases(input: {
    readonly workspaceId: string;
    readonly normalizedAlias?: string;
  }): Promise<readonly BusinessLanguageAlias[]>;
  getRelationsFrom(
    conceptId: SemanticId,
  ): Promise<readonly BusinessLanguageRelation[]>;
  getRelationsTo(
    conceptId: SemanticId,
  ): Promise<readonly BusinessLanguageRelation[]>;
  persistConcept(concept: BusinessLanguageConcept): Promise<void>;
  persistAlias(alias: BusinessLanguageAlias): Promise<void>;
  persistRelation(relation: BusinessLanguageRelation): Promise<void>;
}

export class InMemoryBusinessLanguageRepository implements BusinessLanguageRepository {
  private seed: BusinessLanguageSeed = {
    concepts: [],
    aliases: [],
    relations: [],
  };

  saveSeed(seed: BusinessLanguageSeed): Promise<void> {
    this.seed = cloneSeed(seed);
    return Promise.resolve();
  }

  loadSeed(): Promise<BusinessLanguageSeed> {
    return Promise.resolve(cloneSeed(this.seed));
  }

  getConceptById(
    conceptId: SemanticId,
  ): Promise<BusinessLanguageConcept | undefined> {
    return Promise.resolve(
      this.seed.concepts.find((concept) => concept.conceptId === conceptId),
    );
  }

  getConceptByCanonicalName(
    canonicalName: string,
  ): Promise<BusinessLanguageConcept | undefined> {
    const normalized = normalizeBusinessText(canonicalName);
    return Promise.resolve(
      this.seed.concepts.find(
        (concept) =>
          normalizeBusinessText(concept.canonicalName) === normalized,
      ),
    );
  }

  listConcepts(
    input: {
      readonly status?: BusinessLanguageLifecycleStatus;
    } = {},
  ): Promise<readonly BusinessLanguageConcept[]> {
    return Promise.resolve(
      this.seed.concepts.filter(
        (concept) => !input.status || concept.lifecycleStatus === input.status,
      ),
    );
  }

  findAliases(input: {
    readonly normalizedAlias: string;
    readonly workspaceId?: string;
    readonly languageTag?: string;
  }): Promise<readonly BusinessLanguageAlias[]> {
    return Promise.resolve(
      this.seed.aliases.filter((alias) => {
        if (alias.normalizedAlias !== input.normalizedAlias) return false;
        if (input.languageTag && alias.languageTag !== input.languageTag) {
          return false;
        }
        return (
          !alias.workspaceScope ||
          alias.workspaceScope.workspaceId === input.workspaceId
        );
      }),
    );
  }

  getAliasesForConcept(
    conceptId: SemanticId,
  ): Promise<readonly BusinessLanguageAlias[]> {
    return Promise.resolve(
      this.seed.aliases.filter((alias) => alias.targetConceptId === conceptId),
    );
  }

  findWorkspaceAliases(input: {
    readonly workspaceId: string;
    readonly normalizedAlias?: string;
  }): Promise<readonly BusinessLanguageAlias[]> {
    return Promise.resolve(
      this.seed.aliases.filter(
        (alias) =>
          alias.workspaceScope?.workspaceId === input.workspaceId &&
          (!input.normalizedAlias ||
            alias.normalizedAlias === input.normalizedAlias),
      ),
    );
  }

  getRelationsFrom(
    conceptId: SemanticId,
  ): Promise<readonly BusinessLanguageRelation[]> {
    return Promise.resolve(
      this.seed.relations.filter(
        (relation) => relation.fromConceptId === conceptId,
      ),
    );
  }

  getRelationsTo(
    conceptId: SemanticId,
  ): Promise<readonly BusinessLanguageRelation[]> {
    return Promise.resolve(
      this.seed.relations.filter(
        (relation) => relation.toConceptId === conceptId,
      ),
    );
  }

  persistConcept(concept: BusinessLanguageConcept): Promise<void> {
    this.seed = {
      ...this.seed,
      concepts: upsertBy(this.seed.concepts, concept, (item) => item.conceptId),
    };
    return Promise.resolve();
  }

  persistAlias(alias: BusinessLanguageAlias): Promise<void> {
    this.seed = {
      ...this.seed,
      aliases: upsertBy(this.seed.aliases, alias, (item) => item.aliasId),
    };
    return Promise.resolve();
  }

  persistRelation(relation: BusinessLanguageRelation): Promise<void> {
    this.seed = {
      ...this.seed,
      relations: upsertBy(
        this.seed.relations,
        relation,
        (item) => item.relationId,
      ),
    };
    return Promise.resolve();
  }
}

export function normalizeBusinessText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[’‘`]/gu, "'")
    .replace(/[\u2010-\u2015]/gu, "-")
    .toLowerCase()
    .replace(/[%]/gu, " percent ")
    .replace(/[^a-z0-9'\-\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function businessLanguageConcept(
  input: Omit<
    BusinessLanguageConcept,
    | "applicableIndustries"
    | "createdAt"
    | "fingerprint"
    | "lifecycleStatus"
    | "provenance"
    | "updatedAt"
    | "version"
    | "languageNeutralKey"
    | "parentConceptIds"
    | "broaderConceptIds"
    | "narrowerConceptIds"
    | "relatedConceptIds"
    | "oppositeConceptIds"
    | "entityTypeRefs"
    | "actionRefs"
    | "metricRefs"
    | "roleRefs"
    | "processRefs"
    | "documentRefs"
  > &
    Partial<
      Pick<
        BusinessLanguageConcept,
        | "applicableIndustries"
        | "createdAt"
        | "lifecycleStatus"
        | "provenance"
        | "updatedAt"
        | "version"
        | "languageNeutralKey"
        | "parentConceptIds"
        | "broaderConceptIds"
        | "narrowerConceptIds"
        | "relatedConceptIds"
        | "oppositeConceptIds"
        | "entityTypeRefs"
        | "actionRefs"
        | "metricRefs"
        | "roleRefs"
        | "processRefs"
        | "documentRefs"
      >
    >,
): BusinessLanguageConcept {
  const base = {
    applicableIndustries: input.applicableIndustries ?? [],
    broaderConceptIds: input.broaderConceptIds ?? [],
    createdAt: input.createdAt ?? CANONICAL_CREATED_AT,
    lifecycleStatus: input.lifecycleStatus ?? "ACTIVE",
    documentRefs: input.documentRefs ?? [],
    entityTypeRefs: input.entityTypeRefs ?? [],
    actionRefs: input.actionRefs ?? [],
    metricRefs: input.metricRefs ?? [],
    roleRefs: input.roleRefs ?? [],
    processRefs: input.processRefs ?? [],
    languageNeutralKey:
      input.languageNeutralKey ?? normalizeBusinessText(input.canonicalName),
    narrowerConceptIds: input.narrowerConceptIds ?? [],
    oppositeConceptIds: input.oppositeConceptIds ?? [],
    parentConceptIds: input.parentConceptIds ?? [],
    provenance: input.provenance ?? canonicalProvenance(),
    relatedConceptIds: input.relatedConceptIds ?? [],
    updatedAt: input.updatedAt ?? CANONICAL_CREATED_AT,
    version: input.version ?? "1.0.0",
  } satisfies Pick<
    BusinessLanguageConcept,
    | "applicableIndustries"
    | "broaderConceptIds"
    | "createdAt"
    | "documentRefs"
    | "entityTypeRefs"
    | "actionRefs"
    | "metricRefs"
    | "roleRefs"
    | "processRefs"
    | "languageNeutralKey"
    | "lifecycleStatus"
    | "narrowerConceptIds"
    | "oppositeConceptIds"
    | "parentConceptIds"
    | "provenance"
    | "relatedConceptIds"
    | "updatedAt"
    | "version"
  >;
  const material = { ...input, ...base };
  return { ...material, fingerprint: stableFingerprint(material) };
}

export function businessLanguageAlias(
  input: Omit<
    BusinessLanguageAlias,
    | "aliasId"
    | "domainContext"
    | "fingerprint"
    | "industryContext"
    | "languageTag"
    | "normalizedAlias"
    | "priority"
    | "provenance"
    | "roleContext"
    | "status"
    | "version"
  > &
    Partial<
      Pick<
        BusinessLanguageAlias,
        | "aliasId"
        | "domainContext"
        | "industryContext"
        | "languageTag"
        | "normalizedAlias"
        | "priority"
        | "provenance"
        | "roleContext"
        | "status"
        | "version"
      >
    >,
): BusinessLanguageAlias {
  const normalizedAlias =
    input.normalizedAlias ?? normalizeBusinessText(input.aliasText);
  const base = {
    aliasId:
      input.aliasId ??
      `alias:${stableFingerprint({
        normalizedAlias,
        targetConceptId: input.targetConceptId,
        workspaceScope: input.workspaceScope,
      }).slice(0, 24)}`,
    domainContext: input.domainContext ?? [],
    industryContext: input.industryContext ?? [],
    languageTag: input.languageTag ?? "en",
    normalizedAlias,
    priority: input.priority ?? 50,
    provenance: input.provenance ?? canonicalProvenance(),
    roleContext: input.roleContext ?? [],
    status: input.status ?? "ACTIVE",
    version: input.version ?? "1.0.0",
  } satisfies Pick<
    BusinessLanguageAlias,
    | "aliasId"
    | "domainContext"
    | "industryContext"
    | "languageTag"
    | "normalizedAlias"
    | "priority"
    | "provenance"
    | "roleContext"
    | "status"
    | "version"
  >;
  const material = { ...input, ...base };
  return { ...material, fingerprint: stableFingerprint(material) };
}

export function businessLanguageRelation(
  input: Omit<
    BusinessLanguageRelation,
    | "createdAt"
    | "fingerprint"
    | "provenance"
    | "relationId"
    | "status"
    | "updatedAt"
    | "version"
  > &
    Partial<
      Pick<
        BusinessLanguageRelation,
        | "createdAt"
        | "provenance"
        | "relationId"
        | "status"
        | "updatedAt"
        | "version"
      >
    >,
): BusinessLanguageRelation {
  const base = {
    createdAt: input.createdAt ?? CANONICAL_CREATED_AT,
    provenance: input.provenance ?? canonicalProvenance(),
    relationId:
      input.relationId ??
      `relation:${stableFingerprint({
        fromConceptId: input.fromConceptId,
        toConceptId: input.toConceptId,
        relationType: input.relationType,
      }).slice(0, 24)}`,
    status: input.status ?? "ACTIVE",
    updatedAt: input.updatedAt ?? CANONICAL_CREATED_AT,
    version: input.version ?? "1.0.0",
  } satisfies Pick<
    BusinessLanguageRelation,
    | "createdAt"
    | "provenance"
    | "relationId"
    | "status"
    | "updatedAt"
    | "version"
  >;
  const material = { ...input, ...base };
  return { ...material, fingerprint: stableFingerprint(material) };
}

export class BusinessLanguageRegistry {
  private readonly concepts = new Map<SemanticId, BusinessLanguageConcept>();
  private readonly aliases = new Map<string, BusinessLanguageAlias[]>();
  private readonly relations = new Map<string, BusinessLanguageRelation>();

  constructor(
    seed: BusinessLanguageSeed = createUniversalBusinessLanguageSeed(),
  ) {
    for (const concept of seed.concepts) {
      this.registerConcept(concept);
    }
    for (const alias of seed.aliases) {
      this.registerAlias(alias);
    }
    for (const relation of seed.relations) {
      this.registerRelation(relation);
    }
  }

  static universal(): BusinessLanguageRegistry {
    return new BusinessLanguageRegistry(createUniversalBusinessLanguageSeed());
  }

  static async fromRepository(
    repository: BusinessLanguageRepository,
  ): Promise<BusinessLanguageRegistry> {
    return new BusinessLanguageRegistry(await repository.loadSeed());
  }

  listConcepts(): readonly BusinessLanguageConcept[] {
    return [...this.concepts.values()];
  }

  listAliases(): readonly BusinessLanguageAlias[] {
    return [...this.aliases.values()].flat();
  }

  listRelations(): readonly BusinessLanguageRelation[] {
    return [...this.relations.values()];
  }

  snapshot(): BusinessLanguageSeed {
    return {
      concepts: this.listConcepts(),
      aliases: this.listAliases(),
      relations: this.listRelations(),
    };
  }

  getConcept(conceptId: SemanticId): BusinessLanguageConcept | undefined {
    return this.concepts.get(conceptId);
  }

  registerConcept(concept: BusinessLanguageConcept): void {
    const existing = this.concepts.get(concept.conceptId);
    if (existing && existing.fingerprint !== concept.fingerprint) {
      throw new Error(
        `Concept already registered with a different fingerprint: ${concept.conceptId}`,
      );
    }
    this.concepts.set(concept.conceptId, concept);
  }

  registerAlias(alias: BusinessLanguageAlias): void {
    if (!this.concepts.has(alias.targetConceptId)) {
      throw new Error(
        `Alias target concept does not exist: ${alias.targetConceptId}`,
      );
    }
    const aliases = this.aliases.get(alias.normalizedAlias) ?? [];
    const duplicate = aliases.find(
      (item) =>
        item.targetConceptId === alias.targetConceptId &&
        item.workspaceScope?.workspaceId === alias.workspaceScope?.workspaceId,
    );
    if (duplicate && duplicate.fingerprint !== alias.fingerprint) {
      throw new Error(
        `Alias already registered with a different fingerprint: ${alias.aliasText}`,
      );
    }
    if (!duplicate) {
      this.aliases.set(alias.normalizedAlias, [...aliases, alias]);
    }
  }

  registerRelation(relation: BusinessLanguageRelation): void {
    if (!this.concepts.has(relation.fromConceptId)) {
      throw new Error(
        `Relation source concept does not exist: ${relation.fromConceptId}`,
      );
    }
    if (!this.concepts.has(relation.toConceptId)) {
      throw new Error(
        `Relation target concept does not exist: ${relation.toConceptId}`,
      );
    }
    if (
      relation.fromConceptId === relation.toConceptId &&
      relation.relationType !== "RELATED_TO"
    ) {
      throw new Error(`Invalid self relation: ${relation.relationType}`);
    }
    if (relation.relationType === "IS_A" && this.createsIsACycle(relation)) {
      throw new Error(
        `IS_A relation would create a cycle: ${relation.relationId}`,
      );
    }
    const existing = this.relations.get(relation.relationId);
    if (existing && existing.fingerprint !== relation.fingerprint) {
      throw new Error(
        `Relation already registered with a different fingerprint: ${relation.relationId}`,
      );
    }
    this.relations.set(relation.relationId, relation);
  }

  resolveConcept(
    input: string,
    context: BusinessLanguageContext = {},
  ): ConceptResolution {
    const normalizedInput = normalizeBusinessText(input);
    const candidates = this.findCandidates(normalizedInput, context);
    if (candidates.length === 0) {
      return {
        input,
        normalizedInput,
        candidates,
        confidence: 0,
        resolutionStatus: "UNKNOWN_TERM",
        resolutionEvidence: ["NO_ALIAS_OR_CANONICAL_MATCH"],
        modelAssistUsed: false,
      };
    }
    const sorted = [...candidates].sort(
      (first, second) => second.score - first.score,
    );
    const top = sorted[0];
    if (!top) {
      throw new Error("Candidate sorting failed.");
    }
    const ties = sorted.filter(
      (candidate) => Math.abs(candidate.score - top.score) < 0.02,
    );
    const explicitlyAmbiguous = ties.some(
      (candidate) => candidate.alias?.ambiguityClass === "AMBIGUOUS",
    );
    if (ties.length > 1 || explicitlyAmbiguous) {
      return {
        input,
        normalizedInput,
        candidates: sorted,
        confidence: top.score,
        resolutionStatus: "AMBIGUOUS",
        ambiguityReason:
          "Multiple canonical concepts match this business phrase.",
        resolutionEvidence: ["DETERMINISTIC_ALIAS_AMBIGUITY"],
        modelAssistUsed: false,
      };
    }
    return {
      input,
      normalizedInput,
      candidates: sorted,
      selectedConcept: top.concept,
      confidence: top.score,
      resolutionStatus: "RESOLVED",
      resolutionEvidence: top.evidence,
      modelAssistUsed: false,
    };
  }

  validateModelProposal(
    proposal: ModelAssistedBusinessLanguageProposal,
  ): ModelAssistedBusinessLanguageValidation {
    const acceptedConceptIds: SemanticId[] = [];
    const rejectedConceptIds: {
      readonly conceptId: string;
      readonly reason: "UNKNOWN_CONCEPT_ID" | "INVALID_SEMANTIC_ID";
    }[] = [];
    for (const conceptId of proposal.proposedConceptIds) {
      try {
        const semanticId = toSemanticId(conceptId);
        if (this.concepts.has(semanticId)) {
          acceptedConceptIds.push(semanticId);
        } else {
          rejectedConceptIds.push({ conceptId, reason: "UNKNOWN_CONCEPT_ID" });
        }
      } catch {
        rejectedConceptIds.push({ conceptId, reason: "INVALID_SEMANTIC_ID" });
      }
    }
    const acceptedAliases: {
      readonly aliasText: string;
      readonly targetConceptId: SemanticId;
    }[] = [];
    const rejectedAliases: {
      readonly aliasText: string;
      readonly targetConceptId: string;
      readonly reason: "UNKNOWN_CONCEPT_ID" | "INVALID_SEMANTIC_ID";
    }[] = [];
    for (const alias of proposal.proposedAliases ?? []) {
      try {
        const semanticId = toSemanticId(alias.targetConceptId);
        if (this.concepts.has(semanticId)) {
          acceptedAliases.push({
            aliasText: alias.aliasText,
            targetConceptId: semanticId,
          });
        } else {
          rejectedAliases.push({
            aliasText: alias.aliasText,
            targetConceptId: alias.targetConceptId,
            reason: "UNKNOWN_CONCEPT_ID",
          });
        }
      } catch {
        rejectedAliases.push({
          aliasText: alias.aliasText,
          targetConceptId: alias.targetConceptId,
          reason: "INVALID_SEMANTIC_ID",
        });
      }
    }
    return {
      acceptedConceptIds,
      rejectedConceptIds,
      acceptedAliases,
      rejectedAliases,
    };
  }

  private findCandidates(
    normalizedInput: string,
    context: BusinessLanguageContext,
  ): ConceptResolutionCandidate[] {
    const candidates: ConceptResolutionCandidate[] = [];
    const exactAliases = this.aliases.get(normalizedInput) ?? [];
    for (const alias of exactAliases) {
      const candidate = this.candidateFromAlias(
        alias,
        context,
        0.95,
        "EXACT_ALIAS_MATCH",
      );
      if (candidate) {
        candidates.push(candidate);
      }
    }
    for (const concept of this.concepts.values()) {
      const normalizedName = normalizeBusinessText(concept.canonicalName);
      const normalizedLabel = normalizeBusinessText(concept.canonicalLabel);
      if (
        normalizedInput === normalizedName ||
        normalizedInput === normalizedLabel
      ) {
        candidates.push({
          concept,
          score: 0.9,
          reasons: ["CANONICAL_NAME_MATCH"],
          contextMatched: false,
          evidence: ["CANONICAL_NAME_MATCH"],
        });
      }
    }
    return dedupeCandidates(candidates);
  }

  private candidateFromAlias(
    alias: BusinessLanguageAlias,
    context: BusinessLanguageContext,
    baseScore: number,
    evidence: string,
  ): ConceptResolutionCandidate | undefined {
    if (alias.status !== "ACTIVE") {
      return undefined;
    }
    if (
      alias.workspaceScope &&
      alias.workspaceScope.workspaceId !== context.workspaceId
    ) {
      return undefined;
    }
    const concept = this.concepts.get(alias.targetConceptId);
    if (!concept) {
      return undefined;
    }
    const contextMatched = contextMatches(alias, concept, context);
    const languageMatched =
      !context.languageTag || alias.languageTag === context.languageTag;
    const workspaceBoost = alias.workspaceScope ? 0.04 : 0;
    const contextBoost = contextMatched ? 0.03 : 0;
    const languageBoost = languageMatched ? 0.02 : 0;
    return {
      concept,
      alias,
      score: Math.min(
        0.99,
        baseScore + workspaceBoost + contextBoost + languageBoost,
      ),
      reasons: [evidence, alias.aliasType, alias.ambiguityClass],
      contextMatched,
      evidence: [evidence, `alias:${alias.aliasId}`],
    };
  }

  private createsIsACycle(relation: BusinessLanguageRelation): boolean {
    const visited = new Set<SemanticId>();
    const stack = [relation.toConceptId];
    while (stack.length > 0) {
      const next = stack.pop();
      if (!next) {
        continue;
      }
      if (next === relation.fromConceptId) {
        return true;
      }
      if (visited.has(next)) {
        continue;
      }
      visited.add(next);
      for (const existing of this.relations.values()) {
        if (
          existing.relationType === "IS_A" &&
          existing.fromConceptId === next
        ) {
          stack.push(existing.toConceptId);
        }
      }
    }
    return false;
  }
}

export class FounderSpeakInterpreter {
  constructor(
    private readonly registry = BusinessLanguageRegistry.universal(),
  ) {}

  interpret(
    rawUtterance: string,
    context: BusinessLanguageContext = {},
    modelProposal?: ModelAssistedBusinessLanguageProposal,
  ): BusinessUtteranceInterpretation {
    const normalizedText = normalizeBusinessText(rawUtterance);
    const pattern = classifyUtterance(normalizedText);
    const resolutions = pattern.terms.map((term) =>
      this.registry.resolveConcept(term, context),
    );
    const conceptCandidates = resolutions.flatMap(
      (resolution) => resolution.candidates,
    );
    const ambiguousTerms = resolutions.filter(
      (resolution) => resolution.resolutionStatus === "AMBIGUOUS",
    );
    const resolvedConcepts = dedupeConcepts(
      resolutions
        .map((resolution) => resolution.selectedConcept)
        .filter((concept): concept is BusinessLanguageConcept =>
          Boolean(concept),
        ),
    );
    const modelValidation = modelProposal
      ? this.registry.validateModelProposal(modelProposal)
      : undefined;
    const rejectedModelConceptIds =
      modelValidation?.rejectedConceptIds.map((item) => item.conceptId) ?? [];
    const riskFlags = [...pattern.riskFlags];
    if (rejectedModelConceptIds.length > 0) {
      riskFlags.push("MODEL_PROPOSED_UNKNOWN_CONCEPT");
    }
    const missingInformation = [...pattern.missingInformation];
    const status = interpretationStatus({
      patternStatus: pattern.status,
      ambiguousTerms,
      missingInformation,
      riskFlags,
    });
    const material = {
      rawUtterance,
      normalizedText,
      intent: pattern.intent,
      terms: pattern.terms,
      resolvedConceptIds: resolvedConcepts.map((concept) => concept.conceptId),
      ambiguousTerms: ambiguousTerms.map((term) => term.normalizedInput),
      missingInformation,
      riskFlags,
      status,
      rejectedModelConceptIds,
    };
    return {
      rawUtterance,
      normalizedText,
      utteranceClass: pattern.utteranceClass,
      intent: pattern.intent,
      conceptCandidates,
      resolvedConcepts,
      ambiguousTerms,
      missingInformation,
      riskFlags,
      resolutionStatus: status,
      modelAssistUsed: Boolean(modelProposal),
      deterministicSignals: pattern.deterministicSignals,
      rejectedModelConceptIds,
      fingerprint: stableFingerprint(material),
    };
  }
}

export const BusinessUtteranceInterpreter = FounderSpeakInterpreter;

export function createUniversalBusinessLanguageSeed(): BusinessLanguageSeed {
  const concepts = [
    concept(
      "organization",
      "Organization",
      "Organization",
      "ENTITY_TYPE",
      "organization",
      "A business or legal operating entity.",
    ),
    concept(
      "team",
      "Team",
      "Team",
      "ENTITY_TYPE",
      "organization",
      "A group of people working together inside a business.",
    ),
    concept(
      "salesTeam",
      "Sales Team",
      "Sales Team",
      "ROLE",
      "organization",
      "A team responsible for sales and revenue-generating commercial work.",
    ),
    concept(
      "customerSuccessTeam",
      "Customer Success Team",
      "Customer Success Team",
      "ROLE",
      "organization",
      "A team responsible for customer outcomes, retention, adoption, and expansion.",
    ),
    concept(
      "employee",
      "Employee",
      "Employee",
      "ROLE",
      "people",
      "A person working for the business.",
    ),
    concept(
      "contact",
      "Contact",
      "Contact",
      "ROLE",
      "people",
      "A person or communication point associated with an external organization.",
    ),
    concept(
      "client",
      "Client",
      "Client",
      "ROLE",
      "commercial",
      "A customer or account receiving goods or services from the business.",
    ),
    concept(
      "prospect",
      "Prospect",
      "Prospect",
      "ROLE",
      "commercial",
      "A potential customer not yet converted.",
    ),
    concept(
      "lead",
      "Lead",
      "Lead",
      "COMMERCIAL_TERM",
      "commercial",
      "An early commercial opportunity or sales contact.",
    ),
    concept(
      "supplier",
      "Supplier",
      "Supplier",
      "ROLE",
      "commercial",
      "A vendor providing goods or services to the business.",
    ),
    concept(
      "opportunity",
      "Opportunity",
      "Opportunity",
      "COMMERCIAL_TERM",
      "commercial",
      "A qualified potential sale.",
    ),
    concept(
      "quote",
      "Quote",
      "Quote",
      "DOCUMENT",
      "commercial",
      "A commercial price quotation.",
    ),
    concept(
      "proposal",
      "Proposal",
      "Proposal",
      "DOCUMENT",
      "commercial",
      "A proposed commercial offer that is not yet a contract.",
    ),
    concept(
      "contract",
      "Contract",
      "Contract",
      "DOCUMENT",
      "commercial",
      "A binding agreement that is distinct from a proposal.",
    ),
    concept(
      "salesOrder",
      "Sales Order",
      "Sales Order",
      "DOCUMENT",
      "commercial",
      "A committed order to provide goods or services.",
    ),
    concept(
      "revenue",
      "Revenue",
      "Revenue",
      "METRIC",
      "finance",
      "Income earned from selling goods or services.",
    ),
    concept(
      "salesPerformance",
      "Sales Performance",
      "Sales Performance",
      "METRIC",
      "commercial",
      "The performance of sales activity or pipeline outcomes.",
    ),
    concept(
      "price",
      "Price",
      "Price",
      "COMMERCIAL_TERM",
      "commercial",
      "The amount charged for a product or service.",
    ),
    concept(
      "discount",
      "Discount",
      "Discount",
      "COMMERCIAL_TERM",
      "commercial",
      "A reduction from standard price.",
    ),
    concept(
      "cost",
      "Cost",
      "Cost",
      "METRIC",
      "finance",
      "Resources consumed or expenses incurred.",
    ),
    concept(
      "profit",
      "Profit",
      "Profit",
      "METRIC",
      "finance",
      "Financial surplus after costs.",
    ),
    concept(
      "grossMargin",
      "Gross Margin",
      "Gross Margin",
      "METRIC",
      "finance",
      "Revenue less direct cost of goods or delivery.",
    ),
    concept(
      "netMargin",
      "Net Margin",
      "Net Margin",
      "METRIC",
      "finance",
      "Profit after all expenses as a share of revenue.",
    ),
    concept(
      "operatingMargin",
      "Operating Margin",
      "Operating Margin",
      "METRIC",
      "finance",
      "Operating profit as a share of revenue.",
    ),
    concept(
      "contributionMargin",
      "Contribution Margin",
      "Contribution Margin",
      "METRIC",
      "finance",
      "Revenue less variable costs.",
    ),
    concept(
      "projectMargin",
      "Project Margin",
      "Project Margin",
      "METRIC",
      "finance",
      "Profitability of a project after project costs.",
    ),
    concept(
      "clientProfitability",
      "Client Profitability",
      "Client Profitability",
      "METRIC",
      "finance",
      "Profitability attributable to a client relationship.",
    ),
    concept(
      "cash",
      "Cash",
      "Cash",
      "FINANCIAL_TERM",
      "finance",
      "Available money or liquidity, distinct from revenue.",
    ),
    concept(
      "workingCapital",
      "Working Capital",
      "Working Capital",
      "METRIC",
      "finance",
      "Current assets less current liabilities.",
    ),
    concept(
      "receivable",
      "Accounts Receivable",
      "Accounts Receivable",
      "FINANCIAL_TERM",
      "finance",
      "Money owed to the business by customers.",
    ),
    concept(
      "payable",
      "Accounts Payable",
      "Accounts Payable",
      "FINANCIAL_TERM",
      "finance",
      "Money owed by the business to suppliers.",
    ),
    concept(
      "invoice",
      "Invoice",
      "Invoice",
      "DOCUMENT",
      "finance",
      "A billing document requesting payment.",
    ),
    concept(
      "overdueInvoice",
      "Overdue Invoice",
      "Overdue Invoice",
      "STATUS",
      "finance",
      "An invoice past its due date.",
    ),
    concept(
      "payment",
      "Payment",
      "Payment",
      "EVENT",
      "finance",
      "Money transfer settling an obligation.",
    ),
    concept(
      "collection",
      "Collections",
      "Collections",
      "PROCESS",
      "finance",
      "Process of collecting customer receivables.",
    ),
    concept(
      "expense",
      "Expense",
      "Expense",
      "METRIC",
      "finance",
      "A cost recognized by the business.",
    ),
    concept(
      "project",
      "Project",
      "Project",
      "ENTITY_TYPE",
      "operations",
      "A bounded delivery effort.",
    ),
    concept(
      "task",
      "Task",
      "Task",
      "ENTITY_TYPE",
      "operations",
      "A unit of work.",
    ),
    concept(
      "milestone",
      "Milestone",
      "Milestone",
      "EVENT",
      "operations",
      "A significant project checkpoint.",
    ),
    concept(
      "scope",
      "Scope",
      "Scope",
      "OPERATING_TERM",
      "operations",
      "The agreed boundaries of work.",
    ),
    concept(
      "changeRequest",
      "Change Request",
      "Change Request",
      "DOCUMENT",
      "operations",
      "A request to change agreed scope, cost, or timing.",
    ),
    concept(
      "deliverable",
      "Deliverable",
      "Deliverable",
      "ENTITY_TYPE",
      "operations",
      "A work product to be delivered.",
    ),
    concept(
      "scopeVariance",
      "Scope Variance",
      "Scope Variance",
      "METRIC",
      "operations",
      "Difference between agreed and actual work scope.",
    ),
    concept(
      "costVariance",
      "Cost Variance",
      "Cost Variance",
      "METRIC",
      "operations",
      "Difference between planned and actual cost.",
    ),
    concept(
      "timeVariance",
      "Time Variance",
      "Time Variance",
      "METRIC",
      "operations",
      "Difference between planned and actual timing.",
    ),
    concept(
      "capacity",
      "Capacity",
      "Capacity",
      "METRIC",
      "operations",
      "Available ability to perform work.",
    ),
    concept(
      "availability",
      "Availability",
      "Availability",
      "STATE",
      "operations",
      "Whether a person or resource can take work.",
    ),
    concept(
      "utilization",
      "Utilization",
      "Utilization",
      "METRIC",
      "operations",
      "Share of available capacity being used.",
    ),
    concept(
      "workload",
      "Workload",
      "Workload",
      "METRIC",
      "operations",
      "Assigned work demand.",
    ),
    concept(
      "inventory",
      "Inventory",
      "Inventory",
      "ENTITY_TYPE",
      "operations",
      "Goods held for sale or use.",
    ),
    concept(
      "stock",
      "Stock",
      "Stock",
      "ENTITY_TYPE",
      "operations",
      "Available inventory units.",
    ),
    concept(
      "warehouse",
      "Warehouse",
      "Warehouse",
      "ENTITY_TYPE",
      "operations",
      "Location where inventory is stored.",
    ),
    concept(
      "fulfillment",
      "Fulfillment",
      "Fulfillment",
      "PROCESS",
      "operations",
      "Process of satisfying a customer order.",
    ),
    concept(
      "purchaseOrder",
      "Purchase Order",
      "Purchase Order",
      "DOCUMENT",
      "operations",
      "A document ordering goods or services from a supplier.",
    ),
    concept(
      "risk",
      "Risk",
      "Risk",
      "RISK_TERM",
      "control",
      "Potential adverse condition.",
    ),
    concept(
      "issue",
      "Issue",
      "Issue",
      "OPERATING_TERM",
      "control",
      "A known problem requiring attention.",
    ),
    concept(
      "approval",
      "Approval",
      "Approval",
      "CONTROL_TERM",
      "control",
      "Authorization decision, distinct from execution.",
    ),
    concept(
      "policy",
      "Policy",
      "Policy",
      "POLICY_TERM",
      "control",
      "Governance requirement or rule.",
    ),
    concept(
      "control",
      "Control",
      "Control",
      "CONTROL_TERM",
      "control",
      "Mechanism that constrains or verifies behavior.",
    ),
    concept(
      "authority",
      "Authority",
      "Authority",
      "CONTROL_TERM",
      "control",
      "Permission to make or execute a decision.",
    ),
    concept(
      "execution",
      "Execution",
      "Execution",
      "ACTION",
      "control",
      "Carrying out an approved action.",
    ),
    concept(
      "decision",
      "Decision",
      "Decision",
      "DECISION_TERM",
      "control",
      "A choice among options.",
    ),
    concept(
      "recommendation",
      "Recommendation",
      "Recommendation",
      "DECISION_TERM",
      "control",
      "A suggested course of action.",
    ),
    concept(
      "financialRecord",
      "Financial Record",
      "Financial Record",
      "CONTROL_TERM",
      "control",
      "Authoritative record of business numbers.",
    ),
    concept(
      "sendAction",
      "Send",
      "Send",
      "ACTION",
      "communication",
      "Transmit a message or document.",
    ),
    concept(
      "closeAction",
      "Close",
      "Close",
      "ACTION",
      "workflow",
      "Mark a specific item closed when authority and object are known.",
    ),
    concept(
      "calculateAction",
      "Calculate",
      "Calculate",
      "ACTION",
      "analysis",
      "Compute a result with required formula authority.",
    ),
    concept(
      "diagnoseAction",
      "Diagnose",
      "Diagnose",
      "ACTION",
      "analysis",
      "Investigate likely causes.",
    ),
    concept(
      "timeWindow",
      "Time Window",
      "Time Window",
      "TIME_CONCEPT",
      "time",
      "A bounded period of time.",
    ),
    concept(
      "nextWeek",
      "Next Week",
      "Next Week",
      "TIME_CONCEPT",
      "time",
      "The week following the current week.",
    ),
  ];
  const aliases = [
    alias("organization", "company", "COLLOQUIAL"),
    alias("salesTeam", "sales team", "EXACT_SYNONYM"),
    alias("customerSuccessTeam", "customer success team", "EXACT_SYNONYM"),
    alias("employee", "person", "EXACT_SYNONYM"),
    alias("contact", "contact", "EXACT_SYNONYM"),
    alias("employee", "people", "COLLOQUIAL"),
    alias("client", "customer", "EXACT_SYNONYM"),
    alias("client", "client", "EXACT_SYNONYM"),
    alias("lead", "leads", "EXACT_SYNONYM"),
    contextualAlias("salesPerformance", "sales"),
    alias("salesPerformance", "sales are growing", "PHRASE"),
    alias("revenue", "revenue", "EXACT_SYNONYM"),
    alias("cash", "cash", "EXACT_SYNONYM"),
    alias("cash", "cash is worse", "FOUNDER_SPEAK"),
    alias("cash", "money in bank", "FOUNDER_SPEAK"),
    alias("receivable", "accounts receivable", "EXACT_SYNONYM"),
    alias("receivable", "receivables", "EXACT_SYNONYM"),
    alias("receivable", "ar", "ABBREVIATION"),
    alias("receivable", "who owes us money", "FOUNDER_SPEAK"),
    alias("receivable", "money clients owe us", "FOUNDER_SPEAK"),
    alias(
      "receivable",
      "client ka paisa abhi tak nahi aya",
      "ROMAN_URDU",
      "roman-ur",
    ),
    alias("receivable", "client ka paisa nahi aya", "ROMAN_URDU", "roman-ur"),
    alias("invoice", "invoice", "EXACT_SYNONYM"),
    alias("invoice", "invoices", "EXACT_SYNONYM"),
    alias("overdueInvoice", "overdue invoices", "PHRASE"),
    alias("payment", "payment", "EXACT_SYNONYM"),
    alias("collection", "collections", "EXACT_SYNONYM"),
    alias("workingCapital", "working capital", "EXACT_SYNONYM"),
    alias("payable", "payables", "EXACT_SYNONYM"),
    alias("profit", "profit", "EXACT_SYNONYM"),
    alias("grossMargin", "gross margin", "EXACT_SYNONYM"),
    alias("netMargin", "net margin", "EXACT_SYNONYM"),
    alias("operatingMargin", "operating margin", "EXACT_SYNONYM"),
    alias("contributionMargin", "contribution margin", "EXACT_SYNONYM"),
    alias("projectMargin", "project margin", "EXACT_SYNONYM"),
    ambiguousAlias("grossMargin", "margin"),
    ambiguousAlias("netMargin", "margin"),
    ambiguousAlias("operatingMargin", "margin"),
    ambiguousAlias("projectMargin", "margin"),
    alias(
      "clientProfitability",
      "clients are eating our margin",
      "FOUNDER_SPEAK",
    ),
    alias("clientProfitability", "client profitability", "EXPERT_TERM"),
    alias("discount", "discount", "EXACT_SYNONYM"),
    alias("proposal", "proposal", "EXACT_SYNONYM"),
    alias("contract", "contract", "EXACT_SYNONYM"),
    alias("approval", "approval", "EXACT_SYNONYM"),
    alias("approval", "approved", "EXACT_SYNONYM"),
    alias("execution", "execute", "EXACT_SYNONYM"),
    alias("project", "project", "EXACT_SYNONYM"),
    alias("scopeVariance", "scope creep", "FOUNDER_SPEAK"),
    alias("costVariance", "cost overrun", "FOUNDER_SPEAK"),
    alias("timeVariance", "schedule slip", "FOUNDER_SPEAK"),
    alias("capacity", "capacity", "EXACT_SYNONYM"),
    alias("availability", "free", "FOUNDER_SPEAK"),
    alias("availability", "kaun free hai next week", "ROMAN_URDU", "roman-ur"),
    alias("utilization", "utilization", "EXACT_SYNONYM"),
    alias("inventory", "inventory", "EXACT_SYNONYM"),
    alias("stock", "stock", "EXACT_SYNONYM"),
    alias("fulfillment", "order cannot be fulfilled", "PHRASE"),
    alias("sendAction", "send", "ACTION_PHRASE"),
    alias("sendAction", "send it", "ACTION_PHRASE"),
    alias("closeAction", "close", "ACTION_PHRASE"),
    alias("closeAction", "close it", "ACTION_PHRASE"),
    alias("financialRecord", "numbers", "FOUNDER_SPEAK"),
    alias("financialRecord", "make the numbers look better", "FOUNDER_SPEAK"),
    alias("nextWeek", "next week", "EXACT_SYNONYM"),
  ];
  const relations = [
    relation("proposal", "contract", "DISTINCT_FROM"),
    relation("cash", "revenue", "DISTINCT_FROM"),
    relation("approval", "execution", "DISTINCT_FROM"),
    relation("overdueInvoice", "invoice", "IS_A"),
    relation("receivable", "payment", "DEPENDS_ON"),
    relation("receivable", "cash", "DRIVES"),
    relation("workingCapital", "cash", "DRIVES"),
    relation("payable", "workingCapital", "DRIVES"),
    relation("inventory", "workingCapital", "DRIVES"),
    relation("projectMargin", "revenue", "DEPENDS_ON"),
    relation("projectMargin", "cost", "DEPENDS_ON"),
    relation("clientProfitability", "projectMargin", "DEPENDS_ON"),
    relation("clientProfitability", "cost", "DEPENDS_ON"),
    relation("utilization", "projectMargin", "INDICATES"),
    relation("inventory", "fulfillment", "DRIVES"),
    relation("approval", "authority", "REQUIRES_AUTHORITY"),
    relation("execution", "authority", "REQUIRES_AUTHORITY"),
    relation("salesTeam", "team", "IS_A"),
    relation("customerSuccessTeam", "team", "IS_A"),
    relation("client", "contact", "DISTINCT_FROM"),
  ];
  return { concepts, aliases, relations };
}

interface PatternClassification {
  readonly terms: readonly string[];
  readonly utteranceClass: BusinessUtteranceClass;
  readonly intent: BusinessIntentClass;
  readonly status: ConceptResolutionStatus;
  readonly missingInformation: readonly string[];
  readonly riskFlags: readonly string[];
  readonly deterministicSignals: readonly string[];
}

function classifyUtterance(normalizedText: string): PatternClassification {
  if (
    normalizedText.includes("from now") ||
    normalizedText.includes("call revenue cash")
  ) {
    return pattern(
      ["revenue", "cash", "policy"],
      "COMMAND",
      "UNKNOWN",
      "UNSUPPORTED",
      [],
      ["UNSAFE_LANGUAGE_REDEFINITION"],
    );
  }
  if (normalizedText === "show overdue invoices") {
    return pattern(["overdue invoices", "invoice"], "REQUEST", "READ");
  }
  if (normalizedText === "who owes us money") {
    return pattern(
      ["who owes us money", "client", "payment", "collection"],
      "QUESTION",
      "READ",
      "PARTIALLY_RESOLVED",
      ["invoice due dates", "customer balance records"],
    );
  }
  if (normalizedText === "which clients are eating our margin") {
    return pattern(
      [
        "clients are eating our margin",
        "client",
        "project margin",
        "cost",
        "scope creep",
      ],
      "QUESTION",
      "DIAGNOSE",
      "PARTIALLY_RESOLVED",
      ["client-level revenue", "client-level cost", "project allocation"],
    );
  }
  if (
    normalizedText === "what's our margin" ||
    normalizedText === "whats our margin"
  ) {
    return pattern(["margin"], "QUESTION", "ANALYZE", "AMBIGUOUS", [
      "margin type",
    ]);
  }
  if (normalizedText === "sales are growing but cash is worse") {
    return pattern(
      [
        "sales are growing",
        "cash is worse",
        "accounts receivable",
        "working capital",
        "payables",
        "inventory",
      ],
      "OBSERVATION",
      "DIAGNOSE",
      "PARTIALLY_RESOLVED",
      ["cash timing records", "receivables aging", "payables timing"],
    );
  }
  if (normalizedText === "client ka paisa abhi tak nahi aya") {
    return pattern(
      ["client ka paisa abhi tak nahi aya", "client", "payment", "collection"],
      "COMPLAINT",
      "READ",
      "PARTIALLY_RESOLVED",
      ["customer account", "invoice due date", "payment status"],
    );
  }
  if (normalizedText === "kaun free hai next week") {
    return pattern(
      ["kaun free hai next week", "employee", "capacity", "next week"],
      "QUESTION",
      "READ",
      "PARTIALLY_RESOLVED",
      ["team or role filter", "calendar source"],
    );
  }
  if (normalizedText === "close it") {
    return pattern(
      ["close it"],
      "COMMAND",
      "PROPOSE_ACTION",
      "NEEDS_INFORMATION",
      ["object to close", "actor authority", "approval state"],
      ["ACTION_REQUIRES_OBJECT_AND_AUTHORITY"],
    );
  }
  if (normalizedText === "send it") {
    return pattern(
      ["send it"],
      "COMMAND",
      "PROPOSE_ACTION",
      "NEEDS_INFORMATION",
      ["object to send", "recipient", "actor authority"],
      ["ACTION_REQUIRES_OBJECT_AND_AUTHORITY"],
    );
  }
  if (normalizedText === "make the numbers look better") {
    return pattern(
      ["make the numbers look better", "policy", "control"],
      "COMMAND",
      "PROPOSE_ACTION",
      "UNSUPPORTED",
      ["legitimate correction evidence", "approver"],
      ["POSSIBLE_RECORD_MANIPULATION", "ACTION_BLOCKED"],
    );
  }
  const terms = normalizedText.split(" ").filter((term) => term.length > 2);
  return pattern(terms, "REQUEST", "UNKNOWN", "UNKNOWN_TERM");
}

function pattern(
  terms: readonly string[],
  utteranceClass: BusinessUtteranceClass,
  intent: BusinessIntentClass,
  status: ConceptResolutionStatus = "RESOLVED",
  missingInformation: readonly string[] = [],
  riskFlags: readonly string[] = [],
): PatternClassification {
  return {
    terms,
    utteranceClass,
    intent,
    status,
    missingInformation,
    riskFlags,
    deterministicSignals: ["NORMALIZED_TEXT", "PHRASE_PATTERN", "ALIAS_GRAPH"],
  };
}

function interpretationStatus(input: {
  readonly patternStatus: ConceptResolutionStatus;
  readonly ambiguousTerms: readonly ConceptResolution[];
  readonly missingInformation: readonly string[];
  readonly riskFlags: readonly string[];
}): ConceptResolutionStatus {
  if (
    input.riskFlags.includes("POSSIBLE_RECORD_MANIPULATION") ||
    input.riskFlags.includes("UNSAFE_LANGUAGE_REDEFINITION")
  ) {
    return "UNSUPPORTED";
  }
  if (input.ambiguousTerms.length > 0) {
    return "AMBIGUOUS";
  }
  if (
    input.patternStatus === "NEEDS_INFORMATION" ||
    input.missingInformation.length > 0
  ) {
    return input.patternStatus === "UNSUPPORTED"
      ? "UNSUPPORTED"
      : "PARTIALLY_RESOLVED";
  }
  return input.patternStatus;
}

function concept(
  key: keyof typeof conceptIds,
  canonicalName: string,
  canonicalLabel: string,
  conceptType: BusinessLanguageConceptType,
  domain: string,
  definition: string,
): BusinessLanguageConcept {
  return businessLanguageConcept({
    conceptId: businessLanguageCoreConceptIds[key],
    canonicalName,
    canonicalLabel,
    conceptType,
    domain,
    definition,
    semanticDescription: definition,
    layer: "L0_UNIVERSAL",
  });
}

function alias(
  key: keyof typeof conceptIds,
  aliasText: string,
  aliasType: BusinessLanguageAliasType,
  languageTag = "en",
  status: BusinessLanguageLifecycleStatus = "ACTIVE",
): BusinessLanguageAlias {
  return businessLanguageAlias({
    aliasText,
    targetConceptId: businessLanguageCoreConceptIds[key],
    aliasType,
    ambiguityClass: "UNAMBIGUOUS",
    languageTag,
    status,
  });
}

function ambiguousAlias(
  key: keyof typeof conceptIds,
  aliasText: string,
): BusinessLanguageAlias {
  return businessLanguageAlias({
    aliasText,
    targetConceptId: businessLanguageCoreConceptIds[key],
    aliasType: "COLLOQUIAL",
    ambiguityClass: "AMBIGUOUS",
    priority: 40,
  });
}

function contextualAlias(
  key: keyof typeof conceptIds,
  aliasText: string,
): BusinessLanguageAlias {
  return businessLanguageAlias({
    aliasText,
    targetConceptId: businessLanguageCoreConceptIds[key],
    aliasType: "COLLOQUIAL",
    ambiguityClass: "CONTEXTUAL",
    priority: 45,
  });
}

function relation(
  from: keyof typeof conceptIds,
  to: keyof typeof conceptIds,
  relationType: BusinessLanguageRelationType,
): BusinessLanguageRelation {
  return businessLanguageRelation({
    fromConceptId: businessLanguageCoreConceptIds[from],
    toConceptId: businessLanguageCoreConceptIds[to],
    relationType,
  });
}

function canonicalProvenance(): BusinessLanguageProvenance {
  return {
    sourceType: "FLOW_CANONICAL_LANGUAGE",
    sourceId: "flow-business-language-universal-seed",
    sourceReleaseId: DEFAULT_RELEASE_ID,
    createdAt: CANONICAL_CREATED_AT,
  };
}

function contextMatches(
  alias: BusinessLanguageAlias,
  concept: BusinessLanguageConcept,
  context: BusinessLanguageContext,
): boolean {
  const domainContext = context.domainContext ?? [];
  const roleContext = context.roleContext ?? [];
  const industryContext = context.industryContext ?? [];
  return (
    domainContext.includes(concept.domain) ||
    alias.domainContext.some((domain) => domainContext.includes(domain)) ||
    alias.roleContext.some((role) => roleContext.includes(role)) ||
    alias.industryContext.some((industry) => industryContext.includes(industry))
  );
}

function dedupeCandidates(
  candidates: readonly ConceptResolutionCandidate[],
): ConceptResolutionCandidate[] {
  const byConcept = new Map<SemanticId, ConceptResolutionCandidate>();
  for (const candidate of candidates) {
    const existing = byConcept.get(candidate.concept.conceptId);
    if (!existing || candidate.score > existing.score) {
      byConcept.set(candidate.concept.conceptId, candidate);
    }
  }
  return [...byConcept.values()].sort(
    (first, second) => second.score - first.score,
  );
}

function dedupeConcepts(
  concepts: readonly BusinessLanguageConcept[],
): BusinessLanguageConcept[] {
  const byId = new Map<SemanticId, BusinessLanguageConcept>();
  for (const concept of concepts) {
    byId.set(concept.conceptId, concept);
  }
  return [...byId.values()];
}

function cloneSeed(seed: BusinessLanguageSeed): BusinessLanguageSeed {
  return {
    concepts: [...seed.concepts],
    aliases: [...seed.aliases],
    relations: [...seed.relations],
  };
}

function upsertBy<T>(
  items: readonly T[],
  replacement: T,
  key: (item: T) => string,
): readonly T[] {
  const replacementKey = key(replacement);
  const next = items.filter((item) => key(item) !== replacementKey);
  return [...next, replacement];
}
