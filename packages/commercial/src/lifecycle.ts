import { getNextSnapshot, setup, type SnapshotFrom } from "xstate";

import type { JourneyGuardInput, JourneyStatus } from "./types.js";

export function canSubmitForReview(input: JourneyGuardInput): boolean {
  return (
    input.requiredInformationComplete &&
    input.requiredEvidenceAvailable &&
    input.calculationsCompleted &&
    input.blockingRisksHandled &&
    input.briefExists &&
    input.versionMatches
  );
}

export function canApprove(input: JourneyGuardInput): boolean {
  return canSubmitForReview(input) && input.actorCanApprove;
}

export const opportunityJourneyMachine = setup({
  types: {
    context: {} as JourneyGuardInput,
    events: {} as
      | { type: "INFORMATION_CHANGED" }
      | { type: "READY_CHECKED" }
      | { type: "GENERATE_BRIEF" }
      | { type: "SUBMIT_FOR_REVIEW" }
      | { type: "REQUEST_CHANGES" }
      | { type: "APPROVE" },
  },
  guards: {
    hasMissingQuestions: ({ context }) =>
      context.unansweredRequiredQuestions > 0,
    requiredComplete: ({ context }) => context.requiredInformationComplete,
    canGenerate: ({ context }) =>
      context.requiredInformationComplete &&
      context.blockingRisksHandled &&
      context.calculationsCompleted &&
      context.requiredEvidenceAvailable,
    canSubmit: ({ context }) => canSubmitForReview(context),
    canApproveBrief: ({ context }) => canApprove(context),
  },
}).createMachine({
  id: "opportunityJourney",
  initial: "collecting_information",
  context: {
    requiredInformationComplete: false,
    requiredEvidenceAvailable: false,
    calculationsCompleted: false,
    blockingRisksHandled: true,
    actorCanApprove: false,
    versionMatches: true,
    unansweredRequiredQuestions: 0,
    briefExists: false,
  },
  states: {
    collecting_information: {
      on: {
        INFORMATION_CHANGED: [
          {
            guard: "hasMissingQuestions",
            target: "missing_information",
          },
          { target: "collecting_information" },
        ],
        READY_CHECKED: {
          guard: "requiredComplete",
          target: "ready_for_brief",
        },
      },
    },
    missing_information: {
      on: {
        INFORMATION_CHANGED: [
          {
            guard: "requiredComplete",
            target: "ready_for_brief",
          },
          {
            guard: "hasMissingQuestions",
            target: "missing_information",
          },
          { target: "collecting_information" },
        ],
      },
    },
    ready_for_brief: {
      on: {
        GENERATE_BRIEF: {
          guard: "canGenerate",
          target: "brief_draft",
        },
        INFORMATION_CHANGED: {
          guard: "hasMissingQuestions",
          target: "missing_information",
        },
      },
    },
    brief_draft: {
      on: {
        SUBMIT_FOR_REVIEW: {
          guard: "canSubmit",
          target: "founder_review",
        },
      },
    },
    founder_review: {
      on: {
        APPROVE: {
          guard: "canApproveBrief",
          target: "approved",
        },
        REQUEST_CHANGES: "changes_requested",
      },
    },
    changes_requested: {
      on: {
        GENERATE_BRIEF: "brief_draft",
        SUBMIT_FOR_REVIEW: {
          guard: "canSubmit",
          target: "founder_review",
        },
      },
    },
    approved: {
      type: "final",
    },
  },
});

export type JourneySnapshot = SnapshotFrom<typeof opportunityJourneyMachine>;

export function nextJourneyStatus(
  from: JourneyStatus,
  event:
    | "INFORMATION_CHANGED"
    | "READY_CHECKED"
    | "GENERATE_BRIEF"
    | "SUBMIT_FOR_REVIEW"
    | "REQUEST_CHANGES"
    | "APPROVE",
  context: JourneyGuardInput,
): JourneyStatus {
  const snapshot = opportunityJourneyMachine.resolveState({
    value: from,
    context,
  });
  const next = getNextSnapshot(opportunityJourneyMachine, snapshot, {
    type: event,
  });
  const value = next.value;
  return typeof value === "string" ? value : from;
}

export function assertTransition(
  from: JourneyStatus,
  event:
    | "INFORMATION_CHANGED"
    | "READY_CHECKED"
    | "GENERATE_BRIEF"
    | "SUBMIT_FOR_REVIEW"
    | "REQUEST_CHANGES"
    | "APPROVE",
  context: JourneyGuardInput,
  expected: JourneyStatus,
): JourneyStatus {
  const next = nextJourneyStatus(from, event, context);
  if (next !== expected) {
    throw new Error(
      `Expected ${from} + ${event} -> ${expected}, received ${next}.`,
    );
  }
  return next;
}
