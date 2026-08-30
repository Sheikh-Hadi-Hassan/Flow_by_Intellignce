import type { PrototypeSession } from "./types";

export type SetupChecklistStatus =
  "Ready" | "Needs information" | "Not connected" | "Recommended";

export interface SetupChecklistItem {
  label: string;
  status: SetupChecklistStatus;
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
