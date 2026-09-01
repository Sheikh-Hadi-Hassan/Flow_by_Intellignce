import { describe, expect, it } from "vitest";
import { allocatePaymentMinor } from "@flow/commercial";

import { InMemoryFinanceRepository } from "./finance-persistence.js";

describe("finance repository", () => {
  it("transitions time entries through approval", async () => {
    const repo = new InMemoryFinanceRepository();
    await repo.createTimeEntry({
      id: "te-1",
      workspaceId: "ws-1",
      projectId: "proj-1",
      submittedByMembershipId: "mem-1",
      workDate: "2026-01-15",
      durationMinutes: 60,
      billable: true,
      description: "Design review",
      currency: "USD",
      status: "draft",
    });

    const submitted = await repo.transitionTimeEntry(
      "ws-1",
      "te-1",
      "submitted",
      { submittedAt: new Date().toISOString() },
    );
    expect(submitted.status).toBe("submitted");

    const approved = await repo.transitionTimeEntry("ws-1", "te-1", "approved", {
      approvedAt: new Date().toISOString(),
      approvedBy: "user-1",
    });
    expect(approved.status).toBe("approved");
  });

  it("blocks edits after an invoice is issued", async () => {
    const repo = new InMemoryFinanceRepository();
    await repo.createInvoice({
      id: "inv-1",
      workspaceId: "ws-1",
      projectId: "proj-1",
      clientId: "client-1",
      opportunityId: "opp-1",
      status: "approved",
      currency: "USD",
      subtotalMinor: "10000",
      discountMinor: "0",
      taxMinor: "0",
      totalMinor: "10000",
      amountPaidMinor: "0",
      balanceDueMinor: "10000",
      paymentTermsDays: 30,
      notes: "",
      clientSnapshot: { name: "Acme" },
      revision: 1,
    });
    await repo.addInvoiceLineItems("ws-1", "inv-1", [
      {
        workspaceId: "ws-1",
        invoiceId: "inv-1",
        lineType: "manual",
        description: "Milestone",
        quantity: "1",
        unitAmountMinor: "10000",
        amountMinor: "10000",
        sortOrder: 0,
      },
    ]);
    await repo.issueInvoice("ws-1", "inv-1", "user-1", { totalMinor: "10000" }, "hash");

    await expect(
      repo.updateInvoice("ws-1", "inv-1", { notes: "changed" }),
    ).rejects.toThrow(/cannot be edited/i);
    await expect(
      repo.addInvoiceLineItems("ws-1", "inv-1", [
        {
          workspaceId: "ws-1",
          invoiceId: "inv-1",
          lineType: "manual",
          description: "Extra",
          quantity: "1",
          unitAmountMinor: "100",
          amountMinor: "100",
          sortOrder: 1,
        },
      ]),
    ).rejects.toThrow(/cannot be edited/i);
  });

  it("rejects payment allocation overpayment", () => {
    expect(() =>
      allocatePaymentMinor({
        paymentAmountMinor: 6000n,
        invoiceBalanceDueMinor: 5000n,
        existingAllocationsMinor: 0n,
      }),
    ).toThrow(/exceeds/);
  });
});
