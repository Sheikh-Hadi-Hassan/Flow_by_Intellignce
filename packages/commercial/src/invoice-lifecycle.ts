import { getNextSnapshot, setup } from "xstate";

export type InvoiceStatus =
  | "draft"
  | "founder_review"
  | "changes_requested"
  | "approved"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";

export interface InvoiceGuardInput {
  readonly hasLineItems: boolean;
  readonly guardAllowsIssue: boolean;
  readonly actorCanManage: boolean;
  readonly actorCanApprove: boolean;
  readonly isIssued: boolean;
}

export const invoiceLifecycleMachine = setup({
  types: {
    context: {} as InvoiceGuardInput,
    events: {} as
      | { type: "SUBMIT_REVIEW" }
      | { type: "REQUEST_CHANGES" }
      | { type: "APPROVE" }
      | { type: "ISSUE" }
      | { type: "RECORD_PAYMENT" }
      | { type: "MARK_OVERDUE" }
      | { type: "VOID" }
      | { type: "REVISE" },
  },
  guards: {
    canSubmit: ({ context }) =>
      context.hasLineItems && context.actorCanManage && !context.isIssued,
    canApprove: ({ context }) =>
      context.actorCanApprove && context.guardAllowsIssue,
    canIssue: ({ context }) =>
      context.actorCanApprove && context.guardAllowsIssue,
    canVoid: ({ context }) => context.actorCanApprove,
    canRevise: ({ context }) => context.actorCanManage,
  },
}).createMachine({
  id: "invoiceLifecycle",
  initial: "draft",
  context: {
    hasLineItems: false,
    guardAllowsIssue: false,
    actorCanManage: false,
    actorCanApprove: false,
    isIssued: false,
  },
  states: {
    draft: {
      on: {
        SUBMIT_REVIEW: { guard: "canSubmit", target: "founder_review" },
        VOID: { guard: "canVoid", target: "void" },
      },
    },
    founder_review: {
      on: {
        REQUEST_CHANGES: "changes_requested",
        APPROVE: { guard: "canApprove", target: "approved" },
        VOID: { guard: "canVoid", target: "void" },
      },
    },
    changes_requested: {
      on: {
        SUBMIT_REVIEW: { guard: "canSubmit", target: "founder_review" },
        VOID: { guard: "canVoid", target: "void" },
      },
    },
    approved: {
      on: {
        ISSUE: { guard: "canIssue", target: "issued" },
        VOID: { guard: "canVoid", target: "void" },
      },
    },
    issued: {
      on: {
        RECORD_PAYMENT: "partially_paid",
        MARK_OVERDUE: "overdue",
        VOID: { guard: "canVoid", target: "void" },
      },
    },
    partially_paid: {
      on: {
        RECORD_PAYMENT: "partially_paid",
        MARK_OVERDUE: "overdue",
        VOID: { guard: "canVoid", target: "void" },
      },
    },
    overdue: {
      on: {
        RECORD_PAYMENT: "partially_paid",
        VOID: { guard: "canVoid", target: "void" },
      },
    },
    paid: { type: "final" },
    void: { type: "final" },
  },
});

export function nextInvoiceStatus(
  from: InvoiceStatus,
  event:
    | "SUBMIT_REVIEW"
    | "REQUEST_CHANGES"
    | "APPROVE"
    | "ISSUE"
    | "RECORD_PAYMENT"
    | "MARK_OVERDUE"
    | "VOID"
    | "REVISE",
  context: InvoiceGuardInput,
): InvoiceStatus {
  const snapshot = invoiceLifecycleMachine.resolveState({
    value: from,
    context,
  });
  const next = getNextSnapshot(invoiceLifecycleMachine, snapshot, {
    type: event,
  });
  const value = next.value;
  return typeof value === "string" ? value : from;
}

export function invoiceStatusAfterPayment(input: {
  readonly current: InvoiceStatus;
  readonly balanceDueMinor: bigint;
}): InvoiceStatus {
  if (input.balanceDueMinor <= 0n) return "paid";
  if (
    input.current === "issued" ||
    input.current === "overdue" ||
    input.current === "partially_paid"
  ) {
    return "partially_paid";
  }
  return input.current;
}
