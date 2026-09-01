/* eslint-disable @typescript-eslint/require-await -- demo store is synchronous behind async API shape */
import {
  balanceDueMinor,
  invoiceStatusAfterPayment,
  invoiceSubtotalMinor,
  invoiceTaxMinor,
  invoiceTotalMinor,
  nextExpenseStatus,
  nextInvoiceStatus,
  nextTimeEntryStatus,
  timeEntryBillableMinor,
} from "@flow/commercial";

import {
  NORTHSTAR_FINANCE_CLIENT_ID,
  NORTHSTAR_FINANCE_OPPORTUNITY_ID,
  NORTHSTAR_FINANCE_PROJECT_ID,
  NORTHSTAR_FINANCE_STORAGE_KEY,
} from "../../content/demo/northstar-finance";
import type {
  AgingBucket,
  BillingSettings,
  Expense,
  ExpenseStatus,
  FinanceSummary,
  InvoiceDetail,
  InvoiceLineItem,
  InvoiceStatus,
  Payment,
  PaymentAllocation,
  ProjectProfitability,
  TimeEntry,
  TimeEntryStatus,
} from "./finance-api";

type MutableTimeEntry = {
  id: string;
  workspaceId: string;
  projectId: string;
  taskId?: string;
  phaseId?: string;
  resourceProfileId?: string;
  submittedByMembershipId: string;
  workDate: string;
  durationMinutes: number;
  billable: boolean;
  description: string;
  hourlyRateMinor?: string;
  currency: string;
  status: TimeEntryStatus;
  invoiceId?: string;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MutableExpense = {
  id: string;
  workspaceId: string;
  projectId: string;
  submittedByMembershipId: string;
  vendorName: string;
  expenseDate: string;
  description: string;
  category: string;
  amountMinor: string;
  taxAmountMinor: string;
  currency: string;
  billable: boolean;
  receiptReference: string;
  status: ExpenseStatus;
  invoiceId?: string;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  reimbursedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MutableInvoiceDetail = {
  id: string;
  workspaceId: string;
  projectId: string;
  clientId: string;
  opportunityId: string;
  invoiceNumber?: string;
  status: InvoiceStatus;
  currency: string;
  subtotalMinor: string;
  discountMinor: string;
  taxMinor: string;
  totalMinor: string;
  amountPaidMinor: string;
  balanceDueMinor: string;
  issueDate?: string;
  dueDate?: string;
  paymentTermsDays: number;
  notes: string;
  clientSnapshot: Record<string, unknown>;
  revision: number;
  idempotencyKey?: string;
  createdAt?: string;
  updatedAt?: string;
  lineItems: InvoiceLineItem[];
  versions: InvoiceDetail["versions"];
};

interface DemoFinanceState {
  billingSettings: BillingSettings;
  timeEntries: MutableTimeEntry[];
  expenses: MutableExpense[];
  invoices: MutableInvoiceDetail[];
  payments: Payment[];
  paymentAllocations: PaymentAllocation[];
  invoiceSequence: number;
}

function seed(): DemoFinanceState {
  const now = new Date().toISOString();
  const approvedTime: MutableTimeEntry = {
    id: "ns-time-seed-1",
    workspaceId: "demo",
    projectId: NORTHSTAR_FINANCE_PROJECT_ID,
    submittedByMembershipId: "demo-member",
    workDate: "2026-08-15",
    durationMinutes: 480,
    billable: true,
    description: "Brand strategy workshop — Acme launch positioning",
    hourlyRateMinor: "15000",
    currency: "USD",
    status: "approved",
    approvedAt: now,
    createdAt: now,
  };

  const approvedExpense: MutableExpense = {
    id: "ns-exp-seed-1",
    workspaceId: "demo",
    projectId: NORTHSTAR_FINANCE_PROJECT_ID,
    submittedByMembershipId: "demo-member",
    vendorName: "StockPhoto Co",
    expenseDate: "2026-08-20",
    description: "Industrial robotics hero imagery license",
    category: "media",
    amountMinor: "25000",
    taxAmountMinor: "0",
    currency: "USD",
    billable: true,
    receiptReference: "RCP-8842",
    status: "approved",
    approvedAt: now,
    createdAt: now,
  };

  const paidInvoice = buildInvoiceDetail({
    id: "ns-inv-paid-1",
    status: "paid",
    invoiceNumber: "NS-0001",
    lineItems: [
      lineItem("ns-li-1", "ns-inv-paid-1", "Kickoff milestone", "4250000", 0),
    ],
    amountPaidMinor: "4250000",
    issueDate: "2026-07-01",
    dueDate: "2026-07-31",
  });

  const reviewInvoice = buildInvoiceDetail({
    id: "ns-inv-review-1",
    status: "founder_review",
    lineItems: [
      lineItem(
        "ns-li-2",
        "ns-inv-review-1",
        "Discovery phase time",
        "120000",
        0,
      ),
    ],
  });

  return {
    billingSettings: {
      workspaceId: "demo",
      invoicePrefix: "NS",
      nextInvoiceSequence: 3,
      defaultPaymentTermsDays: 30,
      defaultCurrency: "USD",
      defaultTaxBps: 0,
      taxInclusive: false,
      invoiceFooterNotes: "Thank you for partnering with Northstar Creative.",
      updatedAt: now,
    },
    timeEntries: [approvedTime],
    expenses: [approvedExpense],
    invoices: [paidInvoice, reviewInvoice],
    payments: [
      {
        id: "ns-pay-1",
        workspaceId: "demo",
        paymentDate: "2026-07-15",
        amountMinor: "4250000",
        currency: "USD",
        paymentMethod: "wire",
        externalReference: "WIRE-ACME-001",
        notes: "Kickoff payment",
        status: "recorded",
        createdAt: now,
      },
    ],
    paymentAllocations: [
      {
        id: "ns-alloc-1",
        workspaceId: "demo",
        paymentId: "ns-pay-1",
        invoiceId: "ns-inv-paid-1",
        amountMinor: "4250000",
      },
    ],
    invoiceSequence: 3,
  };
}

function lineItem(
  id: string,
  invoiceId: string,
  description: string,
  amountMinor: string,
  sortOrder: number,
): InvoiceLineItem {
  return {
    id,
    workspaceId: "demo",
    invoiceId,
    lineType: "milestone",
    description,
    quantity: "1",
    unitAmountMinor: amountMinor,
    amountMinor,
    sortOrder,
  };
}

function buildInvoiceDetail(input: {
  id: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  invoiceNumber?: string;
  amountPaidMinor?: string;
  issueDate?: string;
  dueDate?: string;
}): MutableInvoiceDetail {
  const calcLines = input.lineItems.map((line) => ({
    description: line.description,
    quantity: 1n,
    unitAmountMinor: BigInt(line.amountMinor),
  }));
  const subtotalMinor = invoiceSubtotalMinor(calcLines);
  const taxMinor = invoiceTaxMinor({
    taxableMinor: subtotalMinor,
    taxBps: 0,
    taxInclusive: false,
  });
  const totalMinor = invoiceTotalMinor({
    subtotalMinor,
    discountMinor: 0n,
    taxMinor,
  });
  const paid = BigInt(input.amountPaidMinor ?? "0");
  const balance = balanceDueMinor(totalMinor, paid);
  return {
    id: input.id,
    workspaceId: "demo",
    projectId: NORTHSTAR_FINANCE_PROJECT_ID,
    clientId: NORTHSTAR_FINANCE_CLIENT_ID,
    opportunityId: NORTHSTAR_FINANCE_OPPORTUNITY_ID,
    ...(input.invoiceNumber ? { invoiceNumber: input.invoiceNumber } : {}),
    status: input.status,
    currency: "USD",
    subtotalMinor: subtotalMinor.toString(),
    discountMinor: "0",
    taxMinor: taxMinor.toString(),
    totalMinor: totalMinor.toString(),
    amountPaidMinor: paid.toString(),
    balanceDueMinor: balance.toString(),
    ...(input.issueDate ? { issueDate: input.issueDate } : {}),
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    paymentTermsDays: 30,
    notes: "Thank you for partnering with Northstar Creative.",
    clientSnapshot: { id: NORTHSTAR_FINANCE_CLIENT_ID, name: "Acme Robotics" },
    revision: 1,
    lineItems: input.lineItems,
    versions:
      input.status === "issued" ||
      input.status === "partially_paid" ||
      input.status === "paid"
        ? [
            {
              id: `ver-${input.id}`,
              versionNumber: 1,
              snapshot: {},
              documentHash: "demo-hash",
              issuedAt: input.issueDate ?? new Date().toISOString(),
            },
          ]
        : [],
  };
}

function load(): DemoFinanceState {
  if (typeof window === "undefined") return seed();
  const raw = window.sessionStorage.getItem(NORTHSTAR_FINANCE_STORAGE_KEY);
  if (!raw) return seed();
  try {
    const parsed = JSON.parse(raw) as Partial<DemoFinanceState>;
    const base = seed();
    return {
      ...base,
      ...parsed,
      billingSettings: parsed.billingSettings ?? base.billingSettings,
      timeEntries: parsed.timeEntries ?? base.timeEntries,
      expenses: parsed.expenses ?? base.expenses,
      invoices: parsed.invoices ?? base.invoices,
      payments: parsed.payments ?? base.payments,
      paymentAllocations:
        parsed.paymentAllocations ?? base.paymentAllocations,
      invoiceSequence: parsed.invoiceSequence ?? base.invoiceSequence,
    };
  } catch {
    return seed();
  }
}

function save(state: DemoFinanceState) {
  window.sessionStorage.setItem(
    NORTHSTAR_FINANCE_STORAGE_KEY,
    JSON.stringify(state),
  );
}

function computeSummary(state: DemoFinanceState): FinanceSummary {
  let invoicedMinor = 0n;
  let collectedMinor = 0n;
  let outstandingMinor = 0n;
  let overdueMinor = 0n;
  let draftInvoiceCount = 0;
  let unbilledApprovedTimeMinutes = 0;
  let unbilledApprovedExpenseMinor = 0n;

  for (const invoice of state.invoices) {
    if (invoice.status === "void") continue;
    if (
      invoice.status === "issued" ||
      invoice.status === "partially_paid" ||
      invoice.status === "paid" ||
      invoice.status === "overdue"
    ) {
      invoicedMinor += BigInt(invoice.totalMinor);
      collectedMinor += BigInt(invoice.amountPaidMinor);
      const balance = BigInt(invoice.balanceDueMinor);
      outstandingMinor += balance;
      if (invoice.status === "overdue") overdueMinor += balance;
    }
    if (invoice.status === "draft") draftInvoiceCount += 1;
  }

  for (const entry of state.timeEntries) {
    if (entry.status === "approved" && !entry.invoiceId) {
      unbilledApprovedTimeMinutes += entry.durationMinutes;
    }
  }
  for (const expense of state.expenses) {
    if (expense.status === "approved" && !expense.invoiceId && expense.billable) {
      unbilledApprovedExpenseMinor += BigInt(expense.amountMinor);
    }
  }

  return {
    invoicedMinor: invoicedMinor.toString(),
    collectedMinor: collectedMinor.toString(),
    outstandingMinor: outstandingMinor.toString(),
    overdueMinor: overdueMinor.toString(),
    draftInvoiceCount,
    unbilledApprovedTimeMinutes,
    unbilledApprovedExpenseMinor: unbilledApprovedExpenseMinor.toString(),
  };
}

function computeAging(state: DemoFinanceState): AgingBucket[] {
  const buckets: Record<AgingBucket["bucket"], { count: number; total: bigint }> =
    {
      current: { count: 0, total: 0n },
      "1_30": { count: 0, total: 0n },
      "31_60": { count: 0, total: 0n },
      "61_90": { count: 0, total: 0n },
      "90_plus": { count: 0, total: 0n },
    };

  for (const invoice of state.invoices) {
    if (
      invoice.status !== "issued" &&
      invoice.status !== "partially_paid" &&
      invoice.status !== "overdue"
    ) {
      continue;
    }
    const balance = BigInt(invoice.balanceDueMinor);
    if (balance <= 0n) continue;
    const bucket: AgingBucket["bucket"] =
      invoice.status === "overdue" ? "31_60" : "current";
    buckets[bucket].count += 1;
    buckets[bucket].total += balance;
  }

  return (Object.keys(buckets) as AgingBucket["bucket"][]).map((bucket) => ({
    bucket,
    invoiceCount: buckets[bucket].count,
    balanceDueMinor: buckets[bucket].total.toString(),
  }));
}

function transitionInvoice(
  state: DemoFinanceState,
  invoiceId: string,
  nextStatus: InvoiceStatus,
  partial?: Partial<MutableInvoiceDetail>,
): InvoiceDetail {
  const index = state.invoices.findIndex((row) => row.id === invoiceId);
  if (index < 0) throw new Error("Invoice not found.");
  const current = state.invoices[index]!;
  const updated: MutableInvoiceDetail = {
    ...current,
    ...partial,
    status: nextStatus,
  };
  state.invoices[index] = updated;
  save(state);
  return updated;
}

export function createNorthstarFinanceApi() {
  return {
    isDemo: true as const,

    getBillingSettings: async () => load().billingSettings,
    updateBillingSettings: async (
      body: Partial<BillingSettings>,
    ) => {
      const state = load();
      state.billingSettings = { ...state.billingSettings, ...body };
      save(state);
      return state.billingSettings;
    },

    listTimeEntries: async (filters?: {
      projectId?: string;
      status?: string;
    }) => {
      let rows = load().timeEntries;
      if (filters?.projectId) {
        rows = rows.filter((row) => row.projectId === filters.projectId);
      }
      if (filters?.status) {
        rows = rows.filter((row) => row.status === filters.status);
      }
      return rows as TimeEntry[];
    },
    createTimeEntry: async (body: {
      projectId: string;
      workDate: string;
      durationMinutes: number;
      billable: boolean;
      description: string;
      hourlyRateMinor?: string;
      currency?: string;
    }) => {
      const state = load();
      const entry: MutableTimeEntry = {
        id: crypto.randomUUID(),
        workspaceId: "demo",
        projectId: body.projectId,
        submittedByMembershipId: "demo-member",
        workDate: body.workDate,
        durationMinutes: body.durationMinutes,
        billable: body.billable,
        description: body.description,
        ...(body.hourlyRateMinor ? { hourlyRateMinor: body.hourlyRateMinor } : {}),
        currency: body.currency ?? state.billingSettings.defaultCurrency,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      state.timeEntries.push(entry);
      save(state);
      return entry;
    },
    submitTimeEntry: async (entryId: string) => {
      const state = load();
      const current = state.timeEntries.find((row) => row.id === entryId);
      if (!current) throw new Error("Time entry not found.");
      const next = nextTimeEntryStatus(current.status, "SUBMIT", {
        actorCanOwn: true,
        actorCanApprove: true,
        isLocked: false,
      });
      current.status = next;
      current.submittedAt = new Date().toISOString();
      save(state);
      return current;
    },
    approveTimeEntry: async (entryId: string) => {
      const state = load();
      const current = state.timeEntries.find((row) => row.id === entryId);
      if (!current) throw new Error("Time entry not found.");
      const next = nextTimeEntryStatus(current.status, "APPROVE", {
        actorCanOwn: true,
        actorCanApprove: true,
        isLocked: false,
      });
      current.status = next;
      current.approvedAt = new Date().toISOString();
      save(state);
      return current;
    },
    rejectTimeEntry: async (entryId: string, rejectionReason: string) => {
      const state = load();
      const current = state.timeEntries.find((row) => row.id === entryId);
      if (!current) throw new Error("Time entry not found.");
      current.status = "rejected";
      current.rejectionReason = rejectionReason;
      save(state);
      return current;
    },

    listExpenses: async (filters?: { projectId?: string; status?: string }) => {
      let rows = load().expenses;
      if (filters?.projectId) {
        rows = rows.filter((row) => row.projectId === filters.projectId);
      }
      if (filters?.status) {
        rows = rows.filter((row) => row.status === filters.status);
      }
      return rows as Expense[];
    },
    createExpense: async (body: {
      projectId: string;
      vendorName: string;
      expenseDate: string;
      description: string;
      category: string;
      amountMinor: string;
      billable: boolean;
      receiptReference?: string;
    }) => {
      const state = load();
      const expense: MutableExpense = {
        id: crypto.randomUUID(),
        workspaceId: "demo",
        projectId: body.projectId,
        submittedByMembershipId: "demo-member",
        vendorName: body.vendorName,
        expenseDate: body.expenseDate,
        description: body.description,
        category: body.category,
        amountMinor: body.amountMinor,
        taxAmountMinor: "0",
        currency: state.billingSettings.defaultCurrency,
        billable: body.billable,
        receiptReference: body.receiptReference ?? "",
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      state.expenses.push(expense);
      save(state);
      return expense;
    },
    submitExpense: async (expenseId: string) => {
      const state = load();
      const current = state.expenses.find((row) => row.id === expenseId);
      if (!current) throw new Error("Expense not found.");
      const next = nextExpenseStatus(current.status, "SUBMIT", {
        actorCanOwn: true,
        actorCanApprove: true,
        isLocked: false,
      });
      current.status = next;
      current.submittedAt = new Date().toISOString();
      save(state);
      return current;
    },
    approveExpense: async (expenseId: string) => {
      const state = load();
      const current = state.expenses.find((row) => row.id === expenseId);
      if (!current) throw new Error("Expense not found.");
      const next = nextExpenseStatus(current.status, "APPROVE", {
        actorCanOwn: true,
        actorCanApprove: true,
        isLocked: false,
      });
      current.status = next;
      current.approvedAt = new Date().toISOString();
      save(state);
      return current;
    },
    rejectExpense: async (expenseId: string, rejectionReason: string) => {
      const state = load();
      const current = state.expenses.find((row) => row.id === expenseId);
      if (!current) throw new Error("Expense not found.");
      current.status = "rejected";
      current.rejectionReason = rejectionReason;
      save(state);
      return current;
    },

    listInvoiceSchedules: async () => [],

    generateDraftInvoice: async (projectId: string) => {
      const state = load();
      const billableTime = state.timeEntries.filter(
        (row) =>
          row.projectId === projectId &&
          row.status === "approved" &&
          row.billable &&
          !row.invoiceId,
      );
      const billableExpenses = state.expenses.filter(
        (row) =>
          row.projectId === projectId &&
          row.status === "approved" &&
          row.billable &&
          !row.invoiceId,
      );
      if (billableTime.length === 0 && billableExpenses.length === 0) {
        throw new Error("No billable amounts available to invoice.");
      }

      const invoiceId = crypto.randomUUID();
      const lineItems: InvoiceLineItem[] = [];
      let sortOrder = 0;
      for (const entry of billableTime) {
        const rate = BigInt(entry.hourlyRateMinor ?? "15000");
        const amountMinor = timeEntryBillableMinor({
          durationMinutes: entry.durationMinutes,
          hourlyRateMinor: rate,
        });
        lineItems.push({
          id: crypto.randomUUID(),
          workspaceId: "demo",
          invoiceId,
          lineType: "time",
          description: entry.description,
          quantity: "1",
          unitAmountMinor: amountMinor.toString(),
          amountMinor: amountMinor.toString(),
          sourceType: "time_entry",
          sourceId: entry.id,
          sortOrder: sortOrder++,
        });
      }
      for (const expense of billableExpenses) {
        lineItems.push({
          id: crypto.randomUUID(),
          workspaceId: "demo",
          invoiceId,
          lineType: "expense",
          description: `${expense.vendorName}: ${expense.description}`,
          quantity: "1",
          unitAmountMinor: expense.amountMinor,
          amountMinor: expense.amountMinor,
          sourceType: "expense",
          sourceId: expense.id,
          sortOrder: sortOrder++,
        });
      }

      const detail = buildInvoiceDetail({
        id: invoiceId,
        status: "draft",
        lineItems,
      });
      state.invoices.push(detail);
      save(state);
      return detail;
    },

    getInvoice: async (invoiceId: string) => {
      const invoice = load().invoices.find((row) => row.id === invoiceId);
      if (!invoice) throw new Error("Invoice not found.");
      return invoice;
    },
    listInvoices: async (filters?: { status?: string }) => {
      let rows = load().invoices.map((row) => {
        const { lineItems, versions, ...header } = row;
        void lineItems;
        void versions;
        return header;
      });
      if (filters?.status) {
        rows = rows.filter((row) => row.status === filters.status);
      }
      return rows;
    },
    submitInvoiceReview: async (invoiceId: string) => {
      const state = load();
      const current = state.invoices.find((row) => row.id === invoiceId);
      if (!current) throw new Error("Invoice not found.");
      const next = nextInvoiceStatus(current.status, "SUBMIT_REVIEW", {
        hasLineItems: current.lineItems.length > 0,
        guardAllowsIssue: true,
        actorCanManage: true,
        actorCanApprove: true,
        isIssued: false,
      });
      return transitionInvoice(state, invoiceId, next);
    },
    requestInvoiceChanges: async (invoiceId: string) => {
      const state = load();
      const current = state.invoices.find((row) => row.id === invoiceId);
      if (!current) throw new Error("Invoice not found.");
      const next = nextInvoiceStatus(
        current.status,
        "REQUEST_CHANGES",
        {
          hasLineItems: true,
          guardAllowsIssue: true,
          actorCanManage: true,
          actorCanApprove: true,
          isIssued: false,
        },
      );
      return transitionInvoice(state, invoiceId, next);
    },
    approveInvoice: async (invoiceId: string) => {
      const state = load();
      const current = state.invoices.find((row) => row.id === invoiceId);
      if (!current) throw new Error("Invoice not found.");
      const next = nextInvoiceStatus(current.status, "APPROVE", {
        hasLineItems: true,
        guardAllowsIssue: true,
        actorCanManage: true,
        actorCanApprove: true,
        isIssued: false,
      });
      return transitionInvoice(state, invoiceId, next);
    },
    issueInvoice: async (invoiceId: string) => {
      const state = load();
      const current = state.invoices.find((row) => row.id === invoiceId);
      if (!current) throw new Error("Invoice not found.");
      const next = nextInvoiceStatus(current.status, "ISSUE", {
        hasLineItems: true,
        guardAllowsIssue: true,
        actorCanManage: true,
        actorCanApprove: true,
        isIssued: false,
      });
      const invoiceNumber = `${state.billingSettings.invoicePrefix}-${String(state.invoiceSequence).padStart(4, "0")}`;
      state.invoiceSequence += 1;
      const issueDate = new Date().toISOString().slice(0, 10);
      const due = new Date();
      due.setDate(due.getDate() + current.paymentTermsDays);
      const updated = transitionInvoice(state, invoiceId, next, {
        invoiceNumber,
        issueDate,
        dueDate: due.toISOString().slice(0, 10),
        versions: [
          {
            id: crypto.randomUUID(),
            versionNumber: 1,
            snapshot: {},
            documentHash: "demo-hash",
            issuedAt: new Date().toISOString(),
          },
        ],
      });

      for (const line of current.lineItems) {
        if (line.sourceType === "time_entry" && line.sourceId) {
          const entry = state.timeEntries.find((row) => row.id === line.sourceId);
          if (entry) {
            entry.status = "invoiced";
            entry.invoiceId = invoiceId;
          }
        }
        if (line.sourceType === "expense" && line.sourceId) {
          const expense = state.expenses.find((row) => row.id === line.sourceId);
          if (expense) {
            expense.status = "invoiced";
            expense.invoiceId = invoiceId;
          }
        }
      }
      save(state);
      return updated;
    },
    voidInvoice: async (invoiceId: string) => {
      const state = load();
      return transitionInvoice(state, invoiceId, "void");
    },

    recordPayment: async (body: {
      paymentDate: string;
      amountMinor: string;
      currency: string;
      paymentMethod: string;
      externalReference?: string;
      notes?: string;
      allocations: readonly { invoiceId: string; amountMinor: string }[];
    }) => {
      const state = load();
      const paymentId = crypto.randomUUID();
      const payment: Payment = {
        id: paymentId,
        workspaceId: "demo",
        paymentDate: body.paymentDate,
        amountMinor: body.amountMinor,
        currency: body.currency,
        paymentMethod: body.paymentMethod,
        externalReference: body.externalReference ?? "",
        notes: body.notes ?? "",
        status: "recorded",
        createdAt: new Date().toISOString(),
      };
      state.payments.push(payment);

      const allocations: PaymentAllocation[] = [];
      for (const allocation of body.allocations) {
        const invoice = state.invoices.find(
          (row) => row.id === allocation.invoiceId,
        );
        if (!invoice) throw new Error("Invoice not found.");
        allocations.push({
          id: crypto.randomUUID(),
          workspaceId: "demo",
          paymentId,
          invoiceId: allocation.invoiceId,
          amountMinor: allocation.amountMinor,
        });
        const newPaid =
          BigInt(invoice.amountPaidMinor) + BigInt(allocation.amountMinor);
        const newBalance = balanceDueMinor(
          BigInt(invoice.totalMinor),
          newPaid,
        );
        const nextStatus = invoiceStatusAfterPayment({
          current: invoice.status,
          balanceDueMinor: newBalance,
        });
        invoice.amountPaidMinor = newPaid.toString();
        invoice.balanceDueMinor = newBalance.toString();
        invoice.status = nextStatus;
      }
      state.paymentAllocations.push(...allocations);
      save(state);
      return { payment, allocations };
    },

    getFinancialSummary: async () => computeSummary(load()),
    getProjectProfitability: async (
      projectId: string,
    ): Promise<ProjectProfitability> => {
      const state = load();
      let invoicedMinor = 0n;
      for (const invoice of state.invoices) {
        if (
          invoice.projectId === projectId &&
          invoice.status !== "void" &&
          invoice.status !== "draft" &&
          invoice.status !== "founder_review" &&
          invoice.status !== "changes_requested" &&
          invoice.status !== "approved"
        ) {
          invoicedMinor += BigInt(invoice.totalMinor);
        }
      }
      let expenseCostMinor = 0n;
      for (const expense of state.expenses) {
        if (expense.projectId === projectId && expense.status === "approved") {
          expenseCostMinor += BigInt(expense.amountMinor);
        }
      }
      const grossProfitMinor = invoicedMinor - expenseCostMinor;
      const grossMarginBps =
        invoicedMinor > 0n
          ? Number((grossProfitMinor * 10000n) / invoicedMinor)
          : 0;
      return {
        projectId,
        invoicedMinor: invoicedMinor.toString(),
        expenseCostMinor: expenseCostMinor.toString(),
        grossProfitMinor: grossProfitMinor.toString(),
        grossMarginBps,
      };
    },
    getReceivablesAging: async () => computeAging(load()),

    listPayments: async () => load().payments,
  };
}

export type NorthstarFinanceApi = ReturnType<typeof createNorthstarFinanceApi>;
