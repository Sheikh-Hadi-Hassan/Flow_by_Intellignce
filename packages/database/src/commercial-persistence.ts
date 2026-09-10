import type {
  BriefVersionStatus,
  FactStatus,
  JourneyStatus,
  PricingModel,
  QuestionnaireLifecycle,
  ScopeCalculation,
} from "@flow/commercial";
import type { SqlExecutor } from "./sql-executor.js";

function pgCellString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value == null) return "";
  return JSON.stringify(value);
}

function postgresTimestamp(value: unknown): string {
  return pgCellString(value);
}

export interface CatalogServiceRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly pricingModel: PricingModel;
  readonly currency: string;
  readonly defaultTargetMarginBps: number;
  readonly defaultContingencyBps: number;
  readonly status: "draft" | "active" | "archived";
  readonly revision: number;
}

export interface CostComponentRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly serviceId: string;
  readonly roleKey: string;
  readonly estimatedMinutes: number;
  readonly internalRatePerHourMinor: string;
  readonly vendorCostMinor: string;
}

export interface QuestionnaireVersionRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly serviceId: string;
  readonly versionNumber: number;
  readonly status: QuestionnaireLifecycle;
  readonly jsonSchema: Record<string, unknown>;
  readonly uiSchema: Record<string, unknown>;
  readonly questionMeta: Record<string, unknown>;
}

export interface ClientRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly industry?: string;
  readonly website?: string;
  readonly status: "active" | "prospect" | "archived";
  readonly revision: number;
}

export interface ContactRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly clientId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly title?: string;
  readonly email?: string;
  readonly isPrimary: boolean;
}

export interface OpportunityRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly clientId: string;
  readonly primaryContactId?: string;
  readonly serviceId: string;
  readonly name: string;
  readonly journeyStatus: JourneyStatus;
  readonly currency: string;
  readonly budgetMinMinor?: string;
  readonly budgetMaxMinor?: string;
  readonly completeness: number;
  readonly latestCalculation?: ScopeCalculation;
  readonly revision: number;
}

export interface DiscoverySourceRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly sessionId: string;
  readonly sourceKind: "meeting_notes" | "transcript" | "document" | "questionnaire";
  readonly originalText: string;
  readonly contentType: string;
}

export interface ExtractedFactRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly opportunityId: string;
  readonly sourceId: string;
  readonly extractionRunId: string;
  readonly candidateFact: string;
  readonly category: string;
  readonly confidenceBps: number;
  readonly status: FactStatus;
  readonly characterStart?: number;
  readonly characterEnd?: number;
  readonly candidateId?: string;
  readonly contradictionRef?: string;
  readonly duplicateOfCandidateId?: string;
  readonly verifiedBy?: string;
  readonly verifiedAt?: string;
}

export type ExtractionRunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "reviewed";

export interface DiscoveryExtractionRunRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly opportunityId: string;
  readonly sourceId: string;
  readonly sourceFingerprint: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly provider: string;
  readonly model: string;
  readonly status: ExtractionRunStatus;
  readonly attemptCount: number;
  readonly idempotencyKey: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly errorCode?: string;
  readonly usageMetadata: Record<string, unknown>;
  readonly latencyMs?: number;
  readonly createdBy?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FollowUpRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly opportunityId: string;
  readonly questionKey: string;
  readonly prompt: string;
  readonly required: boolean;
  readonly answer?: string;
}

export interface BriefVersionRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly briefId: string;
  readonly opportunityId: string;
  readonly versionNumber: number;
  readonly status: BriefVersionStatus;
  readonly calculation?: ScopeCalculation;
  readonly sections: readonly {
    readonly key: string;
    readonly title: string;
    readonly body: string;
  }[];
}

export interface OpportunityRequirementRecord {
  readonly key: string;
  readonly statement: string;
}

export interface OpportunityDeliverableRecord {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

export interface OpportunityBudgetConstraintRecord {
  readonly currency: string;
  readonly minMinor?: string;
  readonly maxMinor?: string;
}

export interface OpportunityTimelineConstraintRecord {
  readonly notes?: string;
}

export interface OpportunityRiskRecord {
  readonly id: string;
  readonly opportunityId: string;
  readonly statement: string;
  readonly blocking: boolean;
  readonly handled: boolean;
}

export interface GuardDecisionRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly opportunityId: string;
  readonly action: string;
  readonly outcome: "ALLOW" | "DENY" | "REQUIRES_APPROVAL";
  readonly reason: string;
  readonly beforeState?: unknown;
  readonly afterState?: unknown;
  readonly createdAt: string;
}

export interface CommercialAuditRecord {
  readonly eventId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly eventType: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly metadata: Record<string, unknown>;
}

export interface CommercialRepository {
  createService(record: CatalogServiceRecord): Promise<CatalogServiceRecord>;
  listServices(workspaceId: string): Promise<readonly CatalogServiceRecord[]>;
  getService(
    workspaceId: string,
    serviceId: string,
  ): Promise<CatalogServiceRecord | undefined>;
  addCostComponent(record: CostComponentRecord): Promise<CostComponentRecord>;
  listCostComponents(
    workspaceId: string,
    serviceId: string,
  ): Promise<readonly CostComponentRecord[]>;
  createQuestionnaire(
    record: QuestionnaireVersionRecord,
  ): Promise<QuestionnaireVersionRecord>;
  publishQuestionnaire(
    workspaceId: string,
    versionId: string,
  ): Promise<QuestionnaireVersionRecord>;
  getPublishedQuestionnaire(
    workspaceId: string,
    serviceId: string,
  ): Promise<QuestionnaireVersionRecord | undefined>;
  listQuestionnaires(
    workspaceId: string,
    serviceId: string,
  ): Promise<readonly QuestionnaireVersionRecord[]>;
  getQuestionnaireVersion(
    workspaceId: string,
    versionId: string,
  ): Promise<QuestionnaireVersionRecord | undefined>;
  duplicatePublishedToDraft(
    workspaceId: string,
    serviceId: string,
  ): Promise<QuestionnaireVersionRecord>;
  listSources(
    workspaceId: string,
    opportunityId: string,
  ): Promise<readonly DiscoverySourceRecord[]>;
  createClient(record: ClientRecord): Promise<ClientRecord>;
  listClients(workspaceId: string): Promise<readonly ClientRecord[]>;
  getClient(
    workspaceId: string,
    clientId: string,
  ): Promise<ClientRecord | undefined>;
  createContact(record: ContactRecord): Promise<ContactRecord>;
  listContacts(
    workspaceId: string,
    clientId: string,
  ): Promise<readonly ContactRecord[]>;
  createOpportunity(record: OpportunityRecord): Promise<OpportunityRecord>;
  listOpportunities(workspaceId: string): Promise<readonly OpportunityRecord[]>;
  getOpportunity(
    workspaceId: string,
    opportunityId: string,
  ): Promise<OpportunityRecord | undefined>;
  updateOpportunity(
    workspaceId: string,
    opportunityId: string,
    expectedRevision: number,
    patch: Partial<OpportunityRecord>,
  ): Promise<OpportunityRecord>;
  saveResponse(input: {
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly questionnaireVersionId: string;
    readonly answers: Record<string, unknown>;
  }): Promise<void>;
  markResponseSubmitted(input: {
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly questionnaireVersionId: string;
    readonly submittedBy: string;
  }): Promise<void>;
  getResponseSubmission(
    workspaceId: string,
    opportunityId: string,
    questionnaireVersionId: string,
  ): Promise<{ readonly submittedAt: string; readonly submittedBy: string } | undefined>;
  getResponse(
    workspaceId: string,
    opportunityId: string,
  ): Promise<Record<string, unknown> | undefined>;
  createSession(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly title: string;
  }): Promise<string>;
  addSource(record: DiscoverySourceRecord): Promise<DiscoverySourceRecord>;
  getSource(
    workspaceId: string,
    sourceId: string,
  ): Promise<DiscoverySourceRecord | undefined>;
  saveFact(record: ExtractedFactRecord): Promise<ExtractedFactRecord>;
  listFacts(
    workspaceId: string,
    opportunityId: string,
  ): Promise<readonly ExtractedFactRecord[]>;
  verifyFact(input: {
    readonly workspaceId: string;
    readonly factId: string;
    readonly status: FactStatus;
    readonly actorId: string;
  }): Promise<ExtractedFactRecord>;
  upsertFollowUp(record: FollowUpRecord): Promise<FollowUpRecord>;
  listFollowUps(
    workspaceId: string,
    opportunityId: string,
  ): Promise<readonly FollowUpRecord[]>;
  answerFollowUp(
    workspaceId: string,
    questionId: string,
    answer: string,
  ): Promise<FollowUpRecord>;
  upsertRequirement(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly key: string;
    readonly statement: string;
    readonly factId?: string;
  }): Promise<void>;
  listRequirements(
    workspaceId: string,
    opportunityId: string,
  ): Promise<readonly OpportunityRequirementRecord[]>;
  addDeliverable(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly name: string;
    readonly description?: string;
  }): Promise<void>;
  listDeliverables(
    workspaceId: string,
    opportunityId: string,
  ): Promise<readonly OpportunityDeliverableRecord[]>;
  upsertBudgetConstraint(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly currency: string;
    readonly minMinor?: string;
    readonly maxMinor?: string;
  }): Promise<void>;
  getBudgetConstraint(
    workspaceId: string,
    opportunityId: string,
  ): Promise<OpportunityBudgetConstraintRecord | undefined>;
  upsertTimelineConstraint(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly notes?: string;
  }): Promise<void>;
  getTimelineConstraint(
    workspaceId: string,
    opportunityId: string,
  ): Promise<OpportunityTimelineConstraintRecord | undefined>;
  addRisk(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly statement: string;
    readonly blocking: boolean;
    readonly handled: boolean;
  }): Promise<void>;
  listRisks(
    workspaceId: string,
    opportunityId: string,
  ): Promise<readonly OpportunityRiskRecord[]>;
  handleRisk(
    workspaceId: string,
    riskId: string,
  ): Promise<OpportunityRiskRecord>;
  updateDeliverable(input: {
    readonly workspaceId: string;
    readonly deliverableId: string;
    readonly name: string;
    readonly description?: string;
  }): Promise<void>;
  updateService(
    workspaceId: string,
    serviceId: string,
    patch: Partial<
      Pick<
        CatalogServiceRecord,
        "name" | "description" | "pricingModel" | "status"
      >
    >,
  ): Promise<CatalogServiceRecord>;
  replaceCostComponents(
    workspaceId: string,
    serviceId: string,
    components: readonly CostComponentRecord[],
  ): Promise<readonly CostComponentRecord[]>;
  updateDraftQuestionnaire(
    workspaceId: string,
    versionId: string,
    patch: Pick<
      QuestionnaireVersionRecord,
      "jsonSchema" | "uiSchema" | "questionMeta"
    >,
  ): Promise<QuestionnaireVersionRecord>;
  addEvidence(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly sourceId?: string;
    readonly factId?: string;
    readonly claimClassification: string;
    readonly excerpt?: string;
  }): Promise<void>;
  countEvidence(workspaceId: string, opportunityId: string): Promise<number>;
  createBriefVersion(record: BriefVersionRecord): Promise<BriefVersionRecord>;
  listBriefVersions(
    workspaceId: string,
    opportunityId: string,
  ): Promise<readonly BriefVersionRecord[]>;
  getBriefVersion(
    workspaceId: string,
    versionId: string,
  ): Promise<BriefVersionRecord | undefined>;
  updateBriefVersionStatus(
    workspaceId: string,
    versionId: string,
    status: BriefVersionStatus,
    actorId?: string,
  ): Promise<BriefVersionRecord>;
  recordGuard(record: GuardDecisionRecord): Promise<void>;
  listGuard(
    workspaceId: string,
    opportunityId: string,
  ): Promise<readonly GuardDecisionRecord[]>;
  recordAudit(record: CommercialAuditRecord): Promise<void>;
  listAudit(
    workspaceId: string,
    targetId: string,
  ): Promise<readonly CommercialAuditRecord[]>;
  consumeIdempotency(input: {
    readonly workspaceId: string;
    readonly key: string;
    readonly requestClass: string;
    readonly fingerprint: string;
  }): Promise<"new" | "replay">;
  createExtractionRun(
    record: DiscoveryExtractionRunRecord,
  ): Promise<DiscoveryExtractionRunRecord>;
  updateExtractionRun(input: {
    readonly workspaceId: string;
    readonly runId: string;
    readonly patch: Partial<
      Pick<
        DiscoveryExtractionRunRecord,
        | "status"
        | "attemptCount"
        | "startedAt"
        | "completedAt"
        | "errorCode"
        | "usageMetadata"
        | "latencyMs"
        | "provider"
        | "model"
      >
    >;
  }): Promise<DiscoveryExtractionRunRecord>;
  getExtractionRunByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<DiscoveryExtractionRunRecord | undefined>;
  listExtractionRuns(
    workspaceId: string,
    opportunityId: string,
  ): Promise<readonly DiscoveryExtractionRunRecord[]>;
}

