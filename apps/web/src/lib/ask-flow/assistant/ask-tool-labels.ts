import type { AskToolName } from "./types";

const TOOL_LABELS: Record<AskToolName, string> = {
  get_workspace_summary: "workspace summary",
  get_today_sales_update: "today's sales update",
  list_projects: "project list",
  get_project_health: "project health",
  analyze_client_payment_behavior: "client payment behaviour",
  list_overdue_invoices: "overdue invoices",
  get_pipeline_summary: "pipeline summary",
  list_pending_approvals: "pending approvals",
  get_team_capacity: "team capacity",
  explain_open_exposure: "open exposure",
  list_clients: "client list",
  search_clients: "client search",
  search_business_records: "business record search",
  get_client_360: "client overview",
  list_clients_by_segment: "client segment list",
  summarize_client_relationship: "client relationship summary",
  list_inactive_clients: "inactive client list",
  find_duplicate_clients: "duplicate client candidates",
  explain_client_health: "client health",
  list_client_opportunities: "client opportunities",
  list_client_projects: "client projects",
  list_client_contracts: "client contracts",
  list_client_invoices: "client invoices",
  propose_client_update: "client record update",
  propose_duplicate_merge: "duplicate merge",
  get_business_profile: "business profile",
  get_business_registration: "business registration",
  list_business_locations: "business locations",
  get_business_firmographics: "business firmographics",
  list_authorised_signatories: "authorised signatories",
  list_expiring_business_documents: "expiring business documents",
  list_compliance_obligations: "compliance obligations",
  explain_business_structure: "business structure",
  propose_business_profile_update: "business profile update",
  propose_location_change: "location change",
  "commercial.generate_proposal": "proposal generation",
  "delivery.create_project_from_contract": "project creation",
  "delivery.complete_task": "task completion",
};

/** Human phrase for a tool, safe to show to founders. Never exposes the internal tool id. */
export function humanToolLabel(tool: AskToolName): string {
  return TOOL_LABELS[tool] ?? tool.replaceAll("_", " ");
}

/** Capitalized variant for clarification choice buttons. */
export function humanToolChoiceLabel(tool: AskToolName): string {
  const label = humanToolLabel(tool);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
