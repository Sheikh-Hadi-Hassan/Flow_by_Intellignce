import { Inject, Injectable } from "@nestjs/common";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  brandStrategyQuestionnaireV1,
  calculateScope,
  discoveryCompleteness,
  FixtureDiscoveryExtractor,
  nextJourneyStatus,
  requiredQuestionKeys,
  scopeWritesFromVerifiedFact,
  timelineDaysFromText,
  validateQuestionnaireResponse,
  type JourneyGuardInput,
  type JourneyStatus,
} from "@flow/commercial";
import type { CommercialRepository } from "@flow/database";
import { COMMERCIAL_REPOSITORY } from "../database/persistence.providers.js";
import type { TrustedExecutionContext } from "../security/flow-auth-context.js";

const extractor = new FixtureDiscoveryExtractor();

@Injectable()
export class CommercialService {
  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly repo: CommercialRepository,
  ) {}

  private assert(identity: TrustedExecutionContext, permission: string) {
    if (!identity.permissionIds.includes(permission)) {
      throw new ForbiddenException("Missing required permission.");
    }
  }

  private slugify(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "service"
    );
  }

  private async audit(
    identity: TrustedExecutionContext,
    eventType: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.repo.recordAudit({
      eventId: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      actorId: identity.userId,
      eventType,
      targetType,
      targetId,
      metadata,
    });
  }

  async createService(
    identity: TrustedExecutionContext,
    input: {
      readonly name: string;
      readonly description?: string;
      readonly pricingModel: "retainer" | "project" | "hourly" | "hybrid";
      readonly currency: string;
    },
  ) {
    this.assert(identity, "catalog.manage");
    const service = await this.repo.createService({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      name: input.name,
      slug: this.slugify(input.name),
      ...(input.description ? { description: input.description } : {}),
      pricingModel: input.pricingModel,
      currency: input.currency,
      defaultTargetMarginBps: 4000,
      defaultContingencyBps: 1000,
      status: "draft",
      revision: 1,
    });
    await this.repo.addCostComponent({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      serviceId: service.id,
      roleKey: "strategist",
      estimatedMinutes: 2400,
      internalRatePerHourMinor: "15000",
      vendorCostMinor: "0",
    });
    const questionnaire = await this.repo.createQuestionnaire({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      serviceId: service.id,
      versionNumber: 1,
      status: "draft",
      jsonSchema: brandStrategyQuestionnaireV1.jsonSchema,
      uiSchema: { ...brandStrategyQuestionnaireV1.uiSchema },
      questionMeta: { ...brandStrategyQuestionnaireV1.questionMeta },
    });
    await this.audit(
      identity,
      "catalog.service.create",
      "service",
      service.id,
      {
        name: service.name,
      },
    );
    return { service, questionnaire };
  }

  async listServices(identity: TrustedExecutionContext) {
    this.assert(identity, "catalog.read");
    return this.repo.listServices(identity.workspaceId);
  }

  async getService(identity: TrustedExecutionContext, serviceId: string) {
    this.assert(identity, "catalog.read");
    const service = await this.repo.getService(identity.workspaceId, serviceId);
    if (!service) throw new NotFoundException("Service not found.");
    const costs = await this.repo.listCostComponents(
      identity.workspaceId,
      serviceId,
    );
    const questionnaire = await this.repo.getPublishedQuestionnaire(
      identity.workspaceId,
      serviceId,
    );
    const questionnaires = await this.repo.listQuestionnaires(
      identity.workspaceId,
      serviceId,
    );
    return { service, costs, questionnaire, questionnaires };
  }

  async updateService(
    identity: TrustedExecutionContext,
    serviceId: string,
    input: {
      readonly name?: string;
      readonly description?: string;
      readonly pricingModel?: "retainer" | "project" | "hourly" | "hybrid";
      readonly status?: "draft" | "active" | "archived";
      readonly costs?: readonly {
        readonly roleKey: string;
        readonly estimatedMinutes: number;
        readonly internalRatePerHourMinor: string;
        readonly vendorCostMinor: string;
      }[];
    },
  ) {
    this.assert(identity, "catalog.manage");
    const current = await this.repo.getService(identity.workspaceId, serviceId);
    if (!current) throw new NotFoundException("Service not found.");
    const service = await this.repo.updateService(
      identity.workspaceId,
      serviceId,
      {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.pricingModel !== undefined
          ? { pricingModel: input.pricingModel }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    );
    const costs =
      input.costs !== undefined
        ? await this.repo.replaceCostComponents(
            identity.workspaceId,
            serviceId,
            input.costs.map((row) => ({
              id: crypto.randomUUID(),
              workspaceId: identity.workspaceId,
              serviceId,
              roleKey: row.roleKey,
              estimatedMinutes: row.estimatedMinutes,
              internalRatePerHourMinor: row.internalRatePerHourMinor,
              vendorCostMinor: row.vendorCostMinor,
            })),
          )
        : await this.repo.listCostComponents(identity.workspaceId, serviceId);
    await this.audit(identity, "catalog.service.update", "service", serviceId, {
      name: service.name,
    });
    return { service, costs };
  }

  async updateDraftQuestionnaire(
    identity: TrustedExecutionContext,
    versionId: string,
    patch: {
      readonly jsonSchema: Record<string, unknown>;
      readonly uiSchema: Record<string, unknown>;
      readonly questionMeta: Record<string, unknown>;
    },
  ) {
    this.assert(identity, "catalog.manage");
    const updated = await this.repo.updateDraftQuestionnaire(
      identity.workspaceId,
      versionId,
      patch,
    );
    await this.audit(
      identity,
      "catalog.questionnaire.update",
      "questionnaire",
      versionId,
      { versionNumber: updated.versionNumber },
    );
    return updated;
  }

  async publishQuestionnaire(
    identity: TrustedExecutionContext,
    versionId: string,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "questionnaire.publish");
    if (idempotencyKey) {
      const replay = await this.repo.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "questionnaire.publish",
        fingerprint: versionId,
      });
      if (replay === "replay") {
        return { replayed: true };
      }
    }
    const published = await this.repo.publishQuestionnaire(
      identity.workspaceId,
      versionId,
    );
    await this.audit(
      identity,
      "catalog.questionnaire.publish",
      "questionnaire",
      published.id,
      { versionNumber: published.versionNumber },
    );
    return published;
  }

  async createClient(
    identity: TrustedExecutionContext,
    input: {
      readonly name: string;
      readonly industry?: string;
      readonly website?: string;
      readonly contact: {
        readonly firstName: string;
        readonly lastName: string;
        readonly title?: string;
        readonly email?: string;
      };
    },
  ) {
    this.assert(identity, "client.manage");
    const client = await this.repo.createClient({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      name: input.name,
      ...(input.industry ? { industry: input.industry } : {}),
      ...(input.website ? { website: input.website } : {}),
      status: "prospect",
      revision: 1,
    });
    const contact = await this.repo.createContact({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      clientId: client.id,
      firstName: input.contact.firstName,
      lastName: input.contact.lastName,
      ...(input.contact.title ? { title: input.contact.title } : {}),
      ...(input.contact.email ? { email: input.contact.email } : {}),
      isPrimary: true,
    });
    await this.audit(identity, "crm.client.create", "client", client.id, {
      name: client.name,
    });
    return { client, contact };
  }

  async listClients(identity: TrustedExecutionContext) {
    this.assert(identity, "client.read");
    return this.repo.listClients(identity.workspaceId);
  }

  async getClient(identity: TrustedExecutionContext, clientId: string) {
    this.assert(identity, "client.read");
    const client = await this.repo.getClient(identity.workspaceId, clientId);
    if (!client) throw new NotFoundException("Client not found.");
    const contacts = await this.repo.listContacts(
      identity.workspaceId,
      clientId,
    );
    return { client, contacts };
  }

  async createOpportunity(
    identity: TrustedExecutionContext,
    input: {
      readonly clientId: string;
      readonly contactId?: string;
      readonly serviceId: string;
      readonly name: string;
      readonly budgetMinMinor?: string;
      readonly budgetMaxMinor?: string;
    },
  ) {
    this.assert(identity, "opportunity.manage");
    const service = await this.repo.getService(
      identity.workspaceId,
      input.serviceId,
    );
    if (!service) throw new NotFoundException("Service not found.");
    const opportunity = await this.repo.createOpportunity({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      clientId: input.clientId,
      ...(input.contactId ? { primaryContactId: input.contactId } : {}),
      serviceId: input.serviceId,
      name: input.name,
      journeyStatus: "collecting_information",
      currency: service.currency,
      ...(input.budgetMinMinor ? { budgetMinMinor: input.budgetMinMinor } : {}),
      ...(input.budgetMaxMinor ? { budgetMaxMinor: input.budgetMaxMinor } : {}),
      completeness: 0,
      revision: 1,
    });
    await this.repo.upsertFollowUp({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      opportunityId: opportunity.id,
      questionKey: "approval_stakeholder",
      prompt: "Who internally approves the brief?",
      required: true,
    });
    await this.repo.addDeliverable({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      opportunityId: opportunity.id,
      name: "Brand strategy and identity system",
      description: "Positioning, identity, and launch narrative.",
    });
    if (input.budgetMinMinor || input.budgetMaxMinor) {
      await this.repo.upsertBudgetConstraint({
        id: crypto.randomUUID(),
        workspaceId: identity.workspaceId,
        opportunityId: opportunity.id,
        currency: service.currency,
        ...(input.budgetMinMinor ? { minMinor: input.budgetMinMinor } : {}),
        ...(input.budgetMaxMinor ? { maxMinor: input.budgetMaxMinor } : {}),
      });
    }
    await this.repo.upsertTimelineConstraint({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      opportunityId: opportunity.id,
      notes: "Confirm delivery window during discovery.",
    });
    await this.repo.addRisk({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      opportunityId: opportunity.id,
      statement:
        "Blocking: confirm procurement approval path before final brief approval.",
      blocking: true,
      handled: false,
    });
    await this.audit(
      identity,
      "crm.opportunity.create",
      "opportunity",
      opportunity.id,
      { name: opportunity.name },
    );
    return opportunity;
  }

  async listOpportunities(identity: TrustedExecutionContext) {
    this.assert(identity, "opportunity.read");
    return this.repo.listOpportunities(identity.workspaceId);
  }

  async getOpportunityBundle(
    identity: TrustedExecutionContext,
    opportunityId: string,
  ) {
    this.assert(identity, "opportunity.read");
    const opportunity = await this.repo.getOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (!opportunity) throw new NotFoundException("Opportunity not found.");
    const [
      facts,
      followUps,
      briefs,
      guards,
      costs,
      questionnaire,
      answers,
      sources,
      audits,
      requirements,
      deliverables,
      risks,
      budget,
      timeline,
    ] = await Promise.all([
      this.repo.listFacts(identity.workspaceId, opportunityId),
      this.repo.listFollowUps(identity.workspaceId, opportunityId),
      this.repo.listBriefVersions(identity.workspaceId, opportunityId),
      this.repo.listGuard(identity.workspaceId, opportunityId),
      this.repo.listCostComponents(identity.workspaceId, opportunity.serviceId),
      this.repo.getPublishedQuestionnaire(
        identity.workspaceId,
        opportunity.serviceId,
      ),
      this.repo.getResponse(identity.workspaceId, opportunityId),
      this.repo.listSources(identity.workspaceId, opportunityId),
      this.repo.listAudit(identity.workspaceId, opportunityId),
      this.repo.listRequirements(identity.workspaceId, opportunityId),
      this.repo.listDeliverables(identity.workspaceId, opportunityId),
      this.repo.listRisks(identity.workspaceId, opportunityId),
      this.repo.getBudgetConstraint(identity.workspaceId, opportunityId),
      this.repo.getTimelineConstraint(identity.workspaceId, opportunityId),
    ]);
    return {
      opportunity,
      facts,
      followUps,
      briefs,
      guards,
      costs,
      questionnaire,
      answers,
      sources,
      audits,
      requirements,
      deliverables,
      risks,
      budget,
      timeline,
    };
  }

  async saveAnswers(
    identity: TrustedExecutionContext,
    opportunityId: string,
    answers: Record<string, unknown>,
  ) {
    this.assert(identity, "opportunity.manage");
    const opportunity = await this.requireOpportunity(identity, opportunityId);
    const published = await this.repo.getPublishedQuestionnaire(
      identity.workspaceId,
      opportunity.serviceId,
    );
    if (!published) {
      throw new BadRequestException(
        "No published questionnaire for this service.",
      );
    }
    const document = {
      version: published.versionNumber,
      jsonSchema: published.jsonSchema,
      uiSchema: published.uiSchema,
      questionMeta:
        published.questionMeta as typeof brandStrategyQuestionnaireV1.questionMeta,
    };
    const validated = validateQuestionnaireResponse(document, answers, {
      enforceRequired: false,
    });
    if (!validated.valid) {
      throw new BadRequestException(validated.errors.join(" "));
    }
    await this.repo.saveResponse({
      workspaceId: identity.workspaceId,
      opportunityId,
      questionnaireVersionId: published.id,
      answers,
    });
    return this.refreshJourney(identity, opportunityId);
  }

  async addDiscoveryNotes(
    identity: TrustedExecutionContext,
    opportunityId: string,
    notes: string,
  ) {
    this.assert(identity, "discovery.manage");
    if (!notes.trim()) {
      throw new BadRequestException("Meeting notes are required.");
    }
    if (notes.length > 200_000) {
      throw new BadRequestException("Source exceeds size limit.");
    }
    const sessionId = crypto.randomUUID();
    await this.repo.createSession({
      id: sessionId,
      workspaceId: identity.workspaceId,
      opportunityId,
      title: "Discovery meeting",
    });
    const source = await this.repo.addSource({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      sessionId,
      sourceKind: "meeting_notes",
      originalText: notes,
      contentType: "text/plain",
    });
    const runId = crypto.randomUUID();
    const drafts = await extractor.extract({
      sourceId: source.id,
      sourceText: notes,
      extractionRunId: runId,
    });
    for (const draft of drafts) {
      const fact = await this.repo.saveFact({
        id: crypto.randomUUID(),
        workspaceId: identity.workspaceId,
        opportunityId,
        sourceId: source.id,
        extractionRunId: draft.extractionRunId,
        candidateFact: draft.candidateFact,
        category: draft.category,
        confidenceBps: draft.confidenceBps,
        status: "draft",
        ...(draft.characterStart !== undefined
          ? { characterStart: draft.characterStart }
          : {}),
        ...(draft.characterEnd !== undefined
          ? { characterEnd: draft.characterEnd }
          : {}),
      });
      await this.repo.addEvidence({
        id: crypto.randomUUID(),
        workspaceId: identity.workspaceId,
        opportunityId,
        targetType: "extracted_fact",
        targetId: fact.id,
        sourceId: source.id,
        factId: fact.id,
        claimClassification: "INFERENCE",
        excerpt: draft.candidateFact.slice(0, 280),
      });
    }
    await this.audit(
      identity,
      "discovery.notes.save",
      "opportunity",
      opportunityId,
      {
        sourceId: source.id,
      },
    );
    return this.getOpportunityBundle(identity, opportunityId);
  }

  async verifyFact(
    identity: TrustedExecutionContext,
    factId: string,
    status: "verified" | "rejected",
  ) {
    this.assert(identity, "fact.verify");
    const fact = await this.repo.verifyFact({
      workspaceId: identity.workspaceId,
      factId,
      status,
      actorId: identity.userId,
    });
    if (status === "verified") {
      await this.applyVerifiedFact(identity, fact);
    }
    await this.audit(identity, "discovery.fact.verify", "fact", factId, {
      status,
    });
    return fact;
  }

  async answerFollowUp(
    identity: TrustedExecutionContext,
    questionId: string,
    answer: string,
  ) {
    this.assert(identity, "opportunity.manage");
    const updated = await this.repo.answerFollowUp(
      identity.workspaceId,
      questionId,
      answer,
    );
    await this.refreshJourney(identity, updated.opportunityId);
    return updated;
  }

  async handleRisk(identity: TrustedExecutionContext, riskId: string) {
    this.assert(identity, "opportunity.manage");
    const risk = await this.repo.handleRisk(identity.workspaceId, riskId);
    const opportunity = await this.requireOpportunity(
      identity,
      risk.opportunityId,
    );
    await this.audit(identity, "opportunity.risk.handle", "risk", riskId, {
      statement: risk.statement,
    });
    await this.refreshJourney(identity, opportunity.id);
    return risk;
  }

  async updateDeliverable(
    identity: TrustedExecutionContext,
    deliverableId: string,
    input: { readonly name: string; readonly description?: string },
  ) {
    this.assert(identity, "opportunity.manage");
    await this.repo.updateDeliverable({
      workspaceId: identity.workspaceId,
      deliverableId,
      name: input.name,
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    });
    await this.audit(
      identity,
      "opportunity.deliverable.update",
      "deliverable",
      deliverableId,
      {
        name: input.name,
      },
    );
  }

  async calculate(identity: TrustedExecutionContext, opportunityId: string) {
    this.assert(identity, "opportunity.manage");
    const opportunity = await this.requireOpportunity(identity, opportunityId);
    const costs = await this.repo.listCostComponents(
      identity.workspaceId,
      opportunity.serviceId,
    );
    const service = await this.repo.getService(
      identity.workspaceId,
      opportunity.serviceId,
    );
    if (!service) throw new NotFoundException("Service not found.");
    const timeline = await this.repo.getTimelineConstraint(
      identity.workspaceId,
      opportunityId,
    );
    const timelineDays = timelineDaysFromText(timeline?.notes ?? "") ?? 90;
    const calculation = calculateScope({
      currency: opportunity.currency,
      components: costs,
      contingencyBps: service.defaultContingencyBps,
      targetMarginBps: service.defaultTargetMarginBps,
      ...(opportunity.budgetMinMinor
        ? { budgetMinMinor: BigInt(opportunity.budgetMinMinor) }
        : {}),
      ...(opportunity.budgetMaxMinor
        ? { budgetMaxMinor: BigInt(opportunity.budgetMaxMinor) }
        : {}),
      estimatedDeliveryDays: 70,
      timelineDays,
    });
    await this.repo.updateOpportunity(
      identity.workspaceId,
      opportunityId,
      opportunity.revision,
      { latestCalculation: calculation },
    );
    await this.audit(
      identity,
      "logic.calculate",
      "opportunity",
      opportunityId,
      {
        recommendedPriceMinor: calculation.recommendedPriceMinor,
      },
    );
    return this.refreshJourney(identity, opportunityId);
  }

  async generateBrief(
    identity: TrustedExecutionContext,
    opportunityId: string,
  ) {
    this.assert(identity, "brief.manage");
    const bundle = await this.getOpportunityBundle(identity, opportunityId);
    const guards = await this.guardInput(identity, bundle.opportunity, true);
    const next = nextJourneyStatus(
      bundle.opportunity.journeyStatus,
      "GENERATE_BRIEF",
      { ...guards, briefExists: false },
    );
    if (next !== "brief_draft") {
      throw new ForbiddenException("Brief cannot be generated yet.");
    }
    const existing = bundle.briefs;
    if (existing.some((row) => row.status === "approved")) {
      throw new ConflictException("Approved brief already exists.");
    }
    for (const row of existing) {
      if (row.status === "draft" || row.status === "in_review") {
        await this.repo.updateBriefVersionStatus(
          identity.workspaceId,
          row.id,
          "superseded",
        );
      }
    }
    const versionNumber = existing.length + 1;
    const briefId = existing[0]?.briefId ?? crypto.randomUUID();
    const version = await this.repo.createBriefVersion({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      briefId,
      opportunityId,
      versionNumber,
      status: "draft",
      ...(bundle.opportunity.latestCalculation
        ? { calculation: bundle.opportunity.latestCalculation }
        : {}),
      sections: [
        {
          key: "goals",
          title: "Goals",
          body:
            typeof bundle.answers?.successMetric === "string"
              ? bundle.answers.successMetric
              : "Launch-ready brand identity.",
        },
        {
          key: "audience",
          title: "Audience",
          body:
            typeof bundle.answers?.primaryAudience === "string"
              ? bundle.answers.primaryAudience
              : "To be confirmed.",
        },
        {
          key: "scope",
          title: "Scope",
          body:
            bundle.deliverables.length > 0
              ? bundle.deliverables.map((row) => row.name).join("; ")
              : "Brand strategy and identity system with proof-linked assumptions.",
        },
        {
          key: "requirements",
          title: "Requirements",
          body:
            bundle.requirements.length > 0
              ? bundle.requirements
                  .map((row) => `${row.key}: ${row.statement}`)
                  .join("\n")
              : "No verified requirements yet.",
        },
        {
          key: "risks",
          title: "Risks",
          body:
            bundle.risks.length > 0
              ? bundle.risks
                  .map(
                    (row) =>
                      `${row.statement} (${row.blocking ? "blocking" : "non-blocking"}, ${row.handled ? "handled" : "open"})`,
                  )
                  .join("\n")
              : "No recorded risks.",
        },
      ],
    });
    await this.repo.updateOpportunity(
      identity.workspaceId,
      opportunityId,
      bundle.opportunity.revision,
      { journeyStatus: "brief_draft" },
    );
    await this.audit(identity, "brief.generate", "brief_version", version.id, {
      versionNumber,
    });
    return version;
  }

  async submitReview(
    identity: TrustedExecutionContext,
    versionId: string,
    expectedVersion: number,
  ) {
    this.assert(identity, "brief.manage");
    const version = await this.repo.getBriefVersion(
      identity.workspaceId,
      versionId,
    );
    if (!version) throw new NotFoundException("Brief version not found.");
    if (version.versionNumber !== expectedVersion) {
      throw new ConflictException("Brief version does not match.");
    }
    const opportunity = await this.requireOpportunity(
      identity,
      version.opportunityId,
    );
    const guards = await this.guardInput(identity, opportunity, true);
    const next = nextJourneyStatus(
      opportunity.journeyStatus,
      "SUBMIT_FOR_REVIEW",
      guards,
    );
    if (next !== "founder_review") {
      throw new ForbiddenException("Cannot submit for review.");
    }
    const updated = await this.repo.updateBriefVersionStatus(
      identity.workspaceId,
      versionId,
      "in_review",
    );
    await this.repo.updateOpportunity(
      identity.workspaceId,
      opportunity.id,
      opportunity.revision,
      { journeyStatus: "founder_review" },
    );
    await this.repo.recordGuard({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      opportunityId: opportunity.id,
      action: "brief.submit_review",
      outcome: "ALLOW",
      reason: "Required information, evidence, and calculations present.",
      beforeState: opportunity.journeyStatus,
      afterState: "founder_review",
      createdAt: new Date().toISOString(),
    });
    return updated;
  }

  async requestChanges(identity: TrustedExecutionContext, versionId: string) {
    this.assert(identity, "brief.approve");
    const version = await this.repo.getBriefVersion(
      identity.workspaceId,
      versionId,
    );
    if (!version) throw new NotFoundException("Brief version not found.");
    const opportunity = await this.requireOpportunity(
      identity,
      version.opportunityId,
    );
    const next = nextJourneyStatus(
      opportunity.journeyStatus,
      "REQUEST_CHANGES",
      await this.guardInput(identity, opportunity, true),
    );
    if (next !== "changes_requested") {
      throw new ForbiddenException("Changes cannot be requested.");
    }
    await this.repo.updateOpportunity(
      identity.workspaceId,
      opportunity.id,
      opportunity.revision,
      { journeyStatus: "changes_requested" },
    );
    await this.audit(
      identity,
      "brief.changes_requested",
      "brief_version",
      versionId,
      {},
    );
    if (version.status === "in_review") {
      await this.repo.updateBriefVersionStatus(
        identity.workspaceId,
        versionId,
        "superseded",
      );
    }
    return this.repo.getBriefVersion(identity.workspaceId, versionId);
  }

  async approveBrief(
    identity: TrustedExecutionContext,
    versionId: string,
    expectedVersion: number,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "brief.approve");
    if (idempotencyKey) {
      const replay = await this.repo.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "brief.approve",
        fingerprint: versionId,
      });
      if (replay === "replay") {
        return this.repo.getBriefVersion(identity.workspaceId, versionId);
      }
    }
    const version = await this.repo.getBriefVersion(
      identity.workspaceId,
      versionId,
    );
    if (!version) throw new NotFoundException("Brief version not found.");
    if (version.versionNumber !== expectedVersion) {
      throw new ConflictException("Brief version does not match.");
    }
    const opportunity = await this.requireOpportunity(
      identity,
      version.opportunityId,
    );
    const guards = await this.guardInput(identity, opportunity, true);
    const next = nextJourneyStatus(
      opportunity.journeyStatus,
      "APPROVE",
      guards,
    );
    if (next !== "approved") {
      await this.repo.recordGuard({
        id: crypto.randomUUID(),
        workspaceId: identity.workspaceId,
        opportunityId: opportunity.id,
        action: "brief.approve",
        outcome: "DENY",
        reason: "Approval guards failed.",
        beforeState: opportunity.journeyStatus,
        createdAt: new Date().toISOString(),
      });
      throw new ForbiddenException("Approval guards failed.");
    }
    const approved = await this.repo.updateBriefVersionStatus(
      identity.workspaceId,
      versionId,
      "approved",
      identity.userId,
    );
    await this.repo.updateOpportunity(
      identity.workspaceId,
      opportunity.id,
      opportunity.revision,
      { journeyStatus: "approved" },
    );
    await this.repo.recordGuard({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      opportunityId: opportunity.id,
      action: "brief.approve",
      outcome: "ALLOW",
      reason: "Founder approved immutable brief version.",
      beforeState: opportunity.journeyStatus,
      afterState: "approved",
      createdAt: new Date().toISOString(),
    });
    await this.audit(identity, "brief.approve", "brief_version", versionId, {
      versionNumber: version.versionNumber,
    });
    return approved;
  }

  private async applyVerifiedFact(
    identity: TrustedExecutionContext,
    fact: {
      readonly opportunityId: string;
      readonly id: string;
      readonly category: string;
      readonly candidateFact: string;
    },
  ) {
    for (const write of scopeWritesFromVerifiedFact(fact)) {
      if (write.kind === "requirement") {
        await this.repo.upsertRequirement({
          id: crypto.randomUUID(),
          workspaceId: identity.workspaceId,
          opportunityId: fact.opportunityId,
          key: write.key,
          statement: write.statement,
          factId: fact.id,
        });
      } else if (write.kind === "deliverable") {
        await this.repo.addDeliverable({
          id: crypto.randomUUID(),
          workspaceId: identity.workspaceId,
          opportunityId: fact.opportunityId,
          name: write.name,
          description: write.description,
        });
      } else if (write.kind === "budget") {
        const opportunity = await this.requireOpportunity(
          identity,
          fact.opportunityId,
        );
        await this.repo.upsertBudgetConstraint({
          id: crypto.randomUUID(),
          workspaceId: identity.workspaceId,
          opportunityId: fact.opportunityId,
          currency: opportunity.currency,
          ...(write.minMinor ? { minMinor: write.minMinor } : {}),
          ...(write.maxMinor ? { maxMinor: write.maxMinor } : {}),
        });
      } else if (write.kind === "timeline") {
        await this.repo.upsertTimelineConstraint({
          id: crypto.randomUUID(),
          workspaceId: identity.workspaceId,
          opportunityId: fact.opportunityId,
          notes: write.notes,
        });
      } else {
        await this.repo.addRisk({
          id: crypto.randomUUID(),
          workspaceId: identity.workspaceId,
          opportunityId: fact.opportunityId,
          statement: write.statement,
          blocking: write.blocking,
          handled: write.handled,
        });
      }
    }
  }

  private async requireOpportunity(
    identity: TrustedExecutionContext,
    opportunityId: string,
  ) {
    const opportunity = await this.repo.getOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (!opportunity) throw new NotFoundException("Opportunity not found.");
    return opportunity;
  }

  private async guardInput(
    identity: TrustedExecutionContext,
    opportunity: {
      readonly id: string;
      readonly serviceId: string;
      readonly latestCalculation?: unknown;
    },
    actorCanApprove: boolean,
  ): Promise<JourneyGuardInput> {
    const [followUps, evidenceCount, risks, published, answers] =
      await Promise.all([
        this.repo.listFollowUps(identity.workspaceId, opportunity.id),
        this.repo.countEvidence(identity.workspaceId, opportunity.id),
        this.repo.listRisks(identity.workspaceId, opportunity.id),
        this.repo.getPublishedQuestionnaire(
          identity.workspaceId,
          opportunity.serviceId,
        ),
        this.repo.getResponse(identity.workspaceId, opportunity.id),
      ]);
    const requiredKeys = published
      ? requiredQuestionKeys({
          version: published.versionNumber,
          jsonSchema: published.jsonSchema,
          uiSchema: published.uiSchema,
          questionMeta:
            published.questionMeta as typeof brandStrategyQuestionnaireV1.questionMeta,
        })
      : [];
    const answeredRequired = requiredKeys.filter(
      (key) => answers?.[key] !== undefined && answers[key] !== "",
    ).length;
    const unansweredRequiredQuestions =
      requiredKeys.length -
      answeredRequired +
      followUps.filter((row) => row.required && !row.answer).length;
    const requiredEvidenceAvailable = evidenceCount > 0;
    return {
      requiredInformationComplete: unansweredRequiredQuestions === 0,
      requiredEvidenceAvailable,
      calculationsCompleted: Boolean(opportunity.latestCalculation),
      blockingRisksHandled: risks.every(
        (risk) => !risk.blocking || rowHandled(risk),
      ),
      actorCanApprove,
      versionMatches: true,
      unansweredRequiredQuestions,
      briefExists: true,
    };
  }

  private async refreshJourney(
    identity: TrustedExecutionContext,
    opportunityId: string,
  ) {
    const opportunity = await this.requireOpportunity(identity, opportunityId);
    const published = await this.repo.getPublishedQuestionnaire(
      identity.workspaceId,
      opportunity.serviceId,
    );
    const answers = await this.repo.getResponse(
      identity.workspaceId,
      opportunityId,
    );
    const followUps = await this.repo.listFollowUps(
      identity.workspaceId,
      opportunityId,
    );
    const evidenceCount = await this.repo.countEvidence(
      identity.workspaceId,
      opportunityId,
    );
    const requiredKeys = published
      ? requiredQuestionKeys({
          version: published.versionNumber,
          jsonSchema: published.jsonSchema,
          uiSchema: published.uiSchema,
          questionMeta:
            published.questionMeta as typeof brandStrategyQuestionnaireV1.questionMeta,
        })
      : [];
    const answeredRequired = requiredKeys.filter(
      (key) => answers?.[key] !== undefined && answers[key] !== "",
    ).length;
    const guards = await this.guardInput(identity, opportunity, false);
    const completeness = discoveryCompleteness({
      requiredQuestionCount:
        requiredKeys.length + followUps.filter((row) => row.required).length,
      answeredRequiredCount:
        answeredRequired +
        followUps.filter((row) => row.required && row.answer).length,
      requiredEvidenceCount: 1,
      linkedEvidenceCount: evidenceCount,
      blockingRisks: guards.blockingRisksHandled ? 0 : 1,
    });
    const locked: JourneyStatus[] = [
      "approved",
      "brief_draft",
      "founder_review",
      "changes_requested",
    ];
    let journeyStatus = opportunity.journeyStatus;
    if (!locked.includes(opportunity.journeyStatus)) {
      const event =
        guards.unansweredRequiredQuestions > 0
          ? "INFORMATION_CHANGED"
          : opportunity.journeyStatus === "missing_information"
            ? "INFORMATION_CHANGED"
            : "READY_CHECKED";
      journeyStatus = nextJourneyStatus(opportunity.journeyStatus, event, {
        ...guards,
        briefExists: false,
      });
    }
    await this.repo.updateOpportunity(
      identity.workspaceId,
      opportunityId,
      opportunity.revision,
      { completeness, journeyStatus },
    );
    return this.getOpportunityBundle(identity, opportunityId);
  }
}

function rowHandled(risk: { blocking: boolean; handled: boolean }): boolean {
  return risk.handled;
}
