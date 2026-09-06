import type { AskToolName } from "./assistant/types";
import type { AskPhase } from "./types";

export const ASK_BUSY_PHASES = [
  "submitted",
  "retrieving",
  "generating",
  "streaming",
] as const;

export const ASK_ERROR_PHASES = [
  "tool_failure",
  "model_unavailable",
  "permission_denied",
  "error",
  "offline",
] as const;

export interface AskToolProgress {
  readonly tool: AskToolName;
  readonly state: "running" | "done" | "failed";
}

export function isAskBusy(phase: AskPhase): boolean {
  return (ASK_BUSY_PHASES as readonly string[]).includes(phase);
}

export function isAskError(phase: AskPhase): boolean {
  return (ASK_ERROR_PHASES as readonly string[]).includes(phase);
}

export function shouldAcceptSubmit(phase: AskPhase, running: boolean): boolean {
  return !running && !isAskBusy(phase);
}

const PHASE_LABELS: Readonly<Partial<Record<AskPhase, string>>> = {
  submitted: "Understanding",
  retrieving: "Checking Flow",
  generating: "Analyzing",
  streaming: "Preparing answer",
};

export function askPhaseLabel(
  phase: AskPhase,
  toolProgress?: AskToolProgress | null,
): string {
  if (isAskBusy(phase) && toolProgress?.state === "running") {
    return "Retrieving records";
  }
  return PHASE_LABELS[phase] ?? "";
}
