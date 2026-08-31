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
import { IsString, MinLength } from "class-validator";
import {
  FlowRequestIdentityResolver,
  type TrustedExecutionContext,
} from "../security/flow-auth-context.js";
import { ProjectEngineService } from "./project-engine.service.js";

class AssignTaskDto {
  @IsString()
  @MinLength(1)
  taskId!: string;

  @IsString()
  @MinLength(1)
  roleKey!: string;

  @IsString()
  @MinLength(1)
  assigneeLabel!: string;
}

@Controller("api/v1/workspaces/:workspaceId/commercial")
export class ProjectEngineController {
  constructor(
    @Inject(ProjectEngineService)
    private readonly service: ProjectEngineService,
    @Inject(FlowRequestIdentityResolver)
    private readonly identityResolver: FlowRequestIdentityResolver,
  ) {}

  @Post("opportunities/:opportunityId/projects")
  generateProject(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.generateProject(id, opportunityId),
    );
  }

  @Get("opportunities/:opportunityId/projects")
  listProjects(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.listProjects(id, opportunityId),
    );
  }

  @Get("projects/:projectId")
  getProject(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getProject(id, projectId),
    );
  }

  @Post("projects/:projectId/submit")
  submitProject(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.submitProject(id, projectId),
    );
  }

  @Post("projects/:projectId/changes")
  requestChanges(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.requestChanges(id, projectId),
    );
  }

  @Post("projects/:projectId/approve")
  approveProject(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.approveProject(id, projectId, idempotencyKey),
    );
  }

  @Post("projects/:projectId/publish")
  publishProject(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.publishProject(id, projectId, idempotencyKey),
    );
  }

  @Post("projects/:projectId/activate")
  activateProject(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.activateProject(id, projectId, idempotencyKey),
    );
  }

  @Post("projects/:projectId/assignments")
  assignTask(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Body() body: AssignTaskDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.assignTask(id, projectId, body, idempotencyKey),
    );
  }

  @Get("projects/:projectId/timeline")
  getTimeline(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getTimeline(id, projectId),
    );
  }

  @Get("projects/:projectId/audit")
  getAudit(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getAudit(id, projectId),
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
