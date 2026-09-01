import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  allocatePaymentMinor,
  invoiceSubtotalMinor,
  invoiceTaxMinor,
  invoiceTotalMinor,
  nextExpenseStatus,
  nextInvoiceStatus,
  nextTimeEntryStatus,
  timeEntryBillableMinor,
} from "@flow/commercial";
import type {
  BillingSettingsRecord,
  CommercialRepository,
  ExpenseFilters,
  FinanceRepository,
  InvoiceDetail,
  InvoiceFilters,
  ProjectEngineRepository,
  ResourceCapacityRepository,
  TimeEntryFilters,
  TimeEntryRecord,
} from "@flow/database";
import {
  COMMERCIAL_REPOSITORY,
  FINANCE_REPOSITORY,
  PROJECT_ENGINE_REPOSITORY,
  RESOURCE_CAPACITY_REPOSITORY,
} from "../database/persistence.providers.js";
import type { TrustedExecutionContext } from "../security/flow-auth-context.js";

@Injectable()
export class FinanceService {
  constructor(
    @Inject(FINANCE_REPOSITORY)
    private readonly finance: FinanceRepository,
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercial: CommercialRepository,
    @Inject(PROJECT_ENGINE_REPOSITORY)
    private readonly projects: ProjectEngineRepository,
    @Inject(RESOURCE_CAPACITY_REPOSITORY)
    private readonly resources: ResourceCapacityRepository,
  ) {}

  private assert(identity: TrustedExecutionContext, permission: string) {
    if (!identity.permissionIds.includes(permission)) {
      throw new ForbiddenException("Missing required permission.");
    }
  }

  private hashDocument(payload: unknown): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  private async audit(
    identity: TrustedExecutionContext,
    eventType: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.commercial.recordAudit({
      eventId: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      actorId: identity.userId,
      eventType,
      targetType,
      targetId,
      metadata,
    });
    await this.finance.recordFinanceActivity({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      actorId: identity.userId,
      eventType,
      targetType,
      targetId,
      metadata,
    });
  }

  private guardContext(
    identity: TrustedExecutionContext,
    hasLineItems: boolean,
    guardAllowsIssue: boolean,
    isIssued: boolean,
  ) {
    return {
      hasLineItems,
      guardAllowsIssue,
      isIssued,
      actorCanManage: identity.permissionIds.includes("finance.invoice.manage"),
      actorCanApprove: identity.permissionIds.includes("finance.invoice.approve"),
    };
  }

  private timeEntryGuardContext(
    identity: TrustedExecutionContext,
    isLocked: boolean,
  ) {
    return {
      actorCanOwn: identity.permissionIds.includes("finance.time.own"),
      actorCanApprove: identity.permissionIds.includes("finance.time.approve"),
      isLocked,
    };
  }

  private expenseGuardContext(
    identity: TrustedExecutionContext,
    isLocked: boolean,
  ) {
    return {
      actorCanOwn: identity.permissionIds.includes("finance.expense.own"),
      actorCanApprove: identity.permissionIds.includes("finance.expense.approve"),
      isLocked,
    };
  }

  private assertTimeEntryRead(
    identity: TrustedExecutionContext,
    filters?: TimeEntryFilters,
  ): TimeEntryFilters | undefined {
    if (identity.permissionIds.includes("finance.time.read")) {
      return filters;
    }
    if (!identity.permissionIds.includes("finance.time.own")) {
      throw new ForbiddenException("Missing required permission.");
    }
    return {
      ...filters,
      submittedByMembershipId: identity.membershipId,
    };
  }

  private assertExpenseRead(
    identity: TrustedExecutionContext,
    filters?: ExpenseFilters,
  ): ExpenseFilters | undefined {
    if (identity.permissionIds.includes("finance.expense.read")) {
      return filters;
    }
    if (!identity.permissionIds.includes("finance.expense.own")) {
      throw new ForbiddenException("Missing required permission.");
    }
    return {
      ...filters,
      submittedByMembershipId: identity.membershipId,
    };
  }

