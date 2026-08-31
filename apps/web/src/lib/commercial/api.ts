import { apiRequest } from "../api/client";

export interface CommercialServiceRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly pricingModel: string;
  readonly currency: string;
  readonly status: string;
}

export interface QuestionnaireVersion {
  readonly id: string;
  readonly versionNumber: number;
  readonly status: string;
  readonly jsonSchema: Record<string, unknown>;
  readonly uiSchema: Record<string, unknown>;
  readonly questionMeta: Record<string, unknown>;
}

export interface CommercialClientRecord {
  readonly id: string;
  readonly name: string;
  readonly industry?: string;
  readonly website?: string;
  readonly status: string;
}

export interface CommercialContactRecord {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly title?: string;
  readonly email?: string;
}

export interface OpportunityRecord {
  readonly id: string;
  readonly name: string;
  readonly clientId: string;
  readonly serviceId: string;
  readonly journeyStatus: string;
  readonly currency: string;
  readonly completeness: number;
  readonly revision: number;
  readonly budgetMinMinor?: string;
  readonly budgetMaxMinor?: string;
  readonly latestCalculation?: Record<string, unknown>;
}

export interface FactRecord {
  readonly id: string;
  readonly candidateFact: string;
  readonly category: string;
  readonly confidenceBps: number;
  readonly status: string;
  readonly characterStart?: number;
  readonly characterEnd?: number;
  readonly candidateId?: string;
  readonly duplicateOfCandidateId?: string;
  readonly contradictionRef?: string;
}

export interface ExtractionRunRecord {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceFingerprint: string;
  readonly provider: string;
  readonly model: string;
  readonly status: string;
  readonly attemptCount: number;
  readonly errorCode?: string;
  readonly latencyMs?: number;
  readonly createdAt: string;
}

export interface FollowUpRecord {
  readonly id: string;
  readonly prompt: string;
  readonly required: boolean;
  readonly answer?: string;
}

export interface BriefVersionRecord {
  readonly id: string;
  readonly versionNumber: number;
  readonly status: string;
  readonly sections: readonly { key: string; title: string; body: string }[];
  readonly calculation?: Record<string, unknown>;
}

export interface ProposalVersionRecord {
  readonly id: string;
  readonly versionNumber: number;
  readonly status: string;
  readonly sections: readonly {
    sectionKey: string;
    title: string;
    body: string;
  }[];
  readonly packages: readonly {
    name: string;
    totalMinor: string;
    isRecommended: boolean;
  }[];
  readonly calculation?: Record<string, unknown>;
}

export interface ContractVersionRecord {
  readonly id: string;
  readonly versionNumber: number;
  readonly status: string;
  readonly clauses: readonly { title: string; body: string }[];
  readonly parties: readonly { partyRole: string; legalName: string }[];
  readonly paymentSchedule: readonly {
    label: string;
    amountMinor: string;
  }[];
  readonly calculation?: Record<string, unknown>;
}

export interface ProjectTaskRecord {
  readonly id: string;
  readonly taskKey: string;
  readonly name: string;
  readonly status: string;
  readonly estimatedMinutes: number;
}

export interface ProjectRecommendationDraftRecord {
  readonly id: string;
  readonly taskId: string;
  readonly roleKey: string;
  readonly suggestedAssigneeLabel: string;
  readonly confidenceBps: number;
  readonly rationale: string;
}

export interface ProjectAssignmentRecord {
  readonly id: string;
  readonly taskId: string;
  readonly roleKey: string;
  readonly assigneeLabel: string;
}

export interface ProjectDetailRecord {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly phases: readonly { id: string; name: string; status: string }[];
  readonly milestones: readonly {
    id: string;
    name: string;
    dueOffsetDays: number;
    status: string;
  }[];
  readonly deliverables: readonly { id: string; name: string; description: string }[];
  readonly tasks: readonly ProjectTaskRecord[];
  readonly recommendationDrafts: readonly ProjectRecommendationDraftRecord[];
  readonly assignments: readonly ProjectAssignmentRecord[];
}

export interface OpportunityBundle {
  readonly opportunity: OpportunityRecord;
  readonly facts: readonly FactRecord[];
  readonly followUps: readonly FollowUpRecord[];
  readonly briefs: readonly BriefVersionRecord[];
  readonly guards: readonly {
    readonly id: string;
    readonly action: string;
    readonly outcome: string;
    readonly reason: string;
    readonly createdAt: string;
  }[];
  readonly questionnaire?: QuestionnaireVersion;
  readonly answers?: Record<string, unknown>;
  readonly sources: readonly { readonly id?: string; readonly originalText: string }[];
  readonly requirements: readonly {
    readonly key: string;
    readonly statement: string;
  }[];
  readonly deliverables: readonly {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
  }[];
  readonly risks: readonly {
    readonly id: string;
    readonly statement: string;
    readonly blocking: boolean;
    readonly handled: boolean;
  }[];
  readonly budget?: {
    readonly currency: string;
    readonly minMinor?: string;
    readonly maxMinor?: string;
  };
  readonly timeline?: { readonly notes?: string };
  readonly extractionRuns?: readonly ExtractionRunRecord[];
}

