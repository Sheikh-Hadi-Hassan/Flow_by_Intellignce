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
import { IsArray, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import {
  FlowRequestIdentityResolver,
  type TrustedExecutionContext,
} from "../security/flow-auth-context.js";
import { ResourceCapacityService } from "./resource-capacity.service.js";

class CreateResourceDto {
  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsString()
  resourceType!: "employee" | "contractor";

  @IsArray()
  @IsString({ each: true })
  roleKeys!: string[];

  @IsString()
  timezone!: string;

  @IsOptional()
  @IsString()
  workspaceMembershipId?: string;

  @IsOptional()
  @IsString()
  internalRateMinor?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

class AssignmentDraftDto {
  @IsString()
  taskId!: string;

  @IsString()
  roleKey!: string;

  @IsString()
  resourceProfileId!: string;

  @IsInt()
  @Min(0)
  allocationMinutes!: number;
}

@Controller("api/v1/workspaces/:workspaceId/commercial")
export class ResourceCapacityController {
  constructor(
    @Inject(ResourceCapacityService)
    private readonly service: ResourceCapacityService,
    @Inject(FlowRequestIdentityResolver)
    private readonly identityResolver: FlowRequestIdentityResolver,
  ) {}

  @Get("resources")
  listResources(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.listResources(id),
    );
  }

  @Get("resources/:resourceId")
  getResource(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("resourceId") resourceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getResource(id, resourceId),
    );
  }

  @Post("resources")
  createResource(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateResourceDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.createResource(id, body),
    );
  }

  @Get("projects/:projectId/resource-plan")
  getResourcePlan(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getResourcePlan(id, projectId),
    );
  }

  @Post("projects/:projectId/resource-plan/recommendations")
  generateRecommendations(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.generateRecommendations(id, projectId),
    );
  }

  @Post("projects/:projectId/resource-plan/assignments")
  upsertAssignment(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Body() body: AssignmentDraftDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.upsertAssignment(id, projectId, body),
    );
  }

  @Post("projects/:projectId/resource-plan/submit")
  submitPlan(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.submitPlan(id, projectId),
    );
  }

  @Post("projects/:projectId/resource-plan/approve")
  approvePlan(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.approvePlan(id, projectId),
    );
  }

  @Post("projects/:projectId/resource-plan/publish")
  publishPlan(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.publishPlan(id, projectId),
    );
  }

  @Get("projects/:projectId/resource-plan/capacity")
  getCapacity(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getCapacity(id, projectId),
    );
  }

  @Get("projects/:projectId/resource-plan/cost")
  getCostForecast(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getCostForecast(id, projectId),
    );
  }

  @Get("my-work")
  getMyWork(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getMyWork(id),
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
