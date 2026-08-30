import {
  actualMarginBps,
  applyBps,
  budgetFit,
  grossProfitMinor,
  labourCostMinor,
  recommendedPriceMinor,
} from "./money.js";
import type { CostComponentInput, ScopeCalculation } from "./types.js";

export function calculateScope(input: {
  readonly currency: string;
  readonly components: readonly CostComponentInput[];
  readonly contingencyBps: number;
  readonly targetMarginBps: number;
  readonly budgetMinMinor?: bigint;
  readonly budgetMaxMinor?: bigint;
  readonly estimatedDeliveryDays?: number;
  readonly timelineDays?: number;
}): ScopeCalculation {
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new Error("Currency must be a three-letter ISO code.");
  }

  let internalLabourMinor = 0n;
  let vendorCostMinor = 0n;
  const hoursByRole: Record<string, number> = {};

  for (const component of input.components) {
    const labour = labourCostMinor(
      component.estimatedMinutes,
      BigInt(component.internalRatePerHourMinor),
    );
    internalLabourMinor += labour;
    vendorCostMinor += BigInt(component.vendorCostMinor);
    hoursByRole[component.roleKey] =
      (hoursByRole[component.roleKey] ?? 0) + component.estimatedMinutes;
  }

  const deliveryCostBeforeContingency = internalLabourMinor + vendorCostMinor;
  const contingencyMinor = applyBps(
    deliveryCostBeforeContingency,
    input.contingencyBps,
  );
  const totalDeliveryCostMinor =
    deliveryCostBeforeContingency + contingencyMinor;
  const recommended = recommendedPriceMinor(
    totalDeliveryCostMinor,
    input.targetMarginBps,
  );
  const profit = grossProfitMinor(recommended, totalDeliveryCostMinor);
  const timelineFeasible =
    input.timelineDays === undefined ||
    input.estimatedDeliveryDays === undefined
      ? "unknown"
      : input.estimatedDeliveryDays <= input.timelineDays
        ? "feasible"
        : "infeasible";

  return {
    currency: input.currency,
    hoursByRoleMinutes: hoursByRole,
    internalLabourCostMinor: internalLabourMinor.toString(),
    vendorCostMinor: vendorCostMinor.toString(),
    contingencyMinor: contingencyMinor.toString(),
    totalDeliveryCostMinor: totalDeliveryCostMinor.toString(),
    targetMarginBps: input.targetMarginBps,
    recommendedPriceMinor: recommended.toString(),
    grossProfitMinor: profit.toString(),
    actualMarginBps: actualMarginBps(recommended, totalDeliveryCostMinor),
    budgetFit: budgetFit({
      recommendedPriceMinor: recommended,
      ...(input.budgetMinMinor !== undefined
        ? { budgetMinMinor: input.budgetMinMinor }
        : {}),
      ...(input.budgetMaxMinor !== undefined
        ? { budgetMaxMinor: input.budgetMaxMinor }
        : {}),
    }),
    timelineFeasibility: timelineFeasible,
  };
}

export function discoveryCompleteness(input: {
  readonly requiredQuestionCount: number;
  readonly answeredRequiredCount: number;
  readonly requiredEvidenceCount: number;
  readonly linkedEvidenceCount: number;
  readonly blockingRisks: number;
}): number {
  const parts = [
    input.requiredQuestionCount === 0
      ? 100
      : Math.floor(
          (input.answeredRequiredCount * 100) / input.requiredQuestionCount,
        ),
    input.requiredEvidenceCount === 0
      ? 100
      : Math.floor(
          (input.linkedEvidenceCount * 100) / input.requiredEvidenceCount,
        ),
    input.blockingRisks === 0 ? 100 : 0,
  ];
  return Math.min(100, Math.floor(parts.reduce((a, b) => a + b, 0) / 3));
}
