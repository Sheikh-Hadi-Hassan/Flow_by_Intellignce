export type JourneyStatus =
  | "collecting_information"
  | "missing_information"
  | "ready_for_brief"
  | "brief_draft"
  | "founder_review"
  | "changes_requested"
  | "approved"
  | "proposal_in_progress"
  | "proposal_accepted"
  | "contract_executed"
  | "project_in_progress"
  | "project_published"
  | "project_active";

export type QuestionnaireLifecycle = "draft" | "published" | "archived";

export type FactStatus = "draft" | "verified" | "rejected";

export type BriefVersionStatus =
  "draft" | "in_review" | "approved" | "superseded";

export type PricingModel = "retainer" | "project" | "hourly" | "hybrid";

export interface CostComponentInput {
  readonly roleKey: string;
  readonly estimatedMinutes: number;
  readonly internalRatePerHourMinor: string;
  readonly vendorCostMinor: string;
}

export interface ScopeCalculation {
  readonly currency: string;
  readonly hoursByRoleMinutes: Readonly<Record<string, number>>;
  readonly internalLabourCostMinor: string;
  readonly vendorCostMinor: string;
  readonly contingencyMinor: string;
  readonly totalDeliveryCostMinor: string;
  readonly targetMarginBps: number;
  readonly recommendedPriceMinor: string;
  readonly grossProfitMinor: string;
  readonly actualMarginBps: number;
  readonly budgetFit: "under" | "within" | "over" | "unknown";
  readonly timelineFeasibility: "feasible" | "infeasible" | "unknown";
}

export interface JourneyGuardInput {
  readonly requiredInformationComplete: boolean;
  readonly requiredEvidenceAvailable: boolean;
  readonly calculationsCompleted: boolean;
  readonly blockingRisksHandled: boolean;
  readonly actorCanApprove: boolean;
  readonly versionMatches: boolean;
  readonly unansweredRequiredQuestions: number;
  readonly briefExists: boolean;
}

export interface ExtractedFactDraft {
  readonly candidateId?: string;
  readonly candidateFact: string;
  readonly category: string;
  readonly confidenceBps: number;
  readonly sourceId: string;
  readonly characterStart?: number;
  readonly characterEnd?: number;
  readonly timecode?: string;
  readonly extractionRunId: string;
  readonly status: FactStatus;
  readonly duplicateOfCandidateId?: string;
  readonly contradictionRef?: string;
}
