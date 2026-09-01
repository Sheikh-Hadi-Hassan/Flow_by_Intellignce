import { describe, expect, it } from "vitest";

import {
  answerAskFlow,
  isSupportedIntent,
  listSupportedIntents,
} from "./ask-flow";

describe("ask-flow finance intents", () => {
  it("lists finance intents", () => {
    expect(listSupportedIntents()).toContain("unbilled_work");
    expect(listSupportedIntents()).toContain("finance_next_action");
    expect(isSupportedIntent("receivables_summary")).toBe(true);
    expect(isSupportedIntent("invoice_total_explain")).toBe(true);
  });

  it("answers unbilled work from finance summary", () => {
    const response = answerAskFlow({
      intent: "unbilled_work",
      workspace: "ws",
      opportunities: [],
      financeSummary: {
        invoicedMinor: "0",
        collectedMinor: "0",
        outstandingMinor: "0",
        overdueMinor: "0",
        draftInvoiceCount: 0,
        unbilledApprovedTimeMinutes: 120,
        unbilledApprovedExpenseMinor: "5000",
      },
    });
    expect(response.supported).toBe(true);
    expect(response.answer).toMatch(/120.*minutes/i);
    expect(response.proof).toMatch(/summary|unbilled/i);
  });

  it("honestly reports empty overdue invoices", () => {
    const response = answerAskFlow({
      intent: "overdue_invoices",
      workspace: "ws",
      opportunities: [],
      invoices: [],
    });
    expect(response.supported).toBe(true);
    expect(response.answer).toMatch(/no invoices are currently marked overdue/i);
  });

  it("recommends finance next action from priorities", () => {
    const response = answerAskFlow({
      intent: "finance_next_action",
      workspace: "ws",
      opportunities: [],
      invoices: [
        {
          id: "inv-review",
          workspaceId: "ws",
          projectId: "p1",
          clientId: "c1",
          opportunityId: "o1",
          status: "founder_review",
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
        },
      ],
    });
    expect(response.supported).toBe(true);
    expect(response.records[0]?.href).toContain("/admin/finance/invoices/");
    expect(response.guardRequired).toBe(true);
  });

  it("explains invoice totals without claiming AI calculation", () => {
    const response = answerAskFlow({
      intent: "invoice_total_explain",
      workspace: "ws",
      opportunities: [],
    });
    expect(response.supported).toBe(true);
    expect(response.proof).toMatch(/deterministic|finance-calculations/i);
    expect(response.answer).not.toMatch(/I generated|AI wrote/i);
  });
});
