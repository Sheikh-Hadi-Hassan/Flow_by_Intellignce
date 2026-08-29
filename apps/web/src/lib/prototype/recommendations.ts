import type { ModuleRecommendation, PrototypeSession } from "./types";

const MODULE_CATALOG: Omit<
  ModuleRecommendation,
  "why" | "trigger" | "setupStatus"
>[] = [
  {
    id: "crm",
    name: "CRM and client management",
    essential: true,
    benefit: "Track clients, opportunities, and discovery in one place.",
    proofType: "inference",
  },
  {
    id: "proposals",
    name: "Proposals and contracts",
    essential: true,
    benefit: "Turn briefs into interactive proposals and governed contracts.",
    proofType: "recommendation",
  },
  {
    id: "delivery",
    name: "Project delivery",
    essential: true,
    benefit: "Run campaigns and retainers with phases, tasks, and reviews.",
    proofType: "inference",
  },
  {
    id: "resource-planning",
    name: "Resource planning",
    essential: false,
    benefit: "Match capacity to scope before commitments slip.",
    proofType: "inference",
  },
  {
    id: "time-capacity",
    name: "Time and capacity",
    essential: false,
    benefit: "Understand utilization across blended teams and contractors.",
    proofType: "inference",
  },
  {
    id: "invoicing",
    name: "Invoicing",
    essential: false,
    benefit:
      "Invoice milestones, retainers, and deposits with governed totals.",
    proofType: "recommendation",
  },
  {
    id: "vendor-management",
    name: "Vendor management",
    essential: false,
    benefit:
      "Coordinate contractors with briefs, deadlines, and payment status.",
    proofType: "recommendation",
  },
  {
    id: "reporting",
    name: "Business reporting",
    essential: false,
    benefit: "Founder, project, and client reports with Proof drill-down.",
    proofType: "recommendation",
  },
];

export type SetupChecklistStatus =
  "Ready" | "Needs information" | "Not connected" | "Recommended";

export interface SetupChecklistItem {
  label: string;
  status: SetupChecklistStatus;
}

export function buildModuleRecommendations(
  session: PrototypeSession,
): ModuleRecommendation[] {
  const selected = session.services.filter((s) => s.selected);
  const triggers: string[] = [];

  if (selected.length > 0) {
    triggers.push(`${selected.length} service(s) defined`);
  }
  if (session.business.businessType === "creative_marketing_agency") {
    triggers.push("Creative agency operating model");
  }
  if (session.operations.workModels.includes("retainer")) {
    triggers.push("Retainer revenue model");
  }
  if (session.operations.workModels.includes("project_based")) {
    triggers.push("Project-based delivery");
  }
  if (session.operations.operationalConcern === "scope_creep") {
    triggers.push("Scope management priority");
  }

  const triggerText = triggers.join("; ") || "Service business foundation";

  return MODULE_CATALOG.map((mod) => ({
    ...mod,
    setupStatus: mod.essential ? "essential" : "recommended",
    why: mod.essential
      ? "Core capability for your selected operating model."
      : "Supports maturity as delivery and finance scale.",
    trigger: triggerText,
  }));
}

export function getSetupProgress(session: PrototypeSession): number {
  let completed = 0;
  const total = 6;

  if (session.business.businessName) completed++;
  if (session.operations.workModels.length > 0) completed++;
  if (session.services.some((s) => s.selected)) completed++;
  if (session.policies.proposalApproval) completed++;
  if (session.twinCompiled) completed++;
  if (session.onboardingComplete) completed++;

  return Math.round((completed / total) * 100);
}

export function getSetupChecklist(
  session: PrototypeSession,
): SetupChecklistItem[] {
  return [
    {
      label: "Business profile and operating model",
      status: session.business.businessName ? "Ready" : "Needs information",
    },
    {
      label: "Service catalog",
      status: session.services.some((s) => s.selected)
        ? "Ready"
        : "Needs information",
    },
    {
      label: "Guard policy preferences",
      status: session.policies.proposalApproval ? "Ready" : "Needs information",
    },
    {
      label: "Business Twin",
      status: session.twinCompiled ? "Ready" : "Recommended",
    },
    {
      label: "Service questionnaires",
      status: "Not connected",
    },
    {
      label: "Team members",
      status: "Not connected",
    },
    {
      label: "Accounting connection",
      status: "Not connected",
    },
  ];
}

export function moduleStatusLabel(
  status: ModuleRecommendation["setupStatus"],
): string {
  const labels: Record<ModuleRecommendation["setupStatus"], string> = {
    essential: "Essential",
    recommended: "Recommended",
    optional: "Optional",
    needs_information: "Needs information",
    not_configured: "Not configured",
  };
  return labels[status];
}