  private async resolveHourlyRateMinor(
    identity: TrustedExecutionContext,
    entry: Pick<TimeEntryRecord, "resourceProfileId" | "hourlyRateMinor">,
  ): Promise<bigint | undefined> {
    if (entry.hourlyRateMinor) return BigInt(entry.hourlyRateMinor);
    if (!entry.resourceProfileId) return undefined;
    const resource = await this.resources.getResource(
      identity.workspaceId,
      entry.resourceProfileId,
      true,
    );
    return resource?.internalRateMinor
      ? BigInt(resource.internalRateMinor)
      : undefined;
  }

  async getBillingSettings(identity: TrustedExecutionContext) {
    this.assert(identity, "finance.invoice.read");
    return this.finance.getOrCreateBillingSettings(identity.workspaceId);
  }

  async updateBillingSettings(
    identity: TrustedExecutionContext,
    partial: Partial<
      Omit<BillingSettingsRecord, "workspaceId" | "updatedAt">
    >,
  ) {
    this.assert(identity, "finance.invoice.manage");
    const updated = await this.finance.updateBillingSettings(
      identity.workspaceId,
      partial,
    );
    await this.audit(
      identity,
      "finance.billing_settings.updated",
      "workspace_billing_settings",
      identity.workspaceId,
      { ...partial },
    );
    return updated;
  }

  async listTimeEntries(
    identity: TrustedExecutionContext,
    filters?: TimeEntryFilters,
  ) {
    const scoped = this.assertTimeEntryRead(identity, filters);
    return this.finance.listTimeEntries(identity.workspaceId, scoped);
  }

  async createTimeEntry(
    identity: TrustedExecutionContext,
    input: {
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
    },
  ) {
    this.assert(identity, "finance.time.own");
    const project = await this.projects.getProject(
      identity.workspaceId,
      input.projectId,
    );
    if (!project) throw new NotFoundException("Project not found.");
    if (project.status !== "active") {
      throw new BadRequestException("Project must be active.");
    }
    const settings = await this.finance.getOrCreateBillingSettings(
      identity.workspaceId,
    );
    const id = crypto.randomUUID();
    const created = await this.finance.createTimeEntry({
      id,
      workspaceId: identity.workspaceId,
      projectId: input.projectId,
      ...(input.taskId ? { taskId: input.taskId } : {}),
      ...(input.phaseId ? { phaseId: input.phaseId } : {}),
      ...(input.resourceProfileId
        ? { resourceProfileId: input.resourceProfileId }
        : {}),
      submittedByMembershipId: identity.membershipId,
      workDate: input.workDate,
      durationMinutes: input.durationMinutes,
      billable: input.billable,
      description: input.description,
      ...(input.hourlyRateMinor
        ? { hourlyRateMinor: input.hourlyRateMinor }
        : {}),
      currency: input.currency ?? settings.defaultCurrency,
      status: "draft",
    });
    await this.audit(identity, "finance.time_entry.created", "time_entry", id, {
      projectId: input.projectId,
    });
    return created;
  }

  async submitTimeEntry(identity: TrustedExecutionContext, id: string) {
    this.assert(identity, "finance.time.own");
    const current = await this.getOwnedTimeEntry(identity, id);
    const next = nextTimeEntryStatus(
      current.status,
      "SUBMIT",
      this.timeEntryGuardContext(identity, current.status === "invoiced"),
    );
    const updated = await this.finance.transitionTimeEntry(
      identity.workspaceId,
      id,
      next,
      { submittedAt: new Date().toISOString() },
    );
    await this.audit(identity, "finance.time_entry.submitted", "time_entry", id, {});
    return updated;
  }

  async approveTimeEntry(identity: TrustedExecutionContext, id: string) {
    this.assert(identity, "finance.time.approve");
    const current = await this.getTimeEntry(identity, id);
    const next = nextTimeEntryStatus(
      current.status,
      "APPROVE",
      this.timeEntryGuardContext(identity, current.status === "invoiced"),
    );
    const updated = await this.finance.transitionTimeEntry(
      identity.workspaceId,
      id,
      next,
      {
        approvedAt: new Date().toISOString(),
        approvedBy: identity.userId,
      },
    );
    await this.audit(identity, "finance.time_entry.approved", "time_entry", id, {});
    return updated;
  }

