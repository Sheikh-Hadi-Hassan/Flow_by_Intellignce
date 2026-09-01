import { apiRequest } from "../api/client";

export type TimeEntryStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "invoiced";

export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "reimbursed"
  | "invoiced";

export type InvoiceStatus =
  | "draft"
  | "founder_review"
  | "changes_requested"
  | "approved"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";

export interface BillingSettings {
  readonly workspaceId: string;
  readonly invoicePrefix: string;
  readonly nextInvoiceSequence: number;
  readonly defaultPaymentTermsDays: number;
  readonly defaultCurrency: string;
  readonly defaultTaxBps: number;
  readonly taxInclusive: boolean;
  readonly invoiceFooterNotes: string;
  readonly updatedAt?: string;
}

export interface TimeEntry {
  readonly id: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly taskId?: string;
  readonly phaseId?: string;
  readonly resourceProfileId?: string;
  readonly submittedByMembershipId: string;
  readonly workDate: string;
  readonly durationMinutes: number;
  readonly billable: boolean;
  readonly description: string;
  readonly hourlyRateMinor?: string;
  readonly currency: string;
  readonly status: TimeEntryStatus;
  readonly invoiceId?: string;
  readonly rejectionReason?: string;
  readonly submittedAt?: string;
  readonly approvedAt?: string;
  readonly approvedBy?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface Expense {
  readonly id: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly submittedByMembershipId: string;
  readonly vendorName: string;
  readonly expenseDate: string;
  readonly description: string;
  readonly category: string;
  readonly amountMinor: string;
  readonly taxAmountMinor: string;
  readonly currency: string;
  readonly billable: boolean;
  readonly receiptReference: string;
  readonly status: ExpenseStatus;
  readonly invoiceId?: string;
  readonly rejectionReason?: string;
  readonly submittedAt?: string;
  readonly approvedAt?: string;
  readonly approvedBy?: string;
  readonly reimbursedAt?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface InvoiceLineItem {
  readonly id: string;
  readonly workspaceId: string;
  readonly invoiceId: string;
  readonly lineType: "fixed" | "milestone" | "time" | "expense" | "manual";
  readonly description: string;
  readonly quantity: string;
  readonly unitAmountMinor: string;
  readonly amountMinor: string;
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly sortOrder: number;
}

export interface Invoice {
  readonly id: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly clientId: string;
  readonly opportunityId: string;
  readonly invoiceNumber?: string;
  readonly status: InvoiceStatus;
  readonly currency: string;
  readonly subtotalMinor: string;
  readonly discountMinor: string;
  readonly taxMinor: string;
  readonly totalMinor: string;
  readonly amountPaidMinor: string;
  readonly balanceDueMinor: string;
  readonly issueDate?: string;
  readonly dueDate?: string;
  readonly paymentTermsDays: number;
  readonly notes: string;
  readonly clientSnapshot: Record<string, unknown>;
  readonly revision: number;
  readonly idempotencyKey?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface InvoiceDetail extends Invoice {
  readonly lineItems: readonly InvoiceLineItem[];
  readonly versions: readonly {
    readonly id: string;
    readonly versionNumber: number;
    readonly snapshot: Record<string, unknown>;
    readonly documentHash: string;
    readonly issuedAt: string;
    readonly issuedBy?: string;
  }[];
}

export interface Payment {
  readonly id: string;
  readonly workspaceId: string;
  readonly paymentDate: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly paymentMethod: string;
  readonly externalReference: string;
  readonly notes: string;
  readonly status: "recorded" | "reversed";
  readonly idempotencyKey?: string;
  readonly reversedAt?: string;
  readonly createdAt?: string;
}

export interface PaymentAllocation {
  readonly id: string;
  readonly workspaceId: string;
  readonly paymentId: string;
  readonly invoiceId: string;
  readonly amountMinor: string;
}

export interface FinanceSummary {
  readonly invoicedMinor: string;
  readonly collectedMinor: string;
  readonly outstandingMinor: string;
  readonly overdueMinor: string;
  readonly draftInvoiceCount: number;
  readonly unbilledApprovedTimeMinutes: number;
  readonly unbilledApprovedExpenseMinor: string;
}

export interface AgingBucket {
  readonly bucket: "current" | "1_30" | "31_60" | "61_90" | "90_plus";
  readonly invoiceCount: number;
  readonly balanceDueMinor: string;
}

export interface ProjectProfitability {
  readonly projectId: string;
  readonly invoicedMinor: string;
  readonly labourCostMinor?: string;
  readonly expenseCostMinor: string;
  readonly grossProfitMinor: string;
  readonly grossMarginBps: number;
}

export function financePath(workspaceId: string, suffix: string): string {
  return `/api/v1/workspaces/${workspaceId}/finance${suffix}`;
}

export function formatMinor(minor: string, currency: string): string {
  const amount = BigInt(minor);
  const sign = amount < 0n ? "-" : "";
  const abs = amount < 0n ? -amount : amount;
  const whole = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, "0");
  return `${sign}${currency} ${whole.toString()}.${cents}`;
}

export function createFinanceApi(input: {
  readonly token: string;
  readonly workspaceId: string;
}) {
  const request = <T>(
    suffix: string,
    options: {
      method?: string;
      body?: unknown;
      idempotencyKey?: string;
    } = {},
  ) =>
    apiRequest<T>(financePath(input.workspaceId, suffix), {
      token: input.token,
      workspaceId: input.workspaceId,
      ...options,
    });

  return {
    getBillingSettings: () => request<BillingSettings>("/billing/settings"),
    updateBillingSettings: (body: Partial<BillingSettings>) =>
      request<BillingSettings>("/billing/settings", { method: "PATCH", body }),

    listTimeEntries: (filters?: { projectId?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.set("projectId", filters.projectId);
      if (filters?.status) params.set("status", filters.status);
      const qs = params.toString();
      return request<TimeEntry[]>(`/time-entries${qs ? `?${qs}` : ""}`);
    },
    createTimeEntry: (body: {
      projectId: string;
      taskId?: string;
      phaseId?: string;
      resourceProfileId?: string;
      workDate: string;
      durationMinutes: number;
      billable: boolean;
      description: string;
      hourlyRateMinor?: string;
      currency?: string;
    }) => request<TimeEntry>("/time-entries", { method: "POST", body }),
    submitTimeEntry: (entryId: string) =>
      request<TimeEntry>(`/time-entries/${entryId}/submit`, { method: "POST" }),
    approveTimeEntry: (entryId: string) =>
      request<TimeEntry>(`/time-entries/${entryId}/approve`, { method: "POST" }),
    rejectTimeEntry: (entryId: string, rejectionReason: string) =>
      request<TimeEntry>(`/time-entries/${entryId}/reject`, {
        method: "POST",
        body: { rejectionReason },
      }),

    listExpenses: (filters?: { projectId?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.set("projectId", filters.projectId);
      if (filters?.status) params.set("status", filters.status);
      const qs = params.toString();
      return request<Expense[]>(`/expenses${qs ? `?${qs}` : ""}`);
    },
    createExpense: (body: {
      projectId: string;
      vendorName: string;
      expenseDate: string;
      description: string;
      category: string;
      amountMinor: string;
      taxAmountMinor?: string;
      currency?: string;
      billable: boolean;
      receiptReference?: string;
    }) => request<Expense>("/expenses", { method: "POST", body }),
    submitExpense: (expenseId: string) =>
      request<Expense>(`/expenses/${expenseId}/submit`, { method: "POST" }),
    approveExpense: (expenseId: string) =>
      request<Expense>(`/expenses/${expenseId}/approve`, { method: "POST" }),
    rejectExpense: (expenseId: string, rejectionReason: string) =>
      request<Expense>(`/expenses/${expenseId}/reject`, {
        method: "POST",
        body: { rejectionReason },
      }),

    listInvoiceSchedules: (projectId?: string) => {
      const qs = projectId ? `?projectId=${projectId}` : "";
      return request<
        readonly {
          id: string;
          projectId: string;
          label: string;
          amountMinor: string;
          status: string;
        }[]
      >(`/invoice-schedules${qs}`);
    },
    generateDraftInvoice: (projectId: string, idempotencyKey?: string) =>
      request<InvoiceDetail>(`/projects/${projectId}/invoices/draft`, {
        method: "POST",
        ...(idempotencyKey ? { idempotencyKey } : {}),
      }),

    getInvoice: (invoiceId: string) =>
      request<InvoiceDetail>(`/invoices/${invoiceId}`),
    listInvoices: (filters?: {
      projectId?: string;
      clientId?: string;
      status?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.set("projectId", filters.projectId);
      if (filters?.clientId) params.set("clientId", filters.clientId);
      if (filters?.status) params.set("status", filters.status);
      const qs = params.toString();
      return request<Invoice[]>(`/invoices${qs ? `?${qs}` : ""}`);
    },
    submitInvoiceReview: (invoiceId: string) =>
      request<InvoiceDetail>(`/invoices/${invoiceId}/submit-review`, {
        method: "POST",
      }),
    requestInvoiceChanges: (invoiceId: string, rationale?: string) =>
      request<InvoiceDetail>(`/invoices/${invoiceId}/request-changes`, {
        method: "POST",
        body: { rationale },
      }),
    approveInvoice: (invoiceId: string) =>
      request<InvoiceDetail>(`/invoices/${invoiceId}/approve`, { method: "POST" }),
    issueInvoice: (invoiceId: string, idempotencyKey?: string) =>
      request<InvoiceDetail>(`/invoices/${invoiceId}/issue`, {
        method: "POST",
        ...(idempotencyKey ? { idempotencyKey } : {}),
      }),
    voidInvoice: (invoiceId: string) =>
      request<InvoiceDetail>(`/invoices/${invoiceId}/void`, { method: "POST" }),

    recordPayment: (
      body: {
        paymentDate: string;
        amountMinor: string;
        currency: string;
        paymentMethod: string;
        externalReference?: string;
        notes?: string;
        allocations: readonly { invoiceId: string; amountMinor: string }[];
      },
      idempotencyKey?: string,
    ) =>
      request<{ payment: Payment; allocations: PaymentAllocation[] }>(
        "/payments",
        {
          method: "POST",
          body,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      ),

    getFinancialSummary: () => request<FinanceSummary>("/summary"),
    getProjectProfitability: (projectId: string) =>
      request<ProjectProfitability>(
        `/projects/${projectId}/profitability`,
      ),
    getReceivablesAging: () =>
      request<readonly AgingBucket[]>("/receivables-aging"),
  };
}

export type FinanceApi = ReturnType<typeof createFinanceApi>;
