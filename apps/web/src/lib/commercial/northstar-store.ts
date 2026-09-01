/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-base-to-string -- demo store is synchronous behind async API shape */
import {
  brandStrategyQuestionnaireV1,
  answersToDraftFactStatements,
  calculateScope,
  compileBuilderDocument,
  parseBuilderDocument,
  FixtureDiscoveryExtractor,
  generateProjectPlan,
  nextProjectStatus,
  nextResourcePlanStatus,
  scopeWritesFromVerifiedFact,
  validateQuestionnaireResponse,
} from "@flow/commercial";
import type { QuestionnaireBuilderDocument } from "@flow/commercial";

import {
  NORTHSTAR_ACME_NOTES,
  NORTHSTAR_COMMERCIAL_STORAGE_KEY,
} from "../../content/demo/northstar-commercial";
import type {
  BriefVersionRecord,
  CommercialClientRecord,
  CommercialContactRecord,
  CommercialServiceRecord,
  ContractVersionRecord,
  FactRecord,
  FollowUpRecord,
  OpportunityBundle,
  OpportunityRecord,
  ProjectDetailRecord,
  ProposalVersionRecord,
  QuestionnaireVersion,
  ResourcePlanRecord,
  ResourceProfileRecord,
} from "./api";

const extractor = new FixtureDiscoveryExtractor();

interface DemoState {
  service: CommercialServiceRecord;
  questionnaire: QuestionnaireVersion;
  client: CommercialClientRecord;
  contact: CommercialContactRecord;
  opportunity: OpportunityRecord;
  answers: Record<string, unknown>;
  sources: { originalText: string }[];
  facts: FactRecord[];
  followUps: FollowUpRecord[];
  requirements: OpportunityBundle["requirements"];
  deliverables: OpportunityBundle["deliverables"];
  risks: OpportunityBundle["risks"];
  budget: OpportunityBundle["budget"];
  timeline: OpportunityBundle["timeline"];
  briefs: BriefVersionRecord[];
  proposals: ProposalVersionRecord[];
  contracts: ContractVersionRecord[];
  project: ProjectDetailRecord | null;
  team: ResourceProfileRecord[];
  resourcePlan: ResourcePlanRecord | null;
  guards: OpportunityBundle["guards"][number][];
  extractionRuns: NonNullable<OpportunityBundle["extractionRuns"]>;
  submitted?: boolean;
}

