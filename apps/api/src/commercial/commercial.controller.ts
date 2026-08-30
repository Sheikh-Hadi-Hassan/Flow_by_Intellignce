import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  FlowRequestIdentityResolver,
  type TrustedExecutionContext,
} from "../security/flow-auth-context.js";
import { CommercialService } from "./commercial.service.js";

class CreateServiceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  pricingModel!: "retainer" | "project" | "hourly" | "hybrid";

  @IsString()
  currency!: string;
}

class CreateClientDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsString()
  contactFirstName!: string;

  @IsString()
  contactLastName!: string;

  @IsOptional()
  @IsString()
  contactTitle?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;
}

class CreateOpportunityDto {
  @IsString()
  clientId!: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsString()
  serviceId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  budgetMinMinor?: string;

  @IsOptional()
  @IsString()
  budgetMaxMinor?: string;
}

class CostComponentDto {
  @IsString()
  roleKey!: string;

  @IsInt()
  estimatedMinutes!: number;

  @IsString()
  internalRatePerHourMinor!: string;

  @IsString()
  vendorCostMinor!: string;
}

class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  pricingModel?: "retainer" | "project" | "hourly" | "hybrid";

  @IsOptional()
  @IsString()
  status?: "draft" | "active" | "archived";

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostComponentDto)
  costs?: CostComponentDto[];
}

class UpdateQuestionnaireDto {
  @IsOptional()
  jsonSchema?: Record<string, unknown>;

  @IsOptional()
  uiSchema?: Record<string, unknown>;

  @IsOptional()
  questionMeta?: Record<string, unknown>;
}

class UpdateDeliverableDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@Controller("api/v1/workspaces/:workspaceId/commercial")
export class CommercialController {
  constructor(
    @Inject(CommercialService)
    private readonly commercial: CommercialService,
    @Inject(FlowRequestIdentityResolver)
    private readonly identityResolver: FlowRequestIdentityResolver,
  ) {}

  @Post("services")
  createService(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateServiceDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.createService(identity, body),
    );
  }

  @Get("services")
  listServices(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.listServices(identity),
    );
  }

  @Get("services/:serviceId")
  getService(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("serviceId") serviceId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.getService(identity, serviceId),
    );
  }

  @Post("services/:serviceId")
  updateService(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("serviceId") serviceId: string,
    @Body() body: UpdateServiceDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.updateService(identity, serviceId, body),
    );
  }

  @Post("questionnaires/:versionId/draft")
  updateQuestionnaire(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
    @Body() body: UpdateQuestionnaireDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.updateDraftQuestionnaire(identity, versionId, {
          jsonSchema: body.jsonSchema ?? {},
          uiSchema: body.uiSchema ?? {},
          questionMeta: body.questionMeta ?? {},
        }),
    );
  }

  @Post("questionnaires/:versionId/publish")
  publish(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.publishQuestionnaire(
          identity,
          versionId,
          idempotencyKey,
        ),
    );
  }

  @Post("clients")
  createClient(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateClientDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.createClient(identity, {
          name: body.name,
          ...(body.industry ? { industry: body.industry } : {}),
          ...(body.website ? { website: body.website } : {}),
          contact: {
            firstName: body.contactFirstName,
            lastName: body.contactLastName,
            ...(body.contactTitle ? { title: body.contactTitle } : {}),
            ...(body.contactEmail ? { email: body.contactEmail } : {}),
          },
        }),
    );
  }

  @Get("clients")
  listClients(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.listClients(identity),
    );
  }

  @Get("clients/:clientId")
  getClient(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("clientId") clientId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.getClient(identity, clientId),
    );
  }

  @Post("opportunities")
  createOpportunity(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateOpportunityDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.createOpportunity(identity, body),
    );
  }

  @Get("opportunities")
  listOpportunities(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.listOpportunities(identity),
    );
  }

  @Get("opportunities/:opportunityId")
  getOpportunity(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.getOpportunityBundle(identity, opportunityId),
    );
  }

  @Post("opportunities/:opportunityId/answers")
  saveAnswers(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
    @Body() body: { answers?: Record<string, unknown> },
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.saveAnswers(
          identity,
          opportunityId,
          body.answers ?? {},
        ),
    );
  }

  @Post("opportunities/:opportunityId/notes")
  addNotes(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
    @Body() body: { notes?: string },
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.addDiscoveryNotes(
          identity,
          opportunityId,
          body.notes ?? "",
        ),
    );
  }

  @Post("opportunities/:opportunityId/analyze")
  analyzeDiscovery(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
    @Body() body: { sourceId?: string },
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.analyzeDiscovery(identity, opportunityId, {
          ...(body.sourceId ? { sourceId: body.sourceId } : {}),
          ...(idempotencyKey ? { idempotencyKey } : {}),
        }),
    );
  }

  @Post("facts/:factId/verify")
  verifyFact(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("factId") factId: string,
    @Body() body: { status?: "verified" | "rejected" },
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.verifyFact(
          identity,
          factId,
          body.status === "rejected" ? "rejected" : "verified",
        ),
    );
  }

  @Post("follow-ups/:questionId/answer")
  answerFollowUp(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("questionId") questionId: string,
    @Body() body: { answer?: string },
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.answerFollowUp(identity, questionId, body.answer ?? ""),
    );
  }

  @Post("risks/:riskId/handle")
  handleRisk(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("riskId") riskId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.handleRisk(identity, riskId),
    );
  }

  @Post("deliverables/:deliverableId")
  updateDeliverable(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("deliverableId") deliverableId: string,
    @Body() body: UpdateDeliverableDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.updateDeliverable(identity, deliverableId, body),
    );
  }

  @Post("opportunities/:opportunityId/calculate")
  calculate(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.calculate(identity, opportunityId),
    );
  }

  @Post("opportunities/:opportunityId/brief")
  generateBrief(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.generateBrief(identity, opportunityId),
    );
  }

  @Post("briefs/:versionId/submit")
  submit(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
    @Body() body: { expectedVersion?: number },
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.submitReview(
          identity,
          versionId,
          body.expectedVersion ?? 1,
        ),
    );
  }

  @Post("briefs/:versionId/changes")
  requestChanges(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.commercial.requestChanges(identity, versionId),
    );
  }

  @Post("briefs/:versionId/approve")
  approve(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
    @Body() body: { expectedVersion?: number },
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.commercial.approveBrief(
          identity,
          versionId,
          body.expectedVersion ?? 1,
          idempotencyKey,
        ),
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