  async rejectTimeEntry(
    identity: TrustedExecutionContext,
    id: string,
    rejectionReason: string,
  ) {
    this.assert(identity, "finance.time.approve");
    const current = await this.getTimeEntry(identity, id);
    const next = nextTimeEntryStatus(
      current.status,
      "REJECT",
      this.timeEntryGuardContext(identity, current.status === "invoiced"),
    );
    const updated = await this.finance.transitionTimeEntry(
      identity.workspaceId,
      id,
      next,
      { rejectionReason },
    );
    await this.audit(identity, "finance.time_entry.rejected", "time_entry", id, {
      rejectionReason,
    });
    return updated;
  }

  async listExpenses(
    identity: TrustedExecutionContext,
    filters?: ExpenseFilters,
  ) {
    const scoped = this.assertExpenseRead(identity, filters);
    return this.finance.listExpenses(identity.workspaceId, scoped);
  }

  async createExpense(
    identity: TrustedExecutionContext,
    input: {
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
    },
  ) {
    this.assert(identity, "finance.expense.own");
    const project = await this.projects.getProject(
      identity.workspaceId,
      input.projectId,
    );
    if (!project) throw new NotFoundException("Project not found.");
    if (project.status !== "active") {
      throw new BadRequestException("Project must be active.");
    }
    const settings = await this.finance.getOrCreateBillingSettings(
      identity.workspaceId,
    );
    const id = crypto.randomUUID();
    const created = await this.finance.createExpense({
      id,
      workspaceId: identity.workspaceId,
      projectId: input.projectId,
      submittedByMembershipId: identity.membershipId,
      vendorName: input.vendorName,
      expenseDate: input.expenseDate,
      description: input.description,
      category: input.category,
      amountMinor: input.amountMinor,
      taxAmountMinor: input.taxAmountMinor ?? "0",
      currency: input.currency ?? settings.defaultCurrency,
      billable: input.billable,
      receiptReference: input.receiptReference ?? "",
      status: "draft",
    });
    await this.audit(identity, "finance.expense.created", "expense", id, {
      projectId: input.projectId,
    });
    return created;
  }

  async submitExpense(identity: TrustedExecutionContext, id: string) {
    this.assert(identity, "finance.expense.own");
    const current = await this.getOwnedExpense(identity, id);
    const next = nextExpenseStatus(
      current.status,
      "SUBMIT",
      this.expenseGuardContext(identity, current.status === "invoiced"),
    );
    const updated = await this.finance.transitionExpense(
      identity.workspaceId,
      id,
      next,
      { submittedAt: new Date().toISOString() },
    );
    await this.audit(identity, "finance.expense.submitted", "expense", id, {});
    return updated;
  }

  async approveExpense(identity: TrustedExecutionContext, id: string) {
    this.assert(identity, "finance.expense.approve");
    const current = await this.getExpense(identity, id);
    const next = nextExpenseStatus(
      current.status,
      "APPROVE",
      this.expenseGuardContext(identity, current.status === "invoiced"),
    );
    const updated = await this.finance.transitionExpense(
      identity.workspaceId,
      id,
      next,
      {
        approvedAt: new Date().toISOString(),
        approvedBy: identity.userId,
      },
    );
    await this.audit(identity, "finance.expense.approved", "expense", id, {});
    return updated;
  }

  async rejectExpense(
    identity: TrustedExecutionContext,
    id: string,
    rejectionReason: string,
  ) {
    this.assert(identity, "finance.expense.approve");
    const current = await this.getExpense(identity, id);
    const next = nextExpenseStatus(
      current.status,
      "REJECT",
      this.expenseGuardContext(identity, current.status === "invoiced"),
    );
    const updated = await this.finance.transitionExpense(
      identity.workspaceId,
      id,
      next,
      { rejectionReason },
    );
    await this.audit(identity, "finance.expense.rejected", "expense", id, {
      rejectionReason,
    });
    return updated;
  }

