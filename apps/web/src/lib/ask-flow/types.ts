import type { EvidenceRef, MissionStateKind } from "../mission-control/types";
import type { BusinessRegistrySeed } from "@flow/contracts";
import type { ResponseWidget } from "./assistant/response-shape";

export const ASK_PHASES = [
  "idle",
  "focused",
  "typing",
  "suggesting",
  "submitted",
  "streaming",
  "answered",
  "asking_clarification",
  "action_proposed",
  "awaiting_approval",
  "retrieving",
  "generating",
  "complete",
  "tool_failure",
  "model_unavailable",
  "permission_denied",
  "error",
  "offline",
] as const;

export type AskPhase = (typeof ASK_PHASES)[number];

/** Identifiers and permission context only — no private record payloads. */
export interface AskApplicationContext {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: string;
  readonly permissions: readonly string[];
  readonly route: string;
  readonly selectedClientId?: string;
  readonly selectedProjectId?: string;
  readonly selectedContractId?: string;
  readonly selectedEmployeeId?: string;
  readonly visibleRecordIds: readonly string[];
  readonly locale: string;
  readonly currency: string;
  readonly timezone: string;
  readonly conversationId: string;
  readonly missionStateKind?: MissionStateKind;
  readonly exposureMinor?: string;
  readonly decisionCount?: number;
  readonly activeBuildingBlocks?: readonly string[];
  /** Live Business Registry snapshot from the client store / API hydrate. */
  readonly businessRegistry?: BusinessRegistrySeed;
  readonly organizationId?: string;
  /** Active demo / UI state for the current route (e.g. registry partial). */
  readonly demoState?: string;
  readonly snapshotId?: string;
  readonly visibleRecordPermissions?: readonly string[];
}

export interface AskSuggestion {
  readonly id: string;
  readonly prompt: string;
  readonly reason: string;
}

export interface AskRelatedRecord {
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export interface AskFollowUpAction {
  readonly id: string;
  readonly label: string;
  readonly href?: string;
}

export interface AskClarification {
  readonly question: string;
  readonly choices: readonly { id: string; label: string }[];
}

export interface AskAnswerVersion {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly evidence: readonly EvidenceRef[];
  readonly related: readonly AskRelatedRecord[];
  readonly actions: readonly AskFollowUpAction[];
  readonly clarification?: AskClarification;
  readonly createdAt: number;
  /** Snapshot that produced this answer — used to mark stale turns. */
  readonly snapshotId?: string;
  readonly stale?: boolean;
  /** Structured response widgets derived from the deterministic tool result. */
  readonly widgets?: readonly ResponseWidget[];
}

export interface AskTurn {
  readonly id: string;
  readonly versions: readonly AskAnswerVersion[];
  readonly feedback?: "up" | "down";
  readonly tool?: string;
}

export interface AskConversation {
  readonly id: string;
  readonly turns: readonly AskTurn[];
}
