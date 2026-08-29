export type OnboardingStep =
  | "business"
  | "operations"
  | "services"
  | "policies"
  | "review"
  | "complete";

export interface OnboardingBusinessData {
  readonly businessName: string;
  readonly businessType: string;
  readonly description: string;
  readonly website: string;
  readonly country: string;
  readonly currency: string;
  readonly teamSize: string;
  readonly operatingModel: string;
}

export interface OnboardingOperationsData {
  readonly workModels: readonly string[];
  readonly teamLocation: string;
  readonly clientType: string;
  readonly projectDuration: string;
  readonly tools: readonly string[];
  readonly operationalConcern: string;
}

export interface OnboardingServiceData {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly pricingModel: string;
  readonly selected: boolean;
  readonly custom?: boolean;
}

export interface OnboardingPoliciesData {
  readonly proposalApproval: string;
  readonly contractApproval: string;
  readonly projectCreationApproval: string;
  readonly invoiceApproval: string;
  readonly expenseApproval: string;
  readonly clientVisibility: string;
  readonly aiAutonomy: string;
}

export interface WorkspaceOnboardingState {
  readonly workspaceId: string;
  readonly currentStep: OnboardingStep;
  readonly business: OnboardingBusinessData;
  readonly operations: OnboardingOperationsData;
  readonly services: readonly OnboardingServiceData[];
  readonly policies: OnboardingPoliciesData;
  readonly completedAt?: string;
  readonly version: number;
  readonly updatedAt: string;
}

export interface TwinSnapshotData {
  readonly businessName: string;
  readonly classification: string;
  readonly identity: string;
  readonly operatingModel: string;
  readonly services: readonly string[];
  readonly policies: readonly string[];
  readonly expertisePack: string;
  readonly logicCoverage: readonly string[];
  readonly completeness: number;
  readonly missingInformation: readonly string[];
  readonly lastUpdated: string;
  readonly confidence: "high" | "medium" | "low";
  readonly verification: string;
  readonly provenanceLabel: string;
  readonly freshnessLabel: string;
  readonly sourceClassification: string;
}

export interface WorkspaceTwinRecord {
  readonly workspaceId: string;
  readonly snapshot: TwinSnapshotData;
  readonly completeness: number;
  readonly confidence: "high" | "medium" | "low";
  readonly version: number;
  readonly compiledAt: string;
}

export interface WorkspacePreferencesRecord {
  readonly workspaceId: string;
  readonly accentColor?: string;
  readonly locale?: string;
  readonly currency?: string;
  readonly countryCode?: string;
}

export interface UserProfileRecord {
  readonly userId: string;
  readonly firstName: string;
}

export interface WorkspacePhase1Repository {
  getUserProfile(userId: string): Promise<UserProfileRecord | undefined>;
  upsertUserProfile(input: UserProfileRecord): Promise<UserProfileRecord>;

  getOnboarding(workspaceId: string): Promise<WorkspaceOnboardingState | undefined>;
  upsertOnboarding(
    state: WorkspaceOnboardingState,
  ): Promise<WorkspaceOnboardingState>;

  getTwin(workspaceId: string): Promise<WorkspaceTwinRecord | undefined>;
  upsertTwin(record: WorkspaceTwinRecord): Promise<WorkspaceTwinRecord>;

  getPreferences(
    workspaceId: string,
  ): Promise<WorkspacePreferencesRecord | undefined>;
  upsertPreferences(
    record: WorkspacePreferencesRecord,
  ): Promise<WorkspacePreferencesRecord>;
}

export function emptyOnboardingState(workspaceId: string): WorkspaceOnboardingState {
  const now = new Date().toISOString();
  return {
    workspaceId,
    currentStep: "business",
    business: {
      businessName: "",
      businessType: "creative_marketing_agency",
      description: "",
      website: "",
      country: "",
      currency: "",
      teamSize: "",
      operatingModel: "",
    },
    operations: {
      workModels: [],
      teamLocation: "",
      clientType: "",
      projectDuration: "",
      tools: [],
      operationalConcern: "",
    },
    services: [],
    policies: {
      proposalApproval: "founder",
      contractApproval: "founder",
      projectCreationApproval: "operations_lead",
      invoiceApproval: "finance",
      expenseApproval: "founder",
      clientVisibility: "deliverables_only",
      aiAutonomy: "recommend_draft",
    },
    version: 1,
    updatedAt: now,
  };
}

export class InMemoryWorkspacePhase1Repository implements WorkspacePhase1Repository {
  private readonly profiles = new Map<string, UserProfileRecord>();
  private readonly onboarding = new Map<string, WorkspaceOnboardingState>();
  private readonly twins = new Map<string, WorkspaceTwinRecord>();
  private readonly preferences = new Map<string, WorkspacePreferencesRecord>();

  getUserProfile(userId: string): Promise<UserProfileRecord | undefined> {
    return Promise.resolve(this.profiles.get(userId));
  }

  upsertUserProfile(input: UserProfileRecord): Promise<UserProfileRecord> {
    this.profiles.set(input.userId, input);
    return Promise.resolve(input);
  }

  getOnboarding(workspaceId: string): Promise<WorkspaceOnboardingState | undefined> {
    return Promise.resolve(this.onboarding.get(workspaceId));
  }

  upsertOnboarding(state: WorkspaceOnboardingState): Promise<WorkspaceOnboardingState> {
    this.onboarding.set(state.workspaceId, state);
    return Promise.resolve(state);
  }

  getTwin(workspaceId: string): Promise<WorkspaceTwinRecord | undefined> {
    return Promise.resolve(this.twins.get(workspaceId));
  }

  upsertTwin(record: WorkspaceTwinRecord): Promise<WorkspaceTwinRecord> {
    this.twins.set(record.workspaceId, record);
    return Promise.resolve(record);
  }

  getPreferences(
    workspaceId: string,
  ): Promise<WorkspacePreferencesRecord | undefined> {
    return Promise.resolve(this.preferences.get(workspaceId));
  }

  upsertPreferences(
    record: WorkspacePreferencesRecord,
  ): Promise<WorkspacePreferencesRecord> {
    this.preferences.set(record.workspaceId, record);
    return Promise.resolve(record);
  }
}