function seed(): DemoState {
  const questionnaire: QuestionnaireVersion = {
    id: "ns-q-1",
    versionNumber: 1,
    status: "published",
    jsonSchema: brandStrategyQuestionnaireV1.jsonSchema,
    uiSchema: { ...brandStrategyQuestionnaireV1.uiSchema },
    questionMeta: { ...brandStrategyQuestionnaireV1.questionMeta },
  };
  const calculation = calculateScope({
    currency: "USD",
    components: [
      {
        roleKey: "strategist",
        estimatedMinutes: 2400,
        internalRatePerHourMinor: "15000",
        vendorCostMinor: "0",
      },
    ],
    contingencyBps: 1000,
    targetMarginBps: 4000,
    budgetMinMinor: 7000000n,
    budgetMaxMinor: 9000000n,
    estimatedDeliveryDays: 70,
    timelineDays: 90,
  });
  const approvedBrief: BriefVersionRecord = {
    id: "ns-brief-1",
    versionNumber: 1,
    status: "approved",
    calculation: { ...calculation },
    sections: [
      {
        key: "goals",
        title: "Goals",
        body: "Launch-ready brand identity for Acme cobot line.",
      },
      {
        key: "audience",
        title: "Audience",
        body: "Plant managers and procurement leaders.",
      },
      {
        key: "scope",
        title: "Scope",
        body: "Brand strategy, identity system, and launch narrative.",
      },
    ],
  };
  const acceptedProposal: ProposalVersionRecord = {
    id: "ns-prop-1",
    versionNumber: 1,
    status: "accepted",
    sections: [
      {
        sectionKey: "scope_deliverables",
        title: "Scope",
        body: approvedBrief.sections.find((row) => row.key === "scope")?.body ?? "",
      },
    ],
    packages: [
      {
        name: "Growth Package",
        totalMinor: calculation.recommendedPriceMinor ?? "8500000",
        isRecommended: true,
      },
    ],
    calculation: { ...calculation },
  };
  const executedContract: ContractVersionRecord = {
    id: "ns-contract-1",
    versionNumber: 1,
    status: "executed",
    clauses: [
      {
        title: "Scope of work",
        body: "90-day brand launch engagement for Acme Robotics.",
      },
    ],
    parties: [
      { partyRole: "provider", legalName: "Northstar Creative" },
      { partyRole: "client", legalName: "Acme Robotics" },
    ],
    paymentSchedule: [
      { label: "Kickoff", amountMinor: "4250000" },
      { label: "Launch", amountMinor: "4250000" },
    ],
    calculation: { ...calculation },
  };
  return {
    service: {
      id: "ns-svc-brand",
      name: "Brand Strategy & Identity",
      slug: "brand-strategy-identity",
      description: "Positioning, identity system, and launch narrative.",
      pricingModel: "project",
      currency: "USD",
      status: "active",
    },
    questionnaire,
    client: {
      id: "ns-client-acme",
      name: "Acme Robotics",
      industry: "industrial robotics",
      website: "https://acme-robotics.demo",
      status: "client",
    },
    contact: {
      id: "ns-contact-priya",
      firstName: "Priya",
      lastName: "Chen",
      title: "Head of Marketing",
      email: "priya@acme-robotics.demo",
    },
    opportunity: {
      id: "ns-opp-acme-brand",
      name: "Acme Q4 Product Launch Campaign",
      clientId: "ns-client-acme",
      serviceId: "ns-svc-brand",
      journeyStatus: "contract_executed",
      currency: "USD",
      completeness: 100,
      revision: 5,
      budgetMinMinor: "7000000",
      budgetMaxMinor: "9000000",
      latestCalculation: { ...calculation },
    },
    answers: {
      brandMaturity: "emerging",
      primaryAudience: "Plant managers and procurement leaders",
      successMetric: "Shortlist conversion for robotics OEMs",
    },
    sources: [{ originalText: NORTHSTAR_ACME_NOTES }],
    facts: [],
    followUps: [
      {
        id: "ns-fu-1",
        prompt: "Who internally approves the brief?",
        required: true,
        answer: "Maya Chen, founder",
      },
    ],
    requirements: [
      {
        key: "legal_review",
        statement: "Legal review of claims required before launch.",
      },
    ],
    deliverables: [
      {
        id: "ns-del-1",
        name: "Creative concept and messaging",
        description: "Positioning, identity, and launch narrative.",
      },
      {
        id: "ns-del-2",
        name: "Channel asset package",
        description: "Six channel deliverables for launch.",
      },
    ],
    risks: [
      {
        id: "ns-risk-1",
        statement: "Legal review of claims must complete before launch.",
        blocking: true,
        handled: true,
      },
    ],
    budget: {
      currency: "USD",
      minMinor: "7000000",
      maxMinor: "9000000",
    },
    timeline: { notes: "90 days to Q4 launch" },
    briefs: [approvedBrief],
    proposals: [acceptedProposal],
    contracts: [executedContract],
    project: null,
    team: northstarTeamSeed(),
    resourcePlan: null,
    guards: [
      {
        id: "ns-guard-contract",
        action: "contract.execute",
        outcome: "ALLOW",
        reason: "Executed contract ready for project creation.",
        createdAt: new Date().toISOString(),
      },
    ],
    extractionRuns: [],
  };
}

function load(): DemoState {
  if (typeof window === "undefined") return seed();
  const raw = window.sessionStorage.getItem(NORTHSTAR_COMMERCIAL_STORAGE_KEY);
  if (!raw) return seed();
  try {
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    const base = seed();
    return {
      ...base,
      ...parsed,
      requirements: parsed.requirements ?? [],
      deliverables: parsed.deliverables ?? base.deliverables,
      risks: parsed.risks ?? [],
      budget: parsed.budget ?? base.budget,
      timeline: parsed.timeline ?? base.timeline,
      briefs: parsed.briefs ?? base.briefs,
      proposals: parsed.proposals ?? base.proposals,
      contracts: parsed.contracts ?? base.contracts,
      project: parsed.project ?? base.project,
      team: parsed.team ?? base.team,
      resourcePlan: parsed.resourcePlan ?? base.resourcePlan,
      guards: parsed.guards ?? base.guards,
    };
  } catch {
    return seed();
  }
}

