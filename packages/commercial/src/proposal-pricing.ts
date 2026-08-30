import { applyBps, divHalfUp, grossProfitMinor } from "./money.js";

export interface LineItemInput {
  readonly quantity: number;
  readonly unitPriceMinor: bigint;
}

export interface PackagePricingInput {
  readonly lineItems: readonly LineItemInput[];
  readonly discountBps: number;
  readonly taxBps: number;
  readonly contingencyBps: number;
  readonly deliveryCostMinor: bigint;
}

export interface PackagePricingResult {
  readonly subtotalMinor: bigint;
  readonly discountMinor: bigint;
  readonly afterDiscountMinor: bigint;
  readonly contingencyMinor: bigint;
  readonly taxMinor: bigint;
  readonly totalMinor: bigint;
  readonly grossProfitMinor: bigint;
  readonly marginBps: number;
}

export function lineTotalMinor(input: LineItemInput): bigint {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("Quantity must be a positive integer.");
  }
  return BigInt(input.quantity) * input.unitPriceMinor;
}

export function packageSubtotalMinor(
  lineItems: readonly LineItemInput[],
): bigint {
  return lineItems.reduce(
    (sum, item) => sum + lineTotalMinor(item),
    0n,
  );
}

export function calculatePackagePricing(
  input: PackagePricingInput,
): PackagePricingResult {
  const subtotalMinor = packageSubtotalMinor(input.lineItems);
  const discountMinor = applyBps(subtotalMinor, input.discountBps);
  const afterDiscountMinor = subtotalMinor - discountMinor;
  const contingencyMinor = applyBps(afterDiscountMinor, input.contingencyBps);
  const beforeTaxMinor = afterDiscountMinor + contingencyMinor;
  const taxMinor = applyBps(beforeTaxMinor, input.taxBps);
  const totalMinor = beforeTaxMinor + taxMinor;
  const profit = grossProfitMinor(totalMinor, input.deliveryCostMinor);
  const marginBps =
    totalMinor <= 0n
      ? 0
      : Number(divHalfUp(profit * 10_000n, totalMinor));

  return {
    subtotalMinor,
    discountMinor,
    afterDiscountMinor,
    contingencyMinor,
    taxMinor,
    totalMinor,
    grossProfitMinor: profit,
    marginBps,
  };
}

export interface PaymentScheduleItemInput {
  readonly label: string;
  readonly amountMinor: bigint;
}

export function validatePaymentSchedule(
  items: readonly PaymentScheduleItemInput[],
  contractTotalMinor: bigint,
): boolean {
  if (items.length === 0) return false;
  const sum = items.reduce((acc, row) => acc + row.amountMinor, 0n);
  return sum === contractTotalMinor;
}

export function splitPaymentSchedule(
  totalMinor: bigint,
  labels: readonly string[],
): readonly PaymentScheduleItemInput[] {
  if (labels.length === 0) {
    throw new Error("At least one payment milestone is required.");
  }
  const count = BigInt(labels.length);
  const base = totalMinor / count;
  let remainder = totalMinor - base * count;
  return labels.map((label) => {
    const extra = remainder > 0n ? 1n : 0n;
    if (remainder > 0n) remainder -= 1n;
    return {
      label,
      amountMinor: base + extra,
    };
  });
}
