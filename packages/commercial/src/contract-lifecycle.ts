import { getNextSnapshot, setup, type SnapshotFrom } from "xstate";

export type ContractVersionStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "pending_client_acceptance"
  | "executed"
  | "terminated"
  | "superseded";

export interface ContractGuardInput {
  readonly clausesComplete: boolean;
  readonly partiesComplete: boolean;
  readonly paymentScheduleValid: boolean;
  readonly actorCanApprove: boolean;
  readonly acceptanceEvidencePresent: boolean;
}

export const contractLifecycleMachine = setup({
  types: {
    context: {} as ContractGuardInput,
    events: {} as
      | { type: "SUBMIT_FOR_REVIEW" }
      | { type: "REQUEST_CHANGES" }
      | { type: "APPROVE" }
      | { type: "CLIENT_ACCEPT" },
  },
  guards: {
    canSubmit: ({ context }) =>
      context.clausesComplete &&
      context.partiesComplete &&
      context.paymentScheduleValid,
    canApprove: ({ context }) =>
      context.clausesComplete &&
      context.partiesComplete &&
      context.paymentScheduleValid &&
      context.actorCanApprove,
    canExecute: ({ context }) => context.acceptanceEvidencePresent,
  },
}).createMachine({
  id: "contractLifecycle",
  initial: "draft",
  context: {
    clausesComplete: false,
    partiesComplete: false,
    paymentScheduleValid: false,
    actorCanApprove: false,
    acceptanceEvidencePresent: false,
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
        APPROVE: { guard: "canApprove", target: "pending_client_acceptance" },
      },
    },
    changes_requested: {
      on: {
        SUBMIT_FOR_REVIEW: { guard: "canSubmit", target: "in_review" },
      },
    },
    pending_client_acceptance: {
      on: {
        CLIENT_ACCEPT: { guard: "canExecute", target: "executed" },
      },
    },
    executed: { type: "final" },
    terminated: { type: "final" },
    superseded: { type: "final" },
  },
});

export type ContractSnapshot = SnapshotFrom<typeof contractLifecycleMachine>;

export function nextContractStatus(
  from: ContractVersionStatus,
  event:
    | "SUBMIT_FOR_REVIEW"
    | "REQUEST_CHANGES"
    | "APPROVE"
    | "CLIENT_ACCEPT",
  context: ContractGuardInput,
): ContractVersionStatus {
  const snapshot = contractLifecycleMachine.resolveState({
    value: from,
    context,
  });
  const next = getNextSnapshot(contractLifecycleMachine, snapshot, {
    type: event,
  });
  const value = next.value;
  return typeof value === "string" ? value : from;
}
