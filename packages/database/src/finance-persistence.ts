import {
  actualMarginBps,
  grossProfitMinor,
  labourCostMinor,
} from "@flow/commercial";
import type { SqlExecutor } from "./sql-executor.js";

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

type AgingBucket = "current" | "1_30" | "31_60" | "61_90" | "90_plus";

function formatInvoiceNumber(prefix: string, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Invoice sequence must be a positive integer.");
  }
  return `${prefix}-${String(sequence).padStart(5, "0")}`;
}

function agingBucket(dueDateIso: string, asOf: Date = new Date()): AgingBucket {
  const due = new Date(dueDateIso);
  const days = Math.floor((asOf.getTime() - due.getTime()) / 86_400_000);
  if (days <= 0) return "current";
  if (days <= 30) return "1_30";
  if (days <= 60) return "31_60";
  if (days <= 90) return "61_90";
  return "90_plus";
}

function invoiceStatusAfterPayment(input: {
  readonly current: InvoiceStatus;
  readonly balanceDueMinor: bigint;
}): InvoiceStatus {
  if (input.balanceDueMinor <= 0n) return "paid";
  if (
    input.current === "issued" ||
    input.current === "overdue" ||
    input.current === "partially_paid"
  ) {
    return "partially_paid";
  }
  return input.current;
}

function projectProfitability(input: {
  readonly invoicedMinor: bigint;
  readonly labourCostMinor: bigint;
  readonly expenseCostMinor: bigint;
}): { readonly grossProfitMinor: bigint; readonly grossMarginBps: number } {
  const cost = input.labourCostMinor + input.expenseCostMinor;
  return {
    grossProfitMinor: grossProfitMinor(input.invoicedMinor, cost),
    grossMarginBps: actualMarginBps(input.invoicedMinor, cost),
  };
}

export interface BillingSettingsRecord {
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

export interface TimeEntryRecord {
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

export interface ExpenseRecord {
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

export interface InvoiceScheduleRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly contractScheduleItemId?: string;
  readonly scheduleType:
    | "deposit"
    | "milestone"
    | "retainer"
    | "final"
    | "manual";
  readonly label: string;
  readonly triggerDescription: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly dueDate?: string;
  readonly status: "pending" | "scheduled" | "generated" | "cancelled";
  readonly generatedInvoiceId?: string;
  readonly idempotencyKey?: string;
  readonly createdAt?: string;
}

export interface InvoiceLineItemRecord {
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

export interface InvoiceRecord {
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

export interface InvoiceVersionRecord {
  readonly id: string;
  readonly versionNumber: number;
  readonly snapshot: Record<string, unknown>;
  readonly documentHash: string;
  readonly issuedAt: string;
  readonly issuedBy?: string;
}

export interface InvoiceDetail extends InvoiceRecord {
  readonly lineItems: readonly InvoiceLineItemRecord[];
  readonly versions: readonly InvoiceVersionRecord[];
}

export interface PaymentRecord {
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

export interface PaymentAllocationRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly paymentId: string;
  readonly invoiceId: string;
  readonly amountMinor: string;
}

export interface FinanceSummaryRecord {
  readonly invoicedMinor: string;
  readonly collectedMinor: string;
  readonly outstandingMinor: string;
  readonly overdueMinor: string;
  readonly draftInvoiceCount: number;
  readonly unbilledApprovedTimeMinutes: number;
  readonly unbilledApprovedExpenseMinor: string;
}

export interface ProjectProfitabilityRecord {
  readonly projectId: string;
  readonly invoicedMinor: string;
  readonly labourCostMinor?: string;
  readonly expenseCostMinor: string;
  readonly grossProfitMinor: string;
  readonly grossMarginBps: number;
}

export interface AgingBucketSummary {
  readonly bucket: "current" | "1_30" | "31_60" | "61_90" | "90_plus";
  readonly invoiceCount: number;
  readonly balanceDueMinor: string;
}

export interface TimeEntryFilters {
  readonly projectId?: string;
  readonly status?: TimeEntryStatus | readonly TimeEntryStatus[];
  readonly submittedByMembershipId?: string;
  readonly billable?: boolean;
  readonly invoiceId?: string | null;
}

export interface ExpenseFilters {
  readonly projectId?: string;
  readonly status?: ExpenseStatus | readonly ExpenseStatus[];
  readonly submittedByMembershipId?: string;
  readonly billable?: boolean;
  readonly invoiceId?: string | null;
}

export interface InvoiceFilters {
  readonly projectId?: string;
  readonly clientId?: string;
  readonly status?: InvoiceStatus | readonly InvoiceStatus[];
}

export interface TimeEntryTransitionMeta {
  readonly rejectionReason?: string;
  readonly approvedBy?: string;
  readonly submittedAt?: string;
  readonly approvedAt?: string;
}

export interface ExpenseTransitionMeta {
  readonly rejectionReason?: string;
  readonly approvedBy?: string;
  readonly submittedAt?: string;
  readonly approvedAt?: string;
  readonly reimbursedAt?: string;
}

const ISSUED_INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "issued",
  "partially_paid",
  "paid",
  "overdue",
];

const RECEIVABLE_STATUSES: readonly InvoiceStatus[] = [
  "issued",
  "partially_paid",
  "overdue",
];

const TIME_ENTRY_TRANSITIONS: Record<
  TimeEntryStatus,
  readonly TimeEntryStatus[]
> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected"],
  rejected: ["draft"],
  approved: ["invoiced"],
  invoiced: [],
};

const EXPENSE_TRANSITIONS: Record<ExpenseStatus, readonly ExpenseStatus[]> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected"],
  rejected: ["draft"],
  approved: ["invoiced", "reimbursed"],
  invoiced: [],
  reimbursed: [],
};

const INVOICE_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ["founder_review", "void"],
  founder_review: ["changes_requested", "approved", "void"],
  changes_requested: ["founder_review", "void"],
  approved: ["void"],
  issued: ["overdue", "void"],
  partially_paid: ["overdue", "void", "paid"],
  paid: [],
  overdue: ["void", "partially_paid"],
  void: [],
};

function assertTransition<T extends string>(
  label: string,
  from: T,
  to: T,
  allowed: Record<T, readonly T[]>,
): void {
  if (!allowed[from]?.includes(to)) {
    throw new Error(`Invalid ${label} transition: ${from} -> ${to}`);
  }
}

function sumMinor(values: readonly string[]): string {
  return values
    .reduce((sum, value) => sum + BigInt(value || "0"), 0n)
    .toString();
}

function matchesStatusFilter<T extends string>(
  value: T,
  filter?: T | readonly T[],
): boolean {
  if (filter == null) return true;
  return Array.isArray(filter) ? filter.includes(value) : value === filter;
}

function defaultBillingSettings(workspaceId: string): BillingSettingsRecord {
  return {
    workspaceId,
    invoicePrefix: "INV",
    nextInvoiceSequence: 1,
    defaultPaymentTermsDays: 30,
    defaultCurrency: "USD",
    defaultTaxBps: 0,
    taxInclusive: false,
    invoiceFooterNotes: "",
    updatedAt: new Date().toISOString(),
  };
}

