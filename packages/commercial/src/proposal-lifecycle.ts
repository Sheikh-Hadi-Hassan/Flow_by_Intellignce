import { getNextSnapshot, setup, type SnapshotFrom } from "xstate";

export type ProposalVersionStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "sent"
  | "client_review"
  | "accepted"
  | "declined"
  | "superseded"
  | "expired";

export interface ProposalGuardInput {
  readonly sectionsComplete: boolean;
  readonly pricingValid: boolean;
  readonly actorCanApprove: boolean;
  readonly actorCanShare: boolean;
  readonly hasValidShare: boolean;
}

export const PROPOSAL_SECTION_KEYS = [
  "executive_summary",
  "client_goals",
  "scope_deliverables",
  "timeline_milestones",
  "assumptions",
  "exclusions",
  "pricing_packages",
  "optional_addons",
  "payment_schedule",
  "terms",
  "approval_section",
] as const;

export type ProposalSectionKey = (typeof PROPOSAL_SECTION_KEYS)[number];

export function missingProposalSections(
  present: readonly string[],
): readonly ProposalSectionKey[] {
  const set = new Set(present);
  return PROPOSAL_SECTION_KEYS.filter((key) => !set.has(key));
}

export const proposalLifecycleMachine = setup({
  types: {
    context: {} as ProposalGuardInput,
    events: {} as
      | { type: "SUBMIT_FOR_REVIEW" }
      | { type: "REQUEST_CHANGES" }
      | { type: "APPROVE" }
      | { type: "CREATE_SHARE" }
      | { type: "CLIENT_OPEN" }
      | { type: "CLIENT_ACCEPT" }
      | { type: "CLIENT_DECLINE" }
      | { type: "CLIENT_REQUEST_CHANGES" },
  },
  guards: {
    canSubmit: ({ context }) =>
      context.sectionsComplete && context.pricingValid,
    canApprove: ({ context }) =>
      context.sectionsComplete &&
      context.pricingValid &&
      context.actorCanApprove,
    canShare: ({ context }) => context.actorCanShare,
    hasShare: ({ context }) => context.hasValidShare,
  },
}).createMachine({
  id: "proposalLifecycle",
  initial: "draft",
  context: {
    sectionsComplete: false,
    pricingValid: false,
    actorCanApprove: false,
    actorCanShare: false,
    hasValidShare: false,
  },
  states: {
    draft: {
      on: {
        SUBMIT_FOR_REVIEW: { guard: "canSubmit", target: "in_review" },
      },
    },
    in_review: {
      on: {
        REQUEST_CHANGES: "changes_requested",
        APPROVE: { guard: "canApprove", target: "approved" },
      },
    },
    changes_requested: {
      on: {
        SUBMIT_FOR_REVIEW: { guard: "canSubmit", target: "in_review" },
      },
    },
    approved: {
      on: {
        CREATE_SHARE: { guard: "canShare", target: "sent" },
      },
    },
    sent: {
      on: {
        CLIENT_OPEN: { guard: "hasShare", target: "client_review" },
      },
    },
    client_review: {
      on: {
        CLIENT_ACCEPT: "accepted",
        CLIENT_DECLINE: "declined",
        CLIENT_REQUEST_CHANGES: "changes_requested",
      },
    },
    accepted: { type: "final" },
    declined: { type: "final" },
    superseded: { type: "final" },
    expired: { type: "final" },
  },
});

export type ProposalSnapshot = SnapshotFrom<typeof proposalLifecycleMachine>;

export function nextProposalStatus(
  from: ProposalVersionStatus,
  event:
    | "SUBMIT_FOR_REVIEW"
    | "REQUEST_CHANGES"
    | "APPROVE"
    | "CREATE_SHARE"
    | "CLIENT_OPEN"
    | "CLIENT_ACCEPT"
    | "CLIENT_DECLINE"
    | "CLIENT_REQUEST_CHANGES",
  context: ProposalGuardInput,
): ProposalVersionStatus {
  const snapshot = proposalLifecycleMachine.resolveState({
    value: from,
    context,
  });
  const next = getNextSnapshot(proposalLifecycleMachine, snapshot, {
    type: event,
  });
  const value = next.value;
  return typeof value === "string" ? value : from;
}