  async listInvoiceSchedules(
    identity: TrustedExecutionContext,
    projectId?: string,
  ) {
    this.assert(identity, "finance.invoice.read");
    return this.finance.listInvoiceSchedules(identity.workspaceId, projectId);
  }

  async generateDraftInvoice(
    identity: TrustedExecutionContext,
    projectId: string,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "finance.invoice.manage");
    if (idempotencyKey) {
      const replay = await this.commercial.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "finance.invoice.generate_draft",
        fingerprint: projectId,
      });
      if (replay === "replay") {
        const existing = (
          await this.finance.listInvoices(identity.workspaceId, { projectId })
        ).find((row) => row.idempotencyKey === idempotencyKey);
        if (existing) {
          return (await this.finance.getInvoice(
            identity.workspaceId,
            existing.id,
          ))!;
        }
      }
    }
    const project = await this.projects.getProject(identity.workspaceId, projectId);
    if (!project) throw new NotFoundException("Project not found.");
    if (project.status !== "active") {
      throw new BadRequestException("Project must be active.");
    }
    const opportunity = await this.commercial.getOpportunity(
      identity.workspaceId,
      project.opportunityId,
    );
    if (!opportunity) {
      throw new BadRequestException("Opportunity not found for project.");
    }
    const client = await this.commercial.getClient(
      identity.workspaceId,
      opportunity.clientId,
    );
    const settings = await this.finance.getOrCreateBillingSettings(
      identity.workspaceId,
    );
    const timeRows = await this.finance.listTimeEntries(identity.workspaceId, {
      projectId,
      status: "approved",
      billable: true,
      invoiceId: null,
    });
    const expenseRows = await this.finance.listExpenses(identity.workspaceId, {
      projectId,
      status: "approved",
      billable: true,
      invoiceId: null,
    });
    if (timeRows.length === 0 && expenseRows.length === 0) {
      throw new BadRequestException("No approved billable work to invoice.");
    }

    const lineItemInputs: Array<{
      lineType: "time" | "expense";
      description: string;
      quantity: string;
      unitAmountMinor: string;
      amountMinor: string;
      sourceType: string;
      sourceId: string;
      sortOrder: number;
    }> = [];

    let sortOrder = 0;
    for (const entry of timeRows) {
      const rate = await this.resolveHourlyRateMinor(identity, entry);
      if (!rate) continue;
      const amountMinor = timeEntryBillableMinor({
        durationMinutes: entry.durationMinutes,
        hourlyRateMinor: rate,
      });
      lineItemInputs.push({
        lineType: "time",
        description: `${entry.description} (${entry.workDate})`,
        quantity: "1",
        unitAmountMinor: amountMinor.toString(),
        amountMinor: amountMinor.toString(),
        sourceType: "time_entry",
        sourceId: entry.id,
        sortOrder: sortOrder++,
      });
    }
    for (const expense of expenseRows) {
      const amountMinor = (
        BigInt(expense.amountMinor) + BigInt(expense.taxAmountMinor)
      ).toString();
      lineItemInputs.push({
        lineType: "expense",
        description: `${expense.vendorName}: ${expense.description}`,
        quantity: "1",
        unitAmountMinor: amountMinor,
        amountMinor,
        sourceType: "expense",
        sourceId: expense.id,
        sortOrder: sortOrder++,
      });
    }
    if (lineItemInputs.length === 0) {
      throw new BadRequestException("No billable amounts available to invoice.");
    }

    const calcLines = lineItemInputs.map((line) => ({
      description: line.description,
      quantity: 1n,
      unitAmountMinor: BigInt(line.unitAmountMinor),
    }));
    const subtotalMinor = invoiceSubtotalMinor(calcLines);
    const discountMinor = 0n;
    const taxMinor = invoiceTaxMinor({
      taxableMinor: subtotalMinor - discountMinor,
      taxBps: settings.defaultTaxBps,
      taxInclusive: settings.taxInclusive,
    });
    const totalMinor = invoiceTotalMinor({
      subtotalMinor,
      discountMinor,
      taxMinor,
    });

    const invoiceId = crypto.randomUUID();
    await this.finance.createInvoice({
      id: invoiceId,
      workspaceId: identity.workspaceId,
      projectId,
      clientId: opportunity.clientId,
      opportunityId: project.opportunityId,
      status: "draft",
      currency: project.currency ?? settings.defaultCurrency,
      subtotalMinor: subtotalMinor.toString(),
      discountMinor: discountMinor.toString(),
      taxMinor: taxMinor.toString(),
      totalMinor: totalMinor.toString(),
      amountPaidMinor: "0",
      balanceDueMinor: totalMinor.toString(),
      paymentTermsDays: settings.defaultPaymentTermsDays,
      notes: settings.invoiceFooterNotes,
      clientSnapshot: client
        ? { id: client.id, name: client.name, industry: client.industry ?? "" }
        : { id: opportunity.clientId },
      revision: 1,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
    await this.finance.addInvoiceLineItems(
      identity.workspaceId,
      invoiceId,
      lineItemInputs.map((line) => ({
        workspaceId: identity.workspaceId,
        invoiceId,
        lineType: line.lineType,
        description: line.description,
        quantity: line.quantity,
        unitAmountMinor: line.unitAmountMinor,
        amountMinor: line.amountMinor,
        sourceType: line.sourceType,
        sourceId: line.sourceId,
        sortOrder: line.sortOrder,
      })),
    );
    const detail = (await this.finance.getInvoice(
      identity.workspaceId,
      invoiceId,
    ))!;
    await this.audit(
      identity,
      "finance.invoice.draft_generated",
      "invoice",
      invoiceId,
      { projectId, lineCount: lineItemInputs.length },
    );
    return detail;
  }

  async getInvoice(identity: TrustedExecutionContext, id: string) {
    this.assert(identity, "finance.invoice.read");
    const invoice = await this.finance.getInvoice(identity.workspaceId, id);
    if (!invoice) throw new NotFoundException("Invoice not found.");
    return invoice;
  }

  async listInvoices(
    identity: TrustedExecutionContext,
    filters?: InvoiceFilters,
  ) {
    this.assert(identity, "finance.invoice.read");
    return this.finance.listInvoices(identity.workspaceId, filters);
  }

  async submitInvoiceReview(identity: TrustedExecutionContext, id: string) {
    this.assert(identity, "finance.invoice.manage");
    const invoice = await this.getInvoice(identity, id);
    const next = nextInvoiceStatus(
      invoice.status,
      "SUBMIT_REVIEW",
      this.guardContext(
        identity,
        invoice.lineItems.length > 0,
        true,
        invoice.status === "issued",
      ),
    );
    const updated = await this.finance.transitionInvoice(
      identity.workspaceId,
      id,
      next,
    );
    await this.audit(
      identity,
      "finance.invoice.submitted_for_review",
      "invoice",
      id,
      {},
    );
    return updated;
  }

  async requestInvoiceChanges(
    identity: TrustedExecutionContext,
    id: string,
    rationale?: string,
  ) {
    this.assert(identity, "finance.invoice.approve");
    const invoice = await this.getInvoice(identity, id);
    const next = nextInvoiceStatus(
      invoice.status,
      "REQUEST_CHANGES",
      this.guardContext(
        identity,
        invoice.lineItems.length > 0,
        true,
        invoice.status === "issued",
      ),
    );
    const updated = await this.finance.transitionInvoice(
      identity.workspaceId,
      id,
      next,
    );
    await this.audit(
      identity,
      "finance.invoice.changes_requested",
      "invoice",
      id,
      { ...(rationale ? { rationale } : {}) },
    );
    return updated;
  }

  async approveInvoice(identity: TrustedExecutionContext, id: string) {
    this.assert(identity, "finance.invoice.approve");
    const invoice = await this.getInvoice(identity, id);
    const next = nextInvoiceStatus(
      invoice.status,
      "APPROVE",
      this.guardContext(
        identity,
        invoice.lineItems.length > 0,
        true,
        invoice.status === "issued",
      ),
    );
    const updated = await this.finance.transitionInvoice(
      identity.workspaceId,
      id,
      next,
    );
    await this.audit(identity, "finance.invoice.approved", "invoice", id, {});
    return updated;
  }

  async issueInvoice(
    identity: TrustedExecutionContext,
    id: string,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "finance.invoice.approve");
    if (idempotencyKey) {
      const replay = await this.commercial.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "finance.invoice.issue",
        fingerprint: id,
      });
      if (replay === "replay") {
        return this.getInvoice(identity, id);
      }
    }
    const invoice = await this.getInvoice(identity, id);
    const next = nextInvoiceStatus(
      invoice.status,
      "ISSUE",
      this.guardContext(
        identity,
        invoice.lineItems.length > 0,
        true,
        invoice.status === "issued",
      ),
    );
    if (next !== "issued") {
      throw new BadRequestException("Invoice is not ready to issue.");
    }
    await this.finance.recordGuardDecision({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      invoiceId: id,
      decision: "allow",
      actorId: identity.userId,
      rationale: "Founder approved invoice issue.",
    });
    const timeEntryIds = invoice.lineItems
      .filter((line) => line.sourceType === "time_entry" && line.sourceId)
      .map((line) => line.sourceId!);
    const expenseIds = invoice.lineItems
      .filter((line) => line.sourceType === "expense" && line.sourceId)
      .map((line) => line.sourceId!);
    if (timeEntryIds.length > 0) {
      await this.finance.lockTimeEntriesForInvoice(
        identity.workspaceId,
        timeEntryIds,
        id,
      );
    }
    if (expenseIds.length > 0) {
      await this.finance.lockExpensesForInvoice(
        identity.workspaceId,
        expenseIds,
        id,
      );
    }
    const snapshot = {
      invoice: {
        id: invoice.id,
        projectId: invoice.projectId,
        clientId: invoice.clientId,
        currency: invoice.currency,
        subtotalMinor: invoice.subtotalMinor,
        discountMinor: invoice.discountMinor,
        taxMinor: invoice.taxMinor,
        totalMinor: invoice.totalMinor,
        paymentTermsDays: invoice.paymentTermsDays,
        notes: invoice.notes,
        clientSnapshot: invoice.clientSnapshot,
        revision: invoice.revision,
      },
      lineItems: invoice.lineItems,
    };
    const issued = await this.finance.issueInvoice(
      identity.workspaceId,
      id,
      identity.userId,
      snapshot,
      this.hashDocument(snapshot),
    );
    await this.audit(identity, "finance.invoice.issued", "invoice", id, {
      invoiceNumber: issued.invoiceNumber,
    });
    return issued;
  }

  async voidInvoice(identity: TrustedExecutionContext, id: string) {
    this.assert(identity, "finance.invoice.approve");
    const invoice = await this.getInvoice(identity, id);
    const next = nextInvoiceStatus(
      invoice.status,
      "VOID",
      this.guardContext(
        identity,
        invoice.lineItems.length > 0,
        true,
        ["issued", "partially_paid", "paid", "overdue"].includes(invoice.status),
      ),
    );
    const updated = await this.finance.transitionInvoice(
      identity.workspaceId,
      id,
      next,
    );
    await this.audit(identity, "finance.invoice.voided", "invoice", id, {});
    return updated;
  }

  async recordPayment(
    identity: TrustedExecutionContext,
    input: {
      paymentDate: string;
      amountMinor: string;
      currency: string;
      paymentMethod: string;
      externalReference?: string;
      notes?: string;
      allocations: readonly {
        invoiceId: string;
        amountMinor: string;
      }[];
      idempotencyKey?: string;
    },
  ) {
    this.assert(identity, "finance.payment.record");
    if (input.allocations.length === 0) {
      throw new BadRequestException("At least one allocation is required.");
    }
    const paymentAmountMinor = BigInt(input.amountMinor);
    const allocationTotal = input.allocations.reduce(
      (sum, row) => sum + BigInt(row.amountMinor),
      0n,
    );
    if (allocationTotal !== paymentAmountMinor) {
      throw new BadRequestException(
        "Allocation total must equal payment amount.",
      );
    }

    const invoices = new Map<string, InvoiceDetail>();
    const allocatedByInvoice = new Map<string, bigint>();
    for (const allocation of input.allocations) {
      let invoice = invoices.get(allocation.invoiceId);
      if (!invoice) {
        invoice = await this.getInvoice(identity, allocation.invoiceId);
        invoices.set(allocation.invoiceId, invoice);
      }
      if (
        invoice.status !== "issued" &&
        invoice.status !== "partially_paid" &&
        invoice.status !== "overdue"
      ) {
        throw new BadRequestException(
          "Payments can only be allocated to issued invoices.",
        );
      }
      const existingAllocationsMinor =
        allocatedByInvoice.get(allocation.invoiceId) ?? 0n;
      allocatePaymentMinor({
        paymentAmountMinor: BigInt(allocation.amountMinor),
        invoiceBalanceDueMinor: BigInt(invoice.balanceDueMinor),
        existingAllocationsMinor,
      });
      allocatedByInvoice.set(
        allocation.invoiceId,
        existingAllocationsMinor + BigInt(allocation.amountMinor),
      );
    }

    const paymentId = crypto.randomUUID();
    const payment = await this.finance.recordPayment({
      id: paymentId,
      workspaceId: identity.workspaceId,
      paymentDate: input.paymentDate,
      amountMinor: input.amountMinor,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      externalReference: input.externalReference ?? "",
      notes: input.notes ?? "",
      status: "recorded",
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    });

    const createdAllocations = [];
    for (const allocation of input.allocations) {
      const row = await this.finance.createPaymentAllocation({
        id: crypto.randomUUID(),
        workspaceId: identity.workspaceId,
        paymentId,
        invoiceId: allocation.invoiceId,
        amountMinor: allocation.amountMinor,
      });
      createdAllocations.push(row);
    }

    await this.audit(identity, "finance.payment.recorded", "payment", paymentId, {
      allocationCount: createdAllocations.length,
    });
    return { payment, allocations: createdAllocations };
  }

  async getFinancialSummary(identity: TrustedExecutionContext) {
    this.assert(identity, "finance.report.read");
    return this.finance.getFinancialSummary(identity.workspaceId);
  }

  async getProjectProfitability(
    identity: TrustedExecutionContext,
    projectId: string,
  ) {
    this.assert(identity, "finance.profitability.read");
    const includeLabourCost = identity.permissionIds.includes(
      "finance.profitability.read",
    );
    return this.finance.getProjectProfitability(
      identity.workspaceId,
      projectId,
      includeLabourCost,
    );
  }

  async getReceivablesAging(identity: TrustedExecutionContext) {
    this.assert(identity, "finance.report.read");
    return this.finance.getReceivablesAging(identity.workspaceId);
  }

  private async getTimeEntry(identity: TrustedExecutionContext, id: string) {
    const rows = await this.finance.listTimeEntries(identity.workspaceId);
    const row = rows.find((entry) => entry.id === id);
    if (!row) throw new NotFoundException("Time entry not found.");
    return row;
  }

  private async getOwnedTimeEntry(
    identity: TrustedExecutionContext,
    id: string,
  ) {
    const row = await this.getTimeEntry(identity, id);
    if (row.submittedByMembershipId !== identity.membershipId) {
      throw new ForbiddenException("Time entry belongs to another member.");
    }
    return row;
  }

  private async getExpense(identity: TrustedExecutionContext, id: string) {
    const rows = await this.finance.listExpenses(identity.workspaceId);
    const row = rows.find((entry) => entry.id === id);
    if (!row) throw new NotFoundException("Expense not found.");
    return row;
  }

  private async getOwnedExpense(identity: TrustedExecutionContext, id: string) {
    const row = await this.getExpense(identity, id);
    if (row.submittedByMembershipId !== identity.membershipId) {
      throw new ForbiddenException("Expense belongs to another member.");
    }
    return row;
  }
}
