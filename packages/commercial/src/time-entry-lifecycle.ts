import { getNextSnapshot, setup } from "xstate";

export type TimeEntryStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "invoiced";

export interface TimeEntryGuardInput {
  readonly actorCanOwn: boolean;
  readonly actorCanApprove: boolean;
  readonly isLocked: boolean;
}

export const timeEntryLifecycleMachine = setup({
  types: {
    context: {} as TimeEntryGuardInput,
    events: {} as
      | { type: "SUBMIT" }
      | { type: "APPROVE" }
      | { type: "REJECT" }
      | { type: "REVISE" }
      | { type: "INVOICE" },
  },
  guards: {
    canSubmit: ({ context }) => context.actorCanOwn && !context.isLocked,
    canApprove: ({ context }) => context.actorCanApprove && !context.isLocked,
    canRevise: ({ context }) => context.actorCanOwn && !context.isLocked,
    canInvoice: ({ context }) => context.actorCanApprove && !context.isLocked,
  },
}).createMachine({
  id: "timeEntryLifecycle",
  initial: "draft",
  context: {
    actorCanOwn: false,
    actorCanApprove: false,
    isLocked: false,
  },
  states: {
    draft: {
      on: {
        SUBMIT: { guard: "canSubmit", target: "submitted" },
      },
    },
    submitted: {
      on: {
        APPROVE: { guard: "canApprove", target: "approved" },
        REJECT: { guard: "canApprove", target: "rejected" },
      },
    },
    rejected: {
      on: {
        REVISE: { guard: "canRevise", target: "draft" },
      },
    },
    approved: {
      on: {
        INVOICE: { guard: "canInvoice", target: "invoiced" },
      },
    },
    invoiced: { type: "final" },
  },
});

export function nextTimeEntryStatus(
  from: TimeEntryStatus,
  event: "SUBMIT" | "APPROVE" | "REJECT" | "REVISE" | "INVOICE",
  context: TimeEntryGuardInput,
): TimeEntryStatus {
  const snapshot = timeEntryLifecycleMachine.resolveState({
    value: from,
    context,
  });
  const next = getNextSnapshot(timeEntryLifecycleMachine, snapshot, {
    type: event,
  });
  const value = next.value;
  return typeof value === "string" ? value : from;
}