export interface FinanceRepository {
  getOrCreateBillingSettings(
    workspaceId: string,
  ): Promise<BillingSettingsRecord>;
  updateBillingSettings(
    workspaceId: string,
    partial: Partial<Omit<BillingSettingsRecord, "workspaceId">>,
  ): Promise<BillingSettingsRecord>;
  reserveInvoiceNumber(
    workspaceId: string,
  ): Promise<{ readonly invoiceNumber: string; readonly sequence: number }>;
  createTimeEntry(input: TimeEntryRecord): Promise<TimeEntryRecord>;
  listTimeEntries(
    workspaceId: string,
    filters?: TimeEntryFilters,
  ): Promise<readonly TimeEntryRecord[]>;
  updateTimeEntry(
    workspaceId: string,
    id: string,
    partial: Partial<Omit<TimeEntryRecord, "id" | "workspaceId">>,
  ): Promise<TimeEntryRecord>;
  transitionTimeEntry(
    workspaceId: string,
    id: string,
    status: TimeEntryStatus,
    meta?: TimeEntryTransitionMeta,
  ): Promise<TimeEntryRecord>;
  createExpense(input: ExpenseRecord): Promise<ExpenseRecord>;
  listExpenses(
    workspaceId: string,
    filters?: ExpenseFilters,
  ): Promise<readonly ExpenseRecord[]>;
  transitionExpense(
    workspaceId: string,
    id: string,
    status: ExpenseStatus,
    meta?: ExpenseTransitionMeta,
  ): Promise<ExpenseRecord>;
  listInvoiceSchedules(
    workspaceId: string,
    projectId?: string,
  ): Promise<readonly InvoiceScheduleRecord[]>;
  createInvoiceSchedule(
    input: InvoiceScheduleRecord,
  ): Promise<InvoiceScheduleRecord>;
  markScheduleGenerated(
    workspaceId: string,
    scheduleId: string,
    invoiceId: string,
  ): Promise<InvoiceScheduleRecord>;
  createInvoice(input: InvoiceRecord): Promise<InvoiceRecord>;
  getInvoice(
    workspaceId: string,
    id: string,
  ): Promise<InvoiceDetail | undefined>;
  listInvoices(
    workspaceId: string,
    filters?: InvoiceFilters,
  ): Promise<readonly InvoiceRecord[]>;
  updateInvoice(
    workspaceId: string,
    id: string,
    partial: Partial<Omit<InvoiceRecord, "id" | "workspaceId">>,
  ): Promise<InvoiceRecord>;
  addInvoiceLineItems(
    workspaceId: string,
    invoiceId: string,
    items: readonly Omit<InvoiceLineItemRecord, "id">[],
  ): Promise<readonly InvoiceLineItemRecord[]>;
  replaceInvoiceLineItems(
    workspaceId: string,
    invoiceId: string,
    items: readonly Omit<InvoiceLineItemRecord, "id">[],
  ): Promise<readonly InvoiceLineItemRecord[]>;
  transitionInvoice(
    workspaceId: string,
    id: string,
    status: InvoiceStatus,
  ): Promise<InvoiceRecord>;
  issueInvoice(
    workspaceId: string,
    id: string,
    issuedBy: string | undefined,
    snapshot: Record<string, unknown>,
    documentHash: string,
  ): Promise<InvoiceDetail>;
  voidInvoice(workspaceId: string, id: string): Promise<InvoiceRecord>;
  lockTimeEntriesForInvoice(
    workspaceId: string,
    ids: readonly string[],
    invoiceId: string,
  ): Promise<void>;
  lockExpensesForInvoice(
    workspaceId: string,
    ids: readonly string[],
    invoiceId: string,
  ): Promise<void>;
  recordPayment(
    input: PaymentRecord & { readonly idempotencyKey?: string },
  ): Promise<PaymentRecord>;
  createPaymentAllocation(
    input: PaymentAllocationRecord,
  ): Promise<PaymentAllocationRecord>;
  getFinancialSummary(workspaceId: string): Promise<FinanceSummaryRecord>;
  getProjectProfitability(
    workspaceId: string,
    projectId: string,
    includeLabourCost: boolean,
  ): Promise<ProjectProfitabilityRecord>;
  getReceivablesAging(
    workspaceId: string,
  ): Promise<readonly AgingBucketSummary[]>;
  recordGuardDecision(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly invoiceId: string;
    readonly decision: "allow" | "deny" | "pending";
    readonly actorId?: string;
    readonly rationale?: string;
  }): Promise<void>;
  recordFinanceActivity(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly actorId?: string;
    readonly eventType: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly metadata?: Record<string, unknown>;
  }): Promise<void>;
}

/* eslint-disable @typescript-eslint/require-await -- in-memory store matches async contract */
export class InMemoryFinanceRepository implements FinanceRepository {
  private readonly billingSettings = new Map<string, BillingSettingsRecord>();
  private readonly timeEntries = new Map<string, TimeEntryRecord>();
  private readonly expenses = new Map<string, ExpenseRecord>();
  private readonly schedules = new Map<string, InvoiceScheduleRecord>();
  private readonly invoices = new Map<string, InvoiceDetail>();
  private readonly lineItems = new Map<string, InvoiceLineItemRecord>();
  private readonly payments = new Map<string, PaymentRecord>();
  private readonly allocations = new Map<string, PaymentAllocationRecord>();
  private readonly guards: unknown[] = [];
  private readonly activities: unknown[] = [];

  async getOrCreateBillingSettings(workspaceId: string) {
    const existing = this.billingSettings.get(workspaceId);
    if (existing) return existing;
    const created = defaultBillingSettings(workspaceId);
    this.billingSettings.set(workspaceId, created);
    return created;
  }

  async updateBillingSettings(
    workspaceId: string,
    partial: Partial<Omit<BillingSettingsRecord, "workspaceId">>,
  ) {
    const current = await this.getOrCreateBillingSettings(workspaceId);
    const next = {
      ...current,
      ...partial,
      workspaceId,
      updatedAt: new Date().toISOString(),
    };
    this.billingSettings.set(workspaceId, next);
    return next;
  }

  async reserveInvoiceNumber(workspaceId: string) {
    const settings = await this.getOrCreateBillingSettings(workspaceId);
    const sequence = settings.nextInvoiceSequence;
    const invoiceNumber = formatInvoiceNumber(settings.invoicePrefix, sequence);
    await this.updateBillingSettings(workspaceId, {
      nextInvoiceSequence: sequence + 1,
    });
    return { invoiceNumber, sequence };
  }

  async createTimeEntry(input: TimeEntryRecord) {
    this.timeEntries.set(input.id, input);
    return input;
  }

  async listTimeEntries(workspaceId: string, filters?: TimeEntryFilters) {
    return [...this.timeEntries.values()].filter((row) => {
      if (row.workspaceId !== workspaceId) return false;
      if (filters?.projectId && row.projectId !== filters.projectId) return false;
      if (!matchesStatusFilter(row.status, filters?.status)) return false;
      if (
        filters?.submittedByMembershipId &&
        row.submittedByMembershipId !== filters.submittedByMembershipId
      ) {
        return false;
      }
      if (filters?.billable != null && row.billable !== filters.billable) {
        return false;
      }
      if (filters?.invoiceId !== undefined) {
        const target = filters.invoiceId;
        if (target === null && row.invoiceId != null) return false;
        if (target !== null && row.invoiceId !== target) return false;
      }
      return true;
    });
  }

  async updateTimeEntry(
    workspaceId: string,
    id: string,
    partial: Partial<Omit<TimeEntryRecord, "id" | "workspaceId">>,
  ) {
    const current = this.timeEntries.get(id);
    if (!current || current.workspaceId !== workspaceId) {
      throw new Error("Time entry not found.");
    }
    if (current.status !== "draft" && current.status !== "rejected") {
      throw new Error("Only draft or rejected time entries can be edited.");
    }
    const next = {
      ...current,
      ...partial,
      id,
      workspaceId,
      updatedAt: new Date().toISOString(),
    };
    this.timeEntries.set(id, next);
    return next;
  }

