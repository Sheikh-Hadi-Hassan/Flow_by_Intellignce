import type { AskToolName } from "./types";
import type { AnswerLanguage } from "./phrases";

export const INTENT_OUTCOMES = [
  "confident_match",
  "clarification_required",
  "multiple_intents",
  "unsupported",
  "out_of_domain",
] as const;

export type IntentOutcome = (typeof INTENT_OUTCOMES)[number];

export const CONFIDENCE_BANDS = ["high", "medium", "low", "none"] as const;
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];

export const REASON_CODES = [
  "empty",
  "greeting",
  "conversational",
  "incomplete_command",
  "action_verb",
  "business_object",
  "exact_phrase",
  "typo_canon",
  "unique_kw",
  "common_kw",
  "follow_up",
  "write_risk",
  "margin",
  "multi_intent",
  "perm_denied",
  "no_candidate",
  "no_business_object",
  "no_action_verb",
  "adversarial",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface AuthorizedEntity {
  readonly id: string;
  readonly label: string;
  readonly type: string;
}

export interface IntentCandidate {
  readonly tool: AskToolName;
  readonly score: number;
  readonly confidence: number;
  readonly band: ConfidenceBand;
  readonly signals: readonly string[];
  readonly permitted: boolean;
  readonly writeRisk: boolean;
}

export interface IntentClarification {
  readonly question: string;
  readonly choices: readonly {
    readonly id: string;
    readonly label: string;
    readonly tool: AskToolName | null;
  }[];
}

export interface IntentClassifierContext {
  readonly permittedTools?: readonly AskToolName[];
  readonly activeBuildingBlocks?: readonly string[];
  readonly uiSurface?: string;
  readonly lastConfirmedTool?: AskToolName | null;
  readonly lastConfirmed?: boolean;
  readonly authorizedEntities?: readonly AuthorizedEntity[];
  readonly answerLanguage?: AnswerLanguage;
}

export interface IntentResult {
  readonly outcome: IntentOutcome;
  readonly selectedTool: AskToolName | null;
  readonly confidence: number;
  readonly band: ConfidenceBand;
  readonly candidates: readonly IntentCandidate[];
  readonly winnerMargin: number;
  readonly reasonCodes: readonly ReasonCode[];
  readonly clarification: IntentClarification | null;
  readonly followUpFrom: AskToolName | null;
}
