import type { PrototypeSession, TwinSnapshot } from "./types";

export function compileTwin(session: PrototypeSession): TwinSnapshot {
  const selectedServices = session.services
    .filter((s) => s.selected)
    .map((s) => s.name);

  const missing: string[] = [];
  if (!session.business.teamSize) missing.push("Confirmed team size");
  if (!session.business.operatingModel) missing.push("Operating model detail");
  if (selectedServices.length === 0) missing.push("At least one service");
  if (session.operations.tools.length === 0)
    missing.push("Current tools inventory");

  const completeness = Math.round(((7 - missing.length) / 7) * 100);
  const classification = formatBusinessType(session.business.businessType);
  const businessName = session.business.businessName || "Your business";

  const confidence =
    selectedServices.length === 0
      ? "low"
      : completeness >= 85
        ? "high"
        : completeness >= 60
          ? "medium"
          : "low";

  const verification =
    session.mode === "demo"
      ? "Derived from approved demo setup"
      : session.onboardingComplete
        ? "Confirmed by founder during onboarding"
        : "Pending founder review";

  const provenanceLabel =
    session.mode === "demo"
      ? "Demo workspace fixture"
      : "Derived from approved setup";

  return {
    businessName,
    classification,
    identity: `${businessName} — ${classification}`,
    operatingModel:
      session.business.operatingModel ||
      formatWorkModels(session.operations.workModels),
    services: selectedServices,
    policies: [
      `Proposal approval: ${formatPolicy(session.policies.proposalApproval)}`,
      `Contract approval: ${formatPolicy(session.policies.contractApproval)}`,
      `AI autonomy: ${formatAiAutonomy(session.policies.aiAutonomy)}`,
      `Client visibility: ${formatClientVisibility(session.policies.clientVisibility)}`,
    ],
    expertisePack:
      session.business.businessType === "creative_marketing_agency"
        ? "Digital Agency Expertise"
        : "Universal Service Business",
    logicCoverage: deriveLogicCoverage(session),
    completeness,
    missingInformation: missing,
    lastUpdated: new Date().toISOString(),
    confidence,
    verification,
    provenanceLabel,
    freshnessLabel: "Updated during onboarding",
    sourceClassification:
      session.mode === "demo" ? "demo-fixture" : "system-derived",
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

function formatWorkModels(models: string[]): string {
  if (models.length === 0) return "To be confirmed";
  const labels: Record<string, string> = {
    project_based: "Project-based",
    retainer: "Retainer",
    milestone: "Milestone billing",
    hourly: "Hourly",
    hybrid: "Hybrid",
  };
  return models.map((m) => labels[m] ?? m).join(" · ");
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

function deriveLogicCoverage(session: PrototypeSession): string[] {
  const coverage = ["Guard policy boundaries"];
  if (
    session.services.some((s) => s.selected && s.pricingModel === "retainer")
  ) {
    coverage.push("Retainer revenue recognition");
  }
  if (
    session.services.some((s) => s.selected && s.pricingModel === "project")
  ) {
    coverage.push("Project margin estimation");
  }
  if (session.operations.workModels.includes("milestone")) {
    coverage.push("Milestone billing rules");
  }
  if (session.operations.workModels.includes("hourly")) {
    coverage.push("Utilization and billable capacity");
  }
  return coverage;
}

export function getCompilationStepDuration(
  reducedMotion: boolean,
  stepIndex: number,
): number {
  if (reducedMotion) return 0;
  return stepIndex === 0 ? 400 : 320;
}

export function getCompilationTotalDuration(reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return 7 * 320 + 400;
}