  async transitionTimeEntry(
    workspaceId: string,
    id: string,
    status: TimeEntryStatus,
    meta?: TimeEntryTransitionMeta,
  ) {
    const current = this.timeEntries.get(id);
    if (!current || current.workspaceId !== workspaceId) {
      throw new Error("Time entry not found.");
    }
    assertTransition(
      "time entry",
      current.status,
      status,
      TIME_ENTRY_TRANSITIONS,
    );
    const next: TimeEntryRecord = {
      ...current,
      status,
      ...(meta?.rejectionReason !== undefined
        ? { rejectionReason: meta.rejectionReason }
        : {}),
      ...(meta?.approvedBy !== undefined ? { approvedBy: meta.approvedBy } : {}),
      ...(meta?.submittedAt !== undefined ? { submittedAt: meta.submittedAt } : {}),
      ...(meta?.approvedAt !== undefined ? { approvedAt: meta.approvedAt } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.timeEntries.set(id, next);
    return next;
  }

  async createExpense(input: ExpenseRecord) {
    this.expenses.set(input.id, input);
    return input;
  }

  async listExpenses(workspaceId: string, filters?: ExpenseFilters) {
    return [...this.expenses.values()].filter((row) => {
      if (row.workspaceId !== workspaceId) return false;
      if (filters?.projectId && row.projectId !== filters.projectId) return false;
      if (!matchesStatusFilter(row.status, filters?.status)) return false;
      if (
        filters?.submittedByMembershipId &&
        row.submittedByMembershipId !== filters.submittedByMembershipId
      ) {
        return false;
      }
      if (filters?.billable != null && row.billable !== filters.billable) {
        return false;
      }
      if (filters?.invoiceId !== undefined) {
        const target = filters.invoiceId;
        if (target === null && row.invoiceId != null) return false;
        if (target !== null && row.invoiceId !== target) return false;
      }
      return true;
    });
  }

  async transitionExpense(
    workspaceId: string,
    id: string,
    status: ExpenseStatus,
    meta?: ExpenseTransitionMeta,
  ) {
    const current = this.expenses.get(id);
    if (!current || current.workspaceId !== workspaceId) {
      throw new Error("Expense not found.");
    }
    assertTransition("expense", current.status, status, EXPENSE_TRANSITIONS);
    const next: ExpenseRecord = {
      ...current,
      status,
      ...(meta?.rejectionReason !== undefined
        ? { rejectionReason: meta.rejectionReason }
        : {}),
      ...(meta?.approvedBy !== undefined ? { approvedBy: meta.approvedBy } : {}),
      ...(meta?.submittedAt !== undefined ? { submittedAt: meta.submittedAt } : {}),
      ...(meta?.approvedAt !== undefined ? { approvedAt: meta.approvedAt } : {}),
      ...(meta?.reimbursedAt !== undefined
        ? { reimbursedAt: meta.reimbursedAt }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    this.expenses.set(id, next);
    return next;
  }

  async listInvoiceSchedules(workspaceId: string, projectId?: string) {
    return [...this.schedules.values()].filter(
      (row) =>
        row.workspaceId === workspaceId &&
        (projectId == null || row.projectId === projectId),
    );
  }

  async createInvoiceSchedule(input: InvoiceScheduleRecord) {
    this.schedules.set(input.id, input);
    return input;
  }

  async markScheduleGenerated(
    workspaceId: string,
    scheduleId: string,
    invoiceId: string,
  ) {
    const current = this.schedules.get(scheduleId);
    if (!current || current.workspaceId !== workspaceId) {
      throw new Error("Invoice schedule not found.");
    }
    const next: InvoiceScheduleRecord = {
      ...current,
      status: "generated",
      generatedInvoiceId: invoiceId,
    };
    this.schedules.set(scheduleId, next);
    return next;
  }

  private invoiceHeader(detail: InvoiceDetail): InvoiceRecord {
    const { lineItems, versions, ...header } = detail;
    void lineItems;
    void versions;
    return header;
  }

  async createInvoice(input: InvoiceRecord) {
    const detail: InvoiceDetail = {
      ...input,
      lineItems: [],
      versions: [],
    };
    this.invoices.set(input.id, detail);
    return input;
  }

  async getInvoice(workspaceId: string, id: string) {
    const row = this.invoices.get(id);
    return row?.workspaceId === workspaceId ? row : undefined;
  }

  async listInvoices(workspaceId: string, filters?: InvoiceFilters) {
    return [...this.invoices.values()]
      .filter((row) => {
        if (row.workspaceId !== workspaceId) return false;
        if (filters?.projectId && row.projectId !== filters.projectId) {
          return false;
        }
        if (filters?.clientId && row.clientId !== filters.clientId) return false;
        if (!matchesStatusFilter(row.status, filters?.status)) return false;
        return true;
      })
      .map((row) => this.invoiceHeader(row));
  }

  async updateInvoice(
    workspaceId: string,
    id: string,
    partial: Partial<Omit<InvoiceRecord, "id" | "workspaceId">>,
  ) {
    const current = await this.getInvoice(workspaceId, id);
    if (!current) throw new Error("Invoice not found.");
    if (ISSUED_INVOICE_STATUSES.includes(current.status)) {
      throw new Error("Issued invoices cannot be edited.");
    }
    const next: InvoiceDetail = {
      ...current,
      ...partial,
      id,
      workspaceId,
      updatedAt: new Date().toISOString(),
    };
    this.invoices.set(id, next);
    return this.invoiceHeader(next);
  }

  async addInvoiceLineItems(
    workspaceId: string,
    invoiceId: string,
    items: readonly Omit<InvoiceLineItemRecord, "id">[],
  ) {
    const invoice = await this.getInvoice(workspaceId, invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (ISSUED_INVOICE_STATUSES.includes(invoice.status)) {
      throw new Error("Issued invoices cannot be edited.");
    }
    const created = items.map((item, index) => {
      const record: InvoiceLineItemRecord = {
        id: `${invoiceId}-line-${invoice.lineItems.length + index}`,
        ...item,
        workspaceId,
        invoiceId,
      };
      this.lineItems.set(record.id, record);
      return record;
    });
    this.invoices.set(invoiceId, {
      ...invoice,
      lineItems: [...invoice.lineItems, ...created],
    });
    return created;
  }

  async replaceInvoiceLineItems(
    workspaceId: string,
    invoiceId: string,
    items: readonly Omit<InvoiceLineItemRecord, "id">[],
  ) {
    const invoice = await this.getInvoice(workspaceId, invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (ISSUED_INVOICE_STATUSES.includes(invoice.status)) {
      throw new Error("Issued invoices cannot be edited.");
    }
    for (const item of invoice.lineItems) {
      this.lineItems.delete(item.id);
    }
    const created = items.map((item, index) => {
      const record: InvoiceLineItemRecord = {
        id: `${invoiceId}-line-${index}`,
        ...item,
        workspaceId,
        invoiceId,
      };
      this.lineItems.set(record.id, record);
      return record;
    });
    this.invoices.set(invoiceId, { ...invoice, lineItems: created });
    return created;
  }

  async transitionInvoice(
    workspaceId: string,
    id: string,
    status: InvoiceStatus,
  ) {
    const current = await this.getInvoice(workspaceId, id);
    if (!current) throw new Error("Invoice not found.");
    assertTransition("invoice", current.status, status, INVOICE_TRANSITIONS);
    const next: InvoiceDetail = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.invoices.set(id, next);
    return this.invoiceHeader(next);
  }

  async issueInvoice(
    workspaceId: string,
    id: string,
    issuedBy: string | undefined,
    snapshot: Record<string, unknown>,
    documentHash: string,
  ) {
    const current = await this.getInvoice(workspaceId, id);
    if (!current) throw new Error("Invoice not found.");
    if (current.status !== "approved") {
      throw new Error("Only approved invoices can be issued.");
    }
    const invoiceNumber =
      current.invoiceNumber ??
      (await this.reserveInvoiceNumber(workspaceId)).invoiceNumber;
    const issueDate = current.issueDate ?? new Date().toISOString().slice(0, 10);
    const dueDate =
      current.dueDate ??
      new Date(
        Date.parse(`${issueDate}T00:00:00Z`) +
          current.paymentTermsDays * 86_400_000,
      )
        .toISOString()
        .slice(0, 10);
    const version: InvoiceVersionRecord = {
      id: crypto.randomUUID(),
      versionNumber: current.revision,
      snapshot,
      documentHash,
      issuedAt: new Date().toISOString(),
      ...(issuedBy ? { issuedBy } : {}),
    };
    const next: InvoiceDetail = {
      ...current,
      status: "issued",
      invoiceNumber,
      issueDate,
      dueDate,
      balanceDueMinor: (
        BigInt(current.totalMinor) - BigInt(current.amountPaidMinor)
      ).toString(),
      updatedAt: new Date().toISOString(),
      versions: [...current.versions, version],
    };
    this.invoices.set(id, next);
    return next;
  }

  async voidInvoice(workspaceId: string, id: string) {
    return this.transitionInvoice(workspaceId, id, "void");
  }

  async lockTimeEntriesForInvoice(
    workspaceId: string,
    ids: readonly string[],
    invoiceId: string,
  ) {
    for (const id of ids) {
      const row = this.timeEntries.get(id);
      if (!row || row.workspaceId !== workspaceId) {
        throw new Error("Time entry not found.");
      }
      if (row.status !== "approved") {
        throw new Error("Only approved time entries can be invoiced.");
      }
      this.timeEntries.set(id, {
        ...row,
        status: "invoiced",
        invoiceId,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async lockExpensesForInvoice(
    workspaceId: string,
    ids: readonly string[],
    invoiceId: string,
  ) {
    for (const id of ids) {
      const row = this.expenses.get(id);
      if (!row || row.workspaceId !== workspaceId) {
        throw new Error("Expense not found.");
      }
      if (row.status !== "approved") {
        throw new Error("Only approved expenses can be invoiced.");
      }
      this.expenses.set(id, {
        ...row,
        status: "invoiced",
        invoiceId,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async recordPayment(
    input: PaymentRecord & { readonly idempotencyKey?: string },
  ) {
    if (input.idempotencyKey) {
      const existing = [...this.payments.values()].find(
        (row) =>
          row.workspaceId === input.workspaceId &&
          row.idempotencyKey === input.idempotencyKey,
      );
      if (existing) return existing;
    }
    this.payments.set(input.id, input);
    return input;
  }

  async createPaymentAllocation(input: PaymentAllocationRecord) {
    const invoice = await this.getInvoice(input.workspaceId, input.invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    this.allocations.set(input.id, input);
    const amountPaidMinor = (
      BigInt(invoice.amountPaidMinor) + BigInt(input.amountMinor)
    ).toString();
    const balanceDueMinor = (
      BigInt(invoice.totalMinor) - BigInt(amountPaidMinor)
    ).toString();
    const status = invoiceStatusAfterPayment({
      current: invoice.status,
      balanceDueMinor: BigInt(balanceDueMinor),
    });
    this.invoices.set(input.invoiceId, {
      ...invoice,
      amountPaidMinor,
      balanceDueMinor,
      status,
      updatedAt: new Date().toISOString(),
    });
    return input;
  }

  async getFinancialSummary(workspaceId: string) {
    const invoices = await this.listInvoices(workspaceId);
    const invoicedMinor = sumMinor(
      invoices
        .filter((row) => ISSUED_INVOICE_STATUSES.includes(row.status))
        .map((row) => row.totalMinor),
    );
    const collectedMinor = sumMinor(
      invoices
        .filter((row) => ISSUED_INVOICE_STATUSES.includes(row.status))
        .map((row) => row.amountPaidMinor),
    );
    const outstandingMinor = sumMinor(
      invoices
        .filter((row) => RECEIVABLE_STATUSES.includes(row.status))
        .map((row) => row.balanceDueMinor),
    );
    const today = new Date().toISOString().slice(0, 10);
    const overdueMinor = sumMinor(
      invoices
        .filter(
          (row) =>
            RECEIVABLE_STATUSES.includes(row.status) &&
            row.dueDate != null &&
            row.dueDate < today,
        )
        .map((row) => row.balanceDueMinor),
    );
    const draftInvoiceCount = invoices.filter((row) => row.status === "draft")
      .length;
    const unbilledTime = await this.listTimeEntries(workspaceId, {
      status: "approved",
      billable: true,
      invoiceId: null,
    });
    const unbilledExpenses = await this.listExpenses(workspaceId, {
      status: "approved",
      billable: true,
      invoiceId: null,
    });
    return {
      invoicedMinor,
      collectedMinor,
      outstandingMinor,
      overdueMinor,
      draftInvoiceCount,
      unbilledApprovedTimeMinutes: unbilledTime.reduce(
        (sum, row) => sum + row.durationMinutes,
        0,
      ),
      unbilledApprovedExpenseMinor: sumMinor(
        unbilledExpenses.map(
          (row) =>
            (BigInt(row.amountMinor) + BigInt(row.taxAmountMinor)).toString(),
        ),
      ),
    };
  }

  async getProjectProfitability(
    workspaceId: string,
    projectId: string,
    includeLabourCost: boolean,
  ) {
    const invoices = await this.listInvoices(workspaceId, { projectId });
    const invoicedMinor = sumMinor(
      invoices
        .filter((row) => ISSUED_INVOICE_STATUSES.includes(row.status))
        .map((row) => row.totalMinor),
    );
    const timeRows = await this.listTimeEntries(workspaceId, { projectId });
    const expenseRows = await this.listExpenses(workspaceId, { projectId });
    let labourTotal = 0n;
    if (includeLabourCost) {
      for (const row of timeRows) {
        if (
          (row.status === "approved" || row.status === "invoiced") &&
          row.hourlyRateMinor
        ) {
          labourTotal += labourCostMinor(
            row.durationMinutes,
            BigInt(row.hourlyRateMinor),
          );
        }
      }
    }
    const expenseCostMinor = sumMinor(
      expenseRows
        .filter((row) => row.status === "approved" || row.status === "invoiced")
        .map(
          (row) =>
            (BigInt(row.amountMinor) + BigInt(row.taxAmountMinor)).toString(),
        ),
    );
    const profitability = projectProfitability({
      invoicedMinor: BigInt(invoicedMinor),
      labourCostMinor: labourTotal,
      expenseCostMinor: BigInt(expenseCostMinor),
    });
    return {
      projectId,
      invoicedMinor,
      ...(includeLabourCost ? { labourCostMinor: labourTotal.toString() } : {}),
      expenseCostMinor,
      grossProfitMinor: profitability.grossProfitMinor.toString(),
      grossMarginBps: profitability.grossMarginBps,
    };
  }

  async getReceivablesAging(workspaceId: string) {
    const invoices = await this.listInvoices(workspaceId);
    const buckets = new Map<
      AgingBucketSummary["bucket"],
      { count: number; total: bigint }
    >([
      ["current", { count: 0, total: 0n }],
      ["1_30", { count: 0, total: 0n }],
      ["31_60", { count: 0, total: 0n }],
      ["61_90", { count: 0, total: 0n }],
      ["90_plus", { count: 0, total: 0n }],
    ]);
    for (const invoice of invoices) {
      if (!RECEIVABLE_STATUSES.includes(invoice.status)) continue;
      const balance = BigInt(invoice.balanceDueMinor);
      if (balance <= 0n) continue;
      const bucket = agingBucket(invoice.dueDate ?? new Date().toISOString());
      const current = buckets.get(bucket)!;
      buckets.set(bucket, {
        count: current.count + 1,
        total: current.total + balance,
      });
    }
    return [...buckets.entries()].map(([bucket, value]) => ({
      bucket,
      invoiceCount: value.count,
      balanceDueMinor: value.total.toString(),
    }));
  }

  async recordGuardDecision(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly invoiceId: string;
    readonly decision: "allow" | "deny" | "pending";
    readonly actorId?: string;
    readonly rationale?: string;
  }) {
    this.guards.push(input);
  }

  async recordFinanceActivity(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly actorId?: string;
    readonly eventType: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly metadata?: Record<string, unknown>;
  }) {
    this.activities.push(input);
  }
}

export class PostgresFinanceRepository implements FinanceRepository {
  constructor(private readonly db: SqlExecutor) {}

  async getOrCreateBillingSettings(workspaceId: string) {
    await this.db.query(
      `insert into public.workspace_billing_settings (workspace_id)
       values ($1)
       on conflict (workspace_id) do nothing`,
      [workspaceId],
    );
    const result = await this.db.query<BillingSettingsRecord>(
      `select workspace_id::text as "workspaceId", invoice_prefix as "invoicePrefix",
              next_invoice_sequence as "nextInvoiceSequence",
              default_payment_terms_days as "defaultPaymentTermsDays",
              default_currency as "defaultCurrency", default_tax_bps as "defaultTaxBps",
              tax_inclusive as "taxInclusive", invoice_footer_notes as "invoiceFooterNotes",
              updated_at as "updatedAt"
       from public.workspace_billing_settings
       where workspace_id = $1`,
      [workspaceId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Unable to load billing settings.");
    return row;
  }

  async updateBillingSettings(
    workspaceId: string,
    partial: Partial<Omit<BillingSettingsRecord, "workspaceId">>,
  ) {
    await this.db.query(
      `update public.workspace_billing_settings
       set invoice_prefix = coalesce($2, invoice_prefix),
           next_invoice_sequence = coalesce($3, next_invoice_sequence),
           default_payment_terms_days = coalesce($4, default_payment_terms_days),
           default_currency = coalesce($5, default_currency),
           default_tax_bps = coalesce($6, default_tax_bps),
           tax_inclusive = coalesce($7, tax_inclusive),
           invoice_footer_notes = coalesce($8, invoice_footer_notes),
           updated_at = now()
       where workspace_id = $1`,
      [
        workspaceId,
        partial.invoicePrefix ?? null,
        partial.nextInvoiceSequence ?? null,
        partial.defaultPaymentTermsDays ?? null,
        partial.defaultCurrency ?? null,
        partial.defaultTaxBps ?? null,
        partial.taxInclusive ?? null,
        partial.invoiceFooterNotes ?? null,
      ],
    );
    return this.getOrCreateBillingSettings(workspaceId);
  }

  async reserveInvoiceNumber(workspaceId: string) {
    const result = await this.db.query<{
      invoicePrefix: string;
      sequence: number;
    }>(
      `update public.workspace_billing_settings
       set next_invoice_sequence = next_invoice_sequence + 1,
           updated_at = now()
       where workspace_id = $1
       returning invoice_prefix as "invoicePrefix",
                 next_invoice_sequence - 1 as sequence`,
      [workspaceId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Billing settings not found.");
    return {
      invoiceNumber: formatInvoiceNumber(row.invoicePrefix, row.sequence),
      sequence: row.sequence,
    };
  }

  async createTimeEntry(input: TimeEntryRecord) {
    await this.db.query(
      `insert into public.time_entries
        (id, workspace_id, project_id, task_id, phase_id, resource_profile_id,
         submitted_by_membership_id, work_date, duration_minutes, billable, description,
         hourly_rate_minor, currency, status, invoice_id, rejection_reason,
         submitted_at, approved_at, approved_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        input.id,
        input.workspaceId,
        input.projectId,
        input.taskId ?? null,
        input.phaseId ?? null,
        input.resourceProfileId ?? null,
        input.submittedByMembershipId,
        input.workDate,
        input.durationMinutes,
        input.billable,
        input.description,
        input.hourlyRateMinor ?? null,
        input.currency,
        input.status,
        input.invoiceId ?? null,
        input.rejectionReason ?? null,
        input.submittedAt ?? null,
        input.approvedAt ?? null,
        input.approvedBy ?? null,
      ],
    );
    return input;
  }

  async listTimeEntries(workspaceId: string, filters?: TimeEntryFilters) {
    const params: unknown[] = [workspaceId];
    const clauses = ["workspace_id = $1"];
    if (filters?.projectId) {
      params.push(filters.projectId);
      clauses.push(`project_id = $${params.length}`);
    }
    if (filters?.status != null) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      params.push(statuses);
      clauses.push(`status = any($${params.length}::text[])`);
    }
    if (filters?.submittedByMembershipId) {
      params.push(filters.submittedByMembershipId);
      clauses.push(`submitted_by_membership_id = $${params.length}`);
    }
    if (filters?.billable != null) {
      params.push(filters.billable);
      clauses.push(`billable = $${params.length}`);
    }
    if (filters?.invoiceId !== undefined) {
      if (filters.invoiceId === null) {
        clauses.push("invoice_id is null");
      } else {
        params.push(filters.invoiceId);
        clauses.push(`invoice_id = $${params.length}`);
      }
    }
    const result = await this.db.query<TimeEntryRecord>(
      `select id::text, workspace_id::text as "workspaceId", project_id::text as "projectId",
              task_id::text as "taskId", phase_id::text as "phaseId",
              resource_profile_id::text as "resourceProfileId",
              submitted_by_membership_id::text as "submittedByMembershipId",
              work_date::text as "workDate", duration_minutes as "durationMinutes",
              billable, description, hourly_rate_minor::text as "hourlyRateMinor",
              currency, status, invoice_id::text as "invoiceId",
              rejection_reason as "rejectionReason", submitted_at as "submittedAt",
              approved_at as "approvedAt", approved_by::text as "approvedBy",
              created_at as "createdAt", updated_at as "updatedAt"
       from public.time_entries
       where ${clauses.join(" and ")}
       order by work_date desc, created_at desc`,
      params,
    );
    return result.rows;
  }

  async updateTimeEntry(
    workspaceId: string,
    id: string,
    partial: Partial<Omit<TimeEntryRecord, "id" | "workspaceId">>,
  ) {
    const current = (await this.listTimeEntries(workspaceId)).find(
      (row) => row.id === id,
    );
    if (!current) throw new Error("Time entry not found.");
    if (current.status !== "draft" && current.status !== "rejected") {
      throw new Error("Only draft or rejected time entries can be edited.");
    }
    await this.db.query(
      `update public.time_entries
       set project_id = coalesce($3, project_id),
           task_id = coalesce($4, task_id),
           phase_id = coalesce($5, phase_id),
           resource_profile_id = coalesce($6, resource_profile_id),
           work_date = coalesce($7, work_date),
           duration_minutes = coalesce($8, duration_minutes),
           billable = coalesce($9, billable),
           description = coalesce($10, description),
           hourly_rate_minor = coalesce($11, hourly_rate_minor),
           currency = coalesce($12, currency),
           updated_at = now()
       where workspace_id = $1 and id = $2 and status in ('draft', 'rejected')`,
      [
        workspaceId,
        id,
        partial.projectId ?? null,
        partial.taskId ?? null,
        partial.phaseId ?? null,
        partial.resourceProfileId ?? null,
        partial.workDate ?? null,
        partial.durationMinutes ?? null,
        partial.billable ?? null,
        partial.description ?? null,
        partial.hourlyRateMinor ?? null,
        partial.currency ?? null,
      ],
    );
    const next = (await this.listTimeEntries(workspaceId)).find(
      (row) => row.id === id,
    );
    if (!next) throw new Error("Time entry not found.");
    return next;
  }

  async transitionTimeEntry(
    workspaceId: string,
    id: string,
    status: TimeEntryStatus,
    meta?: TimeEntryTransitionMeta,
  ) {
    const current = (await this.listTimeEntries(workspaceId)).find(
      (row) => row.id === id,
    );
    if (!current) throw new Error("Time entry not found.");
    assertTransition(
      "time entry",
      current.status,
      status,
      TIME_ENTRY_TRANSITIONS,
    );
    await this.db.query(
      `update public.time_entries
       set status = $3,
           rejection_reason = coalesce($4, rejection_reason),
           approved_by = coalesce($5::uuid, approved_by),
           submitted_at = coalesce($6::timestamptz, submitted_at),
           approved_at = coalesce($7::timestamptz, approved_at),
           updated_at = now()
       where workspace_id = $1 and id = $2`,
      [
        workspaceId,
        id,
        status,
        meta?.rejectionReason ?? null,
        meta?.approvedBy ?? null,
        meta?.submittedAt ?? null,
        meta?.approvedAt ?? null,
      ],
    );
    const next = (await this.listTimeEntries(workspaceId)).find(
      (row) => row.id === id,
    );
    if (!next) throw new Error("Time entry not found.");
    return next;
  }

  async createExpense(input: ExpenseRecord) {
    await this.db.query(
      `insert into public.expenses
        (id, workspace_id, project_id, submitted_by_membership_id, vendor_name,
         expense_date, description, category, amount_minor, tax_amount_minor, currency,
         billable, receipt_reference, status, invoice_id, rejection_reason,
         submitted_at, approved_at, approved_by, reimbursed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        input.id,
        input.workspaceId,
        input.projectId,
        input.submittedByMembershipId,
        input.vendorName,
        input.expenseDate,
        input.description,
        input.category,
        input.amountMinor,
        input.taxAmountMinor,
        input.currency,
        input.billable,
        input.receiptReference,
        input.status,
        input.invoiceId ?? null,
        input.rejectionReason ?? null,
        input.submittedAt ?? null,
        input.approvedAt ?? null,
        input.approvedBy ?? null,
        input.reimbursedAt ?? null,
      ],
    );
    return input;
  }

  async listExpenses(workspaceId: string, filters?: ExpenseFilters) {
    const params: unknown[] = [workspaceId];
    const clauses = ["workspace_id = $1"];
    if (filters?.projectId) {
      params.push(filters.projectId);
      clauses.push(`project_id = $${params.length}`);
    }
    if (filters?.status != null) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      params.push(statuses);
      clauses.push(`status = any($${params.length}::text[])`);
    }
    if (filters?.submittedByMembershipId) {
      params.push(filters.submittedByMembershipId);
      clauses.push(`submitted_by_membership_id = $${params.length}`);
    }
    if (filters?.billable != null) {
      params.push(filters.billable);
      clauses.push(`billable = $${params.length}`);
    }
    if (filters?.invoiceId !== undefined) {
      if (filters.invoiceId === null) {
        clauses.push("invoice_id is null");
      } else {
        params.push(filters.invoiceId);
        clauses.push(`invoice_id = $${params.length}`);
      }
    }
    const result = await this.db.query<ExpenseRecord>(
      `select id::text, workspace_id::text as "workspaceId", project_id::text as "projectId",
              submitted_by_membership_id::text as "submittedByMembershipId",
              vendor_name as "vendorName", expense_date::text as "expenseDate",
              description, category, amount_minor::text as "amountMinor",
              tax_amount_minor::text as "taxAmountMinor", currency, billable,
              receipt_reference as "receiptReference", status, invoice_id::text as "invoiceId",
              rejection_reason as "rejectionReason", submitted_at as "submittedAt",
              approved_at as "approvedAt", approved_by::text as "approvedBy",
              reimbursed_at as "reimbursedAt", created_at as "createdAt", updated_at as "updatedAt"
       from public.expenses
       where ${clauses.join(" and ")}
       order by expense_date desc, created_at desc`,
      params,
    );
    return result.rows;
  }

  async transitionExpense(
    workspaceId: string,
    id: string,
    status: ExpenseStatus,
    meta?: ExpenseTransitionMeta,
  ) {
    const current = (await this.listExpenses(workspaceId)).find(
      (row) => row.id === id,
    );
    if (!current) throw new Error("Expense not found.");
    assertTransition("expense", current.status, status, EXPENSE_TRANSITIONS);
    await this.db.query(
      `update public.expenses
       set status = $3,
           rejection_reason = coalesce($4, rejection_reason),
           approved_by = coalesce($5::uuid, approved_by),
           submitted_at = coalesce($6::timestamptz, submitted_at),
           approved_at = coalesce($7::timestamptz, approved_at),
           reimbursed_at = coalesce($8::timestamptz, reimbursed_at),
           updated_at = now()
       where workspace_id = $1 and id = $2`,
      [
        workspaceId,
        id,
        status,
        meta?.rejectionReason ?? null,
        meta?.approvedBy ?? null,
        meta?.submittedAt ?? null,
        meta?.approvedAt ?? null,
        meta?.reimbursedAt ?? null,
      ],
    );
    const next = (await this.listExpenses(workspaceId)).find((row) => row.id === id);
    if (!next) throw new Error("Expense not found.");
    return next;
  }

  async listInvoiceSchedules(workspaceId: string, projectId?: string) {
    const params: unknown[] = [workspaceId];
    let sql = `select id::text, workspace_id::text as "workspaceId", project_id::text as "projectId",
                      contract_schedule_item_id::text as "contractScheduleItemId",
                      schedule_type as "scheduleType", label, trigger_description as "triggerDescription",
                      amount_minor::text as "amountMinor", currency, due_date::text as "dueDate",
                      status, generated_invoice_id::text as "generatedInvoiceId",
                      idempotency_key as "idempotencyKey", created_at as "createdAt"
               from public.invoice_schedules
               where workspace_id = $1`;
    if (projectId) {
      params.push(projectId);
      sql += ` and project_id = $${params.length}`;
    }
    sql += " order by created_at asc";
    const result = await this.db.query<InvoiceScheduleRecord>(sql, params);
    return result.rows;
  }

  async createInvoiceSchedule(input: InvoiceScheduleRecord) {
    await this.db.query(
      `insert into public.invoice_schedules
        (id, workspace_id, project_id, contract_schedule_item_id, schedule_type, label,
         trigger_description, amount_minor, currency, due_date, status,
         generated_invoice_id, idempotency_key)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        input.id,
        input.workspaceId,
        input.projectId,
        input.contractScheduleItemId ?? null,
        input.scheduleType,
        input.label,
        input.triggerDescription,
        input.amountMinor,
        input.currency,
        input.dueDate ?? null,
        input.status,
        input.generatedInvoiceId ?? null,
        input.idempotencyKey ?? null,
      ],
    );
    return input;
  }

  async markScheduleGenerated(
    workspaceId: string,
    scheduleId: string,
    invoiceId: string,
  ) {
    await this.db.query(
      `update public.invoice_schedules
       set status = 'generated', generated_invoice_id = $3
       where workspace_id = $1 and id = $2`,
      [workspaceId, scheduleId, invoiceId],
    );
    const rows = await this.listInvoiceSchedules(workspaceId);
    const row = rows.find((item) => item.id === scheduleId);
    if (!row) throw new Error("Invoice schedule not found.");
    return row;
  }

  async createInvoice(input: InvoiceRecord) {
    await this.db.query(
      `insert into public.invoices
        (id, workspace_id, project_id, client_id, opportunity_id, invoice_number, status,
         currency, subtotal_minor, discount_minor, tax_minor, total_minor,
         amount_paid_minor, balance_due_minor, issue_date, due_date, payment_terms_days,
         notes, client_snapshot, revision, idempotency_key)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        input.id,
        input.workspaceId,
        input.projectId,
        input.clientId,
        input.opportunityId,
        input.invoiceNumber ?? null,
        input.status,
        input.currency,
        input.subtotalMinor,
        input.discountMinor,
        input.taxMinor,
        input.totalMinor,
        input.amountPaidMinor,
        input.balanceDueMinor,
        input.issueDate ?? null,
        input.dueDate ?? null,
        input.paymentTermsDays,
        input.notes,
        JSON.stringify(input.clientSnapshot),
        input.revision,
        input.idempotencyKey ?? null,
      ],
    );
    return input;
  }

  private async loadInvoiceDetail(
    workspaceId: string,
    invoiceId: string,
  ): Promise<InvoiceDetail | undefined> {
    const header = await this.db.query<InvoiceRecord>(
      `select id::text, workspace_id::text as "workspaceId", project_id::text as "projectId",
              client_id::text as "clientId", opportunity_id::text as "opportunityId",
              invoice_number as "invoiceNumber", status, currency,
              subtotal_minor::text as "subtotalMinor", discount_minor::text as "discountMinor",
              tax_minor::text as "taxMinor", total_minor::text as "totalMinor",
              amount_paid_minor::text as "amountPaidMinor",
              balance_due_minor::text as "balanceDueMinor",
              issue_date::text as "issueDate", due_date::text as "dueDate",
              payment_terms_days as "paymentTermsDays", notes,
              client_snapshot as "clientSnapshot", revision,
              idempotency_key as "idempotencyKey", created_at as "createdAt",
              updated_at as "updatedAt"
       from public.invoices
       where workspace_id = $1 and id = $2`,
      [workspaceId, invoiceId],
    );
    const base = header.rows[0];
    if (!base) return undefined;
    const lineItems = await this.db.query<InvoiceLineItemRecord>(
      `select id::text, workspace_id::text as "workspaceId", invoice_id::text as "invoiceId",
              line_type as "lineType", description, quantity::text, unit_amount_minor::text as "unitAmountMinor",
              amount_minor::text as "amountMinor", source_type as "sourceType",
              source_id::text as "sourceId", sort_order as "sortOrder"
       from public.invoice_line_items
       where workspace_id = $1 and invoice_id = $2
       order by sort_order asc`,
      [workspaceId, invoiceId],
    );
    const versions = await this.db.query<InvoiceVersionRecord>(
      `select id::text, version_number as "versionNumber", snapshot,
              document_hash as "documentHash", issued_at as "issuedAt",
              issued_by::text as "issuedBy"
       from public.invoice_versions
       where workspace_id = $1 and invoice_id = $2
       order by version_number asc`,
      [workspaceId, invoiceId],
    );
    return {
      ...base,
      lineItems: lineItems.rows,
      versions: versions.rows,
    };
  }

  async getInvoice(workspaceId: string, id: string) {
    return this.loadInvoiceDetail(workspaceId, id);
  }

  async listInvoices(workspaceId: string, filters?: InvoiceFilters) {
    const params: unknown[] = [workspaceId];
    const clauses = ["workspace_id = $1"];
    if (filters?.projectId) {
      params.push(filters.projectId);
      clauses.push(`project_id = $${params.length}`);
    }
    if (filters?.clientId) {
      params.push(filters.clientId);
      clauses.push(`client_id = $${params.length}`);
    }
    if (filters?.status != null) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      params.push(statuses);
      clauses.push(`status = any($${params.length}::text[])`);
    }
    const result = await this.db.query<InvoiceRecord>(
      `select id::text, workspace_id::text as "workspaceId", project_id::text as "projectId",
              client_id::text as "clientId", opportunity_id::text as "opportunityId",
              invoice_number as "invoiceNumber", status, currency,
              subtotal_minor::text as "subtotalMinor", discount_minor::text as "discountMinor",
              tax_minor::text as "taxMinor", total_minor::text as "totalMinor",
              amount_paid_minor::text as "amountPaidMinor",
              balance_due_minor::text as "balanceDueMinor",
              issue_date::text as "issueDate", due_date::text as "dueDate",
              payment_terms_days as "paymentTermsDays", notes,
              client_snapshot as "clientSnapshot", revision,
              idempotency_key as "idempotencyKey", created_at as "createdAt",
              updated_at as "updatedAt"
       from public.invoices
       where ${clauses.join(" and ")}
       order by created_at desc`,
      params,
    );
    return result.rows;
  }

  async updateInvoice(
    workspaceId: string,
    id: string,
    partial: Partial<Omit<InvoiceRecord, "id" | "workspaceId">>,
  ) {
    const current = await this.getInvoice(workspaceId, id);
    if (!current) throw new Error("Invoice not found.");
    if (ISSUED_INVOICE_STATUSES.includes(current.status)) {
      throw new Error("Issued invoices cannot be edited.");
    }
    await this.db.query(
      `update public.invoices
       set invoice_number = coalesce($3, invoice_number),
           status = coalesce($4, status),
           currency = coalesce($5, currency),
           subtotal_minor = coalesce($6, subtotal_minor),
           discount_minor = coalesce($7, discount_minor),
           tax_minor = coalesce($8, tax_minor),
           total_minor = coalesce($9, total_minor),
           amount_paid_minor = coalesce($10, amount_paid_minor),
           balance_due_minor = coalesce($11, balance_due_minor),
           issue_date = coalesce($12, issue_date),
           due_date = coalesce($13, due_date),
           payment_terms_days = coalesce($14, payment_terms_days),
           notes = coalesce($15, notes),
           client_snapshot = coalesce($16::jsonb, client_snapshot),
           revision = coalesce($17, revision),
           updated_at = now()
       where workspace_id = $1 and id = $2`,
      [
        workspaceId,
        id,
        partial.invoiceNumber ?? null,
        partial.status ?? null,
        partial.currency ?? null,
        partial.subtotalMinor ?? null,
        partial.discountMinor ?? null,
        partial.taxMinor ?? null,
        partial.totalMinor ?? null,
        partial.amountPaidMinor ?? null,
        partial.balanceDueMinor ?? null,
        partial.issueDate ?? null,
        partial.dueDate ?? null,
        partial.paymentTermsDays ?? null,
        partial.notes ?? null,
        partial.clientSnapshot ? JSON.stringify(partial.clientSnapshot) : null,
        partial.revision ?? null,
      ],
    );
    return (await this.getInvoice(workspaceId, id))!;
  }

  async addInvoiceLineItems(
    workspaceId: string,
    invoiceId: string,
    items: readonly Omit<InvoiceLineItemRecord, "id">[],
  ) {
    const invoice = await this.getInvoice(workspaceId, invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (ISSUED_INVOICE_STATUSES.includes(invoice.status)) {
      throw new Error("Issued invoices cannot be edited.");
    }
    const created: InvoiceLineItemRecord[] = [];
    for (const item of items) {
      const result = await this.db.query<{ id: string }>(
        `insert into public.invoice_line_items
          (id, workspace_id, invoice_id, line_type, description, quantity,
           unit_amount_minor, amount_minor, source_type, source_id, sort_order)
         values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning id::text as id`,
        [
          workspaceId,
          invoiceId,
          item.lineType,
          item.description,
          item.quantity,
          item.unitAmountMinor,
          item.amountMinor,
          item.sourceType ?? null,
          item.sourceId ?? null,
          item.sortOrder,
        ],
      );
      created.push({
        ...item,
        id: result.rows[0]!.id,
        workspaceId,
        invoiceId,
      });
    }
    return created;
  }

  async replaceInvoiceLineItems(
    workspaceId: string,
    invoiceId: string,
    items: readonly Omit<InvoiceLineItemRecord, "id">[],
  ) {
    const invoice = await this.getInvoice(workspaceId, invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (ISSUED_INVOICE_STATUSES.includes(invoice.status)) {
      throw new Error("Issued invoices cannot be edited.");
    }
    await this.db.query(
      `delete from public.invoice_line_items
       where workspace_id = $1 and invoice_id = $2`,
      [workspaceId, invoiceId],
    );
    return this.addInvoiceLineItems(workspaceId, invoiceId, items);
  }

  async transitionInvoice(
    workspaceId: string,
    id: string,
    status: InvoiceStatus,
  ) {
    const current = await this.getInvoice(workspaceId, id);
    if (!current) throw new Error("Invoice not found.");
    assertTransition("invoice", current.status, status, INVOICE_TRANSITIONS);
    await this.db.query(
      `update public.invoices
       set status = $3, updated_at = now()
       where workspace_id = $1 and id = $2`,
      [workspaceId, id, status],
    );
    return (await this.getInvoice(workspaceId, id))!;
  }

  async issueInvoice(
    workspaceId: string,
    id: string,
    issuedBy: string | undefined,
    snapshot: Record<string, unknown>,
    documentHash: string,
  ) {
    await this.db.query("begin", []);
    try {
      const reserved = await this.db.query<{
        invoicePrefix: string;
        sequence: number;
      }>(
        `update public.workspace_billing_settings wbs
         set next_invoice_sequence = wbs.next_invoice_sequence + 1,
             updated_at = now()
         from public.invoices i
         where wbs.workspace_id = i.workspace_id
           and i.workspace_id = $1 and i.id = $2
           and i.status = 'approved'
           and i.invoice_number is null
         returning wbs.invoice_prefix as "invoicePrefix",
                   wbs.next_invoice_sequence - 1 as sequence`,
        [workspaceId, id],
      );
      const reservedRow = reserved.rows[0];
      const assignedNumber = reservedRow
        ? formatInvoiceNumber(reservedRow.invoicePrefix, reservedRow.sequence)
        : null;

      const updated = await this.db.query<{ revision: number }>(
        `update public.invoices i
         set status = 'issued',
             invoice_number = coalesce(i.invoice_number, $3),
             issue_date = coalesce(i.issue_date, current_date),
             due_date = coalesce(
               i.due_date,
               (coalesce(i.issue_date, current_date)
                 + (i.payment_terms_days || ' days')::interval)::date
             ),
             balance_due_minor = i.total_minor - i.amount_paid_minor,
             updated_at = now()
         where i.workspace_id = $1 and i.id = $2 and i.status = 'approved'
         returning i.revision`,
        [workspaceId, id, assignedNumber],
      );
      const revision = updated.rows[0]?.revision;
      if (revision == null) {
        throw new Error("Only approved invoices can be issued.");
      }

      await this.db.query(
        `insert into public.invoice_versions
          (id, workspace_id, invoice_id, version_number, snapshot, document_hash, issued_by)
         values (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, $6)`,
        [
          workspaceId,
          id,
          revision,
          JSON.stringify(snapshot),
          documentHash,
          issuedBy ?? null,
        ],
      );

      await this.db.query("commit", []);
    } catch (error) {
      await this.db.query("rollback", []);
      throw error;
    }

    const detail = await this.getInvoice(workspaceId, id);
    if (!detail || detail.status !== "issued") {
      throw new Error("Invoice issue failed.");
    }
    return detail;
  }

  async voidInvoice(workspaceId: string, id: string) {
    return this.transitionInvoice(workspaceId, id, "void");
  }

  async lockTimeEntriesForInvoice(
    workspaceId: string,
    ids: readonly string[],
    invoiceId: string,
  ) {
    for (const id of ids) {
      const result = await this.db.query(
        `update public.time_entries
         set status = 'invoiced', invoice_id = $3, updated_at = now()
         where workspace_id = $1 and id = $2 and status = 'approved'`,
        [workspaceId, id, invoiceId],
      );
      void result;
    }
  }

  async lockExpensesForInvoice(
    workspaceId: string,
    ids: readonly string[],
    invoiceId: string,
  ) {
    for (const id of ids) {
      const result = await this.db.query(
        `update public.expenses
         set status = 'invoiced', invoice_id = $3, updated_at = now()
         where workspace_id = $1 and id = $2 and status = 'approved'`,
        [workspaceId, id, invoiceId],
      );
      void result;
    }
  }

  async recordPayment(
    input: PaymentRecord & { readonly idempotencyKey?: string },
  ) {
    if (input.idempotencyKey) {
      const existing = await this.db.query<PaymentRecord>(
        `select id::text, workspace_id::text as "workspaceId", payment_date::text as "paymentDate",
                amount_minor::text as "amountMinor", currency, payment_method as "paymentMethod",
                external_reference as "externalReference", notes, status,
                idempotency_key as "idempotencyKey", reversed_at as "reversedAt",
                created_at as "createdAt"
         from public.payments
         where workspace_id = $1 and idempotency_key = $2`,
        [input.workspaceId, input.idempotencyKey],
      );
      if (existing.rows[0]) return existing.rows[0];
    }
    await this.db.query(
      `insert into public.payments
        (id, workspace_id, payment_date, amount_minor, currency, payment_method,
         external_reference, notes, status, idempotency_key)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        input.id,
        input.workspaceId,
        input.paymentDate,
        input.amountMinor,
        input.currency,
        input.paymentMethod,
        input.externalReference,
        input.notes,
        input.status,
        input.idempotencyKey ?? null,
      ],
    );
    return input;
  }

  async createPaymentAllocation(input: PaymentAllocationRecord) {
    const invoice = await this.getInvoice(input.workspaceId, input.invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    await this.db.query(
      `insert into public.payment_allocations
        (id, workspace_id, payment_id, invoice_id, amount_minor)
       values ($1,$2,$3,$4,$5)`,
      [
        input.id,
        input.workspaceId,
        input.paymentId,
        input.invoiceId,
        input.amountMinor,
      ],
    );
    const amountPaidMinor = (
      BigInt(invoice.amountPaidMinor) + BigInt(input.amountMinor)
    ).toString();
    const balanceDueMinor = (
      BigInt(invoice.totalMinor) - BigInt(amountPaidMinor)
    ).toString();
    const status = invoiceStatusAfterPayment({
      current: invoice.status,
      balanceDueMinor: BigInt(balanceDueMinor),
    });
    await this.db.query(
      `update public.invoices
       set amount_paid_minor = $3,
           balance_due_minor = $4,
           status = $5,
           updated_at = now()
       where workspace_id = $1 and id = $2`,
      [
        input.workspaceId,
        input.invoiceId,
        amountPaidMinor,
        balanceDueMinor,
        status,
      ],
    );
    return input;
  }

  async getFinancialSummary(workspaceId: string) {
    const invoiceAgg = await this.db.query<{
      invoicedMinor: string;
      collectedMinor: string;
      outstandingMinor: string;
      overdueMinor: string;
      draftInvoiceCount: number;
    }>(
      `select
         coalesce(sum(total_minor) filter (
           where status in ('issued','partially_paid','paid','overdue')
         ), 0)::text as "invoicedMinor",
         coalesce(sum(amount_paid_minor) filter (
           where status in ('issued','partially_paid','paid','overdue')
         ), 0)::text as "collectedMinor",
         coalesce(sum(balance_due_minor) filter (
           where status in ('issued','partially_paid','overdue')
         ), 0)::text as "outstandingMinor",
         coalesce(sum(balance_due_minor) filter (
           where status in ('issued','partially_paid','overdue')
             and due_date < current_date
         ), 0)::text as "overdueMinor",
         count(*) filter (where status = 'draft')::int as "draftInvoiceCount"
       from public.invoices
       where workspace_id = $1`,
      [workspaceId],
    );
    const timeAgg = await this.db.query<{ minutes: number }>(
      `select coalesce(sum(duration_minutes), 0)::int as minutes
       from public.time_entries
       where workspace_id = $1
         and status = 'approved'
         and billable = true
         and invoice_id is null`,
      [workspaceId],
    );
    const expenseAgg = await this.db.query<{ totalMinor: string }>(
      `select coalesce(sum(amount_minor + tax_amount_minor), 0)::text as "totalMinor"
       from public.expenses
       where workspace_id = $1
         and status = 'approved'
         and billable = true
         and invoice_id is null`,
      [workspaceId],
    );
    const summary = invoiceAgg.rows[0]!;
    return {
      invoicedMinor: summary.invoicedMinor,
      collectedMinor: summary.collectedMinor,
      outstandingMinor: summary.outstandingMinor,
      overdueMinor: summary.overdueMinor,
      draftInvoiceCount: summary.draftInvoiceCount,
      unbilledApprovedTimeMinutes: timeAgg.rows[0]?.minutes ?? 0,
      unbilledApprovedExpenseMinor: expenseAgg.rows[0]?.totalMinor ?? "0",
    };
  }

  async getProjectProfitability(
    workspaceId: string,
    projectId: string,
    includeLabourCost: boolean,
  ) {
    const invoiceAgg = await this.db.query<{ invoicedMinor: string }>(
      `select coalesce(sum(total_minor), 0)::text as "invoicedMinor"
       from public.invoices
       where workspace_id = $1
         and project_id = $2
         and status in ('issued','partially_paid','paid','overdue')`,
      [workspaceId, projectId],
    );
    const expenseAgg = await this.db.query<{ expenseCostMinor: string }>(
      `select coalesce(sum(amount_minor + tax_amount_minor), 0)::text as "expenseCostMinor"
       from public.expenses
       where workspace_id = $1
         and project_id = $2
         and status in ('approved', 'invoiced')`,
      [workspaceId, projectId],
    );
    let labourCostMinorValue = 0n;
    if (includeLabourCost) {
      const timeRows = await this.listTimeEntries(workspaceId, { projectId });
      for (const row of timeRows) {
        if (
          (row.status === "approved" || row.status === "invoiced") &&
          row.hourlyRateMinor
        ) {
          labourCostMinorValue += labourCostMinor(
            row.durationMinutes,
            BigInt(row.hourlyRateMinor),
          );
        }
      }
    }
    const invoicedMinor = invoiceAgg.rows[0]?.invoicedMinor ?? "0";
    const expenseCostMinor = expenseAgg.rows[0]?.expenseCostMinor ?? "0";
    const profitability = projectProfitability({
      invoicedMinor: BigInt(invoicedMinor),
      labourCostMinor: labourCostMinorValue,
      expenseCostMinor: BigInt(expenseCostMinor),
    });
    return {
      projectId,
      invoicedMinor,
      ...(includeLabourCost
        ? { labourCostMinor: labourCostMinorValue.toString() }
        : {}),
      expenseCostMinor,
      grossProfitMinor: profitability.grossProfitMinor.toString(),
      grossMarginBps: profitability.grossMarginBps,
    };
  }

  async getReceivablesAging(workspaceId: string) {
    const rows = await this.db.query<{
      dueDate: string | null;
      balanceDueMinor: string;
    }>(
      `select due_date::text as "dueDate", balance_due_minor::text as "balanceDueMinor"
       from public.invoices
       where workspace_id = $1
         and status in ('issued','partially_paid','overdue')
         and balance_due_minor > 0`,
      [workspaceId],
    );
    const buckets = new Map<
      AgingBucketSummary["bucket"],
      { count: number; total: bigint }
    >([
      ["current", { count: 0, total: 0n }],
      ["1_30", { count: 0, total: 0n }],
      ["31_60", { count: 0, total: 0n }],
      ["61_90", { count: 0, total: 0n }],
      ["90_plus", { count: 0, total: 0n }],
    ]);
    for (const row of rows.rows) {
      const balance = BigInt(row.balanceDueMinor);
      const bucket = agingBucket(row.dueDate ?? new Date().toISOString());
      const current = buckets.get(bucket)!;
      buckets.set(bucket, {
        count: current.count + 1,
        total: current.total + balance,
      });
    }
    return [...buckets.entries()].map(([bucket, value]) => ({
      bucket,
      invoiceCount: value.count,
      balanceDueMinor: value.total.toString(),
    }));
  }

  async recordGuardDecision(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly invoiceId: string;
    readonly decision: "allow" | "deny" | "pending";
    readonly actorId?: string;
    readonly rationale?: string;
  }) {
    await this.db.query(
      `insert into public.finance_guard_decisions
        (id, workspace_id, invoice_id, decision, actor_id, rationale)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        input.id,
        input.workspaceId,
        input.invoiceId,
        input.decision,
        input.actorId ?? null,
        input.rationale ?? "",
      ],
    );
  }

  async recordFinanceActivity(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly actorId?: string;
    readonly eventType: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly metadata?: Record<string, unknown>;
  }) {
    await this.db.query(
      `insert into public.finance_activity_events
        (id, workspace_id, actor_id, event_type, target_type, target_id, metadata)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.id,
        input.workspaceId,
        input.actorId ?? null,
        input.eventType,
        input.targetType,
        input.targetId,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
