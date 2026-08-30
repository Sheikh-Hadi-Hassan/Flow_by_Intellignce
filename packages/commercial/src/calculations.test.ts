import { describe, expect, it } from "vitest";

import {
  actualMarginBps,
  applyBps,
  budgetFit,
  divHalfUp,
  labourCostMinor,
  recommendedPriceMinor,
} from "./money.js";
import { calculateScope, discoveryCompleteness } from "./calculations.js";

describe("integer money", () => {
  it("rounds half up without floating point", () => {
    expect(divHalfUp(5n, 2n)).toBe(3n);
    expect(divHalfUp(4n, 2n)).toBe(2n);
  });

  it("computes labour from minutes and hourly minor units", () => {
    expect(labourCostMinor(90, 15000n)).toBe(22500n);
  });

  it("applies contingency and target margin in basis points", () => {
    expect(applyBps(10000n, 1000)).toBe(1000n);
    expect(recommendedPriceMinor(60000n, 4000)).toBe(100000n);
    expect(actualMarginBps(100000n, 60000n)).toBe(4000);
  });

  it("classifies budget fit", () => {
    expect(
      budgetFit({
        recommendedPriceMinor: 85000n,
        budgetMinMinor: 75000n,
        budgetMaxMinor: 95000n,
      }),
    ).toBe("within");
    expect(
      budgetFit({
        recommendedPriceMinor: 120000n,
        budgetMaxMinor: 95000n,
      }),
    ).toBe("over");
  });
});

describe("scope calculation", () => {
  it("rolls up hours, cost, price, and completeness", () => {
    const result = calculateScope({
      currency: "USD",
      components: [
        {
          roleKey: "strategist",
          estimatedMinutes: 2400,
          internalRatePerHourMinor: "15000",
          vendorCostMinor: "0",
        },
        {
          roleKey: "designer",
          estimatedMinutes: 1800,
          internalRatePerHourMinor: "12000",
          vendorCostMinor: "50000",
        },
      ],
      contingencyBps: 1000,
      targetMarginBps: 4000,
      budgetMinMinor: 7500000n,
      budgetMaxMinor: 9500000n,
      estimatedDeliveryDays: 70,
      timelineDays: 90,
    });
    expect(result.hoursByRoleMinutes.strategist).toBe(2400);
    expect(result.timelineFeasibility).toBe("feasible");
    expect(Number(result.totalDeliveryCostMinor)).toBeGreaterThan(0);
    expect(
      discoveryCompleteness({
        requiredQuestionCount: 3,
        answeredRequiredCount: 3,
        requiredEvidenceCount: 1,
        linkedEvidenceCount: 1,
        blockingRisks: 0,
      }),
    ).toBe(100);
  });
});
