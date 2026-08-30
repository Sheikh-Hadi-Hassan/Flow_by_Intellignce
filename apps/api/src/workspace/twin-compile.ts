import type {
  OnboardingBusinessData,
  OnboardingOperationsData,
  OnboardingPoliciesData,
  OnboardingServiceData,
  WorkspaceOnboardingState,
  TwinSnapshotData,
} from "@flow/database";

export function compileTwinFromOnboarding(
  state: WorkspaceOnboardingState,
): TwinSnapshotData {
  const selectedServices = state.services
    .filter((service) => service.selected)
    .map((service) => service.name);

  const missing: string[] = [];
  if (!state.business.teamSize) missing.push("Confirmed team size");
  if (!state.business.operatingModel) missing.push("Operating model detail");
  if (selectedServices.length === 0) missing.push("At least one service");
  if (state.operations.tools.length === 0)
    missing.push("Current tools inventory");
  if (!state.business.country) missing.push("Country");
  if (!state.business.currency) missing.push("Currency");

  const completeness = Math.round(((7 - missing.length) / 7) * 100);
  const classification = formatBusinessType(state.business.businessType);
  const businessName = state.business.businessName || "Your business";

  const confidence =
    selectedServices.length === 0
      ? "low"
      : completeness >= 85
        ? "high"
        : completeness >= 60
          ? "medium"
          : "low";

  return {
    businessName,
    classification,
    identity: `${businessName} — ${classification}`,
    operatingModel:
      state.business.operatingModel ||
      formatWorkModels(state.operations.workModels),
    services: selectedServices,
    policies: [
      `Proposal approval: ${formatPolicy(state.policies.proposalApproval)}`,
      `Contract approval: ${formatPolicy(state.policies.contractApproval)}`,
      `AI autonomy: ${formatAiAutonomy(state.policies.aiAutonomy)}`,
      `Client visibility: ${formatClientVisibility(state.policies.clientVisibility)}`,
    ],
    expertisePack:
      state.business.businessType === "creative_marketing_agency"
        ? "Digital Agency Expertise"
        : "Universal Service Business",
    logicCoverage: deriveLogicCoverage(state),
    completeness,
    missingInformation: missing,
    lastUpdated: new Date().toISOString(),
    confidence,
    verification: state.completedAt
      ? "Confirmed by founder during onboarding"
      : "Pending founder review",
    provenanceLabel: "Derived from approved setup",
    freshnessLabel: "Updated during onboarding",
    sourceClassification: "user-entered",
  };
}

function formatBusinessType(type: string): string {
  const map: Record<string, string> = {
    creative_marketing_agency: "Creative & marketing agency",
    consulting: "Consulting firm",
    legal: "Law firm",
    healthcare: "Healthcare practice",
    other_service: "Service business",
  };
  return map[type] ?? "Service business";
}

function formatWorkModels(models: readonly string[]): string {
  if (models.length === 0) return "To be confirmed";
  const labels: Record<string, string> = {
    project_based: "Project-based",
    retainer: "Retainer",
    milestone: "Milestone billing",
    hourly: "Hourly",
    hybrid: "Hybrid",
  };
  return models.map((model) => labels[model] ?? model).join(" · ");
}

function formatPolicy(value: string): string {
  const labels: Record<string, string> = {
    founder: "Founder approval",
    operations_lead: "Operations lead",
    finance: "Finance admin",
    delegated: "Delegated approver",
  };
  return labels[value] ?? value;
}

function formatAiAutonomy(value: string): string {
  const labels: Record<string, string> = {
    recommend_only: "Recommend only",
    recommend_draft: "Recommend and draft",
    limited_actions: "Limited guarded actions",
  };
  return labels[value] ?? value;
}

function formatClientVisibility(value: string): string {
  const labels: Record<string, string> = {
    deliverables_only: "Deliverables only",
    deliverables_and_timeline: "Deliverables and timeline",
    limited_financial: "Limited financial summary",
  };
  return labels[value] ?? value;
}

function deriveLogicCoverage(state: WorkspaceOnboardingState): string[] {
  const coverage = ["Guard policy boundaries"];
  if (
    state.services.some(
      (service) => service.selected && service.pricingModel === "retainer",
    )
  ) {
    coverage.push("Retainer revenue recognition");
  }
  if (
    state.services.some(
      (service) => service.selected && service.pricingModel === "project",
    )
  ) {
    coverage.push("Project margin estimation");
  }
  if (state.operations.workModels.includes("milestone")) {
    coverage.push("Milestone billing rules");
  }
  if (state.operations.workModels.includes("hourly")) {
    coverage.push("Utilization and billable capacity");
  }
  return coverage;
}

export function slugifyWorkspaceName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "workspace"
  );
}

export function validateOnboardingPatch(
  state: WorkspaceOnboardingState,
): string[] {
  const errors: string[] = [];
  if (state.business.currency && !/^[A-Z]{3}$/.test(state.business.currency)) {
    errors.push("Currency must be a three-letter ISO code.");
  }
  if (
    state.services.some(
      (service) => service.selected && !(service.name?.trim()),
    )
  ) {
    errors.push("Selected services must have a name.");
  }
  return errors;
}
