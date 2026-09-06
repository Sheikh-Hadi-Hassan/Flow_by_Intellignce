import type {
  AskApplicationContext,
  AskClarification,
  AskFollowUpAction,
  AskRelatedRecord,
  AskAnswerVersion,
} from "../types";
import type { EvidenceRef } from "../../mission-control/types";
import type { ResponseWidget } from "./response-shape";
import type { BusinessQueryPlan } from "../business-query/types";

export const ASK_TOOL_NAMES = [
  "get_workspace_summary",
  "get_today_sales_update",
  "list_projects",
  "get_project_health",
  "analyze_client_payment_behavior",
  "list_overdue_invoices",
  "get_pipeline_summary",
  "list_pending_approvals",
  "get_team_capacity",
  "explain_open_exposure",
  "list_clients",
  "search_clients",
  "search_business_records",
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
  "commercial.generate_proposal",
  "delivery.create_project_from_contract",
  "delivery.complete_task",
] as const;

export type AskToolName = (typeof ASK_TOOL_NAMES)[number];

export interface AskHistoryTurn {
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly tool?: AskToolName;
}

export interface AskToolDefinition {
  readonly name: AskToolName;
  readonly description: string;
  readonly permissions: readonly string[];
}

export interface AskToolCall {
  readonly name: AskToolName;
  readonly args: Readonly<Record<string, string>>;
}

export interface AskToolResult {
  readonly ok: boolean;
  readonly name: AskToolName;
  readonly workspaceId: string;
  readonly recordIds: readonly string[];
  readonly asOf: string;
  readonly values: Readonly<Record<string, unknown>>;
  readonly evidence: readonly EvidenceRef[];
  readonly related: readonly AskRelatedRecord[];
  readonly actions: readonly AskFollowUpAction[];
  readonly error?: {
    readonly code:
      "permission_denied" | "cross_workspace" | "unavailable" | "empty";
    readonly message: string;
  };
}

export interface AskAssistantRequest {
  readonly context: AskApplicationContext;
  readonly message: string;
  readonly history: readonly AskHistoryTurn[];
  readonly tools: readonly AskToolDefinition[];
}

export type AskStreamPart =
  | { readonly type: "status"; readonly phase: string }
  | {
      readonly type: "tool_status";
      readonly tool: AskToolName;
      readonly state: "running" | "done" | "failed";
    }
  | { readonly type: "text"; readonly delta: string }
  | { readonly type: "clarification"; readonly clarification: AskClarification }
  | { readonly type: "evidence"; readonly evidence: readonly EvidenceRef[] }
  | { readonly type: "sources"; readonly related: readonly AskRelatedRecord[] }
  | { readonly type: "widgets"; readonly widgets: readonly ResponseWidget[] }
  | { readonly type: "actions"; readonly actions: readonly AskFollowUpAction[] }
  | { readonly type: "proposed_action"; readonly label: string }
  | {
      readonly type: "error";
      readonly code:
        | "model_unavailable"
        | "permission_denied"
        | "capability_unavailable"
        | "tool_unavailable"
        | "cross_workspace"
        | "out_of_domain";
      readonly message: string;
    }
  | {
      readonly type: "metadata";
      readonly provider: "openrouter" | "ollama" | "local";
      readonly model: string | null;
      readonly requestId: string | null;
      readonly latencyMs: number;
      readonly fallbackUsed: boolean;
      readonly inputTokens?: number | null;
      readonly outputTokens?: number | null;
      readonly plannerProvider?: "deterministic" | "ollama" | "none";
      readonly plannerModel?: string | null;
      readonly plannerOutcome?:
        | "query"
        | "command"
        | "clarify"
        | "unsupported"
        | "denied"
        | "failure"
        | "not_run";
      readonly plannerPlan?: BusinessQueryPlan | null;
      readonly plannerValidationResult?: "passed" | "failed" | "not_run";
      readonly plannerFailureReason?: string | null;
      readonly repairAttempted?: boolean;
      readonly executionCount?: number;
      readonly evidenceEmissionCount?: number;
      readonly commandPlan?: {
        readonly action: string;
        readonly tool: AskToolName;
        readonly args: Readonly<Record<string, number | string>>;
      };
      readonly fallbackReason?:
        | "disabled"
        | "missing_key"
        | "unauthorized"
        | "insufficient_credit"
        | "rate_limited"
        | "timeout"
        | "provider_error"
        | "invalid_response"
        | "deterministic_command";
    }
  | { readonly type: "done"; readonly tool?: AskToolName };

export interface BusinessLanguageModelAdapter {
  readonly id: string;
  readonly runtime: string;
  stream(request: AskAssistantRequest): AsyncIterable<AskStreamPart>;
}

export interface CollectedAskAnswer {
  readonly version: AskAnswerVersion;
  readonly tool?: AskToolName;
  readonly errorCode?:
    | "model_unavailable"
    | "permission_denied"
    | "capability_unavailable"
    | "tool_unavailable"
    | "cross_workspace"
    | "out_of_domain";
}