export function commercialPath(workspaceId: string, suffix: string): string {
  return `/api/v1/workspaces/${workspaceId}/commercial${suffix}`;
}

export function createCommercialApi(input: {
  readonly token: string;
  readonly workspaceId: string;
}) {
  const request = <T>(
    suffix: string,
    options: {
      method?: string;
      body?: unknown;
      idempotencyKey?: string;
    } = {},
  ) =>
    apiRequest<T>(commercialPath(input.workspaceId, suffix), {
      token: input.token,
      workspaceId: input.workspaceId,
      ...options,
    });

  return {
    listServices: () => request<CommercialServiceRecord[]>("/services"),
    createService: (body: {
      name: string;
      description?: string;
      pricingModel: string;
      currency: string;
    }) =>
      request<{
        service: CommercialServiceRecord;
        questionnaire: QuestionnaireVersion;
      }>("/services", { method: "POST", body }),
    getService: (id: string) =>
      request<{
        service: CommercialServiceRecord;
        costs: readonly {
          roleKey: string;
          estimatedMinutes: number;
          internalRatePerHourMinor: string;
          vendorCostMinor: string;
        }[];
        questionnaire?: QuestionnaireVersion;
        questionnaires: QuestionnaireVersion[];
      }>(`/services/${id}`),
    updateService: (
      id: string,
      body: {
        name?: string;
        description?: string;
        pricingModel?: string;
        status?: string;
        costs?: readonly {
          roleKey: string;
          estimatedMinutes: number;
          internalRatePerHourMinor: string;
          vendorCostMinor: string;
        }[];
      },
    ) =>
      request<{ service: CommercialServiceRecord }>(`/services/${id}`, {
        method: "POST",
        body,
      }),
    updateDraftQuestionnaire: (
      versionId: string,
      body: {
        jsonSchema: Record<string, unknown>;
        uiSchema: Record<string, unknown>;
        questionMeta: Record<string, unknown>;
      },
    ) =>
      request<QuestionnaireVersion>(`/questionnaires/${versionId}/draft`, {
        method: "POST",
        body,
      }),
    publishQuestionnaire: (versionId: string) =>
      request<QuestionnaireVersion>(`/questionnaires/${versionId}/publish`, {
        method: "POST",
        idempotencyKey: `publish-${versionId}`,
      }),
    listClients: () => request<CommercialClientRecord[]>("/clients"),
    createClient: (body: Record<string, string>) =>
      request<{
        client: CommercialClientRecord;
        contact: CommercialContactRecord;
      }>("/clients", { method: "POST", body }),
    getClient: (id: string) =>
      request<{
        client: CommercialClientRecord;
        contacts: CommercialContactRecord[];
      }>(`/clients/${id}`),
    listOpportunities: () => request<OpportunityRecord[]>("/opportunities"),
    createOpportunity: (body: Record<string, string>) =>
      request<OpportunityRecord>("/opportunities", { method: "POST", body }),
    getOpportunity: (id: string) =>
      request<OpportunityBundle>(`/opportunities/${id}`),
    saveAnswers: (id: string, answers: Record<string, unknown>) =>
      request<OpportunityBundle>(`/opportunities/${id}/answers`, {
        method: "POST",
        body: { answers },
      }),
    addNotes: (id: string, notes: string) =>
      request<OpportunityBundle>(`/opportunities/${id}/notes`, {
        method: "POST",
        body: { notes },
      }),
    analyzeNotes: (id: string, sourceId?: string) =>
      request<OpportunityBundle>(`/opportunities/${id}/analyze`, {
        method: "POST",
        body: sourceId ? { sourceId } : {},
        idempotencyKey: `analyze-${id}-${Date.now()}`,
      }),
    verifyFact: (factId: string, status: "verified" | "rejected") =>
      request<FactRecord>(`/facts/${factId}/verify`, {
        method: "POST",
        body: { status },
      }),
    answerFollowUp: (questionId: string, answer: string) =>
      request<FollowUpRecord>(`/follow-ups/${questionId}/answer`, {
        method: "POST",
        body: { answer },
      }),
    handleRisk: (riskId: string) =>
      request<{ id: string; handled: boolean }>(`/risks/${riskId}/handle`, {
        method: "POST",
      }),
    updateDeliverable: (
      deliverableId: string,
      body: { name: string; description?: string },
    ) =>
      request<void>(`/deliverables/${deliverableId}`, {
        method: "POST",
        body,
      }),
    calculate: (id: string) =>
      request<OpportunityBundle>(`/opportunities/${id}/calculate`, {
        method: "POST",
      }),
    generateBrief: (id: string) =>
      request<BriefVersionRecord>(`/opportunities/${id}/brief`, {
        method: "POST",
      }),
    submitReview: (versionId: string, expectedVersion: number) =>
      request<BriefVersionRecord>(`/briefs/${versionId}/submit`, {
        method: "POST",
        body: { expectedVersion },
      }),
    requestChanges: (versionId: string) =>
      request<BriefVersionRecord>(`/briefs/${versionId}/changes`, {
        method: "POST",
      }),
    approve: (versionId: string, expectedVersion: number) =>
      request<BriefVersionRecord>(`/briefs/${versionId}/approve`, {
        method: "POST",
        body: { expectedVersion },
        idempotencyKey: `approve-${versionId}`,
      }),
    listProposals: (opportunityId: string) =>
      request<ProposalVersionRecord[]>(`/opportunities/${opportunityId}/proposals`),
    generateProposal: (opportunityId: string) =>
      request<ProposalVersionRecord>(`/opportunities/${opportunityId}/proposals`, {
        method: "POST",
      }),
    submitProposal: (versionId: string) =>
      request<ProposalVersionRecord>(`/proposals/${versionId}/submit`, {
        method: "POST",
      }),
    approveProposal: (versionId: string) =>
      request<ProposalVersionRecord>(`/proposals/${versionId}/approve`, {
        method: "POST",
        idempotencyKey: `proposal-approve-${versionId}`,
      }),
    shareProposal: (versionId: string) =>
      request<{ token: string; expiresAt: string }>(`/proposals/${versionId}/share`, {
        method: "POST",
      }),
    listContracts: (opportunityId: string) =>
      request<ContractVersionRecord[]>(`/opportunities/${opportunityId}/contracts`),
    generateContract: (opportunityId: string) =>
      request<ContractVersionRecord>(`/opportunities/${opportunityId}/contracts`, {
        method: "POST",
      }),
    submitContract: (versionId: string) =>
      request<ContractVersionRecord>(`/contracts/${versionId}/submit`, {
        method: "POST",
      }),
    approveContract: (versionId: string) =>
      request<ContractVersionRecord>(`/contracts/${versionId}/approve`, {
        method: "POST",
        idempotencyKey: `contract-approve-${versionId}`,
      }),
    acceptContract: (versionId: string, actorLabel: string) =>
      request<ContractVersionRecord>(`/contracts/${versionId}/accept`, {
        method: "POST",
        body: { actorLabel },
        idempotencyKey: `contract-accept-${versionId}`,
      }),
    listProjects: (opportunityId: string) =>
      request<ProjectDetailRecord[]>(`/opportunities/${opportunityId}/projects`),
    generateProject: (opportunityId: string) =>
      request<ProjectDetailRecord>(`/opportunities/${opportunityId}/projects`, {
        method: "POST",
      }),
    getProject: (projectId: string) =>
      request<ProjectDetailRecord>(`/projects/${projectId}`),
    submitProject: (projectId: string) =>
      request<ProjectDetailRecord>(`/projects/${projectId}/submit`, {
        method: "POST",
      }),
    approveProject: (projectId: string) =>
      request<ProjectDetailRecord>(`/projects/${projectId}/approve`, {
        method: "POST",
        idempotencyKey: `project-approve-${projectId}`,
      }),
    publishProject: (projectId: string) =>
      request<ProjectDetailRecord>(`/projects/${projectId}/publish`, {
        method: "POST",
        idempotencyKey: `project-publish-${projectId}`,
      }),
    activateProject: (projectId: string) =>
      request<ProjectDetailRecord>(`/projects/${projectId}/activate`, {
        method: "POST",
        idempotencyKey: `project-activate-${projectId}`,
      }),
    assignTask: (
      projectId: string,
      body: { taskId: string; roleKey: string; assigneeLabel: string },
    ) =>
      request<ProjectDetailRecord>(`/projects/${projectId}/assignments`, {
        method: "POST",
        body,
        idempotencyKey: `project-assign-${projectId}-${body.taskId}`,
      }),
    getTimeline: (projectId: string) =>
      request<{
        status: string;
        progress: {
          totalTasks: number;
          assignedTasks: number;
          percentComplete: number;
        };
      }>(`/projects/${projectId}/timeline`),
    getAudit: (projectId: string) =>
      request<{ guards: readonly { action: string; outcome: string }[] }>(
        `/projects/${projectId}/audit`,
      ),
  };
}
