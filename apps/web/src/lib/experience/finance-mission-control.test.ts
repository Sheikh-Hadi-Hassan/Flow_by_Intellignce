import { describe, expect, it } from "vitest";

import type { FinanceSummary, Invoice } from "../commercial/finance-api";
import { buildFinancePriorities, hasFakeMetrics } from "./mission-control";

function summary(partial: Partial<FinanceSummary>): FinanceSummary {
  return {
    invoicedMinor: "0",
    collectedMinor: "0",
    outstandingMinor: "0",
    overdueMinor: "0",
    draftInvoiceCount: 0,
    unbilledApprovedTimeMinutes: 0,
    unbilledApprovedExpenseMinor: "0",
    ...partial,
  };
}

function invoice(partial: Partial<Invoice> & Pick<Invoice, "id">): Invoice {
  return {
    workspaceId: "ws",
    projectId: "proj-1",
    clientId: "client-1",
    opportunityId: "opp-1",
    status: "draft",
    currency: "USD",
    subtotalMinor: "10000",
    discountMinor: "0",
    taxMinor: "0",
    totalMinor: "10000",
    amountPaidMinor: "0",
    balanceDueMinor: "10000",
    paymentTermsDays: 30,
    notes: "",
    clientSnapshot: {},
    revision: 1,
    ...partial,
  };
}

describe("finance mission-control", () => {
  it("never reports fake metrics", () => {
    expect(hasFakeMetrics()).toBe(false);
  });

  it("maps founder_review invoices to urgent approval priority", () => {
    const items = buildFinancePriorities("ws", {
      invoices: [invoice({ id: "inv-1", status: "founder_review" })],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.tone).toBe("urgent");
    expect(items[0]?.href).toContain("/admin/finance/invoices/inv-1");
  });

  it("surfaces unbilled approved time as attention", () => {
    const items = buildFinancePriorities("ws", {
      summary: summary({ unbilledApprovedTimeMinutes: 240 }),
    });
    expect(items[0]?.id).toBe("unbilled-time");
    expect(items[0]?.href).toContain("/admin/finance/time");
  });

  it("caps finance priority list at eight items", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      invoice({ id: `inv-${i}`, status: "founder_review" }),
    );
    expect(buildFinancePriorities("ws", { invoices: rows })).toHaveLength(8);
  });
});
