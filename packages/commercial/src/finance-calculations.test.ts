import { describe, expect, it } from "vitest";

import {
  allocatePaymentMinor,
  agingBucket,
  balanceDueMinor,
  formatInvoiceNumber,
  invoiceSubtotalMinor,
  invoiceTaxMinor,
  invoiceTotalMinor,
  isInvoiceOverdue,
  lineAmountMinor,
  projectProfitability,
  timeEntryBillableMinor,
} from "./finance-calculations.js";

describe("finance-calculations", () => {
  it("computes line and subtotal amounts", () => {
    expect(
      lineAmountMinor({
        description: "Milestone",
        quantity: 1n,
        unitAmountMinor: 50_000n,
      }),
    ).toBe(50_000n);
    expect(
      invoiceSubtotalMinor([
        { description: "A", quantity: 2n, unitAmountMinor: 1000n },
        { description: "B", quantity: 1n, unitAmountMinor: 500n },
      ]),
    ).toBe(2500n);
  });

  it("rejects negative line inputs", () => {
    expect(() =>
      lineAmountMinor({
        description: "x",
        quantity: -1n,
        unitAmountMinor: 100n,
      }),
    ).toThrow();
  });

  it("computes tax exclusive and inclusive", () => {
    expect(
      invoiceTaxMinor({
        taxableMinor: 10_000n,
        taxBps: 1000,
        taxInclusive: false,
      }),
    ).toBe(1000n);
    expect(
      invoiceTaxMinor({
        taxableMinor: 11_000n,
        taxBps: 1000,
        taxInclusive: true,
      }),
    ).toBe(1000n);
  });

  it("computes invoice total with discount", () => {
    expect(
      invoiceTotalMinor({
        subtotalMinor: 10_000n,
        discountMinor: 1_000n,
        taxMinor: 900n,
      }),
    ).toBe(9900n);
  });

  it("rejects discount exceeding subtotal", () => {
    expect(() =>
      invoiceTotalMinor({
        subtotalMinor: 100n,
        discountMinor: 200n,
        taxMinor: 0n,
      }),
    ).toThrow();
  });

  it("allocates payment up to balance due", () => {
    expect(
      allocatePaymentMinor({
        paymentAmountMinor: 5000n,
        invoiceBalanceDueMinor: 10_000n,
        existingAllocationsMinor: 0n,
      }),
    ).toBe(5000n);
  });

  it("rejects overpayment allocation", () => {
    expect(() =>
      allocatePaymentMinor({
        paymentAmountMinor: 6000n,
        invoiceBalanceDueMinor: 5000n,
        existingAllocationsMinor: 0n,
      }),
    ).toThrow(/exceeds/);
  });

  it("computes balance due", () => {
    expect(balanceDueMinor(10_000n, 3000n)).toBe(7000n);
    expect(balanceDueMinor(10_000n, 12_000n)).toBe(0n);
  });

  it("computes time entry billable value", () => {
    expect(
      timeEntryBillableMinor({ durationMinutes: 60, hourlyRateMinor: 12_000n }),
    ).toBe(12_000n);
    expect(
      timeEntryBillableMinor({ durationMinutes: 1, hourlyRateMinor: 60_00n }),
    ).toBe(100n);
  });

  it("computes project profitability", () => {
    const result = projectProfitability({
      invoicedMinor: 100_000n,
      labourCostMinor: 40_000n,
      expenseCostMinor: 10_000n,
    });
    expect(result.grossProfitMinor).toBe(50_000n);
    expect(result.grossMarginBps).toBe(5000);
  });

  it("formats invoice numbers", () => {
    expect(formatInvoiceNumber("INV", 42)).toBe("INV-00042");
  });

  it("detects overdue invoices", () => {
    const past = new Date("2020-01-01");
    expect(
      isInvoiceOverdue({
        status: "issued",
        dueDateIso: "2019-12-01",
        balanceDueMinor: 100n,
        asOf: past,
      }),
    ).toBe(true);
    expect(
      isInvoiceOverdue({
        status: "paid",
        dueDateIso: "2019-12-01",
        balanceDueMinor: 0n,
        asOf: past,
      }),
    ).toBe(false);
  });

  it("assigns aging buckets", () => {
    expect(agingBucket("2026-01-01", new Date("2026-01-15"))).toBe("1_30");
    expect(agingBucket("2026-02-01", new Date("2026-01-15"))).toBe("current");
  });
});
