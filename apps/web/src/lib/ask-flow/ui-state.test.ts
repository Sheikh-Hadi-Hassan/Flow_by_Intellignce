import { describe, expect, it } from "vitest";

import { ASK_TOOL_NAMES } from "./assistant/types";
import { ASK_PHASES, type AskPhase } from "./types";
import {
  ASK_BUSY_PHASES,
  ASK_ERROR_PHASES,
  askPhaseLabel,
  isAskBusy,
  isAskError,
  shouldAcceptSubmit,
} from "./ui-state";

const ALLOWED_LABELS = new Set([
  "",
  "Understanding",
  "Checking Flow",
  "Retrieving records",
  "Analyzing",
  "Preparing answer",
]);

describe("ask ui-state", () => {
  it("classifies busy phases", () => {
    for (const phase of ASK_BUSY_PHASES) {
      expect(isAskBusy(phase)).toBe(true);
    }
    expect(isAskBusy("idle")).toBe(false);
    expect(isAskBusy("answered")).toBe(false);
    expect(isAskBusy("error")).toBe(false);
  });

  it("classifies error phases", () => {
    for (const phase of ASK_ERROR_PHASES) {
      expect(isAskError(phase)).toBe(true);
    }
    expect(isAskError("streaming")).toBe(false);
  });

  it("maps busy phases to human-readable labels", () => {
    expect(askPhaseLabel("submitted")).toBe("Understanding");
    expect(askPhaseLabel("retrieving")).toBe("Checking Flow");
    expect(askPhaseLabel("generating")).toBe("Analyzing");
    expect(askPhaseLabel("streaming")).toBe("Preparing answer");
  });

  it("returns an empty label for terminal and idle phases", () => {
    expect(askPhaseLabel("idle")).toBe("");
    expect(askPhaseLabel("focused")).toBe("");
    expect(askPhaseLabel("answered")).toBe("");
    expect(askPhaseLabel("asking_clarification")).toBe("");
    expect(askPhaseLabel("error")).toBe("");
  });

  it("overrides busy-phase labels with a running tool", () => {
    const progress = {
      tool: ASK_TOOL_NAMES[0],
      state: "running",
    } as const;
    expect(askPhaseLabel("submitted", progress)).toBe("Retrieving records");
    expect(askPhaseLabel("retrieving", progress)).toBe("Retrieving records");
    expect(askPhaseLabel("generating", progress)).toBe("Retrieving records");
    expect(askPhaseLabel("streaming", progress)).toBe("Retrieving records");
  });

  it("ignores tool progress outside busy phases", () => {
    const progress = {
      tool: ASK_TOOL_NAMES[0],
      state: "running",
    } as const;
    expect(askPhaseLabel("answered", progress)).toBe("");
    expect(askPhaseLabel("error", progress)).toBe("");
  });

  it("never leaks tool names, providers, or debug metadata in labels", () => {
    const forbidden = [
      ...ASK_TOOL_NAMES,
      "openrouter",
      "grok",
      "provider",
      "model",
      "intent",
      "metadata",
      "requestId",
    ];
    for (const phase of ASK_PHASES) {
      for (const state of ["running", "done", "failed"] as const) {
        const label = askPhaseLabel(phase, {
          tool: ASK_TOOL_NAMES[0],
          state,
        });
        expect(ALLOWED_LABELS.has(label)).toBe(true);
        for (const term of forbidden) {
          expect(label.toLowerCase()).not.toContain(
            term.toLowerCase().replaceAll("_", " "),
          );
          expect(label.toLowerCase()).not.toContain(term.toLowerCase());
        }
      }
    }
  });

  it("gates submit acceptance on busy phase and running flag", () => {
    const idle = "idle" as AskPhase;
    expect(shouldAcceptSubmit(idle, false)).toBe(true);
    expect(shouldAcceptSubmit(idle, true)).toBe(false);
    expect(shouldAcceptSubmit("submitted", false)).toBe(false);
    expect(shouldAcceptSubmit("streaming", false)).toBe(false);
    expect(shouldAcceptSubmit("answered", false)).toBe(true);
  });
});