function save(state: DemoState) {
  window.sessionStorage.setItem(
    NORTHSTAR_COMMERCIAL_STORAGE_KEY,
    JSON.stringify(state),
  );
}

function bundle(state: DemoState): OpportunityBundle {
  return {
    opportunity: state.opportunity,
    facts: state.facts,
    followUps: state.followUps,
    requirements: state.requirements,
    deliverables: state.deliverables,
    risks: state.risks,
    briefs: state.briefs,
    guards: state.guards,
    questionnaire: state.questionnaire,
    answers: state.answers,
    sources: state.sources,
    extractionRuns: state.extractionRuns,
    ...(state.budget ? { budget: state.budget } : {}),
    ...(state.timeline ? { timeline: state.timeline } : {}),
  };
}

export function createNorthstarCommercialApi() {
  return {
    listServices: async () => [load().service],
    createService: async () => {
      const state = load();
      return { service: state.service, questionnaire: state.questionnaire };
    },
    getService: async () => {
      const state = load();
      return {
        service: state.service,
        costs: [
          {
            roleKey: "strategist",
            estimatedMinutes: 2400,
            internalRatePerHourMinor: "15000",
            vendorCostMinor: "0",
          },
        ],
        questionnaire: state.questionnaire,
        questionnaires: [state.questionnaire],
      };
    },
    updateService: async () => {
      const state = load();
      return { service: state.service };
    },
    updateDraftQuestionnaire: async (
      _versionId: string,
      body: {
        jsonSchema?: Record<string, unknown>;
        uiSchema?: Record<string, unknown>;
        questionMeta?: Record<string, unknown>;
        builder?: QuestionnaireBuilderDocument;
      },
    ) => {
      const state = load();
      if (body.builder) {
        const compiled = compileBuilderDocument(body.builder);
        state.questionnaire = {
          ...state.questionnaire,
          jsonSchema: compiled.jsonSchema,
          uiSchema: compiled.uiSchema,
          questionMeta: compiled.questionMeta,
        };
        save(state);
      }
      return state.questionnaire;
    },
    duplicateQuestionnaireDraft: async () => load().questionnaire,
    publishQuestionnaire: async () => load().questionnaire,
    listClients: async () => [load().client],
    createClient: async () => {
      const state = load();
      return { client: state.client, contact: state.contact };
    },
    getClient: async () => {
      const state = load();
      return { client: state.client, contacts: [state.contact] };
    },
    listOpportunities: async () => [load().opportunity],
    createOpportunity: async () => load().opportunity,
    getOpportunity: async (id?: string) => {
      void id;
      return bundle(load());
    },
    saveAnswers: async (id: string, answers: Record<string, unknown>) => {
      void id;
      const state = load();
      const validated = validateQuestionnaireResponse(
        brandStrategyQuestionnaireV1,
        answers,
        { enforceRequired: false },
      );
      if (!validated.valid) {
        throw new Error(validated.errors.join(" "));
      }
      state.answers = answers;
      save(state);
      return bundle(state);
    },
    submitAnswers: async (id: string, answers: Record<string, unknown>) => {
      void id;
      const state = load();
      const validated = validateQuestionnaireResponse(
        brandStrategyQuestionnaireV1,
        answers,
        { enforceRequired: true },
      );
      if (!validated.valid) {
        throw new Error(validated.errors.join(" "));
      }
      state.answers = answers;
      state.submitted = true;
      const builder = parseBuilderDocument(state.questionnaire);
      for (const fact of answersToDraftFactStatements(builder, answers)) {
        state.facts.push({
          id: `ns-fact-${state.facts.length + 1}`,
          candidateFact: fact.statement,
          category: fact.category,
          confidenceBps: 10_000,
          status: "draft",
        });
      }
      save(state);
      return bundle(state);
    },
    addNotes: async (id: string, notes: string) => {
      void id;
      const state = load();
      state.sources = [{ originalText: notes || NORTHSTAR_ACME_NOTES }];
      save(state);
      return bundle(state);
    },
    analyzeNotes: async (id: string) => {
      void id;
      const state = load();
      const notes = state.sources[0]?.originalText ?? NORTHSTAR_ACME_NOTES;
      const drafts = await extractor.extract({
        sourceId: "ns-src-1",
        sourceText: notes,
        extractionRunId: "ns-run-1",
      });
      state.facts = drafts.map((draft, index) => ({
        id: `ns-fact-${index}`,
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
      }));
      state.extractionRuns = [
        {
          id: "ns-run-1",
          sourceId: "ns-src-1",
          sourceFingerprint: "demo",
          provider: "fixture",
          model: "fixture-v1",
          status: "succeeded",
          attemptCount: 1,
          createdAt: new Date().toISOString(),
        },
      ];
      save(state);
      return bundle(state);
    },
    verifyFact: async (factId: string, status: "verified" | "rejected") => {
      const state = load();
      state.facts = state.facts.map((fact) =>
        fact.id === factId ? { ...fact, status } : fact,
      );
      const verified = state.facts.find((fact) => fact.id === factId)!;
      if (status === "verified") {
        applyNorthstarScope(state, verified);
      }
      save(state);
      return verified;
    },
    answerFollowUp: async (questionId: string, answer: string) => {
      const state = load();
      state.followUps = state.followUps.map((row) =>
        row.id === questionId ? { ...row, answer } : row,
      );
      save(state);
      return state.followUps.find((row) => row.id === questionId)!;
    },
    handleRisk: async (riskId: string) => {
      const state = load();
      state.risks = state.risks.map((row) =>
        row.id === riskId ? { ...row, handled: true } : row,
      );
      save(state);
      return state.risks.find((row) => row.id === riskId)!;
    },
    updateDeliverable: async (
      deliverableId: string,
      body: { name: string; description?: string },
    ) => {
      const state = load();
      state.deliverables = state.deliverables.map((row) =>
        row.id === deliverableId ? { ...row, ...body } : row,
      );
      save(state);
    },
    calculate: async (id?: string) => {
      void id;
      const state = load();
      const calculation = calculateScope({
        currency: "USD",
        components: [
          {
            roleKey: "strategist",
            estimatedMinutes: 2400,
            internalRatePerHourMinor: "15000",
            vendorCostMinor: "0",
          },
        ],
        contingencyBps: 1000,
        targetMarginBps: 4000,
        budgetMinMinor: 7000000n,
        budgetMaxMinor: 9000000n,
        estimatedDeliveryDays: 70,
        timelineDays: 90,
      });
      state.opportunity = {
        ...state.opportunity,
        latestCalculation: { ...calculation },
        journeyStatus: "ready_for_brief",
        completeness: 100,
        revision: state.opportunity.revision + 1,
      };
      save(state);
      return bundle(state);
    },
    generateBrief: async (id?: string) => {
      void id;
      const state = load();
      if (state.briefs.some((row) => row.status === "approved")) {
        throw new Error("Approved brief already exists.");
      }
      const version: BriefVersionRecord = {
        id: `ns-brief-${state.briefs.length + 1}`,
        versionNumber: state.briefs.length + 1,
        status: "draft",
        ...(state.opportunity.latestCalculation
          ? { calculation: state.opportunity.latestCalculation }
          : {}),
        sections: [
          {
            key: "goals",
            title: "Goals",
            body: String(
              state.answers.successMetric ?? "Launch-ready brand identity.",
            ),
          },
          {
            key: "audience",
            title: "Audience",
            body: String(state.answers.primaryAudience ?? "Plant managers."),
          },
          {
            key: "scope",
            title: "Scope",
            body: state.deliverables.map((row) => row.name).join("; "),
          },
          {
            key: "requirements",
            title: "Requirements",
            body: state.requirements
              .map((row) => `${row.key}: ${row.statement}`)
              .join("\n"),
          },
          {
            key: "risks",
            title: "Risks",
            body: state.risks.map((row) => row.statement).join("\n"),
          },
        ],
      };
      state.briefs = [...state.briefs, version];
      state.opportunity = {
        ...state.opportunity,
        journeyStatus: "brief_draft",
      };
      save(state);
      return version;
    },
    submitReview: async (versionId: string, expectedVersion?: number) => {
      void expectedVersion;
      const state = load();
      state.briefs = state.briefs.map((row) =>
        row.id === versionId ? { ...row, status: "in_review" } : row,
      );
      state.opportunity = {
        ...state.opportunity,
        journeyStatus: "founder_review",
      };
      state.guards.push({
        id: crypto.randomUUID(),
        action: "brief.submit_review",
        outcome: "ALLOW",
        reason: "Required information, evidence, and calculations present.",
        createdAt: new Date().toISOString(),
      });
      save(state);
      return state.briefs.find((row) => row.id === versionId)!;
    },
    requestChanges: async (versionId: string) => {
      const state = load();
      state.briefs = state.briefs.map((row) =>
        row.id === versionId ? { ...row, status: "draft" } : row,
      );
      state.opportunity = {
        ...state.opportunity,
        journeyStatus: "changes_requested",
      };
      save(state);
      return state.briefs.find((row) => row.id === versionId)!;
    },
    approve: async (versionId: string, expectedVersion?: number) => {
      void expectedVersion;
      const state = load();
      const current = state.briefs.find((row) => row.id === versionId);
      if (current?.status === "approved") return current;
      state.briefs = state.briefs.map((row) =>
        row.id === versionId ? { ...row, status: "approved" } : row,
      );
      state.opportunity = { ...state.opportunity, journeyStatus: "approved" };
      state.guards.push({
        id: crypto.randomUUID(),
        action: "brief.approve",
        outcome: "ALLOW",
        reason: "Founder approved immutable brief version.",
        createdAt: new Date().toISOString(),
      });
      save(state);
      return state.briefs.find((row) => row.id === versionId)!;
    },
    listProposals: async () => load().proposals,
    generateProposal: async () => {
      throw new Error("Northstar demo ships with an accepted proposal.");
    },
    submitProposal: async () => {
      throw new Error("Northstar demo ships with an accepted proposal.");
    },
    approveProposal: async () => {
      throw new Error("Northstar demo ships with an accepted proposal.");
    },
    shareProposal: async () => {
      throw new Error("Northstar demo ships with an accepted proposal.");
    },
    listContracts: async (id?: string) => {
      void id;
      return load().contracts;
    },
    generateContract: async () => {
      throw new Error("Northstar demo ships with an executed contract.");
    },
    submitContract: async () => {
      throw new Error("Northstar demo ships with an executed contract.");
    },
    approveContract: async () => {
      throw new Error("Northstar demo ships with an executed contract.");
    },
    acceptContract: async () => load().contracts[0]!,
    listProjects: async () => {
      const state = load();
      return state.project ? [state.project] : [];
    },
    generateProject: async (id?: string) => {
      void id;
      const state = load();
      if (state.project) {
        throw new Error("Project already exists for this opportunity.");
      }
      if (!state.contracts.some((row) => row.status === "executed")) {
        throw new Error("Executed contract required.");
      }
      const plan = generateProjectPlan({
        opportunityName: state.opportunity.name,
        clientName: state.client.name,
        clauses: state.contracts[0]!.clauses.map((row, index) => ({
          clauseKey: index === 0 ? "scope" : `clause-${index}`,
          title: row.title,
          body: row.body,
        })),
        deliverables: state.deliverables,
        paymentSchedule: state.contracts[0]!.paymentSchedule.map((row) => ({
          label: row.label,
          dueDescription: row.label,
        })),
        timelineDays: 90,
      });
      const project = buildNorthstarProject(plan, "draft");
      state.project = project;
      state.opportunity = {
        ...state.opportunity,
        journeyStatus: "project_in_progress",
      };
      state.guards.push({
        id: crypto.randomUUID(),
        action: "project.create",
        outcome: "ALLOW",
        reason: "Deterministic plan generated from executed contract.",
        createdAt: new Date().toISOString(),
      });
      save(state);
      return project;
    },
    getProject: async (projectId: string) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      return state.project;
    },
    submitProject: async (projectId: string) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      const next = nextProjectStatus(
        state.project.status as "draft",
        "SUBMIT_FOR_REVIEW",
        {
          planComplete:
            state.project.phases.length > 0 &&
            state.project.milestones.length > 0 &&
            state.project.deliverables.length > 0 &&
            state.project.tasks.length > 0,
          actorCanApprove: true,
          actorCanPublish: true,
          actorCanManage: true,
        },
      );
      state.project = { ...state.project, status: next };
      save(state);
      return state.project;
    },
    approveProject: async (projectId: string) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      const next = nextProjectStatus(
        state.project.status as "in_review",
        "APPROVE",
        {
          planComplete: true,
          actorCanApprove: true,
          actorCanPublish: true,
          actorCanManage: true,
        },
      );
      state.project = { ...state.project, status: next };
      save(state);
      return state.project;
    },
    publishProject: async (projectId: string) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      const next = nextProjectStatus(
        state.project.status as "approved",
        "PUBLISH",
        {
          planComplete: true,
          actorCanApprove: true,
          actorCanPublish: true,
          actorCanManage: true,
        },
      );
      state.project = { ...state.project, status: next };
      state.opportunity = {
        ...state.opportunity,
        journeyStatus: "project_published",
      };
      save(state);
      return state.project;
    },
    activateProject: async (projectId: string) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      const next = nextProjectStatus(
        state.project.status as "published",
        "ACTIVATE",
        {
          planComplete: true,
          actorCanApprove: true,
          actorCanPublish: true,
          actorCanManage: true,
        },
      );
      state.project = { ...state.project, status: next };
      state.opportunity = {
        ...state.opportunity,
        journeyStatus: "project_active",
      };
      save(state);
      return state.project;
    },
    assignTask: async (
      projectId: string,
      body: { taskId: string; roleKey: string; assigneeLabel: string },
    ) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      const assignment = {
        id: crypto.randomUUID(),
        taskId: body.taskId,
        roleKey: body.roleKey,
        assigneeLabel: body.assigneeLabel,
      };
      state.project = {
        ...state.project,
        assignments: [
          ...state.project.assignments.filter(
            (row) =>
              !(
                row.taskId === body.taskId && row.roleKey === body.roleKey
              ),
          ),
          assignment,
        ],
      };
      save(state);
      return state.project;
    },
    getTimeline: async (projectId: string) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      const totalTasks = state.project.tasks.length;
      const assignedTasks = new Set(
        state.project.assignments.map((row) => row.taskId),
      ).size;
      return {
        status: state.project.status,
        progress: {
          totalTasks,
          assignedTasks,
          percentComplete: 0,
        },
      };
    },
    getAudit: async (projectId: string) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      return {
        guards: state.guards.filter((row) => row.action.startsWith("project.")),
      };
    },
    listResources: async () => load().team,
    getResourcePlan: async (projectId: string) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      if (!state.resourcePlan) {
        state.resourcePlan = {
          id: "ns-rp-1",
          projectId,
          status: "draft",
          recommendations: [],
          assignmentDrafts: [],
          versions: [],
        };
        save(state);
      }
      return state.resourcePlan;
    },
    generateResourceRecommendations: async (projectId: string) => {
      const state = load();
      if (!state.project || state.project.id !== projectId) {
        throw new Error("Project not found.");
      }
      const strategistTask = state.project.tasks[0];
      const strategist = state.team.find((r) => r.roleKeys.includes("strategist"));
      const designer = state.team.find((r) => r.roleKeys.includes("designer"));
      const contractor = state.team.find((r) => r.resourceType === "contractor");
      const recommendations: ResourcePlanRecord["recommendations"] = [
        {
          id: "ns-rr-1",
          taskId: strategistTask?.id ?? "ns-task-1",
          roleKey: "strategist",
          ...(strategist ? { resourceProfileId: strategist.id } : {}),
          rank: 1,
          confidenceBps: 8200,
          evidence: {
            factors: [
              { key: "role", label: "Required role", included: true },
              { key: "capacity", label: "Available capacity", included: true },
            ],
          },
        },
        {
          id: "ns-rr-2",
          taskId: strategistTask?.id ?? "ns-task-1",
          roleKey: "designer",
          ...(designer ? { resourceProfileId: designer.id } : {}),
          rank: 0,
          confidenceBps: 0,
          evidence: { factors: [{ key: "skills", included: false }] },
          excludedReason: "skill_gap",
        },
        {
          id: "ns-rr-3",
          taskId: strategistTask?.id ?? "ns-task-1",
          roleKey: "developer",
          ...(contractor ? { resourceProfileId: contractor.id } : {}),
          rank: 1,
          confidenceBps: 4500,
          evidence: {
            factors: [
              { key: "over_allocation", label: "Over-allocation warning", included: true },
            ],
          },
        },
      ];
      state.resourcePlan = {
        id: "ns-rp-1",
        projectId,
        status: nextResourcePlanStatus("draft", "GENERATE_RECOMMENDATIONS", {
          projectActive: true,
          hasRequirements: true,
          hasDraftAssignments: false,
          roleCoverageComplete: false,
          guardAllowsPublish: true,
          actorCanManage: true,
          actorCanApprove: true,
          actorCanPublish: true,
        }),
        recommendations,
        assignmentDrafts: state.resourcePlan?.assignmentDrafts ?? [],
        versions: state.resourcePlan?.versions ?? [],
      };
      save(state);
      return { plan: state.resourcePlan };
    },
    upsertResourceAssignment: async (
      projectId: string,
      body: {
        taskId: string;
        roleKey: string;
        resourceProfileId: string;
        allocationMinutes: number;
      },
    ) => {
      const state = load();
      const plan = state.resourcePlan;
      if (!plan || plan.projectId !== projectId) {
        throw new Error("Resource plan not found.");
      }
      const draft = {
        id: crypto.randomUUID(),
        taskId: body.taskId,
        roleKey: body.roleKey,
        resourceProfileId: body.resourceProfileId,
        allocationMinutes: body.allocationMinutes,
      };
      state.resourcePlan = {
        ...plan,
        assignmentDrafts: [
          ...plan.assignmentDrafts.filter(
            (d) => !(d.taskId === body.taskId && d.roleKey === body.roleKey),
          ),
          draft,
        ],
      };
      save(state);
      return draft;
    },
    submitResourcePlan: async (projectId: string) => {
      void projectId;
      const state = load();
      if (!state.resourcePlan) throw new Error("Resource plan not found.");
      state.resourcePlan = {
        ...state.resourcePlan,
        status: nextResourcePlanStatus(
          state.resourcePlan.status as "recommendations_ready",
          "SUBMIT_FOR_REVIEW",
          {
            projectActive: true,
            hasRequirements: true,
            hasDraftAssignments: state.resourcePlan.assignmentDrafts.length > 0,
            roleCoverageComplete: false,
            guardAllowsPublish: true,
            actorCanManage: true,
            actorCanApprove: true,
            actorCanPublish: true,
          },
        ),
      };
      save(state);
      return state.resourcePlan;
    },
    approveResourcePlan: async (projectId: string) => {
      void projectId;
      const state = load();
      if (!state.resourcePlan) throw new Error("Resource plan not found.");
      state.resourcePlan = {
        ...state.resourcePlan,
        status: nextResourcePlanStatus(
          state.resourcePlan.status as "founder_review",
          "APPROVE",
          {
            projectActive: true,
            hasRequirements: true,
            hasDraftAssignments: true,
            roleCoverageComplete: true,
            guardAllowsPublish: true,
            actorCanManage: true,
            actorCanApprove: true,
            actorCanPublish: true,
          },
        ),
      };
      save(state);
      return state.resourcePlan;
    },
    publishResourcePlan: async (projectId: string) => {
      void projectId;
      const state = load();
      if (!state.resourcePlan) throw new Error("Resource plan not found.");
      const version = {
        id: "ns-rpv-1",
        versionNumber: 1,
        publishedAt: new Date().toISOString(),
      };
      state.resourcePlan = {
        ...state.resourcePlan,
        status: "published",
        versions: [version],
      };
      save(state);
      return version;
    },
    getMyWork: async () => {
      const state = load();
      if (!state.resourcePlan || state.resourcePlan.status !== "published") {
        return [];
      }
      return state.resourcePlan.assignmentDrafts.map((d) => ({
        projectId: state.resourcePlan!.projectId,
        taskId: d.taskId,
        roleKey: d.roleKey,
        allocationMinutes: d.allocationMinutes,
      }));
    },
  };
}

