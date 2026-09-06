import {
  CRM_CORE_BLOCK_ID,
  CRM_CORE_DEFAULT_CONFIGURATION,
  NORTHSTAR_ORG_ID,
  REGISTRY_BUSINESS_BLOCK_ID,
  permissionsForRegistryRole,
} from "@flow/contracts";

import { missionViewer } from "../../mission-control/seed";
import { NORTHSTAR_SLUG } from "../../prototype/defaults";
import type { AskApplicationContext } from "../types";
import { ASK_TOOL_DEFINITIONS } from "./tools";
import type {
  AskAssistantRequest,
  AskHistoryTurn,
  AskToolDefinition,
  AskToolName,
} from "./types";

const CRM_TOOL_NAMES = new Set<AskToolName>([
  "list_clients",
  "get_client_360",
  "list_clients_by_segment",
  "summarize_client_relationship",
  "list_inactive_clients",
  "find_duplicate_clients",
  "explain_client_health",
  "list_client_opportunities",
  "list_client_projects",
  "list_client_contracts",
  "list_client_invoices",
  "propose_client_update",
  "propose_duplicate_merge",
]);

const REGISTRY_TOOL_NAMES = new Set<AskToolName>([
  "get_business_profile",
  "get_business_registration",
  "list_business_locations",
  "get_business_firmographics",
  "list_authorised_signatories",
  "list_expiring_business_documents",
  "list_compliance_obligations",
  "explain_business_structure",
  "propose_business_profile_update",
  "propose_location_change",
]);

type ResolutionErrorCode = "bad_request" | "cross_workspace";

export type ServerAskResolution =
  | { readonly ok: true; readonly request: AskAssistantRequest }
  | {
      readonly ok: false;
      readonly code: ResolutionErrorCode;
      readonly message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeHistory(value: unknown): readonly AskHistoryTurn[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-12).flatMap((turn): AskHistoryTurn[] => {
    if (!isRecord(turn)) return [];
    if (turn.role !== "user" && turn.role !== "assistant") return [];
    if (typeof turn.text !== "string") return [];
    return [{ role: turn.role, text: turn.text.slice(0, 4_000) }];
  });
}

function hasPermission(
  permissions: readonly string[],
  definition: AskToolDefinition,
): boolean {
  return (
    permissions.includes("workspace.mission_control") ||
    definition.permissions.some((scope) => permissions.includes(scope))
  );
}

export function resolvePermittedAskTools(
  context: AskApplicationContext,
): readonly AskToolDefinition[] {
  const blocks = context.activeBuildingBlocks ?? [];
  return ASK_TOOL_DEFINITIONS.filter((definition) => {
    if (!hasPermission(context.permissions, definition)) return false;
    if (CRM_TOOL_NAMES.has(definition.name)) {
      return blocks.includes(CRM_CORE_BLOCK_ID);
    }
    if (REGISTRY_TOOL_NAMES.has(definition.name)) {
      return blocks.includes(REGISTRY_BUSINESS_BLOCK_ID);
    }
    return true;
  });
}

function northstarServerContext(): AskApplicationContext {
  const permissions = [
    ...new Set([
      ...missionViewer.permissions,
      ...(CRM_CORE_DEFAULT_CONFIGURATION.roleVisibility.founder ?? []),
      ...permissionsForRegistryRole("founder"),
      "commercial.generate_proposal",
      "delivery.create_project_from_contract",
      "delivery.complete_task",
    ]),
  ];
  return {
    workspaceId: NORTHSTAR_SLUG,
    userId: missionViewer.person.id,
    role: missionViewer.person.role,
    permissions,
    route: `/${NORTHSTAR_SLUG}/admin`,
    visibleRecordIds: [],
    locale: "en-US",
    currency: "USD",
    timezone: "America/Chicago",
    conversationId: "northstar-demo-server",
    missionStateKind: "populated",
    activeBuildingBlocks: [CRM_CORE_BLOCK_ID, REGISTRY_BUSINESS_BLOCK_ID],
    organizationId: NORTHSTAR_ORG_ID,
    demoState: "populated",
    snapshotId: "northstar-demo:server:populated",
    visibleRecordPermissions: permissions,
  };
}

export function resolveServerAskRequest(body: unknown): ServerAskResolution {
  if (
    !isRecord(body) ||
    typeof body.message !== "string" ||
    !body.message.trim()
  ) {
    return {
      ok: false,
      code: "bad_request",
      message: "workspace and message required",
    };
  }
  if (!isRecord(body.context) || typeof body.context.workspaceId !== "string") {
    return {
      ok: false,
      code: "bad_request",
      message: "workspace and message required",
    };
  }
  if (body.context.workspaceId !== NORTHSTAR_SLUG) {
    return {
      ok: false,
      code: "cross_workspace",
      message:
        "That workspace is not available to this session. Ask Flow only reads the workspace you are signed into.",
    };
  }

  const context = northstarServerContext();
  return {
    ok: true,
    request: {
      context,
      message: body.message.trim(),
      history: sanitizeHistory(body.history),
      tools: resolvePermittedAskTools(context),
    },
  };
}
