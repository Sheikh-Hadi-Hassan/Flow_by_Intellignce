/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-base-to-string -- demo store is synchronous behind async API shape */
import {
  brandStrategyQuestionnaireV1,
  calculateScope,
  FixtureDiscoveryExtractor,
  scopeWritesFromVerifiedFact,
  validateQuestionnaireResponse,
} from "@flow/commercial";

import {
  NORTHSTAR_ACME_NOTES,
  NORTHSTAR_COMMERCIAL_STORAGE_KEY,
} from "../../content/demo/northstar-commercial";
import type {
  BriefVersionRecord,
  CommercialClientRecord,
  CommercialContactRecord,
  CommercialServiceRecord,
  FactRecord,
  FollowUpRecord,
  OpportunityBundle,
  OpportunityRecord,
  QuestionnaireVersion,
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
  guards: OpportunityBundle["guards"][number][];
  extractionRuns: NonNullable<OpportunityBundle["extractionRuns"]>;
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
      status: "prospect",
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
      name: "Acme Robotics brand system",
      clientId: "ns-client-acme",
      serviceId: "ns-svc-brand",
      journeyStatus: "collecting_information",
      currency: "USD",
      completeness: 0,
      revision: 1,
      budgetMinMinor: "7000000",
      budgetMaxMinor: "9000000",
    },
    answers: {},
    sources: [],
    facts: [],
    followUps: [
      {
        id: "ns-fu-1",
        prompt: "Who internally approves the brief?",
        required: true,
      },
    ],
    requirements: [],
    deliverables: [
      {
        id: "ns-del-1",
        name: "Brand strategy and identity system",
        description: "Positioning, identity, and launch narrative.",
      },
    ],
    risks: [
      {
        id: "ns-risk-1",
        statement:
          "Blocking: confirm procurement approval path before final brief approval.",
        blocking: true,
        handled: false,
      },
    ],
    budget: {
      currency: "USD",
      minMinor: "7000000",
      maxMinor: "9000000",
    },
    timeline: { notes: "90 days to Q4 launch" },
    briefs: [],
    guards: [],
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
    updateDraftQuestionnaire: async () => load().questionnaire,
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
    getOpportunity: async (_id?: string) => bundle(load()),
    saveAnswers: async (_id: string, answers: Record<string, unknown>) => {
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
    addNotes: async (_id: string, notes: string) => {
      const state = load();
      state.sources = [{ originalText: notes || NORTHSTAR_ACME_NOTES }];
      save(state);
      return bundle(state);
    },
    analyzeNotes: async (_id: string) => {
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
    calculate: async (_id?: string) => {
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
    generateBrief: async (_id?: string) => {
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
    submitReview: async (versionId: string, _expectedVersion?: number) => {
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
    approve: async (versionId: string, _expectedVersion?: number) => {
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
