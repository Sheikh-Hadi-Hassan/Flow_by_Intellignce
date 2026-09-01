import { getNextSnapshot, setup } from "xstate";

export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "reimbursed"
  | "invoiced";

export interface ExpenseGuardInput {
  readonly actorCanOwn: boolean;
  readonly actorCanApprove: boolean;
  readonly isLocked: boolean;
}

export const expenseLifecycleMachine = setup({
  types: {
    context: {} as ExpenseGuardInput,
    events: {} as
      | { type: "SUBMIT" }
      | { type: "APPROVE" }
      | { type: "REJECT" }
      | { type: "REVISE" }
      | { type: "INVOICE" }
      | { type: "REIMBURSE" },
  },
  guards: {
    canSubmit: ({ context }) => context.actorCanOwn && !context.isLocked,
    canApprove: ({ context }) => context.actorCanApprove && !context.isLocked,
    canRevise: ({ context }) => context.actorCanOwn && !context.isLocked,
    canInvoice: ({ context }) => context.actorCanApprove && !context.isLocked,
    canReimburse: ({ context }) => context.actorCanApprove && !context.isLocked,
  },
}).createMachine({
  id: "expenseLifecycle",
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
        REIMBURSE: { guard: "canReimburse", target: "reimbursed" },
      },
    },
    invoiced: { type: "final" },
    reimbursed: { type: "final" },
  },
});

export function nextExpenseStatus(
  from: ExpenseStatus,
  event:
    | "SUBMIT"
    | "APPROVE"
    | "REJECT"
    | "REVISE"
    | "INVOICE"
    | "REIMBURSE",
  context: ExpenseGuardInput,
): ExpenseStatus {
  const snapshot = expenseLifecycleMachine.resolveState({
    value: from,
    context,
  });
  const next = getNextSnapshot(expenseLifecycleMachine, snapshot, {
    type: event,
  });
  const value = next.value;
  return typeof value === "string" ? value : from;
}
