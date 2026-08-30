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
  readonly sources: readonly { readonly originalText: string }[];
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
  };
}