function northstarTeamSeed(): ResourceProfileRecord[] {
  return [
    {
      id: "ns-res-maya",
      displayName: "Maya Chen (Founder)",
      resourceType: "employee",
      roleKeys: ["founder", "strategist"],
      timezone: "America/Los_Angeles",
      status: "active",
    },
    {
      id: "ns-res-ops",
      displayName: "Jordan Ellis (Operations)",
      resourceType: "employee",
      roleKeys: ["project_manager", "strategist"],
      timezone: "America/New_York",
      status: "active",
    },
    {
      id: "ns-res-strategist",
      displayName: "Avery Brooks (Brand Strategist)",
      resourceType: "employee",
      roleKeys: ["strategist"],
      timezone: "America/Chicago",
      status: "active",
    },
    {
      id: "ns-res-designer",
      displayName: "Sam Rivera (Designer)",
      resourceType: "employee",
      roleKeys: ["designer"],
      timezone: "America/Los_Angeles",
      status: "active",
    },
    {
      id: "ns-res-copy",
      displayName: "Taylor Kim (Copywriter)",
      resourceType: "employee",
      roleKeys: ["copywriter"],
      timezone: "America/Denver",
      status: "active",
    },
    {
      id: "ns-res-media",
      displayName: "Chris Park (Paid Media)",
      resourceType: "employee",
      roleKeys: ["paid_media"],
      timezone: "America/New_York",
      status: "active",
    },
    {
      id: "ns-res-dev",
      displayName: "Riley Morgan (Developer)",
      resourceType: "employee",
      roleKeys: ["developer"],
      timezone: "Europe/London",
      status: "active",
    },
    {
      id: "ns-res-contractor",
      displayName: "Alex Vendor (Contractor)",
      resourceType: "contractor",
      roleKeys: ["developer"],
      timezone: "Asia/Singapore",
      status: "active",
    },
  ];
}

