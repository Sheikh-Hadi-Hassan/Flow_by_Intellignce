import type { PrototypeSession, TwinSnapshot } from "../prototype/types";
import { DEFAULT_ACCENT } from "../prototype/preferences";

export interface WorkspaceApiBundle {
  readonly workspace: {
    readonly id: string;
    readonly slug: string;
    readonly name: string;
  };
  readonly profile?: {
    readonly userId: string;
    readonly firstName: string;
  };
  readonly onboarding?: {
    readonly currentStep: string;
    readonly business: PrototypeSession["business"];
    readonly operations: PrototypeSession["operations"];
    readonly services: PrototypeSession["services"];
    readonly policies: PrototypeSession["policies"];
    readonly completedAt?: string;
  };
  readonly preferences?: {
    readonly accentColor?: string;
    readonly locale?: string;
    readonly currency?: string;
    readonly countryCode?: string;
  };
  readonly twin?: {
    readonly snapshot: TwinSnapshot;
  };
}

export interface ApiBackedSession extends PrototypeSession {
  readonly workspaceId: string;
  readonly founderFirstName?: string;
}

function mapTwin(snapshot: TwinSnapshot): TwinSnapshot {
  return {
    businessName: snapshot.businessName,
    classification: snapshot.classification,
    identity: snapshot.identity,
    operatingModel: snapshot.operatingModel,
    services: [...snapshot.services],
    policies: [...snapshot.policies],
    expertisePack: snapshot.expertisePack,
    logicCoverage: [...snapshot.logicCoverage],
    completeness: snapshot.completeness,
    missingInformation: [...snapshot.missingInformation],
    lastUpdated: snapshot.lastUpdated,
    confidence: snapshot.confidence,
    verification: snapshot.verification,
    provenanceLabel: snapshot.provenanceLabel,
    freshnessLabel: snapshot.freshnessLabel,
    sourceClassification: snapshot.sourceClassification,
  };
}

export function mapWorkspaceBundleToSession(
  bundle: WorkspaceApiBundle,
): ApiBackedSession {
  const onboarding = bundle.onboarding;
  const twinCompiled = Boolean(onboarding?.completedAt && bundle.twin);
  const mappedTwin = bundle.twin ? mapTwin(bundle.twin.snapshot) : undefined;

  return {
    mode: "user",
    workspaceId: bundle.workspace.id,
    workspaceSlug: bundle.workspace.slug,
    workspaceName: bundle.workspace.name,
    ...(bundle.profile?.firstName
      ? { founderFirstName: bundle.profile.firstName }
      : {}),
    business: onboarding?.business ?? {
      businessName: bundle.workspace.name,
      businessType: "creative_marketing_agency",
      description: "",
      website: "",
      country: "",
      currency: "",
      teamSize: "",
      operatingModel: "",
    },
    operations: onboarding?.operations ?? {
      workModels: [],
      teamLocation: "",
      clientType: "",
      projectDuration: "",
      tools: [],
      operationalConcern: "",
    },
    services: onboarding?.services ? [...onboarding.services] : [],
    policies: onboarding?.policies ?? {
      proposalApproval: "founder",
      contractApproval: "founder",
      projectCreationApproval: "operations_lead",
      invoiceApproval: "finance",
      expenseApproval: "founder",
      clientVisibility: "deliverables_only",
      aiAutonomy: "recommend_draft",
    },
    onboardingComplete: Boolean(onboarding?.completedAt),
    twinCompiled,
    ...(mappedTwin ? { twin: mappedTwin } : {}),
    deferredModuleIds: [],
    accentColor: bundle.preferences?.accentColor ?? DEFAULT_ACCENT,
  };
}
