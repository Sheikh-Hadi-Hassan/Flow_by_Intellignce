/** Integer money helpers. Never use JavaScript number for amounts. */

export const FULL_BPS = 10_000n;

export function divHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new Error("Division by zero.");
  }
  const sign = numerator < 0n !== denominator < 0n ? -1n : 1n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = n / d;
  const r = n % d;
  if (r * 2n >= d) {
    return sign * (q + 1n);
  }
  return sign * q;
}

export function labourCostMinor(
  minutes: number,
  ratePerHourMinor: bigint,
): bigint {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("Minutes must be a non-negative integer.");
  }
  return divHalfUp(BigInt(minutes) * ratePerHourMinor, 60n);
}

export function applyBps(amountMinor: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0) {
    throw new Error("Basis points must be a non-negative integer.");
  }
  return divHalfUp(amountMinor * BigInt(bps), FULL_BPS);
}

export function recommendedPriceMinor(
  totalCostMinor: bigint,
  targetMarginBps: number,
): bigint {
  if (!Number.isInteger(targetMarginBps) || targetMarginBps >= 10_000) {
    throw new Error("Target margin must be an integer below 10000 bps.");
  }
  const remaining = FULL_BPS - BigInt(targetMarginBps);
  return divHalfUp(totalCostMinor * FULL_BPS, remaining);
}

export function grossProfitMinor(
  priceMinor: bigint,
  totalCostMinor: bigint,
): bigint {
  return priceMinor - totalCostMinor;
}

export function actualMarginBps(
  priceMinor: bigint,
  totalCostMinor: bigint,
): number {
  if (priceMinor <= 0n) {
    return 0;
  }
  return Number(
    divHalfUp((priceMinor - totalCostMinor) * FULL_BPS, priceMinor),
  );
}

export function budgetFit(input: {
  readonly recommendedPriceMinor: bigint;
  readonly budgetMinMinor?: bigint;
  readonly budgetMaxMinor?: bigint;
}): "under" | "within" | "over" | "unknown" {
  if (
    input.budgetMaxMinor === undefined &&
    input.budgetMinMinor === undefined
  ) {
    return "unknown";
  }
  if (
    input.budgetMaxMinor !== undefined &&
    input.recommendedPriceMinor > input.budgetMaxMinor
  ) {
    return "over";
  }
  if (
    input.budgetMinMinor !== undefined &&
    input.recommendedPriceMinor < input.budgetMinMinor
  ) {
    return "under";
  }
  return "within";
}
