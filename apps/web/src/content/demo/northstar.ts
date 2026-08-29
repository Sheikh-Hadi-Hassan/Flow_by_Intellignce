/**
 * Demo fixture — Northstar Creative fictional agency.
 * Classification: demo-fixture (not live workspace data).
 */
import type { PrototypeSession } from "../../lib/prototype/types";
import { DEFAULT_ACCENT } from "../../lib/prototype/preferences";
import { NORTHSTAR_SLUG } from "../../lib/prototype/defaults";
import { compileTwin } from "../../lib/prototype/twin-compile";
import { suggestedServicesFixture } from "./suggested-services";

export const NORTHSTAR_WORKSPACE_NAME = "Northstar Creative";
export const DEMO_FOUNDER_FIRST_NAME = "Maya";
export const DEMO_BADGE_LABEL = "Demo workspace";

export const northstarDemoSession = (): PrototypeSession => {
  const session: PrototypeSession = {
    mode: "demo",
    workspaceSlug: NORTHSTAR_SLUG,
    workspaceName: NORTHSTAR_WORKSPACE_NAME,
    auth: { email: "maya@northstar-creative.demo", verified: true },
    business: {
      businessName: NORTHSTAR_WORKSPACE_NAME,
      businessType: "creative_marketing_agency",
      description:
        "B2B creative and performance marketing agency focused on technology and robotics brands.",
      website: "https://northstar-creative.demo",
      country: "US",
      currency: "USD",
      teamSize: "35",
      operatingModel:
        "Blended retainers and fixed-fee campaigns with contractor support",
    },
    operations: {
      workModels: ["retainer", "project_based", "milestone"],
      teamLocation: "hybrid",
      clientType: "b2b_enterprise",
      projectDuration: "8-14_weeks",
      tools: ["QuickBooks", "ClickUp", "Slack", "Google Workspace"],
      operationalConcern: "scope_creep",
    },
    services: suggestedServicesFixture().map((s) => ({ ...s, selected: true })),
    policies: {
      proposalApproval: "founder",
      contractApproval: "founder",
      projectCreationApproval: "operations_lead",
      invoiceApproval: "finance",
      expenseApproval: "founder",
      clientVisibility: "deliverables_and_timeline",
      aiAutonomy: "recommend_draft",
    },
    onboardingComplete: true,
    twinCompiled: true,
    deferredModuleIds: ["invoicing", "vendor-management"],
    accentColor: DEFAULT_ACCENT,
  };

  session.twin = compileTwin(session);
  return session;
};
