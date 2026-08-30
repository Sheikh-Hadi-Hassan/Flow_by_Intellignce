import { describe, expect, it } from "vitest";

import {
  calculatePackagePricing,
  lineTotalMinor,
  splitPaymentSchedule,
  validatePaymentSchedule,
} from "./proposal-pricing.js";

describe("proposal pricing", () => {
  it("calculates line totals with integer minor units", () => {
    expect(lineTotalMinor({ quantity: 3, unitPriceMinor: 250000n })).toBe(
      750000n,
    );
  });

  it("applies discount, contingency, tax, and margin deterministically", () => {
    const result = calculatePackagePricing({
      lineItems: [{ quantity: 1, unitPriceMinor: 1_000_000n }],
      discountBps: 1000,
      taxBps: 800,
      contingencyBps: 500,
      deliveryCostMinor: 600_000n,
    });
    expect(result.subtotalMinor).toBe(1_000_000n);
    expect(result.discountMinor).toBe(100_000n);
    expect(result.afterDiscountMinor).toBe(900_000n);
    expect(result.contingencyMinor).toBe(45_000n);
    expect(result.taxMinor).toBe(75_600n);
    expect(result.totalMinor).toBe(1_020_600n);
    expect(result.grossProfitMinor).toBe(420_600n);
    expect(result.marginBps).toBe(4121);
  });

  it("validates payment schedule sums to contract total", () => {
    const items = splitPaymentSchedule(1_000_000n, ["Deposit", "Final"]);
    expect(validatePaymentSchedule(items, 1_000_000n)).toBe(true);
    expect(items[0]?.amountMinor).toBe(500_000n);
    expect(items[1]?.amountMinor).toBe(500_000n);
  });
});
