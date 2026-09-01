import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  FlowRequestIdentityResolver,
  type TrustedExecutionContext,
} from "../security/flow-auth-context.js";
import { FinanceService } from "./finance.service.js";

class UpdateBillingSettingsDto {
  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextInvoiceSequence?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultPaymentTermsDays?: number;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultTaxBps?: number;

  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @IsOptional()
  @IsString()
  invoiceFooterNotes?: string;
}

class CreateTimeEntryDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsString()
  resourceProfileId?: string;

  @IsString()
  workDate!: string;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsBoolean()
  billable!: boolean;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsString()
  hourlyRateMinor?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

class RejectDto {
  @IsString()
  @MinLength(1)
  rejectionReason!: string;
}

class CreateExpenseDto {
  @IsString()
  projectId!: string;

  @IsString()
  @MinLength(1)
  vendorName!: string;

  @IsString()
  expenseDate!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  amountMinor!: string;

  @IsOptional()
  @IsString()
  taxAmountMinor?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsBoolean()
  billable!: boolean;

  @IsOptional()
  @IsString()
  receiptReference?: string;
}

class RequestChangesDto {
  @IsOptional()
  @IsString()
  rationale?: string;
}

class PaymentAllocationDto {
  @IsString()
  invoiceId!: string;

  @IsString()
  amountMinor!: string;
}

class RecordPaymentDto {
  @IsString()
  paymentDate!: string;

  @IsString()
  amountMinor!: string;

  @IsString()
  currency!: string;

  @IsString()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];
}

@Controller("api/v1/workspaces/:workspaceId/finance")
export class FinanceController {
  constructor(
    @Inject(FinanceService)
    private readonly service: FinanceService,
    @Inject(FlowRequestIdentityResolver)
    private readonly identityResolver: FlowRequestIdentityResolver,
  ) {}

  @Get("billing/settings")
  getBillingSettings(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getBillingSettings(id),
    );
  }

  @Patch("billing/settings")
  updateBillingSettings(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: UpdateBillingSettingsDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.updateBillingSettings(id, body),
    );
  }

  @Get("time-entries")
  listTimeEntries(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Query("projectId") projectId?: string,
    @Query("status") status?: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.listTimeEntries(id, {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status: status as never } : {}),
      }),
    );
  }

  @Post("time-entries")
  createTimeEntry(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateTimeEntryDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.createTimeEntry(id, body),
    );
  }

  @Post("time-entries/:entryId/submit")
  submitTimeEntry(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("entryId") entryId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.submitTimeEntry(id, entryId),
    );
  }

  @Post("time-entries/:entryId/approve")
  approveTimeEntry(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("entryId") entryId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.approveTimeEntry(id, entryId),
    );
  }

  @Post("time-entries/:entryId/reject")
  rejectTimeEntry(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("entryId") entryId: string,
    @Body() body: RejectDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.rejectTimeEntry(id, entryId, body.rejectionReason),
    );
  }

  @Get("expenses")
  listExpenses(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Query("projectId") projectId?: string,
    @Query("status") status?: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.listExpenses(id, {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status: status as never } : {}),
      }),
    );
  }

  @Post("expenses")
  createExpense(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateExpenseDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.createExpense(id, body),
    );
  }

  @Post("expenses/:expenseId/submit")
  submitExpense(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("expenseId") expenseId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.submitExpense(id, expenseId),
    );
  }

  @Post("expenses/:expenseId/approve")
  approveExpense(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("expenseId") expenseId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.approveExpense(id, expenseId),
    );
  }

  @Post("expenses/:expenseId/reject")
  rejectExpense(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("expenseId") expenseId: string,
    @Body() body: RejectDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.rejectExpense(id, expenseId, body.rejectionReason),
    );
  }

  @Get("invoice-schedules")
  listInvoiceSchedules(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Query("projectId") projectId?: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.listInvoiceSchedules(id, projectId),
    );
  }

  @Post("projects/:projectId/invoices/draft")
  generateDraftInvoice(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.generateDraftInvoice(id, projectId, idempotencyKey),
    );
  }

  @Get("invoices/:invoiceId")
  getInvoice(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("invoiceId") invoiceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getInvoice(id, invoiceId),
    );
  }

  @Get("invoices")
  listInvoices(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Query("projectId") projectId?: string,
    @Query("clientId") clientId?: string,
    @Query("status") status?: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.listInvoices(id, {
        ...(projectId ? { projectId } : {}),
        ...(clientId ? { clientId } : {}),
        ...(status ? { status: status as never } : {}),
      }),
    );
  }

  @Post("invoices/:invoiceId/submit-review")
  submitInvoiceReview(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("invoiceId") invoiceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.submitInvoiceReview(id, invoiceId),
    );
  }

  @Post("invoices/:invoiceId/request-changes")
  requestInvoiceChanges(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("invoiceId") invoiceId: string,
    @Body() body: RequestChangesDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.requestInvoiceChanges(id, invoiceId, body.rationale),
    );
  }

  @Post("invoices/:invoiceId/approve")
  approveInvoice(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("invoiceId") invoiceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.approveInvoice(id, invoiceId),
    );
  }

  @Post("invoices/:invoiceId/issue")
  issueInvoice(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("invoiceId") invoiceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.issueInvoice(id, invoiceId, idempotencyKey),
    );
  }

  @Post("invoices/:invoiceId/void")
  voidInvoice(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("invoiceId") invoiceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.voidInvoice(id, invoiceId),
    );
  }

  @Post("payments")
  recordPayment(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: RecordPaymentDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.recordPayment(id, {
        ...body,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      }),
    );
  }

  @Get("summary")
  getFinancialSummary(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getFinancialSummary(id),
    );
  }

  @Get("projects/:projectId/profitability")
  getProjectProfitability(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getProjectProfitability(id, projectId),
    );
  }

  @Get("receivables-aging")
  getReceivablesAging(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getReceivablesAging(id),
    );
  }

  private async withIdentity<T>(
    authorization: string | undefined,
    workspaceHeader: string | undefined,
    workspaceId: string,
    fn: (identity: TrustedExecutionContext) => Promise<T>,
  ): Promise<T> {
    const identity = await this.identityResolver.resolve({
      authorizationHeader: authorization,
      workspaceIdHeader: workspaceHeader ?? workspaceId,
    });
    if (identity.workspaceId !== workspaceId) {
      throw new UnauthorizedException("Workspace context mismatch.");
    }
    return fn(identity);
  }
}
