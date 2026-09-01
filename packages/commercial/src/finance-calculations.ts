/** Deterministic finance calculations. All money is bigint minor units. */

import {
  actualMarginBps,
  applyBps,
  divHalfUp,
  grossProfitMinor,
  labourCostMinor,
} from "./money.js";

export interface InvoiceLineInput {
  readonly description: string;
  readonly quantity: bigint;
  readonly unitAmountMinor: bigint;
}

export function lineAmountMinor(line: InvoiceLineInput): bigint {
  if (line.quantity < 0n || line.unitAmountMinor < 0n) {
    throw new Error("Line quantity and unit amount must be non-negative.");
  }
  return line.quantity * line.unitAmountMinor;
}

export function invoiceSubtotalMinor(lines: readonly InvoiceLineInput[]): bigint {
  return lines.reduce((sum, line) => sum + lineAmountMinor(line), 0n);
}

export function applyDiscountMinor(
  subtotalMinor: bigint,
  discountBps: number,
): bigint {
  return applyBps(subtotalMinor, discountBps);
}

export function invoiceTaxMinor(input: {
  readonly taxableMinor: bigint;
  readonly taxBps: number;
  readonly taxInclusive: boolean;
}): bigint {
  if (input.taxBps === 0) return 0n;
  if (input.taxInclusive) {
    const divisor = 10_000n + BigInt(input.taxBps);
    return divHalfUp(input.taxableMinor * BigInt(input.taxBps), divisor);
  }
  return applyBps(input.taxableMinor, input.taxBps);
}

export function invoiceTotalMinor(input: {
  readonly subtotalMinor: bigint;
  readonly discountMinor: bigint;
  readonly taxMinor: bigint;
}): bigint {
  const afterDiscount = input.subtotalMinor - input.discountMinor;
  if (afterDiscount < 0n) {
    throw new Error("Discount exceeds subtotal.");
  }
  return afterDiscount + input.taxMinor;
}

export function balanceDueMinor(
  totalMinor: bigint,
  amountPaidMinor: bigint,
): bigint {
  if (amountPaidMinor < 0n) {
    throw new Error("Amount paid must be non-negative.");
  }
  const balance = totalMinor - amountPaidMinor;
  return balance < 0n ? 0n : balance;
}

export function allocatePaymentMinor(input: {
  readonly paymentAmountMinor: bigint;
  readonly invoiceBalanceDueMinor: bigint;
  readonly existingAllocationsMinor: bigint;
}): bigint {
  if (input.paymentAmountMinor <= 0n) {
    throw new Error("Payment amount must be positive.");
  }
  const remainingOnInvoice =
    input.invoiceBalanceDueMinor - input.existingAllocationsMinor;
  if (remainingOnInvoice <= 0n) {
    throw new Error("Invoice has no balance due.");
  }
  if (input.paymentAmountMinor > remainingOnInvoice) {
    throw new Error("Payment allocation exceeds invoice balance due.");
  }
  return input.paymentAmountMinor;
}

export function timeEntryBillableMinor(input: {
  readonly durationMinutes: number;
  readonly hourlyRateMinor: bigint;
}): bigint {
  return labourCostMinor(input.durationMinutes, input.hourlyRateMinor);
}

export function projectProfitability(input: {
  readonly invoicedMinor: bigint;
  readonly labourCostMinor: bigint;
  readonly expenseCostMinor: bigint;
}): {
  readonly grossProfitMinor: bigint;
  readonly grossMarginBps: number;
} {
  const cost = input.labourCostMinor + input.expenseCostMinor;
  return {
    grossProfitMinor: grossProfitMinor(input.invoicedMinor, cost),
    grossMarginBps: actualMarginBps(input.invoicedMinor, cost),
  };
}

export type AgingBucket = "current" | "1_30" | "31_60" | "61_90" | "90_plus";

export function agingBucket(
  dueDateIso: string,
  asOf: Date = new Date(),
): AgingBucket {
  const due = new Date(dueDateIso);
  const diffMs = asOf.getTime() - due.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "current";
  if (days <= 30) return "1_30";
  if (days <= 60) return "31_60";
  if (days <= 90) return "61_90";
  return "90_plus";
}

export function isInvoiceOverdue(input: {
  readonly status: string;
  readonly dueDateIso: string;
  readonly balanceDueMinor: bigint;
  readonly asOf?: Date;
}): boolean {
  if (
    input.status !== "issued" &&
    input.status !== "partially_paid" &&
    input.status !== "overdue"
  ) {
    return false;
  }
  if (input.balanceDueMinor <= 0n) return false;
  const due = new Date(input.dueDateIso);
  return (input.asOf ?? new Date()) > due;
}

export function formatInvoiceNumber(
  prefix: string,
  sequence: number,
): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Invoice sequence must be a positive integer.");
  }
  const padded = String(sequence).padStart(5, "0");
  return `${prefix}-${padded}`;
}