/* eslint-disable @typescript-eslint/require-await -- in-memory store matches the async repository contract */

function mapExtractionRun(row: Record<string, unknown>): DiscoveryExtractionRunRecord {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    opportunityId: String(row.opportunity_id),
    sourceId: String(row.source_id),
    sourceFingerprint: String(row.source_fingerprint),
    promptVersion: String(row.prompt_version),
    schemaVersion: String(row.schema_version),
    provider: String(row.provider),
    model: String(row.model),
    status: row.status as ExtractionRunStatus,
    attemptCount: Number(row.attempt_count),
    idempotencyKey: String(row.idempotency_key),
    ...(row.started_at ? { startedAt: postgresTimestamp(row.started_at) } : {}),
    ...(row.completed_at ? { completedAt: postgresTimestamp(row.completed_at) } : {}),
    ...(row.error_code ? { errorCode: pgCellString(row.error_code) } : {}),
    usageMetadata: (row.usage_metadata as Record<string, unknown>) ?? {},
    ...(row.latency_ms != null ? { latencyMs: Number(row.latency_ms) } : {}),
    ...(row.created_by ? { createdBy: pgCellString(row.created_by) } : {}),
    createdAt: postgresTimestamp(row.created_at),
    updatedAt: postgresTimestamp(row.updated_at),
  };
}

export class InMemoryCommercialRepository implements CommercialRepository {
  private readonly services = new Map<string, CatalogServiceRecord>();
  private readonly costs: CostComponentRecord[] = [];
  private readonly questionnaires = new Map<
    string,
    QuestionnaireVersionRecord
  >();
  private readonly clients = new Map<string, ClientRecord>();
  private readonly contacts: ContactRecord[] = [];
  private readonly opportunities = new Map<string, OpportunityRecord>();
  private readonly responses = new Map<string, Record<string, unknown>>();
  private readonly responseSubmissions = new Map<
    string,
    { submittedAt: string; submittedBy: string }
  >();
  private readonly sources = new Map<string, DiscoverySourceRecord>();
  private readonly facts = new Map<string, ExtractedFactRecord>();
  private readonly followUps = new Map<string, FollowUpRecord>();
  private readonly requirements = new Map<
    string,
    OpportunityRequirementRecord & {
      workspaceId: string;
      opportunityId: string;
      key: string;
    }
  >();
  private readonly deliverables: (OpportunityDeliverableRecord & {
    workspaceId: string;
    opportunityId: string;
  })[] = [];
  private readonly budgets = new Map<
    string,
    OpportunityBudgetConstraintRecord
  >();
  private readonly timelines = new Map<
    string,
    OpportunityTimelineConstraintRecord
  >();
  private readonly risks: (OpportunityRiskRecord & {
    workspaceId: string;
    opportunityId: string;
  })[] = [];
  private evidenceCount = new Map<string, number>();
  private readonly briefs = new Map<string, BriefVersionRecord>();
  private readonly guards: GuardDecisionRecord[] = [];
  private readonly audits: CommercialAuditRecord[] = [];
  private readonly idempotency = new Map<
    string,
    { readonly requestClass: string; readonly fingerprint: string }
  >();
  private readonly extractionRuns = new Map<string, DiscoveryExtractionRunRecord>();
  private readonly sessions = new Map<
    string,
    { workspaceId: string; opportunityId: string }
  >();