function buildNorthstarProject(
  plan: ReturnType<typeof generateProjectPlan>,
  status: string,
): ProjectDetailRecord {
  const projectId = "ns-project-1";
  const phaseIds = new Map(
    plan.phases.map((phase) => [phase.phaseKey, `ns-phase-${phase.phaseKey}`]),
  );
  const deliverableIds = new Map(
    plan.deliverables.map((row) => [row.deliverableKey, `ns-${row.deliverableKey}`]),
  );
  const tasks = plan.tasks.map((task, index) => ({
    id: `ns-task-${index + 1}`,
    taskKey: task.taskKey,
    name: task.name,
    status: "todo",
    estimatedMinutes: task.estimatedMinutes,
  }));
  const taskIds = new Map(tasks.map((task) => [task.taskKey, task.id]));
  return {
    id: projectId,
    name: plan.name,
    status,
    phases: plan.phases.map((phase) => ({
      id: phaseIds.get(phase.phaseKey)!,
      name: phase.name,
      status: "planned",
    })),
    milestones: plan.milestones.map((row, index) => ({
      id: `ns-ms-${index + 1}`,
      name: row.name,
      dueOffsetDays: row.dueOffsetDays,
      status: "pending",
    })),
    deliverables: plan.deliverables.map((row) => ({
      id: deliverableIds.get(row.deliverableKey)!,
      name: row.name,
      description: row.description,
    })),
    tasks,
    recommendationDrafts: plan.recommendationDrafts.map((row, index) => ({
      id: `ns-rec-${index + 1}`,
      taskId: taskIds.get(row.taskKey)!,
      roleKey: row.roleKey,
      suggestedAssigneeLabel: row.suggestedAssigneeLabel,
      confidenceBps: row.confidenceBps,
      rationale: row.rationale,
    })),
    assignments: [],
  };
}

function applyNorthstarScope(state: DemoState, fact: FactRecord) {
  for (const write of scopeWritesFromVerifiedFact(fact)) {
    if (write.kind === "requirement") {
      state.requirements = [
        ...state.requirements.filter((row) => row.key !== write.key),
        { key: write.key, statement: write.statement },
      ];
    } else if (write.kind === "deliverable") {
      if (!state.deliverables.some((row) => row.name === write.name)) {
        state.deliverables = [
          ...state.deliverables,
          {
            id: `ns-del-${state.deliverables.length + 1}`,
            name: write.name,
            description: write.description,
          },
        ];
      }
    } else if (write.kind === "budget") {
      state.budget = {
        currency: "USD",
        ...(write.minMinor ? { minMinor: write.minMinor } : {}),
        ...(write.maxMinor ? { maxMinor: write.maxMinor } : {}),
      };
    } else if (write.kind === "timeline") {
      state.timeline = { notes: write.notes };
    } else if (!state.risks.some((row) => row.statement === write.statement)) {
      state.risks = [
        ...state.risks,
        {
          id: `ns-risk-${state.risks.length + 1}`,
          statement: write.statement,
          blocking: write.blocking,
          handled: write.handled,
        },
      ];
    }
  }
}