  async createService(record: CatalogServiceRecord) {
    this.services.set(record.id, record);
    return record;
  }
  async listServices(workspaceId: string) {
    return [...this.services.values()].filter(
      (row) => row.workspaceId === workspaceId,
    );
  }
  async getService(workspaceId: string, serviceId: string) {
    const row = this.services.get(serviceId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }
  async addCostComponent(record: CostComponentRecord) {
    this.costs.push(record);
    return record;
  }
  async listCostComponents(workspaceId: string, serviceId: string) {
    return this.costs.filter(
      (row) => row.workspaceId === workspaceId && row.serviceId === serviceId,
    );
  }
  async createQuestionnaire(record: QuestionnaireVersionRecord) {
    this.questionnaires.set(record.id, record);
    return record;
  }
  async publishQuestionnaire(workspaceId: string, versionId: string) {
    const current = this.questionnaires.get(versionId);
    if (!current || current.workspaceId !== workspaceId) {
      throw new Error("Questionnaire not found.");
    }
    if (current.status !== "draft") {
      throw new Error("Only draft questionnaires can be published.");
    }
    for (const [id, row] of this.questionnaires) {
      if (
        row.workspaceId === workspaceId &&
        row.serviceId === current.serviceId &&
        row.status === "published"
      ) {
        this.questionnaires.set(id, { ...row, status: "archived" });
      }
    }
    const published = { ...current, status: "published" as const };
    this.questionnaires.set(versionId, published);
    const service = this.services.get(current.serviceId);
    if (service && service.workspaceId === workspaceId) {
      this.services.set(current.serviceId, { ...service, status: "active" });
    }
    return published;
  }
  async getPublishedQuestionnaire(workspaceId: string, serviceId: string) {
    return [...this.questionnaires.values()].find(
      (row) =>
        row.workspaceId === workspaceId &&
        row.serviceId === serviceId &&
        row.status === "published",
    );
  }
  async listQuestionnaires(workspaceId: string, serviceId: string) {
    return [...this.questionnaires.values()].filter(
      (row) => row.workspaceId === workspaceId && row.serviceId === serviceId,
    );
  }
  async getQuestionnaireVersion(workspaceId: string, versionId: string) {
    const row = this.questionnaires.get(versionId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }
  async duplicatePublishedToDraft(workspaceId: string, serviceId: string) {
    const existingDraft = [...this.questionnaires.values()].find(
      (row) =>
        row.workspaceId === workspaceId &&
        row.serviceId === serviceId &&
        row.status === "draft",
    );
    if (existingDraft) return existingDraft;
    const published = await this.getPublishedQuestionnaire(workspaceId, serviceId);
    if (!published) {
      throw new Error("No published questionnaire to duplicate.");
    }
    const versions = await this.listQuestionnaires(workspaceId, serviceId);
    const versionNumber =
      Math.max(0, ...versions.map((row) => row.versionNumber)) + 1;
    const draft = {
      ...published,
      id: crypto.randomUUID(),
      versionNumber,
      status: "draft" as const,
      jsonSchema: { ...published.jsonSchema },
      uiSchema: { ...published.uiSchema },
      questionMeta: { ...published.questionMeta },
    };
    this.questionnaires.set(draft.id, draft);
    return draft;
  }
  async createClient(record: ClientRecord) {
    this.clients.set(record.id, record);
    return record;
  }
  async listClients(workspaceId: string) {
    return [...this.clients.values()].filter(
      (row) => row.workspaceId === workspaceId,
    );
  }
  async getClient(workspaceId: string, clientId: string) {
    const row = this.clients.get(clientId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }
  async createContact(record: ContactRecord) {
    this.contacts.push(record);
    return record;
  }
  async listContacts(workspaceId: string, clientId: string) {
    return this.contacts.filter(
      (row) => row.workspaceId === workspaceId && row.clientId === clientId,
    );
  }
  async createOpportunity(record: OpportunityRecord) {
    this.opportunities.set(record.id, record);
    return record;
  }
  async listOpportunities(workspaceId: string) {
    return [...this.opportunities.values()].filter(
      (row) => row.workspaceId === workspaceId,
    );
  }
  async getOpportunity(workspaceId: string, opportunityId: string) {
    const row = this.opportunities.get(opportunityId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }
  async updateOpportunity(
    workspaceId: string,
    opportunityId: string,
    expectedRevision: number,
    patch: Partial<OpportunityRecord>,
  ) {
    const current = await this.getOpportunity(workspaceId, opportunityId);
    if (!current) throw new Error("Opportunity not found.");
    if (current.revision !== expectedRevision) {
      const error = new Error("Opportunity revision conflict.");
      (error as Error & { status: number }).status = 409;
      throw error;
    }
    const next = {
      ...current,
      ...patch,
      workspaceId,
      id: current.id,
      revision: current.revision + 1,
    };
    this.opportunities.set(opportunityId, next);
    return next;
  }
  async saveResponse(input: {
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly questionnaireVersionId: string;
    readonly answers: Record<string, unknown>;
  }) {
    this.responses.set(
      `${input.workspaceId}:${input.opportunityId}`,
      input.answers,
    );
  }
  async getResponse(workspaceId: string, opportunityId: string) {
    return this.responses.get(`${workspaceId}:${opportunityId}`);
  }
  async markResponseSubmitted(input: {
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly questionnaireVersionId: string;
    readonly submittedBy: string;
  }) {
    this.responseSubmissions.set(
      `${input.workspaceId}:${input.opportunityId}:${input.questionnaireVersionId}`,
      { submittedAt: new Date().toISOString(), submittedBy: input.submittedBy },
    );
  }
  async getResponseSubmission(
    workspaceId: string,
    opportunityId: string,
    questionnaireVersionId: string,
  ) {
    return this.responseSubmissions.get(
      `${workspaceId}:${opportunityId}:${questionnaireVersionId}`,
    );
  }
  async createSession(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly title: string;
  }) {
    this.sessions.set(input.id, {
      workspaceId: input.workspaceId,
      opportunityId: input.opportunityId,
    });
    return input.id;
  }
  async addSource(record: DiscoverySourceRecord) {
    this.sources.set(record.id, record);
    return record;
  }
  async getSource(workspaceId: string, sourceId: string) {
    const row = this.sources.get(sourceId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }
  async listSources(workspaceId: string, opportunityId: string) {
    const sessionIds = new Set(
      [...this.sessions.entries()]
        .filter(
          ([, session]) =>
            session.workspaceId === workspaceId &&
            session.opportunityId === opportunityId,
        )
        .map(([id]) => id),
    );
    return [...this.sources.values()].filter(
      (row) => row.workspaceId === workspaceId && sessionIds.has(row.sessionId),
    );
  }
  async saveFact(record: ExtractedFactRecord) {
    const duplicate = [...this.facts.values()].find(
      (row) =>
        row.workspaceId === record.workspaceId &&
        row.sourceId === record.sourceId &&
        row.candidateFact === record.candidateFact &&
        row.category === record.category,
    );
    if (duplicate) return duplicate;
    this.facts.set(record.id, record);
    return record;
  }
  async listFacts(workspaceId: string, opportunityId: string) {
    return [...this.facts.values()].filter(
      (row) =>
        row.workspaceId === workspaceId && row.opportunityId === opportunityId,
    );
  }
  async verifyFact(input: {
    readonly workspaceId: string;
    readonly factId: string;
    readonly status: FactStatus;
    readonly actorId: string;
  }) {
    const current = this.facts.get(input.factId);
    if (!current || current.workspaceId !== input.workspaceId) {
      throw new Error("Fact not found.");
    }
    const next = {
      ...current,
      status: input.status,
      verifiedBy: input.actorId,
      verifiedAt: new Date().toISOString(),
    };
    this.facts.set(input.factId, next);
    return next;
  }
  async upsertFollowUp(record: FollowUpRecord) {
    this.followUps.set(record.id, record);
    return record;
  }
  async listFollowUps(workspaceId: string, opportunityId: string) {
    return [...this.followUps.values()].filter(
      (row) =>
        row.workspaceId === workspaceId && row.opportunityId === opportunityId,
    );
  }
  async answerFollowUp(
    workspaceId: string,
    questionId: string,
    answer: string,
  ) {
    const current = this.followUps.get(questionId);
    if (!current || current.workspaceId !== workspaceId) {
      throw new Error("Follow-up not found.");
    }
    const next = { ...current, answer };
    this.followUps.set(questionId, next);
    return next;
  }
  async upsertRequirement(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly key: string;
    readonly statement: string;
    readonly factId?: string;
  }) {
    this.requirements.set(
      `${input.workspaceId}:${input.opportunityId}:${input.key}`,
      {
        workspaceId: input.workspaceId,
        opportunityId: input.opportunityId,
        key: input.key,
        statement: input.statement,
      },
    );
  }
  async listRequirements(workspaceId: string, opportunityId: string) {
    return [...this.requirements.values()].filter(
      (row) =>
        row.workspaceId === workspaceId && row.opportunityId === opportunityId,
    );
  }
  async addDeliverable(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly name: string;
    readonly description?: string;
  }) {
    if (
      this.deliverables.some(
        (row) =>
          row.workspaceId === input.workspaceId &&
          row.opportunityId === input.opportunityId &&
          row.name === input.name,
      )
    ) {
      return;
    }
    this.deliverables.push({
      id: input.id,
      workspaceId: input.workspaceId,
      opportunityId: input.opportunityId,
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
    });
  }
  async listDeliverables(workspaceId: string, opportunityId: string) {
    return this.deliverables.filter(
      (row) =>
        row.workspaceId === workspaceId && row.opportunityId === opportunityId,
    );
  }
  async upsertBudgetConstraint(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly currency: string;
    readonly minMinor?: string;
    readonly maxMinor?: string;
  }) {
    this.budgets.set(`${input.workspaceId}:${input.opportunityId}`, {
      currency: input.currency,
      ...(input.minMinor ? { minMinor: input.minMinor } : {}),
      ...(input.maxMinor ? { maxMinor: input.maxMinor } : {}),
    });
  }
  async getBudgetConstraint(workspaceId: string, opportunityId: string) {
    return this.budgets.get(`${workspaceId}:${opportunityId}`);
  }
  async upsertTimelineConstraint(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly notes?: string;
  }) {
    this.timelines.set(`${input.workspaceId}:${input.opportunityId}`, {
      ...(input.notes ? { notes: input.notes } : {}),
    });
  }
  async getTimelineConstraint(workspaceId: string, opportunityId: string) {
    return this.timelines.get(`${workspaceId}:${opportunityId}`);
  }
  async addRisk(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly statement: string;
    readonly blocking: boolean;
    readonly handled: boolean;
  }) {
    if (
      this.risks.some(
        (row) =>
          row.workspaceId === input.workspaceId &&
          row.opportunityId === input.opportunityId &&
          row.statement === input.statement,
      )
    ) {
      return;
    }
    this.risks.push({
      id: input.id,
      workspaceId: input.workspaceId,
      opportunityId: input.opportunityId,
      statement: input.statement,
      blocking: input.blocking,
      handled: input.handled,
    });
  }
  async listRisks(workspaceId: string, opportunityId: string) {
    return this.risks
      .filter(
        (row) =>
          row.workspaceId === workspaceId &&
          row.opportunityId === opportunityId,
      )
      .map(({ id, opportunityId: oppId, statement, blocking, handled }) => ({
        id,
        opportunityId: oppId,
        statement,
        blocking,
        handled,
      }));
  }
  async handleRisk(workspaceId: string, riskId: string) {
    const index = this.risks.findIndex(
      (row) => row.id === riskId && row.workspaceId === workspaceId,
    );
    const current = this.risks[index];
    if (index < 0 || !current) throw new Error("Risk not found.");
    const next = { ...current, handled: true };
    this.risks[index] = next;
    return {
      id: next.id,
      opportunityId: next.opportunityId,
      statement: next.statement,
      blocking: next.blocking,
      handled: next.handled,
    };
  }
  async updateDeliverable(input: {
    readonly workspaceId: string;
    readonly deliverableId: string;
    readonly name: string;
    readonly description?: string;
  }) {
    const current = this.deliverables.find(
      (row) =>
        row.id === input.deliverableId && row.workspaceId === input.workspaceId,
    );
    if (!current) throw new Error("Deliverable not found.");
    Object.assign(current, {
      name: input.name,
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    });
  }
  async updateService(
    workspaceId: string,
    serviceId: string,
    patch: Partial<
      Pick<
        CatalogServiceRecord,
        "name" | "description" | "pricingModel" | "status"
      >
    >,
  ) {
    const current = await this.getService(workspaceId, serviceId);
    if (!current) throw new Error("Service not found.");
    const next = { ...current, ...patch, revision: current.revision + 1 };
    this.services.set(serviceId, next);
    return next;
  }
  async replaceCostComponents(
    workspaceId: string,
    serviceId: string,
    components: readonly CostComponentRecord[],
  ) {
    for (let index = this.costs.length - 1; index >= 0; index -= 1) {
      const row = this.costs[index];
      if (row?.workspaceId === workspaceId && row.serviceId === serviceId) {
        this.costs.splice(index, 1);
      }
    }
    this.costs.push(...components);
    return components;
  }
  async updateDraftQuestionnaire(
    workspaceId: string,
    versionId: string,
    patch: Pick<
      QuestionnaireVersionRecord,
      "jsonSchema" | "uiSchema" | "questionMeta"
    >,
  ) {
    const current = this.questionnaires.get(versionId);
    if (!current || current.workspaceId !== workspaceId) {
      throw new Error("Questionnaire not found.");
    }
    if (current.status !== "draft") {
      throw new Error("Published questionnaires cannot be changed.");
    }
    const next = { ...current, ...patch };
    this.questionnaires.set(versionId, next);
    return next;
  }
  async addEvidence(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly sourceId?: string;
    readonly factId?: string;
    readonly claimClassification: string;
    readonly excerpt?: string;
  }) {
    const key = `${input.workspaceId}:${input.opportunityId}`;
    this.evidenceCount.set(key, (this.evidenceCount.get(key) ?? 0) + 1);
  }
  async countEvidence(workspaceId: string, opportunityId: string) {
    return this.evidenceCount.get(`${workspaceId}:${opportunityId}`) ?? 0;
  }
  async createBriefVersion(record: BriefVersionRecord) {
    this.briefs.set(record.id, record);
    return record;
  }
  async listBriefVersions(workspaceId: string, opportunityId: string) {
    return [...this.briefs.values()].filter(
      (row) =>
        row.workspaceId === workspaceId && row.opportunityId === opportunityId,
    );
  }
  async getBriefVersion(workspaceId: string, versionId: string) {
    const row = this.briefs.get(versionId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }
  async updateBriefVersionStatus(
    workspaceId: string,
    versionId: string,
    status: BriefVersionStatus,
    actorId?: string,
  ) {
    void actorId;
    const current = await this.getBriefVersion(workspaceId, versionId);
    if (!current) throw new Error("Brief version not found.");
    if (current.status === "approved") {
      throw new Error("approved brief versions are immutable");
    }
    const next = { ...current, status };
    this.briefs.set(versionId, next);
    return next;
  }
  async recordGuard(record: GuardDecisionRecord) {
    this.guards.push(record);
  }
  async listGuard(workspaceId: string, opportunityId: string) {
    return this.guards.filter(
      (row) =>
        row.workspaceId === workspaceId && row.opportunityId === opportunityId,
    );
  }
  async recordAudit(record: CommercialAuditRecord) {
    this.audits.push(record);
  }
  async listAudit(workspaceId: string, targetId: string) {
    return this.audits.filter(
      (row) => row.workspaceId === workspaceId && row.targetId === targetId,
    );
  }
  async consumeIdempotency(input: {
    readonly workspaceId: string;
    readonly key: string;
    readonly requestClass: string;
    readonly fingerprint: string;
  }) {
    const token = `${input.workspaceId}:${input.key}`;
    const existing = this.idempotency.get(token);
    if (existing) {
      if (
        existing.requestClass !== input.requestClass ||
        existing.fingerprint !== input.fingerprint
      ) {
        throw new Error("Idempotency key conflicts with a different request.");
      }
      return "replay";
    }
    this.idempotency.set(token, {
      requestClass: input.requestClass,
      fingerprint: input.fingerprint,
    });
    return "new";
  }
  async createExtractionRun(record: DiscoveryExtractionRunRecord) {
    this.extractionRuns.set(record.id, record);
    return record;
  }
  async updateExtractionRun(input: {
    readonly workspaceId: string;
    readonly runId: string;
    readonly patch: Partial<
      Pick<
        DiscoveryExtractionRunRecord,
        | "status"
        | "attemptCount"
        | "startedAt"
        | "completedAt"
        | "errorCode"
        | "usageMetadata"
        | "latencyMs"
        | "provider"
        | "model"
      >
    >;
  }) {
    const current = this.extractionRuns.get(input.runId);
    if (!current || current.workspaceId !== input.workspaceId) {
      throw new Error("Extraction run not found.");
    }
    const next = {
      ...current,
      ...input.patch,
      updatedAt: new Date().toISOString(),
    };
    this.extractionRuns.set(input.runId, next);
    return next;
  }
  async getExtractionRunByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ) {
    return [...this.extractionRuns.values()].find(
      (row) =>
        row.workspaceId === workspaceId && row.idempotencyKey === idempotencyKey,
    );
  }
  async listExtractionRuns(workspaceId: string, opportunityId: string) {
    return [...this.extractionRuns.values()]
      .filter(
        (row) =>
          row.workspaceId === workspaceId && row.opportunityId === opportunityId,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export class PostgresCommercialRepository implements CommercialRepository {
  constructor(private readonly db: SqlExecutor) {}

  async createService(record: CatalogServiceRecord) {
    await this.db.query(
      `insert into public.catalog_services
        (id, workspace_id, name, slug, description, pricing_model, currency,
         default_target_margin_bps, default_contingency_bps, status, revision)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        record.id,
        record.workspaceId,
        record.name,
        record.slug,
        record.description ?? null,
        record.pricingModel,
        record.currency,
        record.defaultTargetMarginBps,
        record.defaultContingencyBps,
        record.status,
        record.revision,
      ],
    );
    return record;
  }
  async listServices(workspaceId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select id, workspace_id, name, slug, description, pricing_model, currency,
              default_target_margin_bps, default_contingency_bps, status, revision
       from public.catalog_services where workspace_id = $1 and archived_at is null
       order by created_at`,
      [workspaceId],
    );
    return result.rows.map((row) => this.mapService(row));
  }
  async getService(workspaceId: string, serviceId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.catalog_services where id = $1 and workspace_id = $2`,
      [serviceId, workspaceId],
    );
    const row = result.rows[0];
    return row ? this.mapService(row) : undefined;
  }
  private mapService(row: Record<string, unknown>): CatalogServiceRecord {
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id ?? row.workspaceId),
      name: String(row.name),
      slug: String(row.slug),
      ...(row.description ? { description: pgCellString(row.description) } : {}),
      pricingModel: (row.pricing_model ?? row.pricingModel) as PricingModel,
      currency: String(row.currency),
      defaultTargetMarginBps: Number(
        row.default_target_margin_bps ?? row.defaultTargetMarginBps,
      ),
      defaultContingencyBps: Number(
        row.default_contingency_bps ?? row.defaultContingencyBps,
      ),
      status: row.status as CatalogServiceRecord["status"],
      revision: Number(row.revision),
    };
  }
  async addCostComponent(record: CostComponentRecord) {
    await this.db.query(
      `insert into public.catalog_service_cost_components
        (id, workspace_id, service_id, role_key, estimated_minutes, internal_rate_per_hour_minor, vendor_cost_minor)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        record.id,
        record.workspaceId,
        record.serviceId,
        record.roleKey,
        record.estimatedMinutes,
        record.internalRatePerHourMinor,
        record.vendorCostMinor,
      ],
    );
    return record;
  }
  async listCostComponents(workspaceId: string, serviceId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.catalog_service_cost_components where workspace_id = $1 and service_id = $2`,
      [workspaceId, serviceId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      serviceId: String(row.service_id),
      roleKey: String(row.role_key),
      estimatedMinutes: Number(row.estimated_minutes),
      internalRatePerHourMinor: String(row.internal_rate_per_hour_minor),
      vendorCostMinor: String(row.vendor_cost_minor),
    }));
  }
  async createQuestionnaire(record: QuestionnaireVersionRecord) {
    await this.db.query(
      `insert into public.catalog_questionnaire_versions
        (id, workspace_id, service_id, version_number, status, json_schema, ui_schema, question_meta)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)`,
      [
        record.id,
        record.workspaceId,
        record.serviceId,
        record.versionNumber,
        record.status,
        JSON.stringify(record.jsonSchema),
        JSON.stringify(record.uiSchema),
        JSON.stringify(record.questionMeta),
      ],
    );
    return record;
  }
  async publishQuestionnaire(workspaceId: string, versionId: string) {
    await this.db.query(
      `update public.catalog_questionnaire_versions
         set status = 'archived'
       where workspace_id = $1
         and service_id = (select service_id from public.catalog_questionnaire_versions where id = $2)
         and status = 'published'`,
      [workspaceId, versionId],
    );
    const result = await this.db.query<Record<string, unknown>>(
      `update public.catalog_questionnaire_versions
          set status = 'published', published_at = now()
        where id = $1 and workspace_id = $2 and status = 'draft'
        returning *`,
      [versionId, workspaceId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Only draft questionnaires can be published.");
    await this.db.query(
      `update public.catalog_services
          set status = 'active', updated_at = now()
        where id = $1 and workspace_id = $2`,
      [row.service_id, workspaceId],
    );
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      serviceId: String(row.service_id),
      versionNumber: Number(row.version_number),
      status: "published" as const,
      jsonSchema: row.json_schema as Record<string, unknown>,
      uiSchema: row.ui_schema as Record<string, unknown>,
      questionMeta: row.question_meta as Record<string, unknown>,
    };
  }
  async getPublishedQuestionnaire(workspaceId: string, serviceId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.catalog_questionnaire_versions
        where workspace_id = $1 and service_id = $2 and status = 'published'`,
      [workspaceId, serviceId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      serviceId: String(row.service_id),
      versionNumber: Number(row.version_number),
      status: "published" as const,
      jsonSchema: row.json_schema as Record<string, unknown>,
      uiSchema: (row.ui_schema as Record<string, unknown>) ?? {},
      questionMeta: (row.question_meta as Record<string, unknown>) ?? {},
    };
  }
  async listQuestionnaires(workspaceId: string, serviceId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.catalog_questionnaire_versions
        where workspace_id = $1 and service_id = $2
        order by version_number desc`,
      [workspaceId, serviceId],
    );
    return result.rows.map((row) => this.mapQuestionnaire(row));
  }
  async getQuestionnaireVersion(workspaceId: string, versionId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.catalog_questionnaire_versions
        where workspace_id = $1 and id = $2`,
      [workspaceId, versionId],
    );
    const row = result.rows[0];
    return row ? this.mapQuestionnaire(row) : undefined;
  }
  async duplicatePublishedToDraft(workspaceId: string, serviceId: string) {
    const existingDraft = await this.db.query<Record<string, unknown>>(
      `select * from public.catalog_questionnaire_versions
        where workspace_id = $1 and service_id = $2 and status = 'draft'`,
      [workspaceId, serviceId],
    );
    const draftRow = existingDraft.rows[0];
    if (draftRow) return this.mapQuestionnaire(draftRow);
    const published = await this.getPublishedQuestionnaire(workspaceId, serviceId);
    if (!published) {
      throw new Error("No published questionnaire to duplicate.");
    }
    const versions = await this.listQuestionnaires(workspaceId, serviceId);
    const versionNumber =
      Math.max(0, ...versions.map((row) => row.versionNumber)) + 1;
    const id = crypto.randomUUID();
    const record: QuestionnaireVersionRecord = {
      id,
      workspaceId,
      serviceId,
      versionNumber,
      status: "draft",
      jsonSchema: published.jsonSchema,
      uiSchema: published.uiSchema,
      questionMeta: published.questionMeta,
    };
    await this.createQuestionnaire(record);
    return record;
  }
  private mapQuestionnaire(
    row: Record<string, unknown>,
  ): QuestionnaireVersionRecord {
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      serviceId: String(row.service_id),
      versionNumber: Number(row.version_number),
      status: row.status as QuestionnaireLifecycle,
      jsonSchema: row.json_schema as Record<string, unknown>,
      uiSchema: (row.ui_schema as Record<string, unknown>) ?? {},
      questionMeta: (row.question_meta as Record<string, unknown>) ?? {},
    };
  }
  async createClient(record: ClientRecord) {
    await this.db.query(
      `insert into public.crm_clients (id, workspace_id, name, industry, website, status, revision)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        record.id,
        record.workspaceId,
        record.name,
        record.industry ?? null,
        record.website ?? null,
        record.status,
        record.revision,
      ],
    );
    return record;
  }
  async listClients(workspaceId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.crm_clients where workspace_id = $1 and archived_at is null order by name`,
      [workspaceId],
    );
    return result.rows.map((row) => this.mapClient(row));
  }
  async getClient(workspaceId: string, clientId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.crm_clients where id = $1 and workspace_id = $2`,
      [clientId, workspaceId],
    );
    return result.rows[0] ? this.mapClient(result.rows[0]) : undefined;
  }
  private mapClient(row: Record<string, unknown>): ClientRecord {
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      name: String(row.name),
      ...(row.industry ? { industry: pgCellString(row.industry) } : {}),
      ...(row.website ? { website: pgCellString(row.website) } : {}),
      status: row.status as ClientRecord["status"],
      revision: Number(row.revision),
    };
  }
  async createContact(record: ContactRecord) {
    await this.db.query(
      `insert into public.crm_contacts
        (id, workspace_id, client_id, first_name, last_name, title, email, is_primary)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        record.id,
        record.workspaceId,
        record.clientId,
        record.firstName,
        record.lastName,
        record.title ?? null,
        record.email ?? null,
        record.isPrimary,
      ],
    );
    return record;
  }
  async listContacts(workspaceId: string, clientId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.crm_contacts where workspace_id = $1 and client_id = $2`,
      [workspaceId, clientId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      clientId: String(row.client_id),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      ...(row.title ? { title: pgCellString(row.title) } : {}),
      ...(row.email ? { email: pgCellString(row.email) } : {}),
      isPrimary: Boolean(row.is_primary),
    }));
  }
  async createOpportunity(record: OpportunityRecord) {
    await this.db.query(
      `insert into public.crm_opportunities
        (id, workspace_id, client_id, primary_contact_id, service_id, name, journey_status,
         currency, budget_min_minor, budget_max_minor, completeness, latest_calculation, revision)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)`,
      [
        record.id,
        record.workspaceId,
        record.clientId,
        record.primaryContactId ?? null,
        record.serviceId,
        record.name,
        record.journeyStatus,
        record.currency,
        record.budgetMinMinor ?? null,
        record.budgetMaxMinor ?? null,
        record.completeness,
        record.latestCalculation
          ? JSON.stringify(record.latestCalculation)
          : null,
        record.revision,
      ],
    );
    return record;
  }
  async listOpportunities(workspaceId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.crm_opportunities where workspace_id = $1 and archived_at is null order by created_at desc`,
      [workspaceId],
    );
    return result.rows.map((row) => this.mapOpportunity(row));
  }
  async getOpportunity(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.crm_opportunities where id = $1 and workspace_id = $2`,
      [opportunityId, workspaceId],
    );
    return result.rows[0] ? this.mapOpportunity(result.rows[0]) : undefined;
  }
  private mapOpportunity(row: Record<string, unknown>): OpportunityRecord {
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      clientId: String(row.client_id),
      ...(row.primary_contact_id
        ? { primaryContactId: pgCellString(row.primary_contact_id) }
        : {}),
      serviceId: String(row.service_id),
      name: String(row.name),
      journeyStatus: row.journey_status as JourneyStatus,
      currency: String(row.currency),
      ...(row.budget_min_minor != null
        ? { budgetMinMinor: pgCellString(row.budget_min_minor) }
        : {}),
      ...(row.budget_max_minor != null
        ? { budgetMaxMinor: pgCellString(row.budget_max_minor) }
        : {}),
      completeness: Number(row.completeness),
      ...(row.latest_calculation
        ? { latestCalculation: row.latest_calculation as ScopeCalculation }
        : {}),
      revision: Number(row.revision),
    };
  }
  async updateOpportunity(
    workspaceId: string,
    opportunityId: string,
    expectedRevision: number,
    patch: Partial<OpportunityRecord>,
  ) {
    const result = await this.db.query<Record<string, unknown>>(
      `update public.crm_opportunities
          set journey_status = coalesce($4, journey_status),
              completeness = coalesce($5, completeness),
              latest_calculation = coalesce($6::jsonb, latest_calculation),
              revision = revision + 1,
              updated_at = now()
        where id = $1 and workspace_id = $2 and revision = $3
        returning *`,
      [
        opportunityId,
        workspaceId,
        expectedRevision,
        patch.journeyStatus ?? null,
        patch.completeness ?? null,
        patch.latestCalculation
          ? JSON.stringify(patch.latestCalculation)
          : null,
      ],
    );
    const row = result.rows[0];
    if (!row) {
      const error = new Error("Opportunity revision conflict.");
      (error as Error & { status: number }).status = 409;
      throw error;
    }
    return this.mapOpportunity(row);
  }
  async saveResponse(input: {
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly questionnaireVersionId: string;
    readonly answers: Record<string, unknown>;
  }) {
    await this.db.query(
      `insert into public.catalog_questionnaire_responses
        (workspace_id, opportunity_id, questionnaire_version_id, answers)
       values ($1,$2,$3,$4::jsonb)
       on conflict (opportunity_id, questionnaire_version_id)
       do update set answers = excluded.answers, revision = catalog_questionnaire_responses.revision + 1, updated_at = now()`,
      [
        input.workspaceId,
        input.opportunityId,
        input.questionnaireVersionId,
        JSON.stringify(input.answers),
      ],
    );
  }
  async getResponse(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<{ answers: Record<string, unknown> }>(
      `select answers from public.catalog_questionnaire_responses
        where workspace_id = $1 and opportunity_id = $2
        order by updated_at desc limit 1`,
      [workspaceId, opportunityId],
    );
    return result.rows[0]?.answers;
  }
  async markResponseSubmitted(input: {
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly questionnaireVersionId: string;
    readonly submittedBy: string;
  }) {
    await this.db.query(
      `update public.catalog_questionnaire_responses
          set submitted_at = now(), submitted_by = $4
        where workspace_id = $1 and opportunity_id = $2 and questionnaire_version_id = $3`,
      [
        input.workspaceId,
        input.opportunityId,
        input.questionnaireVersionId,
        input.submittedBy,
      ],
    );
  }
  async getResponseSubmission(
    workspaceId: string,
    opportunityId: string,
    questionnaireVersionId: string,
  ) {
    const result = await this.db.query<{
      submitted_at: string;
      submitted_by: string;
    }>(
      `select submitted_at, submitted_by from public.catalog_questionnaire_responses
        where workspace_id = $1 and opportunity_id = $2 and questionnaire_version_id = $3`,
      [workspaceId, opportunityId, questionnaireVersionId],
    );
    const row = result.rows[0];
    if (!row?.submitted_at || !row.submitted_by) return undefined;
    return {
      submittedAt: postgresTimestamp(row.submitted_at),
      submittedBy: String(row.submitted_by),
    };
  }
  async createSession(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly title: string;
  }) {
    await this.db.query(
      `insert into public.discovery_sessions (id, workspace_id, opportunity_id, title)
       values ($1,$2,$3,$4)`,
      [input.id, input.workspaceId, input.opportunityId, input.title],
    );
    return input.id;
  }
  async addSource(record: DiscoverySourceRecord) {
    await this.db.query(
      `insert into public.discovery_sources
        (id, workspace_id, session_id, source_kind, original_text, content_type)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        record.id,
        record.workspaceId,
        record.sessionId,
        record.sourceKind,
        record.originalText,
        record.contentType,
      ],
    );
    return record;
  }
  async getSource(workspaceId: string, sourceId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.discovery_sources where id = $1 and workspace_id = $2`,
      [sourceId, workspaceId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      sessionId: String(row.session_id),
      sourceKind: row.source_kind as DiscoverySourceRecord["sourceKind"],
      originalText: String(row.original_text),
      contentType: String(row.content_type),
    };
  }
  async listSources(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select src.*
         from public.discovery_sources src
         join public.discovery_sessions sess on sess.id = src.session_id
        where src.workspace_id = $1 and sess.opportunity_id = $2
        order by src.created_at`,
      [workspaceId, opportunityId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      sessionId: String(row.session_id),
      sourceKind: row.source_kind as DiscoverySourceRecord["sourceKind"],
      originalText: String(row.original_text),
      contentType: String(row.content_type),
    }));
  }
  async saveFact(record: ExtractedFactRecord) {
    await this.db.query(
      `insert into public.extracted_facts
        (id, workspace_id, opportunity_id, source_id, extraction_run_id, candidate_fact,
         category, confidence_bps, status, character_start, character_end,
         candidate_id, contradiction_ref, duplicate_of_candidate_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (workspace_id, source_id, candidate_fact, category) do nothing`,
      [
        record.id,
        record.workspaceId,
        record.opportunityId,
        record.sourceId,
        record.extractionRunId,
        record.candidateFact,
        record.category,
        record.confidenceBps,
        record.status,
        record.characterStart ?? null,
        record.characterEnd ?? null,
        record.candidateId ?? null,
        record.contradictionRef ?? null,
        record.duplicateOfCandidateId ?? null,
      ],
    );
    return record;
  }
  async listFacts(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.extracted_facts where workspace_id = $1 and opportunity_id = $2`,
      [workspaceId, opportunityId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      opportunityId: String(row.opportunity_id),
      sourceId: String(row.source_id),
      extractionRunId: String(row.extraction_run_id),
      candidateFact: String(row.candidate_fact),
      category: String(row.category),
      confidenceBps: Number(row.confidence_bps),
      status: row.status as FactStatus,
      ...(row.character_start != null
        ? { characterStart: Number(row.character_start) }
        : {}),
      ...(row.character_end != null
        ? { characterEnd: Number(row.character_end) }
        : {}),
      ...(row.candidate_id ? { candidateId: pgCellString(row.candidate_id) } : {}),
      ...(row.contradiction_ref
        ? { contradictionRef: pgCellString(row.contradiction_ref) }
        : {}),
      ...(row.duplicate_of_candidate_id
        ? { duplicateOfCandidateId: pgCellString(row.duplicate_of_candidate_id) }
        : {}),
      ...(row.verified_by ? { verifiedBy: pgCellString(row.verified_by) } : {}),
      ...(row.verified_at ? { verifiedAt: postgresTimestamp(row.verified_at) } : {}),
    }));
  }
  async verifyFact(input: {
    readonly workspaceId: string;
    readonly factId: string;
    readonly status: FactStatus;
    readonly actorId: string;
  }) {
    const result = await this.db.query<Record<string, unknown>>(
      `update public.extracted_facts
          set status = $3, verified_by = $4, verified_at = now()
        where id = $1 and workspace_id = $2
        returning *`,
      [input.factId, input.workspaceId, input.status, input.actorId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Fact not found.");
    return (
      await this.listFacts(input.workspaceId, String(row.opportunity_id))
    ).find((fact) => fact.id === input.factId)!;
  }
  async upsertFollowUp(record: FollowUpRecord) {
    await this.db.query(
      `insert into public.follow_up_questions
        (id, workspace_id, opportunity_id, question_key, prompt, required, answer)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (opportunity_id, question_key)
       do update set prompt = excluded.prompt, required = excluded.required`,
      [
        record.id,
        record.workspaceId,
        record.opportunityId,
        record.questionKey,
        record.prompt,
        record.required,
        record.answer ?? null,
      ],
    );
    return record;
  }
  async listFollowUps(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.follow_up_questions where workspace_id = $1 and opportunity_id = $2`,
      [workspaceId, opportunityId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      opportunityId: String(row.opportunity_id),
      questionKey: String(row.question_key),
      prompt: String(row.prompt),
      required: Boolean(row.required),
      ...(row.answer ? { answer: pgCellString(row.answer) } : {}),
    }));
  }
  async answerFollowUp(
    workspaceId: string,
    questionId: string,
    answer: string,
  ) {
    const result = await this.db.query<Record<string, unknown>>(
      `update public.follow_up_questions
          set answer = $3, answered_at = now()
        where id = $1 and workspace_id = $2
        returning *`,
      [questionId, workspaceId, answer],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Follow-up not found.");
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      opportunityId: String(row.opportunity_id),
      questionKey: String(row.question_key),
      prompt: String(row.prompt),
      required: Boolean(row.required),
      answer,
    };
  }
  async upsertRequirement(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly key: string;
    readonly statement: string;
    readonly factId?: string;
  }) {
    await this.db.query(
      `insert into public.opportunity_requirements
        (id, workspace_id, opportunity_id, key, statement, fact_id)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (opportunity_id, key)
       do update set statement = excluded.statement, fact_id = excluded.fact_id`,
      [
        input.id,
        input.workspaceId,
        input.opportunityId,
        input.key,
        input.statement,
        input.factId ?? null,
      ],
    );
  }
  async listRequirements(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<{ key: string; statement: string }>(
      `select key, statement from public.opportunity_requirements
        where workspace_id = $1 and opportunity_id = $2`,
      [workspaceId, opportunityId],
    );
    return result.rows;
  }
  async addDeliverable(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly name: string;
    readonly description?: string;
  }) {
    await this.db.query(
      `insert into public.opportunity_deliverables
        (id, workspace_id, opportunity_id, name, description)
       select $1,$2,$3,$4,$5
       where not exists (
         select 1 from public.opportunity_deliverables
          where workspace_id = $2 and opportunity_id = $3 and name = $4
       )`,
      [
        input.id,
        input.workspaceId,
        input.opportunityId,
        input.name,
        input.description ?? null,
      ],
    );
  }
  async listDeliverables(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<{
      id: string;
      name: string;
      description: string | null;
    }>(
      `select id::text as id, name, description from public.opportunity_deliverables
        where workspace_id = $1 and opportunity_id = $2`,
      [workspaceId, opportunityId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      ...(row.description ? { description: row.description } : {}),
    }));
  }
  async upsertBudgetConstraint(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly currency: string;
    readonly minMinor?: string;
    readonly maxMinor?: string;
  }) {
    await this.db.query(
      `insert into public.opportunity_budget_constraints
        (id, workspace_id, opportunity_id, min_minor, max_minor, currency)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (opportunity_id)
       do update set min_minor = excluded.min_minor, max_minor = excluded.max_minor, currency = excluded.currency`,
      [
        input.id,
        input.workspaceId,
        input.opportunityId,
        input.minMinor ?? null,
        input.maxMinor ?? null,
        input.currency,
      ],
    );
  }
  async getBudgetConstraint(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<{
      currency: string;
      min_minor: string | null;
      max_minor: string | null;
    }>(
      `select currency, min_minor::text as min_minor, max_minor::text as max_minor
         from public.opportunity_budget_constraints
        where workspace_id = $1 and opportunity_id = $2`,
      [workspaceId, opportunityId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      currency: row.currency,
      ...(row.min_minor ? { minMinor: row.min_minor } : {}),
      ...(row.max_minor ? { maxMinor: row.max_minor } : {}),
    };
  }
  async upsertTimelineConstraint(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly notes?: string;
  }) {
    await this.db.query(
      `insert into public.opportunity_timeline_constraints
        (id, workspace_id, opportunity_id, notes)
       values ($1,$2,$3,$4)
       on conflict (opportunity_id)
       do update set notes = excluded.notes`,
      [input.id, input.workspaceId, input.opportunityId, input.notes ?? null],
    );
  }
  async getTimelineConstraint(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<{ notes: string | null }>(
      `select notes from public.opportunity_timeline_constraints
        where workspace_id = $1 and opportunity_id = $2`,
      [workspaceId, opportunityId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return row.notes ? { notes: row.notes } : {};
  }
  async addRisk(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly statement: string;
    readonly blocking: boolean;
    readonly handled: boolean;
  }) {
    await this.db.query(
      `insert into public.opportunity_risks
        (id, workspace_id, opportunity_id, statement, blocking, handled)
       select $1,$2,$3,$4,$5,$6
       where not exists (
         select 1 from public.opportunity_risks
          where workspace_id = $2 and opportunity_id = $3 and statement = $4
       )`,
      [
        input.id,
        input.workspaceId,
        input.opportunityId,
        input.statement,
        input.blocking,
        input.handled,
      ],
    );
  }
  async listRisks(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<{
      id: string;
      opportunity_id: string;
      statement: string;
      blocking: boolean;
      handled: boolean;
    }>(
      `select id::text as id, opportunity_id::text as opportunity_id, statement, blocking, handled
         from public.opportunity_risks
        where workspace_id = $1 and opportunity_id = $2`,
      [workspaceId, opportunityId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      opportunityId: row.opportunity_id,
      statement: row.statement,
      blocking: row.blocking,
      handled: row.handled,
    }));
  }
  async handleRisk(workspaceId: string, riskId: string) {
    const result = await this.db.query<{
      id: string;
      opportunity_id: string;
      statement: string;
      blocking: boolean;
      handled: boolean;
    }>(
      `update public.opportunity_risks
          set handled = true
        where id = $1 and workspace_id = $2
        returning id::text as id, opportunity_id::text as opportunity_id, statement, blocking, handled`,
      [riskId, workspaceId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Risk not found.");
    return {
      id: row.id,
      opportunityId: row.opportunity_id,
      statement: row.statement,
      blocking: row.blocking,
      handled: row.handled,
    };
  }
  async updateDeliverable(input: {
    readonly workspaceId: string;
    readonly deliverableId: string;
    readonly name: string;
    readonly description?: string;
  }) {
    await this.db.query(
      `update public.opportunity_deliverables
          set name = $3, description = $4
        where id = $1 and workspace_id = $2`,
      [
        input.deliverableId,
        input.workspaceId,
        input.name,
        input.description ?? null,
      ],
    );
  }
  async updateService(
    workspaceId: string,
    serviceId: string,
    patch: Partial<
      Pick<
        CatalogServiceRecord,
        "name" | "description" | "pricingModel" | "status"
      >
    >,
  ) {
    const current = await this.getService(workspaceId, serviceId);
    if (!current) throw new Error("Service not found.");
    const next = {
      ...current,
      ...patch,
      revision: current.revision + 1,
    };
    await this.db.query(
      `update public.catalog_services
          set name = $3, description = $4, pricing_model = $5, status = $6, revision = $7
        where id = $1 and workspace_id = $2`,
      [
        serviceId,
        workspaceId,
        next.name,
        next.description ?? null,
        next.pricingModel,
        next.status,
        next.revision,
      ],
    );
    return next;
  }
  async replaceCostComponents(
    workspaceId: string,
    serviceId: string,
    components: readonly CostComponentRecord[],
  ) {
    await this.db.query(
      `delete from public.catalog_service_cost_components
        where workspace_id = $1 and service_id = $2`,
      [workspaceId, serviceId],
    );
    for (const component of components) {
      await this.addCostComponent(component);
    }
    return components;
  }
  async updateDraftQuestionnaire(
    workspaceId: string,
    versionId: string,
    patch: Pick<
      QuestionnaireVersionRecord,
      "jsonSchema" | "uiSchema" | "questionMeta"
    >,
  ) {
    const existing = await this.db.query<Record<string, unknown>>(
      `select * from public.catalog_questionnaire_versions
        where id = $1 and workspace_id = $2`,
      [versionId, workspaceId],
    );
    const row = existing.rows[0];
    if (!row) throw new Error("Questionnaire not found.");
    if (String(row.status) !== "draft") {
      throw new Error("Published questionnaires cannot be changed.");
    }
    await this.db.query(
      `update public.catalog_questionnaire_versions
          set json_schema = $3::jsonb, ui_schema = $4::jsonb, question_meta = $5::jsonb
        where id = $1 and workspace_id = $2 and status = 'draft'`,
      [
        versionId,
        workspaceId,
        JSON.stringify(patch.jsonSchema),
        JSON.stringify(patch.uiSchema),
        JSON.stringify(patch.questionMeta),
      ],
    );
    return {
      id: versionId,
      workspaceId,
      serviceId: String(row.service_id),
      versionNumber: Number(row.version_number),
      status: "draft" as const,
      jsonSchema: patch.jsonSchema,
      uiSchema: patch.uiSchema,
      questionMeta: patch.questionMeta,
    };
  }
  async addEvidence(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly opportunityId: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly sourceId?: string;
    readonly factId?: string;
    readonly claimClassification: string;
    readonly excerpt?: string;
  }) {
    await this.db.query(
      `insert into public.evidence_references
        (id, workspace_id, opportunity_id, target_type, target_id, source_id, fact_id, claim_classification, excerpt)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        input.id,
        input.workspaceId,
        input.opportunityId,
        input.targetType,
        input.targetId,
        input.sourceId ?? null,
        input.factId ?? null,
        input.claimClassification,
        input.excerpt ?? null,
      ],
    );
  }
  async countEvidence(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<{ count: string }>(
      `select count(*)::text as count from public.evidence_references
        where workspace_id = $1 and opportunity_id = $2`,
      [workspaceId, opportunityId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }
  async createBriefVersion(record: BriefVersionRecord) {
    await this.db.query(
      `insert into public.briefs (id, workspace_id, opportunity_id)
       values ($1,$2,$3)
       on conflict (opportunity_id) do nothing`,
      [record.briefId, record.workspaceId, record.opportunityId],
    );
    await this.db.query(
      `insert into public.brief_versions
        (id, workspace_id, brief_id, version_number, status, calculation)
       values ($1,$2,$3,$4,$5,$6::jsonb)`,
      [
        record.id,
        record.workspaceId,
        record.briefId,
        record.versionNumber,
        record.status,
        record.calculation ? JSON.stringify(record.calculation) : null,
      ],
    );
    for (const section of record.sections) {
      await this.db.query(
        `insert into public.brief_sections (workspace_id, brief_version_id, key, title, body)
         values ($1,$2,$3,$4,$5)`,
        [
          record.workspaceId,
          record.id,
          section.key,
          section.title,
          section.body,
        ],
      );
    }
    return record;
  }
  async listBriefVersions(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select v.*, b.opportunity_id
         from public.brief_versions v
         join public.briefs b on b.id = v.brief_id
        where v.workspace_id = $1 and b.opportunity_id = $2
        order by v.version_number`,
      [workspaceId, opportunityId],
    );
    const versions: BriefVersionRecord[] = [];
    for (const row of result.rows) {
      const loaded = await this.getBriefVersion(workspaceId, String(row.id));
      if (loaded) versions.push(loaded);
    }
    return versions;
  }
  async getBriefVersion(workspaceId: string, versionId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select v.*, b.opportunity_id
         from public.brief_versions v
         join public.briefs b on b.id = v.brief_id
        where v.id = $1 and v.workspace_id = $2`,
      [versionId, workspaceId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    const sections = await this.db.query<Record<string, unknown>>(
      `select key, title, body from public.brief_sections where brief_version_id = $1`,
      [versionId],
    );
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      briefId: String(row.brief_id),
      opportunityId: String(row.opportunity_id),
      versionNumber: Number(row.version_number),
      status: row.status as BriefVersionStatus,
      ...(row.calculation
        ? { calculation: row.calculation as ScopeCalculation }
        : {}),
      sections: sections.rows.map((section) => ({
        key: String(section.key),
        title: String(section.title),
        body: String(section.body),
      })),
    };
  }
  async updateBriefVersionStatus(
    workspaceId: string,
    versionId: string,
    status: BriefVersionStatus,
    actorId?: string,
  ) {
    const result = await this.db.query<Record<string, unknown>>(
      `update public.brief_versions
          set status = $3,
              approved_by = case when $3 = 'approved' then $4 else approved_by end,
              approved_at = case when $3 = 'approved' then now() else approved_at end
        where id = $1 and workspace_id = $2 and status <> 'approved'
        returning id`,
      [versionId, workspaceId, status, actorId ?? null],
    );
    if (!result.rows[0]) {
      throw new Error("approved brief versions are immutable");
    }
    const loaded = await this.getBriefVersion(workspaceId, versionId);
    if (!loaded) throw new Error("Brief version not found.");
    return loaded;
  }
  async recordGuard(record: GuardDecisionRecord) {
    await this.db.query(
      `insert into public.commercial_guard_decisions
        (id, workspace_id, opportunity_id, action, outcome, reason, before_state, after_state)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,
      [
        record.id,
        record.workspaceId,
        record.opportunityId,
        record.action,
        record.outcome,
        record.reason,
        record.beforeState ? JSON.stringify(record.beforeState) : null,
        record.afterState ? JSON.stringify(record.afterState) : null,
      ],
    );
  }
  async listGuard(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.commercial_guard_decisions
        where workspace_id = $1 and opportunity_id = $2
        order by created_at`,
      [workspaceId, opportunityId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      opportunityId: String(row.opportunity_id),
      action: String(row.action),
      outcome: row.outcome as GuardDecisionRecord["outcome"],
      reason: String(row.reason),
      createdAt: postgresTimestamp(row.created_at),
    }));
  }
  async recordAudit(record: CommercialAuditRecord) {
    await this.db.query(
      `insert into flow_internal.business_audit_events
        (event_id, workspace_id, actor_id, event_type, target_type, target_id, metadata)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        record.eventId,
        record.workspaceId,
        record.actorId,
        record.eventType,
        record.targetType,
        record.targetId,
        JSON.stringify(record.metadata),
      ],
    );
  }
  async listAudit(workspaceId: string, targetId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from flow_internal.business_audit_events
        where workspace_id = $1 and target_id = $2
        order by occurred_at`,
      [workspaceId, targetId],
    );
    return result.rows.map((row) => ({
      eventId: String(row.event_id),
      workspaceId: String(row.workspace_id),
      actorId: pgCellString(row.actor_id ?? ""),
      eventType: String(row.event_type),
      targetType: String(row.target_type),
      targetId: String(row.target_id),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  }
  async consumeIdempotency(input: {
    readonly workspaceId: string;
    readonly key: string;
    readonly requestClass: string;
    readonly fingerprint: string;
  }) {
    const inserted = await this.db.query<{ idempotency_key: string }>(
      `insert into flow_internal.request_idempotency_records
        (workspace_id, idempotency_key, request_class, request_fingerprint, status, expires_at)
       values ($1,$2,$3,$4,'COMPLETED', now() + interval '24 hours')
       on conflict (workspace_id, idempotency_key) do nothing
       returning idempotency_key`,
      [input.workspaceId, input.key, input.requestClass, input.fingerprint],
    );
    if (inserted.rows[0]) return "new";
    const existing = await this.db.query<{
      request_class: string;
      request_fingerprint: string;
    }>(
      `select request_class, request_fingerprint
         from flow_internal.request_idempotency_records
        where workspace_id = $1 and idempotency_key = $2`,
      [input.workspaceId, input.key],
    );
    if (
      existing.rows[0]?.request_class !== input.requestClass ||
      existing.rows[0]?.request_fingerprint !== input.fingerprint
    ) {
      throw new Error("Idempotency key conflicts with a different request.");
    }
    return "replay";
  }
  async createExtractionRun(record: DiscoveryExtractionRunRecord) {
    await this.db.query(
      `insert into public.discovery_extraction_runs
        (id, workspace_id, opportunity_id, source_id, source_fingerprint, prompt_version,
         schema_version, provider, model, status, attempt_count, idempotency_key,
         started_at, completed_at, error_code, usage_metadata, latency_ms, created_by,
         created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        record.id,
        record.workspaceId,
        record.opportunityId,
        record.sourceId,
        record.sourceFingerprint,
        record.promptVersion,
        record.schemaVersion,
        record.provider,
        record.model,
        record.status,
        record.attemptCount,
        record.idempotencyKey,
        record.startedAt ?? null,
        record.completedAt ?? null,
        record.errorCode ?? null,
        JSON.stringify(record.usageMetadata),
        record.latencyMs ?? null,
        record.createdBy ?? null,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }
  async updateExtractionRun(input: {
    readonly workspaceId: string;
    readonly runId: string;
    readonly patch: Partial<
      Pick<
        DiscoveryExtractionRunRecord,
        | "status"
        | "attemptCount"
        | "startedAt"
        | "completedAt"
        | "errorCode"
        | "usageMetadata"
        | "latencyMs"
        | "provider"
        | "model"
      >
    >;
  }) {
    const current = await this.db.query<Record<string, unknown>>(
      `select * from public.discovery_extraction_runs where id = $1 and workspace_id = $2`,
      [input.runId, input.workspaceId],
    );
    const row = current.rows[0];
    if (!row) throw new Error("Extraction run not found.");
    const next = {
      status: (input.patch.status ?? row.status) as ExtractionRunStatus,
      attemptCount: input.patch.attemptCount ?? Number(row.attempt_count),
      startedAt:
        input.patch.startedAt ??
        (row.started_at ? postgresTimestamp(row.started_at) : undefined),
      completedAt:
        input.patch.completedAt ??
        (row.completed_at ? postgresTimestamp(row.completed_at) : undefined),
      errorCode:
        input.patch.errorCode ??
        (row.error_code ? pgCellString(row.error_code) : undefined),
      usageMetadata:
        input.patch.usageMetadata ??
        ((row.usage_metadata as Record<string, unknown>) ?? {}),
      latencyMs:
        input.patch.latencyMs ??
        (row.latency_ms != null ? Number(row.latency_ms) : undefined),
      provider: input.patch.provider ?? String(row.provider),
      model: input.patch.model ?? String(row.model),
    };
    await this.db.query(
      `update public.discovery_extraction_runs
          set status = $3, attempt_count = $4, started_at = $5, completed_at = $6,
              error_code = $7, usage_metadata = $8, latency_ms = $9, provider = $10,
              model = $11, updated_at = now()
        where id = $1 and workspace_id = $2`,
      [
        input.runId,
        input.workspaceId,
        next.status,
        next.attemptCount,
        next.startedAt ?? null,
        next.completedAt ?? null,
        next.errorCode ?? null,
        JSON.stringify(next.usageMetadata),
        next.latencyMs ?? null,
        next.provider,
        next.model,
      ],
    );
    return (await this.listExtractionRuns(
      input.workspaceId,
      String(row.opportunity_id),
    )).find((run) => run.id === input.runId)!;
  }
  async getExtractionRunByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.discovery_extraction_runs
        where workspace_id = $1 and idempotency_key = $2`,
      [workspaceId, idempotencyKey],
    );
    const row = result.rows[0];
    return row ? mapExtractionRun(row) : undefined;
  }
  async listExtractionRuns(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.discovery_extraction_runs
        where workspace_id = $1 and opportunity_id = $2
        order by created_at desc`,
      [workspaceId, opportunityId],
    );
    return result.rows.map(mapExtractionRun);
  }
}
